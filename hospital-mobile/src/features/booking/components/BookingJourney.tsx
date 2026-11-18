import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Booking } from '../booking.types';
import { tokens } from '@/theme/tokens';

export interface BookingJourneyProps {
  booking: Booking;
}

const MISSING_VALUE = 'Chưa có dữ liệu';

export function BookingJourney({ booking }: BookingJourneyProps) {
  const queueLabel =
    booking.queueCode && booking.queueCode.trim()
      ? booking.queueCode
      : booking.queueNumber != null
        ? String(booking.queueNumber)
        : MISSING_VALUE;

  const counterQueueLabel =
    booking.counterTicketCode && booking.counterTicketCode.trim()
      ? `${booking.counterTicketCode}${
          booking.counterName ? ` (${booking.counterName})` : ''
        }`
      : MISSING_VALUE;

  const checkedInLabel =
    booking.checkedInAt && booking.checkedInAt.trim() ? booking.checkedInAt : MISSING_VALUE;

  const dispatchedLabel =
    booking.dispatchedAt && booking.dispatchedAt.trim() ? booking.dispatchedAt : MISSING_VALUE;

  const paymentLabel =
    booking.isPaid === true
      ? 'Đã thanh toán'
      : booking.isPaid === false
        ? 'Chưa thanh toán'
        : MISSING_VALUE;

  const roomLabel = booking.roomName && booking.roomName.trim() ? booking.roomName : MISSING_VALUE;

  return (
    <View style={styles.card} testID="booking-journey">
      <Text style={styles.heading}>Hành trình khám bệnh</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Trạng thái lịch khám:</Text>
        <Text style={styles.value} testID="journey-booking-status">
          {booking.status || MISSING_VALUE}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Trạng thái viện phí khám:</Text>
        <Text style={styles.value} testID="journey-payment-status">
          {paymentLabel}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Số thứ tự khám:</Text>
        <Text style={styles.value} testID="journey-queue-code">
          {queueLabel}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Số phiếu quầy tiếp đón:</Text>
        <Text style={styles.value} testID="journey-counter-ticket">
          {counterQueueLabel}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Thời điểm Check-in:</Text>
        <Text style={styles.value} testID="journey-checked-in-at">
          {checkedInLabel}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Thời điểm điều phối buồng khám:</Text>
        <Text style={styles.value} testID="journey-dispatched-at">
          {dispatchedLabel}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Buồng khám:</Text>
        <Text style={styles.value} testID="journey-room-name">
          {roomLabel}
        </Text>
      </View>
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
    marginTop: tokens.spacing.md,
  },
  heading: {
    fontSize: tokens.typography.subtitle,
    fontWeight: '700',
    color: tokens.colors.primaryDark,
    marginBottom: tokens.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: tokens.spacing.xs,
    gap: tokens.spacing.sm,
  },
  label: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.textSecondary,
    flexShrink: 0,
    maxWidth: '50%',
  },
  value: {
    fontSize: tokens.typography.caption,
    fontWeight: '600',
    color: tokens.colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
});

