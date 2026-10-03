import type {Lead, LeadInput} from '../../api/endpoints/crm';
import {toDateKey} from '../../lib/date';

export const STAGES = ['New', 'Contacted', 'Qualified', 'Customer', 'OnBoard', 'Lost'] as const;
export type Stage = (typeof STAGES)[number];
export const SOURCES = ['Facebook', 'Instagram', 'LinkedIn', 'Google Ads', 'Referral'] as const;
export const FOLLOW_UP_TYPES = [
  {value: 'By Call', label: 'By call'},
  {value: 'By Visiting', label: 'By visit'},
] as const;

/** The stored stage, tidied ("Onboarding" was the follow-up screen's spelling of OnBoard). */
export function stageOf(raw: string | null | undefined): Stage {
  const s = (raw ?? '').trim().toLowerCase();
  if (s === 'onboarding' || s === 'onboard' || s === 'on board') {
    return 'OnBoard';
  }
  return STAGES.find(x => x.toLowerCase() === s) ?? 'New';
}

export const isWon = (s: Stage) => s === 'Customer' || s === 'OnBoard';
export const isClosed = (s: Stage) => isWon(s) || s === 'Lost';

/** The server's numeric phone column stores this when a real mobile overflows it. */
const OVERFLOWED = '2147483647';

/** A usable phone number, or null (missing, or lost to the server's overflow). */
export function leadPhone(l: Pick<Lead, 'phone'>) {
  const p = l.phone == null ? '' : String(l.phone).replace(/\D/g, '');
  if (!p || p === OVERFLOWED || p.length < 10) {
    return null;
  }
  return p.length > 10 ? p.slice(-10) : p;
}
export const phoneWasLost = (l: Pick<Lead, 'phone'>) => String(l.phone ?? '') === OVERFLOWED;

/** The next follow-up date key, ignoring the server's "0000-00-00". */
export function nextDate(l: Pick<Lead, 'next_date'>) {
  const d = (l.next_date ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && !d.startsWith('0000') ? d : null;
}

/** Open leads with a follow-up due today or earlier. */
export function isFollowUpDue(l: Pick<Lead, 'next_date' | 'status'>, now = new Date()) {
  const d = nextDate(l);
  return !!d && d <= toDateKey(now) && !isClosed(stageOf(l.status));
}

export function crmCounts(leads: Pick<Lead, 'next_date' | 'status'>[], now = new Date()) {
  const today = toDateKey(now);
  return {
    leads: leads.length,
    dueToday: leads.filter(l => nextDate(l) === today && !isClosed(stageOf(l.status))).length,
    overdue: leads.filter(l => isFollowUpDue(l, now) && nextDate(l)! < today).length,
    won: leads.filter(l => isWon(stageOf(l.status))).length,
  };
}

export type StageFilter = 'all' | Stage | 'won';

/** Leads for a stage chip and a search, follow-ups due first. */
export function filterLeads<T extends Lead>(
  leads: T[],
  filter: StageFilter,
  search: string,
  now = new Date(),
) {
  const q = search.trim().toLowerCase();
  return leads
    .filter(l => {
      const s = stageOf(l.status);
      const stageOk = filter === 'all' || (filter === 'won' ? isWon(s) : s === filter);
      const text = `${l.name} ${l.company_name ?? ''} ${l.email ?? ''}`.toLowerCase();
      return stageOk && (!q || text.includes(q));
    })
    .sort((a, b) => {
      const da = isFollowUpDue(a, now) ? 0 : 1;
      const db = isFollowUpDue(b, now) ? 0 : 1;
      return da - db || (nextDate(a) ?? '9999').localeCompare(nextDate(b) ?? '9999') || b.id - a.id;
    });
}

/** Everything update needs, from the lead as stored (the API replaces the whole lead). */
export function leadInput(l: Lead): LeadInput {
  return {
    employee_id: l.employee_id ?? l.employee?.id ?? 0,
    name: l.name ?? '',
    company_name: l.company_name ?? '',
    company_address: l.company_address ?? '',
    email: l.email ?? '',
    phone: l.phone == null ? '' : String(l.phone),
    notes: l.notes ?? '',
    status: stageOf(l.status),
    lead_from: l.lead_from ?? '',
    next_date: nextDate(l) ?? '',
  };
}
