package com.hospital.api.service;

import com.hospital.api.dto.request.CashierPaymentRequest;
import com.hospital.api.dto.response.CashierPendingBillResponse;
import com.hospital.api.dto.response.CashierReceiptResponse;

import java.util.List;
import java.util.UUID;

public interface CashierService {
    List<CashierPendingBillResponse> getPendingBills();
    List<CashierPendingBillResponse> getPendingBills(Integer page, Integer size);
    List<CashierPendingBillResponse> getPendingBillsForPatient(UUID accountId);
    CashierReceiptResponse processPayment(String cashierUsername, CashierPaymentRequest request);
    List<CashierReceiptResponse> getPaymentHistory();
    List<CashierReceiptResponse> getPaymentHistory(Integer page, Integer size);
}
