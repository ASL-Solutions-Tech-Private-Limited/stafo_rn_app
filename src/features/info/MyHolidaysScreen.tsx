import React, {useMemo, useState} from 'react';
import {View} from 'react-native';
import {CalendarDays} from 'lucide-react-native';
import type {Holiday, ShiftWithDays} from '../../api/types';
import {Card, EmptyState, Gradient, Text} from '../../components/ui';
import {formatDay, parseServerDate, weekdayShort} from '../../lib/date';
import {useTheme} from '../../theme/ThemeProvider';
import {useEmployeeDashboard} from '../home/queries';
import {ChoiceChips, SetupScreen, Tag} from '../setup/parts';
import {useHolidays} from '../setup/queries';
import {
  daysUntil,
  holidayDays,
  holidayOnWeekOff,
  holidaysInYear,
  splitHolidays,
  untilLabel,
} from '../setup/setupLogic';

const dayLabel = (key: string) => {
  const d = parseServerDate(key);
  return d ? `${weekdayShort(d)}, ${formatDay(d)}` : key;
};
const when = (h: Holiday) => {
  const n = holidayDays(h);
  return n > 1 ? `${dayLabel(h.start_date)} – ${dayLabel(h.end_date)} · ${n} days` : dayLabel(h.start_date);
};

/** The company's holidays for the employee: the next one up top, then the year. */
export function MyHolidaysScreen() {
  const {colors, spacing} = useTheme();
  const holidays = useHolidays();
  const shift = useEmployeeDashboard().data?.employee_info?.shifts?.[0] as ShiftWithDays | undefined;
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);

  const all = useMemo(() => holidays.data ?? [], [holidays.data]);
  const years = useMemo(() => {
    const set = new Set(all.map(h => Number(h.start_date.slice(0, 4))).filter(Boolean));
    set.add(thisYear);
    return [...set].sort();
  }, [all, thisYear]);
  const next = splitHolidays(all).upcoming[0];
  const {upcoming, past} = splitHolidays(holidaysInYear(all, year));

  const row = (h: Holiday, i: number, isPast: boolean) => {
    const color = h.festival_data?.color ?? colors.primary;
    const weekOff = holidayOnWeekOff(h, shift);
    const days = daysUntil(h);
    return (
      <View
        key={h.id}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.md,
          borderTopWidth: i ? 1 : 0,
          borderTopColor: colors.border,
          opacity: isPast ? 0.55 : 1,
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
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {when(h)}
            {h.festival_data?.category ? ` · ${h.festival_data.category}` : ''}
          </Text>
        </View>
        {isPast ? null : weekOff ? (
          <Tag label={weekOff} fg={colors.textMuted} bg={colors.surfaceMuted} />
        ) : days <= 30 ? (
          <Tag label={untilLabel(days)} fg={colors.primary} bg={colors.primarySoft} />
        ) : null}
      </View>
    );
  };

  return (
    <SetupScreen title="Holidays" subtitle={String(year)} query={holidays}>
      {!all.length && !holidays.isPending ? (
        <Card>
          <EmptyState
            compact
            icon={CalendarDays}
            title="No holidays yet"
            message="Your company hasn’t added its holidays yet."
          />
        </Card>
      ) : (
        <View style={{gap: spacing.lg}}>
          {next ? (
            <Gradient
              from={next.festival_data?.color ?? colors.primary}
              to={colors.heroTo}
              decorated
              style={{borderRadius: 24, padding: spacing.xl}}>
              <Text variant="overline" color="rgba(255,255,255,0.8)">
                Next holiday
              </Text>
              <View
                style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm}}>
                {next.festival_data?.emoji ? (
                  <Text style={{fontSize: 44, lineHeight: 52}}>{next.festival_data.emoji}</Text>
                ) : null}
                <View style={{flex: 1}}>
                  <Text variant="h2" color="#FFFFFF">
                    {next.title}
                  </Text>
                  <Text color="rgba(255,255,255,0.85)">
                    {when(next)}
                    {next.festival_data?.category ? ` · ${next.festival_data.category}` : ''}
                  </Text>
                </View>
              </View>
              <View
                style={{
                  alignSelf: 'flex-start',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: spacing.md,
                  height: 30,
                  paddingHorizontal: 12,
                  borderRadius: 15,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                }}>
                <CalendarDays size={15} color="#FFFFFF" />
                <Text variant="label" color="#FFFFFF">
                  {untilLabel(daysUntil(next))}
                  {holidayOnWeekOff(next, shift) ? ` · on your ${holidayOnWeekOff(next, shift)} off` : ''}
                </Text>
              </View>
            </Gradient>
          ) : null}

          {years.length > 1 ? (
            <ChoiceChips
              items={years.map(y => ({value: y, label: String(y)}))}
              value={year}
              onChange={setYear}
            />
          ) : null}

          {upcoming.length || past.length ? (
            <Card>
              {upcoming.length ? (
                <>
                  <Text variant="overline" tone="muted">
                    {year === thisYear ? 'Coming up' : 'Holidays'}
                  </Text>
                  {upcoming.map((h, i) => row(h, i, false))}
                </>
              ) : null}
              {past.length ? (
                <>
                  <Text variant="overline" tone="muted" style={{marginTop: upcoming.length ? spacing.md : 0}}>
                    {year === thisYear ? 'Earlier this year' : 'Holidays'}
                  </Text>
                  {past.map((h, i) => row(h, i, true))}
                </>
              ) : null}
            </Card>
          ) : (
            <Card>
              <EmptyState
                compact
                icon={CalendarDays}
                title={`No holidays in ${year}`}
                message="Pick another year."
              />
            </Card>
          )}
          {shift && all.some(h => holidayOnWeekOff(h, shift)) ? (
            <Text variant="caption" tone="subtle">
              A weekday tag marks a holiday on your week-off, so it doesn’t give an extra day.
            </Text>
          ) : null}
        </View>
      )}
    </SetupScreen>
  );
}
