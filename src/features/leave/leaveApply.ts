import type {Holiday, LeaveRequestRecord, ShiftWithDays} from '../../api/types';
import {parseServerDate, toDateKey} from '../../lib/date';
import {isWorkday} from '../people/dayStatus';
import {leaveBalances} from '../people/employeeInsights';

export type LeaveTypeOption = {id: number; name: string; no_of_days?: number | null; is_paid?: number | string | null};

export type TypeBalance = {
  id: number;
  name: string;
  paid: boolean;
  /** Yearly allowance; null when the type has none. */
  allowance: number | null;
  used: number;
  pending: number;
  /** Allowance minus used and pending; null without an allowance. */
  left: number | null;
};

/** This year's balance for every leave type the company has, including ones never taken. */
export function typeBalances(types: LeaveTypeOption[], leaves: LeaveRequestRecord[], year = new Date().getFullYear()) {
  const taken = new Map(leaveBalances(leaves, year).map(b => [b.key, b]));
  return types.map<TypeBalance>(t => {
    const b = taken.get(String(t.id));
    const allowance = t.no_of_days && t.no_of_days > 0 ? t.no_of_days : null;
    const used = b?.used ?? 0;
    const pending = b?.pending ?? 0;
    return {
      id: t.id,
      name: t.name,
      paid: Number(t.is_paid) === 1,
      allowance,
      used,
      pending,
      left: allowance == null ? null : Math.max(0, allowance - used - pending),
    };
  });
}

function isHoliday(key: string, holidays: Pick<Holiday, 'start_date' | 'end_date'>[]) {
  return holidays.some(h => h.start_date.slice(0, 10) <= key && key <= (h.end_date || h.start_date).slice(0, 10));
}

/** Working days in [from, to]: week-offs in their shift and company holidays don't count. */
export function countLeaveDays(
  from: string,
  to: string,
  shift?: ShiftWithDays | null,
  holidays: Pick<Holiday, 'start_date' | 'end_date'>[] = [],
) {
  const start = parseServerDate(from);
  const end = parseServerDate(to);
  if (!start || !end || end < start) {
    return {working: 0, calendar: 0};
  }
  let working = 0;
  let calendar = 0;
  for (const d = new Date(start); d <= end && calendar < 366; d.setDate(d.getDate() + 1)) {
    calendar++;
    if (isWorkday(shift ? [shift] : [], d) && !isHoliday(toDateKey(d), holidays)) {
      working++;
    }
  }
  return {working, calendar};
}

/** Something that stops the request being sent, or null. */
export function leaveRequestError(
  p: {typeId: number | null; from: string; to: string; workingDays: number},
  myLeaves: Pick<LeaveRequestRecord, 'from_date' | 'to_date' | 'status'>[],
) {
  if (!p.typeId) {
    return 'Pick a leave type.';
  }
  if (!p.from || !p.to) {
    return 'Pick the dates.';
  }
  if (p.to < p.from) {
    return 'The last day is before the first.';
  }
  if (p.workingDays === 0) {
    return 'Those are all days off already.';
  }
  const clash = myLeaves.find(
    l => l.status !== 'rejected' && l.from_date.slice(0, 10) <= p.to && p.from <= l.to_date.slice(0, 10),
  );
  if (clash) {
    return `You already have ${clash.status === 'approved' ? 'approved' : 'a pending request for'} leave on some of these days.`;
  }
  return null;
}
