import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  pushRegistrationManager,
  PushRegistrationManager,
} from '@/features/notifications/push-registration';
import { tokens } from '@/theme/tokens';

export interface NotificationSettingsScreenProps {
  manager?: PushRegistrationManager;
}

export default function NotificationSettingsScreen({
  manager = pushRegistrationManager,
}: NotificationSettingsScreenProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const optedIn = await manager.isPushOptedIn();
        if (active) {
          setEnabled(optedIn);
        }
      } catch {
        // Fallback
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [manager]);

  const handleToggle = async (nextValue: boolean) => {
    setSubmitting(true);
    setStatusMessage(null);
    try {
      if (nextValue) {
        const success = await manager.registerPushNotifications();
        if (success) {
          setEnabled(true);
          setStatusMessage('Đã bật thông báo đẩy thành công.');
        } else {
          setEnabled(false);
          setStatusMessage(
            'Quyền thông báo chưa được cấp từ hệ điều hành. Bạn có thể bật lại trong Cài đặt của máy bất cứ lúc nào.'
          );
        }
      } else {
        await manager.revokePushRegistration();
        setEnabled(false);
        setStatusMessage('Đã tắt nhận thông báo đẩy trên thiết bị này.');
      }
    } catch {
      setStatusMessage('Thao tác không thành công. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} testID="notification-settings-screen">
      <View style={styles.header}>
        <Pressable
          testID="notification-settings-back-button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Quay lại</Text>
        </Pressable>
        <Text style={styles.title}>Cài Đặt Thông Báo</Text>
        <Text style={styles.subtitle}>
          Quản lý nhận thông báo lịch khám, kết quả và viện phí trên thiết bị
        </Text>
      </View>

      {statusMessage ? (
        <View style={styles.statusBox} testID="notification-status-message">
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabelGroup}>
            <Text style={styles.switchTitle}>Nhận thông báo đẩy (Push Notifications)</Text>
            <Text style={styles.switchSubtitle}>
              Nhắc lịch khám trước 24h, cập nhật số thứ tự buồng khám, thông báo đơn thuốc & viện phí.
            </Text>
          </View>
          {loading || submitting ? (
            <ActivityIndicator size="small" color={tokens.colors.primary} />
          ) : (
            <Switch
              testID="notification-toggle-switch"
              value={enabled}
              onValueChange={handleToggle}
              trackColor={{ false: tokens.colors.border, true: tokens.colors.primary }}
            />
          )}
        </View>
      </View>

      <View style={styles.privacyCard}>
        <Text style={styles.privacyTitle}>🔒 Bảo Vệ Quyền Riêng Tư Y Tế</Text>
        <Text style={styles.privacyBody}>
          • Màn hình khóa của bạn không hiển thị chẩn đoán, tên thuốc hoặc chi tiết số tiền viện phí.{'\n'}
          • Thông báo đẩy chỉ đóng vai trò nhắc nhở an toàn.{'\n'}
          • Mọi dữ liệu lâm sàng chi tiết chỉ được tải xuống sau khi bạn mở ứng dụng và xác thực an toàn.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  container: {
    padding: tokens.spacing.xl,
  },
  header: {
    marginBottom: tokens.spacing.xl,
  },
  backButton: {
    marginBottom: tokens.spacing.md,
  },
  backButtonText: {
    color: tokens.colors.primary,
    fontWeight: '600',
    fontSize: tokens.typography.body,
  },
  title: {
    fontSize: tokens.typography.title,
    fontWeight: '700',
    color: tokens.colors.primaryDark,
    marginBottom: tokens.spacing.xs,
  },
  subtitle: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.textSecondary,
  },
  statusBox: {
    backgroundColor: tokens.colors.surface,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    marginBottom: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  statusText: {
    color: tokens.colors.textPrimary,
    fontSize: tokens.typography.body,
  },
  card: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginBottom: tokens.spacing.xl,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabelGroup: {
    flex: 1,
    paddingRight: tokens.spacing.lg,
  },
  switchTitle: {
    fontSize: tokens.typography.body,
    fontWeight: '600',
    color: tokens.colors.textPrimary,
    marginBottom: tokens.spacing.xs,
  },
  switchSubtitle: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.textSecondary,
    lineHeight: 18,
  },
  privacyCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  privacyTitle: {
    fontSize: tokens.typography.body,
    fontWeight: '700',
    color: tokens.colors.primaryDark,
    marginBottom: tokens.spacing.sm,
  },
  privacyBody: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.textSecondary,
    lineHeight: 20,
  },
});

