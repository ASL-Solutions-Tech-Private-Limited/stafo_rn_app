import type {RawParam} from '../../api/endpoints/bbps';

/** Shown first on the Bills screen, in this order (the old app's eight). */
export const POPULAR = [
  'Mobile Prepaid',
  'Electricity',
  'DTH',
  'Water',
  'LPG Gas',
  'Fastag',
  'Loan Repayment',
  'Insurance',
];

/** Categories where the amount is the payer's choice (a recharge), as in the old app. */
const OPEN_AMOUNT = ['Mobile Prepaid', 'Mobile Postpaid', 'DTH', 'Fastag'];

export type Field = {
  name: string;
  numeric: boolean;
  optional: boolean;
  min: number;
  max: number;
  pattern: RegExp | null;
  /** A dropdown: from the biller's "values" list, or a pattern that only allows a fixed list. */
  choices: string[] | null;
  /** false: the biller wants it sent but not shown. */
  visible: boolean;
  /** A date, in the format the field's name asks for, e.g. "DOB of Student(DDMMYYYY)". */
  dateFormat: DateFormat | null;
  /** The biller asks for the amount itself (e.g. Sun Direct), so it replaces the app's amount box. */
  isAmount: boolean;
};

export type DateFormat = 'DDMMYYYY' | 'DD-MM-YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'YYYYMMDD';

const DATE_FORMATS: DateFormat[] = ['DD-MM-YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DDMMYYYY', 'YYYYMMDD'];

/** BBPS has no date type; dates are named like "Date of Birth (DD-MM-YYYY)". */
export function dateFormatOf(name: string): DateFormat | null {
  const n = name.toUpperCase().replace(/\s+/g, '');
  return DATE_FORMATS.find(f => n.includes(f)) ?? null;
}

/** "2009-04-07" → "07042009" for DDMMYYYY, and so on. */
export function formatBillDate(key: string, f: DateFormat) {
  const [y, m, d] = key.split('-');
  return {
    DDMMYYYY: `${d}${m}${y}`,
    'DD-MM-YYYY': `${d}-${m}-${y}`,
    'DD/MM/YYYY': `${d}/${m}/${y}`,
    'YYYY-MM-DD': `${y}-${m}-${d}`,
    YYYYMMDD: `${y}${m}${d}`,
  }[f];
}

/** Each group needs at least `input` of its fields filled. */
export function groupError(groups: {input: number; params: string[]}[], values: Record<string, string>) {
  const g = groups.find(
    x => x.params.filter(p => (values[p] ?? '').trim()).length < Math.min(x.input, x.params.length),
  );
  if (!g) {
    return null;
  }
  return g.input >= g.params.length
    ? `Fill in ${g.params.join(' and ')}.`
    : `Fill in at least ${g.input} of: ${g.params.join(', ')}.`;
}

