import type {SalaryLine} from '../../api/types';
import {toDateKey} from '../../lib/date';

/** "₹10,425.82", "₹10,000", "−₹500". Paise only when there are any. */
export function formatMoney(n: number) {
  const abs = Math.abs(n);
  const text = abs.toLocaleString('en-IN', {
    minimumFractionDigits: abs % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${n < 0 ? '−' : ''}₹${text}`;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export type PayParts = {
  basic: number;
  earnings: SalaryLine[];
  deductions: SalaryLine[];
  /** Loss of pay for absent days. */
  lossOfPay: number;
  expense: number;
};

export const sumLines = (lines: SalaryLine[]) => round2(lines.reduce((s, l) => s + Number(l.amount || 0), 0));

/** The old app's formula: basic + earnings + expenses − deductions − loss of pay. */
export function netPay(p: PayParts) {
  return round2(p.basic + sumLines(p.earnings) + p.expense - sumLines(p.deductions) - p.lossOfPay);
}

/**
 * Months salary can be run for. The save API takes only a month number and the
 * server assumes the current year, so it's January up to this month.
 */
export function payrollMonths(now = new Date()) {
  return Array.from({length: now.getMonth() + 1}, (_, i) => new Date(now.getFullYear(), i, 1));
}

export type ReportPeriod = 'this-month' | 'last-month';

export function periodRange(period: ReportPeriod, now = new Date()) {
  const offset = period === 'this-month' ? 0 : -1;
  const from = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return {from: toDateKey(from), to: toDateKey(to)};
}

export type PayStatus = 'paid' | 'ready' | 'no-basic';

export function payStatus(basic: string | number | null | undefined, paid: boolean): PayStatus {
  if (paid) {
    return 'paid';
  }
  return Number(basic) > 0 ? 'ready' : 'no-basic';
}
