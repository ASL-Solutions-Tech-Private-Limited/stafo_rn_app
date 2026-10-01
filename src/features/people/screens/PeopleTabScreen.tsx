import React, {useMemo, useState} from 'react';
import {FlatList, Pressable, RefreshControl, ScrollView, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {CalendarDays, ChevronLeft, ChevronRight, CircleAlert, Search, UsersRound} from 'lucide-react-native';
import {employeePhotoUrl} from '../../../api/endpoints/people';
import {
  Avatar,
  Badge,
  Button,
  CalendarSheet,
  Card,
  EmptyState,
  PressableScale,
  Reveal,
  Screen,
  Skeleton,
  Text,
  TextField,
  type BadgeTone,
} from '../../../components/ui';
import {
  formatClock,
  formatDay,
  formatDuration,
  formatTime,
  parseServerDate,
  toDateKey,
  weekdayShort,
} from '../../../lib/date';
import {haptics} from '../../../lib/haptics';
import {useTheme} from '../../../theme/ThemeProvider';
import {GROUP_OF, type DayStatusKind, type StatusGroup} from '../dayStatus';
import {usePeopleOnDate, type PersonDay} from '../queries';

const STATUS_LOOK: Record<DayStatusKind, {label: string; tone: BadgeTone}> = {
  working: {label: 'Working', tone: 'success'},
  present: {label: 'Present', tone: 'primary'},
  'half-day': {label: 'Half day', tone: 'warning'},
  'not-in': {label: 'Not in yet', tone: 'neutral'},
  upcoming: {label: 'Upcoming', tone: 'neutral'},
  absent: {label: 'Absent', tone: 'danger'},
  leave: {label: 'On leave', tone: 'warning'},
  'week-off': {label: 'Week off', tone: 'neutral'},
  holiday: {label: 'Holiday', tone: 'info'},
};

const FILTERS: {key: 'all' | StatusGroup; label: string}[] = [
  {key: 'all', label: 'All'},
  {key: 'in', label: 'In'},
  {key: 'not-in', label: 'Not in yet'},
  {key: 'absent', label: 'Absent'},
  {key: 'leave', label: 'On leave'},
  {key: 'off', label: 'Off'},
];

type Row = PersonDay;

function shiftDate(dateKey: string, days: number) {
  const d = parseServerDate(dateKey)!;
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

function dateTitle(dateKey: string) {
  const today = toDateKey();
  if (dateKey === today) {
    return 'Today';
  }
  if (dateKey === shiftDate(today, -1)) {
    return 'Yesterday';
  }
  const d = parseServerDate(dateKey)!;
  return `${weekdayShort(d)}, ${formatDay(d)}`;
}

export function PeopleTabScreen() {
  const {colors, spacing, radius} = useTheme();
  const today = toDateKey();
  const [date, setDate] = useState(today);
  const [filter, setFilter] = useState<'all' | StatusGroup>('all');
  const [query, setQuery] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const isToday = date === today;

  const {query: people, people: rows, counts} = usePeopleOnDate(date);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter(r => filter === 'all' || GROUP_OF[r.status.kind] === filter)
      .filter(
        r =>
          !q ||
          r.employee.name.toLowerCase().includes(q) ||
          (r.employee.phone ?? '').includes(q) ||
          (r.employee.emp_id ?? '').toLowerCase().includes(q),
      );
  }, [rows, filter, query]);

  const changeDate = (next: string) => {
    haptics.select();
    setDate(next);
  };

  const header = (
    <View style={{gap: spacing.lg, paddingBottom: spacing.md}}>
      <View style={{flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between'}}>
        <View>
          <Text variant="h1">People</Text>
          <Text variant="bodyRegular" tone="muted">
            {counts.all ?? 0} employees
          </Text>
        </View>
      </View>

      {/* Date bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 4,
        }}>
        <Pressable
          onPress={() => changeDate(shiftDate(date, -1))}
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          hitSlop={6}
          style={{width: 44, height: 44, alignItems: 'center', justifyContent: 'center'}}>
          <ChevronLeft size={20} color={colors.text} />
        </Pressable>
        <Pressable
          onPress={() => setCalendarOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Date: ${dateTitle(date)}. Change date`}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
          }}>
          <CalendarDays size={18} color={colors.primary} />
          <Text variant="title">{dateTitle(date)}</Text>
        </Pressable>
        <Pressable
          onPress={isToday ? undefined : () => changeDate(shiftDate(date, 1))}
          disabled={isToday}
          accessibilityRole="button"
          accessibilityLabel="Next day"
          hitSlop={6}
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isToday ? 0.3 : 1,
          }}>
          <ChevronRight size={20} color={colors.text} />
        </Pressable>
      </View>

      {/* Status filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{marginHorizontal: -spacing.lg}}
        contentContainerStyle={{paddingHorizontal: spacing.lg, gap: spacing.sm}}>
        {FILTERS.map(f => {
          const active = filter === f.key;
          const count = counts[f.key] ?? 0;
          return (
            <PressableScale
              key={f.key}
              onPress={() => {
                haptics.select();
                setFilter(f.key);
              }}
              accessibilityRole="button"
              accessibilityState={{selected: active}}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 14,
                height: 38,
                borderRadius: 19,
                backgroundColor: active ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
              }}>
              <Text variant="label" color={active ? colors.textOnPrimary : colors.text}>
                {f.label}
              </Text>
              <View
                style={{
                  minWidth: 20,
                  paddingHorizontal: 5,
                  height: 20,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: active ? 'rgba(255,255,255,0.22)' : colors.surfaceMuted,
                }}>
                <Text variant="caption" color={active ? colors.textOnPrimary : colors.textMuted}>
                  {count}
                </Text>
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>

      <TextField
        icon={Search}
        placeholder="Search by name, phone or ID"
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
        autoCorrect={false}
      />
    </View>
  );

  return (
    <Screen safeBottom={false}>
      <FlatList
        data={people.isPending ? [] : visible}
        keyExtractor={r => String(r.employee.id)}
        contentContainerStyle={{padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md}}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={people.isRefetching && !people.isPlaceholderData}
            onRefresh={() => {
              people.refetch();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({item, index}) => (
          <Reveal index={Math.min(index, 8)}>
            <PersonRow row={item} />
          </Reveal>
        )}
        ListEmptyComponent={
          people.isPending ? (
            <View style={{gap: spacing.md}}>
              {[0, 1, 2, 3].map(i => (
                <Skeleton key={i} height={76} radius={20} />
              ))}
            </View>
          ) : people.isError ? (
            <Card>
              <EmptyState
                compact
                icon={CircleAlert}
                title="Couldn't load your team"
                message={people.error.message}
                action={
                  <Button title="Try again" size="sm" fullWidth={false} onPress={() => people.refetch()} />
                }
              />
            </Card>
          ) : (
            <Card>
              <EmptyState
                compact
                icon={UsersRound}
                title={query ? 'No matches' : 'Nobody here'}
                message={
                  query ? `No employee matches "${query}".` : 'No employees have this status for the day.'
                }
              />
            </Card>
          )
        }
      />
      <CalendarSheet
        visible={calendarOpen}
        value={date}
        onClose={() => setCalendarOpen(false)}
        onChange={setDate}
        title="Attendance for"
      />
    </Screen>
  );
}

function PersonRow({row}: {row: Row}) {
  const {colors, spacing} = useTheme();
  const navigation = useNavigation();
  const {employee, status} = row;
  const look = STATUS_LOOK[status.kind];
  const shift = employee.shifts?.[0];

  let detail: string;
  if (status.kind === 'working' && status.inAt) {
    detail = `In ${formatTime(status.inAt)} · ${formatDuration(status.workedMs)}`;
  } else if ((status.kind === 'present' || status.kind === 'half-day') && status.inAt) {
    detail = `${formatTime(status.inAt)}${status.outAt ? ` – ${formatTime(status.outAt)}` : ''}${
      status.workedMs ? ` · ${formatDuration(status.workedMs)}` : ''
    }`;
  } else if ((status.kind === 'not-in' || status.kind === 'upcoming' || status.kind === 'absent') && shift) {
    detail = `Shift ${formatClock(shift.start_time)} – ${formatClock(shift.end_time)}`;
  } else if (!shift && (status.kind === 'not-in' || status.kind === 'absent')) {
    detail = 'No shift assigned';
  } else {
    detail = employee.emp_id ?? '';
  }

  return (
    <Card
      onPress={() => navigation.navigate('EmployeeDetail', {id: employee.id, name: employee.name})}
      style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md}}
      accessibilityLabel={`${employee.name}, ${look.label}, ${detail}. Open details`}>
      <Avatar name={employee.name} uri={employeePhotoUrl(employee)} size={48} />
      <View style={{flex: 1, minWidth: 0}}>
        <Text variant="title" numberOfLines={1}>
          {employee.name}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {[employee.position, employee.branch_name].filter(Boolean).join(' · ') || employee.emp_id}
        </Text>
        <Text
          variant="caption"
          numberOfLines={1}
          color={status.kind === 'working' ? colors.success : colors.textSubtle}
          style={{marginTop: 2}}>
          {detail}
        </Text>
      </View>
      <Badge
        label={look.label}
        tone={look.tone}
        live={status.kind === 'working'}
        dot={status.kind !== 'working'}
      />
    </Card>
  );
}
