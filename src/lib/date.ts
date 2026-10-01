const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date as yyyy-MM-dd (what the server uses for "today"). */
export function toDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Parses the server's timestamps. "yyyy-MM-dd HH:mm:ss" is local wall-clock
 * time; ISO strings with a zone are parsed as-is.
 */
export function parseServerDate(value?: string | null): Date | null {
  if (!value || value.startsWith('0000')) {
    return null;
  }
  const local = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(value.trim());
  if (local) {
    const [, y, mo, d, h = '0', mi = '0', s = '0'] = local;
    return new Date(+y, +mo - 1, +d, +h, +mi, +s);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatTime(date: Date) {
  const h = date.getHours();
  return `${h % 12 || 12}:${pad(date.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
}

/**
 * Parses a time of day. The server stores shift times in both 24-hour
 * ("18:00", "18:00:00") and 12-hour ("06:00 PM") formats.
 */
export function parseClock(value?: string | null): {hours: number; minutes: number; seconds: number} | null {
  const match = value ? /^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?\s*$/.exec(value) : null;
  if (!match) {
    return null;
  }
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? 0);
  const meridiem = match[4]?.toUpperCase();
  if (meridiem) {
    if (hours < 1 || hours > 12) {
      return null;
    }
    hours = (hours % 12) + (meridiem === 'PM' ? 12 : 0);
  }
  if (hours > 23 || minutes > 59 || seconds > 59) {
    return null;
  }
  return {hours, minutes, seconds};
}

/** That time of day on the given yyyy-MM-dd date. */
export function atClock(dateKey: string, value?: string | null): Date | null {
  const clock = parseClock(value);
  const day = parseServerDate(dateKey);
  if (!clock || !day) {
    return null;
  }
  day.setHours(clock.hours, clock.minutes, clock.seconds, 0);
  return day;
}

/** "18:00", "18:00:00" or "06:00 PM" → "6:00 PM". */
export function formatClock(value?: string | null) {
  const clock = parseClock(value);
  if (!clock) {
    return value ?? '';
  }
  const d = new Date();
  d.setHours(clock.hours, clock.minutes, 0, 0);
  return formatTime(d);
}

export function formatDay(date: Date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function formatLongDate(date = new Date()) {
  return `${DAYS_LONG[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function weekdayShort(date: Date) {
  return DAYS[date.getDay()];
}

/**
 * "12 Oct", "12 – 14 Oct", "30 Sep – 2 Oct"; the year is added when the range
 * isn't in the current year ("30 Jun 2025").
 */
export function formatRange(from?: string | null, to?: string | null, now = new Date()) {
  const a = parseServerDate(from);
  const b = parseServerDate(to);
  if (!a) {
    return '';
  }
  const end = b ?? a;
  const year = end.getFullYear() !== now.getFullYear() ? ` ${end.getFullYear()}` : '';
  if (!b || toDateKey(a) === toDateKey(b)) {
    return `${formatDay(a)}${year}`;
  }
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()} – ${b.getDate()} ${MONTHS[b.getMonth()]}${year}`;
  }
  const startYear = a.getFullYear() !== b.getFullYear() ? ` ${a.getFullYear()}` : '';
  return `${formatDay(a)}${startYear} – ${formatDay(b)}${year}`;
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) {
    return 'Good morning';
  }
  if (h < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

/** 5025000 → "1h 23m". */
export function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h ? `${h}h ${pad(m)}m` : `${m}m`;
}

/** 5025000 → "01:23:45". */
export function formatStopwatch(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}
