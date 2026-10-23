import React, {useState} from 'react';
import {Linking, View} from 'react-native';
import Animated, {FadeInDown, ReduceMotion} from 'react-native-reanimated';
import {Palmtree, Phone, Search} from 'lucide-react-native';
import {Avatar, Badge, Card, EmptyState, IconButton, Text, TextField} from '../../../components/ui';
import {formatRange, parseServerDate} from '../../../lib/date';
import type {AppScreenProps} from '../../../navigation/types';
import {useSession} from '../../../store/session';
import {useTheme} from '../../../theme/ThemeProvider';
import {SetupScreen} from '../../setup/parts';
import {useCompanyDashboard, useEmployeeDashboard} from '../queries';

/** Days of leave left after today ("Back tomorrow", "3 more days"). */
function backLabel(to: string) {
  const end = parseServerDate(to);
  if (!end) {
    return null;
  }
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  if (days <= 0) {
    return 'Back tomorrow';
  }
  return `${days} more day${days === 1 ? '' : 's'}`;
}

/** Everyone away today, from the dashboard (the same list as the Home strip). */
export function OnLeaveScreen(_: AppScreenProps<'OnLeave'>) {
  const {colors, spacing} = useTheme();
  const isCompany = useSession(s => s.role) === 'company';
  const company = useCompanyDashboard();
  const employee = useEmployeeDashboard();
  const query = isCompany ? company : employee;
  const all = (isCompany ? company.data?.employeesOnLeave : employee.data?.employeesOnLeave) ?? [];
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const list = all.filter(e => !term || (e.employee_basic_info?.name ?? '').toLowerCase().includes(term));

  return (
    <SetupScreen
      title="On leave today"
      subtitle={all.length ? `${all.length} away` : 'Everyone is in'}
      query={query}>
      {all.length > 6 ? (
        <TextField icon={Search} placeholder="Search people" value={q} onChangeText={setQ} />
      ) : null}
      {list.length ? (
        <Card padded={false}>
          {list.map((e, i) => {
            const person = e.employee_basic_info;
            const phone = (person?.phone ?? '').replace(/\D/g, '').slice(-10);
            const back = backLabel(e.to_date);
            return (
              <Animated.View
                key={e.id}
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
                <Avatar name={person?.name} uri={person?.image} size={44} />
                <View style={{flex: 1, minWidth: 0, gap: 2}}>
                  <Text variant="title" numberOfLines={1}>
                    {person?.name ?? 'Employee'}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {formatRange(e.from_date, e.to_date)}
                    {back ? ` · ${back}` : ''}
                  </Text>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2}}>
                    <Badge label={e.leave_type || 'On leave'} tone="info" />
                    {e.reason ? (
                      <Text variant="caption" tone="subtle" numberOfLines={1} style={{flex: 1}}>
                        “{e.reason}”
                      </Text>
                    ) : null}
                  </View>
                </View>
                {isCompany && phone.length === 10 ? (
                  <IconButton
                    icon={Phone}
                    size={38}
                    accessibilityLabel={`Call ${person?.name ?? 'employee'}`}
                    onPress={() => Linking.openURL(`tel:${phone}`).catch(() => {})}
                  />
                ) : null}
              </Animated.View>
            );
          })}
        </Card>
      ) : (
        <Card>
          <EmptyState
            compact
            icon={Palmtree}
            title={term ? 'Nobody matches' : 'Everyone’s in today'}
            message={term ? `No one on leave matches “${q}”.` : 'No one is on leave today.'}
          />
        </Card>
      )}
    </SetupScreen>
  );
}
