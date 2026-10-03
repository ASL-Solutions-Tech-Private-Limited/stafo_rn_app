import {useMutation, useQueryClient} from '@tanstack/react-query';
import {getEmployeeProfile, setAttendanceMode, type AttendanceModeValue} from '../../api/endpoints/employee';
import {
  assignBranch,
  assignDepartment,
  createEmployee,
  updateEmployee,
  type NewEmployee,
} from '../../api/endpoints/employees';
import type {EmployeeProfile} from '../../api/types';
import {toast} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import {employeeKeys} from '../people/employee/queries';
import {buildUpdateBody, editFromProfile, type EmployeeEdit} from './employeeForm';

export type StepResult = 'done' | 'failed' | 'skipped';

export type AddEmployeeInput = NewEmployee & {
  position: string;
  branchId: number | null;
  departmentId: number | null;
  mode: AttendanceModeValue;
};

export type AddEmployeeResult = {
  id: number;
  empId: string | null;
  steps: {position: StepResult; branch: StepResult; department: StepResult; mode: StepResult};
};

const settle = async (run: boolean, fn: () => Promise<unknown>): Promise<StepResult> => {
  if (!run) {
    return 'skipped';
  }
  try {
    await fn();
    return 'done';
  } catch {
    return 'failed';
  }
};

/**
 * Creates the employee, then sets what employees-create doesn't take: branch,
 * department, attendance mode and position (via a full-profile update). A failed
 * follow-up step doesn't undo the employee; the result says which ones to redo.
 */
export function useAddEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddEmployeeInput): Promise<AddEmployeeResult> => {
      const {id, empId} = await createEmployee(input);
      const [branch, department, mode] = await Promise.all([
        settle(!!input.branchId, () => assignBranch(id, input.branchId!)),
        settle(!!input.departmentId, () => assignDepartment(id, input.departmentId!)),
        settle(true, () => setAttendanceMode(id, input.mode)),
      ]);
      const position = await settle(!!input.position.trim(), async () => {
        const profile = (await getEmployeeProfile(id)).data as EmployeeProfile;
        await updateEmployee(
          id,
          buildUpdateBody(profile, {...editFromProfile(profile), position: input.position}),
        );
      });
      return {id, empId, steps: {position, branch, department, mode}};
    },
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({queryKey: ['people']});
    },
    onError: (e: Error) => {
      haptics.error();
      toast.error(e.message);
    },
  });
}

/** Saves the edit form: the full profile, plus branch / department when they changed. */
export function useUpdateEmployee(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      profile: EmployeeProfile;
      edit: EmployeeEdit;
      branchId: number | null;
      departmentId: number | null;
    }) => {
      await updateEmployee(id, buildUpdateBody(p.profile, p.edit));
      if (p.branchId && p.branchId !== p.profile.branch_id) {
        await assignBranch(id, p.branchId);
      }
      if (p.departmentId && p.departmentId !== p.profile.department_id) {
        await assignDepartment(id, p.departmentId);
      }
    },
    onSuccess: () => {
      haptics.success();
      toast.success('Details saved');
      queryClient.invalidateQueries({queryKey: employeeKeys.profile(id)});
      queryClient.invalidateQueries({queryKey: ['people']});
    },
    onError: (e: Error) => {
      haptics.error();
      toast.error(e.message);
    },
  });
}
