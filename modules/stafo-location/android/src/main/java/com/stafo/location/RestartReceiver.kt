package com.stafo.location

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * After a restart, an app update, or the service being killed, resumes sharing
 * only if the saved window is still open. Turning sharing off clears it.
 */
class RestartReceiver : BroadcastReceiver() {
  companion object {
    /** Sent by TrackingService.scheduleRestart after the app was swiped away or the service killed. */
    const val ACTION_RESTART = "com.stafo.location.RESTART"
  }

  override fun onReceive(context: Context, intent: Intent) {
    val config = TrackingStore.config(context) ?: return
    if (!config.isActive()) {
      TrackingStore.saveConfig(context, null)
      return
    }
    if (TrackingService.hasLocationPermission(context)) {
      runCatching { TrackingService.start(context) }
    }
  }
}
