import {useEffect} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import ImageCropPicker from 'react-native-image-crop-picker';
import type {UploadFile} from '../../api/endpoints/tasks';
import {
  addTripExpense,
  createTrip,
  deleteTrip,
  deleteVehicle,
  getDrivers,
  getTrip,
  getTripExpenses,
  getTripRoute,
  getTrips,
  getVehicles,
  isAvailable,
  saveVehicle,
  sendTripAction,
  updateTrip,
  type Trip,
  type TripAction,
  type TripInput,
  type VehicleInput,
} from '../../api/endpoints/trips';
import {toast} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import {useSession} from '../../store/session';
import {getActiveTrip, setActiveTrip} from '../tracking/activeTrip';
import {resyncTracking} from '../tracking/useTrackingSync';
import {phaseOf, sortTrips} from './tripLogic';

/**
 * Keeps this phone's route recording in step with the server: on for a trip
 * they drive that's on the road, off once it's paused or ended (even from
 * another phone or by the company).
 */
export function reconcileActiveTrip(
  trips: Pick<Trip, 'id' | 'title' | 'status' | 'driver_id'>[],
  me: number,
) {
  const mine = trips.filter(t => t.driver_id === me);
  const live = mine.find(t => phaseOf(t.status) === 'live');
  const current = getActiveTrip();
  if (live && current?.id !== live.id) {
    setActiveTrip(live);
  } else if (!live && current && mine.some(t => t.id === current.id)) {
    setActiveTrip(null);
  } else {
    return;
  }
  resyncTracking();
}

export const tripKeys = {
  list: (companyId: string | null, employeeId?: number) => ['trips', companyId, employeeId ?? 'all'] as const,
  detail: (id: number) => ['trips', 'detail', id] as const,
  route: (id: number) => ['trips', 'route', id] as const,
  expenses: (id: number) => ['trips', 'expenses', id] as const,
  vehicles: ['vehicles'] as const,
  drivers: ['trip-drivers'] as const,
};

/** The company's trips, or the ones the signed-in employee drives (the server filters by token). */
export function useTrips() {
  const companyId = useSession(s => s.companyId);
  const isCompany = useSession(s => s.role === 'company');
  const employeeId = useSession(s => s.employee?.id);
  const query = useQuery({
    queryKey: tripKeys.list(companyId, isCompany ? undefined : employeeId),
    queryFn: getTrips,
    enabled: !!companyId,
    select: sortTrips,
  });
  useEffect(() => {
    if (!isCompany && employeeId && query.data) {
      reconcileActiveTrip(query.data, employeeId);
    }
  }, [isCompany, employeeId, query.data]);
  return query;
}

/** Refreshes every minute while the trip is on the road. */
export function useTrip(id: number, enabled = true) {
  return useQuery({
    queryKey: tripKeys.detail(id),
    queryFn: () => getTrip(id),
    enabled,
    refetchInterval: q => (phaseOf(q.state.data?.status) === 'live' ? LIVE_REFRESH_MS : false),
  });
}

export const LIVE_REFRESH_MS = 60_000;

export function useTripRoute(id: number, enabled: boolean, refetchInterval?: number) {
  return useQuery({
    queryKey: tripKeys.route(id),
    queryFn: () => getTripRoute(id),
    enabled,
    refetchInterval,
    select: points =>
      points
        .map(p => ({latitude: Number(p.latitude), longitude: Number(p.longitude)}))
        .filter(
          p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && p.latitude && p.longitude,
        ),
  });
}

export function useTripExpenses(id: number) {
  return useQuery({queryKey: tripKeys.expenses(id), queryFn: () => getTripExpenses(id)});
}

export function useVehicles(enabled = true) {
  return useQuery({queryKey: tripKeys.vehicles, queryFn: getVehicles, enabled});
}

export function useDrivers(enabled = true) {
  return useQuery({queryKey: tripKeys.drivers, queryFn: getDrivers, enabled});
}

/** Whether a picked vehicle or driver is free; null while unknown. */
export function useAvailability(kind: 'vehicle' | 'driver', id: number | null, skip: boolean) {
  return useQuery({
    queryKey: ['trip-availability', kind, id],
    queryFn: () => isAvailable(kind, id!),
    enabled: id != null && !skip,
    staleTime: 30_000,
  });
}

function useTripMutation<A>(fn: (a: A) => Promise<unknown>, done?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      haptics.success();
      if (done) {
        toast.success(done);
      }
      queryClient.invalidateQueries({queryKey: ['trips']});
      queryClient.invalidateQueries({queryKey: tripKeys.vehicles});
      queryClient.invalidateQueries({queryKey: ['trip-availability']});
    },
    onError: (e: Error) => {
      haptics.error();
      toast.error(e.message);
    },
  });
}

export const useSaveTrip = () =>
  useTripMutation((p: {id?: number; input: TripInput}) =>
    p.id ? updateTrip(p.id, p.input) : createTrip(p.input),
  );

export const useDeleteTrip = () => useTripMutation((id: number) => deleteTrip(id), 'Trip deleted');

export function useTripAction() {
  const companyId = useSession(s => s.companyId);
  const me = useSession(s => (s.role === 'employee' ? s.employee?.id : undefined));
  return useTripMutation(
    async (p: {
      trip: Pick<Trip, 'id' | 'title' | 'driver_id'>;
      type: TripAction;
      odometer: string;
      latitude: number | null;
      longitude: number | null;
      photo: UploadFile;
    }) => {
      await sendTripAction({...p, tripId: p.trip.id, companyId: companyId ?? ''});
      // The driver's phone records the route while the trip is on the road.
      if (me != null && p.trip.driver_id === me) {
        setActiveTrip(p.type === 'start' || p.type === 'resume' ? p.trip : null);
        resyncTracking();
      }
    },
  );
}

export const useAddTripExpense = () =>
  useTripMutation(
    (p: {tripId: number; type: string; amount: string; note: string; receipt: UploadFile}) =>
      addTripExpense(p),
    'Expense added',
  );

export const useSaveVehicle = () =>
  useTripMutation((p: {id?: number; input: VehicleInput}) => saveVehicle(p.id, p.input));

export const useDeleteVehicle = () => useTripMutation((id: number) => deleteVehicle(id), 'Vehicle removed');

/** Opens the camera for a JPEG (≤1600px). Null if they cancel. */
export async function takePhoto(name: string): Promise<UploadFile | null> {
  try {
    const image = await ImageCropPicker.openCamera({
      mediaType: 'photo',
      compressImageMaxWidth: 1600,
      compressImageMaxHeight: 1600,
      compressImageQuality: 0.8,
      forceJpg: true,
    });
    return {uri: image.path, name: `${name}-${Date.now()}.jpg`, type: 'image/jpeg'};
  } catch (e) {
    const code = (e as {code?: string}).code;
    if (code !== 'E_PICKER_CANCELLED') {
      toast.error(
        code === 'E_NO_CAMERA_PERMISSION'
          ? 'Camera access is off. Turn it on for STAFO in Settings.'
          : 'Couldn’t open the camera.',
      );
    }
    return null;
  }
}
