import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatServerVnd, Transaction } from '../billing.types';
import { tokens } from '@/theme/tokens';

export interface PaymentResultProps {
  transaction: Transaction | null;
  providerCancelled?: boolean;
  errorMessage?: string | null;
  onRefreshStatus: () => void;
  refreshing?: boolean;
}

export function PaymentResult({
  transaction,
  providerCancelled = false,
  errorMessage,
  onRefreshStatus,
  refreshing = false,
}: PaymentResultProps) {
  if (errorMessage) {
    return (
      <View style={styles.card} testID="payment-result-error">
        <Text style={styles.errorHeading}>Không thể xác nhận giao dịch</Text>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <Pressable
          testID="payment-refresh-status-button"
          style={styles.refreshBtn}
          disabled={refreshing}
          onPress={onRefreshStatus}
        >
          <Text style={styles.refreshBtnText}>Kiểm tra lại trạng thái</Text>
        </Pressable>
      </View>
    );
  }

  const serverStatus = transaction?.status ?? 'PENDING';
  const isServerConfirmedSuccess =
    !providerCancelled && serverStatus === 'SUCCESS';

  const statusHeadline = isServerConfirmedSuccess
    ? 'Đã thanh toán'
    : providerCancelled || serverStatus === 'CANCELLED'
      ? 'Giao dịch đã hủy'
      : serverStatus === 'FAILED'
        ? 'Giao dịch không thành công'
        : 'Đang chờ xác nhận từ hệ thống';

  return (
    <View style={styles.card} testID="payment-result-card">
      <Text style={styles.statusHeadline} testID="payment-result-headline">
        {statusHeadline}
      </Text>

      <Text style={styles.meta} testID="payment-result-server-status">
        Trạng thái máy chủ: {serverStatus}
      </Text>

      {transaction ? (
        <Text style={styles.meta} testID="payment-result-amount">
          Số tiền giao dịch: {formatServerVnd(transaction.amount)}
        </Text>
      ) : null}

      {!isServerConfirmedSuccess ? (
        <Pressable
          testID="payment-refresh-status-button"
          style={styles.refreshBtn}
          disabled={refreshing}
          onPress={onRefreshStatus}
        >
          <Text style={styles.refreshBtnText}>Làm mới trạng thái từ máy chủ</Text>
        </Pressable>
      ) : null}
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
  },
  statusHeadline: {
    fontSize: tokens.typography.subtitle,
    fontWeight: '700',
    color: tokens.colors.primaryDark,
    marginBottom: tokens.spacing.xs,
  },
  meta: {
    fontSize: tokens.typography.body,
    color: tokens.colors.textPrimary,
    marginBottom: 4,
  },
  errorHeading: {
    fontSize: tokens.typography.subtitle,
    fontWeight: '700',
    color: tokens.colors.danger,
    marginBottom: tokens.spacing.xs,
  },
  errorText: {
    color: tokens.colors.danger,
    marginBottom: tokens.spacing.sm,
  },
  refreshBtn: {
    backgroundColor: tokens.colors.primary,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    marginTop: tokens.spacing.sm,
  },
  refreshBtnText: {
    color: tokens.colors.surface,
    fontWeight: '600',
  },
});

