import React, {useEffect, useState} from 'react';
import {Platform, View} from 'react-native';
import DateTimePicker, {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import {CalendarCheck, CircleAlert, Send} from 'lucide-react-native';
import type {Holiday, LeaveRequestRecord, ShiftWithDays} from '../../api/types';
import {BottomSheet, Button, PressableScale, Text, TextField} from '../../components/ui';
import {formatDay, parseServerDate, toDateKey, weekdayShort} from '../../lib/date';
import {haptics} from '../../lib/haptics';
import {useTheme} from '../../theme/ThemeProvider';
import {ChoiceChips} from '../setup/parts';
import {countLeaveDays, leaveRequestError, type TypeBalance} from './leaveApply';

type Props = {
  visible: boolean;
  onClose: () => void;
  balances: TypeBalance[];
  myLeaves: LeaveRequestRecord[];
  shift?: ShiftWithDays | null;
  holidays: Pick<Holiday, 'start_date' | 'end_date'>[];
  sending: boolean;
  onSend: (p: {typeId: number; from: string; to: string; reason: string}) => void;
};

const shortName = (name: string) => name.replace(/\s*leave$/i, '');
const label = (key: string) => {
  const d = parseServerDate(key);
  return d ? `${weekdayShort(d)}, ${formatDay(d)}` : '';
};

export function ApplyLeaveSheet({
  visible,
  onClose,
  balances,
  myLeaves,
  shift,
  holidays,
  sending,
  onSend,
}: Props) {
  const {colors, spacing, radius} = useTheme();
  const [typeId, setTypeId] = useState<number | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);

  useEffect(() => {
    if (visible) {
      setTypeId(balances[0]?.id ?? null);
      setFrom('');
      setTo('');
      setReason('');
      setPicking(null);
    }
  }, [visible, balances]);

  const type = balances.find(b => b.id === typeId);
  const days = from && to ? countLeaveDays(from, to, shift, holidays) : null;
  const error =
    from && to ? leaveRequestError({typeId, from, to, workingDays: days?.working ?? 0}, myLeaves) : null;
  const over = type?.left != null && days ? days.working - type.left : 0;

  const pick = (which: 'from' | 'to', key: string) => {
    if (which === 'from') {
      setFrom(key);
      if (!to || to < key) {
        setTo(key);
      }
    } else {
      setTo(key);
    }
  };
  const open = (which: 'from' | 'to') => {
    haptics.select();
    const current = parseServerDate(which === 'from' ? from : to || from) ?? new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        minimumDate: which === 'to' && from ? parseServerDate(from) ?? undefined : undefined,
        onChange: (e, d) => e.type === 'set' && d && pick(which, toDateKey(d)),
      });
    } else {
      setPicking(p => (p === which ? null : which));
    }
  };

  const fact = !days
    ? null
    : over > 0
    ? {
        icon: CircleAlert,
        color: colors.warning,
        text: `${days.working} working day${days.working === 1 ? '' : 's'}, ${over} more than your ${
          type!.left
        } ${shortName(type!.name).toLowerCase()} days left. Your manager decides.`,
      }
    : {
        icon: CalendarCheck,
        color: colors.success,
        text:
          `${days.working} working day${days.working === 1 ? '' : 's'}` +
          (days.calendar > days.working
            ? ` (${days.calendar - days.working} off-day${
                days.calendar - days.working === 1 ? '' : 's'
              } not counted)`
            : '') +
          (type?.left != null
            ? ` · ${type.left - days.working} of ${type.allowance} ${shortName(
                type.name,
              ).toLowerCase()} days left after this`
            : '') +
          (type && !type.paid ? ' · unpaid' : ''),
      };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Apply for leave">
      <View style={{gap: spacing.lg}}>
        <ChoiceChips
          items={balances.map(b => ({
            value: b.id,
            label: b.left != null ? `${shortName(b.name)} · ${b.left} left` : shortName(b.name),
          }))}
          value={typeId}
          onChange={setTypeId}
        />
        <View>
          <View style={{flexDirection: 'row', gap: spacing.sm}}>
            {(['from', 'to'] as const).map(which => {
              const value = which === 'from' ? from : to;
              const active = picking === which;
              return (
                <View key={which} style={{flex: 1}}>
                  <Text variant="label">{which === 'from' ? 'From' : 'To'}</Text>
                  <PressableScale
                    onPress={() => open(which)}
                    accessibilityRole="button"
                    accessibilityLabel={`${which === 'from' ? 'From' : 'To'}, ${
                      value ? label(value) : 'not set'
                    }`}
                    style={{
                      marginTop: 6,
                      height: 48,
                      paddingHorizontal: 12,
                      borderRadius: radius.lg,
                      borderWidth: active ? 1.5 : 1,
                      borderColor: active ? colors.primary : colors.borderStrong,
                      justifyContent: 'center',
                    }}>
                    <Text variant="body" color={value ? colors.text : colors.textSubtle}>
                      {value ? label(value) : 'Pick a day'}
                    </Text>
                  </PressableScale>
                </View>
              );
            })}
          </View>
          {picking ? (
            <DateTimePicker
              value={parseServerDate(picking === 'from' ? from : to || from) ?? new Date()}
              mode="date"
              display="inline"
              minimumDate={picking === 'to' && from ? parseServerDate(from) ?? undefined : undefined}
              onChange={(_, d) => {
                if (d) {
                  pick(picking, toDateKey(d));
                  setPicking(null);
                }
              }}
            />
          ) : null}
        </View>
        {fact && !error ? (
          <View style={{flexDirection: 'row', gap: 10}}>
            <fact.icon size={16} color={fact.color} style={{marginTop: 2}} />
            <Text style={{flex: 1}} color={fact.color}>
              {fact.text}
            </Text>
          </View>
        ) : error ? (
          <View style={{flexDirection: 'row', gap: 10}}>
            <CircleAlert size={16} color={colors.danger} style={{marginTop: 2}} />
            <Text style={{flex: 1}} tone="danger">
              {error}
            </Text>
          </View>
        ) : null}
        <TextField
          label="Reason"
          placeholder="Optional, but it helps your manager"
          value={reason}
          onChangeText={setReason}
          maxLength={250}
        />
        <Button
          title="Send request"
          icon={Send}
          loading={sending}
          disabled={!typeId || !from || !to || !!error}
          onPress={() => typeId && onSend({typeId, from, to, reason: reason.trim()})}
        />
      </View>
    </BottomSheet>
  );
}
