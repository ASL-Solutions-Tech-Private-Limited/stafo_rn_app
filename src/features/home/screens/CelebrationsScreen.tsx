import React, {useState} from 'react';
import {View} from 'react-native';
import Animated, {FadeInDown, ReduceMotion} from 'react-native-reanimated';
import {Cake, PartyPopper} from 'lucide-react-native';
import {Avatar, Card, EmptyState, Text} from '../../../components/ui';
import type {AppScreenProps} from '../../../navigation/types';
import {useSession} from '../../../store/session';
import {useTheme} from '../../../theme/ThemeProvider';
import {ChoiceChips, SetupScreen} from '../../setup/parts';
import {buildCelebrations, type Celebration} from '../components/PeopleStrips';
import {useCompanyDashboard, useEmployeeDashboard} from '../queries';

type Filter = 'all' | 'birthday' | 'anniversary';

/** Every birthday and work anniversary from the dashboard: today first, then the rest. */
export function CelebrationsScreen(_: AppScreenProps<'Celebrations'>) {
  const {spacing} = useTheme();
  const isCompany = useSession(s => s.role) === 'company';
  const company = useCompanyDashboard();
  const employee = useEmployeeDashboard();
  const query = isCompany ? company : employee;
  const items = isCompany
    ? buildCelebrations(company.data?.birthday, company.data?.annyversary ?? company.data?.anniversary)
    : buildCelebrations(employee.data?.birthday, employee.data?.annyversary);
  const [filter, setFilter] = useState<Filter>('all');
  const shown = items.filter(i => filter === 'all' || i.kind === filter);
  const today = shown.filter(i => i.isToday);
  const later = shown.filter(i => !i.isToday);
  const count = (k: Exclude<Filter, 'all'>) => items.filter(i => i.kind === k).length;

  return (
    <SetupScreen title="Celebrations" subtitle="Birthdays and work anniversaries" query={query}>
      <ChoiceChips
        items={[
          {value: 'all', label: `All ${items.length}`},
          {value: 'birthday', label: `Birthdays ${count('birthday')}`},
          {value: 'anniversary', label: `Anniversaries ${count('anniversary')}`},
        ]}
        value={filter}
        onChange={v => setFilter(v as Filter)}
      />
      {!shown.length ? (
        <Card>
          <EmptyState
            compact
            icon={PartyPopper}
            title="Nothing to celebrate yet"
            message="Birthdays and work anniversaries show up here."
          />
        </Card>
      ) : null}
      {today.length ? <Group title="TODAY" items={today} /> : null}
      {later.length ? (
        <View style={{marginTop: today.length ? spacing.sm : 0}}>
          <Group title="COMING UP" items={later} />
        </View>
      ) : null}
    </SetupScreen>
  );
}

function Group({title, items}: {title: string; items: Celebration[]}) {
  const {colors, spacing} = useTheme();
  return (
    <View style={{gap: spacing.md}}>
      <Text variant="overline" tone="muted">
        {title}
      </Text>
      <Card padded={false}>
        {items.map((item, i) => {
          const isBirthday = item.kind === 'birthday';
          const tint = isBirthday ? colors.accents[4] : colors.accents[1];
          const Icon = isBirthday ? Cake : PartyPopper;
          return (
            <Animated.View
              key={item.key}
              entering={FadeInDown.delay(Math.min(i, 8) * 30)
                .duration(260)
                .reduceMotion(ReduceMotion.System)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.lg,
                borderTopWidth: i ? 1 : 0,
                borderTopColor: colors.border,
              }}>
              <Avatar name={item.name} uri={item.image} size={44} />
              <View style={{flex: 1, minWidth: 0}}>
                <Text variant="title" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {item.detail}
                </Text>
              </View>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: tint.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Icon size={16} color={tint.fg} />
              </View>
            </Animated.View>
          );
        })}
      </Card>
    </View>
  );
}
