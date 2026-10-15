import {api, ensureOk} from '../client';
import type {BasicResponse, Branch, MissedPunchListResponse} from '../types';
import type {LocalImage} from './employee';

/** The employee's branch, with its geofence (latitude, longitude, radar in metres). */
export async function getMyBranch(employeeId: number) {
  const {data} = await api.post<BasicResponse & {data?: Branch}>('api/employee-branch-info', {
    employee_id: String(employeeId),
  });
  return ensureOk(data).data ?? null;
}

/** Geo punch: the server checks the fence and toggles in / out. */
export async function punchWithLocation(employeeId: number, latitude: number, longitude: number) {
  const {data} = await api.post<BasicResponse & {data?: {punch_in?: string; punch_out?: string | null}}>(
    'api/employee/punch',
    {employee_id: String(employeeId), latitude: String(latitude), longitude: String(longitude)},
  );
  return ensureOk(data);
}

/** Selfie punch: the server matches the face against the reference selfie. */
export async function punchWithSelfie(employeeId: number, image: LocalImage) {
  const form = new FormData();
  form.append('employee_id', String(employeeId));
  form.append('image', {uri: image.uri, type: image.mime, name: image.name} as unknown as Blob);
  const {data} = await api.post<BasicResponse & {similarity?: number}>(
    'api/employee/selfie-attendance',
    form,
    {
      headers: {'Content-Type': 'multipart/form-data'},
      timeout: 60_000,
    },
  );
  return ensureOk(data);
}

/** QR punch with the code scanned at the branch. */
export async function punchWithQr(employeeId: number, qrcode: string) {
  const {data} = await api.post<BasicResponse>('api/employee/qr-attendance', {
    employee_id: employeeId,
    qrcode,
  });
  return ensureOk(data);
}

/** The employee's answer to the company's location request: allow ("2") or not now ("0"). */
export async function answerLocationRequest(employeeId: number, allow: boolean) {
  const {data} = await api.post<BasicResponse>('api/update-geo-status', {
    employee_id: String(employeeId),
    geo_status: allow ? '2' : '0',
  });
  return ensureOk(data);
}

/** The employee's own missed punch-out requests. */
export async function getMyPunchFixes(employeeId: number) {
  const {data} = await api.post<MissedPunchListResponse>('api/employee/missed-punchout-list', null, {
    params: {employee_id: employeeId},
  });
  return ensureOk(data).data ?? [];
}

/** Ask for a forgotten punch-out to be added: date "yyyy-MM-dd", time "HH:mm". */
export async function askForPunchOut(body: {
  employee_id: number;
  date: string;
  punch_out_time: string;
  reason: string;
}) {
  const {data} = await api.post<BasicResponse>('api/employee/missed-punchout-request', body);
  return ensureOk(data);
}
