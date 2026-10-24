import React, {useEffect, useState} from 'react';
import {AppState, View} from 'react-native';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {
  BatteryMedium,
  ChevronRight,
  Clock3,
  MapPinned,
  MapPinOff,
  Smartphone,
  WifiOff,
  type LucideIcon,
} from 'lucide-react-native';
import * as StafoLocation from 'stafo-location';
import type {LocationPermission} from 'stafo-location';
import {answerLocationRequest} from '../../api/endpoints/punch';
import type {EmployeeInfo} from '../../api/types';
import {BottomSheet, Button, Card, ConfirmDialog, LiveDot, Text, toast} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import {useTheme} from '../../theme/ThemeProvider';
import {queryKeys} from '../home/queries';
import {planTracking} from './trackingPlan';
import {syncTracking} from './useTrackingSync';

function usePermission() {
  const [permission, setPermission] = useState<LocationPermission | null>(null);
  useEffect(() => {
    const read = () => StafoLocation.getPermissionStatus().then(setPermission, () => {});
    read();
    const sub = AppState.addEventListener('change', s => s === 'active' && read());
    return () => sub.remove();
  }, []);
  return [permission, setPermission] as const;
}

/**
 * On the employee home: the company's request to see their location (geo_status
 * "1"), or, once they've agreed ("2"), whether it's being shared right now.
 */
export function LocationSharingCard({info, companyName}: {info: EmployeeInfo; companyName?: string | null}) {
  const {colors, spacing} = useTheme();
  const queryClient = useQueryClient();
  const [permission, setPermission] = usePermission();
  const [sheet, setSheet] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [wantOff, setWantOff] = useState(false);
  const company = companyName || 'Your company';
  const status = String(info.geo_status ?? '0');

  const answer = useMutation({
    mutationFn: async (allow: boolean) => {
      if (allow) {
        const granted = await StafoLocation.requestPermission(true);
        setPermission(granted);
        if (granted === 'denied' || granted === 'undetermined') {
          throw new Error('Turn on location access for STAFO first, then tap Allow again.');
        }
      }
      await answerLocationRequest(info.id, allow);
      if (!allow) {
        await StafoLocation.stopTracking();
      }
    },
    onSuccess: async (_, allow) => {
      haptics.success();
      toast.success(allow ? 'Thanks! Sharing starts when you punch in.' : `${company} has been told.`);
      await queryClient.invalidateQueries({queryKey: queryKeys.employeeDashboard});
      if (allow) {
        syncTracking({...info, geo_status: '2'}, companyName).catch(() => {});
      }
    },
    onError: (e: Error) => {
      haptics.error();
      toast.error(e.message);
    },
  });

  if (status === '1') {
    return (
      <Card style={{borderWidth: 1.5, borderColor: colors.info}}>
        <View style={{flexDirection: 'row', gap: spacing.md}}>
          <Well icon={MapPinned} fg={colors.info} bg={colors.infoSoft} />
          <View style={{flex: 1}}>
            <Text variant="title">{company} wants to see your location</Text>
            <Text variant="caption" tone="muted" style={{marginTop: 2}}>
              Shared all the time once you allow it, punched in or not. You can turn it off any time.
            </Text>
          </View>
        </View>
        <View style={{flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg}}>
          <Button
            title="Not now"
            variant="ghost"
            size="md"
            style={{flex: 1}}
            disabled={answer.isPending}
            onPress={() => answer.mutate(false)}
          />
          <Button
            title="Allow"
            size="md"
            style={{flex: 1}}
            loading={answer.isPending && answer.variables}
            disabled={answer.isPending}
            onPress={() => answer.mutate(true)}
          />
        </View>
      </Card>
    );
  }

  if (status !== '2') {
    return null;
  }

  const plan = planTracking(info);
  const blocked = permission === 'denied' || permission === 'undetermined';
  const line = blocked
    ? {title: 'Location access is off', sub: 'Sharing is paused. Turn it on in Settings.'}
    : {title: 'Sharing your location', sub: `With ${company}, all the time. Tap to turn off.`};

  return (
    <>
      <Card
        onPress={() => (blocked ? StafoLocation.openSettings() : setSheet(true))}
        accessibilityLabel={`${line.title}. ${line.sub}`}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
          {blocked ? (
            <Well icon={MapPinOff} fg={colors.danger} bg={colors.dangerSoft} />
          ) : (
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: plan.track ? colors.successSoft : colors.surfaceMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <LiveDot color={plan.track ? colors.success : colors.textSubtle} size={10} />
            </View>
          )}
          <View style={{flex: 1}}>
            <Text variant="title">{line.title}</Text>
            <Text variant="caption" tone="muted">
              {line.sub}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textSubtle} />
        </View>
      </Card>

      <BottomSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        onClosed={() => {
          if (wantOff) {
            setWantOff(false);
            setConfirmOff(true);
          }
        }}
        title={plan.track ? 'Sharing your location' : 'Location sharing'}
        subtitle={`${company} sees your location all the time, punched in or not, until you turn this off.`}>
        <Row
          icon={Clock3}
          title="Always on"
          sub="Keeps sharing after punch-out and on days off, until you turn it off"
        />
        <Row
          icon={Smartphone}
          title="Survives a restart"
          sub={
            permission === 'always'
              ? 'Picks up again by itself after the phone restarts'
              : 'Allow location “all the time” so it can pick up again after a restart'
          }
          divider
        />
        <Row
          icon={BatteryMedium}
          title="Easy on battery"
          sub="Sends a point when you move, not every 30 seconds"
          divider
        />
        <Row
          icon={WifiOff}
          title="Works offline"
          sub="Points are kept and sent when you’re back online"
          divider
        />
        <View style={{gap: spacing.sm, marginTop: spacing.lg}}>
          {permission !== 'always' ? (
            <Button
              title="Allow all the time"
              variant="secondary"
              onPress={() => StafoLocation.openSettings()}
            />
          ) : null}
          <Button
            title="Turn off sharing"
            variant="ghost"
            icon={MapPinOff}
            onPress={() => {
              setWantOff(true);
              setSheet(false);
            }}
          />
          <Text variant="caption" tone="subtle" align="center">
            {company} is told if you turn it off.
          </Text>
        </View>
      </BottomSheet>

      <ConfirmDialog
        visible={confirmOff}
        title="Turn off location sharing?"
        message={`${company} will see that you stopped sharing. They can ask again later.`}
        icon={MapPinOff}
        confirmLabel="Turn off"
        destructive
        loading={answer.isPending}
        onCancel={() => setConfirmOff(false)}
        onConfirm={() => answer.mutate(false, {onSettled: () => setConfirmOff(false)})}
      />
    </>
  );
}

function Well({icon: Icon, fg, bg}: {icon: LucideIcon; fg: string; bg: string}) {
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon size={20} color={fg} />
    </View>
  );
}

function Row({
  icon: Icon,
  title,
  sub,
  divider,
}: {
  icon: LucideIcon;
  title: string;
  sub: string;
  divider?: boolean;
}) {
  const {colors, spacing} = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.md,
        paddingVertical: spacing.md,
        borderTopWidth: divider ? 1 : 0,
        borderTopColor: colors.border,
      }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: colors.infoSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon size={18} color={colors.info} />
      </View>
      <View style={{flex: 1}}>
        <Text variant="title">{title}</Text>
        <Text variant="caption" tone="muted">
          {sub}
        </Text>
      </View>
    </View>
  );
}
