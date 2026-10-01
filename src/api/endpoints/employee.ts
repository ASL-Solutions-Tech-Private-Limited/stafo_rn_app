import {api, ensureOk} from '../client';
import type {
  BasicResponse,
  EmployeeDocumentsResponse,
  EmployeeProfileResponse,
  LeaveListResponse,
  MissedPunchListResponse,
  MonthAttendanceResponse,
  SalarySlipResponse,
  ShiftListResponse,
} from '../types';

// ---------- Reads ----------

export async function getEmployeeProfile(employeeId: number) {
  const {data} = await api.get<EmployeeProfileResponse>(`api/employee-details/${employeeId}`);
  return ensureOk(data);
}

/** Daily attendance records for a month ("yyyy-MM"). */
export async function getMonthAttendance(employeeId: number, month: string) {
  const {data} = await api.get<MonthAttendanceResponse>('api/attendance-list', {
    params: {employee_id: employeeId, month},
  });
  return ensureOk(data).data ?? [];
}

/** Every leave request an employee has made (all statuses). */
export async function getEmployeeLeaves(employeeId: number) {
  const {data} = await api.post<LeaveListResponse>('api/leave-list', {employee_id: String(employeeId)});
  return ensureOk(data).data ?? [];
}

/** All leave requests in the company (used to show who else is off). */
export async function getCompanyLeaves(companyId: string) {
  const {data} = await api.post<LeaveListResponse>('api/leave-list', {company_id: companyId, employee_id: ''});
  return ensureOk(data).data ?? [];
}

/** Missed punch-out correction requests across the company. */
export async function getMissedPunchRequests() {
  const {data} = await api.post<MissedPunchListResponse>('api/company/missed-punchout-list');
  return ensureOk(data).data ?? [];
}

export async function getEmployeeDocuments(employeeId: number) {
  const {data} = await api.post<EmployeeDocumentsResponse>('api/employee-documents/list', {
    employee_id: String(employeeId),
  });
  return data.data ?? [];
}

export async function getShifts(companyId: string) {
  const {data} = await api.get<ShiftListResponse>('api/shifts', {params: {company_id: companyId}});
  return ensureOk(data).data ?? [];
}

/** Payslip PDF for a month, or null when payroll wasn't run that month. */
export async function getSalarySlip(companyId: string, employeeId: number, month: number, year: number) {
  const {data} = await api.post<SalarySlipResponse>('api/employee/salary-slip/download', {
    company_id: companyId,
    employee_id: String(employeeId),
    month: String(month).padStart(2, '0'),
    year: String(year),
  });
  return data.success && data.data?.download_url ? data.data : null;
}

// ---------- Admin actions ----------

export async function setLeaveStatus(leaveId: number, status: 'approved' | 'rejected') {
  const {data} = await api.post<BasicResponse>('api/leave-request-status-change', {id: String(leaveId), status});
  return ensureOk(data);
}

/** How a day is recorded when its missed punch-out request is rejected. */
export type RejectedPunchMark = 'Absent' | 'Halfday';

export async function setMissedPunchStatus(
  requestId: number,
  status: 'Approved' | 'Rejected',
  rejectReason?: string,
  markAs?: RejectedPunchMark,
) {
  const {data} = await api.post<BasicResponse>('api/company/missed-punchout-action', {
    request_id: requestId,
    status,
    reject_reason: rejectReason ?? null,
    reject_attendance_type: status === 'Rejected' ? markAs ?? null : null,
  });
  return ensureOk(data);
}

export type AttendanceModeValue = 'geo' | 'selfie' | 'qr code';

export async function setAttendanceMode(employeeId: number, mode: AttendanceModeValue) {
  const {data} = await api.post<BasicResponse>('api/set-attendance-type', {
    employee_id: employeeId,
    attendance_type: mode,
  });
  return ensureOk(data);
}

export async function assignShift(employeeId: number, shiftId: number) {
  const form = new URLSearchParams();
  form.append('employee_id', String(employeeId));
  form.append('shift_ids[0]', String(shiftId));
  const {data} = await api.post<BasicResponse>('api/employees/assign-shift', form.toString(), {
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
  });
  return ensureOk(data);
}

/** Ask the employee to consent to live location tracking (geo_status "1"). */
export async function requestLiveLocation(employeeId: number) {
  const {data} = await api.post<BasicResponse>('api/update-geo-status', {
    employee_id: String(employeeId),
    geo_status: '1',
  });
  return ensureOk(data);
}

export async function setEmployeeActive(employeeId: number, active: boolean) {
  const {data} = await api.post<BasicResponse>('api/employees-status-change', {
    id: String(employeeId),
    status: active ? '1' : '0',
  });
  return ensureOk(data);
}

export type LocalImage = {uri: string; mime: string; name: string};

/** Replaces the employee's reference selfie (multipart, same API as the old app). */
export async function uploadReferenceSelfie(employeeId: number, image: LocalImage) {
  const form = new FormData();
  form.append('employee_id', String(employeeId));
  form.append('selfie_image', {uri: image.uri, type: image.mime, name: image.name} as unknown as Blob);
  const {data} = await api.post<BasicResponse & {selfie_image?: string}>('api/employee/selfie-image-upload', form, {
    headers: {'Content-Type': 'multipart/form-data'},
    // Uploads can be slow on mobile data.
    timeout: 60_000,
  });
  return ensureOk(data);
}
