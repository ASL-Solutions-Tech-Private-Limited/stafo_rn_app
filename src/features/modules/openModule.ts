import type {NavigationProp} from '@react-navigation/native';
import type {ModuleId} from './catalog';

type OwnScreen =
  | 'LiveLocation'
  | 'Setup'
  | 'SetupBranches'
  | 'SetupHolidays'
  | 'SetupPolicies'
  | 'Payroll'
  | 'Reports';

/** Company modules that have their own screen instead of the generic module page. */
const COMPANY_SCREENS: Partial<Record<ModuleId, OwnScreen>> = {
  'location-tracking': 'LiveLocation',
  'company-setup': 'Setup',
  branches: 'SetupBranches',
  holidays: 'SetupHolidays',
  policies: 'SetupPolicies',
  payroll: 'Payroll',
  reports: 'Reports',
};

type Navigator = Pick<NavigationProp<ReactNavigation.RootParamList>, 'navigate'>;

/** Opens a module's own screen when it has one, otherwise the generic module page. */
export function openModule(navigation: Navigator, id: ModuleId, role: string | null | undefined) {
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
