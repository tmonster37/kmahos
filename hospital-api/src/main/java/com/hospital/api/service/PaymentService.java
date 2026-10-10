package com.hospital.api.service;

import com.hospital.api.constant.PaymentMethod;
import com.hospital.api.constant.TransactionType;
import com.hospital.api.dto.request.PayOSWebhookRequest;
import com.hospital.api.dto.response.PaymentGatewayResponse;
import com.hospital.api.entity.Transaction;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface PaymentService {
    String createVNPayUrl(UUID accountId, BigDecimal amount, TransactionType type, String ipAddress);
    PaymentGatewayResponse createVietQRPayment(UUID accountId, BigDecimal amount, TransactionType type);
    PaymentGatewayResponse createMoMoPayment(UUID accountId, BigDecimal amount, TransactionType type);
    void payWithInternalWallet(UUID accountId, BigDecimal amount, TransactionType type);
    Transaction processVNPayCallback(Map<String, String> queryParams);
    Transaction processPayOSWebhook(PayOSWebhookRequest request);
    Transaction checkTransactionStatus(String txnRef);
    Transaction confirmPaymentSuccess(String txnRef, PaymentMethod method);
    List<Transaction> getTransactionHistory(UUID accountId);
    List<Transaction> getAllTransactions();
}
