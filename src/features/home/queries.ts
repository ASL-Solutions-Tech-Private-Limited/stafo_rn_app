import {useEffect} from 'react';
import {useQuery} from '@tanstack/react-query';
import {
  getBanners,
  getCompanyDashboard,
  getCompanyProfile,
  getEmployeeDashboard,
  getEmployeeDetails,
} from '../../api/endpoints/dashboard';
import {toast} from '../../components/ui';
import {getDeviceIdentity} from '../../lib/device';
import {signOut, useSession} from '../../store/session';

export const queryKeys = {
  employeeDashboard: ['employee-dashboard'] as const,
  employeeDetails: (id: number | string) => ['employee-details', String(id)] as const,
  companyDashboard: ['company-dashboard'] as const,
  companyProfile: ['company-profile'] as const,
  banners: ['banners'] as const,
};

export function useEmployeeDashboard() {
  const setOrgIds = useSession(s => s.setOrgIds);
  const query = useQuery({queryKey: queryKeys.employeeDashboard, queryFn: getEmployeeDashboard});

  const info = query.data?.employee_info;
  useEffect(() => {
    if (info) {
      setOrgIds({companyId: String(info.company_id), branchId: String(info.branch_id)});
    }
  }, [info, setOrgIds]);

  return query;
}

/**
 * Employee profile. Also enforces one-phone-per-employee: if the server says
 * this account is bound to a different device, sign out.
 */
export function useEmployeeDetails() {
  const employeeId = useSession(s => s.employee?.id);
  const query = useQuery({
    queryKey: queryKeys.employeeDetails(employeeId ?? ''),
    queryFn: () => getEmployeeDetails(employeeId!),
    enabled: employeeId != null,
  });

  const registeredDevice = query.data?.data?.device_id;
  useEffect(() => {
    if (!registeredDevice) {
      return;
    }
    let cancelled = false;
    getDeviceIdentity().then(({deviceId}) => {
      if (!cancelled && deviceId !== registeredDevice) {
        toast.error('Your account is now active on another phone. You have been signed out.');
        signOut();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [registeredDevice]);

  return query;
}

/**
 * Company accounts only. Asked by an employee token, company-dashboard answers
 * with the employee's own id as company_id, which must never reach the session.
 */
export function useCompanyDashboard() {
  const setOrgIds = useSession(s => s.setOrgIds);
  const isCompany = useSession(s => s.role === 'company');
  const query = useQuery({
    queryKey: queryKeys.companyDashboard,
    queryFn: getCompanyDashboard,
    enabled: isCompany,
  });

  const companyId = query.data?.company_id;
  useEffect(() => {
    if (isCompany && companyId != null) {
      setOrgIds({companyId: String(companyId)});
    }
  }, [isCompany, companyId, setOrgIds]);

  return query;
}

export function useCompanyProfile() {
  return useQuery({queryKey: queryKeys.companyProfile, queryFn: getCompanyProfile, staleTime: 5 * 60_000});
}

export function useBanners() {
  return useQuery({queryKey: queryKeys.banners, queryFn: getBanners, staleTime: 10 * 60_000});
}
