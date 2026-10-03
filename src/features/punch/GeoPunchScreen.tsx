import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, StatusBar, View} from 'react-native';
import MapView, {Circle, Marker} from 'react-native-maps';
import {useIsFocused} from '@react-navigation/native';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Building2, CircleAlert, CircleCheck, Clock3, LogIn, LogOut, MapPinOff, X} from 'lucide-react-native';
import * as StafoLocation from 'stafo-location';
import type {Position} from 'stafo-location';
import {punchWithLocation} from '../../api/endpoints/punch';
import {Button, IconButton, Text, toast} from '../../components/ui';
import {formatClock, formatTime} from '../../lib/date';
import {haptics} from '../../lib/haptics';
import {useNow} from '../../lib/useNow';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {queryKeys, useEmployeeDashboard} from '../home/queries';
import {DEFAULT_REGION, formatDistance} from '../location/mapParts';
import {locateForPunch, punchedOutcome, punchTitle, usePunchResult, type PunchOutcome} from './punchFlow';
import {checkFence, lateLabel, minutesLate} from './punchLogic';

/** How often the fix refreshes while the screen is open. */
const REFRESH_MS = 6_000;

export function GeoPunchScreen({navigation, route}: AppScreenProps<'GeoPunch'>) {
  const {direction} = route.params;
  const {colors, spacing, radius, shadows, dark} = useTheme();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const now = useNow(true, 15_000);
  const queryClient = useQueryClient();
  const info = useEmployeeDashboard().data?.employee_info;
  const branch = info?.branch;
  const shift = info?.shifts?.[0];
  const map = useRef<MapView>(null);

  const [position, setPosition] = useState<Position | null>(null);
  const [problem, setProblem] = useState<Extract<PunchOutcome, {ok: false}> | null>(null);

  const locate = useCallback(async () => {
    const located = await locateForPunch();
    if (located.ok) {
      setPosition(located.position);
      setProblem(null);
    } else if ('ok' in located.outcome && !located.outcome.ok) {
      setProblem(located.outcome);
    }
  }, []);

  useEffect(() => {
    if (!focused) {
      return;
    }
    locate();
    const timer = setInterval(locate, REFRESH_MS);
    return () => clearInterval(timer);
  }, [focused, locate]);

  const centre = useMemo(() => {
    const lat = Number(branch?.latitude);
    const lng = Number(branch?.longitude);
    return branch?.latitude && branch?.longitude && Number.isFinite(lat) && Number.isFinite(lng)
      ? {latitude: lat, longitude: lng}
      : null;
  }, [branch?.latitude, branch?.longitude]);
  const fence = position ? checkFence(branch, position) : null;

  // Frame the office and them together once their first fix arrives.
  const framed = useRef(false);
  useEffect(() => {
    if (!position || framed.current) {
      return;
    }
    framed.current = true;
    const points = [position, ...(centre ? [centre] : [])];
    if (points.length === 1) {
      map.current?.animateToRegion({...position, latitudeDelta: 0.004, longitudeDelta: 0.004}, 400);
    } else {
      map.current?.fitToCoordinates(points, {
        edgePadding: {top: 140, right: 80, bottom: 380, left: 80},
        animated: true,
      });
    }
  }, [position, centre]);

  const punch = useMutation({
    mutationFn: (p: Position) => punchWithLocation(info!.id, p.latitude, p.longitude),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({queryKey: queryKeys.employeeDashboard});
      usePunchResult.getState().show(punchedOutcome(direction, 'geo', info));
      navigation.goBack();
    },
    onError: (e: Error) => {
      haptics.error();
      toast.error(e.message);
    },
  });

  const branchName = branch?.branch_name ?? 'your branch';
  const canPunch = !!info && !!position && fence?.kind !== 'outside';
  const status = problem
    ? {icon: CircleAlert, fg: colors.danger, bg: colors.dangerSoft, title: problem.title, sub: problem.message}
    : !position || !fence
    ? null
    : fence.kind === 'inside'
    ? {
        icon: CircleCheck,
        fg: colors.success,
        bg: colors.successSoft,
        title: `You’re inside ${branchName}`,
        sub: `${formatDistance(fence.distanceM)} from the office pin · accuracy ±${Math.round(position.accuracy)} m`,
      }
    : fence.kind === 'outside'
    ? {
        icon: CircleAlert,
        fg: colors.danger,
        bg: colors.dangerSoft,
        title: `You’re ${formatDistance(fence.distanceM)} from ${branchName}`,
        sub: `Punching works within ${formatDistance(fence.radiusM)} of the office. Move closer.`,
      }
    : {
        icon: MapPinOff,
        fg: colors.textMuted,
        bg: colors.surfaceMuted,
        title: `${branchName} has no geofence`,
        sub: 'Your location is sent with the punch.',
      };

  const late = direction === 'in' ? minutesLate(now, shift) : 0;
  const shiftFact = !shift
    ? null
    : direction === 'in'
    ? `${shift.shift_name || 'Your shift'} starts at ${formatClock(shift.start_time)}. It’s ${formatTime(now)}, so you’re ${lateLabel(late)}.`
    : `${shift.shift_name || 'Your shift'} ends at ${formatClock(shift.end_time)}.`;

  return (
    <View style={{flex: 1, backgroundColor: colors.background}}>
      <StatusBar barStyle="dark-content" />
      <MapView
        ref={map}
        style={{flex: 1}}
        initialRegion={
          centre ? {...centre, latitudeDelta: 0.006, longitudeDelta: 0.006} : DEFAULT_REGION
        }
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        mapPadding={{top: insets.top, right: 0, bottom: 300, left: 0}}>
        {centre ? (
          <>
            {Number(branch?.radar) > 0 ? (
              <Circle
                center={centre}
                radius={Number(branch?.radar)}
                strokeColor={colors.primary}
                strokeWidth={2}
                fillColor="rgba(47,84,235,0.12)"
              />
            ) : null}
            <Marker coordinate={centre} anchor={{x: 0.5, y: 0.5}} title={branchName} tracksViewChanges={false}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: colors.primary,
                }}>
                <Building2 size={18} color={colors.primary} />
              </View>
            </Marker>
          </>
        ) : null}
      </MapView>

      <View style={{position: 'absolute', left: spacing.lg, top: insets.top + spacing.sm}}>
        <IconButton icon={X} accessibilityLabel="Close" onPress={() => navigation.goBack()} variant="surface" />
      </View>

      <View
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: spacing.xl,
            paddingBottom: insets.bottom + spacing.xl,
          },
          !dark && shadows.raised,
        ]}>
        <Text variant="h2">{punchTitle(direction)}</Text>
        <Text variant="caption" tone="muted" style={{marginBottom: spacing.md}}>
          Geo attendance
        </Text>
        {status ? (
          <View
            accessibilityLiveRegion="polite"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              padding: 12,
              borderRadius: radius.md,
              backgroundColor: status.bg,
            }}>
            <status.icon size={20} color={status.fg} />
            <View style={{flex: 1}}>
              <Text variant="title">{status.title}</Text>
              <Text variant="caption" tone="muted">
                {status.sub}
              </Text>
            </View>
          </View>
        ) : (
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12}}>
            <ActivityIndicator color={colors.primary} />
            <Text tone="muted">Finding you…</Text>
          </View>
        )}
        {shiftFact ? (
          <View style={{flexDirection: 'row', gap: 10, marginTop: spacing.md}}>
            <Clock3 size={16} color={colors.textMuted} style={{marginTop: 2}} />
            <Text tone="muted" style={{flex: 1}}>
              {shiftFact}
            </Text>
          </View>
        ) : null}
        <View style={{marginTop: spacing.lg}}>
          {problem?.settings ? (
            <Button title="Open settings" onPress={() => StafoLocation.openSettings()} />
          ) : (
            <Button
              title={`${punchTitle(direction)} at ${formatTime(now)}`}
              icon={direction === 'in' ? LogIn : LogOut}
              variant={direction === 'out' ? 'danger' : 'primary'}
              disabled={!canPunch}
              loading={punch.isPending}
              onPress={() => position && punch.mutate(position)}
            />
          )}
        </View>
      </View>
    </View>
  );
}
