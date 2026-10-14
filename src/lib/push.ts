import {Linking, PermissionsAndroid, Platform} from 'react-native';
import {toast} from '../components/ui/toast';
import {linkOf, toInboxItem, useInbox} from '../features/notifications/inbox';

/** Firebase push (FCM; through APNs on iOS). */
export const pushSupported = Platform.OS === 'android' || Platform.OS === 'ios';

type Messaging = typeof import('@react-native-firebase/messaging');

// Loaded lazily, so a missing native module only turns push off.
function fcm(): Messaging | null {
  if (!pushSupported) {
    return null;
  }
  try {
    return require('@react-native-firebase/messaging') as Messaging;
  } catch {
    return null;
  }
}

/**
 * Asks to show notifications (iOS, Android 13+), on the login screen. If the
 * phone already said no, the system shows nothing and this resolves false.
 */
export async function askPushPermission(): Promise<boolean> {
  if (!pushSupported) {
    return false;
  }
  if (Platform.OS === 'ios') {
    const m = fcm();
    return !!m && (await m.requestPermission(m.getMessaging())) > 0;
  }
  if (Number(Platform.Version) < 33) {
    return true;
  }
  const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  return r === PermissionsAndroid.RESULTS.GRANTED;
}

/** This phone's push token for the server, or '' when push isn't available. */
export async function getPushToken(): Promise<string> {
  const m = fcm();
  if (!m) {
    return '';
  }
  try {
    if (Platform.OS === 'ios') {
      // iOS needs permission before APNs gives Firebase a device token.
      const status = await m.hasPermission(m.getMessaging());
      if (status === m.AuthorizationStatus.NOT_DETERMINED) {
        await m.requestPermission(m.getMessaging());
      }
    }
    return await m.getToken(m.getMessaging());
  } catch {
    return '';
  }
}

/** Keeps a message that arrived while the app was closed (registered in index.js). */
export function registerBackgroundPush() {
  const m = fcm();
  m?.setBackgroundMessageHandler(m.getMessaging(), async message => {
    const item = toInboxItem(message);
    if (item) {
      useInbox.getState().add(item);
    }
  });
}

const openLink = (link: string | null) => link && Linking.openURL(link).catch(() => {});

/**
 * While the app runs: keep and show messages that arrive, and follow the link of
 * a notification the person tapped. Returns a function that stops listening.
 */
export function startPush(onArrive?: () => void): () => void {
  const m = fcm();
  if (!m) {
    return () => {};
  }
  const messaging = m.getMessaging();
  const keep = (message: Parameters<typeof toInboxItem>[0], read = false) => {
    const item = toInboxItem(message);
    if (item) {
      useInbox.getState().add(item);
      if (read) {
        useInbox.getState().markRead(item.id);
      }
    }
    return item;
  };
  const offMessage = m.onMessage(messaging, message => {
    const item = keep(message);
    if (item) {
      toast.info(item.body ? `${item.title}: ${item.body}` : item.title);
      onArrive?.();
    }
  });
  const offOpened = m.onNotificationOpenedApp(messaging, message => {
    const item = keep(message, true);
    openLink(item ? linkOf(item) : null);
  });
  m.getInitialNotification(messaging)
    .then(message => {
      if (message) {
        const item = keep(message, true);
        openLink(item ? linkOf(item) : null);
      }
    })
    .catch(() => {});
  return () => {
    offMessage();
    offOpened();
  };
}
