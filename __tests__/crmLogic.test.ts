import {
  crmCounts,
  filterLeads,
  isFollowUpDue,
  leadInput,
  leadPhone,
  nextDate,
  phoneWasLost,
  stageOf,
} from '../src/features/crm/crmLogic';

// Production's 5 leads for company 1 (fetched 3 Oct 2026).
const leads = require('./fixtures/leads-company1.json').data;
const now = new Date(2026, 9, 3, 13);

describe('CRM rules on real leads', () => {
  it('reads stages, including the follow-up screen’s spelling', () => {
    expect(['New', 'customer', 'OnBoard', 'Onboarding', 'Lost', '', null].map(stageOf)).toEqual([
      'New',
      'Customer',
      'OnBoard',
      'OnBoard',
      'Lost',
      'New',
      'New',
    ]);
  });
  it('treats every stored phone as lost to the overflow', () => {
    expect(leads.map(leadPhone)).toEqual([null, null, null, null, null]);
    expect(leads.every(phoneWasLost)).toBe(true);
    expect(leadPhone({phone: '+91 98300 12345'})).toBe('9830012345');
  });
  it('ignores 0000-00-00 follow-up dates', () => {
    const l4 = leads.find((l: any) => l.id === 4);
    expect(nextDate(l4)).toBeNull();
    expect(nextDate(leads.find((l: any) => l.id === 5))).toBe('2025-05-30');
  });
  it('counts and orders the pipeline', () => {
    expect(crmCounts(leads, now)).toEqual({leads: 5, dueToday: 0, overdue: 3, won: 2});
    expect(
      isFollowUpDue(
        leads.find((l: any) => l.id === 3),
        now,
      ),
    ).toBe(false);
    expect(filterLeads(leads, 'all', '', now).map((l: any) => l.id)).toEqual([6, 9, 5, 4, 3]);
    expect(filterLeads(leads, 'won', '', now).map((l: any) => l.id)).toEqual([4, 3]);
    expect(filterLeads(leads, 'all', 'jio', now).map((l: any) => l.id)).toEqual([9, 3]);
  });
  it('rebuilds the whole lead for an update', () => {
    expect(leadInput(leads.find((l: any) => l.id === 4))).toMatchObject({
      employee_id: 78,
      status: 'OnBoard',
      next_date: '',
      lead_from: 'LinkedIn',
    });
  });
});
