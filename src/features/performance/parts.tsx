import React, {useEffect, useState} from 'react';
import {View} from 'react-native';
import {Check, ChevronLeft, ChevronRight} from 'lucide-react-native';
import {BottomSheet, Button, Card, PressableScale, Skeleton, Text, TextField} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import {useTheme} from '../../theme/ThemeProvider';
import {isFuture, monthLabel, pointsError, QUICK_POINTS, stepMonth, type Month} from './performanceLogic';
import {useSaveScores, useScores, useScoringTypes} from './queries';

/** ‹ July 2025 › — can't go past this month. */
export function MonthStepper({
  value,
  onChange,
  caption,
}: {
  value: Month;
  onChange: (m: Month) => void;
  caption?: string;
}) {
  const {colors, spacing} = useTheme();
  const next = stepMonth(value, 1);
  const atEnd = isFuture(next);
  const arrow = (dir: -1 | 1) => {
    const disabled = dir === 1 && atEnd;
    const Icon = dir === -1 ? ChevronLeft : ChevronRight;
    return (
      <PressableScale
        onPress={
          disabled
            ? undefined
            : () => {
                haptics.select();
                onChange(stepMonth(value, dir));
              }
        }
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={dir === -1 ? 'Previous month' : 'Next month'}
        accessibilityState={{disabled}}
        hitSlop={8}
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.4 : 1,
        }}>
        <Icon size={18} color={colors.text} />
      </PressableScale>
    );
  };
  return (
    <Card style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 10}}>
      {arrow(-1)}
      <View style={{flex: 1, alignItems: 'center'}}>
        <Text variant="title">{monthLabel(value)}</Text>
        {caption ? (
          <Text variant="caption" tone="muted">
            {caption}
          </Text>
        ) : null}
      </View>
      {arrow(1)}
    </Card>
  );
}

/** Score one person for a month, one row per scoring type. */
export function ScoreSheet({
  person,
  month,
  onClose,
}: {
  person: {id: number; name: string} | null;
  month: Month;
  onClose: () => void;
}) {
  const {colors, spacing} = useTheme();
  const types = useScoringTypes();
  const current = useScores(person?.id ?? null, month);
  const save = useSaveScores();
  const [values, setValues] = useState<Record<number, string>>({});
  const [tried, setTried] = useState(false);
  const [shown, setShown] = useState(person);

  useEffect(() => {
    if (person) {
      setShown(person);
      setTried(false);
    }
  }, [person]);

  // Fill in what they already have once it arrives.
  useEffect(() => {
    if (!person || !types.data || current.isPending) {
      return;
    }
    const had = new Map((current.data ?? []).map(s => [s.performance_type_id, String(Number(s.marks) || 0)]));
    setValues(Object.fromEntries(types.data.map(t => [t.id, had.get(t.id) ?? ''])));
  }, [person, types.data, current.data, current.isPending]);

  const list = types.data ?? [];
  const errors = Object.fromEntries(list.map(t => [t.id, pointsError(values[t.id] ?? '')]));
  const hasError = Object.values(errors).some(Boolean);
  const total = list.reduce((s, t) => s + (Number(values[t.id]) || 0), 0);
  const loading = types.isPending || current.isPending;

  const submit = () => {
    setTried(true);
    if (hasError || !shown || save.isPending) {
      haptics.error();
      return;
    }
    save.mutate(
      {
        employeeId: shown.id,
        name: shown.name,
        month,
        points: Object.fromEntries(list.map(t => [t.id, Number(values[t.id])])),
      },
      {onSuccess: onClose},
    );
  };

  return (
    <BottomSheet
      visible={!!person}
      onClose={onClose}
      title={shown ? `Score ${shown.name}` : 'Score'}
      subtitle={monthLabel(month)}>
      {loading ? (
        <View style={{gap: spacing.md}}>
          <Skeleton height={86} radius={16} />
          <Skeleton height={86} radius={16} />
        </View>
      ) : !list.length ? (
        <Text variant="body" tone="muted">
          Add a scoring type first, like Punctuality or Sales target.
        </Text>
      ) : (
        <View style={{gap: spacing.lg}}>
          {list.map(t => {
            const v = values[t.id] ?? '';
            return (
              <View key={t.id} style={{gap: 6}}>
                <View style={{flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm}}>
                  <Text variant="label" style={{flex: 1}} numberOfLines={1}>
                    {t.name.trim()}
                  </Text>
                  {t.description?.trim() ? (
                    <Text variant="caption" tone="muted" numberOfLines={1} style={{flexShrink: 1}}>
                      {t.description.trim()}
                    </Text>
                  ) : null}
                </View>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                  {QUICK_POINTS.map(q => {
                    const on = v === String(q);
                    return (
                      <PressableScale
                        key={q}
                        onPress={() => {
                          haptics.select();
                          setValues(prev => ({...prev, [t.id]: String(q)}));
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{checked: on}}
                        accessibilityLabel={`${q} points`}
                        style={{
                          flex: 1,
                          height: 36,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: on ? colors.primary : colors.border,
                          backgroundColor: on ? colors.primarySoft : colors.surface,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Text variant="label" color={on ? colors.primary : colors.textMuted}>
                          {q}
                        </Text>
                      </PressableScale>
                    );
                  })}
                  <TextField
                    value={v}
                    onChangeText={x => setValues(prev => ({...prev, [t.id]: x.replace(/\D/g, '')}))}
                    keyboardType="number-pad"
                    maxLength={4}
                    placeholder="–"
                    accessibilityLabel={`${t.name} score`}
                    containerStyle={{width: 64}}
                    error={tried && errors[t.id] ? ' ' : null}
                  />
                </View>
                {tried && errors[t.id] ? (
                  <Text variant="caption" tone="danger">
                    {errors[t.id]}
                  </Text>
                ) : null}
              </View>
            );
          })}
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline'}}>
            <Text variant="body" tone="muted">
              Total this month
            </Text>
            <Text variant="h2">{total} pts</Text>
          </View>
          <Button title="Save scores" icon={Check} loading={save.isPending} onPress={submit} />
        </View>
      )}
    </BottomSheet>
  );
}
