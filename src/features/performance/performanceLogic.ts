import type {RankRow, ScoreRow} from '../../api/endpoints/performance';
import type {Plan, PlanFeature, Subscription} from '../../api/endpoints/subscription';
import {parseServerDate} from '../../lib/date';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export type Month = {month: number; year: number};

export const thisMonth = (now = new Date()): Month => ({month: now.getMonth() + 1, year: now.getFullYear()});

/** "July 2025" */
export const monthLabel = (m: Month) => `${MONTHS[m.month - 1]} ${m.year}`;

export function stepMonth(m: Month, delta: number): Month {
  const d = new Date(m.year, m.month - 1 + delta, 1);
  return {month: d.getMonth() + 1, year: d.getFullYear()};
}

export const isFuture = (m: Month, now = new Date()) =>
  m.year > now.getFullYear() || (m.year === now.getFullYear() && m.month > now.getMonth() + 1);

const num = (v: string | number | null | undefined) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export type Ranked = {employeeId: number; name: string; empId: string | null; total: number; rank: number};

/** Highest total first; equal totals share a rank (1, 1, 3). */
export function rankRows(rows: RankRow[]): Ranked[] {
  const sorted = rows
    .map(r => ({
      employeeId: r.employee_id,
      name: r.employee?.name?.trim() || `Employee #${r.employee_id}`,
      empId: r.employee?.emp_id ?? null,
      total: num(r.total_marks),
    }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  return sorted.map((r, i) => ({
    ...r,
    rank: i > 0 && sorted[i - 1].total === r.total ? 1 + sorted.findIndex(x => x.total === r.total) : i + 1,
  }));
}

/** Whether what the server now has is what was sent (scoring type id → points). */
export function scoresMatch(
  rows: Pick<ScoreRow, 'performance_type_id' | 'marks'>[],
  sent: Record<number, number>,
) {
  const had = new Map(rows.map(r => [r.performance_type_id, Number(r.marks)]));
  return Object.entries(sent).every(([id, p]) => had.get(Number(id)) === p);
}

/** Quick picks shown for each score. */
export const QUICK_POINTS = [0, 2, 4, 6, 8, 10] as const;

/** Why a score can't be saved, or null. Whole numbers 0–1000. */
export function pointsError(value: string) {
  const v = value.trim();
  if (!v) {
    return 'Give a score.';
  }
  if (!/^\d{1,4}$/.test(v) || Number(v) > 1000) {
    return 'A whole number from 0 to 1000.';
  }
  return null;
}

export type PlanState =
  | {kind: 'none'}
  | {kind: 'active'; end: Date; daysLeft: number}
  | {kind: 'ending'; end: Date; daysLeft: number}
  | {kind: 'expired'; end: Date};

/** Ending = 7 days or fewer left. The end date is the last day of the plan. */
export function planState(
  sub: Pick<Subscription, 'subscription_end'> | null | undefined,
  now = new Date(),
): PlanState {
  const end = parseServerDate(sub?.subscription_end);
  if (!end) {
    return {kind: 'none'};
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysLeft = Math.round((end.getTime() - today.getTime()) / 86_400_000);
  if (daysLeft < 0) {
    return {kind: 'expired', end};
  }
  return {kind: daysLeft <= 7 ? 'ending' : 'active', end, daysLeft};
}

/** What the plan costs now (the discounted price when there is one) and the crossed-out price. */
export function planPrice(p: Pick<Plan, 'price' | 'discount_price'>) {
  const price = num(p.price);
  const discount = num(p.discount_price);
  return discount > 0 && discount < price ? {now: discount, was: price} : {now: price, was: null};
}

/** The plan's features as short lines; "No" and unset ones are left out, duplicates merged. */
export function planFeatures(features: PlanFeature[] | null | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const f of features ?? []) {
    const value = (f.pivot?.feature_value ?? '').trim();
    const name = f.name.trim().replace(/Locetion/i, 'Location');
    const key = name.toLowerCase();
    if (!value || /^no$/i.test(value) || seen.has(key)) {
      continue;
    }
    seen.add(key);
    if (/^access employees$/i.test(name) && /^\d+$/.test(value)) {
      out.push(`Up to ${value} employees`);
    } else if (/^yes$/i.test(value)) {
      out.push(name);
    } else {
      out.push(`${name}: ${value}`);
    }
  }
  return out;
}

/** Plans on sale, cheapest first. */
export const activePlans = (plans: Plan[]) =>
  plans
    .filter(p => (p.status ?? 'active').toLowerCase() === 'active')
    .sort((a, b) => planPrice(a).now - planPrice(b).now);
