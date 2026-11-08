import { AxiosInstance } from 'axios';
import { createNotificationsApi } from '../notifications.api';

describe('notifications.api', () => {
  it('listsCurrentAccountsNotifications', async () => {
    const rawServerNotifications = [
      {
        notificationId: 'notif-001',
        title: 'Xác nhận đặt lịch khám',
        content: 'Lịch khám BK-001 đã được ghi nhận.',
        type: 'BOOKING',
        isRead: false,
        createdAt: '2026-11-07T08:00:00',
        updatedAt: '2026-11-07T08:00:00',
        account: {
          accountId: 'acc-secret',
          passwordHash: 'should-not-leak',
        },
      },
    ];

    const mockClient = {
      get: jest.fn().mockResolvedValue(rawServerNotifications),
    } as unknown as AxiosInstance;

    const api = createNotificationsApi(mockClient);
    const result = await api.listNotifications();

    expect(mockClient.get).toHaveBeenCalledWith('/api/utilities/notifications');
    expect(result).toEqual([
      {
        notificationId: 'notif-001',
        title: 'Xác nhận đặt lịch khám',
        content: 'Lịch khám BK-001 đã được ghi nhận.',
        type: 'BOOKING',
        isRead: false,
        createdAt: '2026-11-07T08:00:00',
        updatedAt: '2026-11-07T08:00:00',
      },
    ]);
    expect((result[0] as unknown as Record<string, unknown>).account).toBeUndefined();
  });

  it('marksOwnedNotificationRead', async () => {
    const mockClient = {
      put: jest.fn().mockResolvedValue(undefined),
    } as unknown as AxiosInstance;

    const api = createNotificationsApi(mockClient);
    await api.markNotificationRead('notif-001');

    expect(mockClient.put).toHaveBeenCalledWith(
      '/api/utilities/notifications/notif-001/read'
    );
  });

  it('marksAllNotificationsRead', async () => {
    const mockClient = {
      put: jest.fn().mockResolvedValue(undefined),
    } as unknown as AxiosInstance;

    const api = createNotificationsApi(mockClient);
    await api.markAllNotificationsRead();

    expect(mockClient.put).toHaveBeenCalledWith('/api/utilities/notifications/read-all');
  });
});

