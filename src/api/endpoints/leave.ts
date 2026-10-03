import {api, ensureOk} from '../client';

/** Apply for leave. Dates are "yyyy-MM-dd"; leave_type is the leave type's id. */
export async function applyForLeave(body: {
  employee_id: number;
  from_date: string;
  to_date: string;
  leave_type: number;
  reason: string;
}) {
  const {data} = await api.post<{status?: boolean; message?: string}>('api/leave-request', {
    ...body,
    employee_id: String(body.employee_id),
  });
  return ensureOk(data);
}
