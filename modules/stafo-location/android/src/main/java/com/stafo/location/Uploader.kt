package com.stafo.location

import android.content.Context
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Sends queued points to api/store-geo-location, oldest first. */
object Uploader {
  enum class Result { SENT, RETRY_LATER, UNAUTHORISED }

  private val stamp = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)

  /** Sends what it can. Stops at the first network failure and keeps the rest queued. */
  @Synchronized
  fun flush(context: Context, config: TrackingConfig): Result {
    val queue = TrackingStore.queue(context)
    var result = Result.SENT
    while (queue.isNotEmpty()) {
      when (send(config, queue.first())) {
        Result.SENT -> {
          queue.removeAt(0)
          TrackingStore.setLastSentAt(context, System.currentTimeMillis())
          TrackingStore.setLastError(context, null)
        }
        Result.RETRY_LATER -> {
          result = Result.RETRY_LATER
          break
        }
        Result.UNAUTHORISED -> {
          result = Result.UNAUTHORISED
          break
        }
      }
    }
    TrackingStore.saveQueue(context, queue)
    DebugLog.d(context, "upload: $result, ${queue.size} still queued")
    if (result != Result.SENT) {
      TrackingStore.setLastError(context, if (result == Result.UNAUTHORISED) "Signed out" else lastError)
    }
    return result
  }

  private fun send(config: TrackingConfig, point: QueuedPoint): Result {
    val body =
      JSONObject()
        .put("employee_id", config.employeeId.toString())
        .put("latitude", point.latitude.toString())
        .put("longitude", point.longitude.toString())
        .put("battery_status", if (point.battery >= 0) point.battery.toString() else "")
        // When the point was taken; a point sent late from the queue would otherwise
        // be stamped with the upload time.
        .put("recorded_at", stamp.format(Date(point.at)))
    val conn = (URL(config.baseUrl.trimEnd('/') + "/api/store-geo-location").openConnection() as HttpURLConnection)
    return try {
      conn.requestMethod = "POST"
      conn.connectTimeout = 15_000
      conn.readTimeout = 20_000
      conn.doOutput = true
      conn.setRequestProperty("Content-Type", "application/json")
      conn.setRequestProperty("Accept", "application/json")
      conn.setRequestProperty("Authorization", "Bearer ${config.token}")
      conn.outputStream.use { it.write(body.toString().toByteArray()) }
      when (val code = conn.responseCode) {
        in 200..299 -> Result.SENT.also { if (config.tripId > 0) sendTripPoint(config, point) }
        401, 403 -> Result.UNAUTHORISED
        // A point the server refuses won't get better by retrying: drop it.
        in 400..499 -> Result.SENT.also { lastError = "HTTP $code" }
        else -> Result.RETRY_LATER.also { lastError = "HTTP $code" }
      }
    } catch (e: Exception) {
      lastError = e.message ?: e.javaClass.simpleName
      Result.RETRY_LATER
    } finally {
      conn.disconnect()
    }
  }

  /** Adds the point to the trip's route. Best effort: a miss only leaves a gap in the line. */
  private fun sendTripPoint(config: TrackingConfig, point: QueuedPoint) {
    val body =
      JSONObject()
        .put("trip_id", config.tripId.toString())
        .put("latitude", point.latitude.toString())
        .put("longitude", point.longitude.toString())
    val conn = (URL(config.baseUrl.trimEnd('/') + "/api/trips-geolocation/create").openConnection() as HttpURLConnection)
    try {
      conn.requestMethod = "POST"
      conn.connectTimeout = 15_000
      conn.readTimeout = 20_000
      conn.doOutput = true
      conn.setRequestProperty("Content-Type", "application/json")
      conn.setRequestProperty("Accept", "application/json")
      conn.setRequestProperty("Authorization", "Bearer ${config.token}")
      conn.outputStream.use { it.write(body.toString().toByteArray()) }
      conn.responseCode
    } catch (_: Exception) {
    } finally {
      conn.disconnect()
    }
  }

  @Volatile var lastError: String? = null
}
