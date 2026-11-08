import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatServerVnd, isBillPayable, PendingBill } from '../billing.types';
import { tokens } from '@/theme/tokens';

export interface BillSummaryProps {
  bill: PendingBill;
  onSelect?: (billId: string) => void;
}

export function BillSummary({ bill, onSelect }: BillSummaryProps) {
  const isUnreconciled =
    bill.reconciliationStatus === 'UNRECONCILED' || bill.totalAmount === null;
  const payable = isBillPayable(bill);

  return (
    <View style={styles.card} testID={`bill-summary-${bill.billId}`}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          Hóa đơn {bill.category} — {bill.bookingCode}
        </Text>
        <Text
          style={[
            styles.badge,
            isUnreconciled ? styles.badgeWarning : styles.badgePrimary,
          ]}
          testID={`bill-status-${bill.billId}`}
        >
          {isUnreconciled ? 'UNRECONCILED' : bill.status}
        </Text>
      </View>

      {bill.items.map((item) => (
        <View
          key={item.itemId}
          style={styles.itemRow}
          testID={`bill-item-${bill.billId}-${item.itemId}`}
        >
          <Text style={styles.itemName}>
            {item.name} (x{item.quantity})
          </Text>
          <Text style={styles.itemPrice}>{formatServerVnd(item.totalPrice)}</Text>
        </View>
      ))}

      <View style={styles.footerRow}>
        {isUnreconciled ? (
          <Text
            style={styles.unreconciledNotice}
            testID={`bill-unreconciled-notice-${bill.billId}`}
          >
            Đang đối soát; chưa thể thanh toán
          </Text>
        ) : (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Số dư cần thanh toán:</Text>
            <Text style={styles.totalAmount} testID={`bill-total-${bill.billId}`}>
              {formatServerVnd(bill.totalAmount)}
            </Text>
          </View>
        )}

        {onSelect ? (
          <Pressable
            testID={`bill-checkout-action-${bill.billId}`}
            style={[styles.actionBtn, !payable && styles.actionBtnDisabled]}
            disabled={!payable}
            onPress={() => {
              if (payable) {
                onSelect(bill.billId);
              }
            }}
          >
            <Text style={styles.actionBtnText}>
              {payable ? 'Thanh toán' : 'Không thể thanh toán'}
            </Text>
          </Pressable>
        ) : null}
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
    marginBottom: tokens.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.sm,
  },
  title: {
    fontSize: tokens.typography.subtitle,
    fontWeight: '700',
    color: tokens.colors.textPrimary,
  },
  badge: {
    fontSize: tokens.typography.caption,
    fontWeight: '600',
  },
  badgePrimary: {
    color: tokens.colors.primaryDark,
  },
  badgeWarning: {
    color: tokens.colors.warning,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemName: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.textSecondary,
  },
  itemPrice: {
    fontSize: tokens.typography.caption,
    fontWeight: '600',
    color: tokens.colors.textPrimary,
  },
  footerRow: {
    marginTop: tokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
    paddingTop: tokens.spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.sm,
  },
  totalLabel: {
    fontSize: tokens.typography.body,
    fontWeight: '600',
    color: tokens.colors.textPrimary,
  },
  totalAmount: {
    fontSize: tokens.typography.body,
    fontWeight: '700',
    color: tokens.colors.primaryDark,
  },
  unreconciledNotice: {
    fontSize: tokens.typography.caption,
    fontWeight: '600',
    color: tokens.colors.warning,
    marginBottom: tokens.spacing.sm,
  },
  actionBtn: {
    backgroundColor: tokens.colors.primary,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
  },
  actionBtnDisabled: {
    backgroundColor: tokens.colors.border,
  },
  actionBtnText: {
    color: tokens.colors.surface,
    fontWeight: '600',
  },
});

