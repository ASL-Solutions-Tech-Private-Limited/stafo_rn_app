import React, {useEffect, useMemo, useState} from 'react';
import {Platform, Pressable, View} from 'react-native';
import DateTimePicker, {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import {
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  Info,
  LogIn,
  LogOut,
  type LucideIcon,
} from 'lucide-react-native';
import type {DailyAttendance, ShiftWithDays} from '../../../api/types';
import {BottomSheet, Button, Text, TextField} from '../../../components/ui';
import {
  atClock,
  formatClock,
  formatDay,
  formatDuration,
  parseServerDate,
  weekdayShort,
} from '../../../lib/date';
import {haptics} from '../../../lib/haptics';
import {useTheme} from '../../../theme/ThemeProvider';
import {
  editSummary,
  initialEdit,
  isChanged,
  toUpdateFields,
  validateEdit,
  type EditDayState,
  type EditStatus,
} from './editDay';
import type {AttendanceUpdateFields} from '../../../api/endpoints/employee';

const STATUSES: {key: EditStatus; label: string}[] = [
  {key: 'present', label: 'Present'},
  {key: 'half', label: 'Half day'},
  {key: 'absent', label: 'Absent'},
  {key: 'leave', label: 'Leave'},
];

type Props = {
  visible: boolean;
  onClose: () => void;
  name: string;
  record: DailyAttendance | null;
  dateKey: string;
  shift?: ShiftWithDays | null;
  saving: boolean;
  onSave: (fields: AttendanceUpdateFields, note: string) => void;
};

const toDate = (dateKey: string, hhmm: string | null) => atClock(dateKey, hhmm) ?? atClock(dateKey, '09:00')!;
const toHHmm = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Admin correction of one day's attendance: status, in/out times and an optional note. */
export function EditDaySheet({visible, onClose, name, record, dateKey, shift, saving, onSave}: Props) {
  const {colors, spacing, radius} = useTheme();
  const original = useMemo(
    () => (record ? initialEdit(record) : {status: 'present' as const, inTime: null, outTime: null}),
    [record],
  );
  const [state, setState] = useState<EditDayState>(original);
  const [note, setNote] = useState('');
  const [picking, setPicking] = useState<'in' | 'out' | null>(null);
  useEffect(() => {
    if (visible) {
      setState(original);
      setNote('');
      setPicking(null);
    }
  }, [visible, original]);

  const day = parseServerDate(dateKey);
  const dayLabel = day ? `${weekdayShort(day)}, ${formatDay(day)}` : dateKey;
  const times = state.status === 'present' || state.status === 'half';
  const changed = isChanged(state, original);
  const problem = validateEdit(state, dateKey);
  const summary = editSummary(state, dateKey, shift);

  const setTime = (which: 'in' | 'out', value: string) =>
    setState(s => (which === 'in' ? {...s, inTime: value} : {...s, outTime: value}));

  const openPicker = (which: 'in' | 'out') => {
    haptics.select();
    const current = toDate(dateKey, which === 'in' ? state.inTime : state.outTime ?? state.inTime);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'time',
        is24Hour: false,
        onChange: (event, date) => {
          if (event.type === 'set' && date) {
            setTime(which, toHHmm(date));
          }
        },
      });
    } else {
      setPicking(p => (p === which ? null : which));
      if (!(which === 'in' ? state.inTime : state.outTime)) {
        setTime(which, toHHmm(current));
      }
    }
  };

  const shiftLine = shift
    ? ` · ${shift.shift_name ?? 'Shift'} ${formatClock(shift.start_time)} – ${formatClock(shift.end_time)}`
    : '';

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={`Edit ${dayLabel}`}
      subtitle={`${name}${shiftLine}`}>
      {/* Status */}
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Status"
        style={{
          flexDirection: 'row',
          padding: 4,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceMuted,
        }}>
        {STATUSES.map(s => {
          const on = state.status === s.key;
          return (
            <Pressable
              key={s.key}
              onPress={() => {
                haptics.select();
                setPicking(null);
                setState(prev => ({...prev, status: s.key}));
              }}
              accessibilityRole="radio"
              accessibilityState={{checked: on}}
              style={{
                flex: 1,
                height: 38,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: on ? colors.surface : 'transparent',
              }}>
              <Text variant="label" color={on ? colors.text : colors.textMuted}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {times ? (
        <View style={{gap: spacing.sm, marginTop: spacing.lg}}>
          <TimeRow
            icon={LogIn}
            fg={colors.success}
            bg={colors.successSoft}
            label="In"
            value={state.inTime}
            was={state.inTime !== original.inTime ? original.inTime : undefined}
            open={picking === 'in'}
            onPress={() => openPicker('in')}
          />
          {picking === 'in' ? (
            <DateTimePicker
              value={toDate(dateKey, state.inTime)}
              mode="time"
              display="spinner"
              onChange={(_, d) => d && setTime('in', toHHmm(d))}
            />
          ) : null}
          <TimeRow
            icon={LogOut}
            fg={colors.danger}
            bg={colors.dangerSoft}
            label="Out"
            value={state.outTime}
            was={state.outTime !== original.outTime ? original.outTime : undefined}
            open={picking === 'out'}
            onPress={() => openPicker('out')}
          />
          {picking === 'out' ? (
            <DateTimePicker
              value={toDate(dateKey, state.outTime ?? state.inTime)}
              mode="time"
              display="spinner"
              onChange={(_, d) => d && setTime('out', toHHmm(d))}
            />
          ) : null}

          {problem && changed ? (
            <Line icon={CircleAlert} color={colors.danger} text={problem} />
          ) : summary ? (
            <Line
              icon={CircleCheck}
              color={summary.late ? colors.warning : colors.success}
              text={[
                summary.workedMs != null ? `Worked ${formatDuration(summary.workedMs)}` : 'Still at work',
                summary.late == null ? null : summary.late ? 'came in late' : 'came in on time',
              ]
                .filter(Boolean)
                .join(' · ')}
            />
          ) : null}
        </View>
      ) : (
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
            marginTop: spacing.lg,
            padding: spacing.md,
            borderRadius: radius.md,
            backgroundColor: state.status === 'absent' ? colors.dangerSoft : colors.surfaceMuted,
          }}>
          {state.status === 'absent' ? (
            <CircleAlert size={18} color={colors.danger} />
          ) : (
            <Info size={18} color={colors.textMuted} />
          )}
          <Text
            variant="body"
            color={state.status === 'absent' ? colors.danger : colors.textMuted}
            style={{flex: 1, fontFamily: 'PlusJakartaSans-SemiBold'}}>
            {`Marks ${dayLabel} as ${state.status === 'absent' ? 'absent' : 'leave'}.`}
            {original.inTime ? ` The punch at ${formatClock(original.inTime)} is removed from the day.` : ''}
          </Text>
        </View>
      )}

      <View style={{marginTop: spacing.lg}}>
        <TextField
          label="Note (optional)"
          placeholder="Why this was changed, e.g. biometric was down"
          value={note}
          onChangeText={setNote}
        />
      </View>

      <View style={{flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl}}>
        <Button
          title="Cancel"
          variant="ghost"
          size="md"
          style={{flex: 1}}
          disabled={saving}
          onPress={onClose}
        />
        <Button
          title={state.status === 'absent' ? 'Mark absent' : 'Save changes'}
          variant={state.status === 'absent' ? 'danger' : 'primary'}
          size="md"
          style={{flex: 1.4}}
          disabled={!changed || !!problem}
          loading={saving}
          onPress={() => onSave(toUpdateFields(state, record), note)}
        />
      </View>
    </BottomSheet>
  );
}

