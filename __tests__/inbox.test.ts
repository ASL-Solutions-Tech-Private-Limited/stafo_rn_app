import {linkOf, toInboxItem, unreadCount} from '../src/features/notifications/inboxLogic';

describe('push messages in the inbox', () => {
  it('takes title and text from the notification, or from data', () => {
    expect(
      toInboxItem({messageId: 'm1', sentTime: 1000, notification: {title: 'Leave approved', body: 'Enjoy'}}),
    ).toEqual({id: 'm1', title: 'Leave approved', body: 'Enjoy', at: 1000, data: undefined});
    expect(toInboxItem({messageId: 'm2', sentTime: 5, data: {message: 'Payslip ready'}})).toEqual({
      id: 'm2',
      title: 'STAFO',
      body: 'Payslip ready',
      at: 5,
      data: {message: 'Payslip ready'},
    });
  });

  it('skips empty messages and keeps only string data', () => {
    expect(toInboxItem({messageId: 'm3', data: {}})).toBeNull();
    expect(
      toInboxItem({
        messageId: 'm4',
        sentTime: 1,
        notification: {body: 'x'},
        data: {n: 3, link: 'stafo://tasks'},
      })?.data,
    ).toEqual({
      link: 'stafo://tasks',
    });
  });

  it('follows only stafo:// links and counts unread', () => {
    expect(linkOf({data: {link: 'stafo://claim/31'}})).toBe('stafo://claim/31');
    expect(linkOf({data: {url: 'https://evil.example'}})).toBeNull();
    expect(linkOf({})).toBeNull();
    expect(unreadCount([{read: true}, {read: false}, {read: false}] as never)).toBe(2);
  });
});
