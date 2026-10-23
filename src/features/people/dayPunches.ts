import type {DayPunch} from '../../api/endpoints/employee';
import {parseServerDate} from '../../lib/date';

/** Length of one punch-in → punch-out session; an open one runs until now, but only today. */
export function sessionMs(p: DayPunch, now = new Date()) {
  const start = p.punchIn ? parseServerDate(p.punchIn) : null;
  if (!start) {
    return 0;
  }
  const out = p.punchOut ? parseServerDate(p.punchOut) : null;
  const end = out ?? (start.toDateString() === now.toDateString() ? now : null);
  return end ? Math.max(0, end.getTime() - start.getTime()) : 0;
}
