package com.stafo.location

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * After a restart or an app update, resumes sharing only if the window saved at
 * punch-in is still open. Punching out (or turning sharing off) clears it, so a
 * phone that restarts after the shift doesn't start tracking again.
 */
class RestartReceiver : BroadcastReceiver() {
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
