import React from 'react';
import {View} from 'react-native';
import {
  Briefcase,
  Building2,
  CalendarDays,
  Clock3,
  Droplet,
  FileClock,
  Hash,
  Mail,
  MapPin,
  Phone,
  Smartphone,
} from 'lucide-react-native';
import type {
  CompanyEmployee,
  EmployeeProfile,
  LeaveRequestRecord,
  ShiftWithDays,
} from '../../../../api/types';
import {Button, Card, Skeleton, Text} from '../../../../components/ui';
import {formatClock, formatDay, formatDuration, formatRange, parseServerDate} from '../../../../lib/date';
import {useTheme} from '../../../../theme/ThemeProvider';
import type {LeaveBalance, MonthSummary} from '../../employeeInsights';
import {leaveDays} from '../../employeeInsights';
import {BalanceBar, InfoList, SectionLabel, StatTile} from '../parts';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Mon–Fri", "Mon–Sat", or "Mon, Wed, Fri". */
export function workingDaysLabel(shift?: ShiftWithDays | null) {
  if (!shift) {
    return '';
  }
  const on = DAY_NAMES.map((d, i) => (Number(shift[d] ?? 1) === 1 ? i : -1)).filter(i => i >= 0);
  if (on.length === 7) {
    return 'Every day';
  }
  const contiguous = on.every((d, i) => i === 0 || d === on[i - 1] + 1);
  return contiguous && on.length > 2
    ? `${DAY_SHORT[on[0]]}–${DAY_SHORT[on[on.length - 1]]}`
    : on.map(i => DAY_SHORT[i]).join(', ');
}

function fullDate(value?: string | null) {
  const d = parseServerDate(value);
  return d ? `${formatDay(d)} ${d.getFullYear()}` : null;
}

type Props = {
  profile?: EmployeeProfile | null;
  entry?: CompanyEmployee;
  summary?: MonthSummary;
  monthLoading: boolean;
  balances: LeaveBalance[];
  pendingLeave?: LeaveRequestRecord;
  onReviewLeave: () => void;
};

export function OverviewTab({
  profile,
  entry,
  summary,
  monthLoading,
  balances,
  pendingLeave,
  onReviewLeave,
}: Props) {
  const {colors, spacing, radius} = useTheme();
  const shift = entry?.shifts?.[0];
  const accents = [colors.primary, colors.success, colors.accents[1].fg, colors.warning, colors.info];

  return (
    <View style={{gap: spacing.lg}}>
      <View>
        <SectionLabel>This month</SectionLabel>
        {monthLoading || !summary ? (
          <Skeleton height={64} radius={16} />
        ) : (
          <View style={{flexDirection: 'row', gap: spacing.sm}}>
            <StatTile value={String(summary.present)} label="Present" color={colors.success} />
            <StatTile value={String(summary.late)} label="Late" color={colors.warning} />
            <StatTile value={String(summary.absent)} label="Absent" color={colors.danger} />
            <StatTile
              value={summary.avgWorkedMs ? formatDuration(summary.avgWorkedMs) : '—'}
              label="Avg / day"
            />
          </View>
        )}
      </View>

      <Card style={{gap: spacing.md}}>
        <Text variant="title">Leave this year</Text>
        {balances.length ? (
          balances.map((b, i) => (
            <BalanceBar
              key={b.key}
              label={b.name}
              used={b.used}
              allowance={b.allowance}
              remaining={b.allowance != null ? Math.max(0, b.allowance - b.used) : null}
              color={accents[i % accents.length]}
            />
          ))
        ) : (
          <Text variant="caption" tone="muted">
            No leave taken this year.
          </Text>
        )}
        {pendingLeave ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              padding: spacing.md,
              borderRadius: radius.md,
              backgroundColor: colors.warningSoft,
            }}>
            <FileClock size={18} color={colors.warning} />
            <View style={{flex: 1}}>
              <Text variant="label">Leave request waiting</Text>
              <Text variant="caption" tone="muted">
                {pendingLeave.leavetype?.name ?? 'Leave'} ·{' '}
                {formatRange(pendingLeave.from_date, pendingLeave.to_date)} · {leaveDays(pendingLeave)} day
                {leaveDays(pendingLeave) > 1 ? 's' : ''}
              </Text>
            </View>
            <Button title="Review" size="sm" fullWidth={false} onPress={onReviewLeave} />
          </View>
        ) : null}
      </Card>

      <View>
        <SectionLabel>Details</SectionLabel>
        {!profile ? (
          <Skeleton height={220} radius={20} />
        ) : (
          <InfoList
            items={[
              {icon: Hash, label: 'Employee ID', value: profile.emp_id},
              {icon: Phone, label: 'Mobile', value: profile.phone},
              {icon: Mail, label: 'Email', value: profile.email},
              {icon: Building2, label: 'Branch', value: entry?.branch_name},
              {icon: Briefcase, label: 'Department', value: entry?.department_name},
              {
                icon: Clock3,
                label: 'Shift',
                value: shift
                  ? `${formatClock(shift.start_time)} – ${formatClock(shift.end_time)} · ${workingDaysLabel(
                      shift,
                    )}`
                  : 'Not assigned',
              },
              {
                icon: Smartphone,
                label: 'Device',
                value: profile.device_name
                  ? `${profile.device_name}${profile.device_status ? ` · ${profile.device_status}` : ''}`
                  : null,
              },
              {icon: CalendarDays, label: 'Joined', value: fullDate(profile.date_of_joining)},
              {icon: CalendarDays, label: 'Birthday', value: fullDate(profile.date_of_birth)},
              {icon: Droplet, label: 'Blood group', value: profile.blood_group},
              {icon: MapPin, label: 'Address', value: profile.address},
            ]}
          />
        )}
      </View>
    </View>
  );
}
