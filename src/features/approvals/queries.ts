import {useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import {decideDeviceRequest, getDeviceRequests} from '../../api/endpoints/approvals';
import {getMissedPunchRequests, setLeaveStatus} from '../../api/endpoints/employee';
import {getClaims} from '../../api/endpoints/expenses';
import {useSession} from '../../store/session';
import {expenseKeys, useStaffById} from '../expenses/queries';
import {employeeKeys, useAdminAction, useCompanyLeaves} from '../people/employee/queries';
import {buildApprovals, countApprovals} from './approvalItems';

export const deviceRequestsKey = ['device-requests'] as const;

/** Everything waiting for the company's decision: leave, punch fixes, new phones, expense claims. */
export function useApprovals() {
  const companyId = useSession(s => s.companyId);
  const leaves = useCompanyLeaves();
  const punches = useQuery({queryKey: employeeKeys.missedPunch, queryFn: getMissedPunchRequests});
  const devices = useQuery({
    queryKey: deviceRequestsKey,
    queryFn: () => getDeviceRequests(companyId!),
    enabled: !!companyId,
  });
  const claims = useQuery({
    queryKey: expenseKeys.claims(companyId),
    queryFn: () => getClaims(companyId!),
    enabled: !!companyId,
  });
  const staff = useStaffById();

  const items = useMemo(
    () =>
      buildApprovals(
        leaves.data ?? [],
        punches.data ?? [],
        devices.data ?? [],
        claims.data ?? [],
        id => staff.get(id)?.name,
      ),
    [leaves.data, punches.data, devices.data, claims.data, staff],
  );
  const queries = [leaves, punches, devices, claims];
  return {
    items,
    counts: countApprovals(items),
    companyLeaves: leaves.data ?? [],
    isPending: queries.some(q => q.isPending),
    // Show what loaded; only fail the screen if nothing did.
    isError: queries.every(q => q.isError),
    error: queries.find(q => q.error)?.error ?? null,
    isRefetching: queries.some(q => q.isRefetching),
    refetch: async () => {
      await Promise.all(queries.map(q => q.refetch()));
    },
  };
}

export function useDecideLeave() {
  return useAdminAction(
    ({leaveId, status}: {leaveId: number; employeeId: number; status: 'approved' | 'rejected'}) =>
      setLeaveStatus(leaveId, status),
    ({employeeId}) => [employeeKeys.companyLeaves, employeeKeys.leaves(employeeId), ['company-dashboard']],
  );
}

export function useDecideDevice() {
  return useAdminAction(
    ({
      employeeId,
      deviceId,
      decision,
    }: {
      employeeId: number;
      deviceId: string;
      decision: 'approve' | 'reject';
    }) => decideDeviceRequest(employeeId, deviceId, decision),
    ({employeeId}) => [deviceRequestsKey, employeeKeys.profile(employeeId)],
  );
}
