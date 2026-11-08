import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import {
  formatServerVnd,
  isBillPayable,
  PaymentGatewayResponse,
  PendingBill,
} from '../billing.types';
import { paymentApi, PaymentApi } from '../payment.api';
import { tokens } from '@/theme/tokens';

export interface PaymentCheckoutProps {
  bill: PendingBill;
  paymentService?: PaymentApi;
  openBrowser?: (url: string) => Promise<unknown>;
  onNavigateToReturn?: (params: {
    txnRef: string;
    orderCode?: number | null;
  }) => void;
}

export function PaymentCheckout({
  bill,
  paymentService = paymentApi,
  openBrowser = (url: string) => WebBrowser.openBrowserAsync(url),
  onNavigateToReturn,
}: PaymentCheckoutProps) {
  const [gateway, setGateway] = useState<PaymentGatewayResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const payable = isBillPayable(bill);

  const handleStartCheckout = async () => {
    if (!payable) {
      setErrorMessage(
        'Hóa đơn đang trong trạng thái đối soát hoặc không có số dư hợp lệ để thanh toán.'
      );
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await paymentService.createPaymentLink(bill.billId);
      const hasUsableInstruction = Boolean(
        (response.paymentUrl && response.paymentUrl.trim()) ||
          (response.qrImageUrl && response.qrImageUrl.trim()) ||
          (response.qrCode && response.qrCode.trim())
      );
      if (!hasUsableInstruction) {
        setGateway(null);
        setErrorMessage(
          'Cổng thanh toán chưa trả về liên kết hoặc mã VietQR hợp lệ. Vui lòng thử lại sau.'
        );
        return;
      }
      setGateway(response);
    } catch (err) {
      setGateway(null);
      setErrorMessage(
        err instanceof Error && err.message
          ? err.message
          : 'Không thể khởi tạo liên kết thanh toán.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayOSUrl = async () => {
    if (!gateway?.paymentUrl) {
      return;
    }
    await openBrowser(gateway.paymentUrl);
    onNavigateToReturn?.({
      txnRef: gateway.txnRef,
      orderCode: gateway.orderCode,
    });
  };

  if (!payable) {
    return (
      <View style={styles.blockedBox} testID="checkout-unreconciled-blocked">
        <Text style={styles.blockedText}>
          Đang đối soát; chưa thể thanh toán hóa đơn này trên ứng dụng.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="payment-checkout-box">
      {errorMessage ? (
        <View style={styles.errorBox} testID="checkout-error-banner">
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {!gateway ? (
        <Pressable
          testID="start-payos-checkout-button"
          style={styles.primaryBtn}
          disabled={loading}
          onPress={() => void handleStartCheckout()}
        >
          <Text style={styles.primaryBtnText}>
            Tạo mã thanh toán VietQR / PayOS ({formatServerVnd(bill.totalAmount)})
          </Text>
        </Pressable>
      ) : (
        <View style={styles.gatewayBox} testID="checkout-gateway-details">
          <Text style={styles.sectionTitle}>Thông tin chuyển khoản VietQR / PayOS</Text>
          <Text style={styles.detailRow} testID="checkout-gateway-amount">
            Số tiền: {formatServerVnd(gateway.amount)}
          </Text>
          {gateway.bankName ? (
            <Text style={styles.detailRow} testID="checkout-gateway-bank">
              Ngân hàng: {gateway.bankName}
            </Text>
          ) : null}
          {gateway.bankAccountNo ? (
            <Text style={styles.detailRow} testID="checkout-gateway-account-no">
              Số tài khoản: {gateway.bankAccountNo}
            </Text>
          ) : null}
          {gateway.accountHolder ? (
            <Text style={styles.detailRow} testID="checkout-gateway-account-holder">
              Chủ tài khoản: {gateway.accountHolder}
            </Text>
          ) : null}
          {gateway.transferContent ? (
            <Text style={styles.detailRow} testID="checkout-gateway-transfer-content">
              Nội dung chuyển khoản: {gateway.transferContent}
            </Text>
          ) : null}
          {gateway.qrCode ? (
            <Text style={styles.detailRow} testID="checkout-gateway-qr-code">
              Mã VietQR: {gateway.qrCode}
            </Text>
          ) : null}
          {gateway.qrImageUrl ? (
            <Text style={styles.detailRow} testID="checkout-gateway-qr-image-url">
              Ảnh QR: {gateway.qrImageUrl}
            </Text>
          ) : null}

          {gateway.paymentUrl ? (
            <Pressable
              testID="open-payos-browser-button"
              style={styles.primaryBtn}
              onPress={() => void handleOpenPayOSUrl()}
            >
              <Text style={styles.primaryBtnText}>Mở trang thanh toán PayOS</Text>
            </Pressable>
          ) : null}

          {onNavigateToReturn ? (
            <Pressable
              testID="check-payment-return-status-button"
              style={styles.secondaryBtn}
              onPress={() =>
                onNavigateToReturn({
                  txnRef: gateway.txnRef,
                  orderCode: gateway.orderCode,
                })
              }
            >
              <Text style={styles.secondaryBtnText}>
                Kiểm tra kết quả thanh toán từ máy chủ
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: tokens.spacing.md,
  },
  blockedBox: {
    backgroundColor: tokens.colors.warningBg,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    marginTop: tokens.spacing.md,
  },
  blockedText: {
    color: tokens.colors.warning,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: tokens.colors.dangerBg,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    marginBottom: tokens.spacing.sm,
  },
  errorText: {
    color: tokens.colors.danger,
  },
  gatewayBox: {
    backgroundColor: tokens.colors.surface,
    padding: tokens.spacing.lg,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  sectionTitle: {
    fontSize: tokens.typography.subtitle,
    fontWeight: '700',
    color: tokens.colors.primaryDark,
    marginBottom: tokens.spacing.sm,
  },
  detailRow: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.textPrimary,
    marginBottom: 4,
  },
  primaryBtn: {
    backgroundColor: tokens.colors.primary,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    marginTop: tokens.spacing.sm,
  },
  primaryBtnText: {
    color: tokens.colors.surface,
    fontWeight: '600',
  },
  secondaryBtn: {
    backgroundColor: tokens.colors.primaryLight,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    marginTop: tokens.spacing.sm,
  },
  secondaryBtnText: {
    color: tokens.colors.primaryDark,
    fontWeight: '600',
  },
});

