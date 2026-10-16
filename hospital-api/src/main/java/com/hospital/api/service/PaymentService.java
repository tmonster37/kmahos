package com.hospital.api.service;

import com.hospital.api.constant.PaymentMethod;
import com.hospital.api.constant.TransactionType;
import com.hospital.api.dto.request.PayOSWebhookRequest;
import com.hospital.api.dto.response.PaymentGatewayResponse;
import com.hospital.api.dto.response.TransactionResponse;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface PaymentService {
    String createVNPayUrl(UUID accountId, BigDecimal amount, TransactionType type, String ipAddress);
    PaymentGatewayResponse createVietQRPayment(UUID accountId, BigDecimal amount, TransactionType type);
    PaymentGatewayResponse createMoMoPayment(UUID accountId, BigDecimal amount, TransactionType type);
    void payWithInternalWallet(UUID accountId, BigDecimal amount, TransactionType type);
    TransactionResponse processVNPayCallback(Map<String, String> queryParams);
    com.hospital.api.dto.response.VnpayIpnResponse processVNPayIpn(Map<String, String> queryParams);
    TransactionResponse processPayOSWebhook(PayOSWebhookRequest request);
    TransactionResponse checkTransactionStatus(String txnRef, UUID requestingAccountId, boolean isPrivileged);
    TransactionResponse confirmPaymentSuccess(String txnRef, PaymentMethod method);
    TransactionResponse syncPayOSPayment(Long orderCode);
    PaymentGatewayResponse createPayOSPaymentLink(UUID accountId, BigDecimal amount, TransactionType type, String description);
    List<TransactionResponse> getTransactionHistory(UUID accountId, Integer page, Integer size);
    List<TransactionResponse> getAllTransactions(Integer page, Integer size);
}
