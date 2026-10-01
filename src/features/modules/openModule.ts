import type {NavigationProp} from '@react-navigation/native';
import type {ModuleId} from './catalog';

type Navigator = Pick<NavigationProp<ReactNavigation.RootParamList>, 'navigate'>;

/** Opens a module's own screen when it has one, otherwise the generic module page. */
export function openModule(navigation: Navigator, id: ModuleId, role: string | null | undefined) {
  if (id === 'location-tracking' && role === 'company') {
    navigation.navigate('LiveLocation');
    return;
  }
  navigation.navigate('Module', {id});
}
