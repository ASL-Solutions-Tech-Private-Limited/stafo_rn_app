package com.stafo.location

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/** What tracking needs to survive the app (and the phone) restarting. */
data class TrackingConfig(
  val baseUrl: String,
  val token: String,
  val employeeId: Long,
  val stopAt: Long,
  val minDistanceM: Double,
  val heartbeatMs: Long,
  val notificationTitle: String,
  val notificationText: String,
) {
  /** Only ever tracks inside the window saved at punch-in. */
  fun isActive(now: Long = System.currentTimeMillis()) = now < stopAt

  fun toJson(): JSONObject =
    JSONObject()
      .put("baseUrl", baseUrl)
      .put("token", token)
      .put("employeeId", employeeId)
      .put("stopAt", stopAt)
      .put("minDistanceM", minDistanceM)
      .put("heartbeatMs", heartbeatMs)
      .put("notificationTitle", notificationTitle)
      .put("notificationText", notificationText)

  companion object {
    fun fromJson(o: JSONObject) =
      TrackingConfig(
        baseUrl = o.getString("baseUrl"),
        token = o.getString("token"),
        employeeId = o.getLong("employeeId"),
        stopAt = o.getLong("stopAt"),
        minDistanceM = o.optDouble("minDistanceM", 30.0),
        heartbeatMs = o.optLong("heartbeatMs", 600_000L),
        notificationTitle = o.optString("notificationTitle", "Sharing your location"),
        notificationText = o.optString("notificationText", ""),
      )
  }
}

/** A point waiting to be sent. */
data class QueuedPoint(val latitude: Double, val longitude: Double, val battery: Int, val at: Long) {
  fun toJson(): JSONObject =
    JSONObject().put("lat", latitude).put("lng", longitude).put("battery", battery).put("at", at)

  companion object {
    fun fromJson(o: JSONObject) = QueuedPoint(o.getDouble("lat"), o.getDouble("lng"), o.optInt("battery", -1), o.getLong("at"))
  }
}

object TrackingStore {
  private const val PREFS = "stafo_location"
  /** Enough for a long day offline at one point every couple of minutes. */
  const val MAX_QUEUE = 500

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun config(context: Context): TrackingConfig? =
    prefs(context).getString("config", null)?.let {
      runCatching { TrackingConfig.fromJson(JSONObject(it)) }.getOrNull()
    }

  fun saveConfig(context: Context, config: TrackingConfig?) {
    prefs(context).edit().apply {
      if (config == null) remove("config") else putString("config", config.toJson().toString())
    }.apply()
  }

  @Synchronized
  fun queue(context: Context): MutableList<QueuedPoint> {
    val raw = prefs(context).getString("queue", null) ?: return mutableListOf()
    return runCatching {
      val arr = JSONArray(raw)
      MutableList(arr.length()) { QueuedPoint.fromJson(arr.getJSONObject(it)) }
    }.getOrDefault(mutableListOf())
  }

  @Synchronized
  fun saveQueue(context: Context, points: List<QueuedPoint>) {
    val arr = JSONArray()
    points.takeLast(MAX_QUEUE).forEach { arr.put(it.toJson()) }
    prefs(context).edit().putString("queue", arr.toString()).apply()
  }

  @Synchronized
  fun enqueue(context: Context, point: QueuedPoint) {
    saveQueue(context, queue(context).apply { add(point) })
  }

  /** The last point handed to the queue, for the movement check. */
  fun lastPoint(context: Context): QueuedPoint? =
    prefs(context).getString("last", null)?.let { runCatching { QueuedPoint.fromJson(JSONObject(it)) }.getOrNull() }

  fun saveLastPoint(context: Context, point: QueuedPoint) {
    prefs(context).edit().putString("last", point.toJson().toString()).apply()
  }

  var running = false

  fun lastSentAt(context: Context) = prefs(context).getLong("lastSentAt", 0L)

  fun setLastSentAt(context: Context, at: Long) = prefs(context).edit().putLong("lastSentAt", at).apply()

  fun lastError(context: Context): String? = prefs(context).getString("lastError", null)

  fun setLastError(context: Context, error: String?) = prefs(context).edit().putString("lastError", error).apply()
}
