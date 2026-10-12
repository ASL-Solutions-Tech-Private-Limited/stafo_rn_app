import type {Claim} from '../../api/endpoints/expenses';
import type {DeviceRequest, LeaveRequestRecord, MissedPunchRequest} from '../../api/types';
import {parseServerDate, toDateKey} from '../../lib/date';
import {leaveBalances, leaveDays, othersOffDuring} from '../people/employeeInsights';

export type ApprovalKind = 'leave' | 'punch' | 'device' | 'expense';

type Base = {
  /** Unique across kinds, e.g. "leave-20". */
  key: string;
  employeeId: number;
  name: string;
  /** When it was asked for; null if the server didn't say. */
  askedAt: Date | null;
};

export type ApprovalItem =
  | (Base & {kind: 'leave'; leave: LeaveRequestRecord})
  | (Base & {kind: 'punch'; punch: MissedPunchRequest})
  | (Base & {kind: 'device'; device: DeviceRequest})
  | (Base & {kind: 'expense'; claim: Claim});

export type ApprovalCounts = Record<ApprovalKind | 'all', number>;

const isPending = (status?: string | null) => status?.toLowerCase() === 'pending';

/** Everything waiting for a decision, newest first. */
export function buildApprovals(
  leaves: LeaveRequestRecord[],
  punches: MissedPunchRequest[],
  devices: DeviceRequest[],
  claims: Claim[] = [],
  /** Claims don't carry the employee's name. */
  nameOf: (employeeId: number) => string | undefined = () => undefined,
): ApprovalItem[] {
  const items: ApprovalItem[] = [
    ...leaves
      .filter(l => isPending(l.status))
      .map(
        (leave): ApprovalItem => ({
          kind: 'leave',
          key: `leave-${leave.id}`,
          employeeId: leave.employee_id,
          name: leave.employee_basic_info?.name ?? `Employee #${leave.employee_id}`,
          askedAt: parseServerDate(leave.created_at),
          leave,
        }),
      ),
    ...punches
      .filter(p => isPending(p.status))
      .map(
        (punch): ApprovalItem => ({
          kind: 'punch',
          key: `punch-${punch.id}`,
          employeeId: punch.employee_id,
          name: punch.employee?.name ?? `Employee #${punch.employee_id}`,
          askedAt: parseServerDate(punch.created_at),
          punch,
        }),
      ),
    ...devices
      .filter(d => isPending(d.device_status))
      .map(
        (device): ApprovalItem => ({
          kind: 'device',
          key: `device-${device.id}-${device.device_id}`,
          employeeId: device.id,
          name: device.name,
          askedAt: parseServerDate(device.updated_at),
          device,
        }),
      ),
    ...claims
      .filter(c => isPending(c.status))
      .map(
        (claim): ApprovalItem => ({
          kind: 'expense',
          key: `expense-${claim.id}`,
          employeeId: claim.employee_id,
          name: nameOf(claim.employee_id) ?? `Employee #${claim.employee_id}`,
          askedAt: parseServerDate(claim.created_at),
          claim,
        }),
      ),
  ];
  return items.sort((a, b) => (b.askedAt?.getTime() ?? 0) - (a.askedAt?.getTime() ?? 0));
}

export function countApprovals(items: ApprovalItem[]): ApprovalCounts {
  const counts: ApprovalCounts = {all: items.length, leave: 0, punch: 0, device: 0, expense: 0};
  for (const i of items) {
    counts[i.kind] += 1;
  }
  return counts;
}

/** True when the request's day(s) are already over, so deciding only records it. */
export function isPastDue(item: ApprovalItem, now = new Date()) {
  const today = toDateKey(now);
  if (item.kind === 'leave') {
    return item.leave.to_date < today;
  }
  return false;
}

/** "Just now", "2h ago", "Yesterday", "5 days ago", "3 months ago". */
export function askedAgo(date: Date | null, now = new Date()) {
  if (!date) {
    return '';
  }
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) {
    return 'Just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date >= startOfToday) {
    return `${Math.floor(minutes / 60)}h ago`;
  }
  const startOfThatDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((startOfToday.getTime() - startOfThatDay.getTime()) / 86_400_000);
  if (days <= 1) {
    return 'Yesterday';
  }
  if (days < 31) {
    return `${days} days ago`;
  }
  const months = Math.max(1, Math.round(days / 30.4));
  return `${months} month${months === 1 ? '' : 's'} ago`;
}

/** Whether a request arrived today (for the Today / Earlier split). */
export function askedToday(item: ApprovalItem, now = new Date()) {
  return !!item.askedAt && toDateKey(item.askedAt) === toDateKey(now);
}

export type LeaveContext = {
  typeName: string;
  days: number;
  /** Days of this type left in the year if approved; null when the type has no allowance. */
  leftAfter: number | null;
  allowance: number | null;
  /** Colleagues with approved leave overlapping these dates. */
  othersOff: string[];
};

/** What an admin needs to decide on a leave request, from the company-wide leave list. */
export function leaveContext(leave: LeaveRequestRecord, companyLeaves: LeaveRequestRecord[]): LeaveContext {
  const days = leaveDays(leave);
  const year = Number(leave.from_date.slice(0, 4));
  const own = companyLeaves.filter(l => l.employee_id === leave.employee_id);
  const typeKey = String(leave.leavetype?.id ?? leave.leave_type ?? 'other');
  const balance = leaveBalances(own.length ? own : [leave], year).find(b => b.key === typeKey);
  const allowance = balance?.allowance ?? leave.leavetype?.no_of_days ?? null;
  const leftAfter = allowance == null ? null : Math.max(0, allowance - (balance?.used ?? 0) - days);
  return {
    typeName: leave.leavetype?.name ?? balance?.name ?? 'Leave',
    days,
    leftAfter,
    allowance,
    othersOff: othersOffDuring(leave, companyLeaves),
  };
}
