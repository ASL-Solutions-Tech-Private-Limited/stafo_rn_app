import React, {useMemo, useState} from 'react';
import {View} from 'react-native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {CalendarOff, Plus} from 'lucide-react-native';
import {applyForLeave} from '../../api/endpoints/leave';
import {getHolidays, getLeaveTypes} from '../../api/endpoints/setup';
import type {LeaveRequestRecord, ShiftWithDays} from '../../api/types';
import {Badge, Button, Card, EmptyState, Skeleton, Text, toast, type BadgeTone} from '../../components/ui';
import {formatRange} from '../../lib/date';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {useSession} from '../../store/session';
import {useTheme} from '../../theme/ThemeProvider';
import {useEmployeeDashboard} from '../home/queries';
import {leaveDays} from '../people/employeeInsights';
import {employeeKeys, useEmployeeLeaves} from '../people/employee/queries';
import {SetupScreen} from '../setup/parts';
import {ApplyLeaveSheet} from './ApplyLeaveSheet';
import {typeBalances} from './leaveApply';

const STATUS: Record<string, {label: string; tone: BadgeTone}> = {
  approved: {label: 'Approved', tone: 'success'},
  pending: {label: 'Pending', tone: 'warning'},
  rejected: {label: 'Rejected', tone: 'danger'},
};

/** The employee's leave: this year's balance per type, their requests, and applying. */
export function MyLeaveScreen({route}: AppScreenProps<'MyLeave'>) {
  const {colors, spacing} = useTheme();
  const queryClient = useQueryClient();
  const me = useSession(s => s.employee);
  const companyId = useSession(s => s.companyId);
  const myId = me?.id ?? 0;
  const [applying, setApplying] = useState(!!route.params?.apply);

  const shift = useEmployeeDashboard().data?.employee_info?.shifts?.[0] as ShiftWithDays | undefined;
  const leaves = useEmployeeLeaves(myId);
  const types = useQuery({
    queryKey: ['my-leave-types', companyId],
    queryFn: () => getLeaveTypes(companyId!),
    enabled: !!companyId,
    staleTime: 10 * 60_000,
  });
  const holidays = useQuery({
    queryKey: ['my-holidays', companyId],
    queryFn: () => getHolidays(companyId!),
    enabled: !!companyId,
    staleTime: 60 * 60_000,
    retry: false,
  });

  const myLeaves = useMemo(() => [...(leaves.data ?? [])].sort((a, b) => b.id - a.id), [leaves.data]);
  const balances = useMemo(() => typeBalances(types.data ?? [], myLeaves), [types.data, myLeaves]);

  const apply = useMutation({
    mutationFn: (p: {typeId: number; from: string; to: string; reason: string}) =>
      applyForLeave({
        employee_id: myId,
        from_date: p.from,
        to_date: p.to,
        leave_type: p.typeId,
        reason: p.reason,
      }),
    onSuccess: () => {
      haptics.success();
      toast.success('Leave request sent');
      setApplying(false);
      queryClient.invalidateQueries({queryKey: employeeKeys.leaves(myId)});
    },
    onError: (e: Error) => {
      haptics.error();
      toast.error(e.message);
    },
  });

  return (
    <SetupScreen
      title="Leave"
      subtitle={me?.name}
      onAdd={balances.length ? () => setApplying(true) : undefined}
      addLabel="Apply"
      query={leaves}>
      <View style={{gap: spacing.xl}}>
        {types.isPending ? (
          <View style={{flexDirection: 'row', gap: spacing.sm}}>
            <Skeleton height={96} radius={16} style={{flex: 1}} />
            <Skeleton height={96} radius={16} style={{flex: 1}} />
          </View>
        ) : balances.length ? (
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm}}>
            {balances.map((b, i) => (
              <Card key={b.id} style={{flexGrow: 1, flexBasis: '45%', gap: 2}}>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {b.name.replace(/\s*leave$/i, '')}
                  {b.paid ? '' : ' · unpaid'}
                </Text>
                <Text variant="h2" color={i % 2 ? colors.success : colors.primary}>
                  {b.left ?? b.used}
                </Text>
                <Text variant="caption" tone="muted">
                  {b.allowance != null ? `of ${b.allowance} left` : 'days taken'}
                  {b.pending ? ` · ${b.pending} pending` : ''}
                </Text>
              </Card>
            ))}
          </View>
        ) : (
          <Card>
            <EmptyState
              compact
              icon={CalendarOff}
              title="No leave types yet"
              message="Your company hasn’t set up leave types, so leave can’t be applied for from the app."
            />
          </Card>
        )}

        <View style={{gap: spacing.md}}>
          <Text variant="overline" tone="muted">
            Your requests
          </Text>
          {leaves.isPending ? (
            <Skeleton height={80} radius={20} />
          ) : myLeaves.length ? (
            myLeaves.map(l => <LeaveRow key={l.id} leave={l} />)
          ) : (
            <Card>
              <EmptyState
                compact
                icon={CalendarOff}
                title="No leave requests yet"
                message="Requests you send appear here with their status."
                action={
                  balances.length ? (
                    <Button
                      title="Apply for leave"
                      icon={Plus}
                      size="sm"
                      fullWidth={false}
                      onPress={() => setApplying(true)}
                    />
                  ) : undefined
                }
              />
            </Card>
          )}
        </View>
      </View>

      <ApplyLeaveSheet
        visible={applying}
        onClose={() => setApplying(false)}
        balances={balances}
        myLeaves={myLeaves}
        shift={shift}
        holidays={holidays.data ?? []}
        sending={apply.isPending}
        onSend={p => apply.mutate(p)}
      />
    </SetupScreen>
  );
}

function LeaveRow({leave}: {leave: LeaveRequestRecord}) {
  const {spacing} = useTheme();
  const status = STATUS[leave.status?.toLowerCase()] ?? {label: leave.status, tone: 'neutral' as BadgeTone};
  const days = leaveDays(leave);
  return (
    <Card style={{gap: spacing.xs}}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm}}>
        <Text variant="title" style={{flex: 1}} numberOfLines={1}>
          {leave.leavetype?.name ?? 'Leave'} · {days} day{days === 1 ? '' : 's'}
        </Text>
        <Badge label={status.label} tone={status.tone} dot={status.label === 'Pending'} />
      </View>
      <Text variant="caption" tone="muted" numberOfLines={2}>
        {formatRange(leave.from_date, leave.to_date)}
        {leave.reason ? ` · “${leave.reason}”` : ''}
      </Text>
    </Card>
  );
}
