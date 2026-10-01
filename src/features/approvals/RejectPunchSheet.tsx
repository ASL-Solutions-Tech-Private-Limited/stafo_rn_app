import React, {useEffect, useState} from 'react';
import {View} from 'react-native';
import {Hourglass, UserX} from 'lucide-react-native';
import type {RejectedPunchMark} from '../../api/endpoints/employee';
import {BottomSheet, Button, PressableScale, Text, TextField} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import {useTheme} from '../../theme/ThemeProvider';
import {RadioCard} from '../people/employee/sheets';

const QUICK_REASONS = ["Times don't match records", 'Too late to change', 'Talk to me first'];

/**
 * Rejecting a missed punch-out: the admin must say how the day is recorded
 * instead (absent or half day) and why. The employee sees the reason.
 */
export function RejectPunchSheet({
  visible,
  onClose,
  onClosed,
  firstName,
  dayLabel,
  loading,
  onReject,
}: {
  visible: boolean;
  onClose: () => void;
  onClosed?: () => void;
  firstName: string;
  /** e.g. "Mon, 29 Sep" */
  dayLabel: string;
  loading?: boolean;
  onReject: (markAs: RejectedPunchMark, reason: string) => void;
}) {
  const {colors, spacing} = useTheme();
  const [markAs, setMarkAs] = useState<RejectedPunchMark | null>(null);
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (visible) {
      setMarkAs(null);
      setReason('');
    }
  }, [visible]);
  const ready = !!markAs && !!reason.trim();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      title={`Reject ${firstName}'s punch fix?`}
      subtitle={`Choose how ${dayLabel} is recorded instead. ${firstName} sees your reason in the app.`}>
      <Text variant="label" style={{marginBottom: spacing.sm}}>
        Mark the day as
      </Text>
      <View style={{gap: spacing.sm}} accessibilityRole="radiogroup">
        <RadioCard
          icon={UserX}
          title="Absent"
          description="The whole day counts as absent."
          selected={markAs === 'Absent'}
          onPress={() => setMarkAs('Absent')}
        />
        <RadioCard
          icon={Hourglass}
          title="Half day"
          description="Counts as half a day present."
          selected={markAs === 'Halfday'}
          onPress={() => setMarkAs('Halfday')}
        />
      </View>

      <View style={{marginTop: spacing.lg}}>
        <TextField
          label="Reason"
          placeholder="For example: CCTV shows leaving at 4:10 PM"
          value={reason}
          onChangeText={setReason}
          multiline
          style={{minHeight: 24}}
        />
      </View>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md}}>
        {QUICK_REASONS.map(r => (
          <PressableScale
            key={r}
            onPress={() => {
              haptics.select();
              setReason(r);
            }}
            accessibilityRole="button"
            style={{
              height: 34,
              paddingHorizontal: 12,
              borderRadius: 17,
              borderWidth: 1,
              borderColor: reason === r ? colors.primary : colors.border,
              backgroundColor: reason === r ? colors.primarySoft : colors.surface,
              justifyContent: 'center',
            }}>
            <Text variant="label" color={reason === r ? colors.primary : colors.text}>
              {r}
            </Text>
          </PressableScale>
        ))}
      </View>

      <Button
        title={
          markAs === 'Halfday'
            ? 'Reject · mark half day'
            : markAs === 'Absent'
            ? 'Reject · mark absent'
            : 'Reject'
        }
        variant="danger"
        style={{marginTop: spacing.xl}}
        disabled={!ready}
        loading={loading}
        onPress={() => markAs && onReject(markAs, reason.trim())}
      />
    </BottomSheet>
  );
}
