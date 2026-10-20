import {
  BadgeIndianRupee,
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  CalendarOff,
  Car,
  ClipboardCheck,
  FileText,
  Fingerprint,
  Handshake,
  ListChecks,
  MapPinned,
  Medal,
  Receipt,
  ReceiptIndianRupee,
  Settings2,
  Smartphone,
  Trophy,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import type {Role} from '../../store/session';

export type ModuleId =
  | 'attendance'
  | 'attendance-requests'
  | 'leave'
  | 'holidays'
  | 'policies'
  | 'branches'
  | 'employees'
  | 'location-tracking'
  | 'device-requests'
  | 'crm'
  | 'tasks'
  | 'trips'
  | 'expenses'
  | 'reports'
  | 'payroll'
  | 'payslips'
  | 'salary-disbursement'
  | 'performance'
  | 'rankings'
  | 'subscription'
  | 'bill-payments'
  | 'company-setup';

export type ModuleGroup = 'Workday' | 'People' | 'Work' | 'Finance';

export type AppModule = {
  id: ModuleId;
  title: string;
  description: string;
  icon: LucideIcon;
  group: ModuleGroup;
  roles: Role[];
  /** Rebuild phase in which the module ships. */
  phase: number;
};

export const MODULES: AppModule[] = [
  {
    id: 'attendance',
    title: 'Attendance',
    description: 'Punch in/out and your monthly record',
    icon: Fingerprint,
    group: 'Workday',
    roles: ['employee', 'company'],
    phase: 2,
  },
  {
    id: 'attendance-requests',
    title: 'Attendance requests',
    description: 'Missed punch-out corrections',
    icon: ClipboardCheck,
    group: 'Workday',
    roles: ['employee', 'company'],
    phase: 2,
  },
  {
    id: 'location-tracking',
    title: 'Live location',
    description: 'Field team routes and live tracking',
    icon: MapPinned,
    group: 'Workday',
    roles: ['company'],
    phase: 2,
  },
  {
    id: 'leave',
    title: 'Leave',
    description: 'Apply, approve and track balances',
    icon: CalendarOff,
    group: 'Workday',
    roles: ['employee', 'company'],
    phase: 3,
  },
  {
    id: 'holidays',
    title: 'Holidays',
    description: 'Company holiday calendar',
    icon: CalendarDays,
    group: 'Workday',
    roles: ['employee', 'company'],
    phase: 3,
  },

  {
    id: 'company-setup',
    title: 'Company setup',
    description: 'Branches, shifts, holidays, leave types and policies',
    icon: Settings2,
    group: 'People',
    roles: ['company'],
    phase: 2,
  },
  {
    id: 'employees',
    title: 'Employees',
    description: 'Directory, onboarding and profiles',
    icon: Users,
    group: 'People',
    roles: ['company'],
    phase: 3,
  },
  {
    id: 'branches',
    title: 'Branches',
    description: 'Offices and geofence radius',
    icon: Building2,
    group: 'People',
    roles: ['employee', 'company'],
    phase: 3,
  },
  {
    id: 'policies',
    title: 'Policies',
    description: 'Company handbook and documents',
    icon: FileText,
    group: 'People',
    roles: ['employee', 'company'],
    phase: 3,
  },
  {
    id: 'device-requests',
    title: 'Device requests',
    description: 'Approve employee phone changes',
    icon: Smartphone,
    group: 'People',
    roles: ['company'],
    phase: 3,
  },
  {
    id: 'performance',
    title: 'Performance',
    description: 'Scorecards and review types',
    icon: Medal,
    group: 'People',
    roles: ['company'],
    phase: 5,
  },
  {
    id: 'rankings',
    title: 'Leaderboard',
    description: 'Top performers this month',
    icon: Trophy,
    group: 'People',
    roles: ['company'],
    phase: 5,
  },

  {
    id: 'crm',
    title: 'CRM',
    description: 'Leads and follow-ups',
    icon: Handshake,
    group: 'Work',
    roles: ['employee', 'company'],
    phase: 4,
  },
  {
    id: 'tasks',
    title: 'Tasks',
    description: 'Assign, comment and track work',
    icon: ListChecks,
    group: 'Work',
    roles: ['employee', 'company'],
    phase: 4,
  },
  {
    id: 'trips',
    title: 'Trips',
    description: 'Vehicles, drivers and trip logs',
    icon: Car,
    group: 'Work',
    roles: ['employee', 'company'],
    phase: 4,
  },
  {
    id: 'reports',
    title: 'Reports',
    description: 'Attendance, leave and staff exports',
    icon: BarChart3,
    group: 'Work',
    roles: ['company'],
    phase: 5,
  },

  {
    id: 'expenses',
    title: 'Expenses',
    description: 'Claims with receipts and approvals',
    icon: Receipt,
    group: 'Finance',
    roles: ['employee', 'company'],
    phase: 4,
  },
  {
    id: 'payroll',
    title: 'Payroll',
    description: 'Salary types, runs and payslips',
    icon: Wallet,
    group: 'Finance',
    roles: ['company'],
    phase: 5,
  },
  {
    id: 'payslips',
    title: 'Payslips',
    description: 'Your monthly salary slips',
    icon: FileText,
    group: 'Finance',
    roles: ['employee'],
    phase: 3,
  },
  {
    id: 'salary-disbursement',
    title: 'Disbursement',
    description: 'Pay out salaries (not connected yet)',
    icon: BadgeIndianRupee,
    group: 'Finance',
    roles: ['company'],
    phase: 5,
  },
  {
    id: 'bill-payments',
    title: 'Pay bills',
    description: 'Recharges and bills through Bharat BillPay',
    icon: ReceiptIndianRupee,
    group: 'Finance',
    roles: ['employee', 'company'],
    phase: 6,
  },
  {
    id: 'subscription',
    title: 'Subscription',
    description: 'Your STAFO plan',
    icon: Briefcase,
    group: 'Finance',
    roles: ['company'],
    phase: 5,
  },
];

export const GROUP_ORDER: ModuleGroup[] = ['Workday', 'People', 'Work', 'Finance'];

export function modulesFor(role: Role) {
  return MODULES.filter(m => m.roles.includes(role));
}

export function getModule(id: ModuleId) {
  return MODULES.find(m => m.id === id)!;
}

/** Shortcuts on each home screen, in order. */
export const HOME_SHORTCUTS: Record<Role, ModuleId[]> = {
  employee: ['attendance', 'leave', 'tasks', 'crm', 'expenses', 'trips', 'holidays', 'policies'],
  company: ['employees', 'attendance', 'leave', 'location-tracking', 'payroll', 'reports', 'tasks', 'crm'],
};
