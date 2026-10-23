package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.constant.PaymentMethod;
import com.hospital.api.constant.TransactionType;
import com.hospital.api.dto.response.PaymentGatewayResponse;
import com.hospital.api.entity.Transaction;
import com.hospital.api.security.UserPrincipal;
import com.hospital.api.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    // 1. Tạo URL thanh toán VNPay
    @PostMapping("/vnpay/create-url")
    public ResponseEntity<ApiResponse<String>> createVNPayPayment(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam BigDecimal amount,
            @RequestParam TransactionType type,
            @RequestParam(required = false) String bookingCode,
            HttpServletRequest request
    ) {
        String ipAddress = request.getRemoteAddr();
        String paymentUrl = paymentService.createVNPayUrl(userPrincipal.getId(), amount, type, ipAddress, bookingCode);
        return ResponseEntity.ok(ApiResponse.ok(paymentUrl, "Khởi tạo URL VNPay thành công"));
    }

    // 2. Khởi tạo thanh toán VietQR Napas 247 (Dynamic QR Ngân hàng)
    @PostMapping("/vietqr/create")
    public ResponseEntity<ApiResponse<PaymentGatewayResponse>> createVietQRPayment(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam BigDecimal amount,
            @RequestParam TransactionType type,
            @RequestParam(required = false) String bookingCode
    ) {
        UUID accountId = userPrincipal != null ? userPrincipal.getId() : null;
        PaymentGatewayResponse response = paymentService.createVietQRPayment(accountId, amount, type, bookingCode);
        return ResponseEntity.ok(ApiResponse.ok(response, "Tạo mã thanh toán VietQR thành công"));
    }

    // 3. Khởi tạo thanh toán Ví MoMo (MoMo QR & Deeplink)
    @PostMapping("/momo/create")
    public ResponseEntity<ApiResponse<PaymentGatewayResponse>> createMoMoPayment(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam BigDecimal amount,
            @RequestParam TransactionType type,
            @RequestParam(required = false) String bookingCode
    ) {
        UUID accountId = userPrincipal != null ? userPrincipal.getId() : null;
        PaymentGatewayResponse response = paymentService.createMoMoPayment(accountId, amount, type, bookingCode);
        return ResponseEntity.ok(ApiResponse.ok(response, "Tạo mã thanh toán MoMo thành công"));
    }

    // 4. Thanh toán qua Ví nội bộ viện phí
    @PostMapping("/wallet/pay")
    public ResponseEntity<ApiResponse<Void>> payWithWallet(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam BigDecimal amount,
            @RequestParam TransactionType type
    ) {
        paymentService.payWithInternalWallet(userPrincipal.getId(), amount, type);
        return ResponseEntity.ok(ApiResponse.ok(null, "Thanh toán bằng ví nội bộ thành công"));
    }

    // 5. Kiểm tra trạng thái giao dịch theo thời gian thực (Polling status)
    @GetMapping("/status/{txnRef}")
    public ResponseEntity<ApiResponse<com.hospital.api.dto.response.TransactionResponse>> checkTransactionStatus(
            @PathVariable String txnRef,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        UUID accountId = userPrincipal != null ? userPrincipal.getId() : null;
        boolean isPrivileged = userPrincipal != null && userPrincipal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().contains("ADMIN") || a.getAuthority().contains("CASHIER"));
        com.hospital.api.dto.response.TransactionResponse transaction = paymentService.checkTransactionStatus(txnRef, accountId, isPrivileged);
        return ResponseEntity.ok(ApiResponse.ok(transaction, "Kiểm tra trạng thái giao dịch thành công"));
    }

    // 6. Xác nhận thanh toán thành công (Chỉ dành cho Quầy thu ngân & Quản trị viên)
    @PostMapping("/confirm/{txnRef}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<ApiResponse<com.hospital.api.dto.response.TransactionResponse>> confirmPaymentSuccess(
            @PathVariable String txnRef,
            @RequestParam(required = false, defaultValue = "VIETQR") PaymentMethod method
    ) {
        com.hospital.api.dto.response.TransactionResponse transaction = paymentService.confirmPaymentSuccess(txnRef, method);
        return ResponseEntity.ok(ApiResponse.ok(transaction, "Xác nhận thanh toán thành công"));
    }

    // 7. Webhook tiếp nhận biến động số dư / thanh toán tự động từ PayOS Open Banking
    @PostMapping("/payos/webhook")
    public ResponseEntity<ApiResponse<com.hospital.api.dto.response.TransactionResponse>> payOSWebhook(
            @RequestBody com.hospital.api.dto.request.PayOSWebhookRequest request
    ) {
        com.hospital.api.dto.response.TransactionResponse transaction = paymentService.processPayOSWebhook(request);
        return ResponseEntity.ok(ApiResponse.ok(transaction, "Xử lý PayOS webhook thành công"));
    }

    // 7.1. Đồng bộ trạng thái giao dịch trực tiếp từ cổng PayOS Open Banking
    @PostMapping("/payos/sync/{orderCode}")
    public ResponseEntity<ApiResponse<com.hospital.api.dto.response.TransactionResponse>> syncPayOSPayment(
            @PathVariable Long orderCode
    ) {
        com.hospital.api.dto.response.TransactionResponse transaction = paymentService.syncPayOSPayment(orderCode);
        return ResponseEntity.ok(ApiResponse.ok(transaction, "Đồng bộ giao dịch từ PayOS thành công"));
    }

    // 7.2. Khởi tạo link thanh toán PayOS chuyên dụng với Checkout URL chính thức
    @PostMapping("/payos/create-link")
    public ResponseEntity<ApiResponse<PaymentGatewayResponse>> createPayOSPaymentLink(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(required = false) BigDecimal amount,
            @RequestParam(required = false) TransactionType type,
            @RequestParam(required = false) String description,
            @RequestBody(required = false) com.hospital.api.dto.request.CreatePayOSLinkRequest requestBody
    ) {
        BigDecimal finalAmount = (requestBody != null && requestBody.amount() != null) ? requestBody.amount() : amount;
        TransactionType finalType = (requestBody != null && requestBody.type() != null) ? requestBody.type() : type;
        String finalDescription = (requestBody != null && requestBody.description() != null) ? requestBody.description() : description;

        if (finalAmount == null || finalType == null) {
            throw new com.hospital.api.exception.AppException("Số tiền (amount) và loại giao dịch (type) là bắt buộc", org.springframework.http.HttpStatus.BAD_REQUEST);
        }

        UUID accountId = userPrincipal != null ? userPrincipal.getId() : null;
        PaymentGatewayResponse response = paymentService.createPayOSPaymentLink(accountId, finalAmount, finalType, finalDescription);
        return ResponseEntity.ok(ApiResponse.ok(response, "Khởi tạo link thanh toán PayOS thành công"));
    }

    // 8. Callback xử lý kết quả từ VNPay (Return URL cho trình duyệt)
    @GetMapping("/vnpay/callback")
    public ResponseEntity<ApiResponse<com.hospital.api.dto.response.TransactionResponse>> vnpayCallback(
            @RequestParam Map<String, String> queryParams
    ) {
        com.hospital.api.dto.response.TransactionResponse transaction = paymentService.processVNPayCallback(queryParams);
        return ResponseEntity.ok(ApiResponse.ok(transaction, "Xử lý kết quả thanh toán VNPay thành công"));
    }

    // 8.1. IPN Callback nhận thông báo tức thì từ cổng VNPay (Server-to-Server Instant Payment Notification)
    @GetMapping({"/vnpay/ipn", "/vnpay-ipn"})
    public ResponseEntity<com.hospital.api.dto.response.VnpayIpnResponse> vnpayIpn(
            @RequestParam Map<String, String> queryParams
    ) {
        com.hospital.api.dto.response.VnpayIpnResponse response = paymentService.processVNPayIpn(queryParams);
        return ResponseEntity.ok(response);
    }

    // 9. Lịch sử giao dịch của người dùng
    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<com.hospital.api.dto.response.TransactionResponse>>> getTransactionHistory(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        List<com.hospital.api.dto.response.TransactionResponse> history = paymentService.getTransactionHistory(userPrincipal.getId(), page, size);
        return ResponseEntity.ok(ApiResponse.ok(history, "Lấy lịch sử giao dịch thành công"));
    }

    // 10. Danh sách toàn bộ giao dịch đối soát dành cho Quản trị viên & Kế toán
    @GetMapping("/admin/transactions")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<ApiResponse<List<com.hospital.api.dto.response.TransactionResponse>>> getAllTransactions(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        List<com.hospital.api.dto.response.TransactionResponse> all = paymentService.getAllTransactions(page, size);
        return ResponseEntity.ok(ApiResponse.ok(all, "Lấy danh sách đối soát giao dịch thành công"));
    }
}
