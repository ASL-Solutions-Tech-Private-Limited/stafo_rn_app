import {api, ensureOk} from '../client';
import type {GeoTrackResponse} from '../types';

/** Every location fix an employee sent on a day ("yyyy-MM-dd"), roughly every 30 s while tracking. */
export async function getGeoTrack(employeeId: number, date: string) {
  const {data} = await api.post<GeoTrackResponse>('api/get-geo-location', {
    employee_id: String(employeeId),
    date,
  });
  return ensureOk(data).data ?? [];
}
