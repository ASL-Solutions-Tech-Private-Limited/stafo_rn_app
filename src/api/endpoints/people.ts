import {api, ensureOk} from '../client';
import type {CompanyEmployee, EmployeesListResponse} from '../types';

/** All employees, with punches and attendance limited to `date` (yyyy-MM-dd). */
export async function getEmployeesForDate(date: string): Promise<CompanyEmployee[]> {
  const {data} = await api.post<EmployeesListResponse>('api/employees-list', {date});
  return ensureOk(data).data ?? [];
}

export function employeePhotoUrl(e: Pick<CompanyEmployee, 'image' | 'image_path'>) {
  if (!e.image) {
    return null;
  }
  if (/^https?:\/\//.test(e.image)) {
    return e.image;
  }
  return e.image_path ? `${e.image_path.replace(/\/$/, '')}/${e.image}` : null;
}
