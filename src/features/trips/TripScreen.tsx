import React, {useEffect, useRef, useState} from 'react';
import {Linking, RefreshControl, ScrollView, StatusBar, View} from 'react-native';
import MapView, {Polyline} from 'react-native-maps';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ArrowLeft, CircleAlert, Flag, Pause, Pencil, Phone, Play, Trash2, Truck} from 'lucide-react-native';
import type {TripAction, TripDetail} from '../../api/endpoints/trips';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconButton,
  PressableScale,
  Skeleton,
  Text,
  toast,
} from '../../components/ui';
import {formatTime, toDateKey} from '../../lib/date';
import {useNow} from '../../lib/useNow';
import type {AppScreenProps} from '../../navigation/types';
import {useSession} from '../../store/session';
import {useTheme} from '../../theme/ThemeProvider';
import {BadgeMarker, DEFAULT_REGION, EDGE_PADDING, NowMarker} from '../location/mapParts';
import {LIVE_REFRESH_MS, useDeleteTrip, useTrip, useTripRoute} from './queries';
import {TripActionSheet} from './TripActionSheet';
import {PHASE_TONE, whenLabel} from './TripsScreen';
import {
  ACTION_LABEL,
  canEdit,
  formatKm,
  formatSpan,
  formatRupees,
  isActive,
  nextActions,
  PHASE_LABEL,
  phaseOf,
  pointOf,
  shortAddress,
  summarize,
  toNumber,
  toServerDateTime,
  type TimelineEntry,
} from './tripLogic';

