import React, {useState} from 'react';
import {Platform, Pressable, View} from 'react-native';
import DateTimePicker, {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import {CalendarDays, Trash2} from 'lucide-react-native';
import type {Holiday} from '../../api/types';
import {
  BottomSheet,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  PressableScale,
  Text,
  TextField,
} from '../../components/ui';
import {formatDay, parseServerDate, toDateKey, weekdayShort} from '../../lib/date';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {useCreateHoliday, useDeleteHoliday, useHolidays} from './queries';
import {SetupScreen, Tag} from './parts';
import {holidayDays, splitHolidays} from './setupLogic';

const dayLabel = (key: string) => {
  const d = parseServerDate(key);
  return d ? `${weekdayShort(d)}, ${formatDay(d)}` : key;
};

export function HolidaysScreen(_: AppScreenProps<'SetupHolidays'>) {
  const {colors, spacing} = useTheme();
  const holidays = useHolidays();
  const remove = useDeleteHoliday();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Holiday | null>(null);
  const {upcoming, past} = splitHolidays(holidays.data ?? []);

  const row = (h: Holiday, i: number, next: boolean) => {
    const days = holidayDays(h);
    const color = h.festival_data?.color ?? colors.primary;
    return (
      <Pressable
        key={h.id}
        onLongPress={() => {
          haptics.tap();
          setRemoving(h);
        }}
        accessibilityHint="Long press to remove"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.md,
          borderTopWidth: i ? 1 : 0,
          borderTopColor: colors.border,
        }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: `${color}1F`,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {h.festival_data?.emoji ? (
            <Text style={{fontSize: 22}}>{h.festival_data.emoji}</Text>
          ) : (
            <CalendarDays size={20} color={colors.primary} />
          )}
        </View>
        <View style={{flex: 1, minWidth: 0}}>
          <Text variant="title" numberOfLines={1}>
            {h.title}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {days > 1
              ? `${dayLabel(h.start_date)} – ${dayLabel(h.end_date)} · ${days} days`
              : dayLabel(h.start_date)}
            {h.festival_data?.category ? ` · ${h.festival_data.category}` : ''}
          </Text>
        </View>
        {next ? (
          <Tag label="Next" fg={colors.primary} bg={colors.primarySoft} />
        ) : (
          <Pressable
            onPress={() => setRemoving(h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${h.title}`}>
            <Trash2 size={18} color={colors.textSubtle} />
          </Pressable>
        )}
      </Pressable>
    );
  };

  return (
    <SetupScreen
      title="Holidays"
      subtitle={
        holidays.data
          ? `${holidays.data.length} ${holidays.data.length === 1 ? 'holiday' : 'holidays'}`
          : null
      }
      onAdd={() => setAdding(true)}
      query={holidays}>
      {!holidays.data?.length ? (
        <EmptyState
          icon={CalendarDays}
          title="No holidays yet"
          message="Add the days your company is closed."
        />
      ) : (
        <>
          {upcoming.length ? (
            <Card>
              <Text variant="overline" tone="muted">
                Coming up
              </Text>
              {upcoming.map((h, i) => row(h, i, i === 0))}
            </Card>
          ) : null}
          {past.length ? (
            <Card>
              <Text variant="overline" tone="muted">
                Earlier
              </Text>
              {past.map((h, i) => row(h, i, false))}
            </Card>
          ) : null}
        </>
      )}

      <AddHolidaySheet visible={adding} onClose={() => setAdding(false)} />
      <ConfirmDialog
        visible={!!removing}
        icon={Trash2}
        destructive
        title={`Remove ${removing?.title ?? 'holiday'}?`}
        message="Employees will see it as a normal working day."
        confirmLabel="Remove"
        loading={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing.id, {onSuccess: () => setRemoving(null)})}
      />
    </SetupScreen>
  );
}

function DateButton({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
}) {
  const {colors, spacing, radius} = useTheme();
  const [open, setOpen] = useState(false);
  const date = parseServerDate(value) ?? new Date();
  const minDate = min ? parseServerDate(min) ?? undefined : undefined;
  const press = () => {
    haptics.select();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        minimumDate: minDate,
        onChange: (e, d) => e.type === 'set' && d && onChange(toDateKey(d)),
      });
    } else {
      setOpen(o => !o);
    }
  };
  return (
    <View style={{flex: 1}}>
      <Text variant="label">{label}</Text>
      <PressableScale
        onPress={press}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${dayLabel(value)}`}
        style={{
          marginTop: 6,
          height: 50,
          paddingHorizontal: 14,
          borderRadius: radius.lg,
          borderWidth: open ? 1.5 : 1,
          borderColor: open ? colors.primary : colors.borderStrong,
          justifyContent: 'center',
        }}>
        <Text variant="body">{dayLabel(value)}</Text>
      </PressableScale>
      {open ? (
        <View style={{marginTop: spacing.sm}}>
          <DateTimePicker
            value={date}
            mode="date"
            display="inline"
            minimumDate={minDate}
            onChange={(_, d) => d && onChange(toDateKey(d))}
          />
        </View>
      ) : null}
    </View>
  );
}

function AddHolidaySheet({visible, onClose}: {visible: boolean; onClose: () => void}) {
  const {spacing} = useTheme();
  const create = useCreateHoliday();
  const [title, setTitle] = useState('');
  const [from, setFrom] = useState(toDateKey());
  const [to, setTo] = useState(toDateKey());
  const [note, setNote] = useState('');
  const reset = () => {
    setTitle('');
    setFrom(toDateKey());
    setTo(toDateKey());
    setNote('');
  };
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Add holiday">
      <TextField label="Name" value={title} onChangeText={setTitle} placeholder="e.g. Diwali" />
      <View style={{flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md}}>
        <DateButton
          label="From"
          value={from}
          onChange={v => {
            setFrom(v);
            if (to < v) {
              setTo(v);
            }
          }}
        />
        <DateButton label="To" value={to} onChange={setTo} min={from} />
      </View>
      <View style={{marginTop: spacing.md}}>
        <TextField
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="Shown to employees"
        />
      </View>
      <Button
        title="Add holiday"
        style={{marginTop: spacing.xl}}
        disabled={!title.trim()}
        loading={create.isPending}
        onPress={() =>
          create.mutate(
            {title, description: note, start_date: from, end_date: to},
            {
              onSuccess: () => {
                reset();
                onClose();
              },
            },
          )
        }
      />
    </BottomSheet>
  );
}
