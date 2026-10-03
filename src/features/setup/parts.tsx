import React, {useState} from 'react';
import {Platform, Pressable, RefreshControl, ScrollView, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import DateTimePicker, {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import {ArrowLeft, Check, CircleAlert, Plus, type LucideIcon} from 'lucide-react-native';
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  PressableScale,
  Screen,
  Skeleton,
  Text,
} from '../../components/ui';
import {atClock, formatClock, formatDay, parseServerDate, toDateKey, weekdayShort} from '../../lib/date';
import {haptics} from '../../lib/haptics';
import {useTheme} from '../../theme/ThemeProvider';
import {daysLabel, WEEK} from './setupLogic';

type QueryLike = {
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  isRefetching: boolean;
  refetch: () => unknown;
};

/** Back button, title, optional Add, pull to refresh, and loading / error states. */
export function SetupScreen({
  title,
  subtitle,
  onAdd,
  addLabel = 'Add',
  action,
  query,
  children,
}: {
  title: string;
  subtitle?: string | null;
  onAdd?: () => void;
  addLabel?: string;
  /** Extra header control, shown before Add. */
  action?: React.ReactNode;
  query?: QueryLike;
  children: React.ReactNode;
}) {
  const navigation = useNavigation();
  const {colors, spacing, radius} = useTheme();
  return (
    <Screen
      scroll
      contentStyle={{paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl}}
      refreshControl={
        query ? (
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => {
              query.refetch();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm}}>
        <IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <View style={{flex: 1}}>
          <Text variant="h2">{title}</Text>
          {subtitle ? (
            <Text variant="caption" tone="muted">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {action}
        {onAdd ? <Button title={addLabel} icon={Plus} size="sm" fullWidth={false} onPress={onAdd} /> : null}
      </View>
      <View style={{marginTop: spacing.lg, gap: spacing.md}}>
        {query?.isPending ? (
          <>
            <Skeleton height={84} radius={radius.lg} />
            <Skeleton height={84} radius={radius.lg} />
          </>
        ) : query?.isError ? (
          <EmptyState
            icon={CircleAlert}
            title="Couldn't load this"
            message={query.error?.message}
            action={<Button title="Try again" size="sm" fullWidth={false} onPress={() => query.refetch()} />}
          />
        ) : (
          children
        )}
      </View>
    </Screen>
  );
}

export function Tag({label, fg, bg, icon: Icon}: {label: string; fg: string; bg: string; icon?: LucideIcon}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        height: 24,
        paddingHorizontal: 9,
        borderRadius: 12,
        backgroundColor: bg,
        alignSelf: 'flex-start',
      }}>
      {Icon ? <Icon size={13} color={fg} /> : null}
      <Text variant="caption" color={fg} style={{fontFamily: 'PlusJakartaSans-Bold'}}>
        {label}
      </Text>
    </View>
  );
}

export function IconWell({
  icon: Icon,
  fg,
  bg,
  size = 40,
}: {
  icon: LucideIcon;
  fg: string;
  bg: string;
  size?: number;
}) {
  const {radius} = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.md,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon size={size / 2} color={fg} />
    </View>
  );
}

