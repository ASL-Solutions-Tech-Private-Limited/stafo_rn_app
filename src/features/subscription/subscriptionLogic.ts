import type {Plan, PlanFeature, Subscription} from '../../api/endpoints/subscription';
import {parseServerDate} from '../../lib/date';
import {planPrice} from '../performance/performanceLogic';

export {activePlans, planFeatures, planPrice, planState} from '../performance/performanceLogic';

const DAY = 86_400_000;

/** How far through the plan they are: total days, days left, and the share used (0–1). */
export function planProgress(
  sub: Pick<Subscription, 'subscription_start' | 'subscription_end'> | null | undefined,
  now = new Date(),
) {
  const start = parseServerDate(sub?.subscription_start);
  const end = parseServerDate(sub?.subscription_end);
  if (!start || !end || end < start) {
    return null;
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // The end date is the plan's last day.
  const totalDays = Math.round((end.getTime() - start.getTime()) / DAY) + 1;
  const daysLeft = Math.max(0, Math.round((end.getTime() - today.getTime()) / DAY) + 1);
  return {totalDays, daysLeft, used: Math.min(1, Math.max(0, 1 - daysLeft / totalDays))};
}

/** 7 → "7 days", 30 → "1 month", 90 → "3 months", 365 → "1 year". */
export function durationLabel(days: number) {
  if (days >= 360 && days % 365 <= 5) {
    const y = Math.round(days / 365);
    return `${y} ${y === 1 ? 'year' : 'years'}`;
  }
  if (days >= 28 && days % 30 <= 1) {
    const m = Math.round(days / 30);
    return `${m} ${m === 1 ? 'month' : 'months'}`;
  }
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

/** Whole percent off the full price, or null when there's no offer. */
export function savePercent(p: Pick<Plan, 'price' | 'discount_price'>) {
  const {now, was} = planPrice(p);
  return was ? Math.round(((was - now) / was) * 100) : null;
}

/** Rupees a day, rounded; null when under ₹1 (it would read "₹0/day"). */
export function perDay(p: Pick<Plan, 'price' | 'discount_price' | 'days'>) {
  const v = p.days > 0 ? Math.round(planPrice(p).now / p.days) : 0;
  return v >= 1 ? v : null;
}

export type FeatureLine = {name: string; included: boolean};

const cleanName = (n: string) => n.trim().replace(/Locetion/i, 'Location');

/**
 * Every feature the plans mention, in order, marked included or not, so plans
 * compare honestly. "No" and unset count as not included; duplicates merge.
 */
export function featureLines(features: PlanFeature[] | null | undefined): FeatureLine[] {
  const out = new Map<string, FeatureLine>();
  for (const f of features ?? []) {
    const value = (f.pivot?.feature_value ?? '').trim();
    const raw = cleanName(f.name);
    const name = /^access employees$/i.test(raw) && /^\d+$/.test(value) ? `Up to ${value} employees` : raw;
    const key = /^access employees$/i.test(raw) ? 'access employees' : raw.toLowerCase();
    const included = !!value && !/^no$/i.test(value);
    const had = out.get(key);
    if (!had || (!had.included && included)) {
      out.set(key, {name: included || !had ? name : had.name, included: included || !!had?.included});
    }
  }
  return [...out.values()].sort((a, b) => Number(b.included) - Number(a.included));
}

/** How many employees the plan allows, or null when it doesn't say. */
export function employeeLimit(plan: Pick<Plan, 'features'> | null | undefined) {
  for (const f of plan?.features ?? []) {
    const v = (f.pivot?.feature_value ?? '').trim();
    if (/^access employees$/i.test(f.name.trim()) && /^\d+$/.test(v)) {
      return Number(v);
    }
  }
  return null;
}

/** The plan lengths on offer, shortest first. */
export const planLengths = (plans: Pick<Plan, 'days'>[]) =>
  [...new Set(plans.map(p => p.days))].sort((a, b) => a - b);

/** The plan to show first: their current one if still on sale, else the most popular length's cheapest. */
export function defaultPlan(plans: Plan[], currentId?: number | null) {
  return plans.find(p => p.id === currentId) ?? plans.find(p => p.days === 90) ?? plans[0] ?? null;
}
