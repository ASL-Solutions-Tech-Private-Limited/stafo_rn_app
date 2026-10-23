import React from 'react';
import {ScrollView, View} from 'react-native';
import {Cake, PartyPopper, Palmtree} from 'lucide-react-native';
import type {AnniversaryEntry, BirthdayEntry, LeaveEntry} from '../../../api/types';
import {Avatar, Card, EmptyState, Text} from '../../../components/ui';
import {formatDay, formatRange, parseServerDate} from '../../../lib/date';
import {useTheme} from '../../../theme/ThemeProvider';

export function OnLeaveStrip({entries}: {entries: LeaveEntry[]}) {
  const {colors, spacing, radius} = useTheme();
  if (!entries.length) {
    return (
      <Card>
        <EmptyState
          compact
          icon={Palmtree}
          title="Everyone's in today"
          message="No one on your team is on leave."
        />
      </Card>
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{paddingHorizontal: spacing.lg, gap: spacing.md}}
      style={{marginHorizontal: -spacing.lg}}>
      {entries.map(entry => {
        const person = entry.employee_basic_info;
        return (
          <Card key={entry.id} style={{width: 168, padding: spacing.md}}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm}}>
              <Avatar name={person?.name} uri={person?.image} size={36} />
              <View style={{flex: 1}}>
                <Text variant="label" numberOfLines={1}>
                  {person?.name ?? 'Employee'}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {formatRange(entry.from_date, entry.to_date)}
                </Text>
              </View>
            </View>
            <View
              style={{
                marginTop: spacing.md,
                alignSelf: 'flex-start',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: radius.pill,
                backgroundColor: colors.warningSoft,
              }}>
              <Text variant="caption" tone="warning" numberOfLines={1}>
                {entry.leave_type || 'On leave'}
              </Text>
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}

export type Celebration = {
  key: string;
  name: string;
  image?: string | null;
  kind: 'birthday' | 'anniversary';
  detail: string;
  isToday: boolean;
};

/** "today" when day and month match, otherwise "3 Oct". */
function whenLabel(value?: string | null) {
  const d = parseServerDate(value);
  if (!d) {
    return null;
  }
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() ? 'today' : formatDay(d);
}

export function buildCelebrations(
  birthdays: BirthdayEntry[] | null | undefined,
  anniversaries: AnniversaryEntry[] | null | undefined,
): Celebration[] {
  return [
    ...(birthdays ?? []).map(b => {
      const when = whenLabel(b.date_of_birth);
      return {
        key: `b-${b.id}`,
        name: b.name,
        image: b.image,
        kind: 'birthday' as const,
        detail: when === 'today' ? 'Birthday today' : when ? `Birthday · ${when}` : 'Birthday',
        isToday: when === 'today',
      };
    }),
    ...(anniversaries ?? []).map(a => {
      const when = whenLabel(a.date_of_joining);
      // The milestone being celebrated this year, whether it's today or upcoming.
      const joined = parseServerDate(a.date_of_joining);
      const years = joined ? new Date().getFullYear() - joined.getFullYear() : null;
      const label = years && years > 0 ? `${years} yr${years > 1 ? 's' : ''} at work` : 'Work anniversary';
      return {
        key: `a-${a.id}`,
        name: a.name,
        image: a.image,
        kind: 'anniversary' as const,
        detail: when && when !== 'today' ? `${label} · ${when}` : label,
        isToday: when === 'today',
      };
    }),
  ];
}

export function CelebrationsStrip({items}: {items: Celebration[]}) {
  const {colors, spacing} = useTheme();
  if (!items.length) {
    return (
      <Card>
        <EmptyState
          compact
          icon={PartyPopper}
          title="No celebrations today"
          message="Birthdays and work anniversaries show up here."
        />
      </Card>
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{paddingHorizontal: spacing.lg, gap: spacing.md}}
      style={{marginHorizontal: -spacing.lg}}>
      {items.map(item => {
        const isBirthday = item.kind === 'birthday';
        const tint = isBirthday ? colors.accents[4] : colors.accents[1];
        const Icon = isBirthday ? Cake : PartyPopper;
        return (
          <Card key={item.key} style={{width: 140, alignItems: 'center', paddingVertical: spacing.lg}}>
            <View>
              <Avatar name={item.name} uri={item.image} size={56} />
              <View
                style={{
                  position: 'absolute',
                  right: -4,
                  bottom: -4,
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: tint.bg,
                  borderWidth: 2,
                  borderColor: colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Icon size={12} color={tint.fg} />
              </View>
            </View>
            <Text variant="label" align="center" numberOfLines={1} style={{marginTop: spacing.md}}>
              {item.name}
            </Text>
            <Text variant="caption" tone="muted" align="center" numberOfLines={1}>
              {item.detail}
            </Text>
          </Card>
        );
      })}
    </ScrollView>
  );
}