/** Read-only Mon–Sun strip: working days filled, days off outlined. */
export function WeekStrip({days}: {days: boolean[]}) {
  const {colors} = useTheme();
  return (
    <View accessible accessibilityLabel={`Works ${daysLabel(days)}`} style={{flexDirection: 'row', gap: 4}}>
      {WEEK.map((d, i) => (
        <View
          key={d}
          style={{
            flex: 1,
            height: 30,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: days[i] ? colors.primarySoft : colors.surface,
            borderWidth: 1,
            borderColor: days[i] ? colors.primarySoft : colors.border,
          }}>
          <Text
            variant="caption"
            color={days[i] ? colors.primary : colors.textSubtle}
            style={{fontFamily: 'PlusJakartaSans-Bold'}}>
            {d}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** All 7 days as full-name toggles, Monday first. */
export function DayToggles({days, onChange}: {days: boolean[]; onChange: (days: boolean[]) => void}) {
  const {colors} = useTheme();
  return (
    <View style={{flexDirection: 'row', gap: 5}}>
      {WEEK.map((d, i) => {
        const on = days[i];
        return (
          <Pressable
            key={d}
            onPress={() => {
              haptics.select();
              onChange(days.map((x, j) => (j === i ? !x : x)));
            }}
            accessibilityRole="checkbox"
            accessibilityState={{checked: on}}
            accessibilityLabel={d}
            style={{
              flex: 1,
              alignItems: 'center',
              gap: 4,
              paddingVertical: 10,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: on ? colors.primary : colors.border,
              backgroundColor: on ? colors.primarySoft : colors.surface,
            }}>
            <Text variant="label" color={on ? colors.primary : colors.textMuted}>
              {d}
            </Text>
            <View
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                borderWidth: on ? 0 : 1.5,
                borderColor: colors.borderStrong,
                backgroundColor: on ? colors.primary : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              {on ? <Check size={11} color="#FFFFFF" strokeWidth={3} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const dayLabel = (key: string) => {
  const d = parseServerDate(key);
  if (!d) {
    return key;
  }
  const year = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${weekdayShort(d)}, ${formatDay(d)}${year}`;
};

const toHHmm = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** A tappable time; Android opens the clock dialog, iOS shows a wheel underneath. */
export function TimeField({
  label,
  value,
  onChange,
  icon: Icon,
  color,
}: {
  label: string;
  /** "HH:mm" */
  value: string;
  onChange: (value: string) => void;
  icon: LucideIcon;
  color: string;
}) {
  const {colors, spacing, radius} = useTheme();
  const [open, setOpen] = useState(false);
  const date = atClock('2026-01-01', value) ?? atClock('2026-01-01', '09:00')!;
  const press = () => {
    haptics.select();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'time',
        is24Hour: false,
        onChange: (event, d) => event.type === 'set' && d && onChange(toHHmm(d)),
      });
    } else {
      setOpen(o => !o);
    }
  };
  return (
    <View style={{flex: 1}}>
      <PressableScale
        onPress={press}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${formatClock(value)}`}
        style={{
          padding: spacing.md,
          borderRadius: radius.lg,
          borderWidth: open ? 1.5 : 1,
          borderColor: open ? colors.primary : colors.border,
        }}>
        <Icon size={16} color={color} />
        <Text variant="caption" tone="muted" style={{marginTop: 6}}>
          {label}
        </Text>
        <Text variant="h3">{formatClock(value)}</Text>
      </PressableScale>
      {open ? (
        <DateTimePicker
          value={date}
          mode="time"
          display="spinner"
          onChange={(_, d) => d && onChange(toHHmm(d))}
        />
      ) : null}
    </View>
  );
}

/** Pressable list row inside a card. */
export function SetupRow({
  icon,
  fg,
  bg,
  title,
  subtitle,
  value,
  warn,
  first,
  onPress,
}: {
  icon: LucideIcon;
  fg: string;
  bg: string;
  title: string;
  subtitle?: string | null;
  value?: string;
  warn?: boolean;
  first?: boolean;
  onPress: () => void;
}) {
  const {colors, spacing} = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      accessibilityRole="button"
      style={({pressed}) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.lg,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.border,
        opacity: pressed ? 0.6 : 1,
      })}>
      <IconWell icon={icon} fg={fg} bg={bg} />
      <View style={{flex: 1, minWidth: 0}}>
        <Text variant="title">{title}</Text>
        {subtitle ? (
          <Text
            variant="caption"
            color={warn ? colors.warning : colors.textMuted}
            numberOfLines={1}
            style={warn ? {fontFamily: 'PlusJakartaSans-SemiBold'} : undefined}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value != null ? <Text variant="h3">{value}</Text> : null}
    </Pressable>
  );
}

/** A date field; Android opens the calendar dialog, iOS shows an inline calendar. */
export function DateButton({
  label,
  value,
  onChange,
  min,
  max,
  placeholder,
}: {
  label: string;
  /** yyyy-MM-dd, or '' when not set (shows the placeholder). */
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
}) {
  const {colors, spacing, radius} = useTheme();
  const [open, setOpen] = useState(false);
  const date = parseServerDate(value) ?? parseServerDate(max ?? '') ?? new Date();
  const minDate = min ? parseServerDate(min) ?? undefined : undefined;
  const maxDate = max ? parseServerDate(max) ?? undefined : undefined;
  const press = () => {
    haptics.select();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        minimumDate: minDate,
        maximumDate: maxDate,
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
        accessibilityLabel={`${label}, ${value ? dayLabel(value) : placeholder ?? 'not set'}`}
        style={{
          marginTop: 6,
          height: 50,
          paddingHorizontal: 14,
          borderRadius: radius.lg,
          borderWidth: open ? 1.5 : 1,
          borderColor: open ? colors.primary : colors.borderStrong,
          justifyContent: 'center',
        }}>
        <Text variant="body" color={value ? colors.text : colors.textSubtle}>
          {value ? dayLabel(value) : placeholder ?? 'Pick a date'}
        </Text>
      </PressableScale>
      {open ? (
        <View style={{marginTop: spacing.sm}}>
          <DateTimePicker
            value={date}
            mode="date"
            display="inline"
            minimumDate={minDate}
            maximumDate={maxDate}
            onChange={(_, d) => d && onChange(toDateKey(d))}
          />
        </View>
      ) : null}
    </View>
  );
}

/** One-of-many chips; wraps by default, or scrolls sideways for long lists. */
export function ChoiceChips<T extends string | number>({
  label,
  items,
  value,
  onChange,
  scroll,
}: {
  label?: string;
  items: {value: T; label: string}[];
  value: T | null;
  onChange: (value: T) => void;
  scroll?: boolean;
}) {
  const {colors, spacing} = useTheme();
  const chips = items.map(i => {
    const on = i.value === value;
    return (
      <PressableScale
        key={String(i.value)}
        onPress={() => {
          haptics.select();
          onChange(i.value);
        }}
        accessibilityRole="radio"
        accessibilityState={{checked: on}}
        style={{
          height: 38,
          paddingHorizontal: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: on ? colors.primary : colors.border,
          backgroundColor: on ? colors.primarySoft : colors.surface,
          justifyContent: 'center',
        }}>
        <Text variant="label" color={on ? colors.primary : colors.textMuted}>
          {i.label}
        </Text>
      </PressableScale>
    );
  });
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label}>
      {label ? (
        <Text variant="label" style={{marginBottom: spacing.sm}}>
          {label}
        </Text>
      ) : null}
      {scroll ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{flexGrow: 0}}
          contentContainerStyle={{gap: spacing.sm}}>
          {chips}
        </ScrollView>
      ) : (
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm}}>{chips}</View>
      )}
    </View>
  );
}

/** A titled card section for long forms. */
export function FormSection({title, children}: {title: string; children: React.ReactNode}) {
  const {spacing} = useTheme();
  return (
    <Card style={{gap: spacing.md}}>
      <Text variant="overline" tone="muted">
        {title}
      </Text>
      {children}
    </Card>
  );
}
