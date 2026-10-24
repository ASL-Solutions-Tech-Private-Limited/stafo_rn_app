#import "StafoLocation.h"
#import <CoreLocation/CoreLocation.h>
#import <UIKit/UIKit.h>

// STAFO's own location module (iOS). Mirrors the Android TrackingService:
//  - tracks only inside the window saved at punch-in and stops at its end;
//  - sends a point when the employee moves, not on a timer;
//  - keeps points while offline and sends them in order later.

static NSString *const kConfigKey = @"stafo.location.config";
static NSString *const kQueueKey = @"stafo.location.queue";
static NSString *const kLastPointKey = @"stafo.location.last";
static NSString *const kLastSentKey = @"stafo.location.lastSentAt";
static NSString *const kLastErrorKey = @"stafo.location.lastError";
static const NSUInteger kMaxQueue = 500;
static const CLLocationAccuracy kMaxAccuracyM = 100;

typedef void (^FixHandler)(CLLocation *_Nullable location, NSError *_Nullable error);

@interface StafoLocation () <CLLocationManagerDelegate>
@end

@implementation StafoLocation {
  CLLocationManager *_oneShot;
  CLLocationManager *_tracker;
  NSMutableArray<FixHandler> *_fixHandlers;
  RCTPromiseResolveBlock _permissionResolve;
  BOOL _permissionPrompted;
  NSTimer *_stopTimer;
  BOOL _uploading;
  NSURLSession *_session;
}

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

- (instancetype)init
{
  if (self = [super init]) {
    _fixHandlers = [NSMutableArray new];
    NSURLSessionConfiguration *cfg = [NSURLSessionConfiguration defaultSessionConfiguration];
    cfg.timeoutIntervalForRequest = 20;
    _session = [NSURLSession sessionWithConfiguration:cfg];
    dispatch_async(dispatch_get_main_queue(), ^{
      self->_oneShot = [CLLocationManager new];
      self->_oneShot.delegate = self;
      self->_oneShot.desiredAccuracy = kCLLocationAccuracyBest;
      // Relaunched in the background by a significant change, or just reopened:
      // carry on if the saved window is still open.
      [self resumeIfActive];
    });
  }
  return self;
}

#pragma mark - Permission

- (NSString *)statusString
{
  CLAuthorizationStatus s = _oneShot ? _oneShot.authorizationStatus : [CLLocationManager new].authorizationStatus;
  switch (s) {
    case kCLAuthorizationStatusAuthorizedAlways:
      return @"always";
    case kCLAuthorizationStatusAuthorizedWhenInUse:
      return @"while-in-use";
    case kCLAuthorizationStatusNotDetermined:
      return @"undetermined";
    default:
      return @"denied";
  }
}

- (void)getPermissionStatus:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  resolve([self statusString]);
}

- (void)requestPermission:(BOOL)always resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  CLAuthorizationStatus s = _oneShot.authorizationStatus;
  BOOL ask = s == kCLAuthorizationStatusNotDetermined || (always && s == kCLAuthorizationStatusAuthorizedWhenInUse);
  if (!ask) {
    resolve([self statusString]);
    return;
  }
  if (_permissionResolve) {
    _permissionResolve([self statusString]);
  }
  _permissionResolve = resolve;
  _permissionPrompted = NO;
  [[NSNotificationCenter defaultCenter] addObserver:self
                                           selector:@selector(appWillResign)
                                               name:UIApplicationWillResignActiveNotification
                                             object:nil];
  [[NSNotificationCenter defaultCenter] addObserver:self
                                           selector:@selector(appDidBecomeActive)
                                               name:UIApplicationDidBecomeActiveNotification
                                             object:nil];
  if (s == kCLAuthorizationStatusNotDetermined) {
    [_oneShot requestWhenInUseAuthorization];
  } else {
    [_oneShot requestAlwaysAuthorization];
  }
  // iOS only shows the "Always" upgrade once; if no prompt appears, answer now.
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.8 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
    if (!self->_permissionPrompted) {
      [self settlePermission];
    }
  });
}

