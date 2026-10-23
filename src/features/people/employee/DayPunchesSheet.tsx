import React from 'react';
import {View} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import Animated, {FadeInDown, ReduceMotion} from 'react-native-reanimated';
import {ArrowRight, Fingerprint, Timer} from 'lucide-react-native';
import {getDayPunches} from '../../../api/endpoints/employee';
import {BottomSheet, Card, EmptyState, Skeleton, Text} from '../../../components/ui';
import {formatDay, formatDuration, formatTime, parseServerDate, weekdayShort} from '../../../lib/date';
import {useTheme} from '../../../theme/ThemeProvider';
import {sessionMs} from '../dayPunches';

const at = (v: string | null) => (v ? parseServerDate(v) : null);

/** Every punch-in and punch-out of one day, as sessions. */
export function DayPunchesSheet({
  employeeId,
  dateKey,
  onClose,
}: {
  employeeId: number;
  dateKey: string | null;
  onClose: () => void;
}) {
  const {colors, spacing, radius} = useTheme();
  const punches = useQuery({
    queryKey: ['day-punches', employeeId, dateKey],
    queryFn: () => getDayPunches(employeeId, dateKey!),
    enabled: !!dateKey,
  });
  const list = punches.data ?? [];
  const total = list.reduce((sum, p) => sum + sessionMs(p), 0);
  const day = dateKey ? parseServerDate(dateKey) : null;

  return (
    <BottomSheet
      visible={!!dateKey}
      onClose={onClose}
      title={day ? `${weekdayShort(day)}, ${formatDay(day)}` : ''}
      subtitle={
        list.length
          ? `${list.length} punch${list.length === 1 ? '' : 'es'} · ${formatDuration(total)} worked`
          : 'All punches'
      }>
      {punches.isPending ? (
        <View style={{gap: spacing.sm}}>
          <Skeleton height={64} radius={radius.lg} />
          <Skeleton height={64} radius={radius.lg} />
        </View>
      ) : !list.length ? (
        <EmptyState
          compact
          icon={Fingerprint}
          title="No punches"
          message="Nothing was recorded on this day."
        />
      ) : (
        <View style={{gap: spacing.sm}}>
          {list.map((p, i) => {
            const inAt = at(p.punchIn);
            const outAt = at(p.punchOut);
            const open = !outAt;
            const ms = sessionMs(p);
            return (
              <Animated.View
                key={p.id}
                entering={FadeInDown.delay(i * 50)
                  .duration(260)
                  .reduceMotion(ReduceMotion.System)}>
                <Card
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    paddingVertical: spacing.md,
                  }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: colors.primarySoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Text variant="label" tone="primary">
                      {i + 1}
                    </Text>
                  </View>
                  <View style={{flex: 1, gap: 2}}>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm}}>
                      <Text variant="title" color={colors.success}>
                        {inAt ? formatTime(inAt) : '—'}
                      </Text>
                      <ArrowRight size={14} color={colors.textSubtle} />
                      <Text variant="title" color={open ? colors.warning : colors.danger}>
                        {outAt ? formatTime(outAt) : 'Still in'}
                      </Text>
                    </View>
                    <Text variant="caption" tone="muted">
                      {open
                        ? inAt && inAt.toDateString() === new Date().toDateString()
                          ? `In for ${formatDuration(ms)} so far`
                          : 'No punch-out recorded'
                        : `Session ${formatDuration(ms)}`}
                    </Text>
                  </View>
                </Card>
              </Animated.View>
            );
          })}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: colors.primarySoft,
            }}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm}}>
              <Timer size={16} color={colors.primary} />
              <Text variant="label" tone="primary">
                Total worked
              </Text>
            </View>
            <Text variant="title" tone="primary">
              {formatDuration(total)}
            </Text>
          </View>
        </View>
      )}
    </BottomSheet>
  );
}
