import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';
import type {CompanyAccount, EmployeeAccount} from '../api/types';
import {StorageKeys, zustandStorage} from '../lib/storage';

export type Role = 'company' | 'employee';

type SessionState = {
  token: string | null;
  role: Role | null;
  company: CompanyAccount | null;
  employee: EmployeeAccount | null;
  /**
   * Set when an employee signs in on an unregistered device. They have no
   * token yet and must wait for their company to approve the new device.
   */
  pendingDeviceEmployee: EmployeeAccount | null;
  /** Filled from the dashboards; many endpoints need these ids. */
  companyId: string | null;
  branchId: string | null;

  signInCompany: (token: string, company: CompanyAccount) => void;
  signInEmployee: (token: string, employee: EmployeeAccount) => void;
  setPendingDevice: (employee: EmployeeAccount) => void;
  setOrgIds: (ids: {companyId?: string | null; branchId?: string | null}) => void;
  clear: () => void;
};

const initial = {
  token: null,
  role: null,
  company: null,
  employee: null,
  pendingDeviceEmployee: null,
  companyId: null,
  branchId: null,
};

export const useSession = create<SessionState>()(
  persist(
    set => ({
      ...initial,
      signInCompany: (token, company) =>
        set({
          ...initial,
          token,
          role: 'company',
          company,
          companyId: company.id != null ? String(company.id) : null,
        }),
      signInEmployee: (token, employee) =>
        set({
          ...initial,
          token,
          role: 'employee',
          employee,
          companyId: employee.company_id != null ? String(employee.company_id) : null,
          branchId: employee.branch_id != null ? String(employee.branch_id) : null,
        }),
      setPendingDevice: employee => set({...initial, pendingDeviceEmployee: employee}),
      setOrgIds: ids =>
        set(state => ({
          companyId: ids.companyId ?? state.companyId,
          branchId: ids.branchId ?? state.branchId,
        })),
      clear: () => set(initial),
    }),
    {
      name: StorageKeys.session,
      storage: createJSONStorage(() => zustandStorage),
      partialize: ({token, role, company, employee, pendingDeviceEmployee, companyId, branchId}) => ({
        token,
        role,
        company,
        employee,
        pendingDeviceEmployee,
        companyId,
        branchId,
      }),
    },
  ),
);

type SignOutListener = () => void | Promise<void>;
const signOutListeners = new Set<SignOutListener>();

/** Lets other modules (query cache, location service) clean up on logout. */
export function onSignOut(listener: SignOutListener) {
  signOutListeners.add(listener);
  return () => {
    signOutListeners.delete(listener);
  };
}

let signingOut = false;

export async function signOut() {
  if (signingOut) {
    return;
  }
  signingOut = true;
  try {
    await Promise.allSettled([...signOutListeners].map(listener => listener()));
    useSession.getState().clear();
  } finally {
    signingOut = false;
  }
}
