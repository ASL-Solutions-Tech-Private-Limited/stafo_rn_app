import React, {useMemo, useState} from 'react';
import {View} from 'react-native';
import {CalendarClock, MapPin, Play, Receipt, Route, Truck, UserRound} from 'lucide-react-native';
import type {Trip} from '../../api/endpoints/trips';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  Skeleton,
  Text,
  type BadgeTone,
} from '../../components/ui';
import {formatDay, formatTime, parseServerDate} from '../../lib/date';
import type {AppScreenProps} from '../../navigation/types';
import {useSession} from '../../store/session';
import {useTheme} from '../../theme/ThemeProvider';
import {ChoiceChips, SetupScreen} from '../setup/parts';
import {useDrivers, useTrips} from './queries';
import {
  filterTrips,
  formatKm,
  formatRupees,
  isActive,
  PHASE_LABEL,
  phaseOf,
  shortAddress,
  toNumber,
  tripCounts,
  type Phase,
  type PhaseFilter,
} from './tripLogic';

export const PHASE_TONE: Record<Phase, BadgeTone> = {
  upcoming: 'primary',
  live: 'info',
  paused: 'warning',
  done: 'success',
  cancelled: 'neutral',
};

/** "12 Oct, 10:30 AM", with the year when it isn't this year. */
export function whenLabel(value?: string | null, now = new Date()) {
  const d = parseServerDate(value);
  if (!d) {
    return null;
  }
  const year = d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${formatDay(d)}${year}, ${formatTime(d)}`;
}

/** Every trip for the company; the trips they drive for an employee. */
export function TripsScreen({navigation}: AppScreenProps<'Trips'>) {
  const {colors, spacing} = useTheme();
  const isCompany = useSession(s => s.role === 'company');
  const trips = useTrips();
  const drivers = useDrivers(isCompany);
  const list = useMemo(() => trips.data ?? [], [trips.data]);
  const counts = tripCounts(list);
  const [filter, setFilter] = useState<PhaseFilter>('all');
  const shown = filterTrips(list, filter);
  // An employee's trip in progress, or their next one, gets the big card.
  const hero = !isCompany
    ? list.find(t => phaseOf(t.status) !== 'done' && phaseOf(t.status) !== 'cancelled')
    : undefined;
  const rest = hero ? shown.filter(t => t.id !== hero.id) : shown;

  const chip = (p: Phase) => ({
    value: p as PhaseFilter,
    label: counts[p] ? `${PHASE_LABEL[p]} · ${counts[p]}` : PHASE_LABEL[p],
  });

  return (
    <SetupScreen
      title={isCompany ? 'Trips' : 'My trips'}
      subtitle={
        trips.data
          ? isCompany
            ? `${list.length} ${list.length === 1 ? 'trip' : 'trips'}${
                drivers.data
                  ? ` · ${drivers.data.length} ${drivers.data.length === 1 ? 'driver' : 'drivers'}`
                  : ''
              }`
            : 'Trips you drive'
          : null
      }
      action={
        isCompany ? (
          <IconButton
            icon={Truck}
            accessibilityLabel="Vehicles"
            onPress={() => navigation.navigate('Vehicles')}
          />
        ) : undefined
      }
      onAdd={() => navigation.navigate('TripForm', {})}
      addLabel="Trip"
      query={trips}>
      {trips.isPending ? (
        <View style={{gap: spacing.md}}>
          <Skeleton height={70} radius={16} />
          <Skeleton height={130} radius={20} />
          <Skeleton height={130} radius={20} />
        </View>
      ) : !list.length ? (
        <Card>
          <EmptyState
            compact
            icon={Route}
            title="No trips yet"
            message={
              isCompany
                ? 'Plan a trip: pick a vehicle, a driver and where it goes.'
                : 'Trips you drive appear here. Add one to start.'
            }
          />
        </Card>
      ) : (
        <View style={{gap: spacing.md}}>
          {hero ? (
            <HeroTrip trip={hero} onPress={() => navigation.navigate('Trip', {id: hero.id})} />
          ) : (
            <View style={{flexDirection: 'row', gap: spacing.sm}}>
              <Tile
                n={String(counts.live + counts.paused)}
                label="Active"
                color={counts.live + counts.paused ? colors.info : colors.textMuted}
              />
              <Tile n={String(counts.upcoming)} label="Upcoming" color={colors.primary} />
              <Tile n={formatRupees(counts.expenses)} label="Expenses" color={colors.text} />
            </View>
          )}
          <ChoiceChips
            scroll
            items={[
              {value: 'all' as PhaseFilter, label: `All · ${list.length}`},
              chip('upcoming'),
              chip('live'),
              chip('paused'),
              chip('done'),
              ...(counts.cancelled ? [chip('cancelled')] : []),
            ]}
            value={filter}
            onChange={setFilter}
          />
          {rest.length ? (
            rest.map(t => (
              <TripCard
                key={t.id}
                trip={t}
                showDriver={isCompany}
                driverName={drivers.data?.find(d => d.id === t.driver_id)?.name}
                onPress={() => navigation.navigate('Trip', {id: t.id})}
              />
            ))
          ) : hero ? null : (
            <Card>
              <EmptyState compact icon={Route} title="No trips here" message="Try another filter." />
            </Card>
          )}
          {!isCompany ? (
            <Card style={{backgroundColor: colors.infoSoft, borderColor: 'transparent'}}>
              <View style={{flexDirection: 'row', gap: spacing.sm}}>
                <MapPin size={16} color={colors.info} />
                <Text variant="caption" style={{flex: 1}}>
                  While a trip is on, your phone shares its route with your company. It stops when you pause
                  or end the trip.
                </Text>
              </View>
            </Card>
          ) : null}
        </View>
      )}
    </SetupScreen>
  );
}

function Tile({n, label, color}: {n: string; label: string; color: string}) {
  return (
    <Card style={{flex: 1, paddingVertical: 12}}>
      <Text variant="h2" color={color} numberOfLines={1} adjustsFontSizeToFit>
        {n}
      </Text>
      <Text variant="caption" tone="muted" numberOfLines={1}>
        {label}
      </Text>
    </Card>
  );
}

function HeroTrip({trip, onPress}: {trip: Trip; onPress: () => void}) {
  const {colors, spacing, radius} = useTheme();
  const phase = phaseOf(trip.status);
  const when = whenLabel(trip.start_time);
  const over = isActive(phase);
  return (
    <Card
      onPress={onPress}
      style={{backgroundColor: colors.heroFrom, borderColor: 'transparent', borderRadius: radius.xl}}
      accessibilityLabel={`${trip.title}, ${PHASE_LABEL[phase]}`}>
      <Text variant="overline" color="rgba(255,255,255,0.8)">
        {over ? PHASE_LABEL[phase].toUpperCase() : `NEXT TRIP${when ? ` · ${when.toUpperCase()}` : ''}`}
      </Text>
      <Text variant="h3" color="#FFFFFF" style={{marginTop: 4}} numberOfLines={2}>
        {trip.title}
      </Text>
      <Text variant="caption" color="rgba(255,255,255,0.85)" numberOfLines={1}>
        {shortAddress(trip.from_address)} → {shortAddress(trip.to_address)}
      </Text>
      <Button
        title={over ? 'Open trip' : 'Start trip'}
        icon={over ? Route : Play}
        variant="inverse"
        style={{marginTop: spacing.md}}
        onPress={onPress}
      />
    </Card>
  );
}

export function TripCard({
  trip,
  showDriver,
  driverName,
  onPress,
}: {
  trip: Trip;
  showDriver: boolean;
  driverName?: string;
  onPress: () => void;
}) {
  const {colors, spacing} = useTheme();
  const phase = phaseOf(trip.status);
  const when = whenLabel(trip.start_time);
  const km = toNumber(trip.distance);
  const spent = toNumber(trip.total_expenses);
  const meta: {icon: typeof Route; text: string}[] = [
    ...(when && phase === 'upcoming' ? [{icon: CalendarClock, text: when}] : []),
    ...(km ? [{icon: Route, text: formatKm(km)}] : []),
    ...(spent ? [{icon: Receipt, text: formatRupees(spent)}] : []),
    ...(showDriver && driverName ? [{icon: UserRound, text: driverName}] : []),
  ];
  return (
    <Card onPress={onPress} accessibilityLabel={`${trip.title}, ${PHASE_LABEL[phase]}`}>
      <View style={{flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm}}>
        <Text variant="title" numberOfLines={1} style={{flex: 1}}>
          {trip.title}
        </Text>
        <Badge label={PHASE_LABEL[phase]} tone={PHASE_TONE[phase]} dot live={phase === 'live'} />
      </View>
      <View style={{marginTop: spacing.sm, gap: 2}}>
        <Stop color={colors.success} text={shortAddress(trip.from_address)} />
        <View style={{width: 2, height: 8, marginLeft: 4, backgroundColor: colors.borderStrong}} />
        <Stop color={colors.danger} text={shortAddress(trip.to_address)} />
      </View>
      {meta.length ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.md,
            marginTop: spacing.md,
            paddingTop: spacing.sm,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}>
          {meta.map(m => (
            <Meta key={m.text} icon={m.icon} text={m.text} />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function Stop({color, text}: {color: string; text: string}) {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
      <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: color}} />
      <Text variant="caption" numberOfLines={1} style={{flex: 1}}>
        {text}
      </Text>
    </View>
  );
}

function Meta({icon: Icon, text}: {icon: typeof Route; text: string}) {
  const {colors} = useTheme();
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
      <Icon size={13} color={colors.textMuted} />
      <Text variant="caption" tone="muted">
        {text}
      </Text>
    </View>
  );
}
