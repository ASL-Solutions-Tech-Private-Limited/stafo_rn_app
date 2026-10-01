import {useQuery} from '@tanstack/react-query';
import {
  createDepartment,
  createHoliday,
  createPolicy,
  deleteBranch,
  deleteHoliday,
  deleteLeaveType,
  deleteShift,
  getBranches,
  getDepartments,
  getHolidays,
  getLeaveTypes,
  getPolicies,
  saveBranch,
  saveLeaveType,
  saveShift,
  type BranchInput,
  type LeaveTypeInput,
  type ShiftInput,
} from '../../api/endpoints/setup';
import {useSession} from '../../store/session';
import {employeeKeys, useAdminAction, useShifts} from '../people/employee/queries';

export const setupKeys = {
  branches: ['setup', 'branches'] as const,
  departments: ['setup', 'departments'] as const,
  holidays: ['setup', 'holidays'] as const,
  leaveTypes: ['setup', 'leave-types'] as const,
  policies: ['setup', 'policies'] as const,
};

function useCompanyQuery<T>(key: readonly unknown[], fn: (companyId: string) => Promise<T>) {
  const companyId = useSession(s => s.companyId);
  return useQuery({queryKey: key, queryFn: () => fn(companyId!), enabled: !!companyId, staleTime: 60_000});
}

export const useBranches = () => useCompanyQuery(setupKeys.branches, getBranches);
export const useDepartments = () => useCompanyQuery(setupKeys.departments, getDepartments);
export const useHolidays = () => useCompanyQuery(setupKeys.holidays, getHolidays);
export const useLeaveTypes = () => useCompanyQuery(setupKeys.leaveTypes, getLeaveTypes);
export const usePolicies = () => useCompanyQuery(setupKeys.policies, getPolicies);
export {useShifts};

const companyId = () => useSession.getState().companyId!;

export const useSaveBranch = () =>
  useAdminAction(
    ({input, id}: {input: BranchInput; id?: number}) => saveBranch(companyId(), input, id),
    () => [setupKeys.branches],
    'Branch saved',
  );

export const useDeleteBranch = () =>
  useAdminAction(
    (id: number) => deleteBranch(id),
    () => [setupKeys.branches],
    'Branch removed',
  );

export const useCreateDepartment = () =>
  useAdminAction(
    (name: string) => createDepartment(name),
    () => [setupKeys.departments],
    'Department added',
  );

export const useSaveShift = () =>
  useAdminAction(
    ({input, id}: {input: ShiftInput; id?: number}) => saveShift(input, id),
    () => [employeeKeys.shifts],
    'Shift saved',
  );

export const useDeleteShift = () =>
  useAdminAction(
    (id: number) => deleteShift(id),
    () => [employeeKeys.shifts],
    'Shift removed',
  );

export const useCreateHoliday = () =>
  useAdminAction(
    (h: {title: string; description: string; start_date: string; end_date: string}) => createHoliday(h),
    () => [setupKeys.holidays],
    'Holiday added',
  );

export const useDeleteHoliday = () =>
  useAdminAction(
    (id: number) => deleteHoliday(id),
    () => [setupKeys.holidays],
    'Holiday removed',
  );

export const useSaveLeaveType = () =>
  useAdminAction(
    ({input, id}: {input: LeaveTypeInput; id?: number}) => saveLeaveType(companyId(), input, id),
    () => [setupKeys.leaveTypes, employeeKeys.companyLeaves],
    'Leave type saved',
  );

export const useDeleteLeaveType = () =>
  useAdminAction(
    (id: number) => deleteLeaveType(id),
    () => [setupKeys.leaveTypes],
    'Leave type removed',
  );

export const useCreatePolicy = () =>
  useAdminAction(
    (p: {title: string; description: string; file: {uri: string; name: string; type: string}}) =>
      createPolicy(p),
    () => [setupKeys.policies],
    'Policy uploaded',
  );
