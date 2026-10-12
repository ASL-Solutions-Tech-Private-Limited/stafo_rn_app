import {storage} from '../../lib/storage';

const KEY = 'active_trip';
/** A trip left on (they forgot to end it) stops recording after this long. */
export const TRIP_MAX_MS = 12 * 60 * 60_000;

export type ActiveTrip = {id: number; title: string; stopAt: number};

/** The trip this phone is recording, if it's still within its window. */
export function getActiveTrip(now = Date.now()): ActiveTrip | null {
  try {
    const raw = storage.getString(KEY);
    const t = raw ? (JSON.parse(raw) as ActiveTrip) : null;
    return t && t.stopAt > now ? t : null;
  } catch {
    return null;
  }
}

/** Starts recording a trip's route (on start or resume), or stops it (null, on pause or end). */
export function setActiveTrip(trip: {id: number; title: string} | null, now = Date.now()) {
  if (trip) {
    const current = getActiveTrip(now);
    // Keep the window when the same trip is confirmed again, so tracking isn't restarted.
    const stopAt = current?.id === trip.id ? current.stopAt : now + TRIP_MAX_MS;
    storage.set(KEY, JSON.stringify({id: trip.id, title: trip.title, stopAt}));
  } else {
    storage.remove(KEY);
  }
}
