import React, {useCallback, useMemo, useState} from 'react';
import {RefreshControl, View} from 'react-native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {Clock3, Info, Send} from 'lucide-react-native';
import {askForPunchOut, getMyPunchFixes} from '../../../api/endpoints/punch';
import {getHolidays} from '../../../api/endpoints/setup';
import type {EmployeeInfo, MonthAttendanceRecord, ShiftWithDays} from '../../../api/types';
import {Button, Screen, Text, toast} from '../../../components/ui';
import {haptics} from '../../../lib/haptics';
import {parseServerDate, toDateKey} from '../../../lib/date';
import {useNow} from '../../../lib/useNow';
import {useSession} from '../../../store/session';
import {useTheme} from '../../../theme/ThemeProvider';
import {getTodayAttendance} from '../attendanceState';
import {useEmployeeDashboard} from '../../home/queries';
import {buildMonth, type CalendarDay} from '../../people/employeeInsights';
import {employeeKeys, useEmployeeLeaves, useMonthAttendance} from '../../people/employee/queries';
import {AttendanceTab} from '../../people/employee/tabs/AttendanceTab';
import {AskPunchOutSheet} from '../AskPunchOutSheet';
import {fixableDates, punchFixEligibility} from '../punchFix';

const currentMonth = () => toDateKey().slice(0, 7);

const clock = (d: Date) => d.toTimeString().slice(0, 8);

/** Today's day as the punches have it: first punch-in, last punch-out (none while still in). */
function todayFromPunches(punches: EmployeeInfo['punches']) {
  const today = getTodayAttendance(punches);
  if (today.state === 'not-started') {
    return null;
  }
  const dateKey = toDateKey();
  const firstIn = (punches ?? [])
    .map(p => parseServerDate(p.punch_in))
    .filter((d): d is Date => !!d && toDateKey(d) === dateKey)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const record: MonthAttendanceRecord = {
    id: 0,
    employee_id: punches?.[0]?.employee_id ?? 0,
    attendance: 'Present',
    halfday: 0,
    date: dateKey,
    in_time: firstIn ? clock(firstIn) : null,
    out_time: today.state === 'punched-out' ? clock(today.at) : null,
  };
  return {
    record,
    workedMs: today.workedMs,
    open: today.state === 'punched-in',
    since: today.state === 'punched-in' ? today.since : new Date(),
  };
}

/** The employee's own month: calendar, day details, and asking for a missed punch-out. */
export function AttendanceTabScreen() {
  const {colors, spacing} = useTheme();
  const queryClient = useQueryClient();
  const me = useSession(s => s.employee);
  const companyId = useSession(s => s.companyId);
  const myId = me?.id ?? 0;
  const [month, setMonth] = useState(currentMonth());
  const [asking, setAsking] = useState<CalendarDay | null>(null);

  const info = useEmployeeDashboard().data?.employee_info;
  const shift = info?.shifts?.[0] as ShiftWithDays | undefined;
  const monthQuery = useMonthAttendance(myId, month);
  const leavesQuery = useEmployeeLeaves(myId);
  const fixes = useQuery({
    queryKey: ['my-punch-fixes', myId],
    queryFn: () => getMyPunchFixes(myId),
    enabled: !!myId,
    select: list => [...list].sort((a, b) => b.id - a.id),
  });
  // Holidays don't count towards the 3 working days. If the list isn't readable, fall back to the shift's week.
  const holidays = useQuery({
    queryKey: ['my-holidays', companyId],
    queryFn: () => getHolidays(companyId!),
    enabled: !!companyId,
    staleTime: 60 * 60_000,
    retry: false,
  });

  // The daily record only holds the first punch session; today, use the live punches instead.
  const live = useMemo(() => todayFromPunches(info?.punches), [info?.punches]);
  const now = useNow(live?.open ?? false, 60_000);
  const days = useMemo(() => {
    const records = (monthQuery.data ?? []).filter(r => !live || r.date !== live.record.date);
    const built = buildMonth(month, live ? [...records, live.record] : records, leavesQuery.data ?? [], shift);
    return live
      ? built.map(d =>
          d.dateKey === live.record.date
            ? {...d, workedMs: live.workedMs + (live.open ? now.getTime() - live.since.getTime() : 0)}
            : d,
        )
      : built;
  }, [month, monthQuery.data, leavesQuery.data, shift, live, now]);
  const allowed = useMemo(() => fixableDates(shift, holidays.data ?? []), [shift, holidays.data]);

  const ask = useMutation({
    mutationFn: (p: {date: string; time: string; reason: string}) =>
      askForPunchOut({employee_id: myId, date: p.date, punch_out_time: p.time, reason: p.reason}),
    onSuccess: () => {
      haptics.success();
      toast.success('Sent to your manager');
      setAsking(null);
      queryClient.invalidateQueries({queryKey: ['my-punch-fixes', myId]});
    },
    onError: (e: Error) => {
      haptics.error();
      toast.error(e.message);
    },
  });

  const refreshing = monthQuery.isRefetching || fixes.isRefetching;
  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({queryKey: employeeKeys.month(myId, month)});
    queryClient.invalidateQueries({queryKey: ['my-punch-fixes', myId]});
  }, [queryClient, myId, month]);

  const renderDayAction = (day: CalendarDay) => {
    if (day.isToday || !day.record?.in_time || day.record.out_time) {
      return null;
    }
    const can = punchFixEligibility(day.dateKey, day.record, allowed, fixes.data ?? []);
    if (can.ok) {
      return (
        <Button
          title="Ask for punch-out"
          icon={Send}
          variant="secondary"
          size="sm"
          onPress={() => {
            haptics.tap();
            setAsking(day);
          }}
        />
      );
    }
    return can.message ? (
      <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm}}>
        {can.reason === 'requested' ? (
          <Clock3 size={14} color={colors.warning} />
        ) : (
          <Info size={14} color={colors.textSubtle} />
        )}
        <Text variant="caption" tone="subtle" style={{flex: 1}}>
          {can.message}
        </Text>
      </View>
    ) : null;
  };

  return (
    <Screen
      scroll
      safeBottom={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentStyle={{paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl}}>
      <Text variant="h1" style={{marginTop: spacing.lg, marginBottom: spacing.lg}}>
        My attendance
      </Text>
      <AttendanceTab
        self
        month={month}
        onMonth={setMonth}
        canGoNext={month < currentMonth()}
        days={days}
        loading={monthQuery.isPending}
        requests={fixes.data ?? []}
        requestsLoading={fixes.isPending}
        employeeId={myId}
        name={me?.name ?? 'You'}
        shift={shift}
        renderDayAction={renderDayAction}
      />
      <AskPunchOutSheet
        visible={!!asking}
        onClose={() => setAsking(null)}
        dateKey={asking?.dateKey ?? ''}
        inTime={asking?.record?.in_time}
        shift={shift}
        sending={ask.isPending}
        onSend={(time, reason) => asking && ask.mutate({date: asking.dateKey, time, reason})}
      />
    </Screen>
  );
}
