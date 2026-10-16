package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.dto.request.CashierPaymentRequest;
import com.hospital.api.dto.response.CashierPendingBillResponse;
import com.hospital.api.dto.response.CashierReceiptResponse;
import com.hospital.api.entity.Account;
import com.hospital.api.repository.AccountRepository;
import com.hospital.api.security.UserPrincipal;
import com.hospital.api.service.CashierService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cashier")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
public class CashierController {

    private final CashierService cashierService;
    private final AccountRepository accountRepository;

    @GetMapping("/pending-bills")
    public ResponseEntity<ApiResponse<List<CashierPendingBillResponse>>> getPendingBills(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        List<CashierPendingBillResponse> bills = cashierService.getPendingBills(page, size);
        return ResponseEntity.ok(ApiResponse.ok(bills, "Lấy danh sách các khoản viện phí chờ thu thành công"));
    }

    @PostMapping("/pay")
    public ResponseEntity<ApiResponse<CashierReceiptResponse>> processPayment(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody CashierPaymentRequest request
    ) {
        String cashierName = "Thu ngân quầy";
        if (userPrincipal != null) {
            cashierName = accountRepository.findById(userPrincipal.getId())
                    .map(Account::getFullName)
                    .filter(name -> name != null && !name.isBlank())
                    .orElse(userPrincipal.getUsername());
        }

        CashierReceiptResponse receipt = cashierService.processPayment(cashierName, request);
        return ResponseEntity.ok(ApiResponse.ok(receipt, "Thu tiền và xuất biên lai viện phí thành công"));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<CashierReceiptResponse>>> getPaymentHistory(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        List<CashierReceiptResponse> history = cashierService.getPaymentHistory(page, size);
        return ResponseEntity.ok(ApiResponse.ok(history, "Lấy lịch sử giao dịch đã thu thành công"));
    }
}
