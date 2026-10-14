import React, {useEffect, useState} from 'react';
import {AppState, Linking, View} from 'react-native';
import {Bell, BellOff} from 'lucide-react-native';
import {Button, Card, EmptyState, PressableScale, Text} from '../../components/ui';
import {formatDay, formatTime, toDateKey} from '../../lib/date';
import {
  askPushPermission,
  getPushToken,
  pushPermission,
  pushSupported,
  type PushPermission,
} from '../../lib/push';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {IconWell, SetupScreen} from '../setup/parts';
import {linkOf, unreadCount, useInbox, type InboxItem} from './inbox';

/** Re-checks on return from Settings. */
export function usePushPermission() {
  const [state, setState] = useState<PushPermission>(pushSupported ? 'granted' : 'unsupported');
  useEffect(() => {
    const check = () =>
      pushPermission()
        .then(setState)
        .catch(() => {});
    check();
    const sub = AppState.addEventListener('change', s => s === 'active' && check());
    return () => sub.remove();
  }, []);
  return [state, () => askPushPermission().then(setState)] as const;
}

/** Card asking to turn notifications on; nothing when they're on or unsupported. */
export function PushOffCard() {
  const {colors, spacing} = useTheme();
  const [permission, ask] = usePushPermission();
  if (permission !== 'denied') {
    return null;
  }
  return (
    <Card style={{backgroundColor: colors.warningSoft, borderColor: 'transparent', gap: spacing.md}}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
        <IconWell icon={BellOff} fg={colors.warning} bg={colors.surface} />
        <View style={{flex: 1}}>
          <Text variant="title">Notifications are off</Text>
          <Text variant="caption">Turn them on to hear about approvals, tasks and payslips.</Text>
        </View>
      </View>
      <Button title="Turn on" size="sm" onPress={ask} />
    </Card>
  );
}

const dayOf = (at: number, now = new Date()) => {
  const d = new Date(at);
  const key = toDateKey(d);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (key === toDateKey(now)) {
    return 'Today';
  }
  if (key === toDateKey(yesterday)) {
    return 'Yesterday';
  }
  return `${formatDay(d)}${d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : ''}`;
};

/** Debug builds only: this phone's push token, to send a test from the Firebase console. */
function DevPushToken() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    getPushToken()
      .then(setToken)
      .catch(() => setToken(''));
  }, []);
  if (!__DEV__ || !pushSupported) {
    return null;
  }
  return (
    <Card style={{gap: 4}}>
      <Text variant="overline" tone="muted">
        PUSH TOKEN (DEBUG BUILD)
      </Text>
      <Text variant="caption" selectable>
        {token === null ? 'Getting token…' : token || 'No token: Firebase didn’t give one.'}
      </Text>
    </Card>
  );
}

/** What this phone received, newest first. */
export function NotificationsScreen(_: AppScreenProps<'Notifications'>) {
  const {colors, spacing} = useTheme();
  const items = useInbox(s => s.items);
  const markRead = useInbox(s => s.markRead);
  const markAllRead = useInbox(s => s.markAllRead);
  const unread = unreadCount(items);

  // Group by day, keeping order.
  const groups: {day: string; items: InboxItem[]}[] = [];
  for (const i of items) {
    const day = dayOf(i.at);
    const last = groups[groups.length - 1];
    if (last?.day === day) {
      last.items.push(i);
    } else {
      groups.push({day, items: [i]});
    }
  }

  return (
    <SetupScreen
      title="Notifications"
      subtitle={unread ? `${unread} new` : null}
      action={
        unread ? (
          <Button title="Mark all read" size="sm" variant="ghost" fullWidth={false} onPress={markAllRead} />
        ) : undefined
      }>
      <View style={{gap: spacing.md}}>
        <PushOffCard />
        {items.length ? (
          groups.map(g => (
            <View key={g.day} style={{gap: spacing.sm}}>
              <Text variant="overline" tone="muted">
                {g.day.toUpperCase()}
              </Text>
              <Card padded={false}>
                {g.items.map((n, i) => {
                  const link = linkOf(n);
                  return (
                    <PressableScale
                      key={n.id}
                      onPress={() => {
                        markRead(n.id);
                        if (link) {
                          Linking.openURL(link).catch(() => {});
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${n.read ? '' : 'Unread. '}${n.title}. ${n.body}`}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: spacing.md,
                        padding: spacing.lg,
                        borderTopWidth: i ? 1 : 0,
                        borderTopColor: colors.border,
                      }}>
                      <IconWell icon={Bell} fg={colors.primary} bg={colors.primarySoft} />
                      <View style={{flex: 1, minWidth: 0}}>
                        <Text variant="title">{n.title}</Text>
                        {n.body ? (
                          <Text variant="body" tone="muted">
                            {n.body}
                          </Text>
                        ) : null}
                        <Text variant="caption" tone="subtle" style={{marginTop: 2}}>
                          {formatTime(new Date(n.at))}
                        </Text>
                      </View>
                      {!n.read ? (
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            marginTop: 6,
                            backgroundColor: colors.primary,
                          }}
                        />
                      ) : null}
                    </PressableScale>
                  );
                })}
              </Card>
            </View>
          ))
        ) : (
          <Card>
            <EmptyState
              compact
              icon={Bell}
              title="No notifications yet"
              message="Approvals, new tasks and payslips will show up here."
            />
          </Card>
        )}
        <DevPushToken />
        {items.length ? (
          <Text variant="caption" tone="subtle" style={{textAlign: 'center'}}>
            Shows notifications this phone received.
          </Text>
        ) : null}
      </View>
    </SetupScreen>
  );
}
