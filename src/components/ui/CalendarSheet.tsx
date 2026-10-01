import React, {useEffect, useState} from 'react';
import {Pressable, View} from 'react-native';
import {ChevronLeft, ChevronRight} from 'lucide-react-native';
import {haptics} from '../../lib/haptics';
import {toDateKey} from '../../lib/date';
import {useTheme} from '../../theme/ThemeProvider';
import {BottomSheet} from './BottomSheet';
import {Button} from './Button';
import {IconButton} from './IconButton';
import {Text} from './Text';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type Props = {
  visible: boolean;
  value: string;
  onClose: () => void;
  onChange: (dateKey: string) => void;
  title?: string;
  /** Latest selectable date (yyyy-MM-dd). Defaults to today. */
  maxDate?: string;
};

/** Month-grid date picker in a bottom sheet. Values are yyyy-MM-dd strings. */
export function CalendarSheet({visible, value, onClose, onChange, title = 'Pick a date', maxDate}: Props) {
  const {colors, spacing, radius} = useTheme();
  const max = maxDate ?? toDateKey();
  const [year, month] = value.split('-').map(Number);
  const [cursor, setCursor] = useState({year, month: month - 1});

  useEffect(() => {
    if (visible) {
      setCursor({year, month: month - 1});
    }
  }, [visible, year, month]);

  const first = new Date(cursor.year, cursor.month, 1);
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({length: first.getDay()}, () => null),
    ...Array.from({length: daysInMonth}, (_, i) => i + 1),
  ];
  while (cells.length % 7) {
    cells.push(null);
  }

  const shift = (delta: number) => {
    haptics.select();
    setCursor(c => {
      const d = new Date(c.year, c.month + delta, 1);
      return {year: d.getFullYear(), month: d.getMonth()};
    });
  };
  const nextDisabled = toDateKey(new Date(cursor.year, cursor.month + 1, 1)) > max;
  const todayKey = toDateKey();

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
        <IconButton icon={ChevronLeft} size={38} accessibilityLabel="Previous month" onPress={() => shift(-1)} />
        <Text variant="h3">
          {MONTHS[cursor.month]} {cursor.year}
        </Text>
        <IconButton
          icon={ChevronRight}
          size={38}
          accessibilityLabel="Next month"
          onPress={nextDisabled ? undefined : () => shift(1)}
          style={nextDisabled ? {opacity: 0.35} : undefined}
        />
      </View>

      <View style={{flexDirection: 'row', marginTop: spacing.lg}}>
        {WEEK.map((d, i) => (
          <Text key={i} variant="caption" tone="subtle" align="center" style={{flex: 1}}>
            {d}
          </Text>
        ))}
      </View>

      <View style={{flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm}}>
        {cells.map((day, i) => {
          if (!day) {
            return <View key={i} style={{width: `${100 / 7}%`, height: 44}} />;
          }
          const key = toDateKey(new Date(cursor.year, cursor.month, day));
          const selected = key === value;
          const disabled = key > max;
          const isToday = key === todayKey;
          return (
            <Pressable
              key={i}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{selected, disabled}}
              accessibilityLabel={`${day} ${MONTHS[cursor.month]}`}
              onPress={() => {
                haptics.select();
                onChange(key);
                onClose();
              }}
              style={{width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center'}}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  alignItems: 'center',
                  justifyContent: 'center',
                  // Solid colours only: Android drops the radius when toggling from transparent.
                  backgroundColor: selected ? colors.primary : colors.surface,
                  borderWidth: isToday && !selected ? 1.5 : 0,
                  borderColor: colors.primary,
                }}>
                <Text
                  variant="label"
                  color={selected ? colors.textOnPrimary : disabled ? colors.textSubtle : colors.text}>
                  {day}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Button
        title="Jump to today"
        variant="secondary"
        size="md"
        style={{marginTop: spacing.lg, borderRadius: radius.lg}}
        onPress={() => {
          onChange(todayKey);
          onClose();
        }}
      />
    </BottomSheet>
  );
}
