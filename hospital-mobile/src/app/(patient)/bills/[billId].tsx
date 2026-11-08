import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { billingApi, BillingApi } from '@/features/billing/billing.api';
import { PendingBill } from '@/features/billing/billing.types';
import { BillSummary } from '@/features/billing/components/BillSummary';
import { PaymentCheckout } from '@/features/billing/components/PaymentCheckout';
import { paymentApi, PaymentApi } from '@/features/billing/payment.api';
import { tokens } from '@/theme/tokens';

export interface BillDetailScreenProps {
  billIdOverride?: string;
  billingService?: BillingApi;
  paymentService?: PaymentApi;
}

export default function BillDetailScreen({
  billIdOverride,
  billingService = billingApi,
  paymentService = paymentApi,
}: BillDetailScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ billId?: string }>();
  const billId = billIdOverride ?? params.billId ?? '';

  const [bill, setBill] = useState<PendingBill | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadBill = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const list = await billingService.listPendingBills();
      const found = list.find((item) => item.billId === billId) ?? null;
      if (!found) {
        setErrorMessage('Không tìm thấy hóa đơn viện phí thuộc tài khoản của bạn.');
      } else {
        setBill(found);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error && err.message
          ? err.message
          : 'Không thể tải thông tin hóa đơn.'
      );
    } finally {
      setLoading(false);
    }
  }, [billId, billingService]);

  useEffect(() => {
    void loadBill();
  }, [loadBill]);

  if (loading) {
    return (
      <View style={styles.center} testID="bill-detail-loading">
        <ActivityIndicator color={tokens.colors.primary} />
      </View>
    );
  }

  if (errorMessage || !bill) {
    return (
      <View style={styles.center} testID="bill-detail-error">
        <Text style={styles.errorText}>
          {errorMessage ?? 'Không tìm thấy hóa đơn.'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} testID="bill-detail-screen">
      <Text style={styles.title}>Chi tiết hóa đơn viện phí</Text>
      <BillSummary bill={bill} />
      <PaymentCheckout
        bill={bill}
        paymentService={paymentService}
        onNavigateToReturn={({ txnRef, orderCode }) => {
          const query = new URLSearchParams({ txnRef });
          if (orderCode != null) {
            query.set('orderCode', String(orderCode));
          }
          router.push(`/(patient)/payment/return?${query.toString()}` as never);
        }}
      />
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
  errorText: {
    color: tokens.colors.danger,
  },
});

