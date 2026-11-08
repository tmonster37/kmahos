import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import NotificationsInboxScreen from '@/app/(patient)/notifications/index';
import { NotificationsApi } from '../notifications.api';
import { PatientNotification } from '../notifications.types';

describe('NotificationsInboxScreen', () => {
  it('showsNotificationEmptyAndErrorStates', async () => {
    const failingThenEmptyService: NotificationsApi = {
      listNotifications: jest
        .fn()
        .mockRejectedValueOnce(new Error('Không thể tải thông báo từ máy chủ.'))
        .mockResolvedValueOnce([]),
      markNotificationRead: jest.fn(),
      markAllNotificationsRead: jest.fn(),
    };

    const { findByTestId, getByTestId } = render(
      <NotificationsInboxScreen service={failingThenEmptyService} />
    );

    const errorBanner = await findByTestId('notifications-error');
    expect(errorBanner).toBeTruthy();

    fireEvent.press(getByTestId('notifications-retry-button'));

    const emptyBanner = await findByTestId('notifications-empty');
    expect(emptyBanner).toBeTruthy();
  });

  it('marksOwnedNotificationRead and marksAllNotificationsRead via server refresh', async () => {
    const unreadList: PatientNotification[] = [
      {
        notificationId: 'notif-10',
        title: 'Thông báo lịch khám',
        content: 'Nhắc lịch khám sáng mai.',
        type: 'REMINDER',
        isRead: false,
        createdAt: '2026-11-07T09:00:00',
      },
      {
        notificationId: 'notif-20',
        title: 'Thông báo quầy tiếp đón',
        content: 'Vui lòng đến quầy số 2.',
        type: 'QUEUE',
        isRead: false,
        createdAt: '2026-11-07T09:05:00',
      },
    ];

    const afterOneReadList: PatientNotification[] = [
      { ...unreadList[0], isRead: true },
      unreadList[1],
    ];

    const afterAllReadList: PatientNotification[] = [
      { ...unreadList[0], isRead: true },
      { ...unreadList[1], isRead: true },
    ];

    const mockService: NotificationsApi = {
      listNotifications: jest
        .fn()
        .mockResolvedValueOnce(unreadList)
        .mockResolvedValueOnce(afterOneReadList)
        .mockResolvedValueOnce(afterAllReadList),
      markNotificationRead: jest.fn().mockResolvedValue(undefined),
      markAllNotificationsRead: jest.fn().mockResolvedValue(undefined),
    };

    const { findByTestId, getByTestId } = render(
      <NotificationsInboxScreen service={mockService} />
    );

    await findByTestId('notification-item-notif-10');
    fireEvent.press(getByTestId('mark-read-button-notif-10'));

    await waitFor(() => {
      expect(mockService.markNotificationRead).toHaveBeenCalledWith('notif-10');
      expect(getByTestId('notification-status-notif-10').props.children).toBe('Đã đọc');
      expect(getByTestId('notification-status-notif-20').props.children).toBe('Chưa đọc');
    });

    fireEvent.press(getByTestId('mark-all-notifications-read-button'));

    await waitFor(() => {
      expect(mockService.markAllNotificationsRead).toHaveBeenCalledTimes(1);
      expect(getByTestId('notification-status-notif-20').props.children).toBe('Đã đọc');
    });
  });
});

