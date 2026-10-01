import {api, ensureOk} from '../client';
import type {BasicResponse, SendOtpResponse, VerifyOtpRequest, VerifyOtpResponse} from '../types';

export async function sendOtp(mobileNumber: string) {
  const {data} = await api.post<SendOtpResponse>('api/send-otp', {mobile_number: mobileNumber});
  return ensureOk(data);
}

export async function verifyOtp(request: VerifyOtpRequest) {
  const {data} = await api.post<VerifyOtpResponse>('api/verify-otp', request);
  return ensureOk(data);
}

/** Ask the employee's company to approve this phone as their new device. */
export async function requestDeviceChange(employeeId: number) {
  const {data} = await api.post<BasicResponse>('api/change-device', {
    employee_id: String(employeeId),
    status: 'pending',
  });
  return ensureOk(data);
}
