import {api, ensureOk} from '../client';
import type {BasicResponse} from '../types';

export type NewEmployee = {
  name: string;
  /** 10 digits; they sign in with it. */
  phone: string;
  email: string;
  /** yyyy-MM-dd */
  dateOfJoining: string;
  gender: string;
  address: string;
  salary: number;
  shiftIds: number[];
};

/** Creates the employee and returns their id. Branch, department and mode are set separately. */
export async function createEmployee(e: NewEmployee) {
  const {data} = await api.post<BasicResponse & {data?: {employee?: {id: number; emp_id?: string}}}>(
    'api/employees-create',
    {
      name: e.name.trim(),
      email: e.email.trim(),
      phone: e.phone,
      // The old app sends this misspelt key; send both so it lands either way.
      date_of_joianing: e.dateOfJoining,
      date_of_joining: e.dateOfJoining,
      gender: e.gender,
      address: e.address.trim(),
      salary: String(e.salary),
      shift_ids: e.shiftIds.map(String),
    },
  );
  const body = ensureOk(data);
  const id = body.data?.employee?.id;
  if (!id) {
    throw new Error(body.message || 'The employee was not created.');
  }
  return {id, empId: body.data?.employee?.emp_id ?? null};
}

export async function assignBranch(employeeId: number, branchId: number) {
  const {data} = await api.post<BasicResponse>('api/employee/assign-branch', {
    employee_id: String(employeeId),
    branch_id: branchId,
  });
  return ensureOk(data);
}

export async function assignDepartment(employeeId: number, departmentId: number) {
  const {data} = await api.post<BasicResponse>('api/employee/assign-department', {
    employee_id: String(employeeId),
    department_id: departmentId,
  });
  return ensureOk(data);
}

/** The whole profile, as employees-update/{id} expects it. Build it with buildUpdateBody. */
export type EmployeeUpdateBody = Record<string, string | number | null>;

export async function updateEmployee(id: number, body: EmployeeUpdateBody) {
  const {data} = await api.post<BasicResponse>(`api/employees-update/${id}`, body);
  return ensureOk(data);
}