/** "EMI Overdue,Total Overdue" → ["EMI Overdue", "Total Overdue"]; null when empty. */
export function valuesOf(values: string | undefined): string[] | null {
  const list = (values ?? '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
  return list.length ? list : null;
}

/** "^(Assam)$|^(Bihar)$" → ["Assam", "Bihar"]; null for any other pattern. */
export function choicesOf(regEx: string | undefined): string[] | null {
  if (!regEx) {
    return null;
  }
  const parts = regEx.split('|');
  const names = parts.map(p => p.match(/^\^\(([^()|^$\\[\]*+?{}]+)\)\$$/)?.[1]);
  return names.every(Boolean) ? (names as string[]) : null;
}

/** The biller's input fields, whether the server sent one object or a list. */
export function fieldsOf(params: RawParam | RawParam[] | null | undefined): Field[] {
  const list = Array.isArray(params) ? params : params ? [params] : [];
  return list
    .filter(p => p.paramName)
    .map(p => {
      let pattern: RegExp | null = null;
      try {
        pattern = p.regEx ? new RegExp(p.regEx) : null;
      } catch {
        pattern = null;
      }
      return {
        name: p.paramName!,
        numeric: (p.dataType ?? '').toUpperCase() === 'NUMERIC',
        optional: (p.isOptional ?? '').toLowerCase() === 'true',
        min: Number(p.minLength) || 0,
        max: Number(p.maxLength) || 0,
        pattern,
        choices: valuesOf(p.values) ?? choicesOf(p.regEx),
        visible: (p.visibility ?? 'true').toLowerCase() !== 'false',
        dateFormat: dateFormatOf(p.paramName!),
        isAmount: /^amount$/i.test(p.paramName!.trim()),
      };
    });
}

export function fieldError(f: Field, raw: string): string | null {
  const v = raw.trim();
  if (!v) {
    return f.optional ? null : `Enter your ${f.name}.`;
  }
  if (f.choices) {
    return f.choices.includes(v) ? null : `Choose a ${f.name}.`;
  }
  if (f.numeric && !/^\d+$/.test(v)) {
    return 'Numbers only.';
  }
  if (f.min && v.length < f.min) {
    return `At least ${f.min} characters.`;
  }
  if (f.max && v.length > f.max) {
    return `At most ${f.max} characters.`;
  }
  if (f.pattern && !f.pattern.test(v)) {
    return `Check your ${f.name}.`;
  }
  return null;
}

/** Billers whose fields are all optional want at least one of them (e.g. "LPG ID or mobile"). */
export function needsOneOf(fields: Field[], values: Record<string, string>) {
  return fields.length > 1 &&
    fields.every(f => f.optional) &&
    fields.every(f => !(values[f.name] ?? '').trim())
    ? `Fill in at least one: ${fields.map(f => f.name).join(', ')}.`
    : null;
}

/** "₹1,234.50" from paise. */
export function rupeesFromPaise(paise: number) {
  return formatAmount(paise / 100);
}

export function formatAmount(rupees: number) {
  return `₹${rupees.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

/** Whether the payer can change the fetched amount, and the least they may pay. */
/** "BASE_BILL_AMOUNT" → "Full bill"; "3 Months Amount" → "3 months". */
export function optionLabel(name: string) {
  if (/^base_bill_amount$/i.test(name)) {
    return 'Full bill';
  }
  return name
    .replace(/\s*amount\s*$/i, '')
    .replace(/_/g, ' ')
    .trim()
    .replace(/\bMonths?\b/, m => m.toLowerCase());
}

/** The bill's own top-up limits, e.g. FASTag "Minimum Amount for Top-up: 100.0" (rupees). */
export function billLimits(info: {name: string; value: string}[]) {
  const num = (re: RegExp) => {
    const v = info.find(i => re.test(i.name))?.value;
    const n = v ? Number(v.replace(/[^\d.]/g, '')) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  return {min: num(/minimum/i), max: num(/maximum/i)};
}

/** Quick amounts for recharges: round steps inside the limits. */
export function suggestedAmounts(min: number, max: number | undefined) {
  const steps = [100, 200, 300, 500, 1000, 2000, 5000];
  const start = Math.max(1, Math.ceil(min));
  const list = [start, ...steps.filter(s => s > start)].filter(a => max == null || a <= max);
  return Array.from(new Set(list)).slice(0, 5);
}

/** Combine the bill's rule with limits from the biller and the bill (rupees). */
export function withLimits(
  rule: {editable: boolean; min: number; max?: number},
  limits: {min: number | null; max: number | null},
) {
  const min = Math.max(rule.min, limits.min ?? 0);
  const maxes = [rule.max, limits.max ?? undefined].filter((n): n is number => n != null);
  return {...rule, min, max: maxes.length ? Math.min(...maxes) : undefined};
}

export function amountRule(category: string, exactness: string, billPaise: number) {
  const bill = billPaise / 100;
  if (OPEN_AMOUNT.includes(category)) {
    return {editable: true, min: 1};
  }
  const e = exactness.toLowerCase();
  if (e.includes('above')) {
    return {editable: true, min: bill};
  }
  if (e.includes('below')) {
    return {editable: true, min: 1, max: bill};
  }
  return {editable: false, min: bill};
}

export function amountError(raw: string, rule: {min: number; max?: number}) {
  const n = Number(raw);
  if (!raw.trim() || !Number.isFinite(n) || n <= 0) {
    return 'Enter an amount.';
  }
  if (!/^\d+(\.\d{1,2})?$/.test(raw.trim())) {
    return 'Use up to 2 decimal places.';
  }
  if (n < rule.min) {
    return `At least ${formatAmount(rule.min)}.`;
  }
  if (rule.max != null && n > rule.max) {
    return `At most ${formatAmount(rule.max)}.`;
  }
  return null;
}

/** "Bangalore Electricity Supply Co. Ltd (BESCOM)" → "BESCOM" for the avatar. */
export function shortBillerName(name: string) {
  const inBrackets = name.match(/\(([^)]+)\)\s*$/)?.[1];
  return inBrackets && inBrackets.length <= 12 ? inBrackets : name;
}