/** One trip: route map, totals, the start / halt / end timeline, and the next step. */
export function TripScreen({navigation, route}: AppScreenProps<'Trip'>) {
  const {id} = route.params;
  const {colors, spacing, radius, dark} = useTheme();
  const insets = useSafeAreaInsets();
  const isCompany = useSession(s => s.role === 'company');
  const me = useSession(s => s.employee?.id);
  const trip = useTrip(id);
  const t = trip.data;
  const phase = phaseOf(t?.status);
  const live = phase === 'live';
  const routeQ = useTripRoute(id, !!t && phase !== 'upcoming', live ? LIVE_REFRESH_MS : undefined);
  const now = useNow(isActive(phase), 30_000);
  const summary = summarize(t?.trip_logs, now);
  const remove = useDeleteTrip();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [action, setAction] = useState<TripAction | null>(null);

  // The driver runs the trip; the company can step in, as in the old app.
  const canAct = isCompany || (me != null && t?.driver_id === me);
  const actions = canAct ? nextActions(phase) : [];

  const from = pointOf(t?.start_latitude, t?.start_longitude);
  const to = pointOf(t?.end_latitude, t?.end_longitude);
  const path = routeQ.data ?? [];
  const last = path[path.length - 1];
  const halts = summary.timeline.filter(
    (e): e is Extract<TimelineEntry, {kind: 'halt'}> => e.kind === 'halt' && e.latitude != null,
  );

  const map = useRef<MapView>(null);
  const fit = (animated = true) => {
    const coords = [...path, ...(from ? [from] : []), ...(to ? [to] : [])];
    if (coords.length > 1) {
      map.current?.fitToCoordinates(coords, {edgePadding: {...EDGE_PADDING, top: 90, bottom: 40}, animated});
    } else if (coords.length === 1) {
      map.current?.animateToRegion(
        {...coords[0], latitudeDelta: 0.05, longitudeDelta: 0.05},
        animated ? 400 : 0,
      );
    }
  };
  const framed = useRef(0);
  useEffect(() => {
    const n = path.length + (from ? 1 : 0) + (to ? 1 : 0);
    if (n && n !== framed.current) {
      framed.current = n;
      setTimeout(() => fit(), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path.length, !!from, !!to]);

  const spent = toNumber(t?.total_expenses) ?? 0;
  const client = t?.customer_info;
  const clientPhone = (client?.phone ?? '').replace(/\D/g, '').slice(-10);

  return (
    <View style={{flex: 1, backgroundColor: colors.background}}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <View style={{height: 280 + insets.top}}>
        <MapView
          ref={map}
          style={{flex: 1}}
          initialRegion={DEFAULT_REGION}
          showsCompass={false}
          toolbarEnabled={false}
          onMapReady={() => fit(false)}>
          {from && to ? (
            <Polyline
              coordinates={[from, to]}
              strokeColor={colors.textSubtle}
              strokeWidth={2}
              lineDashPattern={[4, 8]}
            />
          ) : null}
          {path.length > 1 ? (
            <>
              <Polyline
                coordinates={path}
                strokeColor="#FFFFFF"
                strokeWidth={9}
                lineJoin="round"
                lineCap="round"
              />
              <Polyline
                coordinates={path}
                strokeColor={colors.primary}
                strokeWidth={5}
                lineJoin="round"
                lineCap="round"
              />
            </>
          ) : null}
          {from ? (
            <BadgeMarker point={from} kind="start" title={`From ${shortAddress(t?.from_address)}`} />
          ) : null}
          {to ? <BadgeMarker point={to} kind="end" title={`To ${shortAddress(t?.to_address)}`} /> : null}
          {halts.map(h => (
            <BadgeMarker
              key={h.n}
              point={{latitude: h.latitude!, longitude: h.longitude!}}
              kind="stop"
              label={String(h.n)}
              title={`Halt ${h.n} · ${formatTime(h.at)}`}
            />
          ))}
          {live && last ? <NowMarker point={{...last, at: now, battery: null}} /> : null}
        </MapView>
        <View
          style={{
            position: 'absolute',
            left: spacing.lg,
            right: spacing.lg,
            top: insets.top + spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={() => navigation.goBack()} />
          {t ? (
            <View style={{backgroundColor: colors.surface, borderRadius: radius.pill, padding: 3}}>
              <Badge label={PHASE_LABEL[phase]} tone={PHASE_TONE[phase]} dot live={live} />
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={{
          flex: 1,
          marginTop: -18,
          backgroundColor: colors.background,
          borderTopLeftRadius: radius.xxl,
          borderTopRightRadius: radius.xxl,
        }}
        contentContainerStyle={{padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl}}
        refreshControl={
          <RefreshControl
            refreshing={trip.isRefetching}
            onRefresh={() => {
              trip.refetch();
              routeQ.refetch();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }>
        {trip.isPending ? (
          <>
            <Skeleton height={44} radius={12} />
            <Skeleton height={64} radius={16} />
            <Skeleton height={140} radius={20} />
          </>
        ) : trip.isError || !t ? (
          <EmptyState
            icon={CircleAlert}
            title="Couldn't load this trip"
            message={trip.error?.message}
            action={<Button title="Try again" size="sm" fullWidth={false} onPress={() => trip.refetch()} />}
          />
        ) : (
          <>
            <View>
              <Text variant="h2">{t.title}</Text>
              <Text variant="caption" tone="muted">
                {summary.startedAt
                  ? `Started ${whenLabel(toServerDateTime(summary.startedAt))}`
                  : `Planned ${whenLabel(t.start_time) ?? '—'}${
                      t.end_time ? ` until ${whenLabel(t.end_time)}` : ''
                    }`}
              </Text>
            </View>

            <View style={{flexDirection: 'row', gap: spacing.sm}}>
              <Stat
                value={
                  summary.kmDriven != null
                    ? formatKm(summary.kmDriven)
                    : toNumber(t.distance)
                    ? formatKm(toNumber(t.distance)!)
                    : '—'
                }
                label={summary.kmDriven != null ? 'driven' : 'planned'}
              />
              <Stat value={summary.startedAt ? formatSpan(summary.totalMs) : '—'} label="on trip" />
              <Stat
                value={String(summary.haltCount)}
                label={summary.haltCount ? `halt · ${formatSpan(summary.haltMs)}` : 'halts'}
              />
              <Stat
                value={formatRupees(spent)}
                label="expenses"
                onPress={() =>
                  navigation.navigate('TripExpenses', {id, title: t.title, open: phase !== 'done'})
                }
              />
            </View>

            <Card style={{gap: spacing.md}}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
                <Well>
                  <Truck size={18} color={colors.primary} />
                </Well>
                <View style={{flex: 1, minWidth: 0}}>
                  <Text variant="title" numberOfLines={1}>
                    {t.vehicle?.vehicle_no ?? 'No vehicle'}
                    {t.vehicle?.vehicle_type ? ` · ${t.vehicle.vehicle_type}` : ''}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {t.driver?.name ? `Driver ${t.driver.name}` : 'No driver'}
                    {t.driver?.emp_id ? ` · ${t.driver.emp_id}` : ''}
                  </Text>
                </View>
              </View>
              {client?.customer_name ? (
                <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
                  <View style={{flex: 1, minWidth: 0}}>
                    <Text variant="caption" tone="muted">
                      Client
                    </Text>
                    <Text variant="title" numberOfLines={1}>
                      {client.customer_name}
                    </Text>
                  </View>
                  {clientPhone.length === 10 ? (
                    <IconButton
                      icon={Phone}
                      accessibilityLabel={`Call ${client.customer_name}`}
                      onPress={() =>
                        Linking.openURL(`tel:${clientPhone}`).catch(() =>
                          toast.error('Couldn’t open the dialer.'),
                        )
                      }
                    />
                  ) : null}
                </View>
              ) : null}
            </Card>

            <Card style={{gap: 2}}>
              <Place color={colors.success} label="From" address={t.from_address} />
              <View style={{width: 2, height: 12, marginLeft: 4, backgroundColor: colors.borderStrong}} />
              <Place color={colors.danger} label="To" address={t.to_address} />
            </Card>

            {summary.timeline.length ? (
              <Card>
                <Text variant="overline" tone="muted" style={{marginBottom: spacing.md}}>
                  TIMELINE
                </Text>
                <Timeline
                  trip={t}
                  entries={summary.timeline}
                  live={live}
                  lastPointAt={routeQ.dataUpdatedAt}
                />
              </Card>
            ) : null}

            {t.notes?.trim() ? (
              <Card>
                <Text variant="overline" tone="muted">
                  NOTES
                </Text>
                <Text variant="bodyRegular" style={{marginTop: 4}}>
                  {t.notes.trim()}
                </Text>
              </Card>
            ) : null}

            {isCompany && canEdit(t) ? (
              <View style={{flexDirection: 'row', gap: spacing.sm}}>
                <Button
                  title="Edit"
                  icon={Pencil}
                  variant="ghost"
                  style={{flex: 1}}
                  onPress={() => navigation.navigate('TripForm', {id})}
                />
                <Button
                  title="Delete"
                  icon={Trash2}
                  variant="danger"
                  style={{flex: 1}}
                  onPress={() => setConfirmDelete(true)}
                />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      {t && actions.length ? (
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + spacing.md,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}>
          {actions.map(a => (
            <Button
              key={a}
              title={ACTION_LABEL[a]}
              icon={a === 'start' || a === 'resume' ? Play : a === 'pause' ? Pause : Flag}
              variant={
                a === 'pause' || (a === 'end' && actions.length > 1 && phase === 'paused')
                  ? 'ghost'
                  : 'primary'
              }
              style={{flex: 1}}
              onPress={() => setAction(a)}
            />
          ))}
        </View>
      ) : null}

      {t ? (
        <TripActionSheet
          trip={t}
          action={action}
          lastOdometer={summary.odometerLast}
          startOdometer={summary.odometerStart}
          onClose={() => setAction(null)}
        />
      ) : null}

      <ConfirmDialog
        visible={confirmDelete}
        icon={Trash2}
        destructive
        title={`Delete ${t?.title ?? 'this trip'}?`}
        message="This can’t be undone."
        confirmLabel="Delete"
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(id, {
            onSuccess: () => {
              setConfirmDelete(false);
              navigation.goBack();
            },
          })
        }
      />
    </View>
  );
}

function Well({children}: {children: React.ReactNode}) {
  const {colors, radius} = useTheme();
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: radius.md,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {children}
    </View>
  );
}

function Stat({value, label, onPress}: {value: string; label: string; onPress?: () => void}) {
  const {colors, radius} = useTheme();
  const body = (
    <>
      <Text
        variant="label"
        numberOfLines={1}
        adjustsFontSizeToFit
        color={onPress ? colors.primary : colors.text}>
        {value}
      </Text>
      <Text variant="caption" tone="muted" numberOfLines={1} style={{fontSize: 10.5}}>
        {label}
      </Text>
    </>
  );
  const style = {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: onPress ? colors.primarySoft : colors.border,
    backgroundColor: onPress ? colors.primarySoft : colors.surface,
  };
  return onPress ? (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${value} ${label}`}
      style={style}>
      {body}
    </PressableScale>
  ) : (
    <View style={style}>{body}</View>
  );
}

function Place({color, label, address}: {color: string; label: string; address?: string | null}) {
  return (
    <View style={{flexDirection: 'row', alignItems: 'flex-start', gap: 10}}>
      <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginTop: 4}} />
      <View style={{flex: 1}}>
        <Text variant="caption" tone="muted">
          {label}
        </Text>
        <Text variant="body">{address?.trim() || 'No address'}</Text>
      </View>
    </View>
  );
}

function Timeline({
  trip,
  entries,
  live,
  lastPointAt,
}: {
  trip: TripDetail;
  entries: TimelineEntry[];
  live: boolean;
  lastPointAt: number;
}) {
  const {colors} = useTheme();
  const rows: {color: string; title: string; detail?: string; right: string}[] = entries.map(e => {
    if (e.kind === 'start') {
      return {
        color: colors.success,
        title: 'Started',
        detail: shortAddress(trip.from_address),
        right: `${formatTime(e.at)}${e.odometer != null ? `\n${formatKm(e.odometer)}` : ''}`,
      };
    }
    if (e.kind === 'end') {
      return {
        color: colors.danger,
        title: 'Ended',
        detail: shortAddress(trip.to_address),
        right: `${formatTime(e.at)}${e.odometer != null ? `\n${formatKm(e.odometer)}` : ''}`,
      };
    }
    return {
      color: colors.warning,
      title: `Halt ${e.n}${e.until ? ` · ${formatSpan(e.until.getTime() - e.at.getTime())}` : ''}`,
      detail: e.until
        ? `${whenLabel(toServerDateTime(e.at))} – ${
            toDateKey(e.until) === toDateKey(e.at)
              ? formatTime(e.until)
              : whenLabel(toServerDateTime(e.until))
          }`
        : 'Paused now',
      right: formatTime(e.at),
    };
  });
  if (live) {
    rows.push({
      color: colors.primary,
      title: 'On the move',
      detail: lastPointAt ? `Route updated ${formatTime(new Date(lastPointAt))}` : undefined,
      right: 'Now',
    });
  }
  return (
    <View>
      {rows.map((r, i) => (
        <View key={i} style={{flexDirection: 'row', gap: 10}}>
          <View style={{alignItems: 'center', width: 12}}>
            <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: r.color, marginTop: 5}} />
            {i < rows.length - 1 ? (
              <View style={{flex: 1, width: 2, backgroundColor: colors.borderStrong}} />
            ) : null}
          </View>
          <View style={{flex: 1, paddingBottom: i < rows.length - 1 ? 14 : 0}}>
            <Text variant="label">{r.title}</Text>
            {r.detail ? (
              <Text variant="caption" tone="muted" numberOfLines={2}>
                {r.detail}
              </Text>
            ) : null}
          </View>
          <Text variant="caption" tone="muted" style={{textAlign: 'right'}}>
            {r.right}
          </Text>
        </View>
      ))}
    </View>
  );
}
