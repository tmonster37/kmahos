import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { bookingApi, BookingApi } from '@/features/booking/booking.api';
import { SlotReservation } from '@/features/booking/booking.types';
import { reservationsApi, ReservationsApi } from '@/features/booking/reservations.api';
import { profilesApi, ProfilesApi } from '@/features/profiles/profiles.api';
import { PatientProfile } from '@/features/profiles/profiles.types';
import { ApiClientError } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';

export interface SlotReservationScreenProps {
  timeSlotIdOverride?: string;
  profilesService?: ProfilesApi;
  reservationsService?: ReservationsApi;
  bookingService?: BookingApi;
  onConflictRefresh?: () => Promise<void> | void;
}

export default function SlotReservationScreen({
  timeSlotIdOverride,
  profilesService = profilesApi,
  reservationsService = reservationsApi,
  bookingService = bookingApi,
  onConflictRefresh,
}: SlotReservationScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ timeSlotId?: string }>();
  const timeSlotId = timeSlotIdOverride ?? params.timeSlotId ?? '';

  const [profiles, setProfiles] = useState<PatientProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [reservation, setReservation] = useState<SlotReservation | null>(null);
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeReservationIdRef = useRef<string | null>(null);
  const activeReservationProfileIdRef = useRef<string | null>(null);
  const reservationSeqRef = useRef(0);
  const selectedProfileIdRef = useRef('');
  const bookingConfirmedRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await profilesService.listMyProfiles();
        if (!active) return;
        setProfiles(list);
        if (list.length > 0) {
          setSelectedProfileId(list[0].patientProfileId);
          selectedProfileIdRef.current = list[0].patientProfileId;
        }
      } catch (err) {
        if (active) {
          setErrorMessage(
            err instanceof Error && err.message ? err.message : 'Không thể tải danh sách hồ sơ.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      if (activeReservationIdRef.current && !bookingConfirmedRef.current) {
        void reservationsService.releaseSlot(activeReservationIdRef.current).catch(() => undefined);
      }
    };
  }, [profilesService, reservationsService]);

  const handleSelectProfile = (profileId: string) => {
    if (submitting) return;
    if (profileId === selectedProfileId) return;

    reservationSeqRef.current += 1;

    const currentResId = activeReservationIdRef.current;
    if (currentResId) {
      activeReservationIdRef.current = null;
      activeReservationProfileIdRef.current = null;
      setReservation(null);
      void reservationsService.releaseSlot(currentResId).catch(() => undefined);
    }
    setSelectedProfileId(profileId);
    selectedProfileIdRef.current = profileId;
  };

  const handleReserveSlot = async () => {
    if (submitting) return;
    if (!selectedProfileId) {
      setErrorMessage('Vui lòng chọn hồ sơ bệnh nhân.');
      return;
    }
    const requestedProfileId = selectedProfileId;
    const requestSeq = ++reservationSeqRef.current;
    setErrorMessage(null);
    setConflictMessage(null);
    setSubmitting(true);
    try {
      const held = await reservationsService.reserveSlot(timeSlotId, requestedProfileId);
      const isStale =
        !isMountedRef.current ||
        requestSeq !== reservationSeqRef.current ||
        requestedProfileId !== selectedProfileIdRef.current;

      if (isStale) {
        void reservationsService.releaseSlot(held.reservationId).catch(() => undefined);
        return;
      }
      activeReservationIdRef.current = held.reservationId;
      activeReservationProfileIdRef.current = requestedProfileId;
      setReservation(held);
    } catch (err) {
      if (!isMountedRef.current || requestSeq !== reservationSeqRef.current) return;
      if (err instanceof ApiClientError && (err.status === 409 || err.status === 400)) {
        setConflictMessage(
          err.message || 'Khung giờ vừa được đặt đầy hoặc hết hạn. Đang cập nhật lại lịch khám.'
        );
        await onConflictRefresh?.();
      } else {
        setErrorMessage(
          err instanceof Error && err.message ? err.message : 'Không thể giữ chỗ khung giờ.'
        );
      }
    } finally {
      if (isMountedRef.current && requestSeq === reservationSeqRef.current) {
        setSubmitting(false);
      }
    }
  };

  const handleCancelAndRelease = async () => {
    if (submitting) return;
    const currentResId = activeReservationIdRef.current;
    if (currentResId) {
      activeReservationIdRef.current = null;
      activeReservationProfileIdRef.current = null;
      setReservation(null);
      await reservationsService.releaseSlot(currentResId).catch(() => undefined);
    }
    router.back();
  };

  const handleCreateBooking = async () => {
    if (submitting) return;
    if (!reservation) {
      setErrorMessage('Vui lòng giữ chỗ khung giờ trước khi xác nhận đặt khám.');
      return;
    }
    const bookingProfileId = activeReservationProfileIdRef.current ?? selectedProfileId;
    if (!bookingProfileId || bookingProfileId !== selectedProfileId) {
      setErrorMessage('Hồ sơ bệnh nhân không khớp với phiên giữ chỗ. Vui lòng giữ chỗ lại.');
      return;
    }
    if (!symptoms.trim()) {
      setErrorMessage('Vui lòng nhập triệu chứng ban đầu.');
      return;
    }
    setErrorMessage(null);
    setConflictMessage(null);
    setSubmitting(true);
    try {
      const created = await bookingService.createBooking({
        patientProfileId: bookingProfileId,
        timeSlotId,
        symptoms: symptoms.trim(),
        reservationId: reservation.reservationId,
      });
      if (!isMountedRef.current) return;
      bookingConfirmedRef.current = true;
      activeReservationIdRef.current = null;
      activeReservationProfileIdRef.current = null;
      router.replace(`/(patient)/appointments/${created.bookingId}` as never);
    } catch (err) {
      if (!isMountedRef.current) return;
      if (activeReservationIdRef.current) {
        const toRelease = activeReservationIdRef.current;
        activeReservationIdRef.current = null;
        activeReservationProfileIdRef.current = null;
        setReservation(null);
        await reservationsService.releaseSlot(toRelease).catch(() => undefined);
      }
      if (err instanceof ApiClientError && err.status === 409) {
        setConflictMessage(err.message || 'Khung giờ đã hết chỗ hoặc phiên giữ chỗ đã hết hạn.');
        await onConflictRefresh?.();
      } else {
        setErrorMessage(
          err instanceof Error && err.message ? err.message : 'Đặt lịch khám không thành công.'
        );
      }
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  return (
    <ScrollView style={styles.screen} testID="slot-reservation-screen">
      <View style={styles.stepHeader}>
        <Text style={styles.stepBadge}>Bước 3 / 3</Text>
        <Text style={styles.stepSubtext}>Quy trình đặt khám</Text>
      </View>
      <Text style={styles.title}>Giữ chỗ & Xác nhận đặt khám</Text>

      {loading ? <ActivityIndicator color={tokens.colors.primary} /> : null}

      {conflictMessage ? (
        <View style={styles.conflictBox} testID="slot-conflict-banner">
          <Text style={styles.conflictText}>{conflictMessage}</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorBox} testID="slot-error-banner">
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {profiles.map((p) => (
        <Pressable
          key={p.patientProfileId}
          testID={`select-profile-${p.patientProfileId}`}
          style={[
            styles.profileChip,
            selectedProfileId === p.patientProfileId && styles.profileChipActive,
            submitting && styles.profileChipDisabled,
          ]}
          onPress={() => handleSelectProfile(p.patientProfileId)}
          disabled={submitting}
          accessibilityState={{ disabled: submitting }}
        >
          <Text style={styles.profileName}>{p.fullName}</Text>
        </Pressable>
      ))}

      {!reservation ? (
        <Pressable
          testID="reserve-slot-button"
          style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
          onPress={() => void handleReserveSlot()}
          disabled={submitting}
          accessibilityState={{ disabled: submitting }}
        >
          <Text style={styles.primaryBtnText}>
            {submitting ? 'Đang giữ chỗ...' : 'Giữ chỗ khung giờ'}
          </Text>
        </Pressable>
      ) : (
        <View testID="active-reservation-box" style={styles.reservationBox}>
          <Text style={styles.reservationInfo}>
            Đã giữ chỗ (Mã: {reservation.reservationId})
          </Text>
          <TextInput
            testID="booking-symptoms-input"
            style={styles.input}
            value={symptoms}
            onChangeText={setSymptoms}
            placeholder="Nhập triệu chứng ban đầu"
          />
          <Pressable
            testID="confirm-booking-button"
            style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
            onPress={() => void handleCreateBooking()}
            disabled={submitting}
            accessibilityState={{ disabled: submitting }}
          >
            <Text style={styles.primaryBtnText}>
              {submitting ? 'Đang xử lý đặt khám...' : 'Xác nhận đặt khám'}
            </Text>
          </Pressable>
        </View>
      )}

      <Pressable
        testID="abandon-reservation-button"
        style={[styles.cancelBtn, submitting && styles.cancelBtnDisabled]}
        onPress={() => void handleCancelAndRelease()}
        disabled={submitting}
        accessibilityState={{ disabled: submitting }}
      >
        <Text style={styles.cancelBtnText}>Quay lại / Hủy giữ chỗ</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    padding: tokens.spacing.lg,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    marginBottom: tokens.spacing.xs,
  },
  stepBadge: {
    fontSize: tokens.typography.caption,
    fontWeight: '700',
    color: tokens.colors.primary,
    backgroundColor: tokens.colors.primaryLight,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.pill,
  },
  stepSubtext: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.textMuted,
  },
  title: {
    fontSize: tokens.typography.title,
    fontWeight: '800',
    color: tokens.colors.primaryDark,
    marginBottom: tokens.spacing.md,
  },
  conflictBox: {
    backgroundColor: tokens.colors.warningBg,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    marginBottom: tokens.spacing.md,
  },
  conflictText: {
    color: tokens.colors.warning,
    fontWeight: '600',
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
  profileChip: {
    backgroundColor: tokens.colors.surface,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginBottom: tokens.spacing.xs,
    minHeight: 48,
    justifyContent: 'center',
  },
  profileChipActive: {
    borderColor: tokens.colors.primary,
    backgroundColor: tokens.colors.primaryLight,
  },
  profileChipDisabled: {
    opacity: 0.6,
  },
  profileName: {
    fontWeight: '600',
    color: tokens.colors.textPrimary,
  },
  reservationBox: {
    marginTop: tokens.spacing.md,
  },
  reservationInfo: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.success,
    marginBottom: tokens.spacing.sm,
    fontWeight: '600',
  },
  input: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.sm,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
  },
  primaryBtn: {
    backgroundColor: tokens.colors.primary,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    marginTop: tokens.spacing.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: tokens.colors.surface,
    fontWeight: '600',
  },
  cancelBtn: {
    marginTop: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelBtnDisabled: {
    opacity: 0.5,
  },
  cancelBtnText: {
    color: tokens.colors.textSecondary,
    fontWeight: '600',
  },
});

