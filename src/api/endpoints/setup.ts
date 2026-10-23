import {api, ensureOk} from '../client';
import type {
  BasicResponse,
  Branch,
  Department,
  Holiday,
  LeaveTypeRecord,
  ListResponse,
  PolicyListResponse,
} from '../types';

const list = async <T>(url: string, companyId: string) => {
  const {data} = await api.get<ListResponse<T>>(url, {params: {company_id: companyId}});
  return ensureOk(data).data ?? [];
};

// ---------- Branches ----------

export type BranchInput = {
  branch_name: string;
  branch_address: string;
  latitude: number | null;
  longitude: number | null;
  /** Radius in metres. */
  radar: number;
};

export const getBranches = (companyId: string) => list<Branch>('api/branch/list', companyId);

const branchBody = (companyId: string, b: BranchInput) => ({
  company_id: Number(companyId),
  branch_name: b.branch_name.trim(),
  branch_address: b.branch_address.trim(),
  latitude: b.latitude == null ? '' : String(b.latitude),
  longitude: b.longitude == null ? '' : String(b.longitude),
  radar: String(b.radar),
});

export async function saveBranch(companyId: string, b: BranchInput, id?: number) {
  const url = id ? `api/branch/update/${id}` : 'api/branch/create';
  const {data} = await api.post<BasicResponse>(url, branchBody(companyId, b));
  return ensureOk(data);
}

export async function deleteBranch(id: number) {
  const {data} = await api.delete<BasicResponse>(`api/branch/delete/${id}`);
  return ensureOk(data);
}

// ---------- Departments ----------

export const getDepartments = (companyId: string) => list<Department>('api/departments', companyId);

export async function createDepartment(name: string, description = '') {
  const {data} = await api.post<BasicResponse>('api/departments', {name: name.trim(), description});
  return ensureOk(data);
}

// ---------- Shifts (list lives in employee.ts: getShifts) ----------

export type ShiftInput = {
  shift_name: string;
  /** "HH:mm" */
  start_time: string;
  end_time: string;
  /** Monday first. */
  days: boolean[];
};

const shiftBody = (s: ShiftInput) => ({
  shift_name: s.shift_name.trim(),
  start_time: s.start_time,
  end_time: s.end_time,
  monday: s.days[0],
  tuesday: s.days[1],
  wednesday: s.days[2],
  thursday: s.days[3],
  friday: s.days[4],
  saturday: s.days[5],
  sunday: s.days[6],
});

export async function saveShift(s: ShiftInput, id?: number) {
  const {data} = id
    ? await api.put<BasicResponse>(`api/shifts/${id}`, shiftBody(s))
    : await api.post<BasicResponse>('api/shifts', shiftBody(s));
  return ensureOk(data);
}

export async function deleteShift(id: number) {
  const {data} = await api.delete<BasicResponse>(`api/shifts/${id}`);
  return ensureOk(data);
}

// ---------- Holidays ----------

export const getHolidays = (companyId: string) => list<Holiday>('api/holidays', companyId);

export async function createHoliday(h: {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
}) {
  const {data} = await api.post<BasicResponse>('api/holidays-create', {
    holidays: [{...h, title: h.title.trim(), description: h.description.trim()}],
  });
  return ensureOk(data);
}

export async function deleteHoliday(id: number) {
  const {data} = await api.delete<BasicResponse>(`api/holidays-delete/${id}`);
  return ensureOk(data);
}

// ---------- Leave types ----------

export type LeaveTypeInput = {name: string; no_of_days: number; description: string; paid: boolean};

export const getLeaveTypes = (companyId: string) => list<LeaveTypeRecord>('api/leavetype/list', companyId);

export async function saveLeaveType(companyId: string, t: LeaveTypeInput, id?: number) {
  const body = {
    company_id: Number(companyId),
    name: t.name.trim(),
    no_of_days: t.no_of_days,
    description: t.description.trim(),
    is_paid: t.paid ? '1' : '0',
  };
  const {data} = await api.post<BasicResponse>(
    id ? `api/leavetype/update/${id}` : 'api/leavetype/create',
    body,
  );
  return ensureOk(data);
}

export async function deleteLeaveType(id: number) {
  const {data} = await api.delete<BasicResponse>(`api/leavetype/delete/${id}`);
  return ensureOk(data);
}

// ---------- Policies ----------

export async function getPolicies(companyId: string) {
  const {data} = await api.get<PolicyListResponse>('api/policy', {params: {company_id: companyId}});
  const body = ensureOk(data);
  return {policies: body.data ?? [], filePath: body.file_path ?? null};
}

export async function createPolicy(p: {
  title: string;
  description: string;
  file: {uri: string; name: string; type: string};
}) {
  const form = new FormData();
  form.append('title', p.title.trim());
  form.append('description', p.description.trim());
  form.append('file', p.file as unknown as Blob);
  const {data} = await api.post<BasicResponse>('api/policy-create', form, {
    headers: {'Content-Type': 'multipart/form-data'},
    timeout: 60_000,
  });
  return ensureOk(data);
}

// ---------- Attendance QR codes ----------

/**
 * The QR code people on QR attendance scan, as SVG. It's fixed per branch +
 * department: asking again returns the same code, so this never invalidates a
 * printed one.
 */
export async function getAttendanceQr(companyId: string, branchId: number, departmentId: number) {
  const {data} = await api.post<string>(
    'api/generate-qrcode',
    {company_id: Number(companyId), branch_id: branchId, department_id: departmentId},
    {responseType: 'text', headers: {Accept: 'image/svg+xml'}},
  );
  if (typeof data !== 'string' || !data.includes('<svg')) {
    throw new Error('Couldn’t get the QR code. Please try again.');
  }
  return data;
}

export type GraceSettings = {
  /** Minutes after the shift start a punch-in may come and still not be late. */
  graceMinutes: number;
  /** How many days a month that grace may be used. */
  graceDays: number;
  /** As the company set it; meaning still to be agreed with the backend. */
  overtimeCharges: string | null;
};

/** The company's grace settings (api/company/grace-settings/list). */
export async function getGraceSettings(): Promise<GraceSettings> {
  const {data} = await api.get<{
    success?: boolean;
    status?: boolean;
    message?: string;
    data?: Array<{label?: string; value?: string; status?: string}>;
    formatted?: Record<string, string | undefined>;
  }>('api/company/grace-settings/list');
  const body = ensureOk(data);
  const active = Object.fromEntries(
    (body.data ?? [])
      .filter(r => !r.status || r.status.toLowerCase() === 'active')
      .map(r => [r.label, r.value]),
  );
  const v = (k: string) => body.formatted?.[k] ?? active[k];
  const num = (k: string) => {
    const n = Number(v(k));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  return {
    graceMinutes: num('grace_time'),
    graceDays: num('grace_days'),
    overtimeCharges: v('over_time_charges') ?? null,
  };
}

/** Saves the company's grace settings (api/company/grace-settings/update). */
export async function updateGraceSettings(
  companyId: string,
  s: {graceMinutes: number; graceDays: number; overtimeCharges: string},
) {
  const {data} = await api.post<{success?: boolean; status?: boolean; message?: string}>(
    'api/company/grace-settings/update',
    {
      company_id: Number(companyId),
      grace_time: String(s.graceMinutes),
      grace_days: String(s.graceDays),
      over_time_charges: s.overtimeCharges.trim(),
    },
  );
  return ensureOk(data);
}
