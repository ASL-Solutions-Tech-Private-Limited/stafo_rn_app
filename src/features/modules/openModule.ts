import type {NavigationProp} from '@react-navigation/native';
import type {ModuleId} from './catalog';

/** Company modules that have their own screen instead of the generic module page. */
const COMPANY_SCREENS: Partial<
  Record<ModuleId, 'LiveLocation' | 'Setup' | 'SetupBranches' | 'SetupHolidays' | 'SetupPolicies'>
> = {
  'location-tracking': 'LiveLocation',
  'company-setup': 'Setup',
  branches: 'SetupBranches',
  holidays: 'SetupHolidays',
  policies: 'SetupPolicies',
};

type Navigator = Pick<NavigationProp<ReactNavigation.RootParamList>, 'navigate'>;

/** Opens a module's own screen when it has one, otherwise the generic module page. */
export function openModule(navigation: Navigator, id: ModuleId, role: string | null | undefined) {
  if (role === 'company') {
    const own = COMPANY_SCREENS[id];
    if (own) {
      navigation.navigate(own);
      return;
    }
  }
  navigation.navigate('Module', {id});
}
