import {create} from 'zustand';
import {FEATURES} from '../../config/features';
import {StorageKeys, storage} from '../../lib/storage';
import {useSession} from '../../store/session';
import {useEmployeeDetails} from '../home/queries';
import {
  decide,
  demoMembers,
  demoRequests,
  roleFromPosition,
  type StaffRole,
  type TeamRequest,
} from './roleLogic';

const readOverride = (): StaffRole | null => {
  try {
    const v = storage.getString(StorageKeys.demoRole);
    return v === 'employee' || v === 'manager' || v === 'hr' ? v : null;
  } catch {
    return null;
  }
};

type DemoState = {
  /** "View as" from Profile; null follows the employee's position. */
  override: StaffRole | null;
  requests: Record<'manager' | 'hr', TeamRequest[]>;
  setOverride: (r: StaffRole | null) => void;
  decide: (role: 'manager' | 'hr', id: number, approve: boolean) => TeamRequest['status'];
};

const MANAGER_TEAM = demoMembers(9);
const HR_PEOPLE = demoMembers(18, 3);

export const useDemoRoles = create<DemoState>(set => ({
  override: readOverride(),
  // Kept in memory: a demo starts fresh each time the app opens, and nothing reaches the server.
  requests: {manager: demoRequests('manager', MANAGER_TEAM), hr: demoRequests('hr', HR_PEOPLE)},
  setOverride: r => {
    try {
      if (r) {
        storage.set(StorageKeys.demoRole, r);
      } else {
        storage.remove(StorageKeys.demoRole);
      }
    } catch {
      // A per-phone convenience; fine to lose.
    }
    set({override: r});
  },
  decide: (role, id, approve) => {
    let status: TeamRequest['status'] = 'pending';
    set(s => ({
      requests: {
        ...s.requests,
        [role]: s.requests[role].map(r => (r.id === id ? {...r, status: (status = decide(r, approve))} : r)),
      },
    }));
    return status;
  },
}));

export const membersFor = (role: StaffRole) =>
  role === 'hr' ? HR_PEOPLE : role === 'manager' ? MANAGER_TEAM : [];

/** The signed-in employee's role and the group they look after. */
export function useStaffRole() {
  const session = useSession();
  const details = useEmployeeDetails();
  const override = useDemoRoles(s => s.override);
  const d = details.data?.data;
  const real = roleFromPosition(d?.position ?? session.employee?.position);
  const role: StaffRole = !FEATURES.rolesDemo || session.role !== 'employee' ? 'employee' : override ?? real;
  return {
    role,
    real,
    /** The demo group: a Manager's department, an HR's branch. */
    group: role === 'hr' ? d?.branch_name || 'Your branch' : d?.department_name || 'Your team',
    members: membersFor(role),
  };
}