function TimeRow({
  icon: Icon,
  fg,
  bg,
  label,
  value,
  was,
  open,
  onPress,
}: {
  icon: LucideIcon;
  fg: string;
  bg: string;
  label: string;
  value: string | null;
  /** The value before this edit, when it changed. */
  was?: string | null;
  open: boolean;
  onPress: () => void;
}) {
  const {colors, spacing, radius} = useTheme();
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} time, ${value ? formatClock(value) : 'not set'}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: radius.lg,
        borderWidth: open ? 1.5 : 1,
        borderColor: open ? colors.primary : colors.border,
        backgroundColor: colors.surface,
      }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon size={18} color={fg} />
      </View>
      <View style={{flex: 1}}>
        <Text variant="caption" tone="muted">
          {label}
        </Text>
        <Text variant="h3" color={value ? colors.text : colors.textSubtle}>
          {value ? formatClock(value) : 'Not set'}
        </Text>
      </View>
      {was !== undefined ? (
        <Text variant="caption" tone="subtle" style={{textDecorationLine: was ? 'line-through' : 'none'}}>
          {was ? `was ${formatClock(was)}` : 'was empty'}
        </Text>
      ) : null}
      <Chevron size={18} color={colors.textSubtle} />
    </Pressable>
  );
}

function Line({icon: Icon, color, text}: {icon: LucideIcon; color: string; text: string}) {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4}}>
      <Icon size={16} color={color} />
      <Text variant="label" color={color} style={{flex: 1}}>
        {text}
      </Text>
    </View>
  );
}
