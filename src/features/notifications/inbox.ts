import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';
import {zustandStorage} from '../../lib/storage';
import type {InboxItem} from './inboxLogic';

export * from './inboxLogic';

const MAX = 100;

type InboxState = {
  items: InboxItem[];
  add: (item: Omit<InboxItem, 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
};

/**
 * Notifications this phone received. The server keeps no list, so this is the
 * only history there is; newest first, the last 100.
 */
export const useInbox = create<InboxState>()(
  persist(
    set => ({
      items: [],
      add: item =>
        set(s =>
          s.items.some(i => i.id === item.id)
            ? s
            : {items: [{...item, read: false}, ...s.items].slice(0, MAX)},
        ),
      markRead: id => set(s => ({items: s.items.map(i => (i.id === id ? {...i, read: true} : i))})),
      markAllRead: () => set(s => ({items: s.items.map(i => ({...i, read: true}))})),
      clear: () => set({items: []}),
    }),
    {name: 'notification_inbox', storage: createJSONStorage(() => zustandStorage)},
  ),
);
