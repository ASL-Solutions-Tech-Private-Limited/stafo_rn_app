import React, {useState} from 'react';
import {View} from 'react-native';
import {CalendarOff, Check, Users} from 'lucide-react-native';
import type {LeaveRequestRecord} from '../../../../api/types';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Skeleton,
  Text,
  type BadgeTone,
} from '../../../../components/ui';
import {formatRange} from '../../../../lib/date';
import {useTheme} from '../../../../theme/ThemeProvider';
import {leaveDays, othersOffDuring, type LeaveBalance} from '../../employeeInsights';
import {useSetLeaveStatus} from '../queries';
import {SectionLabel} from '../parts';

type Props = {
  employeeId: number;
  firstName: string;
  leaves: LeaveRequestRecord[];
  loading: boolean;
  balances: LeaveBalance[];
  companyLeaves: LeaveRequestRecord[];
};

const STATUS_TONE: Record<string, BadgeTone> = {approved: 'success', rejected: 'danger', pending: 'warning'};

function daysLabel(n: number) {
  return `${n} day${n === 1 ? '' : 's'}`;
}

export function LeaveTab({employeeId, firstName, leaves, loading, balances, companyLeaves}: Props) {
  const {colors, spacing} = useTheme();
  const pending = leaves.filter(l => l.status === 'pending');
  const history = leaves
    .filter(l => l.status !== 'pending')
    .sort((a, b) => b.from_date.localeCompare(a.from_date));
  const accents = [
    colors.accents[0],
    colors.accents[2],
    colors.accents[1],
    colors.accents[3],
    colors.accents[6],
  ];

  if (loading) {
    return (
      <View style={{gap: spacing.md}}>
        <Skeleton height={96} radius={16} />
        <Skeleton height={180} radius={20} />
      </View>
    );
  }

  return (
    <View style={{gap: spacing.lg}}>
      {balances.length ? (
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm}}>
          {balances.map((b, i) => {
            const accent = accents[i % accents.length];
            const remaining = b.allowance != null ? Math.max(0, b.allowance - b.used) : null;
            return (
              <Card key={b.key} style={{flexGrow: 1, flexBasis: '30%', padding: spacing.md}}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: accent.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <CalendarOff size={16} color={accent.fg} />
                </View>
                <View style={{flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: spacing.sm}}>
                  <Text variant="h2">{remaining ?? b.used}</Text>
                  {b.allowance != null ? (
                    <Text variant="caption" tone="muted">
                      / {b.allowance}
                    </Text>
                  ) : null}
                </View>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {b.name} {remaining != null ? 'left' : 'used'}
                </Text>
              </Card>
            );
          })}
        </View>
      ) : null}

      <View>
        <SectionLabel>Waiting for you</SectionLabel>
        {pending.length ? (
          <View style={{gap: spacing.md}}>
            {pending.map(l => (
              <PendingLeaveCard
                key={l.id}
                leave={l}
                employeeId={employeeId}
                firstName={firstName}
                balance={balances.find(b => b.key === String(l.leavetype?.id ?? l.leave_type))}
                othersOff={othersOffDuring(l, companyLeaves)}
              />
            ))}
          </View>
        ) : (
          <Card>
            <EmptyState
              compact
              icon={Check}
              title="All caught up"
              message={`No pending leave requests from ${firstName}.`}
            />
          </Card>
        )}
      </View>

      <View>
        <SectionLabel>History</SectionLabel>
        {history.length ? (
          <Card padded={false}>
            {history.map((l, i) => (
              <View
                key={l.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  paddingHorizontal: spacing.lg,
                  paddingVertical: 13,
                  borderTopWidth: i ? 1 : 0,
                  borderTopColor: colors.border,
                }}>
                <View style={{flex: 1}}>
                  <Text variant="title">
                    {l.leavetype?.name ?? 'Leave'} · {daysLabel(leaveDays(l))}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {formatRange(l.from_date, l.to_date)}
                    {l.reason ? ` · ${l.reason}` : ''}
                  </Text>
                </View>
                <Badge
                  label={l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                  tone={STATUS_TONE[l.status] ?? 'neutral'}
                />
              </View>
            ))}
          </Card>
        ) : (
          <Card>
            <EmptyState
              compact
              icon={CalendarOff}
              title="No leave history"
              message={`${firstName} hasn't taken any leave yet.`}
            />
          </Card>
        )}
      </View>
    </View>
  );
}

function PendingLeaveCard({
  leave,
  employeeId,
  firstName,
  balance,
  othersOff,
}: {
  leave: LeaveRequestRecord;
  employeeId: number;
  firstName: string;
  balance?: LeaveBalance;
  othersOff: string[];
}) {
  const {colors, spacing, radius} = useTheme();
  const action = useSetLeaveStatus(employeeId);
  const [confirm, setConfirm] = useState<'approved' | 'rejected' | null>(null);
  const days = leaveDays(leave);
  const afterApproval =
    balance?.allowance != null ? Math.max(0, balance.allowance - balance.used - days) : null;

  return (
    <Card style={{gap: spacing.md}}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
        }}>
        <Text variant="title" style={{flex: 1}}>
          {leave.leavetype?.name ?? 'Leave'} · {daysLabel(days)}
        </Text>
        <Badge label="Pending" tone="warning" dot />
      </View>
      <Text variant="body" tone="muted">
        {formatRange(leave.from_date, leave.to_date)}
      </Text>
      {leave.reason ? (
        <View style={{padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceMuted}}>
          <Text variant="bodyRegular">"{leave.reason}"</Text>
        </View>
      ) : null}
      {afterApproval != null || othersOff.length ? (
        <View style={{gap: 4}}>
          {afterApproval != null ? (
            <Text variant="caption" tone="muted">
              After approval: {afterApproval} {leave.leavetype?.name?.toLowerCase() ?? 'leave'} days left
            </Text>
          ) : null}
          {othersOff.length ? (
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
              <Users size={13} color={colors.warning} />
              <Text variant="caption" tone="warning" style={{flex: 1}}>
                Also off then: {othersOff.slice(0, 3).join(', ')}
                {othersOff.length > 3 ? ` +${othersOff.length - 3}` : ''}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
      <View style={{flexDirection: 'row', gap: spacing.sm}}>
        <Button
          title="Reject"
          variant="ghost"
          size="md"
          style={{flex: 1}}
          onPress={() => setConfirm('rejected')}
        />
        <Button
          title="Approve"
          icon={Check}
          size="md"
          style={{flex: 1}}
          onPress={() => setConfirm('approved')}
        />
      </View>

      <ConfirmDialog
        visible={!!confirm}
        title={confirm === 'approved' ? 'Approve this leave?' : 'Reject this leave?'}
        message={`${firstName} will be notified. ${formatRange(leave.from_date, leave.to_date)} · ${daysLabel(
          days,
        )}.`}
        confirmLabel={confirm === 'approved' ? 'Approve' : 'Reject'}
        destructive={confirm === 'rejected'}
        loading={action.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() =>
          action.mutate({leaveId: leave.id, status: confirm!}, {onSettled: () => setConfirm(null)})
        }
      />
    </Card>
  );
}
