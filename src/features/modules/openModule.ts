import type {NavigationProp} from '@react-navigation/native';
import type {ModuleId} from './catalog';

type OwnScreen =
  | 'LiveLocation'
  | 'Setup'
  | 'SetupBranches'
  | 'SetupHolidays'
  | 'SetupPolicies'
  | 'Payroll'
  | 'Reports'
  | 'Performance'
  | 'Rankings'
  | 'Subscription'
  | 'SalaryPayouts';

/** Company modules that have their own screen instead of the generic module page. */
const COMPANY_SCREENS: Partial<Record<ModuleId, OwnScreen>> = {
  'location-tracking': 'LiveLocation',
  'company-setup': 'Setup',
  performance: 'Performance',
  rankings: 'Rankings',
  subscription: 'Subscription',
  'salary-disbursement': 'SalaryPayouts',
  branches: 'SetupBranches',
  holidays: 'SetupHolidays',
  policies: 'SetupPolicies',
  payroll: 'Payroll',
  reports: 'Reports',
};

type Navigator = Pick<NavigationProp<ReactNavigation.RootParamList>, 'navigate'>;

/** Opens a module's own screen when it has one, otherwise the generic module page. */
export function openModule(navigation: Navigator, id: ModuleId, role: string | null | undefined) {
  if (role !== 'company' && (id === 'attendance' || id === 'attendance-requests')) {
    // My attendance (calendar + punch-out requests) lives in the Attendance tab.
    navigation.navigate('EmployeeTabs', {screen: 'Attendance'});
    return;
  }
  if (role !== 'company' && id === 'leave') {
    navigation.navigate('MyLeave');
    return;
  }
  if (role !== 'company' && (id === 'holidays' || id === 'policies')) {
    navigation.navigate(id === 'holidays' ? 'MyHolidays' : 'MyPolicies');
    return;
  }
  if (id === 'crm') {
    navigation.navigate('Crm');
    return;
  }
  if (id === 'expenses') {
    navigation.navigate('Expenses');
    return;
  }
  if (id === 'trips') {
    navigation.navigate('Trips');
    return;
  }
  if (id === 'tasks') {
    navigation.navigate('Tasks');
    return;
  }
  if (id === 'payslips') {
    navigation.navigate('MyPayslips');
    return;
  }
  if (role === 'company' && id === 'attendance-requests') {
    navigation.navigate('Approvals', {filter: 'punch'});
    return;
  }
  if (role === 'company' && (id === 'leave' || id === 'device-requests')) {
    // Leave and new-phone sign-in requests are approved from the Approvals inbox.
    navigation.navigate('Approvals', {filter: id === 'leave' ? 'leave' : 'device'});
    return;
  }
  if (id === 'employees' && role === 'company') {
    // The directory is the People tab; adding someone starts from its Add button.
    navigation.navigate('CompanyTabs', {screen: 'People'});
    return;
  }
  const own = role === 'company' ? COMPANY_SCREENS[id] : undefined;
  if (own) {
    navigation.navigate(own);
    return;
  }
  navigation.navigate('Module', {id});
}
