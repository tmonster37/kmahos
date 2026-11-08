import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { billingApi, BillingApi } from '@/features/billing/billing.api';
import { formatServerVnd, Transaction } from '@/features/billing/billing.types';
import { tokens } from '@/theme/tokens';

export interface TransactionsHistoryScreenProps {
  service?: BillingApi;
}

export default function TransactionsHistoryScreen({
  service = billingApi,
}: TransactionsHistoryScreenProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const list = await service.listTransactions();
      setTransactions(list);
    } catch (err) {
      setTransactions([]);
      setErrorMessage(
        err instanceof Error && err.message
          ? err.message
          : 'Không thể tải lịch sử giao dịch.'
      );
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  return (
    <ScrollView style={styles.screen} testID="transactions-history-screen">
      <Text style={styles.title}>Lịch sử giao dịch viện phí</Text>

      {loading ? (
        <View style={styles.stateBox} testID="transactions-loading">
          <ActivityIndicator color={tokens.colors.primary} />
        </View>
      ) : null}

      {!loading && errorMessage ? (
        <View style={styles.errorBox} testID="transactions-error">
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {!loading && !errorMessage && transactions.length === 0 ? (
        <View style={styles.stateBox} testID="transactions-empty">
          <Text style={styles.stateText}>Chưa có giao dịch viện phí nào.</Text>
        </View>
      ) : null}

      {!loading &&
        !errorMessage &&
        transactions.map((txn) => (
          <View
            key={txn.transactionId}
            style={styles.card}
            testID={`transaction-item-${txn.transactionId}`}
          >
            <View style={styles.row}>
              <Text style={styles.type}>{txn.transactionType}</Text>
              <Text style={styles.status} testID={`transaction-status-${txn.transactionId}`}>
                {txn.status}
              </Text>
            </View>
            <Text style={styles.amount} testID={`transaction-amount-${txn.transactionId}`}>
              {formatServerVnd(txn.amount)}
            </Text>
            {txn.description ? (
              <Text style={styles.desc}>{txn.description}</Text>
            ) : null}
          </View>
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
    marginBottom: 4,
  },
  type: {
    fontWeight: '700',
    color: tokens.colors.textPrimary,
  },
  status: {
    fontWeight: '600',
    color: tokens.colors.primaryDark,
  },
  amount: {
    fontSize: tokens.typography.subtitle,
    fontWeight: '700',
    color: tokens.colors.primaryDark,
    marginTop: 2,
  },
  desc: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.textSecondary,
    marginTop: 4,
  },
});

