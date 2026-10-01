import {trigger} from 'react-native-haptic-feedback';

const options = {enableVibrateFallback: false, ignoreAndroidSystemSettings: false};

/** Small, consistent vocabulary of haptic feedback for the app. */
export const haptics = {
  /** Switching tabs, toggles, picking an option. */
  select: () => trigger('selection', options),
  /** Pressing a primary action. */
  tap: () => trigger('impactLight', options),
  success: () => trigger('notificationSuccess', options),
  error: () => trigger('notificationError', options),
};