- (void)appWillResign
{
  _permissionPrompted = YES;
}

- (void)appDidBecomeActive
{
  if (_permissionPrompted) {
    [self settlePermission];
  }
}

- (void)settlePermission
{
  [[NSNotificationCenter defaultCenter] removeObserver:self name:UIApplicationWillResignActiveNotification object:nil];
  [[NSNotificationCenter defaultCenter] removeObserver:self name:UIApplicationDidBecomeActiveNotification object:nil];
  RCTPromiseResolveBlock resolve = _permissionResolve;
  _permissionResolve = nil;
  if (resolve) {
    resolve([self statusString]);
  }
}

- (void)locationManagerDidChangeAuthorization:(CLLocationManager *)manager
{
  if (manager == _oneShot && _permissionResolve && manager.authorizationStatus != kCLAuthorizationStatusNotDetermined) {
    [self settlePermission];
  }
}

- (void)isLocationServicesEnabled:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    BOOL on = [CLLocationManager locationServicesEnabled];
    resolve(@(on));
  });
}

- (void)openSettings
{
  NSURL *url = [NSURL URLWithString:UIApplicationOpenSettingsURLString];
  [[UIApplication sharedApplication] openURL:url options:@{} completionHandler:nil];
}

- (void)isIgnoringBatteryOptimizations:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  // iOS has no per-app battery optimisation to turn off.
  resolve(@YES);
}

- (void)requestIgnoreBatteryOptimizations
{
}

#pragma mark - One-off position

- (void)getCurrentPosition:(double)timeoutMs
                  maxAgeMs:(double)maxAgeMs
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject
{
  NSString *status = [self statusString];
  if ([status isEqualToString:@"denied"] || [status isEqualToString:@"undetermined"]) {
    reject(@"permission", @"Location permission is off.", nil);
    return;
  }
  CLLocation *cached = _oneShot.location;
  if (cached && -cached.timestamp.timeIntervalSinceNow * 1000 <= maxAgeMs && cached.horizontalAccuracy <= kMaxAccuracyM) {
    resolve([self positionDict:cached]);
    return;
  }
  __block BOOL settled = NO;
  FixHandler handler = ^(CLLocation *location, NSError *error) {
    if (settled) {
      return;
    }
    settled = YES;
    if (location) {
      resolve([self positionDict:location]);
    } else {
      reject(@"unavailable", error.localizedDescription ?: @"Location is unavailable.", error);
    }
  };
  [_fixHandlers addObject:handler];
  [_oneShot requestLocation];
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(MAX(timeoutMs, 1000) * NSEC_PER_MSEC)), dispatch_get_main_queue(), ^{
    if (!settled) {
      [self->_fixHandlers removeObject:handler];
      CLLocation *last = self->_oneShot.location;
      if (last && last.horizontalAccuracy <= kMaxAccuracyM * 3) {
        handler(last, nil);
      } else {
        settled = YES;
        reject(@"timeout", @"Couldn't find your location. Step outside or near a window and try again.", nil);
      }
    }
  });
}

- (NSDictionary *)positionDict:(CLLocation *)l
{
  BOOL mocked = NO;
  if (@available(iOS 15.0, *)) {
    mocked = l.sourceInformation.isSimulatedBySoftware;
  }
  return @{
    @"latitude" : @(l.coordinate.latitude),
    @"longitude" : @(l.coordinate.longitude),
    @"accuracy" : @(l.horizontalAccuracy),
    @"timestamp" : @(l.timestamp.timeIntervalSince1970 * 1000),
    @"mocked" : @(mocked),
  };
}

#pragma mark - Tracking

- (NSDictionary *)config
{
  return [[NSUserDefaults standardUserDefaults] dictionaryForKey:kConfigKey];
}

- (BOOL)isActive:(NSDictionary *)config
{
  return config && [NSDate date].timeIntervalSince1970 * 1000 < [config[@"stopAt"] doubleValue];
}

