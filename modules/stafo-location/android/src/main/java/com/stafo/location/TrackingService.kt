package com.stafo.location

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.location.Location
import android.os.BatteryManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import java.util.concurrent.Executors

/**
 * Shares the employee's location once they've agreed. Unlike the old
 * LocationForegroundService it:
 *  - runs only inside the window saved by the app, and stops itself at its end;
 *  - sends a point when they move (or a heartbeat when they stand still),
 *    never the same fix on a timer;
 *  - keeps points while offline and sends them in order later;
 *  - stays up like a delivery app's: a dismissed notification comes straight
 *    back (Android 14+ lets people swipe it away), and if the app is swiped
 *    from recents or the system kills the service, it restarts itself.
 */
class TrackingService : Service() {
  private val fused by lazy { LocationServices.getFusedLocationProviderClient(this) }
  private val main = Handler(Looper.getMainLooper())
  private val io = Executors.newSingleThreadExecutor()
  private var config: TrackingConfig? = null
  private val stopAtEnd = Runnable { finish() }

  private val callback =
    object : LocationCallback() {
      override fun onLocationResult(result: LocationResult) {
        result.lastLocation?.let(::onFix)
      }
    }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_REPOST) {
      // The notification was swiped away (or cleared with "Clear all"); put it back.
      val cfg = config ?: TrackingStore.config(this)
      if (cfg != null && cfg.isActive() && TrackingStore.running) {
        getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, notification(cfg))
        return START_STICKY
      }
    }
    val saved = TrackingStore.config(this)
    if (saved == null || !saved.isActive() || !hasLocationPermission(this)) {
      finish()
      return START_NOT_STICKY
    }
    config = saved
    try {
      ServiceCompat.startForeground(
        this,
        NOTIFICATION_ID,
        notification(saved),
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION else 0,
      )
    } catch (e: Exception) {
      // Android 14+ refuses a location service started from the background
      // without "Allow all the time". The app restarts it when next opened.
      TrackingStore.setLastError(this, "Couldn't start: ${e.message}")
      stopSelf()
      return START_NOT_STICKY
    }
    TrackingStore.running = true
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
      ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION) !=
      PackageManager.PERMISSION_GRANTED
    ) {
      // Runs and shows its notification, but gets no location once STAFO is in the background.
      TrackingStore.setLastError(this, "Location allowed only while using the app")
      DebugLog.d(this, "start: no background location permission")
    }
    requestUpdates()
    main.removeCallbacks(stopAtEnd)
    main.postDelayed(stopAtEnd, (saved.stopAt - System.currentTimeMillis()).coerceAtLeast(0))
    io.execute { Uploader.flush(this, saved) }
    // If the system kills us, come back; onStartCommand re-checks the window.
    return START_STICKY
  }

  @SuppressLint("MissingPermission")
  private fun requestUpdates() {
    fused.removeLocationUpdates(callback)
    val request =
      LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 60_000L)
        .setMinUpdateIntervalMillis(30_000L)
        .setWaitForAccurateLocation(false)
        .build()
    fused.requestLocationUpdates(request, callback, Looper.getMainLooper())
  }

  private fun onFix(location: Location) {
    val cfg = config ?: return
    val now = System.currentTimeMillis()
    if (!cfg.isActive(now)) {
      finish()
      return
    }
    // A fix this rough is what drew phantom trips on the company's map.
    if (location.hasAccuracy() && location.accuracy > MAX_ACCURACY_M) {
      DebugLog.d(this, "skip: accuracy ${location.accuracy}m > ${MAX_ACCURACY_M}m")
      return
    }

    val last = TrackingStore.lastPoint(this)
    val moved =
      last == null ||
        distance(last.latitude, last.longitude, location.latitude, location.longitude) >= cfg.minDistanceM
    val due = last == null || now - last.at >= cfg.heartbeatMs
    val movedM = last?.let { distance(it.latitude, it.longitude, location.latitude, location.longitude) }
    val sinceS = last?.let { (now - it.at) / 1000 }
    if (!moved && !due) {
      DebugLog.d(this, "skip: moved ${movedM?.toInt()}m, ${sinceS}s since last point")
      return
    }
    DebugLog.d(
      this,
      "record: ${if (moved) "moved" else "heartbeat"} (moved ${movedM?.toInt()}m, ${sinceS}s since last point) " +
        "${location.latitude},${location.longitude}",
    )

    val point = QueuedPoint(location.latitude, location.longitude, battery(), now)
    TrackingStore.saveLastPoint(this, point)
    TrackingStore.enqueue(this, point)
    io.execute {
      if (Uploader.flush(this, cfg) == Uploader.Result.UNAUTHORISED) {
        // Signed out elsewhere: nothing will be accepted, so stop.
        main.post { finish() }
      }
    }
  }

  private fun battery(): Int =
    (getSystemService(Context.BATTERY_SERVICE) as? BatteryManager)
      ?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
      ?.takeIf { it in 0..100 } ?: -1

  /** Stops for good: the window is over (or tracking was turned off). */
  private fun finish() {
    val cfg = config
    if (cfg != null && !cfg.isActive()) TrackingStore.saveConfig(this, null)
    finishing = true
    stopSelf()
  }

  /** Set when we stop on purpose, so onDestroy doesn't bring us back. */
  private var finishing = false

  /** Swiped out of recents: some phones take the service down with the app, so come back shortly. */
  override fun onTaskRemoved(rootIntent: Intent?) {
    scheduleRestart(this, 2_000L)
    super.onTaskRemoved(rootIntent)
  }

  override fun onDestroy() {
    // Killed while it should still be sharing (low memory, a battery saver): try again.
    if (!finishing && TrackingStore.config(this)?.isActive() == true) {
      scheduleRestart(this, 5_000L)
    }
    TrackingStore.running = false
    main.removeCallbacks(stopAtEnd)
    fused.removeLocationUpdates(callback)
    io.shutdown()
    super.onDestroy()
  }

  private fun notification(cfg: TrackingConfig): Notification {
    val manager = getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && manager.getNotificationChannel(CHANNEL_ID) == null) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Location sharing", NotificationManager.IMPORTANCE_LOW).apply {
          description = "Shown while you share your location during your shift"
          setShowBadge(false)
        },
      )
    }
    val open =
      packageManager.getLaunchIntentForPackage(packageName)?.let {
        PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
      }
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle(cfg.notificationTitle)
      .setContentText(cfg.notificationText)
      .setStyle(NotificationCompat.BigTextStyle().bigText(cfg.notificationText))
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setContentIntent(open)
      .setDeleteIntent(
        PendingIntent.getService(
          this,
          1,
          Intent(this, TrackingService::class.java).setAction(ACTION_REPOST),
          PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        ),
      )
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
      .build()
  }

  companion object {
    private const val CHANNEL_ID = "stafo_location_sharing"
    private const val NOTIFICATION_ID = 4107
    private const val MAX_ACCURACY_M = 100f
    private const val ACTION_REPOST = "com.stafo.location.REPOST_NOTIFICATION"

    /** Starts the service again after a delay via the restart receiver (works after the app is swiped away). */
    fun scheduleRestart(context: Context, delayMs: Long) {
      val pending =
        PendingIntent.getBroadcast(
          context,
          2,
          Intent(context, RestartReceiver::class.java).setAction(RestartReceiver.ACTION_RESTART),
          PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
      val alarms = context.getSystemService(AlarmManager::class.java) ?: return
      alarms.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, SystemClock.elapsedRealtime() + delayMs, pending)
    }

    fun start(context: Context) {
      ContextCompat.startForegroundService(context, Intent(context, TrackingService::class.java))
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, TrackingService::class.java))
    }

    fun hasLocationPermission(context: Context) =
      ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
        PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
        PackageManager.PERMISSION_GRANTED

    fun distance(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Float {
      val out = FloatArray(1)
      Location.distanceBetween(lat1, lng1, lat2, lng2, out)
      return out[0]
    }
  }
}
