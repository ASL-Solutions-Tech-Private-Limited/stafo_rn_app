import {useMemo} from 'react';
import {keepPreviousData, useQuery} from '@tanstack/react-query';
import {getEmployeesForDate} from '../../api/endpoints/people';
import type {CompanyEmployee} from '../../api/types';
import {toDateKey} from '../../lib/date';
import {useNow} from '../../lib/useNow';
import {useCompanyDashboard} from '../home/queries';
import {getDayStatus, GROUP_OF, type DayStatus, type StatusGroup} from './dayStatus';

export type PersonDay = {employee: CompanyEmployee; status: DayStatus};

export const peopleKey = (date: string) => ['people', date] as const;

/**
 * Every employee with their attendance status on `date`. Shared by the People
 * tab and the admin home so both always show the same numbers.
 */
export function usePeopleOnDate(date: string) {
  const isToday = date === toDateKey();
  const query = useQuery({
    queryKey: peopleKey(date),
    queryFn: () => getEmployeesForDate(date),
    placeholderData: keepPreviousData,
  });
  const dashboard = useCompanyDashboard();
  // Re-evaluate every minute while looking at today ("working" time, shift ends).
  const now = useNow(isToday, 60_000);

  const onLeaveIds = useMemo(
    () =>
      isToday ? new Set((dashboard.data?.employeesOnLeave ?? []).map(l => l.employee_id)) : new Set<number>(),
    [isToday, dashboard.data],
  );

  const people: PersonDay[] = useMemo(
    () =>
      (query.data ?? []).map(employee => ({
        employee,
        status: getDayStatus(employee, date, {now, onLeaveIds}),
      })),
    [query.data, date, now, onLeaveIds],
  );

  const counts = useMemo(() => {
    const c: Record<'all' | StatusGroup, number> = {
      all: people.length,
      in: 0,
      'not-in': 0,
      absent: 0,
      leave: 0,
      off: 0,
    };
    for (const p of people) {
      c[GROUP_OF[p.status.kind]] += 1;
    }
    return c;
  }, [people]);

  return {query, people, counts};
}