- (void)startTracking:(NSDictionary *)config resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  if (!config[@"baseUrl"] || !config[@"token"] || !config[@"employeeId"] || !config[@"stopAt"]) {
    reject(@"config", @"Tracking config is incomplete.", nil);
    return;
  }
  NSString *status = [self statusString];
  if (![self isActive:config] || [status isEqualToString:@"denied"] || [status isEqualToString:@"undetermined"]) {
    resolve(@NO);
    return;
  }
  NSMutableDictionary *saved = [NSMutableDictionary new];
  for (NSString *key in @[ @"baseUrl", @"token", @"employeeId", @"stopAt", @"minDistanceM", @"tripId" ]) {
    if (config[key]) {
      saved[key] = config[key];
    }
  }
  [[NSUserDefaults standardUserDefaults] setObject:saved forKey:kConfigKey];
  [self startUpdates:saved];
  resolve(@YES);
}

- (void)resumeIfActive
{
  NSDictionary *config = [self config];
  if (!config) {
    return;
  }
  if ([self isActive:config]) {
    [self startUpdates:config];
  } else {
    [self clearTracking];
  }
}

- (void)startUpdates:(NSDictionary *)config
{
  if (!_tracker) {
    _tracker = [CLLocationManager new];
    _tracker.delegate = self;
  }
  _tracker.desiredAccuracy = kCLLocationAccuracyNearestTenMeters;
  _tracker.distanceFilter = MAX([config[@"minDistanceM"] doubleValue], 10) / 2;
  _tracker.activityType = CLActivityTypeOther;
  _tracker.pausesLocationUpdatesAutomatically = NO;
  _tracker.allowsBackgroundLocationUpdates = YES;
  _tracker.showsBackgroundLocationIndicator = YES;
  [_tracker startUpdatingLocation];
  if (_tracker.authorizationStatus == kCLAuthorizationStatusAuthorizedAlways) {
    // Lets iOS relaunch the app if it was closed during the shift.
    [_tracker startMonitoringSignificantLocationChanges];
  }
  [UIDevice currentDevice].batteryMonitoringEnabled = YES;

  [_stopTimer invalidate];
  NSTimeInterval left = [config[@"stopAt"] doubleValue] / 1000 - [NSDate date].timeIntervalSince1970;
  _stopTimer = [NSTimer scheduledTimerWithTimeInterval:MAX(left, 0)
                                               repeats:NO
                                                 block:^(NSTimer *timer) {
                                                   [self clearTracking];
                                                 }];
  [self flush];
}

- (void)clearTracking
{
  [_stopTimer invalidate];
  _stopTimer = nil;
  [_tracker stopUpdatingLocation];
  [_tracker stopMonitoringSignificantLocationChanges];
  _tracker.allowsBackgroundLocationUpdates = NO;
  [[NSUserDefaults standardUserDefaults] removeObjectForKey:kConfigKey];
}

- (void)stopTracking:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  NSDictionary *config = [self config];
  [self clearTracking];
  if (config) {
    [self flushWith:config];
  }
  resolve(nil);
}

- (void)getTrackingState:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  NSDictionary *config = [self config];
  NSUserDefaults *d = [NSUserDefaults standardUserDefaults];
  resolve(@{
    @"running" : @(_tracker != nil && _stopTimer != nil && [self isActive:config]),
    @"stopAt" : config[@"stopAt"] ?: @0,
    @"queued" : @([d arrayForKey:kQueueKey].count),
    @"lastSentAt" : @([d doubleForKey:kLastSentKey]),
    @"lastError" : [d stringForKey:kLastErrorKey] ?: [NSNull null],
    @"tripId" : config[@"tripId"] ?: @0,
  });
}

