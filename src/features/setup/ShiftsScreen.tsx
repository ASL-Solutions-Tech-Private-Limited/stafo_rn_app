import React, {useEffect, useState} from 'react';
import {Pressable, View} from 'react-native';
import {ChevronRight, Clock3, Info, LogIn, LogOut, Moon, Trash2} from 'lucide-react-native';
import type {ShiftWithDays} from '../../api/types';
import {BottomSheet, Button, Card, ConfirmDialog, EmptyState, Text, TextField} from '../../components/ui';
import {formatClock, formatDuration, toDateKey} from '../../lib/date';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {usePeopleOnDate} from '../people/queries';
import {toHHmm} from '../people/employee/editDay';
import {useDeleteShift, useSaveShift, useShifts} from './queries';
import {DayToggles, IconWell, SetupScreen, TimeField, WeekStrip} from './parts';
import {daysLabel, isOvernight, shiftDays, shiftLengthMs} from './setupLogic';

const MON_FRI = [true, true, true, true, true, false, false];
const ALL_DAYS = Array(7).fill(true) as boolean[];

export function ShiftsScreen(_: AppScreenProps<'SetupShifts'>) {
  const {colors, spacing} = useTheme();
  const shifts = useShifts();
  const people = usePeopleOnDate(toDateKey());
  const onShift = (id: number) => people.people.filter(p => p.employee.shifts?.some(s => s.id === id)).length;
  const [editing, setEditing] = useState<ShiftWithDays | 'new' | null>(null);
  const list = shifts.data ?? [];

  return (
    <SetupScreen
      title="Shifts"
      subtitle={shifts.data ? `${list.length} ${list.length === 1 ? 'shift' : 'shifts'}` : null}
      onAdd={() => setEditing('new')}
      query={shifts}>
      {!list.length ? (
        <EmptyState
          icon={Clock3}
          title="No shifts yet"
          message="Add a shift to set working hours and days."
        />
      ) : (
        list.map(s => {
          const days = shiftDays(s);
          const n = onShift(s.id);
          return (
            <Card key={s.id} onPress={() => setEditing(s)}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
                <IconWell icon={Clock3} fg={colors.warning} bg={colors.warningSoft} />
                <View style={{flex: 1, minWidth: 0}}>
                  <Text variant="title">{s.shift_name ?? 'Shift'}</Text>
                  <Text variant="caption" tone="muted">
                    {formatClock(s.start_time)} – {formatClock(s.end_time)} ·{' '}
                    {formatDuration(shiftLengthMs(s.start_time, s.end_time))}
                    {isOvernight(s.start_time, s.end_time) ? ' · overnight' : ''}
                  </Text>
                </View>
                <Text variant="caption" tone="muted">
                  {n} {n === 1 ? 'person' : 'people'}
                </Text>
                <ChevronRight size={18} color={colors.textSubtle} />
              </View>
              <View style={{marginTop: spacing.md}}>
                <WeekStrip days={days} />
              </View>
            </Card>
          );
        })
      )}
      <ShiftSheet
        shift={editing === 'new' ? null : editing}
        visible={editing !== null}
        onClose={() => setEditing(null)}
        peopleOnShift={editing && editing !== 'new' ? onShift(editing.id) : 0}
      />
    </SetupScreen>
  );
}

function ShiftSheet({
  shift,
  visible,
  onClose,
  peopleOnShift,
}: {
  shift: ShiftWithDays | null;
  visible: boolean;
  onClose: () => void;
  peopleOnShift: number;
}) {
  const {colors, spacing} = useTheme();
  const save = useSaveShift();
  const remove = useDeleteShift();
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('19:00');
  const [days, setDays] = useState<boolean[]>(MON_FRI);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setName(shift?.shift_name ?? '');
    setStartTime(toHHmm(shift?.start_time) ?? '10:00');
    setEndTime(toHHmm(shift?.end_time) ?? '19:00');
    setDays(shift ? shiftDays(shift) : MON_FRI);
    setConfirmDelete(false);
  }, [visible, shift]);

  const working = days.filter(Boolean).length;
  const overnight = isOvernight(startTime, endTime);
  const canSave = !!name.trim() && working > 0 && startTime !== endTime;
  const preset = (label: string, value: boolean[]) => (
    <Pressable
      onPress={() => {
        haptics.select();
        setDays(value);
      }}
      accessibilityRole="button"
      style={{
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: colors.surfaceMuted,
      }}>
      <Text variant="caption" tone="primary" style={{fontFamily: 'PlusJakartaSans-Bold'}}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} title={shift ? 'Edit shift' : 'Add shift'}>
      <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Day Shift" />
      <View style={{flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md}}>
        <TimeField
          label="Starts"
          value={startTime}
          onChange={setStartTime}
          icon={LogIn}
          color={colors.success}
        />
        <TimeField label="Ends" value={endTime} onChange={setEndTime} icon={LogOut} color={colors.danger} />
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: spacing.lg,
          marginBottom: spacing.sm,
        }}>
        <Text variant="label">Working days</Text>
        <View style={{flexDirection: 'row', gap: 6}}>
          {preset('Mon–Fri', MON_FRI)}
          {preset('All 7 days', ALL_DAYS)}
        </View>
      </View>
      <DayToggles days={days} onChange={setDays} />

      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.md}}>
        {overnight ? (
          <Moon size={16} color={colors.textMuted} />
        ) : (
          <Info size={16} color={colors.textMuted} />
        )}
        <Text variant="body" tone="muted" style={{flex: 1}}>
          {[
            `${formatDuration(shiftLengthMs(startTime, endTime))} a day${
              overnight ? ', ends next morning' : ''
            }`,
            working ? `${daysLabel(days)} · ${working} working, ${7 - working} off` : 'Pick at least one day',
            shift ? `${peopleOnShift} ${peopleOnShift === 1 ? 'person' : 'people'} on this shift` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>

      <View style={{flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl}}>
        {shift ? (
          <Button
            title="Delete"
            icon={Trash2}
            variant="ghost"
            size="md"
            style={{flex: 1}}
            onPress={() => setConfirmDelete(true)}
          />
        ) : null}
        <Button
          title={shift ? 'Save' : 'Add shift'}
          size="md"
          style={{flex: 1.4}}
          disabled={!canSave}
          loading={save.isPending}
          onPress={() =>
            save.mutate(
              {id: shift?.id, input: {shift_name: name, start_time: startTime, end_time: endTime, days}},
              {onSuccess: onClose},
            )
          }
        />
      </View>

      <ConfirmDialog
        visible={confirmDelete}
        icon={Trash2}
        destructive
        title={`Delete ${shift?.shift_name ?? 'this shift'}?`}
        message={
          peopleOnShift
            ? `${peopleOnShift} ${
                peopleOnShift === 1 ? 'person is' : 'people are'
              } on this shift. Give them another shift first so their late marks and hours stay right.`
            : 'This can’t be undone.'
        }
        confirmLabel="Delete"
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => shift && remove.mutate(shift.id, {onSuccess: onClose})}
      />
    </BottomSheet>
  );
}
