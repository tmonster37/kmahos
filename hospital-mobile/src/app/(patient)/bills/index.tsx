import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { billingApi, BillingApi } from '@/features/billing/billing.api';
import { PendingBill } from '@/features/billing/billing.types';
import { BillSummary } from '@/features/billing/components/BillSummary';
import { tokens } from '@/theme/tokens';

export interface PendingBillsListScreenProps {
  service?: BillingApi;
}

export default function PendingBillsListScreen({
  service = billingApi,
}: PendingBillsListScreenProps) {
  const router = useRouter();
  const [bills, setBills] = useState<PendingBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadBills = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const list = await service.listPendingBills();
      setBills(list);
    } catch (err) {
      setBills([]);
      setErrorMessage(
        err instanceof Error && err.message
          ? err.message
          : 'Không thể tải danh sách hóa đơn viện phí.'
      );
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    void loadBills();
  }, [loadBills]);

  return (
    <ScrollView style={styles.screen} testID="pending-bills-screen">
      <View style={styles.headerRow}>
        <Text style={styles.title}>Hóa đơn viện phí cần thanh toán</Text>
        <Pressable
          testID="open-transactions-history-button"
          style={styles.historyBtn}
          onPress={() => router.push('/(patient)/transactions' as never)}
        >
          <Text style={styles.historyBtnText}>Lịch sử giao dịch</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.stateBox} testID="bills-loading">
          <ActivityIndicator color={tokens.colors.primary} />
        </View>
      ) : null}

      {!loading && errorMessage ? (
        <View style={styles.errorBox} testID="bills-error">
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable
            testID="bills-retry-button"
            style={styles.retryBtn}
            onPress={() => void loadBills()}
          >
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && !errorMessage && bills.length === 0 ? (
        <View style={styles.stateBox} testID="bills-empty">
          <Text style={styles.stateText}>
            Hiện không có khoản viện phí nào cần thanh toán.
          </Text>
        </View>
      ) : null}

      {!loading &&
        !errorMessage &&
        bills.map((bill) => (
          <BillSummary
            key={bill.billId}
            bill={bill}
            onSelect={(billId) =>
              router.push(`/(patient)/bills/${encodeURIComponent(billId)}` as never)
            }
          />
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
    flex: 1,
  },
  historyBtn: {
    backgroundColor: tokens.colors.primaryLight,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
  },
  historyBtnText: {
    color: tokens.colors.primaryDark,
    fontWeight: '600',
    fontSize: tokens.typography.caption,
  },
  stateBox: {
    backgroundColor: tokens.colors.surface,
    padding: tokens.spacing.xl,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  stateText: {
    color: tokens.colors.textSecondary,
  },
  errorBox: {
    backgroundColor: tokens.colors.dangerBg,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    marginBottom: tokens.spacing.md,
  },
  errorText: {
    color: tokens.colors.danger,
    marginBottom: tokens.spacing.xs,
  },
  retryBtn: {
    backgroundColor: tokens.colors.surface,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    alignSelf: 'flex-start',
  },
  retryBtnText: {
    color: tokens.colors.danger,
    fontWeight: '600',
  },
});

