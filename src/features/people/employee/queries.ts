import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
  assignShift,
  getCompanyLeaves,
  getEmployeeDocuments,
  getEmployeeLeaves,
  getEmployeeProfile,
  getMissedPunchRequests,
  getMonthAttendance,
  getSalarySlip,
  getShifts,
  requestLiveLocation,
  setAttendanceMode,
  setEmployeeActive,
  setLeaveStatus,
  setMissedPunchStatus,
  uploadReferenceSelfie,
  type AttendanceModeValue,
  type LocalImage,
} from '../../../api/endpoints/employee';
import {toast} from '../../../components/ui';
import {haptics} from '../../../lib/haptics';
import {useSession} from '../../../store/session';

export const employeeKeys = {
  profile: (id: number) => ['employee', id, 'profile'] as const,
  month: (id: number, month: string) => ['employee', id, 'month', month] as const,
  leaves: (id: number) => ['employee', id, 'leaves'] as const,
  documents: (id: number) => ['employee', id, 'documents'] as const,
  payslips: (id: number) => ['employee', id, 'payslips'] as const,
  companyLeaves: ['company-leaves'] as const,
  missedPunch: ['missed-punch'] as const,
  shifts: ['shifts'] as const,
};

export function useEmployeeProfile(id: number) {
  return useQuery({queryKey: employeeKeys.profile(id), queryFn: () => getEmployeeProfile(id)});
}

export function useMonthAttendance(id: number, month: string) {
  return useQuery({queryKey: employeeKeys.month(id, month), queryFn: () => getMonthAttendance(id, month)});
}

export function useEmployeeLeaves(id: number) {
  return useQuery({queryKey: employeeKeys.leaves(id), queryFn: () => getEmployeeLeaves(id)});
}

export function useCompanyLeaves() {
  const companyId = useSession(s => s.companyId);
  return useQuery({
    queryKey: employeeKeys.companyLeaves,
    queryFn: () => getCompanyLeaves(companyId!),
    enabled: !!companyId,
    staleTime: 5 * 60_000,
  });
}

/** This employee's missed punch-out requests, newest first. */
export function useMissedPunchRequests(id: number) {
  return useQuery({
    queryKey: employeeKeys.missedPunch,
    queryFn: getMissedPunchRequests,
    select: list => list.filter(r => r.employee_id === id).sort((a, b) => b.id - a.id),
  });
}

export function useEmployeeDocuments(id: number, enabled = true) {
  return useQuery({queryKey: employeeKeys.documents(id), queryFn: () => getEmployeeDocuments(id), enabled});
}

export function useShifts() {
  const companyId = useSession(s => s.companyId);
  return useQuery({
    queryKey: employeeKeys.shifts,
    queryFn: () => getShifts(companyId!),
    enabled: !!companyId,
    staleTime: 10 * 60_000,
  });
}

/** Payslips for the last `months` months (only months where payroll was run). */
export function usePayslips(id: number, enabled = true, months = 6) {
  const companyId = useSession(s => s.companyId);
  return useQuery({
    queryKey: employeeKeys.payslips(id),
    enabled: enabled && !!companyId,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const now = new Date();
      const periods = Array.from(
        {length: months},
        (_, i) => new Date(now.getFullYear(), now.getMonth() - i, 1),
      );
      const results = await Promise.all(
        periods.map(async d => {
          try {
            const slip = await getSalarySlip(companyId!, id, d.getMonth() + 1, d.getFullYear());
            return slip ? {month: d, url: slip.download_url} : null;
          } catch {
            return null;
          }
        }),
      );
      return results.filter((r): r is {month: Date; url: string} => r !== null);
    },
  });
}

/**
 * Wraps an admin action: success toast + haptic, error toast, and refreshes
 * the given queries (plus the People list, whose badges may change).
 */
export function useAdminAction<TArgs>(
  fn: (args: TArgs) => Promise<{message?: string}>,
  invalidate: (args: TArgs) => readonly (readonly unknown[])[],
  successMessage?: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (res, args) => {
      haptics.success();
      toast.success(successMessage ?? res.message ?? 'Saved');
      for (const key of invalidate(args)) {
        queryClient.invalidateQueries({queryKey: key});
      }
      queryClient.invalidateQueries({queryKey: ['people']});
    },
    onError: (e: Error) => {
      haptics.error();
      toast.error(e.message);
    },
  });
}

export function useSetLeaveStatus(employeeId: number) {
  return useAdminAction(
    ({leaveId, status}: {leaveId: number; status: 'approved' | 'rejected'}) =>
      setLeaveStatus(leaveId, status),
    () => [employeeKeys.leaves(employeeId), employeeKeys.companyLeaves, ['company-dashboard']],
  );
}

export function useSetMissedPunchStatus() {
  return useAdminAction(
    ({id, status, reason}: {id: number; status: 'Approved' | 'Rejected'; reason?: string}) =>
      setMissedPunchStatus(id, status, reason),
    () => [employeeKeys.missedPunch, ['employee']],
  );
}

export function useSetAttendanceMode(employeeId: number) {
  return useAdminAction(
    (mode: AttendanceModeValue) => setAttendanceMode(employeeId, mode),
    () => [employeeKeys.profile(employeeId)],
    'Attendance mode updated',
  );
}

export function useAssignShift(employeeId: number) {
  return useAdminAction(
    (shiftId: number) => assignShift(employeeId, shiftId),
    () => [employeeKeys.profile(employeeId)],
    'Shift assigned',
  );
}

export function useRequestLiveLocation(employeeId: number) {
  return useAdminAction(
    () => requestLiveLocation(employeeId),
    () => [employeeKeys.profile(employeeId)],
    'Location request sent',
  );
}

export function useSetEmployeeActive(employeeId: number) {
  return useAdminAction(
    (active: boolean) => setEmployeeActive(employeeId, active),
    () => [employeeKeys.profile(employeeId)],
  );
}

export function useUploadReferenceSelfie(employeeId: number) {
  return useAdminAction(
    (image: LocalImage) => uploadReferenceSelfie(employeeId, image),
    () => [employeeKeys.profile(employeeId)],
    'Reference selfie updated',
  );
}
