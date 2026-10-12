import {API_BASE_URL} from '../../config/env';
import {api, ensureOk} from '../client';
import type {BasicResponse} from '../types';
import type {UploadFile} from './tasks';

/**
 * "pending" until started, then "ongoing" / "pause" / "resume", and "completed"
 * once ended. Older rows may say "cancelled".
 */
export type TripStatus = string;

export type TripCustomer = {
  id: number;
  customer_name?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type Trip = {
  id: number;
  title: string;
  vehicle_id?: number | null;
  driver_id?: number | null;
  company_id: number;
  /** The employee who started it; null until then. */
  employee_id?: number | null;
  customer_id?: number | null;
  start_latitude?: string | null;
  start_longitude?: string | null;
  end_latitude?: string | null;
  end_longitude?: string | null;
  from_address?: string | null;
  to_address?: string | null;
  /** Planned km between from and to, worked out by the server. */
  distance?: number | null;
  /** Planned start and end ("yyyy-MM-dd HH:mm:ss"). The server rewrites start_time when it starts. */
  start_time?: string | null;
  end_time?: string | null;
  notes?: string | null;
  status: TripStatus;
  odometer_start?: string | number | null;
  odometer_latest?: string | number | null;
  total_expenses?: string | number | null;
  customer_info?: TripCustomer | null;
};

/** One start / pause / resume / end, with the odometer and a photo of it. */
export type TripLog = {
  id: number;
  action_type: 'start' | 'pause' | 'resume' | 'end' | string;
  latitude?: string | null;
  longitude?: string | null;
  user_type?: string | null;
  odometer?: string | null;
  image_path?: string | null;
  /** Local wall-clock time. */
  timestamp: string;
};

export type TripExpense = {
  id: number;
  trip_id: number;
  expense_type?: string | null;
  amount?: string | number | null;
  note?: string | null;
  created_at?: string | null;
};

export type Vehicle = {
  id: number;
  vehicle_no: string;
  vehicle_type?: string | null;
  fuel?: string | null;
  load_capacity?: string | null;
  speedometer?: number | string | null;
  rc_number?: string | null;
  rc_upload_path?: string | null;
  status?: string | null;
  km_travelled?: number | string | null;
};

/** Employees whose position is Driver. */
export type Driver = {id: number; name: string; emp_id?: string | null; position?: string | null};

export type TripDetail = Trip & {
  trip_logs?: TripLog[] | null;
  trip_expenses?: TripExpense[] | null;
  driver?: Driver | null;
  vehicle?: Vehicle | null;
};

export type TripPoint = {id: number; latitude: string; longitude: string; created_at?: string | null};

/** Where odometer photos are served from (the API returns bare file names). */
export const tripPhotoUrl = (filename: string) =>
  `${API_BASE_URL.replace(/\/$/, '')}/public/uploads/trip_logs/${encodeURIComponent(filename)}`;

/** The company's trips, or the signed-in driver's (the server decides from the token). */
export async function getTrips() {
  const {data} = await api.get<BasicResponse & {trips?: Trip[]}>('api/trips/list');
  return ensureOk(data).trips ?? [];
}

export async function getTrip(id: number) {
  const {data} = await api.post<BasicResponse & {trip?: TripDetail}>('api/trips/details', {id: String(id)});
  const trip = ensureOk(data).trip;
  if (!trip) {
    throw new Error('This trip no longer exists.');
  }
  return trip;
}

/** Points recorded along the way, oldest first. */
export async function getTripRoute(id: number) {
  const {data} = await api.post<BasicResponse & {data?: TripPoint[]}>('api/trips-geolocation/get', {
    trip_id: String(id),
  });
  return ensureOk(data).data ?? [];
}

export async function getVehicles() {
  const {data} = await api.get<BasicResponse & {vehicles?: Vehicle[]}>('api/vehicles/list');
  return ensureOk(data).vehicles ?? [];
}

export async function getDrivers() {
  const {data} = await api.post<BasicResponse & {drivers?: Driver[]}>('api/trips/drivers/list');
  return ensureOk(data).drivers ?? [];
}

export type TripInput = {
  title: string;
  notes: string;
  customer_name: string;
  customer_phone: string;
  from: Place;
  to: Place;
  /** "yyyy-MM-dd HH:mm" */
  start_time: string;
  end_time: string;
  vehicle_id: number;
  driver_id: number;
};

export type Place = {address: string; latitude: number; longitude: number};

function tripBody(t: TripInput) {
  return {
    title: t.title.trim(),
    notes: t.notes.trim(),
    customer_name: t.customer_name.trim(),
    customer_phone: t.customer_phone,
    // The old app always sent these blank; the server expects the keys.
    customer_email: ' ',
    customer_address: ' ',
    start_time: t.start_time,
    end_time: t.end_time,
    status: 'pending',
    from_address: t.from.address.trim(),
    start_latitude: t.from.latitude.toFixed(6),
    start_longitude: t.from.longitude.toFixed(6),
    to_address: t.to.address.trim(),
    end_latitude: t.to.latitude.toFixed(6),
    end_longitude: t.to.longitude.toFixed(6),
    driver_id: String(t.driver_id),
    vehicle_id: String(t.vehicle_id),
  };
}

export async function createTrip(t: TripInput) {
  const {data} = await api.post<BasicResponse>('api/trips/create', tripBody(t));
  return ensureOk(data);
}

export async function updateTrip(id: number, t: TripInput) {
  const {data} = await api.post<BasicResponse>(`api/trips/update/${id}`, tripBody(t));
  return ensureOk(data);
}

export async function deleteTrip(id: number) {
  const {data} = await api.post<BasicResponse>('api/trips/delete', {id: String(id)});
  return ensureOk(data);
}

/** Whether the vehicle or driver is free, i.e. not on another trip. */
export async function isAvailable(kind: 'vehicle' | 'driver', id: number) {
  const {data} = await api.post<BasicResponse & {available?: boolean}>(
    `api/trips/check-${kind}-availability`,
    {[`${kind}_id`]: String(id)},
  );
  return ensureOk(data).available !== false;
}

const multipart = {headers: {'Content-Type': 'multipart/form-data'}, timeout: 90_000};

export type TripAction = 'start' | 'pause' | 'resume' | 'end';

/** Starts, pauses, resumes or ends a trip, with the odometer reading, its photo and where they are. */
export async function sendTripAction(p: {
  tripId: number;
  companyId: string;
  type: TripAction;
  odometer: string;
  latitude: number | null;
  longitude: number | null;
  photo: UploadFile;
}) {
  const form = new FormData();
  form.append('trip_id', String(p.tripId));
  form.append('company_id', p.companyId);
  form.append('type', p.type);
  form.append('odometer', p.odometer);
  // The old app sent "null" when it had no fix.
  form.append('lat', String(p.latitude));
  form.append('long', String(p.longitude));
  form.append('image', p.photo as unknown as Blob);
  const {data} = await api.post<BasicResponse>('api/trips/trip-start-end', form, multipart);
  return ensureOk(data);
}

export async function getTripExpenses(tripId: number) {
  const {data} = await api.post<BasicResponse & {success?: boolean; data?: TripExpense[]}>(
    'api/trips-expense/list',
    {trip_id: String(tripId)},
  );
  return ensureOk(data).data ?? [];
}

export async function addTripExpense(p: {
  tripId: number;
  type: string;
  amount: string;
  note: string;
  receipt: UploadFile;
}) {
  const form = new FormData();
  form.append('trip_id', String(p.tripId));
  form.append('expense_type', p.type);
  form.append('amount', p.amount);
  form.append('note', p.note.trim());
  form.append('bill_receipt', p.receipt as unknown as Blob);
  const {data} = await api.post<BasicResponse & {success?: boolean}>(
    'api/trips-expense/create',
    form,
    multipart,
  );
  return ensureOk(data);
}

export type VehicleInput = {
  vehicle_no: string;
  vehicle_type: string;
  fuel: string;
  rc_number: string;
  speedometer: string;
  load_capacity: string;
  km_travelled: string;
  /** Required when adding; optional when editing. */
  rc?: UploadFile | null;
};

export async function saveVehicle(id: number | undefined, v: VehicleInput) {
  const form = new FormData();
  form.append('vehicle_no', v.vehicle_no.trim().toUpperCase());
  form.append('vehicle_type', v.vehicle_type);
  form.append('fuel', v.fuel);
  form.append('rc_number', v.rc_number.trim().toUpperCase());
  form.append('speedometer', v.speedometer);
  form.append('load_capacity', v.load_capacity);
  form.append('km_travelled', v.km_travelled);
  form.append('status', 'active');
  if (v.rc) {
    form.append('rc_upload_path', v.rc as unknown as Blob);
  }
  const {data} = await api.post<BasicResponse>(
    id ? `api/vehicles/update/${id}` : 'api/vehicles/create',
    form,
    multipart,
  );
  return ensureOk(data);
}

export async function deleteVehicle(id: number) {
  const {data} = await api.post<BasicResponse>('api/vehicles/delete', {vehicle_id: String(id)});
  return ensureOk(data);
}
