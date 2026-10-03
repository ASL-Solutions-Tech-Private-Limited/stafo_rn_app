import React, {useEffect, useState} from 'react';
import {View} from 'react-native';
import {Info, LogOut, Send} from 'lucide-react-native';
import type {ShiftWithDays} from '../../api/types';
import {BottomSheet, Button, Text, TextField} from '../../components/ui';
import {formatClock, formatDay, parseServerDate, weekdayShort} from '../../lib/date';
import {useTheme} from '../../theme/ThemeProvider';
import {TimeField} from '../setup/parts';
import {punchOutTimeError, suggestedPunchOut} from './punchFix';

type Props = {
  visible: boolean;
  onClose: () => void;
  dateKey: string;
  inTime?: string | null;
  shift?: ShiftWithDays | null;
  sending: boolean;
  onSend: (punchOutHHmm: string, reason: string) => void;
};

/** Ask the manager to add a forgotten punch-out: the time they left and why. */
export function AskPunchOutSheet({visible, onClose, dateKey, inTime, shift, sending, onSend}: Props) {
  const {colors, spacing} = useTheme();
  const [time, setTime] = useState(() => suggestedPunchOut(dateKey, inTime, shift));
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (visible) {
      setTime(suggestedPunchOut(dateKey, inTime, shift));
      setReason('');
      setTried(false);
    }
  }, [visible, dateKey, inTime, shift]);

  const date = parseServerDate(dateKey);
  const timeError = punchOutTimeError(dateKey, inTime, time);
  const reasonError = reason.trim().length < 3 ? 'Say briefly why you missed it.' : null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={`${date ? `${weekdayShort(date)}, ${formatDay(date)}` : dateKey} · no punch-out`}
      subtitle={`Punched in at ${formatClock(inTime)}. Ask for your punch-out to be added.`}>
      <View style={{gap: spacing.md}}>
        <View>
          <TimeField label="You left at" value={time} onChange={setTime} icon={LogOut} color={colors.danger} />
          {timeError ? (
            <Text variant="caption" tone="danger" style={{marginTop: 4}}>
              {timeError}
            </Text>
          ) : null}
        </View>
        <TextField
          label="Reason"
          placeholder="e.g. Phone died before punch-out"
          value={reason}
          onChangeText={setReason}
          maxLength={200}
          error={tried ? reasonError : null}
        />
        <View style={{flexDirection: 'row', gap: 10}}>
          <Info size={16} color={colors.textMuted} style={{marginTop: 2}} />
          <Text tone="muted" style={{flex: 1}}>
            You can ask for yesterday and the 2 working days before it. Today isn’t editable.
          </Text>
        </View>
        <Button
          title="Send to manager"
          icon={Send}
          loading={sending}
          disabled={!!timeError}
          onPress={() => {
            setTried(true);
            if (!timeError && !reasonError) {
              onSend(time, reason.trim());
            }
          }}
        />
      </View>
    </BottomSheet>
  );
}
