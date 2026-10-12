/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerBackgroundPush } from './src/lib/push';

// Must run before the app registers, so messages that arrive while it's closed are kept.
registerBackgroundPush();

AppRegistry.registerComponent(appName, () => App);
