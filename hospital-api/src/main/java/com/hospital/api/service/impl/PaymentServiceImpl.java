package com.hospital.api.service.impl;

import com.hospital.api.config.PayOSConfig;
import com.hospital.api.config.VNPayConfig;
import com.hospital.api.constant.PaymentMethod;
import com.hospital.api.constant.TransactionType;
import com.hospital.api.dto.request.PayOSWebhookRequest;
import com.hospital.api.dto.response.PaymentGatewayResponse;
import com.hospital.api.entity.Account;
import com.hospital.api.entity.Transaction;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.AccountRepository;
import com.hospital.api.repository.TransactionRepository;
import com.hospital.api.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;

    @Override
    @Transactional
    public String createVNPayUrl(UUID accountId, BigDecimal amount, TransactionType type, String ipAddress) {
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
        Account account = null;
        if (accountId != null) {
            account = accountRepository.findById(accountId).orElse(null);
        }
        if (account == null) {
            account = accountRepository.findAll().stream().findFirst().orElse(null);
        }

        // Sinh mã giao dịch chuẩn Napas (dưới 20 ký tự chữ & số)
        String txnRef = "TNT" + (System.currentTimeMillis() % 1000000000L);

        Transaction transaction = Transaction.builder()
                .account(account)
                .amount(amount)
                .transactionType(type)
                .paymentMethod(PaymentMethod.VIETQR)
                .status("PENDING")
                .vnpayTxnRef(txnRef)
                .description("Thanh toán VietQR / PayOS: " + type.name())
                .build();

        transaction = transactionRepository.save(transaction);

        // Sinh link ảnh VietQR Napas 247 chất lượng cao qua PayOSConfig
        String qrImageUrl = payOSConfig.generateVietQRUrl(amount.longValue(), txnRef);

        return new PaymentGatewayResponse(
                transaction.getTransactionId(),
                txnRef,
                PaymentMethod.VIETQR,
                type,
                amount,
                "PENDING",
                qrImageUrl,
                null,
                null,
                payOSConfig.bankName,
                payOSConfig.bankAccount,
                payOSConfig.accountHolder,
                txnRef,
                "Quét mã VietQR bằng bất kỳ App Ngân hàng nào để chuyển khoản tức thì 0% phí"
        );
    }

    @Override
    @Transactional
    public PaymentGatewayResponse createMoMoPayment(UUID accountId, BigDecimal amount, TransactionType type) {
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

        // MoMo dynamic QR & DeepLink
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
                "Mở App MoMo quét mã QR hoặc bấm nút Mở MoMo để thanh toán"
        );
    }

    @Override
    @Transactional
    public void payWithInternalWallet(UUID accountId, BigDecimal amount, TransactionType type) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new AppException("Không tìm thấy tài khoản", HttpStatus.NOT_FOUND));

        if (account.getBalance().compareTo(amount) < 0) {
            throw new AppException("Số dư ví không đủ để thanh toán. Vui lòng nạp thêm tiền!", HttpStatus.BAD_REQUEST);
        }

        // Trừ tiền trong ví
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
    public Transaction processVNPayCallback(Map<String, String> queryParams) {
        String vnpSecureHash = queryParams.get("vnp_SecureHash");
        String txnRef = queryParams.get("vnp_TxnRef");
        String responseCode = queryParams.get("vnp_ResponseCode");

        if (txnRef == null) {
            throw new AppException("Tham số giao dịch không hợp lệ", HttpStatus.BAD_REQUEST);
        }

        Transaction transaction = transactionRepository.findByVnpayTxnRef(txnRef)
                .orElseThrow(() -> new AppException("Không tìm thấy mã giao dịch: " + txnRef, HttpStatus.NOT_FOUND));

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
                transaction.setStatus("FAILED");
                transaction.setDescription(transaction.getDescription() + " (Lỗi: Chữ ký không hợp lệ)");
                return transactionRepository.save(transaction);
            }
        } catch (Exception e) {
            throw new AppException("Lỗi xác thực chữ ký VNPay: " + e.getMessage());
        }

        if ("00".equals(responseCode)) {
            transaction.setStatus("SUCCESS");
            if (transaction.getTransactionType() == TransactionType.DEPOSIT_WALLET) {
                Account account = transaction.getAccount();
                account.setBalance(account.getBalance().add(transaction.getAmount()));
                accountRepository.save(account);
            }
        } else {
            transaction.setStatus("FAILED");
            transaction.setDescription(transaction.getDescription() + " (Mã lỗi VNPay: " + responseCode + ")");
        }

        return transactionRepository.save(transaction);
    }

    @Override
    @Transactional
    public Transaction processPayOSWebhook(PayOSWebhookRequest request) {
        log.info("Nhận PayOS Webhook: {}", request);
        if (request == null || request.data() == null) {
            throw new AppException("Dữ liệu webhook PayOS không hợp lệ", HttpStatus.BAD_REQUEST);
        }

        PayOSWebhookRequest.PayOSWebhookData data = request.data();
        String description = data.description();
        Long orderCode = data.orderCode();

        // Tìm transaction dựa trên orderCode hoặc nội dung chuyển khoản description
        Optional<Transaction> txnOpt = Optional.empty();
        if (description != null && !description.isBlank()) {
            txnOpt = transactionRepository.findByVnpayTxnRef(description.trim());
        }
        if (txnOpt.isEmpty() && orderCode != null) {
            txnOpt = transactionRepository.findByVnpayTxnRef("TNT" + orderCode)
                    .or(() -> transactionRepository.findByVnpayTxnRef(String.valueOf(orderCode)));
        }

        Transaction transaction = txnOpt.orElseThrow(() -> new AppException("Không tìm thấy giao dịch tương ứng với PayOS Webhook", HttpStatus.NOT_FOUND));

        if (!"SUCCESS".equals(transaction.getStatus())) {
            transaction.setStatus("SUCCESS");
            transaction.setPaymentMethod(PaymentMethod.VIETQR);
            transaction.setDescription(transaction.getDescription() + " (Khớp tự động qua PayOS Webhook: Ref=" + data.reference() + ")");
            transactionRepository.save(transaction);

            // Nạp tiền vào ví nếu là DEPOSIT_WALLET
            if (transaction.getTransactionType() == TransactionType.DEPOSIT_WALLET) {
                Account account = transaction.getAccount();
                account.setBalance(account.getBalance().add(transaction.getAmount()));
                accountRepository.save(account);
            }
        }

        return transaction;
    }

    @Override
    @Transactional(readOnly = true)
    public Transaction checkTransactionStatus(String txnRef) {
        return transactionRepository.findByVnpayTxnRef(txnRef)
                .orElseThrow(() -> new AppException("Không tìm thấy giao dịch: " + txnRef, HttpStatus.NOT_FOUND));
    }

    @Override
    @Transactional
    public Transaction confirmPaymentSuccess(String txnRef, PaymentMethod method) {
        Transaction transaction = transactionRepository.findByVnpayTxnRef(txnRef)
                .orElseThrow(() -> new AppException("Không tìm thấy giao dịch: " + txnRef, HttpStatus.NOT_FOUND));

        if (!"SUCCESS".equals(transaction.getStatus())) {
            transaction.setStatus("SUCCESS");
            if (method != null) {
                transaction.setPaymentMethod(method);
            }
            if (transaction.getTransactionType() == TransactionType.DEPOSIT_WALLET) {
                Account account = transaction.getAccount();
                account.setBalance(account.getBalance().add(transaction.getAmount()));
                accountRepository.save(account);
            }
            transactionRepository.save(transaction);
        }

        return transaction;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Transaction> getTransactionHistory(UUID accountId) {
        return transactionRepository.findAllByAccount_UserIdOrderByCreatedAtDesc(accountId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Transaction> getAllTransactions() {
        return transactionRepository.findAllByOrderByCreatedAtDesc();
    }
}
