import {api, ensureOk} from '../client';
import type {BasicResponse, DeviceRequestsResponse} from '../types';

/** Employees in the company with a device sign-in request (any status). */
export async function getDeviceRequests(companyId: string) {
  const {data} = await api.post<DeviceRequestsResponse>('api/device-requests-list', {
    company_id: Number(companyId),
  });
  return ensureOk(data).data ?? [];
}

/** Allow or refuse an employee's new phone. Allowing signs their old phone out. */
export async function decideDeviceRequest(
  employeeId: number,
  deviceId: string,
  decision: 'approve' | 'reject',
) {
  const {data} = await api.post<BasicResponse>('api/company/approve-device', {
    employee_id: employeeId,
    status: decision,
    device_id: deviceId,
  });
  return ensureOk(data);
}
