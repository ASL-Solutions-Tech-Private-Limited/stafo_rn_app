/**
 * Login by role (demo). The server has no role field yet, so the employee's
 * position decides: "HR" → HR, "Manager"/"Team Lead"/"Supervisor" → Manager.
 * A Manager's team is their department; an HR's employees are their branch.
 */
export type StaffRole = 'employee' | 'manager' | 'hr';

export const ROLE_LABEL: Record<StaffRole, string> = {employee: 'Employee', manager: 'Manager', hr: 'HR'};

export function roleFromPosition(position: string | null | undefined): StaffRole {
  const p = (position ?? '').toLowerCase();
  if (/\bhr\b|human resource/.test(p)) {
    return 'hr';
  }
  if (/manager|team ?lead|supervisor|\bhead\b/.test(p)) {
    return 'manager';
  }
  return 'employee';
}

export type DayStatus = 'in' | 'late' | 'leave' | 'absent';

export type Member = {
  id: number;
  name: string;
  position: string;
  status: DayStatus;
  /** "In 9:02 · Office", "Casual leave · till Fri"… */
  note: string;
};

export type RequestKind = 'leave' | 'punch' | 'claim' | 'device';

export type TeamRequest = {
  id: number;
  kind: RequestKind;
  person: string;
  position: string;
  title: string;
  detail: string;
  reason: string;
  /** Leave goes Manager → HR; the rest is one step. */
  stage: 'manager' | 'hr';
  /** Set when a Manager already approved a leave HR now sees. */
  managerApproved?: string;
  status: 'pending' | 'approved' | 'rejected' | 'forwarded';
};

const FIRST = [
  'Priya',
  'Rahul',
  'Meera',
  'Sourav',
  'Ankit',
  'Riya',
  'Sayan',
  'Pooja',
  'Arnab',
  'Sneha',
  'Kunal',
  'Ishita',
  'Debjit',
  'Tanya',
  'Rohit',
  'Ananya',
  'Vikram',
  'Moumita',
  'Aditya',
  'Nisha',
];
const LAST = [
  'Sen',
  'Kumar',
  'Bose',
  'Das',
  'Nair',
  'Ghosh',
  'Paul',
  'Shah',
  'Roy',
  'Iyer',
  'Gupta',
  'Dutta',
];
const ROLES = ['Executive', 'Senior Executive', 'Associate', 'Field Officer', 'Analyst'];

/** Same sample people every time, so a demo looks the same twice. */
export function demoMembers(count: number, seed = 1): Member[] {
  const statusAt = (i: number): DayStatus =>
    i === 1 ? 'late' : i === 2 ? 'leave' : i === 3 ? 'absent' : i >= 9 && i % 7 === 6 ? 'late' : 'in';
  return Array.from({length: count}, (_, i) => {
    const name = `${FIRST[(i * 7 + seed) % FIRST.length]} ${LAST[(i * 5 + seed) % LAST.length]}`;
    const status = statusAt(i);
    const minute = String((i * 13 + 2) % 60).padStart(2, '0');
    const note =
      status === 'in'
        ? `In 9:${minute} · ${i % 3 ? 'Office' : 'Field'}`
        : status === 'late'
        ? `In 10:${minute} · ${30 + ((i * 11) % 40)} min late`
        : status === 'leave'
        ? 'Casual leave · till Fri'
        : 'Not in yet';
    return {id: 1000 + i, name, position: ROLES[(i + seed) % ROLES.length], status, note};
  });
}

export function countByStatus(members: Member[]) {
  return members.reduce<Record<DayStatus, number>>((acc, m) => ({...acc, [m.status]: acc[m.status] + 1}), {
    in: 0,
    late: 0,
    leave: 0,
    absent: 0,
  });
}

/** What a Manager or HR finds waiting for them in the demo. */
export function demoRequests(role: Exclude<StaffRole, 'employee'>, members: Member[]): TeamRequest[] {
  const p = (i: number) => members[i % members.length] ?? {name: 'Demo Employee', position: 'Executive'};
  const base = (i: number) => ({person: p(i).name, position: p(i).position, status: 'pending' as const});
  if (role === 'manager') {
    return [
      {
        id: 1,
        kind: 'leave',
        ...base(2),
        title: 'Casual leave',
        detail: '23 – 24 Oct · 2 days',
        reason: 'Family function in Siliguri.',
        stage: 'manager',
      },
      {
        id: 2,
        kind: 'leave',
        ...base(5),
        title: 'Sick leave',
        detail: '21 Oct · 1 day',
        reason: 'Fever since last night.',
        stage: 'manager',
      },
      {
        id: 3,
        kind: 'punch',
        ...base(1),
        title: 'Missed punch-out',
        detail: '18 Oct · left 6:40 PM',
        reason: 'Phone battery died at the client site.',
        stage: 'manager',
      },
      {
        id: 4,
        kind: 'claim',
        ...base(0),
        title: 'Travel claim · ₹640',
        detail: 'Cab to client, 17 Oct',
        reason: 'Client meeting at Salt Lake.',
        stage: 'manager',
      },
      {
        id: 5,
        kind: 'claim',
        ...base(4),
        title: 'Food claim · ₹280',
        detail: 'Team lunch, 16 Oct',
        reason: 'Lunch during stock audit.',
        stage: 'manager',
      },
    ];
  }
  return [
    {
      id: 11,
      kind: 'leave',
      ...base(3),
      title: 'Earned leave',
      detail: '28 Oct – 1 Nov · 5 days',
      reason: 'Puja holidays with family.',
      stage: 'hr',
      managerApproved: 'Arjun Mehta',
    },
    {
      id: 12,
      kind: 'leave',
      ...base(6),
      title: 'Casual leave',
      detail: '25 Oct · 1 day',
      reason: 'Bank work.',
      stage: 'hr',
      managerApproved: 'Arjun Mehta',
    },
    {
      id: 13,
      kind: 'leave',
      ...base(9),
      title: 'Sick leave',
      detail: '20 – 21 Oct · 2 days',
      reason: 'Doctor’s advice to rest.',
      stage: 'hr',
      managerApproved: 'Sanjay Pal',
    },
    {
      id: 14,
      kind: 'device',
      ...base(7),
      title: 'New phone sign-in',
      detail: 'Samsung Galaxy A35 · Android 15',
      reason: 'Old phone was lost.',
      stage: 'hr',
    },
    {
      id: 15,
      kind: 'device',
      ...base(11),
      title: 'New phone sign-in',
      detail: 'iPhone 13 · iOS 18',
      reason: 'Changed phone.',
      stage: 'hr',
    },
    {
      id: 16,
      kind: 'claim',
      ...base(8),
      title: 'Travel claim · ₹1,250',
      detail: 'Train to Durgapur, 15 Oct',
      reason: 'Vendor visit.',
      stage: 'hr',
    },
    {
      id: 17,
      kind: 'claim',
      ...base(12),
      title: 'Stationery · ₹420',
      detail: 'Printer paper, 14 Oct',
      reason: 'Office supplies.',
      stage: 'hr',
    },
  ];
}

/** A Manager's OK on leave sends it on to HR; everything else is decided there and then. */
export function decide(r: TeamRequest, approve: boolean): TeamRequest['status'] {
  if (!approve) {
    return 'rejected';
  }
  return r.kind === 'leave' && r.stage === 'manager' ? 'forwarded' : 'approved';
}
