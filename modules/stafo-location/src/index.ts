import {PermissionsAndroid, Platform} from 'react-native';
import Native from './NativeStafoLocation';

export type LocationPermission = 'always' | 'while-in-use' | 'denied' | 'undetermined';

export type Position = {
  latitude: number;
  longitude: number;
  /** Error radius in metres. */
  accuracy: number;
  timestamp: number;
  /** A mock-location app supplied this fix (Android). */
  mocked: boolean;
};

export type TrackingConfig = {
  /** e.g. "https://stafo.in/" */
  baseUrl: string;
  token: string;
  employeeId: number;
  /** Epoch ms: tracking stops by itself at this moment. */
  stopAt: number;
  /** Send a point once they have moved this far from the last one (default 30 m). */
  minDistanceM?: number;
  /** Also send one this often while standing still (default 10 min; Android). */
  heartbeatMs?: number;
  notificationTitle: string;
  notificationText: string;
  /** While a trip is on: each point is also added to that trip's route. */
  tripId?: number;
};

export type TrackingState = {
  running: boolean;
  stopAt: number;
  queued: number;
  lastSentAt: number;
  lastError: string | null;
  /** 0 when not recording a trip. */
  tripId: number;
};

export const getPermissionStatus = () => Native.getPermissionStatus() as Promise<LocationPermission>;

/**
 * Asks for location. With `always`, also asks for background access, which is
 * what lets tracking pick up again after a restart. Android shows that as a
 * separate settings screen, so only ask for it once they've agreed to share.
 */
export async function requestPermission(always = false): Promise<LocationPermission> {
  if (Platform.OS !== 'android') {
    return (await Native.requestPermission(always)) as LocationPermission;
  }
  const P = PermissionsAndroid.PERMISSIONS;
  const result = await PermissionsAndroid.requestMultiple([P.ACCESS_FINE_LOCATION, P.ACCESS_COARSE_LOCATION]);
  const granted =
    result[P.ACCESS_FINE_LOCATION] === 'granted' || result[P.ACCESS_COARSE_LOCATION] === 'granted';
  if (!granted) {
    return 'denied';
  }
  if (always && Number(Platform.Version) >= 29) {
    await PermissionsAndroid.request(P.ACCESS_BACKGROUND_LOCATION);
  }
  if (always && Number(Platform.Version) >= 33) {
    // The "sharing your location" notification; tracking still works without it.
    await PermissionsAndroid.request(P.POST_NOTIFICATIONS);
  }
  return getPermissionStatus();
}

export const isLocationServicesEnabled = () => Native.isLocationServicesEnabled();

export const getCurrentPosition = (timeoutMs = 15_000, maxAgeMs = 10_000) =>
  Native.getCurrentPosition(timeoutMs, maxAgeMs) as Promise<Position>;

export const startTracking = (config: TrackingConfig) =>
  Native.startTracking({minDistanceM: 30, heartbeatMs: 10 * 60_000, ...config});

export const stopTracking = () => Native.stopTracking();

export const getTrackingState = () => Native.getTrackingState() as Promise<TrackingState>;

export const openSettings = () => Native.openSettings();

/** Whether the phone may kill the tracker to save battery (Android); iOS always resolves true. */
export const isIgnoringBatteryOptimizations = () => Native.isIgnoringBatteryOptimizations();

/** Asks to let STAFO run in the background without battery limits (Android). */
export const requestIgnoreBatteryOptimizations = () => Native.requestIgnoreBatteryOptimizations();
