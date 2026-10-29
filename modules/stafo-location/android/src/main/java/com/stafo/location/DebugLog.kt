package com.stafo.location

import android.content.Context
import android.content.pm.ApplicationInfo
import android.util.Log

/** Logcat lines (tag StafoTracking) in debug builds only: release builds never log locations. */
internal object DebugLog {
  private const val TAG = "StafoTracking"

  fun d(context: Context, message: String) {
    if (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0) {
      Log.d(TAG, message)
    }
  }
}
