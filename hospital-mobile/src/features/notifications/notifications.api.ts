import { AxiosInstance } from 'axios';
import { apiClient } from '@/lib/api/client';
import { PatientNotification } from './notifications.types';

export interface NotificationsApi {
  listNotifications(): Promise<PatientNotification[]>;
  markNotificationRead(notificationId: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;
}

interface RawNotificationPayload {
  notificationId?: string;
  title?: string;
  content?: string;
  type?: string;
  isRead?: boolean;
  read?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export function sanitizeNotification(raw: RawNotificationPayload): PatientNotification {
  return {
    notificationId: String(raw.notificationId ?? ''),
    title: String(raw.title ?? ''),
    content: String(raw.content ?? ''),
    type: String(raw.type ?? 'GENERAL'),
    isRead: Boolean(raw.isRead ?? raw.read ?? false),
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
  };
}

export function createNotificationsApi(client: AxiosInstance = apiClient): NotificationsApi {
  return {
    async listNotifications(): Promise<PatientNotification[]> {
      const data = (await client.get(
        '/api/utilities/notifications'
      )) as unknown as RawNotificationPayload[];
      if (!Array.isArray(data)) {
        return [];
      }
      return data
        .map(sanitizeNotification)
        .filter((item) => item.notificationId.trim().length > 0);
    },

    async markNotificationRead(notificationId: string): Promise<void> {
      const cleanId = notificationId.trim();
      if (!cleanId) {
        throw new Error('Mã thông báo không hợp lệ.');
      }
      await client.put(`/api/utilities/notifications/${encodeURIComponent(cleanId)}/read`);
    },

    async markAllNotificationsRead(): Promise<void> {
      await client.put('/api/utilities/notifications/read-all');
    },
  };
}

export const notificationsApi = createNotificationsApi();

