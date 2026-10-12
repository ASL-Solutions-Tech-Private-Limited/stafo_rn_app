/** Pure helpers for push messages; no storage, so they run in tests. */

export type InboxItem = {
  id: string;
  title: string;
  body: string;
  /** Epoch ms when it arrived. */
  at: number;
  read: boolean;
  /** Extra data the server sent, e.g. a stafo:// link. */
  data?: Record<string, string>;
};

export const unreadCount = (items: InboxItem[]) => items.filter(i => !i.read).length;

/** Turns a push message into an inbox item; null when there's nothing to show. */
export function toInboxItem(m: {
  messageId?: string;
  sentTime?: number;
  notification?: {title?: string; body?: string} | null;
  data?: Record<string, unknown> | null;
}): Omit<InboxItem, 'read'> | null {
  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(m.data ?? {})) {
    if (typeof v === 'string') {
      data[k] = v;
    }
  }
  const title = (m.notification?.title ?? data.title ?? '').trim();
  const body = (m.notification?.body ?? data.body ?? data.message ?? '').trim();
  if (!title && !body) {
    return null;
  }
  const at = m.sentTime && m.sentTime > 0 ? m.sentTime : Date.now();
  return {
    id: m.messageId ?? `${at}-${title}-${body}`.slice(0, 120),
    title: title || 'STAFO',
    body,
    at,
    data: Object.keys(data).length ? data : undefined,
  };
}

/** A stafo:// link the message points to, if any. */
export function linkOf(item: Pick<InboxItem, 'data'>): string | null {
  const v = item.data?.link ?? item.data?.url ?? item.data?.deep_link;
  return v && /^stafo:\/\//.test(v) ? v : null;
}