- (void)locationManager:(CLLocationManager *)manager didUpdateLocations:(NSArray<CLLocation *> *)locations
{
  CLLocation *location = locations.lastObject;
  if (manager == _oneShot) {
    NSArray<FixHandler> *handlers = [_fixHandlers copy];
    [_fixHandlers removeAllObjects];
    for (FixHandler h in handlers) {
      h(location, nil);
    }
    return;
  }
  NSDictionary *config = [self config];
  if (![self isActive:config]) {
    [self clearTracking];
    return;
  }
  // A fix this rough is what drew phantom trips on the company's map.
  if (!location || location.horizontalAccuracy < 0 || location.horizontalAccuracy > kMaxAccuracyM) {
    return;
  }
  NSUserDefaults *d = [NSUserDefaults standardUserDefaults];
  NSDictionary *last = [d dictionaryForKey:kLastPointKey];
  if (last) {
    CLLocation *prev = [[CLLocation alloc] initWithLatitude:[last[@"lat"] doubleValue] longitude:[last[@"lng"] doubleValue]];
    double minDistance = MAX([config[@"minDistanceM"] doubleValue], 10);
    if ([location distanceFromLocation:prev] < minDistance) {
      return;
    }
  }
  float level = [UIDevice currentDevice].batteryLevel;
  NSDictionary *point = @{
    @"lat" : @(location.coordinate.latitude),
    @"lng" : @(location.coordinate.longitude),
    @"battery" : @(level >= 0 ? (int)lroundf(level * 100) : -1),
    @"at" : @([NSDate date].timeIntervalSince1970 * 1000),
  };
  [d setObject:point forKey:kLastPointKey];
  NSMutableArray *queue = [([d arrayForKey:kQueueKey] ?: @[]) mutableCopy];
  [queue addObject:point];
  if (queue.count > kMaxQueue) {
    [queue removeObjectsInRange:NSMakeRange(0, queue.count - kMaxQueue)];
  }
  [d setObject:queue forKey:kQueueKey];
  [self flush];
}

- (void)locationManager:(CLLocationManager *)manager didFailWithError:(NSError *)error
{
  if (manager == _oneShot) {
    if (error.code == kCLErrorLocationUnknown) {
      return; // still trying; the timeout answers if nothing comes
    }
    NSArray<FixHandler> *handlers = [_fixHandlers copy];
    [_fixHandlers removeAllObjects];
    for (FixHandler h in handlers) {
      h(nil, error);
    }
  } else if (error.code == kCLErrorDenied) {
    [[NSUserDefaults standardUserDefaults] setObject:@"Location permission was turned off" forKey:kLastErrorKey];
    [self clearTracking];
  }
}

#pragma mark - Upload

- (void)flush
{
  NSDictionary *config = [self config];
  if (config) {
    [self flushWith:config];
  }
}

