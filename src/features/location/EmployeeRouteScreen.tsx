import React, {useEffect, useRef, useState} from 'react';
import {Linking, ScrollView, StatusBar, View} from 'react-native';
import MapView, {Polyline} from 'react-native-maps';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, MapPinOff, Phone} from 'lucide-react-native';
import {employeePhotoUrl} from '../../api/endpoints/people';
import {
  Avatar,
  Button,
  CalendarSheet,
  IconButton,
  LiveDot,
  PressableScale,
  Skeleton,
  Text,
  toast,
} from '../../components/ui';
import {
  formatDay,
  formatDuration,
  formatTime,
  parseServerDate,
  toDateKey,
  weekdayShort,
} from '../../lib/date';
import {haptics} from '../../lib/haptics';
import {useNow} from '../../lib/useNow';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {usePeopleOnDate} from '../people/queries';
import {
  BadgeMarker,
  DEFAULT_REGION,
  EDGE_PADDING,
  formatDistance,
  lastSeenLabel,
  NowMarker,
} from './mapParts';
import {useEmployeeTrack} from './queries';
import {isLive} from './track';

const shiftDate = (key: string, days: number) => {
  const d = parseServerDate(key)!;
  d.setDate(d.getDate() + days);
  return toDateKey(d);
};

export function EmployeeRouteScreen({navigation, route}: AppScreenProps<'EmployeeRoute'>) {
  const {id} = route.params;
  const {colors, spacing, radius, dark} = useTheme();
  const insets = useSafeAreaInsets();
  const today = toDateKey();
  const [date, setDate] = useState(route.params.date ?? today);
  const [picking, setPicking] = useState(false);
  const isToday = date === today;
  const now = useNow(isToday, 30_000);

  const track = useEmployeeTrack(id, date);
  const people = usePeopleOnDate(today);
  const employee = people.people.find(p => p.employee.id === id)?.employee;
  const name = employee?.name ?? route.params.name ?? 'Employee';
  const phone = (employee?.phone ?? '').replace(/\D/g, '').slice(-10);

  const summary = track.data;
  const points = summary?.points ?? [];
  const last = summary?.last;
  const live = isToday && isLive(last, now);

  const map = useRef<MapView>(null);
  const fit = (animated = true) => {
    if (points.length === 1) {
      map.current?.animateToRegion(
        {...points[0], latitudeDelta: 0.02, longitudeDelta: 0.02},
        animated ? 400 : 0,
      );
    } else if (points.length > 1) {
      map.current?.fitToCoordinates(points, {edgePadding: EDGE_PADDING, animated});
    }
  };
  // Re-frame when the day changes or its first points arrive.
  const framedFor = useRef<string | null>(null);
  useEffect(() => {
    if (points.length && framedFor.current !== date) {
      framedFor.current = date;
      setTimeout(() => fit(), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, points.length]);

  const day = parseServerDate(date)!;
  const dayLabel = isToday ? `Today, ${formatDay(day)}` : `${weekdayShort(day)}, ${formatDay(day)}`;
  const step = (days: number) => {
    haptics.select();
    setDate(d => shiftDate(d, days));
  };

  const timeline: {time: string; title: string; color: string}[] = [];
  if (points.length) {
    timeline.push({time: formatTime(points[0].at), title: 'Started', color: colors.success});
    summary!.stops.forEach((s, i) =>
      timeline.push({
        time: `${formatTime(s.start)} – ${formatTime(s.end)}`,
        title: `Stop ${i + 1} · ${formatDuration(s.end.getTime() - s.start.getTime())}`,
        color: colors.warning,
      }),
    );
    timeline.push(
      live
        ? {
            time: 'Now',
            title: summary!.stoppedSince
              ? `Stopped since ${formatTime(summary!.stoppedSince)}`
              : 'On the move',
            color: colors.primary,
          }
        : {time: formatTime(last!.at), title: isToday ? 'Last location' : 'Ended', color: colors.danger},
    );
  }

  return (
    <View style={{flex: 1, backgroundColor: colors.background}}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <MapView
        ref={map}
        style={{flex: 1}}
        initialRegion={DEFAULT_REGION}
        showsCompass={false}
        toolbarEnabled={false}
        onMapReady={() => fit(false)}>
        {points.length > 1 ? (
          <>
            <Polyline
              coordinates={points}
              strokeColor="#FFFFFF"
              strokeWidth={9}
              lineJoin="round"
              lineCap="round"
            />
            <Polyline
              coordinates={points}
              strokeColor={colors.primary}
              strokeWidth={5}
              lineJoin="round"
              lineCap="round"
            />
          </>
        ) : null}
        {points.length ? (
          <BadgeMarker point={points[0]} kind="start" title={`Started ${formatTime(points[0].at)}`} />
        ) : null}
        {summary?.stops.map((s, i) => (
          <BadgeMarker
            key={`${date}-${i}`}
            point={s}
            kind="stop"
            label={String(i + 1)}
            title={`Stop ${i + 1} · ${formatTime(s.start)} – ${formatTime(s.end)}`}
          />
        ))}
        {last && points.length > 1 ? (
          live ? (
            <NowMarker point={last} />
          ) : (
            <BadgeMarker point={last} kind="end" title={`Last location ${formatTime(last.at)}`} />
          )
        ) : null}
      </MapView>

      {/* Floating header: back, day picker, call */}
      <View
        style={{
          position: 'absolute',
          left: spacing.lg,
          right: spacing.lg,
          top: insets.top + spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}>
        <IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <View
          style={{
            flex: 1,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 6,
          }}>
          <PressableScale
            onPress={() => step(-1)}
            accessibilityRole="button"
            accessibilityLabel="Previous day"
            hitSlop={8}>
            <ChevronLeft size={18} color={colors.text} />
          </PressableScale>
          <PressableScale
            onPress={() => {
              haptics.tap();
              setPicking(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${dayLabel}. Pick another day`}
            hitSlop={6}
            style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <CalendarDays size={15} color={colors.primary} />
            <Text variant="label">{dayLabel}</Text>
          </PressableScale>
          <PressableScale
            onPress={isToday ? undefined : () => step(1)}
            disabled={isToday}
            accessibilityRole="button"
            accessibilityLabel="Next day"
            accessibilityState={{disabled: isToday}}
            hitSlop={8}>
            <ChevronRight size={18} color={isToday ? colors.textSubtle : colors.text} />
          </PressableScale>
        </View>
        <IconButton
          icon={Phone}
          accessibilityLabel={`Call ${name}`}
          onPress={() =>
            phone
              ? Linking.openURL(`tel:${phone}`).catch(() =>
                  toast.error("Couldn't start a call on this device."),
                )
              : toast.info('No phone number on file.')
          }
        />
      </View>

      {/* Day panel */}
      <View
        style={{
          maxHeight: '50%',
          backgroundColor: colors.surface,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          marginTop: -28,
          paddingTop: spacing.md,
        }}>
        <View
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.borderStrong,
            alignSelf: 'center',
            marginBottom: spacing.md,
          }}
        />
        <ScrollView
          contentContainerStyle={{paddingHorizontal: spacing.xl, paddingBottom: insets.bottom + spacing.xl}}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
            <Avatar name={name} uri={employee ? employeePhotoUrl(employee) : null} size={44} />
            <View style={{flex: 1}}>
              <Text variant="h3" numberOfLines={1}>
                {name}
              </Text>
              {points.length ? (
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                  {live ? <LiveDot color={colors.success} /> : null}
                  <Text
                    variant="caption"
                    color={live ? colors.success : colors.textMuted}
                    style={{fontFamily: 'PlusJakartaSans-SemiBold'}}>
                    {isToday ? lastSeenLabel(last?.at, live, now) : `${points.length} location updates`}
                    {last?.battery != null ? ` · ${last.battery}% battery` : ''}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {track.isPending ? (
            <Skeleton height={140} radius={radius.lg} style={{marginTop: spacing.lg}} />
          ) : !points.length ? (
            <View style={{alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm}}>
              <MapPinOff size={28} color={colors.textSubtle} />
              <Text variant="title" align="center">
                No location for this day
              </Text>
              <Text variant="caption" tone="muted" align="center">
                {isToday
                  ? `${name.split(' ')[0]} hasn't shared a location today yet.`
                  : 'Location is only recorded while sharing is on during their shift.'}
              </Text>
              <Button
                title="Pick another day"
                icon={CalendarDays}
                variant="ghost"
                size="sm"
                fullWidth={false}
                style={{alignSelf: 'center'}}
                onPress={() => setPicking(true)}
              />
            </View>
          ) : (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  marginTop: spacing.lg,
                  padding: spacing.md,
                  borderRadius: radius.lg,
                  backgroundColor: colors.surfaceMuted,
                }}>
                <Stat value={formatDistance(summary!.distanceM)} label="Travelled" />
                <Stat
                  value={summary!.movingMs >= 60_000 ? formatDuration(summary!.movingMs) : '—'}
                  label="Moving"
                />
                <Stat
                  value={String(summary!.stops.length)}
                  label={summary!.stops.length === 1 ? 'Stop' : 'Stops'}
                />
              </View>

              <Text variant="overline" tone="muted" style={{marginTop: spacing.lg, marginBottom: spacing.sm}}>
                Timeline
              </Text>
              {timeline.map((t, i) => (
                <View key={i} style={{flexDirection: 'row', gap: spacing.md}}>
                  <View style={{alignItems: 'center', width: 14}}>
                    <View
                      style={{width: 12, height: 12, borderRadius: 6, backgroundColor: t.color, marginTop: 4}}
                    />
                    {i < timeline.length - 1 ? (
                      <View style={{flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2}} />
                    ) : null}
                  </View>
                  <View style={{flex: 1, paddingBottom: spacing.md}}>
                    <Text variant="title">{t.title}</Text>
                    <Text variant="caption" tone="muted">
                      {t.time}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </View>
      <CalendarSheet
        visible={picking}
        value={date}
        title="Show route for"
        onClose={() => setPicking(false)}
        onChange={d => {
          haptics.select();
          setDate(d);
          setPicking(false);
        }}
      />
    </View>
  );
}

function Stat({value, label}: {value: string; label: string}) {
  return (
    <View style={{flex: 1}}>
      <Text variant="h3">{value}</Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}
