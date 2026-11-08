import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Transaction } from '@/features/billing/billing.types';
import { PaymentResult } from '@/features/billing/components/PaymentResult';
import {
  parsePaymentReturnParams,
  paymentApi,
  PaymentApi,
} from '@/features/billing/payment.api';
import { ApiClientError } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';

export interface PaymentReturnScreenProps {
  paramsOverride?: Record<string, string | string[] | undefined>;
  service?: PaymentApi;
}

export default function PaymentReturnScreen({
  paramsOverride,
  service = paymentApi,
}: PaymentReturnScreenProps) {
  const routerParams = useLocalSearchParams<Record<string, string | string[]>>();
  const parsed = parsePaymentReturnParams(paramsOverride ?? routerParams);

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const verifyWithBackend = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    if (!parsed.txnRef && !parsed.orderCode) {
      setErrorMessage('Thiếu mã tham chiếu giao dịch để kiểm tra trạng thái.');
      setLoading(false);
      return;
    }

    try {
      let currentTxn: Transaction | null = null;
      if (parsed.orderCode != null) {
        currentTxn = await service.syncPayOS(parsed.orderCode);
      }
      if (parsed.txnRef && (!currentTxn || currentTxn.status !== 'SUCCESS')) {
        currentTxn = await service.checkPaymentStatus(parsed.txnRef);
      }
      setTransaction(currentTxn);
    } catch (err) {
      setTransaction(null);
      if (err instanceof ApiClientError && (err.status === 403 || err.status === 404)) {
        setErrorMessage('Bạn không có quyền truy cập giao dịch này hoặc giao dịch không tồn tại.');
      } else {
        setErrorMessage(
          err instanceof Error && err.message
            ? err.message
            : 'Không thể xác minh trạng thái thanh toán từ máy chủ.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [parsed.orderCode, parsed.txnRef, service]);

  useEffect(() => {
    void verifyWithBackend();
  }, [verifyWithBackend]);

  return (
    <ScrollView style={styles.screen} testID="payment-return-screen">
      <Text style={styles.title}>Kết quả thanh toán viện phí</Text>

      {loading ? (
        <View style={styles.center} testID="payment-return-loading">
          <ActivityIndicator color={tokens.colors.primary} />
        </View>
      ) : (
        <PaymentResult
          transaction={transaction}
          providerCancelled={parsed.providerCancelled}
          errorMessage={errorMessage}
          onRefreshStatus={() => void verifyWithBackend()}
          refreshing={loading}
        />
      )}
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
  center: {
    paddingVertical: tokens.spacing.xl,
    alignItems: 'center',
  },
});

