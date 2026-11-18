import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { bookingApi, BookingApi } from '@/features/booking/booking.api';
import { Booking } from '@/features/booking/booking.types';
import { BookingJourney } from '@/features/booking/components/BookingJourney';
import { tokens } from '@/theme/tokens';

export interface AppointmentDetailScreenProps {
  api?: BookingApi;
  bookingIdOverride?: string;
  onBack?: () => void;
}

export default function AppointmentDetailScreen({
  api = bookingApi,
  bookingIdOverride,
  onBack,
}: AppointmentDetailScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const bookingId = bookingIdOverride ?? params.bookingId ?? '';

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const loadBooking = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const list = await api.listMyBookings();
      const found = list.find((item) => item.bookingId === bookingId) ?? null;
      if (!found) {
        setErrorMessage('Không tìm thấy lịch khám thuộc tài khoản của bạn.');
      } else {
        setBooking(found);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error && err.message ? err.message : 'Không thể tải thông tin lịch khám.'
      );
    } finally {
      setLoading(false);
    }
  }, [api, bookingId]);

  useEffect(() => {
    void loadBooking();
  }, [loadBooking]);

  const handleConfirmCancel = async () => {
    setErrorMessage(null);
    try {
      await api.cancelBooking(bookingId);
      setConfirmCancel(false);
      await loadBooking();
    } catch (err) {
      setConfirmCancel(false);
      setErrorMessage(
        err instanceof Error && err.message ? err.message : 'Không thể hủy lịch khám.'
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.center} testID="appointment-detail-loading">
        <ActivityIndicator color={tokens.colors.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.center} testID="appointment-detail-error">
        <Text style={styles.errorText}>{errorMessage ?? 'Không tìm thấy lịch khám.'}</Text>
        <View style={styles.errorActionsRow}>
          <Pressable
            testID="appointment-detail-back-button"
            style={styles.errorBackBtn}
            onPress={handleBack}
          >
            <Text style={styles.errorBackBtnText}>Quay lại</Text>
          </Pressable>
          <Pressable
            testID="appointment-detail-retry-button"
            style={styles.errorRetryBtn}
            onPress={() => void loadBooking()}
          >
            <Text style={styles.errorRetryBtnText}>Thử lại</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const canCancel =
    booking.status === 'PENDING_PAYMENT' || booking.status === 'CONFIRMED';

  return (
    <ScrollView style={styles.screen} testID="appointment-detail-screen">
      <Text style={styles.title}>Chi tiết phiếu khám {booking.bookingCode}</Text>

      {errorMessage ? (
        <View style={styles.errorBox} testID="appointment-cancel-error">
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <View style={styles.infoCard}>
        <Text style={styles.meta}>Người bệnh: {booking.patientName}</Text>
        <Text style={styles.meta}>Chuyên khoa: {booking.departmentName}</Text>
        <Text style={styles.meta}>Bác sĩ: {booking.doctorName}</Text>
        <Text style={styles.meta}>Ngày khám: {booking.bookingDate}</Text>
      </View>

      <BookingJourney booking={booking} />

      {canCancel ? (
        <View style={styles.cancelSection}>
          {!confirmCancel ? (
            <Pressable
              testID="appointment-cancel-trigger"
              style={styles.cancelBtn}
              onPress={() => setConfirmCancel(true)}
            >
              <Text style={styles.cancelBtnText}>Hủy lịch khám</Text>
            </Pressable>
          ) : (
            <View style={styles.confirmBox} testID="appointment-cancel-confirm-box">
              <Text style={styles.confirmText}>
                Xác nhận hủy lịch khám {booking.bookingCode}?
              </Text>
              <View style={styles.confirmActionsRow}>
                <Pressable
                  testID="appointment-cancel-confirm-no"
                  style={styles.confirmCancelDismissBtn}
                  onPress={() => setConfirmCancel(false)}
                >
                  <Text style={styles.confirmCancelDismissText}>Quay lại</Text>
                </Pressable>
                <Pressable
                  testID="appointment-cancel-confirm-yes"
                  style={styles.confirmDangerBtn}
                  onPress={() => void handleConfirmCancel()}
                >
                  <Text style={styles.confirmDangerText}>Đồng ý hủy lịch</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.xl,
  },
  title: {
    fontSize: tokens.typography.title,
    fontWeight: '700',
    color: tokens.colors.primaryDark,
    marginBottom: tokens.spacing.md,
  },
  infoCard: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  meta: {
    fontSize: tokens.typography.body,
    color: tokens.colors.textPrimary,
    marginBottom: tokens.spacing.xs,
  },
  errorBox: {
    backgroundColor: tokens.colors.dangerBg,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    marginBottom: tokens.spacing.md,
  },
  errorText: {
    color: tokens.colors.danger,
  },
  errorActionsRow: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
    marginTop: tokens.spacing.lg,
  },
  errorBackBtn: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingHorizontal: tokens.spacing.lg,
    minHeight: 44,
    minWidth: 88,
    borderRadius: tokens.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBackBtnText: {
    color: tokens.colors.textSecondary,
    fontWeight: '600',
    fontSize: tokens.typography.caption,
  },
  errorRetryBtn: {
    backgroundColor: tokens.colors.primary,
    paddingHorizontal: tokens.spacing.lg,
    minHeight: 44,
    minWidth: 88,
    borderRadius: tokens.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorRetryBtnText: {
    color: tokens.colors.surface,
    fontWeight: '600',
    fontSize: tokens.typography.caption,
  },
  cancelSection: {
    marginTop: tokens.spacing.lg,
  },
  cancelBtn: {
    backgroundColor: tokens.colors.dangerBg,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelBtnText: {
    color: tokens.colors.danger,
    fontWeight: '600',
  },
  confirmBox: {
    backgroundColor: tokens.colors.warningBg,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
  },
  confirmText: {
    marginBottom: tokens.spacing.md,
    color: tokens.colors.textPrimary,
    fontWeight: '600',
  },
  confirmActionsRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  confirmCancelDismissBtn: {
    flex: 1,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  confirmCancelDismissText: {
    color: tokens.colors.textSecondary,
    fontWeight: '600',
  },
  confirmDangerBtn: {
    flex: 1,
    backgroundColor: tokens.colors.danger,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  confirmDangerText: {
    color: tokens.colors.surface,
    fontWeight: '600',
  },
});

