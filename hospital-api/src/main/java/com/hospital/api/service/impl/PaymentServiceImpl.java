package com.hospital.api.service.impl;

import com.hospital.api.config.PayOSConfig;
import com.hospital.api.config.VNPayConfig;
import com.hospital.api.constant.PaymentMethod;
import com.hospital.api.constant.TransactionType;
import com.hospital.api.dto.request.PayOSWebhookRequest;
import com.hospital.api.dto.response.PaymentGatewayResponse;
import com.hospital.api.dto.response.TransactionResponse;
import com.hospital.api.dto.response.VnpayIpnResponse;
import com.hospital.api.entity.Account;
import com.hospital.api.entity.Transaction;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.AccountRepository;
import com.hospital.api.repository.TransactionRepository;
import com.hospital.api.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hospital.api.dto.request.PayOSItemRequest;
import com.hospital.api.entity.Booking;
import com.hospital.api.entity.MedicalTest;
import com.hospital.api.entity.PrescriptionItem;
import com.hospital.api.repository.BookingRepository;
import com.hospital.api.repository.MedicalExaminationRecordRepository;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final VNPayConfig vnPayConfig;
    private final PayOSConfig payOSConfig;
    private final com.hospital.api.service.PayOSService payOSService;
    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final BookingRepository bookingRepository;
    private final MedicalExaminationRecordRepository recordRepository;

    private void validatePaymentAmount(BigDecimal amount) {
        if (amount == null) {
            throw new AppException("Số tiền thanh toán không được để trống", HttpStatus.BAD_REQUEST);
        }
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException("Số tiền thanh toán phải lớn hơn 0", HttpStatus.BAD_REQUEST);
        }
        if (amount.scale() > 2) {
            throw new AppException("Số tiền thanh toán không được vượt quá 2 chữ số thập phân", HttpStatus.BAD_REQUEST);
        }
        if (amount.compareTo(new BigDecimal("1000000000")) > 0) {
            throw new AppException("Số tiền thanh toán vượt quá hạn mức cho phép (Tối đa 1 tỷ VNĐ)", HttpStatus.BAD_REQUEST);
        }
    }

    @Override
    @Transactional
    public String createVNPayUrl(UUID accountId, BigDecimal amount, TransactionType type, String ipAddress) {
        validatePaymentAmount(amount);

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new AppException("Không tìm thấy tài khoản", HttpStatus.NOT_FOUND));

        String txnRef = "VNP" + (System.currentTimeMillis() % 1000000000L);

        Transaction transaction = Transaction.builder()
                .account(account)
                .amount(amount)
                .transactionType(type)
                .paymentMethod(PaymentMethod.VNPAY)
                .status("PENDING")
                .vnpayTxnRef(txnRef)
                .description("Thanh toán VNPay: " + type.name())
                .build();

        transactionRepository.save(transaction);

        try {
            return vnPayConfig.createPaymentUrl(txnRef, amount.longValue(), "Thanh toan vien phi TNT Hospital", ipAddress);
        } catch (Exception e) {
            throw new AppException("Không thể khởi tạo cổng thanh toán VNPay: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public PaymentGatewayResponse createVietQRPayment(UUID accountId, BigDecimal amount, TransactionType type) {
        validatePaymentAmount(amount);

        Account account = null;
        if (accountId != null) {
            account = accountRepository.findById(accountId).orElse(null);
        }
        if (account == null) {
            account = accountRepository.findAll().stream().findFirst().orElse(null);
        }

        long orderCode = (System.currentTimeMillis() % 10000000000L) * 1000L + java.util.concurrent.ThreadLocalRandom.current().nextInt(100, 999);
        String txnRef = "TNT" + orderCode;

        Transaction transaction = Transaction.builder()
                .account(account)
                .amount(amount)
                .transactionType(type)
                .paymentMethod(PaymentMethod.VIETQR)
                .status("PENDING")
                .vnpayTxnRef(txnRef)
                .orderCode(orderCode)
                .isVerified(false)
                .description("Thanh toán VietQR / PayOS: " + type.name())
                .build();

        transaction = transactionRepository.save(transaction);

        String buyerName = (account != null && account.getFullName() != null) ? account.getFullName() : "Benh Nhan TNT";
        String buyerPhone = (account != null && account.getPhoneNumber() != null) ? account.getPhoneNumber() : "";

        List<PayOSItemRequest> payOSItems = buildPayOSItems(type.name(), amount);
        com.hospital.api.dto.response.PayOSLinkResponse payOSLink = payOSService.createPaymentLink(
                orderCode,
                amount,
                txnRef,
                buyerName,
                buyerPhone,
                payOSItems
        );

        String qrImageUrl = (payOSLink != null && payOSLink.qrCode() != null && !payOSLink.qrCode().isBlank())
                ? payOSLink.qrCode()
                : payOSConfig.generateVietQRUrl(amount.longValue(), txnRef);

        String checkoutUrl = (payOSLink != null) ? payOSLink.checkoutUrl() : null;

        return new PaymentGatewayResponse(
                transaction.getTransactionId(),
                txnRef,
                PaymentMethod.VIETQR,
                type,
                amount,
                "PENDING",
                qrImageUrl,
                checkoutUrl,
                null,
                payOSConfig.bankName,
                payOSConfig.bankAccount,
                payOSConfig.accountHolder,
                txnRef,
                "Quét mã VietQR Napas 247 hoặc bấm Mở Cổng PayOS để thanh toán tức thì 0% phí",
                orderCode
        );
    }

    @Override
    @Transactional
    public PaymentGatewayResponse createMoMoPayment(UUID accountId, BigDecimal amount, TransactionType type) {
        validatePaymentAmount(amount);

        Account account = null;
        if (accountId != null) {
            account = accountRepository.findById(accountId).orElse(null);
        }
        if (account == null) {
            account = accountRepository.findAll().stream().findFirst().orElse(null);
        }

        String txnRef = "MM" + (System.currentTimeMillis() % 1000000000L);

        Transaction transaction = Transaction.builder()
                .account(account)
                .amount(amount)
                .transactionType(type)
                .paymentMethod(PaymentMethod.MOMO)
                .status("PENDING")
                .vnpayTxnRef(txnRef)
                .description("Thanh toán Ví MoMo: " + type.name())
                .build();

        transaction = transactionRepository.save(transaction);

        String momoPayload = String.format("2|99|0987654321|||0|0|%d|%s|transfer_p2p", amount.longValue(), txnRef);
        String momoQrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + URLEncoder.encode(momoPayload, StandardCharsets.UTF_8);

        return new PaymentGatewayResponse(
                transaction.getTransactionId(),
                txnRef,
                PaymentMethod.MOMO,
                type,
                amount,
                "PENDING",
                momoQrUrl,
                "https://me.momo.vn/benhvientnt",
                "momo://?action=payWithApp",
                "Ví điện tử MoMo",
                "0987654321",
                "BỆNH VIỆN ĐA KHOA QUỐC TẾ TNT",
                txnRef,
                "Mở App MoMo quét mã QR hoặc bấm nút Mở MoMo để thanh toán",
                null
        );
    }

    @Override
    @Transactional
    public void payWithInternalWallet(UUID accountId, BigDecimal amount, TransactionType type) {
        validatePaymentAmount(amount);

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new AppException("Không tìm thấy tài khoản", HttpStatus.NOT_FOUND));

        if (account.getBalance() == null || account.getBalance().compareTo(amount) < 0) {
            throw new AppException("Số dư ví không đủ để thanh toán. Vui lòng nạp thêm tiền!", HttpStatus.BAD_REQUEST);
        }

        // Trừ tiền trong ví nguyên tử
        account.setBalance(account.getBalance().subtract(amount));
        accountRepository.save(account);

        Transaction transaction = Transaction.builder()
                .account(account)
                .amount(amount)
                .transactionType(type)
                .paymentMethod(PaymentMethod.INTERNAL_WALLET)
                .status("SUCCESS")
                .vnpayTxnRef("WAL" + (System.currentTimeMillis() % 1000000000L))
                .description("Thanh toán thành công qua ví nội bộ: " + type.name())
                .build();

        transactionRepository.save(transaction);
    }

    @Override
    @Transactional
    public TransactionResponse processVNPayCallback(Map<String, String> queryParams) {
        String vnpSecureHash = queryParams.get("vnp_SecureHash");
        String txnRef = queryParams.get("vnp_TxnRef");
        String responseCode = queryParams.get("vnp_ResponseCode");

        if (txnRef == null) {
            throw new AppException("Tham số giao dịch không hợp lệ", HttpStatus.BAD_REQUEST);
        }

        Transaction transaction = transactionRepository.findByVnpayTxnRef(txnRef)
                .orElseThrow(() -> new AppException("Không tìm thấy mã giao dịch: " + txnRef, HttpStatus.NOT_FOUND));

        // Chống chuyển trạng thái / cộng tiền lặp nếu đã SUCCESS
        if ("SUCCESS".equals(transaction.getStatus())) {
            log.info("Giao dịch VNPay {} đã được xử lý SUCCESS trước đó (Idempotent callback)", txnRef);
            return TransactionResponse.fromEntity(transaction);
        }

        // Kiểm tra chữ ký bảo mật VNPay
        Map<String, String> fields = new HashMap<>();
        for (Map.Entry<String, String> entry : queryParams.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();
            if (value != null && !value.isEmpty() && !key.equals("vnp_SecureHash") && !key.equals("vnp_SecureHashType")) {
                fields.put(key, value);
            }
        }

        List<String> fieldNames = new ArrayList<>(fields.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        for (Iterator<String> itr = fieldNames.iterator(); itr.hasNext(); ) {
            String fieldName = itr.next();
            String fieldValue = fields.get(fieldName);
            try {
                hashData.append(fieldName).append('=').append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));
                if (itr.hasNext()) {
                    hashData.append('&');
                }
            } catch (Exception ignored) {}
        }

        try {
            String checkHash = VNPayConfig.hmacSHA512(vnPayConfig.secretKey, hashData.toString());
            if (!checkHash.equalsIgnoreCase(vnpSecureHash)) {
                throw new AppException("Chữ ký phản hồi từ VNPay không hợp lệ", HttpStatus.BAD_REQUEST);
            }
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            throw new AppException("Lỗi xác thực chữ ký VNPay: " + e.getMessage(), HttpStatus.BAD_REQUEST);
        }

        // Đối chiếu số tiền giao dịch
        String vnpAmountStr = queryParams.get("vnp_Amount");
        if (vnpAmountStr != null && !vnpAmountStr.isBlank()) {
            try {
                long vnpAmount = Long.parseLong(vnpAmountStr) / 100;
                if (BigDecimal.valueOf(vnpAmount).compareTo(transaction.getAmount()) != 0) {
                    throw new AppException("Số tiền thanh toán VNPay không khớp với đơn hàng", HttpStatus.BAD_REQUEST);
                }
            } catch (NumberFormatException ignored) {}
        }

        if ("00".equals(responseCode)) {
            transaction.setStatus("SUCCESS");
            transaction.setIsVerified(true);
            if (transaction.getTransactionType() == TransactionType.DEPOSIT_WALLET) {
                Account account = transaction.getAccount();
                if (account != null) {
                    BigDecimal current = account.getBalance() != null ? account.getBalance() : BigDecimal.ZERO;
                    account.setBalance(current.add(transaction.getAmount()));
                    accountRepository.save(account);
                }
            }
        } else {
            transaction.setStatus("FAILED");
            transaction.setDescription(transaction.getDescription() + " (Mã lỗi VNPay: " + responseCode + ")");
        }

        return TransactionResponse.fromEntity(transactionRepository.save(transaction));
    }

    @Override
    @Transactional
    public VnpayIpnResponse processVNPayIpn(Map<String, String> queryParams) {
        String vnpSecureHash = queryParams.get("vnp_SecureHash");
        String txnRef = queryParams.get("vnp_TxnRef");
        String responseCode = queryParams.get("vnp_ResponseCode");

        if (txnRef == null || vnpSecureHash == null) {
            log.warn("VNPay IPN thiếu tham số bắt buộc: txnRef={}, vnpSecureHash={}", txnRef, vnpSecureHash != null);
            return VnpayIpnResponse.invalidSignature();
        }

        // 1. Kiểm tra chữ ký bảo mật VNPay
        Map<String, String> fields = new HashMap<>();
        for (Map.Entry<String, String> entry : queryParams.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();
            if (value != null && !value.isEmpty() && !key.equals("vnp_SecureHash") && !key.equals("vnp_SecureHashType")) {
                fields.put(key, value);
            }
        }

        List<String> fieldNames = new ArrayList<>(fields.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        for (Iterator<String> itr = fieldNames.iterator(); itr.hasNext(); ) {
            String fieldName = itr.next();
            String fieldValue = fields.get(fieldName);
            try {
                hashData.append(fieldName).append('=').append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));
                if (itr.hasNext()) {
                    hashData.append('&');
                }
            } catch (Exception ignored) {}
        }

        try {
            String checkHash = VNPayConfig.hmacSHA512(vnPayConfig.secretKey, hashData.toString());
            if (!checkHash.equalsIgnoreCase(vnpSecureHash)) {
                log.warn("VNPay IPN sai chữ ký checksum cho txnRef: {}", txnRef);
                return VnpayIpnResponse.invalidSignature();
            }
        } catch (Exception e) {
            log.error("Lỗi xác minh chữ ký VNPay IPN: {}", e.getMessage());
            return VnpayIpnResponse.invalidSignature();
        }

        // 2. Tra cứu mã giao dịch
        Optional<Transaction> txnOpt = transactionRepository.findByVnpayTxnRef(txnRef);
        if (txnOpt.isEmpty()) {
            log.warn("VNPay IPN không tìm thấy đơn hàng: {}", txnRef);
            return VnpayIpnResponse.orderNotFound();
        }

        Transaction transaction = txnOpt.get();

        // 3. Kiểm tra số tiền
        String vnpAmountStr = queryParams.get("vnp_Amount");
        if (vnpAmountStr != null && !vnpAmountStr.isBlank()) {
            try {
                long vnpAmount = Long.parseLong(vnpAmountStr) / 100;
                if (BigDecimal.valueOf(vnpAmount).compareTo(transaction.getAmount()) != 0) {
                    log.warn("VNPay IPN sai số tiền: yêu cầu {} nhưng nhận {}", transaction.getAmount(), vnpAmount);
                    return VnpayIpnResponse.invalidAmount();
                }
            } catch (NumberFormatException e) {
                return VnpayIpnResponse.invalidAmount();
            }
        }

        // 4. Kiểm tra trạng thái - Idempotency
        if ("SUCCESS".equalsIgnoreCase(transaction.getStatus())) {
            log.info("VNPay IPN: Đơn hàng {} đã được xác nhận trước đó (Idempotent 02)", txnRef);
            return VnpayIpnResponse.alreadyConfirmed();
        }

        // 5. Cập nhật kết quả thanh toán
        if ("00".equals(responseCode)) {
            transaction.setStatus("SUCCESS");
            transaction.setIsVerified(true);
            if (transaction.getTransactionType() == TransactionType.DEPOSIT_WALLET) {
                Account account = transaction.getAccount();
                if (account != null) {
                    BigDecimal current = account.getBalance() != null ? account.getBalance() : BigDecimal.ZERO;
                    account.setBalance(current.add(transaction.getAmount()));
                    accountRepository.save(account);
                }
            }
            transactionRepository.save(transaction);
            log.info("VNPay IPN: Xác nhận thanh toán thành công cho đơn hàng {}", txnRef);
            return VnpayIpnResponse.success();
        } else {
            transaction.setStatus("FAILED");
            transaction.setDescription(transaction.getDescription() + " (Mã lỗi VNPay IPN: " + responseCode + ")");
            transactionRepository.save(transaction);
            log.warn("VNPay IPN: Giao dịch {} thất bại với mã lỗi {}", txnRef, responseCode);
            return VnpayIpnResponse.success(); // VNPay quy định nhận IPN thất bại vẫn trả 00 để xác nhận đã nhận
        }
    }

    @Override
    @Transactional
    public TransactionResponse processPayOSWebhook(PayOSWebhookRequest request) {
        if (request == null || request.data() == null) {
            throw new AppException("Dữ liệu webhook PayOS không hợp lệ", HttpStatus.BAD_REQUEST);
        }

        PayOSWebhookRequest.PayOSWebhookData data = request.data();
        String description = data.description();
        Long orderCode = data.orderCode();

        Optional<Transaction> txnOpt = Optional.empty();
        if (orderCode != null) {
            txnOpt = transactionRepository.findByOrderCode(orderCode);
        }
        if (txnOpt.isEmpty() && description != null && !description.isBlank()) {
            txnOpt = transactionRepository.findByVnpayTxnRef(description.trim());
        }
        if (txnOpt.isEmpty() && orderCode != null) {
            txnOpt = transactionRepository.findByVnpayTxnRef("TNT" + orderCode)
                    .or(() -> transactionRepository.findByVnpayTxnRef(String.valueOf(orderCode)));
        }

        Transaction transaction = txnOpt.orElseThrow(() -> new AppException("Không tìm thấy giao dịch tương ứng với PayOS Webhook", HttpStatus.NOT_FOUND));

        // Bắt buộc kiểm tra chữ ký Webhook PayOS (SEC-P0-01)
        if (request.signature() == null || request.signature().isBlank()) {
            throw new AppException("Chữ ký Webhook PayOS (signature) là bắt buộc và không thể bỏ trống", HttpStatus.BAD_REQUEST);
        }
        if (payOSConfig.checksumKey == null || payOSConfig.checksumKey.isBlank()) {
            throw new AppException("Hệ thống chưa được cấu hình Checksum Key cho cổng thanh toán PayOS", HttpStatus.INTERNAL_SERVER_ERROR);
        }

        String dataToSign = String.format("amount=%d&cancelUrl=&description=%s&orderCode=%d&returnUrl=",
                data.amount() != null ? data.amount().longValue() : 0,
                data.description() != null ? data.description() : "",
                orderCode != null ? orderCode : 0
        );
        try {
            String calculatedSig = PayOSConfig.hmacSHA256(payOSConfig.checksumKey, dataToSign);
            if (!calculatedSig.equalsIgnoreCase(request.signature())) {
                throw new AppException("Chữ ký Webhook PayOS không hợp lệ", HttpStatus.BAD_REQUEST);
            }
        } catch (AppException e) {
            throw e;
        } catch (Exception ex) {
            throw new AppException("Lỗi xác thực chữ ký PayOS: " + ex.getMessage(), HttpStatus.BAD_REQUEST);
        }

        // Chống lặp (Idempotent): nếu đã SUCCESS trước đó thì ghi log audit và trả về ngay, không nạp ví hay gạch nợ lặp lại
        if ("SUCCESS".equals(transaction.getStatus())) {
            log.info("[IDEMPOTENT PAYOS WEBHOOK] Giao dịch PayOS orderCode={} / txnRef={} đã được xử lý SUCCESS trước đó",
                    transaction.getOrderCode(), transaction.getVnpayTxnRef());
            if (Boolean.FALSE.equals(transaction.getIsVerified())) {
                transaction.setIsVerified(true);
                transactionRepository.save(transaction);
            }
            return TransactionResponse.fromEntity(transaction);
        }

        // Đối chiếu số tiền nếu có
        if (data.amount() != null && data.amount().compareTo(transaction.getAmount()) != 0) {
            throw new AppException("Số tiền webhook PayOS (" + data.amount() + ") không khớp với số tiền giao dịch (" + transaction.getAmount() + ")", HttpStatus.BAD_REQUEST);
        }

        transaction.setStatus("SUCCESS");
        transaction.setIsVerified(true);
        if (data.reference() != null && !data.reference().isBlank()) {
            transaction.setWebhookReference(data.reference().trim());
        }
        if (transaction.getOrderCode() == null && orderCode != null) {
            transaction.setOrderCode(orderCode);
        }
        transaction.setPaymentMethod(PaymentMethod.VIETQR);
        transaction.setDescription(transaction.getDescription() + " (Khớp tự động qua PayOS Webhook: Ref=" + data.reference() + ")");
        transactionRepository.save(transaction);

        // Nạp tiền vào ví nếu là DEPOSIT_WALLET
        if (transaction.getTransactionType() == TransactionType.DEPOSIT_WALLET) {
            Account account = transaction.getAccount();
            if (account != null) {
                BigDecimal current = account.getBalance() != null ? account.getBalance() : BigDecimal.ZERO;
                account.setBalance(current.add(transaction.getAmount()));
                accountRepository.save(account);
            }
        }

        return TransactionResponse.fromEntity(transaction);
    }

    @Override
    @Transactional(readOnly = true)
    public TransactionResponse checkTransactionStatus(String txnRef, UUID requestingAccountId, boolean isPrivileged) {
        Transaction txn = transactionRepository.findByVnpayTxnRef(txnRef)
                .orElseThrow(() -> new AppException("Không tìm thấy giao dịch: " + txnRef, HttpStatus.NOT_FOUND));

        if (!isPrivileged && txn.getAccount() != null) {
            if (requestingAccountId == null || !txn.getAccount().getUserId().equals(requestingAccountId)) {
                throw new AppException("Bạn không có quyền xem thông tin giao dịch này", HttpStatus.FORBIDDEN);
            }
        }

        return TransactionResponse.fromEntity(txn);
    }

    @Override
    @Transactional
    public TransactionResponse confirmPaymentSuccess(String txnRef, PaymentMethod method) {
        Transaction transaction = transactionRepository.findByVnpayTxnRef(txnRef)
                .orElseThrow(() -> new AppException("Không tìm thấy giao dịch: " + txnRef, HttpStatus.NOT_FOUND));

        if (!"SUCCESS".equals(transaction.getStatus())) {
            transaction.setStatus("SUCCESS");
            if (method != null) {
                transaction.setPaymentMethod(method);
            }
            if (transaction.getTransactionType() == TransactionType.DEPOSIT_WALLET) {
                Account account = transaction.getAccount();
                if (account != null) {
                    BigDecimal current = account.getBalance() != null ? account.getBalance() : BigDecimal.ZERO;
                    account.setBalance(current.add(transaction.getAmount()));
                    accountRepository.save(account);
                }
            }
            transactionRepository.save(transaction);
        }

        return TransactionResponse.fromEntity(transaction);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TransactionResponse> getTransactionHistory(UUID accountId, Integer page, Integer size) {
        List<Transaction> txns;
        if (page != null && size != null && size > 0) {
            Pageable pageable = PageRequest.of(Math.max(0, page), size);
            txns = transactionRepository.findAllByAccount_UserIdOrderByCreatedAtDesc(accountId, pageable).getContent();
        } else {
            txns = transactionRepository.findAllByAccount_UserIdOrderByCreatedAtDesc(accountId);
        }
        return txns.stream().map(TransactionResponse::fromEntity).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TransactionResponse> getAllTransactions(Integer page, Integer size) {
        List<Transaction> txns;
        if (page != null && size != null && size > 0) {
            Pageable pageable = PageRequest.of(Math.max(0, page), size);
            txns = transactionRepository.findAllByOrderByCreatedAtDesc(pageable).getContent();
        } else {
            txns = transactionRepository.findAllByOrderByCreatedAtDesc();
        }
        return txns.stream().map(TransactionResponse::fromEntity).toList();
    }

    @Override
    @Transactional
    public TransactionResponse syncPayOSPayment(Long orderCode) {
        if (orderCode == null) {
            throw new AppException("Mã đơn hàng orderCode không được để trống", HttpStatus.BAD_REQUEST);
        }

        Optional<Transaction> txnOpt = transactionRepository.findByOrderCode(orderCode);
        if (txnOpt.isEmpty()) {
            txnOpt = transactionRepository.findByVnpayTxnRef("TNT" + orderCode)
                    .or(() -> transactionRepository.findByVnpayTxnRef(String.valueOf(orderCode)));
        }

        Transaction transaction = txnOpt.orElseThrow(() -> new AppException("Không tìm thấy giao dịch với mã đơn hàng: " + orderCode, HttpStatus.NOT_FOUND));

        // Idempotent: Nếu đã SUCCESS thì trả về ngay
        if ("SUCCESS".equalsIgnoreCase(transaction.getStatus())) {
            log.info("[PayOS Sync] Giao dịch orderCode={} đã ở trạng thái SUCCESS trước đó", orderCode);
            return TransactionResponse.fromEntity(transaction);
        }

        // Truy vấn cổng thanh toán PayOS
        com.hospital.api.dto.response.PayOSLinkResponse linkInfo = payOSService.getPaymentLinkInformation(orderCode);
        if (linkInfo != null && "PAID".equalsIgnoreCase(linkInfo.status())) {
            transaction.setStatus("SUCCESS");
            transaction.setIsVerified(true);
            transaction.setDescription(transaction.getDescription() + " (Đồng bộ thành công từ cổng thanh toán PayOS)");
            
            if (transaction.getTransactionType() == TransactionType.DEPOSIT_WALLET) {
                Account account = transaction.getAccount();
                if (account != null) {
                    BigDecimal current = account.getBalance() != null ? account.getBalance() : BigDecimal.ZERO;
                    account.setBalance(current.add(transaction.getAmount()));
                    accountRepository.save(account);
                }
            }
            transaction = transactionRepository.save(transaction);
            log.info("[PayOS Sync] Đồng bộ thành công giao dịch orderCode={} sang trạng thái SUCCESS", orderCode);
        } else {
            log.info("[PayOS Sync] Giao dịch orderCode={} tại PayOS chưa thanh toán hoặc đang chờ xử lý", orderCode);
        }

        return TransactionResponse.fromEntity(transaction);
    }

    @Override
    @Transactional
    public PaymentGatewayResponse createPayOSPaymentLink(UUID accountId, BigDecimal amount, TransactionType type, String description) {
        validatePaymentAmount(amount);

        Account account = null;
        if (accountId != null) {
            account = accountRepository.findById(accountId).orElse(null);
        }
        if (account == null) {
            account = accountRepository.findAll().stream().findFirst().orElse(null);
        }

        long orderCode = (System.currentTimeMillis() % 10000000000L) * 1000L + java.util.concurrent.ThreadLocalRandom.current().nextInt(100, 999);
        String txnRef = "TNT" + orderCode;
        String desc = (description != null && !description.isBlank()) ? description.trim() : ("TNT " + orderCode);

        Transaction transaction = Transaction.builder()
                .account(account)
                .amount(amount)
                .transactionType(type)
                .paymentMethod(PaymentMethod.VIETQR)
                .status("PENDING")
                .vnpayTxnRef(txnRef)
                .orderCode(orderCode)
                .isVerified(false)
                .description("Thanh toán PayOS: " + desc)
                .build();

        transaction = transactionRepository.save(transaction);

        String buyerName = (account != null && account.getFullName() != null) ? account.getFullName() : "Benh Nhan TNT";
        String buyerPhone = (account != null && account.getPhoneNumber() != null) ? account.getPhoneNumber() : "";

        List<PayOSItemRequest> payOSItems = buildPayOSItems(desc, amount);
        com.hospital.api.dto.response.PayOSLinkResponse payOSLink = payOSService.createPaymentLink(
                orderCode,
                amount,
                desc,
                buyerName,
                buyerPhone,
                payOSItems
        );

        String qrImageUrl = (payOSLink != null && payOSLink.qrCode() != null && !payOSLink.qrCode().isBlank())
                ? payOSLink.qrCode()
                : payOSConfig.generateVietQRUrl(amount.longValue(), txnRef);

        String checkoutUrl = (payOSLink != null) ? payOSLink.checkoutUrl() : null;

        return new PaymentGatewayResponse(
                transaction.getTransactionId(),
                txnRef,
                PaymentMethod.VIETQR,
                type,
                amount,
                "PENDING",
                qrImageUrl,
                checkoutUrl,
                null,
                payOSConfig.bankName,
                payOSConfig.bankAccount,
                payOSConfig.accountHolder,
                txnRef,
                "Mở Cổng PayOS để thanh toán Open Banking hoặc quét mã VietQR Napas 247",
                orderCode
        );
    }

    private List<PayOSItemRequest> buildPayOSItems(String description, BigDecimal amount) {
        if (description == null || description.isBlank()) {
            return List.of(new PayOSItemRequest("Thanh toan vien phi TNT Hospital", 1, amount.longValue()));
        }

        // Tìm bookingCode trong description
        Matcher matcher = Pattern.compile("BK[A-Za-z0-9]+").matcher(description);
        if (matcher.find()) {
            String bookingCode = matcher.group();
            Booking booking = bookingRepository.findByBookingCode(bookingCode).orElse(null);
            if (booking != null) {
                List<PayOSItemRequest> items = new ArrayList<>();
                boolean isExamOnly = description.contains("-EXAM");
                boolean isTreatmentOnly = description.contains("-TREATMENT") || description.contains("-CLS");

                if (!isTreatmentOnly) {
                    BigDecimal examPrice = booking.getPrice() != null ? booking.getPrice() : BigDecimal.ZERO;
                    if (examPrice.compareTo(BigDecimal.ZERO) > 0) {
                        String deptName = (booking.getDoctor() != null && booking.getDoctor().getDepartment() != null)
                                ? booking.getDoctor().getDepartment().getDepartmentName()
                                : "Chuyen khoa";
                        items.add(new PayOSItemRequest("Cong kham " + deptName, 1, examPrice.longValue()));
                    }
                }

                if (!isExamOnly) {
                    recordRepository.findByBooking_BookingCode(bookingCode).ifPresent(rec -> {
                        if (rec.getMedicalTests() != null) {
                            for (MedicalTest test : rec.getMedicalTests()) {
                                BigDecimal price = test.getPrice() != null ? test.getPrice() : BigDecimal.ZERO;
                                if (price.compareTo(BigDecimal.ZERO) > 0) {
                                    String name = (test.getMedicalService() != null)
                                            ? test.getMedicalService().getServiceName()
                                            : "Xet nghiem (" + test.getTestCode() + ")";
                                    items.add(new PayOSItemRequest(name, 1, price.longValue()));
                                }
                            }
                        }
                        if (rec.getPrescription() != null && rec.getPrescription().getPrescriptionItems() != null) {
                            for (PrescriptionItem pItem : rec.getPrescription().getPrescriptionItems()) {
                                BigDecimal unitPrice = pItem.getUnitPrice() != null ? pItem.getUnitPrice() : BigDecimal.ZERO;
                                int qty = pItem.getQuantity() != null ? pItem.getQuantity() : 1;
                                if (unitPrice.compareTo(BigDecimal.ZERO) > 0) {
                                    String name = (pItem.getMedicine() != null)
                                            ? pItem.getMedicine().getMedicineName()
                                            : "Thuoc";
                                    items.add(new PayOSItemRequest(name, qty, unitPrice.longValue()));
                                }
                            }
                        }
                    });
                }

                // Kiểm tra xem tổng tiền của các items có khớp chính xác với amount của giao dịch không (quy định nghiêm ngặt của PayOS)
                long itemsSum = items.stream().mapToLong(i -> i.price() * i.quantity()).sum();
                if (itemsSum == amount.longValue() && !items.isEmpty()) {
                    return items;
                }
            }
        }

        // Fallback: 1 item duy nhất đúng với số tiền giao dịch
        String cleanTitle = description.replace("Thanh toán PayOS:", "").replace("Thanh toán VietQR / PayOS:", "").trim();
        if (cleanTitle.length() > 50) {
            cleanTitle = cleanTitle.substring(0, 50);
        }
        return List.of(new PayOSItemRequest(cleanTitle.isBlank() ? "Thanh toan vien phi TNT" : cleanTitle, 1, amount.longValue()));
    }
}
