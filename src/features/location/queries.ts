import {useMemo} from 'react';
import {useQueries, useQuery} from '@tanstack/react-query';
import {requestLiveLocation} from '../../api/endpoints/employee';
import {getGeoTrack} from '../../api/endpoints/location';
import type {CompanyEmployee} from '../../api/types';
import {toDateKey} from '../../lib/date';
import {useAdminAction} from '../people/employee/queries';
import {usePeopleOnDate} from '../people/queries';
import {summarizeTrack, type TrackSummary} from './track';

/** Tracks refresh this often while a location screen is open. */
const REFRESH_MS = 30_000;

export const geoTrackKey = (id: number, date: string) => ['geo-track', id, date] as const;

export type SharingState = 'sharing' | 'requested' | 'off';

export type TrackedPerson = {
  employee: CompanyEmployee;
  sharing: SharingState;
  summary?: TrackSummary;
  loading: boolean;
};

const sharingOf = (e: CompanyEmployee): SharingState =>
  e.geo_status === '2' ? 'sharing' : e.geo_status === '1' ? 'requested' : 'off';

/** Everyone in the company with their sharing state, and today's track for those sharing. */
export function useTrackedPeople() {
  const today = toDateKey();
  const people = usePeopleOnDate(today);
  const employees = useMemo(
    () => people.people.map(p => p.employee).filter(e => (e.status ?? '1') === '1'),
    [people.people],
  );
  const sharing = employees.filter(e => sharingOf(e) === 'sharing');

  const tracks = useQueries({
    queries: sharing.map(e => ({
      queryKey: geoTrackKey(e.id, today),
      queryFn: () => getGeoTrack(e.id, today),
      refetchInterval: REFRESH_MS,
    })),
  });

  const rows: TrackedPerson[] = employees.map(e => {
    const i = sharing.indexOf(e);
    const q = i >= 0 ? tracks[i] : undefined;
    return {
      employee: e,
      sharing: sharingOf(e),
      summary: q?.data ? summarizeTrack(q.data) : undefined,
      loading: !!q?.isPending,
    };
  });

  return {
    rows,
    isPending: people.query.isPending,
    isError: people.query.isError,
    error: people.query.error,
    updatedAt: Math.max(people.query.dataUpdatedAt, ...tracks.map(t => t.dataUpdatedAt), 0),
    refetch: () => Promise.all([people.query.refetch(), ...tracks.map(t => t.refetch())]),
  };
}

/** One employee's track for a day; refreshes while it's today. */
export function useEmployeeTrack(id: number, date: string) {
  const isToday = date === toDateKey();
  return useQuery({
    queryKey: geoTrackKey(id, date),
    queryFn: () => getGeoTrack(id, date),
    select: summarizeTrack,
    refetchInterval: isToday ? REFRESH_MS : false,
    staleTime: isToday ? 0 : 10 * 60_000,
  });
}

export function useRequestLocation() {
  return useAdminAction(
    (employeeId: number) => requestLiveLocation(employeeId),
    () => [['people']],
    'Location request sent',
  );
}
