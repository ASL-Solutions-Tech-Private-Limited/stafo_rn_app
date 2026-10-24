package com.stafo.location

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.location.LocationManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.content.ContextCompat
import androidx.core.location.LocationManagerCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.google.android.gms.location.CurrentLocationRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import java.util.concurrent.Executors

class StafoLocationModule(private val context: ReactApplicationContext) : NativeStafoLocationSpec(context) {
  private val io = Executors.newSingleThreadExecutor()

  override fun getName() = NAME

  private fun granted(permission: String) =
    ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED

  private fun status(): String {
    val foreground = granted(Manifest.permission.ACCESS_FINE_LOCATION) || granted(Manifest.permission.ACCESS_COARSE_LOCATION)
    if (!foreground) return "denied"
    val background =
      Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || granted(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
    return if (background) "always" else "while-in-use"
  }

  override fun getPermissionStatus(promise: Promise) = promise.resolve(status())

  // Android asks from JS (PermissionsAndroid); this just reports.
  override fun requestPermission(always: Boolean, promise: Promise) = promise.resolve(status())

  override fun isLocationServicesEnabled(promise: Promise) {
    val manager = context.getSystemService(LocationManager::class.java)
    promise.resolve(manager != null && LocationManagerCompat.isLocationEnabled(manager))
  }

  @SuppressLint("MissingPermission")
  override fun getCurrentPosition(timeoutMs: Double, maxAgeMs: Double, promise: Promise) {
    if (status() == "denied") {
      promise.reject("permission", "Location permission is off.")
      return
    }
    val request =
      CurrentLocationRequest.Builder()
        .setPriority(Priority.PRIORITY_HIGH_ACCURACY)
        .setDurationMillis(timeoutMs.toLong().coerceAtLeast(1_000))
        .setMaxUpdateAgeMillis(maxAgeMs.toLong().coerceAtLeast(0))
        .build()
    LocationServices.getFusedLocationProviderClient(context)
      .getCurrentLocation(request, CancellationTokenSource().token)
      .addOnSuccessListener { location ->
        if (location == null) {
          promise.reject("timeout", "Couldn't find your location. Step outside or near a window and try again.")
          return@addOnSuccessListener
        }
        val mocked =
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) location.isMock
          else @Suppress("DEPRECATION") location.isFromMockProvider
        promise.resolve(
          Arguments.createMap().apply {
            putDouble("latitude", location.latitude)
            putDouble("longitude", location.longitude)
            putDouble("accuracy", if (location.hasAccuracy()) location.accuracy.toDouble() else -1.0)
            putDouble("timestamp", location.time.toDouble())
            putBoolean("mocked", mocked)
          },
        )
      }
      .addOnFailureListener { promise.reject("unavailable", it.message ?: "Location is unavailable.", it) }
  }

  override fun startTracking(config: ReadableMap, promise: Promise) {
    val cfg =
      try {
        TrackingConfig(
          baseUrl = config.getString("baseUrl")!!,
          token = config.getString("token")!!,
          employeeId = config.getDouble("employeeId").toLong(),
          stopAt = config.getDouble("stopAt").toLong(),
          minDistanceM = if (config.hasKey("minDistanceM")) config.getDouble("minDistanceM") else 30.0,
          heartbeatMs = if (config.hasKey("heartbeatMs")) config.getDouble("heartbeatMs").toLong() else 600_000L,
          notificationTitle = config.getString("notificationTitle") ?: "Sharing your location",
          notificationText = config.getString("notificationText") ?: "",
        )
      } catch (e: Exception) {
        promise.reject("config", "Tracking config is incomplete: ${e.message}")
        return
      }
    if (!cfg.isActive() || status() == "denied") {
      promise.resolve(false)
      return
    }
    TrackingStore.saveConfig(context, cfg)
    try {
      TrackingService.start(context)
      promise.resolve(true)
    } catch (e: Exception) {
      TrackingStore.setLastError(context, e.message)
      promise.resolve(false)
    }
  }

  override fun stopTracking(promise: Promise) {
    val cfg = TrackingStore.config(context)
    TrackingStore.saveConfig(context, null)
    TrackingService.stop(context)
    // One last try for anything still queued.
    if (cfg != null) io.execute { Uploader.flush(context, cfg) }
    promise.resolve(null)
  }

  override fun getTrackingState(promise: Promise) {
    val cfg = TrackingStore.config(context)
    promise.resolve(
      Arguments.createMap().apply {
        putBoolean("running", TrackingStore.running && cfg?.isActive() == true)
        putDouble("stopAt", (cfg?.stopAt ?: 0L).toDouble())
        putInt("queued", TrackingStore.queue(context).size)
        putDouble("lastSentAt", TrackingStore.lastSentAt(context).toDouble())
        putString("lastError", TrackingStore.lastError(context))
        putDouble("tripId", (cfg?.tripId ?: 0L).toDouble())
      },
    )
  }

  override fun openSettings() {
    val intent =
      Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", context.packageName, null))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
  }

  override fun isIgnoringBatteryOptimizations(promise: Promise) {
    val power = context.getSystemService(PowerManager::class.java)
    promise.resolve(Build.VERSION.SDK_INT < Build.VERSION_CODES.M || power?.isIgnoringBatteryOptimizations(context.packageName) == true)
  }

  @SuppressLint("BatteryLife")
  override fun requestIgnoreBatteryOptimizations() {
    // The direct prompt (one tap); if a phone doesn't offer it, the list of apps to pick STAFO from.
    val direct =
      Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:${context.packageName}"))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    val list = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    runCatching { context.startActivity(direct) }.onFailure { runCatching { context.startActivity(list) } }
  }

  override fun invalidate() {
    io.shutdown()
    super.invalidate()
  }

  companion object {
    const val NAME = "StafoLocation"
  }
}
