import type {CategoryField, Claim, ExpenseCategory} from '../../api/endpoints/expenses';

export type ClaimPhase = 'waiting' | 'approved' | 'rejected';

export const CLAIM_LABEL: Record<ClaimPhase, string> = {
  waiting: 'Waiting',
  approved: 'Approved',
  rejected: 'Rejected',
};

/** "Pending" (or anything unknown) is waiting. */
export function claimPhase(status: string | null | undefined): ClaimPhase {
  const s = (status ?? '').trim().toLowerCase();
  return s === 'approved' ? 'approved' : s === 'rejected' ? 'rejected' : 'waiting';
}

export type FieldKind = 'text' | 'notes' | 'number' | 'date';

export const FIELD_KINDS: {kind: FieldKind; label: string; server: string}[] = [
  {kind: 'text', label: 'Text', server: 'text'},
  {kind: 'notes', label: 'Notes', server: 'textarea'},
  {kind: 'number', label: 'Number', server: 'number'},
  {kind: 'date', label: 'Date', server: 'date'},
];

/** The server stores "text" and "Text" alike; unknown types are plain text. */
export function fieldKind(type: string | null | undefined): FieldKind {
  switch ((type ?? '').trim().toLowerCase()) {
    case 'textarea':
      return 'notes';
    case 'number':
      return 'number';
    case 'date':
      return 'date';
    default:
      return 'text';
  }
}

export const serverType = (kind: FieldKind) => FIELD_KINDS.find(k => k.kind === kind)!.server;

export const needsDocument = (c: Pick<ExpenseCategory, 'is_document_req'> | null | undefined) =>
  (c?.is_document_req ?? '').trim().toLowerCase() === 'yes';

/** A category's fields people fill in, in order. */
export function activeFields(c: ExpenseCategory | null | undefined): CategoryField[] {
  return [...(c?.expense_forms ?? [])]
    .filter(f => (f.status ?? 'Active').toLowerCase() === 'active')
    .sort((a, b) => a.id - b.id);
}

export const amountOf = (c: Pick<Claim, 'amount'>) => {
  const n = Number(String(c.amount ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/** Waiting first (oldest first, so nothing sits forgotten), then the rest newest first. */
export function sortClaims<T extends Pick<Claim, 'id' | 'status'>>(claims: T[]): T[] {
  return [...claims].sort((a, b) => {
    const wa = claimPhase(a.status) === 'waiting';
    const wb = claimPhase(b.status) === 'waiting';
    if (wa !== wb) {
      return wa ? -1 : 1;
    }
    return wa ? a.id - b.id : b.id - a.id;
  });
}

export function claimTotals(claims: Pick<Claim, 'status' | 'amount'>[]) {
  const t = {waiting: 0, approved: 0, rejected: 0, waitingAmount: 0, approvedAmount: 0};
  for (const c of claims) {
    const p = claimPhase(c.status);
    t[p]++;
    if (p === 'waiting') {
      t.waitingAmount += amountOf(c);
    } else if (p === 'approved') {
      t.approvedAmount += amountOf(c);
    }
  }
  return t;
}

export type ClaimFilter = 'all' | ClaimPhase;

export const filterClaims = <T extends Pick<Claim, 'status'>>(claims: T[], f: ClaimFilter) =>
  f === 'all' ? claims : claims.filter(c => claimPhase(c.status) === f);

/** The claim's filled-in values in a few words, e.g. "Hamid · For deal" (dates and numbers left out). */
export function claimSummary(claim: Pick<Claim, 'expense_details'>, category?: ExpenseCategory | null) {
  const kinds = new Map(activeFields(category).map(f => [f.id, fieldKind(f.field_type)]));
  return (claim.expense_details ?? [])
    .filter(d => (kinds.get(d.expenseform_id) ?? 'text') === 'text' && d.expense_value?.trim())
    .slice(0, 2)
    .map(d => d.expense_value!.trim())
    .join(' · ');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** How the old app saved dates in claims: "25 Jun 2025". */
export function toClaimDate(d: Date) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "25 Jun 2025" (or "2025-06-25") back to a Date. */
export function fromClaimDate(value: string | null | undefined): Date | null {
  const v = (value ?? '').trim();
  const m = /^(\d{1,2}) ([A-Za-z]{3})\w* (\d{4})$/.exec(v);
  if (m) {
    const month = MONTHS.findIndex(x => x.toLowerCase() === m[2].toLowerCase());
    return month < 0 ? null : new Date(+m[3], month, +m[1]);
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return iso ? new Date(+iso[1], +iso[2] - 1, +iso[3]) : null;
}

/** Why the claim can't be sent yet, per field id (and amount / files), or an empty object. */
export function claimErrors(
  category: ExpenseCategory | null | undefined,
  amount: string,
  values: Record<number, string>,
  fileCount: number,
  editing = false,
) {
  const e: Record<string, string> = {};
  if (!category) {
    e.category = 'Pick what it was for.';
    return e;
  }
  const a = amount.trim();
  if (!a) {
    e.amount = 'Enter the amount.';
  } else if (!/^\d+(\.\d{1,2})?$/.test(a) || Number(a) <= 0) {
    e.amount = 'Enter an amount above 0, like 250.';
  }
  for (const f of activeFields(category)) {
    const v = (values[f.id] ?? '').trim();
    if (!v) {
      e[f.id] = `Fill in ${f.field_name.trim()}.`;
    } else if (fieldKind(f.field_type) === 'number' && !/^-?\d+(\.\d+)?$/.test(v)) {
      e[f.id] = 'Numbers only.';
    }
  }
  if (!editing && needsDocument(category) && !fileCount) {
    e.files = 'This category needs a bill. Add a photo or file.';
  }
  return e;
}
