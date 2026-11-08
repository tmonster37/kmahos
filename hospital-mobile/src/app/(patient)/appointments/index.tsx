import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { bookingApi, BookingApi } from '@/features/booking/booking.api';
import { Booking } from '@/features/booking/booking.types';
import { tokens } from '@/theme/tokens';

export interface AppointmentsListScreenProps {
  api?: BookingApi;
}

export default function AppointmentsListScreen({
  api = bookingApi,
}: AppointmentsListScreenProps) {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const list = await api.listMyBookings();
      setBookings(list);
    } catch (err) {
      setErrorMessage(
        err instanceof Error && err.message ? err.message : 'Không thể tải lịch sử đặt khám.'
      );
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  return (
    <ScrollView style={styles.screen} testID="appointments-list-screen">
      <Text style={styles.title}>Lịch sử đặt khám</Text>

      {loading ? (
        <View style={styles.stateBox} testID="appointments-loading">
          <ActivityIndicator color={tokens.colors.primary} />
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorBox} testID="appointments-error">
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {!loading && !errorMessage && bookings.length === 0 ? (
        <View style={styles.stateBox} testID="appointments-empty">
          <Text style={styles.stateText}>Chưa có lịch đặt khám nào.</Text>
        </View>
      ) : null}

      {!loading &&
        bookings.map((item) => (
          <Pressable
            key={item.bookingId}
            testID={`appointment-card-${item.bookingId}`}
            style={styles.card}
            onPress={() => router.push(`/(patient)/appointments/${item.bookingId}` as never)}
          >
            <View style={styles.row}>
              <Text style={styles.code}>{item.bookingCode}</Text>
              <Text style={styles.status}>{item.status}</Text>
            </View>
            <Text style={styles.meta}>
              {item.departmentName} • {item.doctorName}
            </Text>
            <Text style={styles.meta}>Ngày khám: {item.bookingDate}</Text>
          </Pressable>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    padding: tokens.spacing.lg,
  },
  title: {
    fontSize: tokens.typography.title,
    fontWeight: '700',
    color: tokens.colors.primaryDark,
    marginBottom: tokens.spacing.md,
  },
  stateBox: {
    backgroundColor: tokens.colors.surface,
    padding: tokens.spacing.xl,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
  },
  stateText: {
    color: tokens.colors.textSecondary,
  },
  errorBox: {
    backgroundColor: tokens.colors.dangerBg,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
  },
  errorText: {
    color: tokens.colors.danger,
  },
  card: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginBottom: tokens.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.xs,
  },
  code: {
    fontWeight: '700',
    fontSize: tokens.typography.subtitle,
    color: tokens.colors.textPrimary,
  },
  status: {
    fontWeight: '600',
    fontSize: tokens.typography.caption,
    color: tokens.colors.primaryDark,
  },
  meta: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.textSecondary,
    marginTop: 2,
  },
});

