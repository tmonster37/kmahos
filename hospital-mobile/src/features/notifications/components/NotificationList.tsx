import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PatientNotification } from '../notifications.types';
import { tokens } from '@/theme/tokens';

export interface NotificationListProps {
  notifications: PatientNotification[];
  onMarkRead: (notificationId: string) => void;
  markingId?: string | null;
}

export function NotificationList({
  notifications,
  onMarkRead,
  markingId,
}: NotificationListProps) {
  return (
    <View testID="notification-list">
      {notifications.map((item) => (
        <View
          key={item.notificationId}
          testID={`notification-item-${item.notificationId}`}
          style={[styles.card, !item.isRead && styles.cardUnread]}
        >
          <View style={styles.headerRow}>
            <Text style={styles.title}>{item.title}</Text>
            <Text
              style={[styles.badge, item.isRead ? styles.badgeRead : styles.badgeUnread]}
              testID={`notification-status-${item.notificationId}`}
            >
              {item.isRead ? 'Đã đọc' : 'Chưa đọc'}
            </Text>
          </View>

          <Text style={styles.content}>{item.content}</Text>

          {item.createdAt ? <Text style={styles.timestamp}>{item.createdAt}</Text> : null}

          {!item.isRead ? (
            <Pressable
              testID={`mark-read-button-${item.notificationId}`}
              style={styles.markReadBtn}
              disabled={markingId === item.notificationId}
              onPress={() => onMarkRead(item.notificationId)}
            >
              <Text style={styles.markReadBtnText}>Đánh dấu đã đọc</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginBottom: tokens.spacing.sm,
  },
  cardUnread: {
    borderColor: tokens.colors.primary,
    backgroundColor: tokens.colors.primaryLight,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  title: {
    fontSize: tokens.typography.body,
    fontWeight: '700',
    color: tokens.colors.textPrimary,
    flex: 1,
    marginRight: tokens.spacing.sm,
  },
  badge: {
    fontSize: tokens.typography.caption,
    fontWeight: '600',
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
  },
  badgeUnread: {
    color: tokens.colors.primaryDark,
  },
  badgeRead: {
    color: tokens.colors.textMuted,
  },
  content: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.textSecondary,
    marginBottom: tokens.spacing.xs,
  },
  timestamp: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    marginBottom: tokens.spacing.xs,
  },
  markReadBtn: {
    alignSelf: 'flex-start',
    marginTop: tokens.spacing.xs,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.colors.primary,
  },
  markReadBtnText: {
    color: tokens.colors.surface,
    fontSize: tokens.typography.caption,
    fontWeight: '600',
  },
});

