import React from 'react';
import {Pressable, View} from 'react-native';
import {
  Building2,
  CalendarDays,
  CalendarOff,
  ChevronRight,
  Clock3,
  FileText,
  Network,
  TriangleAlert,
} from 'lucide-react-native';
import {Card, Text} from '../../components/ui';
import {formatDay, parseServerDate, weekdayShort} from '../../lib/date';
import type {AppScreenProps} from '../../navigation/types';
import {useSession} from '../../store/session';
import {useTheme} from '../../theme/ThemeProvider';
import {useBranches, useDepartments, useHolidays, useLeaveTypes, usePolicies, useShifts} from './queries';
import {SetupRow, SetupScreen} from './parts';
import {branchesNeedingFence, fenceStatus, splitHolidays} from './setupLogic';

const firstFew = (names: string[], n = 3) =>
  names.length <= n ? names.join(', ') : `${names.slice(0, n).join(', ')} and ${names.length - n} more`;

export function SetupHubScreen({navigation}: AppScreenProps<'Setup'>) {
  const {colors, spacing} = useTheme();
  const company = useSession(s => s.company);
  const branches = useBranches();
  const departments = useDepartments();
  const shifts = useShifts();
  const holidays = useHolidays();
  const leaveTypes = useLeaveTypes();
  const policies = usePolicies();

  const needFence = branchesNeedingFence(branches.data ?? []);
  const noFence = needFence.filter(b => fenceStatus(b).kind === 'none');
  const wide = needFence.filter(b => fenceStatus(b).kind === 'wide');
  const next = splitHolidays(holidays.data ?? []).upcoming[0];
  const nextDate = next ? parseServerDate(next.start_date) : null;
  const count = (n?: number) => (n == null ? '–' : String(n));

  return (
    <SetupScreen title="Company setup" subtitle={company?.company_name}>
      {needFence.length ? (
        <Pressable
          onPress={() => navigation.navigate('SetupBranches')}
          accessibilityRole="button"
          style={{
            flexDirection: 'row',
            gap: spacing.md,
            padding: spacing.lg,
            borderRadius: 16,
            backgroundColor: colors.warningSoft,
          }}>
          <TriangleAlert size={20} color={colors.warning} />
          <View style={{flex: 1}}>
            <Text variant="title">
              {needFence.length} of {branches.data!.length} branches don’t really check location
            </Text>
            <Text variant="caption" tone="muted">
              {[
                noFence.length
                  ? `${firstFew(
                      noFence.map(b => b.branch_name),
                      2,
                    )} ${noFence.length === 1 ? 'has' : 'have'} no geofence`
                  : null,
                wide.length
                  ? `${wide.length} allow${wide.length === 1 ? 's' : ''} punch-in from kilometres away`
                  : null,
              ]
                .filter(Boolean)
                .join('; ')}
              .
            </Text>
          </View>
          <ChevronRight size={18} color={colors.warning} />
        </Pressable>
      ) : null}

      <Text variant="overline" tone="muted" style={{marginTop: spacing.sm}}>
        Where and who
      </Text>
      <Card style={{padding: 0}}>
        <SetupRow
          first
          icon={Building2}
          fg={colors.primary}
          bg={colors.primarySoft}
          title="Branches"
          value={count(branches.data?.length)}
          subtitle={
            needFence.length ? `${needFence.length} need attention` : branches.data ? 'All geofenced' : null
          }
          warn={needFence.length > 0}
          onPress={() => navigation.navigate('SetupBranches')}
        />
        <SetupRow
          icon={Network}
          fg={colors.accents[1].fg}
          bg={colors.accents[1].bg}
          title="Departments"
          value={count(departments.data?.length)}
          subtitle={departments.data ? firstFew(departments.data.map(d => d.name)) : null}
          onPress={() => navigation.navigate('SetupDepartments')}
        />
      </Card>

      <Text variant="overline" tone="muted" style={{marginTop: spacing.sm}}>
        Time
      </Text>
      <Card style={{padding: 0}}>
        <SetupRow
          first
          icon={Clock3}
          fg={colors.warning}
          bg={colors.warningSoft}
          title="Shifts"
          value={count(shifts.data?.length)}
          subtitle={shifts.data ? firstFew(shifts.data.map(s => s.shift_name ?? 'Shift')) : null}
          onPress={() => navigation.navigate('SetupShifts')}
        />
        <SetupRow
          icon={CalendarDays}
          fg={colors.danger}
          bg={colors.dangerSoft}
          title="Holidays"
          value={count(holidays.data?.length)}
          subtitle={
            next && nextDate
              ? `Next: ${next.title} · ${weekdayShort(nextDate)}, ${formatDay(nextDate)}`
              : holidays.data
              ? 'None coming up'
              : null
          }
          onPress={() => navigation.navigate('SetupHolidays')}
        />
        <SetupRow
          icon={CalendarOff}
          fg={colors.info}
          bg={colors.infoSoft}
          title="Leave types"
          value={count(leaveTypes.data?.length)}
          subtitle={
            leaveTypes.data
              ? leaveTypes.data.map(t => `${t.name.replace(/ leave$/i, '')} ${t.no_of_days} days`).join(' · ')
              : null
          }
          onPress={() => navigation.navigate('SetupLeaveTypes')}
        />
      </Card>

      <Text variant="overline" tone="muted" style={{marginTop: spacing.sm}}>
        Rules
      </Text>
      <Card style={{padding: 0}}>
        <SetupRow
          first
          icon={FileText}
          fg={colors.success}
          bg={colors.successSoft}
          title="Policies"
          value={count(policies.data?.policies.length)}
          subtitle={
            policies.data
              ? firstFew(
                  policies.data.policies.map(p => p.title),
                  2,
                ) || 'None yet'
              : null
          }
          onPress={() => navigation.navigate('SetupPolicies')}
        />
      </Card>
    </SetupScreen>
  );
}
