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
  /** Set when the pattern only allows a fixed list (e.g. Circle: "^(Assam)$|^(Bihar)$…"). */
  choices: string[] | null;
  /** The biller asks for the amount itself (e.g. Sun Direct), so it replaces the app's amount box. */
  isAmount: boolean;
};

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
        choices: choicesOf(p.regEx),
        isAmount: /^amount$/i.test(p.paramName!.trim()),
      };
    });
}

export function fieldError(f: Field, raw: string): string | null {
  const v = raw.trim();
  if (!v) {
    return f.optional ? null : `Enter your ${f.name}.`;
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
