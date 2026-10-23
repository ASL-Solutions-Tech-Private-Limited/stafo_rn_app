import {sessionMs} from '../src/features/people/dayPunches';

const H = 3_600_000;

test('sessions from the punch list', () => {
  // Nikhil, 22 Oct: 12:02 → 16:45, then 16:45 with no punch-out.
  const now = new Date(2026, 9, 23, 11, 0);
  expect(sessionMs({id: 1, punchIn: '2026-10-22 12:02:00', punchOut: '2026-10-22 16:45:00'}, now)).toBe(
    4 * H + 43 * 60_000,
  );
  // An open session on a past day doesn't count.
  expect(sessionMs({id: 2, punchIn: '2026-10-22 16:45:00', punchOut: null}, now)).toBe(0);
  // An open session today runs until now.
  expect(sessionMs({id: 3, punchIn: '2026-10-23 09:00:00', punchOut: null}, now)).toBe(2 * H);
  expect(sessionMs({id: 4, punchIn: null, punchOut: null}, now)).toBe(0);
});
