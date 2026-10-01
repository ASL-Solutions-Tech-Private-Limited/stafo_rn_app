import React, {useEffect} from 'react';
import {View} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, {Circle} from 'react-native-svg';
import {ChevronRight} from 'lucide-react-native';
import {Card, Skeleton, Text} from '../../../components/ui';
import {useCountUp} from '../../../lib/useCountUp';
import {useTheme} from '../../../theme/ThemeProvider';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  total?: number;
  /** Punched in today (working or done). */
  present?: number;
  /** Shift hasn't ended yet and no punch so far. */
  notIn?: number;
  absent?: number;
  onLeave?: number;
  loading?: boolean;
  onPress?: () => void;
};

const SIZE = 104;
const STROKE = 12;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

function CountUp({value, variant}: {value: number; variant: 'h2' | 'h3'}) {
  const shown = useCountUp(value);
  return <Text variant={variant}>{shown}</Text>;
}

export function AttendanceSummaryCard({
  total = 0,
  present = 0,
  notIn = 0,
  absent = 0,
  onLeave = 0,
  loading,
  onPress,
}: Props) {
  const {colors, spacing, shadows, dark} = useTheme();

  const pct = total > 0 ? present / total : 0;
  const pctShown = useCountUp(Math.round(pct * 100));

  // The ring sweeps from empty to today's percentage.
  const progress = useSharedValue(0);
  useEffect(() => {
    if (!loading) {
      progress.value = withTiming(pct, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      });
    }
  }, [loading, pct, progress]);
  const ringProps = useAnimatedProps(() => ({strokeDashoffset: CIRCUMFERENCE * (1 - progress.value)}));

  if (loading) {
    return (
      <Card style={[{flexDirection: 'row', gap: spacing.xl, alignItems: 'center'}, !dark && shadows.raised]}>
        <Skeleton width={SIZE} height={SIZE} radius={SIZE / 2} />
        <View style={{flex: 1, gap: spacing.md}}>
          <Skeleton width={120} height={16} />
          <Skeleton height={12} />
          <Skeleton height={12} />
          <Skeleton height={12} />
        </View>
      </Card>
    );
  }

  const rows = [
    {label: 'Present', value: present, color: colors.success},
    {label: 'Not in yet', value: notIn, color: colors.borderStrong},
    {label: 'Absent', value: absent, color: colors.danger},
    {label: 'On leave', value: onLeave, color: colors.warning},
  ];

  return (
    <Card onPress={onPress} style={!dark && shadows.raised}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
        <Text variant="overline" tone="muted">
          Today's attendance
        </Text>
        {onPress && <ChevronRight size={18} color={colors.textSubtle} />}
      </View>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.xl, marginTop: spacing.md}}>
        <View
          style={{width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center'}}
          accessibilityLabel={`${Math.round(pct * 100)} percent present, ${present} of ${total}`}>
          <Svg width={SIZE} height={SIZE} style={{position: 'absolute', transform: [{rotate: '-90deg'}]}}>
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              stroke={colors.surfaceMuted}
              strokeWidth={STROKE}
              fill="none"
            />
            <AnimatedCircle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              stroke={colors.success}
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              animatedProps={ringProps}
            />
          </Svg>
          <Text variant="h2">{pctShown}%</Text>
          <Text variant="caption" tone="muted">
            of {total}
          </Text>
        </View>
        <View style={{flex: 1, gap: spacing.md}}>
          {rows.map(row => (
            <View key={row.label} style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm}}>
              <View style={{width: 10, height: 10, borderRadius: 3, backgroundColor: row.color}} />
              <Text variant="body" tone="muted" style={{flex: 1}}>
                {row.label}
              </Text>
              <CountUp value={row.value} variant="h3" />
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
}