/** Sends queued points oldest first; stops at the first network failure. */
- (void)flushWith:(NSDictionary *)config
{
  if (_uploading) {
    return;
  }
  NSUserDefaults *d = [NSUserDefaults standardUserDefaults];
  NSDictionary *point = [d arrayForKey:kQueueKey].firstObject;
  if (!point) {
    return;
  }
  _uploading = YES;
  __block UIBackgroundTaskIdentifier task = [[UIApplication sharedApplication] beginBackgroundTaskWithExpirationHandler:^{
    [[UIApplication sharedApplication] endBackgroundTask:task];
    task = UIBackgroundTaskInvalid;
  }];

  static NSDateFormatter *stamp;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    stamp = [NSDateFormatter new];
    stamp.locale = [NSLocale localeWithLocaleIdentifier:@"en_US_POSIX"];
    stamp.dateFormat = @"yyyy-MM-dd HH:mm:ss";
  });
  int battery = [point[@"battery"] intValue];
  NSDictionary *body = @{
    @"employee_id" : [NSString stringWithFormat:@"%@", config[@"employeeId"]],
    @"latitude" : [point[@"lat"] stringValue],
    @"longitude" : [point[@"lng"] stringValue],
    @"battery_status" : battery >= 0 ? [NSString stringWithFormat:@"%d", battery] : @"",
    @"recorded_at" : [stamp stringFromDate:[NSDate dateWithTimeIntervalSince1970:[point[@"at"] doubleValue] / 1000]],
  };
  NSString *base = config[@"baseUrl"];
  while ([base hasSuffix:@"/"]) {
    base = [base substringToIndex:base.length - 1];
  }
  NSMutableURLRequest *req = [NSMutableURLRequest requestWithURL:[NSURL URLWithString:[base stringByAppendingString:@"/api/store-geo-location"]]];
  req.HTTPMethod = @"POST";
  [req setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
  [req setValue:@"application/json" forHTTPHeaderField:@"Accept"];
  [req setValue:[@"Bearer " stringByAppendingString:config[@"token"]] forHTTPHeaderField:@"Authorization"];
  req.HTTPBody = [NSJSONSerialization dataWithJSONObject:body options:0 error:nil];

  [[_session dataTaskWithRequest:req
               completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
                 NSInteger code = [(NSHTTPURLResponse *)response statusCode];
                 dispatch_async(dispatch_get_main_queue(), ^{
                   self->_uploading = NO;
                   BOOL sent = !error && code >= 200 && code < 300;
                   // A point the server refuses won't get better by retrying.
                   BOOL drop = !error && code >= 400 && code < 500 && code != 401 && code != 403;
                   if (sent || drop) {
                     NSMutableArray *queue = [([d arrayForKey:kQueueKey] ?: @[]) mutableCopy];
                     if (queue.count) {
                       [queue removeObjectAtIndex:0];
                     }
                     [d setObject:queue forKey:kQueueKey];
                     if (sent) {
                       [d setDouble:[NSDate date].timeIntervalSince1970 * 1000 forKey:kLastSentKey];
                       [d removeObjectForKey:kLastErrorKey];
                       [self sendTripPoint:point config:config];
                     }
                     [self flushWith:config];
                   } else if (code == 401 || code == 403) {
                     // Signed out elsewhere: nothing will be accepted, so stop.
                     [d setObject:@"Signed out" forKey:kLastErrorKey];
                     [self clearTracking];
                   } else {
                     [d setObject:error.localizedDescription ?: [NSString stringWithFormat:@"HTTP %ld", (long)code]
                           forKey:kLastErrorKey];
                   }
                   if (task != UIBackgroundTaskInvalid) {
                     [[UIApplication sharedApplication] endBackgroundTask:task];
                     task = UIBackgroundTaskInvalid;
                   }
                 });
               }] resume];
}

/** While a trip is on, adds the point to its route. Best effort: a miss only leaves a gap in the line. */
- (void)sendTripPoint:(NSDictionary *)point config:(NSDictionary *)config
{
  long long tripId = [config[@"tripId"] longLongValue];
  if (tripId <= 0) {
    return;
  }
  NSDictionary *body = @{
    @"trip_id" : [NSString stringWithFormat:@"%lld", tripId],
    @"latitude" : [point[@"lat"] stringValue],
    @"longitude" : [point[@"lng"] stringValue],
  };
  NSString *base = config[@"baseUrl"];
  while ([base hasSuffix:@"/"]) {
    base = [base substringToIndex:base.length - 1];
  }
  NSMutableURLRequest *req =
      [NSMutableURLRequest requestWithURL:[NSURL URLWithString:[base stringByAppendingString:@"/api/trips-geolocation/create"]]];
  req.HTTPMethod = @"POST";
  [req setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
  [req setValue:@"application/json" forHTTPHeaderField:@"Accept"];
  [req setValue:[@"Bearer " stringByAppendingString:config[@"token"]] forHTTPHeaderField:@"Authorization"];
  req.HTTPBody = [NSJSONSerialization dataWithJSONObject:body options:0 error:nil];
  [[_session dataTaskWithRequest:req completionHandler:^(NSData *data, NSURLResponse *response, NSError *error){}] resume];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeStafoLocationSpecJSI>(params);
}

@end
