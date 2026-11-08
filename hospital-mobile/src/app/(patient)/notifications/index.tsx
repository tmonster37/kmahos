import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NotificationList } from '@/features/notifications/components/NotificationList';
import {
  notificationsApi,
  NotificationsApi,
} from '@/features/notifications/notifications.api';
import { PatientNotification } from '@/features/notifications/notifications.types';
import { tokens } from '@/theme/tokens';

export interface NotificationsInboxScreenProps {
  service?: NotificationsApi;
}

export default function NotificationsInboxScreen({
  service = notificationsApi,
}: NotificationsInboxScreenProps) {
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const list = await service.listNotifications();
      setNotifications(list);
    } catch (err) {
      setErrorMessage(
        err instanceof Error && err.message
          ? err.message
          : 'Không thể tải danh sách thông báo.'
      );
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const handleMarkOneRead = async (notificationId: string) => {
    setMarkingId(notificationId);
    setErrorMessage(null);
    try {
      await service.markNotificationRead(notificationId);
      await loadNotifications();
    } catch (err) {
      setErrorMessage(
        err instanceof Error && err.message
          ? err.message
          : 'Không thể đánh dấu thông báo đã đọc.'
      );
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    setErrorMessage(null);
    try {
      await service.markAllNotificationsRead();
      await loadNotifications();
    } catch (err) {
      setErrorMessage(
        err instanceof Error && err.message
          ? err.message
          : 'Không thể đánh dấu tất cả thông báo đã đọc.'
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const hasUnread = notifications.some((item) => !item.isRead);

  return (
    <ScrollView style={styles.screen} testID="notifications-inbox-screen">
      <View style={styles.headerRow}>
        <Text style={styles.title}>Hộp thư thông báo</Text>
        {hasUnread ? (
          <Pressable
            testID="mark-all-notifications-read-button"
            style={styles.markAllBtn}
            disabled={markingAll}
            onPress={() => void handleMarkAllRead()}
          >
            <Text style={styles.markAllBtnText}>Đọc tất cả</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.centerBox} testID="notifications-loading">
          <ActivityIndicator color={tokens.colors.primary} />
        </View>
      ) : null}

      {!loading && errorMessage ? (
        <View style={styles.errorBox} testID="notifications-error">
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable
            testID="notifications-retry-button"
            style={styles.retryBtn}
            onPress={() => void loadNotifications()}
          >
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && !errorMessage && notifications.length === 0 ? (
        <View style={styles.emptyBox} testID="notifications-empty">
          <Text style={styles.emptyText}>Hiện chưa có thông báo nào.</Text>
        </View>
      ) : null}

      {!loading && notifications.length > 0 ? (
        <NotificationList
          notifications={notifications}
          onMarkRead={(id) => void handleMarkOneRead(id)}
          markingId={markingId}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    padding: tokens.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  title: {
    fontSize: tokens.typography.title,
    fontWeight: '700',
    color: tokens.colors.primaryDark,
  },
  markAllBtn: {
    backgroundColor: tokens.colors.primary,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
  },
  markAllBtnText: {
    color: tokens.colors.surface,
    fontWeight: '600',
    fontSize: tokens.typography.caption,
  },
  centerBox: {
    paddingVertical: tokens.spacing.xl,
    alignItems: 'center',
  },
  errorBox: {
    backgroundColor: tokens.colors.dangerBg,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  },
  errorText: {
    color: tokens.colors.danger,
    marginBottom: tokens.spacing.sm,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: tokens.colors.surface,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
  },
  retryBtnText: {
    color: tokens.colors.danger,
    fontWeight: '600',
  },
  emptyBox: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  emptyText: {
    color: tokens.colors.textSecondary,
  },
});

