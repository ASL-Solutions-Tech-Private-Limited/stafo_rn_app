import type {SalaryLine} from '../src/api/types';
import {
  formatMoney,
  netPay,
  payStatus,
  payrollMonths,
  periodRange,
} from '../src/features/payroll/payrollLogic';

const line = (label: string, amount: number, payment_type = 'Earning'): SalaryLine => ({
  id: label.length,
  label,
  amount,
  amount_type: 'Flat',
  payment_type,
});

describe('netPay', () => {
  it("reproduces the server's preview for Demo Employee", () => {
    const earnings = [2600, 1200, 400, 2000, 600, 1000].map((a, i) => line(`e${i}`, a));
    const deductions = [
      line('ESIC', 0, 'Deduction'),
      line('PT', 100, 'Deduction'),
      line('IT', 500, 'Deduction'),
    ];
    expect(netPay({basic: 10000, earnings, deductions, lossOfPay: 6774.18, expense: 0})).toBe(10425.82);
  });
  it('adds expenses and reflects an adjusted line', () => {
    expect(
      netPay({basic: 9000, earnings: [line('HRA', 1000)], deductions: [], lossOfPay: 0, expense: 250.5}),
    ).toBe(10250.5);
  });
});

describe('formatMoney', () => {
  it('shows paise only when present, Indian grouping, a real minus sign', () => {
    expect(formatMoney(10425.82)).toBe('₹10,425.82');
    expect(formatMoney(1250000)).toBe('₹12,50,000');
    expect(formatMoney(-500)).toBe('−₹500');
  });
});

describe('periods and months', () => {
  const now = new Date(2026, 9, 1);
  it('covers whole calendar months', () => {
    expect(periodRange('this-month', now)).toEqual({from: '2026-10-01', to: '2026-10-31'});
    expect(periodRange('last-month', now)).toEqual({from: '2026-09-01', to: '2026-09-30'});
    expect(periodRange('last-month', new Date(2026, 0, 15))).toEqual({from: '2025-12-01', to: '2025-12-31'});
  });
  it('offers January to this month of the current year only', () => {
    const months = payrollMonths(now);
    expect(months).toHaveLength(10);
    expect(months[9].getMonth()).toBe(9);
  });
});

describe('payStatus', () => {
  it('sorts people into paid, ready and no basic', () => {
    expect(payStatus('10000.00', false)).toBe('ready');
    expect(payStatus('0.00', false)).toBe('no-basic');
    expect(payStatus(null, false)).toBe('no-basic');
    expect(payStatus('0.00', true)).toBe('paid');
  });
});
