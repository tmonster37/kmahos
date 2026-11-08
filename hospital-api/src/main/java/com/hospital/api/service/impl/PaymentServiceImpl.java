package com.hospital.api.service.impl;

import com.hospital.api.config.PayOSConfig;
import com.hospital.api.config.VNPayConfig;
import com.hospital.api.constant.BookingStatus;
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
import com.hospital.api.security.UserPrincipal;
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
import com.hospital.api.entity.Discharge;
import com.hospital.api.entity.MedicalTest;
import com.hospital.api.entity.Prescription;
import com.hospital.api.entity.PrescriptionItem;
import com.hospital.api.repository.BookingRepository;
import com.hospital.api.repository.DischargeRepository;
import com.hospital.api.repository.MedicalExaminationRecordRepository;
import com.hospital.api.repository.MedicalTestRepository;
import com.hospital.api.repository.PrescriptionRepository;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Slf4j
@Service
public class PaymentServiceImpl implements PaymentService {

    private static final Pattern PATIENT_BILL_ID_PATTERN = Pattern.compile(
            "^BILL-((?:BK|KIOSK)\\d{8}[A-Za-z0-9]{4,10})-(EXAM|TEST|PRESCRIPTION)$");

    private final VNPayConfig vnPayConfig;
    private final PayOSConfig payOSConfig;
    private final com.hospital.api.service.PayOSService payOSService;
    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final BookingRepository bookingRepository;
    private final MedicalExaminationRecordRepository recordRepository;
    private final MedicalTestRepository testRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final DischargeRepository dischargeRepository;
    private final BookingReceptionTransition reception;
    private final com.hospital.api.service.CashierService cashierService;

    public PaymentServiceImpl(
            VNPayConfig vnPayConfig,
            PayOSConfig payOSConfig,
            com.hospital.api.service.PayOSService payOSService,
            TransactionRepository transactionRepository,
            AccountRepository accountRepository,
            BookingRepository bookingRepository,
            MedicalExaminationRecordRepository recordRepository,
            MedicalTestRepository testRepository,
            PrescriptionRepository prescriptionRepository,
            DischargeRepository dischargeRepository,
            BookingReceptionTransition reception
    ) {
        this(
                vnPayConfig,
                payOSConfig,
                payOSService,
                transactionRepository,
                accountRepository,
                bookingRepository,
                recordRepository,
                testRepository,
                prescriptionRepository,
                dischargeRepository,
                reception,
                null
        );
    }

    @org.springframework.beans.factory.annotation.Autowired
    public PaymentServiceImpl(
            VNPayConfig vnPayConfig,
            PayOSConfig payOSConfig,
            com.hospital.api.service.PayOSService payOSService,
            TransactionRepository transactionRepository,
            AccountRepository accountRepository,
            BookingRepository bookingRepository,
            MedicalExaminationRecordRepository recordRepository,
            MedicalTestRepository testRepository,
            PrescriptionRepository prescriptionRepository,
            DischargeRepository dischargeRepository,
            BookingReceptionTransition reception,
            com.hospital.api.service.CashierService cashierService
    ) {
        this.vnPayConfig = vnPayConfig;
        this.payOSConfig = payOSConfig;
        this.payOSService = payOSService;
        this.transactionRepository = transactionRepository;
        this.accountRepository = accountRepository;
        this.bookingRepository = bookingRepository;
        this.recordRepository = recordRepository;
        this.testRepository = testRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.dischargeRepository = dischargeRepository;
        this.reception = reception;
        this.cashierService = cashierService;
    }

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
        return createVNPayUrl(accountId, amount, type, ipAddress, null);
    }

    @Override
    @Transactional
    public String createVNPayUrl(UUID accountId, BigDecimal amount, TransactionType type, String ipAddress, String bookingCode) {
        validatePaymentAmount(amount);

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new AppException("Không tìm thấy tài khoản", HttpStatus.NOT_FOUND));

        String txnRef = "VNP" + UUID.randomUUID().toString().replace("-", "");
        String desc = "Thanh toán VNPay: " + type.name();
        if (bookingCode != null && !bookingCode.isBlank()) {
            desc += " - " + bookingCode.trim();
        }

        validateBookingOrder(type, amount, desc);

        Transaction transaction = Transaction.builder()
                .account(account)
                .amount(amount)
                .transactionType(type)
                .paymentMethod(PaymentMethod.VNPAY)
                .status("PENDING")
                .vnpayTxnRef(txnRef)
                .description(desc)
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
        return createVietQRPayment(accountId, amount, type, null);
    }

    @Override
    @Transactional
    public PaymentGatewayResponse createVietQRPayment(UUID accountId, BigDecimal amount, TransactionType type, String bookingCode) {
        validatePaymentAmount(amount);

        Account account = null;
        if (accountId != null) {
            account = accountRepository.findById(accountId).orElse(null);
        }

        String desc = "Thanh toán VietQR / PayOS: " + type.name();
        if (bookingCode != null && !bookingCode.isBlank()) {
            desc += " - " + bookingCode.trim();
        }

        validateBookingOrder(type, amount, desc);

        // Chống tạo nhiều giao dịch PENDING cho cùng 1 booking trong vòng 15 phút
        if (bookingCode != null && !bookingCode.isBlank() && type == TransactionType.PAY_BOOKING) {
            Optional<Transaction> existingPending = transactionRepository
                    .findFirstByDescriptionContainingAndStatusOrderByCreatedAtDesc(bookingCode.trim(), "PENDING");
            if (existingPending.isPresent()) {
                Transaction oldTxn = existingPending.get();
                if (oldTxn.getCreatedAt() != null && oldTxn.getCreatedAt().isAfter(java.time.Instant.now().minus(java.time.Duration.ofMinutes(15)))
                        && oldTxn.getAmount().compareTo(amount) == 0 && oldTxn.getOrderCode() != null) {
                    log.info("[Payment] Tái sử dụng giao dịch PENDING orderCode={} cho booking={}", oldTxn.getOrderCode(), bookingCode);
                    String providerRef = PayOSConfig.paymentReference(oldTxn.getOrderCode());
                    String qrUrl = payOSConfig.generateVietQRUrl(amount.longValue(), providerRef);
                    return new PaymentGatewayResponse(
                            oldTxn.getTransactionId(),
                            oldTxn.getVnpayTxnRef(),
                            PaymentMethod.VIETQR,
                            type,
                            amount,
                            "PENDING",
                            qrUrl,
                            null,
                            String.format("%s?orderCode=%d&status=PENDING&method=VIETQR", payOSConfig.returnUrl, oldTxn.getOrderCode()),
                            null,
                            payOSConfig.bankName,
                            payOSConfig.bankAccount,
                            payOSConfig.accountHolder,
                            providerRef,
                            "Quét mã VietQR Napas 247 hoặc bấm Mở Cổng PayOS để thanh toán tức thì 0% phí",
                            oldTxn.getOrderCode()
                    );
                }
            }
        }

        long orderCode = generateUniqueOrderCode();
        String txnRef = "TNT" + orderCode;
        String providerReference = PayOSConfig.paymentReference(orderCode);

        Transaction transaction = Transaction.builder()
                .account(account)
                .amount(amount)
                .transactionType(type)
                .paymentMethod(PaymentMethod.VIETQR)
                .status("PENDING")
                .vnpayTxnRef(txnRef)
                .orderCode(orderCode)
                .isVerified(false)
                .description(desc)
                .build();

        transaction = transactionRepository.save(transaction);

        String buyerName = (account != null && account.getFullName() != null) ? account.getFullName() : "Benh Nhan TNT";
        String buyerPhone = (account != null && account.getPhoneNumber() != null) ? account.getPhoneNumber() : "";

        List<PayOSItemRequest> payOSItems = buildPayOSItems(desc, amount);
        com.hospital.api.dto.response.PayOSLinkResponse payOSLink = payOSService.createPaymentLink(
                orderCode,
                amount,
                providerReference,
                buyerName,
                buyerPhone,
                payOSItems
        );

        String rawQrCode = (payOSLink != null && payOSLink.qrCode() != null && !payOSLink.qrCode().isBlank())
                ? payOSLink.qrCode()
                : null;

        String bin = (payOSLink != null && payOSLink.bin() != null && !payOSLink.bin().isBlank())
                ? payOSLink.bin()
                : payOSConfig.bankBin;
        String accountNumber = (payOSLink != null && payOSLink.accountNumber() != null && !payOSLink.accountNumber().isBlank())
                ? payOSLink.accountNumber()
                : payOSConfig.bankAccount;
        String accountHolder = (payOSLink != null && payOSLink.accountName() != null && !payOSLink.accountName().isBlank())
                ? payOSLink.accountName()
                : payOSConfig.accountHolder;

        String qrImageUrl = payOSConfig.generateVietQRUrl(bin, accountNumber, accountHolder, amount.longValue(), providerReference);
        String checkoutUrl = (payOSLink != null) ? payOSLink.checkoutUrl() : null;

        return new PaymentGatewayResponse(
                transaction.getTransactionId(),
                txnRef,
                PaymentMethod.VIETQR,
                type,
                amount,
                "PENDING",
                qrImageUrl,
                rawQrCode,
                checkoutUrl,
                null,
                payOSConfig.bankName,
                accountNumber,
                accountHolder,
                providerReference,
                "Quét mã VietQR Napas 247 hoặc bấm Mở Cổng PayOS để thanh toán tức thì 0% phí",
                orderCode
        );
    }

    @Override
    @Transactional
    public PaymentGatewayResponse createMoMoPayment(UUID accountId, BigDecimal amount, TransactionType type) {
        return createMoMoPayment(accountId, amount, type, null);
    }

    @Override
    @Transactional
    public PaymentGatewayResponse createMoMoPayment(UUID accountId, BigDecimal amount, TransactionType type, String bookingCode) {
        validatePaymentAmount(amount);

        Account account = null;
        if (accountId != null) {
            account = accountRepository.findById(accountId).orElse(null);
        }

        if (account == null) {
            account = accountRepository.findAll().stream().findFirst().orElse(null);
        }

        String txnRef = "MM" + (System.currentTimeMillis() % 1000000000L);
        String desc = "Thanh toán Ví MoMo: " + type.name();
        if (bookingCode != null && !bookingCode.isBlank()) {
            desc += " - " + bookingCode.trim();
        }

        Transaction transaction = Transaction.builder()
                .account(account)
                .amount(amount)
                .transactionType(type)
                .paymentMethod(PaymentMethod.MOMO)
                .status("PENDING")
                .vnpayTxnRef(txnRef)
                .description(desc)
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
                momoPayload,
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
        payWithInternalWallet(accountId, amount, type, null);
    }

    @Override
    @Transactional
    public void payWithInternalWallet(UUID accountId, BigDecimal amount, TransactionType type, String bookingCode) {
        validatePaymentAmount(amount);

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new AppException("Không tìm thấy tài khoản", HttpStatus.NOT_FOUND));

        if (account.getBalance() == null || account.getBalance().compareTo(amount) < 0) {
            throw new AppException("Số dư ví không đủ để thanh toán. Vui lòng nạp thêm tiền!", HttpStatus.BAD_REQUEST);
        }

        Booking booking = null;
        String desc = "Thanh toán thành công qua ví nội bộ: " + type.name();

        if (type == TransactionType.PAY_BOOKING && bookingCode != null && !bookingCode.isBlank()) {
            String cleanCode = bookingCode.trim();
            booking = bookingRepository.findByBookingCodeForUpdate(cleanCode)
                    .orElseThrow(() -> new AppException("Không tìm thấy thông tin lịch khám: " + cleanCode, HttpStatus.NOT_FOUND));

            if (booking.isDeleted() || booking.getStatus() == BookingStatus.CANCELLED) {
                throw new AppException("Lịch khám không còn hiệu lực", HttpStatus.BAD_REQUEST);
            }
            if (Boolean.TRUE.equals(booking.getIsPaid())) {
                throw new AppException("Lịch khám này đã được thanh toán hoàn tất trước đó", HttpStatus.BAD_REQUEST);
            }
            if (booking.getPrice() != null && amount.compareTo(booking.getPrice()) != 0) {
                throw new AppException("Số tiền thanh toán (" + amount + ") không khớp với viện phí (" + booking.getPrice() + ")", HttpStatus.BAD_REQUEST);
            }
            desc = "Thanh toán viện phí lịch khám " + cleanCode + " qua ví nội bộ";
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
                .isVerified(true)
                .vnpayTxnRef("WAL" + (System.currentTimeMillis() % 1000000000L))
                .description(desc)
                .build();

        transactionRepository.save(transaction);

        if (booking != null) {
            recordBookingPayment(transaction, booking);
        }
    }

    @Override
    @Transactional
    public TransactionResponse processVNPayCallback(Map<String, String> queryParams) {
        String txnRef = queryParams.get("vnp_TxnRef");
        if (txnRef == null || txnRef.isBlank()) {
            throw new AppException("Tham số giao dịch không hợp lệ", HttpStatus.BAD_REQUEST);
        }
        // Browser redirects only display the server's recorded state. IPN owns confirmation.
        return TransactionResponse.fromEntity(transactionRepository.findByVnpayTxnRef(txnRef)
                .orElseThrow(() -> new AppException("Không tìm thấy mã giao dịch: " + txnRef, HttpStatus.NOT_FOUND)));
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
        Optional<Transaction> txnOpt = transactionRepository.findByVnpayTxnRefForUpdate(txnRef);
        if (txnOpt.isEmpty()) {
            log.warn("VNPay IPN không tìm thấy đơn hàng: {}", txnRef);
            return VnpayIpnResponse.orderNotFound();
        }

        Transaction transaction = txnOpt.get();

        if (transaction.getPaymentMethod() != PaymentMethod.VNPAY) {
            return VnpayIpnResponse.orderNotFound();
        }
        String amount = queryParams.get("vnp_Amount");
        if (amount == null || !amount.matches("[0-9]+")
                || new BigDecimal(amount).compareTo(transaction.getAmount().movePointRight(2)) != 0) {
            return VnpayIpnResponse.invalidAmount();
        }

        // 4. Kiểm tra trạng thái - Idempotency
        if ("SUCCESS".equalsIgnoreCase(transaction.getStatus())) {
            log.info("VNPay IPN: Đơn hàng {} đã được xác nhận trước đó (Idempotent 02)", txnRef);
            return VnpayIpnResponse.alreadyConfirmed();
        }

        // Both VNPay result fields must report success; payment never dispatches a booking.
        if ("00".equals(responseCode) && "00".equals(queryParams.get("vnp_TransactionStatus"))) {
            Booking booking;
            try {
                booking = resolvePaymentBooking(transaction);
            } catch (AppException ex) {
                return VnpayIpnResponse.orderNotFound();
            }
            if (booking != null && consultationPayment(transaction) && !matchesBookingPrice(transaction, booking)) {
                return VnpayIpnResponse.invalidAmount();
            }
            transaction.setStatus("SUCCESS");
            transaction.setIsVerified(true);
            recordBookingPayment(transaction, booking);
            creditWallet(transaction);
        } else {
            transaction.setStatus("FAILED");
        }
        transactionRepository.save(transaction);
        return VnpayIpnResponse.success();
    }

    @Override
    @Transactional
    public TransactionResponse processPayOSWebhook(PayOSWebhookRequest request) {
        if (request == null || request.data() == null) {
            throw new AppException("Dữ liệu webhook PayOS không hợp lệ", HttpStatus.BAD_REQUEST);
        }

        PayOSWebhookRequest.PayOSWebhookData data = request.data();
        verifyPayOSWebhook(request);
        if (Boolean.FALSE.equals(request.success()) || !"00".equals(request.code()) || !"00".equals(data.code())
                || data.orderCode() == null || data.amount() == null
                || data.reference() == null || data.reference().isBlank() || !"VND".equals(data.currency())) {
            throw new AppException("PayOS chưa xác nhận thanh toán hợp lệ", HttpStatus.BAD_REQUEST);
        }
        Transaction transaction = transactionRepository.findByOrderCodeForUpdate(data.orderCode())
                .orElseThrow(() -> new AppException("Không tìm thấy giao dịch PayOS", HttpStatus.NOT_FOUND));
        if (!Objects.equals(transaction.getOrderCode(), data.orderCode())
                || (transaction.getPaymentMethod() != PaymentMethod.VIETQR && transaction.getPaymentMethod() != PaymentMethod.PAYOS)
                || data.amount().compareTo(transaction.getAmount()) != 0) {
            throw new AppException("Số tiền hoặc mã đơn hàng PayOS không khớp", HttpStatus.BAD_REQUEST);
        }
        if ("SUCCESS".equals(transaction.getStatus())) return TransactionResponse.fromEntity(transaction);
        Booking booking = resolvePaymentBooking(transaction);
        validateBookingPrice(transaction, booking);
        transaction.setStatus("SUCCESS");
        transaction.setIsVerified(true);
        transaction.setWebhookReference(data.reference());
        transactionRepository.save(transaction);
        recordBookingPayment(transaction, booking);
        creditWallet(transaction);
        return TransactionResponse.fromEntity(transaction);
    }

    private void verifyPayOSWebhook(PayOSWebhookRequest request) {
        if (request.signature() == null || request.signature().isBlank()) {
            throw new AppException("Chữ ký Webhook PayOS là bắt buộc", HttpStatus.BAD_REQUEST);
        }
        if (payOSConfig.checksumKey == null || payOSConfig.checksumKey.isBlank()) {
            throw new AppException("Chưa cấu hình Checksum Key PayOS", HttpStatus.INTERNAL_SERVER_ERROR);
        }
        StringJoiner signed = new StringJoiner("&");
        new TreeMap<>(request.data().fields()).forEach((key, value) -> {
            if (value instanceof Map || value instanceof Collection) {
                throw new AppException("Dữ liệu Webhook PayOS không hợp lệ", HttpStatus.BAD_REQUEST);
            }
            signed.add(key + "=" + (value == null || "null".equals(value) || "undefined".equals(value) ? "" : value));
        });
        String expected = PayOSConfig.hmacSHA256(payOSConfig.checksumKey, signed.toString());
        if (!java.security.MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII),
                request.signature().toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII))) {
            throw new AppException("Chữ ký Webhook PayOS không hợp lệ", HttpStatus.BAD_REQUEST);
        }
    }

    private void creditWallet(Transaction transaction) {
        if (transaction.getTransactionType() == TransactionType.DEPOSIT_WALLET && transaction.getAccount() != null) {
            Account account = transaction.getAccount();
            BigDecimal current = account.getBalance() == null ? BigDecimal.ZERO : account.getBalance();
            account.setBalance(current.add(transaction.getAmount()));
            accountRepository.save(account);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public TransactionResponse checkTransactionStatus(String txnRef, UUID requestingAccountId, boolean isPrivileged) {
        Transaction txn = transactionRepository.findByVnpayTxnRef(txnRef)
                .orElseThrow(() -> new AppException("Không tìm thấy giao dịch: " + txnRef, HttpStatus.NOT_FOUND));

        if (!isPrivileged) {
            UUID txnAccountId = txn.getAccount() != null ? txn.getAccount().getUserId() : null;
            if (requestingAccountId == null || txnAccountId == null || !txnAccountId.equals(requestingAccountId)) {
                throw new AppException("Bạn không có quyền xem thông tin giao dịch này", HttpStatus.FORBIDDEN);
            }
        }

        return TransactionResponse.fromEntity(txn);
    }

    @Override
    @Transactional
    public TransactionResponse confirmPaymentSuccess(String txnRef, PaymentMethod method) {
        Transaction transaction = transactionRepository.findByVnpayTxnRefForUpdate(txnRef)
                .orElseThrow(() -> new AppException("Không tìm thấy giao dịch: " + txnRef, HttpStatus.NOT_FOUND));

        // Staff can attest only the physical tender already recorded on the order.
        // A gateway order must retain its method and wait for provider confirmation.
        if ((method != PaymentMethod.CASH && method != PaymentMethod.COUNTER_CASH && method != PaymentMethod.POS)
                || transaction.getPaymentMethod() != method) {
            throw new AppException("Chỉ xác nhận phương thức thu tiền mặt hoặc POS đã ghi nhận; giao dịch cổng thanh toán phải chờ nhà cung cấp xác nhận", HttpStatus.BAD_REQUEST);
        }

        if (!"SUCCESS".equals(transaction.getStatus())) {
            Booking booking = resolvePaymentBooking(transaction);
            validateBookingPrice(transaction, booking);
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
            recordBookingPayment(transaction, booking);
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
        return syncPayOSPayment(orderCode, null);
    }

    @Override
    @Transactional
    public TransactionResponse syncPayOSPayment(Long orderCode, UserPrincipal currentUser) {
        if (orderCode == null) {
            throw new AppException("Mã đơn hàng orderCode không được để trống", HttpStatus.BAD_REQUEST);
        }

        Optional<Transaction> txnOpt = transactionRepository.findByOrderCodeForUpdate(orderCode);
        if (txnOpt.isEmpty()) {
            txnOpt = transactionRepository.findByVnpayTxnRefForUpdate("TNT" + orderCode)
                    .or(() -> transactionRepository.findByVnpayTxnRefForUpdate(String.valueOf(orderCode)));
        }

        Transaction transaction = txnOpt.orElseThrow(() -> new AppException("Không tìm thấy giao dịch với mã đơn hàng: " + orderCode, HttpStatus.NOT_FOUND));

        if ((transaction.getOrderCode() != null && !Objects.equals(transaction.getOrderCode(), orderCode))
                || (transaction.getPaymentMethod() != PaymentMethod.VIETQR && transaction.getPaymentMethod() != PaymentMethod.PAYOS)) {
            throw new AppException("Mã đơn hàng không thuộc giao dịch PayOS", HttpStatus.BAD_REQUEST);
        }
        // Kiểm tra phân quyền: Caller phải là chủ tài khoản giao dịch hoặc là nhân viên y tế (ADMIN, CASHIER, NURSE)
        if (currentUser != null) {
            boolean isStaff = currentUser.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().contains("ADMIN") || a.getAuthority().contains("CASHIER") || a.getAuthority().contains("NURSE"));
            if (!isStaff) {
                UUID txnAccountId = transaction.getAccount() != null ? transaction.getAccount().getUserId() : null;
                if (currentUser.getId() == null || txnAccountId == null || !txnAccountId.equals(currentUser.getId())) {
                    throw new AppException("Bạn không có quyền truy cập hoặc đồng bộ giao dịch này", HttpStatus.FORBIDDEN);
                }
            }
        }


        // Idempotent: Nếu đã SUCCESS thì trả về ngay
        if ("SUCCESS".equalsIgnoreCase(transaction.getStatus())) {
            log.info("[PayOS Sync] Giao dịch orderCode={} đã ở trạng thái SUCCESS trước đó", orderCode);
            return TransactionResponse.fromEntity(transaction);
        }

        // Truy vấn cổng thanh toán PayOS
        com.hospital.api.dto.response.PayOSLinkResponse linkInfo = payOSService.getPaymentLinkInformation(orderCode);
        if (linkInfo != null && "PAID".equalsIgnoreCase(linkInfo.status())) {
            if (!Objects.equals(orderCode, linkInfo.orderCode()) || linkInfo.amount() == null
                    || BigDecimal.valueOf(linkInfo.amount()).compareTo(transaction.getAmount()) != 0) {
                throw new AppException("Số tiền hoặc mã đơn hàng PayOS không khớp", HttpStatus.BAD_REQUEST);
            }
            Booking booking = resolvePaymentBooking(transaction);
            validateBookingPrice(transaction, booking);
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
            recordBookingPayment(transaction, booking);
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

        long orderCode = generateUniqueOrderCode();
        String txnRef = "TNT" + orderCode;
        String providerReference = PayOSConfig.paymentReference(orderCode);
        String desc = (description != null && !description.isBlank()) ? description.trim() : ("TNT " + orderCode);

        validateBookingOrder(accountId, account, type, amount, desc);

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
                providerReference,
                buyerName,
                buyerPhone,
                payOSItems
        );

        String rawQrCode = (payOSLink != null && payOSLink.qrCode() != null && !payOSLink.qrCode().isBlank())
                ? payOSLink.qrCode()
                : null;

        String bin = (payOSLink != null && payOSLink.bin() != null && !payOSLink.bin().isBlank())
                ? payOSLink.bin()
                : payOSConfig.bankBin;
        String accountNumber = (payOSLink != null && payOSLink.accountNumber() != null && !payOSLink.accountNumber().isBlank())
                ? payOSLink.accountNumber()
                : payOSConfig.bankAccount;
        String accountHolder = (payOSLink != null && payOSLink.accountName() != null && !payOSLink.accountName().isBlank())
                ? payOSLink.accountName()
                : payOSConfig.accountHolder;

        String qrImageUrl = payOSConfig.generateVietQRUrl(bin, accountNumber, accountHolder, amount.longValue(), providerReference);
        String checkoutUrl = (payOSLink != null) ? payOSLink.checkoutUrl() : null;

        return new PaymentGatewayResponse(
                transaction.getTransactionId(),
                txnRef,
                PaymentMethod.VIETQR,
                type,
                amount,
                "PENDING",
                qrImageUrl,
                rawQrCode,
                checkoutUrl,
                null,
                payOSConfig.bankName,
                accountNumber,
                accountHolder,
                providerReference,
                "Mở Cổng PayOS để thanh toán Open Banking hoặc quét mã VietQR Napas 247",
                orderCode
        );
    }

    @Override
    @Transactional
    public PaymentGatewayResponse createPatientPayOSPaymentLink(UUID accountId, String billId) {
        if (accountId == null) {
            throw new AppException("Vui lòng đăng nhập để thanh toán hóa đơn", HttpStatus.UNAUTHORIZED);
        }
        if (billId == null || billId.isBlank()) {
            throw new AppException("Mã hóa đơn (billId) không được để trống", HttpStatus.BAD_REQUEST);
        }

        String normalizedBillId = billId.trim();
        Matcher matcher = PATIENT_BILL_ID_PATTERN.matcher(normalizedBillId);
        if (!matcher.matches()) {
            throw new AppException("Mã hóa đơn không hợp lệ: " + normalizedBillId, HttpStatus.BAD_REQUEST);
        }

        String bookingCode = matcher.group(1);
        String category = matcher.group(2);

        Booking booking = bookingRepository.findByBookingCodeForUpdate(bookingCode)
                .or(() -> bookingRepository.findByBookingCode(bookingCode))
                .orElseThrow(() -> new AppException("Không tìm thấy thông tin lịch khám của hóa đơn: " + normalizedBillId, HttpStatus.NOT_FOUND));

        UUID ownerAccountId = (booking.getPatientProfile() != null && booking.getPatientProfile().getAccount() != null)
                ? booking.getPatientProfile().getAccount().getUserId()
                : null;
        if (ownerAccountId == null || !ownerAccountId.equals(accountId)) {
            throw new AppException("Bạn không có quyền thanh toán hóa đơn của tài khoản khác", HttpStatus.FORBIDDEN);
        }
        if (booking.isDeleted() || booking.getStatus() == BookingStatus.CANCELLED) {
            throw new AppException("Lịch khám của hóa đơn này đã bị hủy hoặc không còn hiệu lực", HttpStatus.BAD_REQUEST);
        }

        if (transactionRepository.findFirstByDescriptionContainingAndStatusOrderByCreatedAtDesc(normalizedBillId, "SUCCESS").isPresent()) {
            throw new AppException("Hóa đơn này đã được thanh toán hoàn tất", HttpStatus.CONFLICT);
        }
        if (transactionRepository.findFirstByDescriptionContainingAndStatusOrderByCreatedAtDesc(normalizedBillId, "PENDING").isPresent()) {
            throw new AppException("Hóa đơn này đang có giao dịch chờ thanh toán, không thể tạo trùng", HttpStatus.CONFLICT);
        }

        com.hospital.api.service.CashierService effectiveCashierService = cashierService != null
                ? cashierService
                : new CashierServiceImpl(
                        bookingRepository,
                        recordRepository,
                        transactionRepository,
                        null,
                        dischargeRepository,
                        null,
                        testRepository,
                        prescriptionRepository,
                        new com.fasterxml.jackson.databind.ObjectMapper(),
                        null,
                        reception
                );
        List<com.hospital.api.dto.response.PatientPendingBillResponse> pendingBills = effectiveCashierService.getPatientPendingBills(accountId);
        com.hospital.api.dto.response.PatientPendingBillResponse targetBill = pendingBills.stream()
                .filter(b -> normalizedBillId.equals(b.billId()))
                .findFirst()
                .orElseThrow(() -> new AppException("Hóa đơn đã được tất toán hoặc không còn khoản phải thu: " + normalizedBillId, HttpStatus.CONFLICT));

        if ("UNRECONCILED".equalsIgnoreCase(targetBill.reconciliationStatus())
                || "UNRECONCILED".equalsIgnoreCase(targetBill.status())
                || targetBill.totalAmount() == null) {
            throw new AppException("Hóa đơn đang ở trạng thái chưa đối soát (UNRECONCILED), không thể tạo giao dịch trực tuyến", HttpStatus.CONFLICT);
        }

        BigDecimal serverAmount = targetBill.totalAmount();
        validatePaymentAmount(serverAmount);

        TransactionType txType = switch (category) {
            case "EXAM" -> TransactionType.PAY_BOOKING;
            case "TEST" -> TransactionType.PAY_MEDICAL_TEST;
            case "PRESCRIPTION" -> TransactionType.PAY_PRESCRIPTION;
            default -> throw new AppException("Danh mục hóa đơn không hợp lệ: " + category, HttpStatus.BAD_REQUEST);
        };

        Account account = accountRepository.findById(accountId)
                .orElseGet(() -> booking.getPatientProfile() != null ? booking.getPatientProfile().getAccount() : null);

        long orderCode = generateUniqueOrderCode();
        String txnRef = "TNT" + orderCode;
        String providerReference = PayOSConfig.paymentReference(orderCode);
        String desc = "Thanh toán PayOS: " + normalizedBillId;

        Transaction transaction = Transaction.builder()
                .account(account)
                .amount(serverAmount)
                .transactionType(txType)
                .paymentMethod(PaymentMethod.VIETQR)
                .status("PENDING")
                .vnpayTxnRef(txnRef)
                .orderCode(orderCode)
                .isVerified(false)
                .description(desc)
                .build();

        transaction = transactionRepository.save(transaction);

        String buyerName = (account != null && account.getFullName() != null) ? account.getFullName() : "Benh Nhan TNT";
        String buyerPhone = (account != null && account.getPhoneNumber() != null) ? account.getPhoneNumber() : "";

        List<PayOSItemRequest> payOSItems = buildPayOSItems(normalizedBillId, serverAmount);
        com.hospital.api.dto.response.PayOSLinkResponse payOSLink = payOSService.createPaymentLink(
                orderCode,
                serverAmount,
                providerReference,
                buyerName,
                buyerPhone,
                payOSItems
        );

        String rawQrCode = (payOSLink != null && payOSLink.qrCode() != null && !payOSLink.qrCode().isBlank())
                ? payOSLink.qrCode()
                : null;
        String bin = (payOSLink != null && payOSLink.bin() != null && !payOSLink.bin().isBlank())
                ? payOSLink.bin()
                : payOSConfig.bankBin;
        String accountNumber = (payOSLink != null && payOSLink.accountNumber() != null && !payOSLink.accountNumber().isBlank())
                ? payOSLink.accountNumber()
                : payOSConfig.bankAccount;
        String accountHolder = (payOSLink != null && payOSLink.accountName() != null && !payOSLink.accountName().isBlank())
                ? payOSLink.accountName()
                : payOSConfig.accountHolder;

        String qrImageUrl = payOSConfig.generateVietQRUrl(bin, accountNumber, accountHolder, serverAmount.longValue(), providerReference);
        String checkoutUrl = (payOSLink != null) ? payOSLink.checkoutUrl() : null;

        return new PaymentGatewayResponse(
                transaction.getTransactionId(),
                txnRef,
                PaymentMethod.VIETQR,
                txType,
                serverAmount,
                "PENDING",
                qrImageUrl,
                rawQrCode,
                checkoutUrl,
                null,
                payOSConfig.bankName,
                accountNumber,
                accountHolder,
                providerReference,
                "Mở Cổng PayOS để thanh toán Open Banking hoặc quét mã VietQR Napas 247",
                orderCode
        );
    }

    
    @Override
    @Transactional
    public PaymentGatewayResponse createKioskPayment(String bookingCode) {
        if (bookingCode == null || bookingCode.isBlank()) {
            throw new AppException("Mã lịch hẹn Kiosk không được để trống", HttpStatus.BAD_REQUEST);
        }
        Booking booking = bookingRepository.findByBookingCodeForUpdate(bookingCode.trim())
                .orElseThrow(() -> new AppException("Không tìm thấy lịch khám: " + bookingCode, HttpStatus.NOT_FOUND));

        if (booking.isDeleted() || booking.getStatus() == BookingStatus.CANCELLED) {
            throw new AppException("Lịch khám không còn hiệu lực", HttpStatus.BAD_REQUEST);
        }
        if (Boolean.TRUE.equals(booking.getIsPaid())) {
            throw new AppException("Lịch khám đã được thanh toán hoàn tất trước đó", HttpStatus.BAD_REQUEST);
        }
        BigDecimal amount = booking.getPrice() != null ? booking.getPrice() : BigDecimal.valueOf(200000);
        UUID accountId = (booking.getPatientProfile() != null && booking.getPatientProfile().getAccount() != null)
                ? booking.getPatientProfile().getAccount().getUserId()
                : null;
        return createVietQRPayment(accountId, amount, TransactionType.PAY_BOOKING, booking.getBookingCode());
    }

    @Override
    @Transactional
    public TransactionResponse syncKioskPayment(String bookingCode) {
        if (bookingCode == null || bookingCode.isBlank()) {
            throw new AppException("Mã lịch hẹn Kiosk không được để trống", HttpStatus.BAD_REQUEST);
        }
        Booking booking = bookingRepository.findByBookingCode(bookingCode.trim())
                .orElseThrow(() -> new AppException("Không tìm thấy lịch khám: " + bookingCode, HttpStatus.NOT_FOUND));

        Optional<Transaction> txnOpt = transactionRepository
                .findFirstByDescriptionContainingAndStatusOrderByCreatedAtDesc(booking.getBookingCode(), "PENDING");
        if (txnOpt.isEmpty()) {
            Optional<Transaction> successTxn = transactionRepository
                    .findFirstByDescriptionContainingAndStatusOrderByCreatedAtDesc(booking.getBookingCode(), "SUCCESS");
            if (successTxn.isPresent()) {
                return TransactionResponse.fromEntity(successTxn.get());
            }
            throw new AppException("Chưa có giao dịch thanh toán nào được khởi tạo cho lịch khám này", HttpStatus.NOT_FOUND);
        }

        Transaction txn = txnOpt.get();
        if (txn.getOrderCode() == null) {
            throw new AppException("Giao dịch không có mã đơn hàng PayOS", HttpStatus.BAD_REQUEST);
        }
        return syncPayOSPayment(txn.getOrderCode(), null);
    }

    private long generateUniqueOrderCode() {
        for (int i = 0; i < 5; i++) {
            long code = PayOSConfig.generateOrderCode();
            if (!transactionRepository.existsByOrderCode(code)) {
                return code;
            }
        }
        return PayOSConfig.generateOrderCode();
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

    private static final Pattern BOOKING_REFERENCE = Pattern.compile(
            "(?<![A-Za-z0-9])((?:BK|KIOSK)\\d{8}[A-Za-z0-9]{4,10})(?![A-Za-z0-9])");

    private String exactBookingCode(String description) {
        Set<String> codes = new HashSet<>();
        Matcher matcher = BOOKING_REFERENCE.matcher(description == null ? "" : description);
        while (matcher.find()) codes.add(matcher.group(1));
        if (codes.size() != 1) {
            throw new AppException("Cần đúng một mã Booking cho giao dịch", HttpStatus.BAD_REQUEST);
        }
        return codes.iterator().next();
    }

    private Booking resolvePaymentBooking(Transaction transaction) {
        if (transaction.getTransactionType() != TransactionType.PAY_BOOKING) return null;
        String code = exactBookingCode(transaction.getDescription());
        Booking booking = bookingRepository.findByBookingCodeForUpdate(code)
                .orElseThrow(() -> new AppException("Không tìm thấy Booking: " + code, HttpStatus.NOT_FOUND));
        if (booking.isDeleted() || booking.getStatus() == BookingStatus.CANCELLED) {
            throw new AppException("Booking không còn hiệu lực", HttpStatus.BAD_REQUEST);
        }
        return booking;
    }

    private void validateBookingOrder(TransactionType type, BigDecimal amount, String description) {
        validateBookingOrder(null, null, type, amount, description);
    }

    private void validateBookingOrder(UUID accountId, Account account, TransactionType type, BigDecimal amount, String description) {
        Transaction order = Transaction.builder().transactionType(type).amount(amount).description(description).build();
        Booking booking = resolvePaymentBooking(order);
        if (booking != null) {
            if (accountId != null) {
                boolean isStaff = account != null && account.getRole() != null
                        && (com.hospital.api.constant.Role.ROLE_ADMIN == account.getRole()
                            || com.hospital.api.constant.Role.ROLE_CASHIER == account.getRole()
                            || com.hospital.api.constant.Role.ROLE_NURSE == account.getRole());
                UUID bookingOwnerId = (booking.getPatientProfile() != null && booking.getPatientProfile().getAccount() != null)
                        ? booking.getPatientProfile().getAccount().getUserId()
                        : null;
                if (!isStaff && (bookingOwnerId == null || !bookingOwnerId.equals(accountId))) {
                    throw new AppException("Bạn không có quyền khởi tạo thanh toán cho lịch khám của tài khoản khác", HttpStatus.FORBIDDEN);
                }
            }
            if (Boolean.TRUE.equals(booking.getIsPaid())) {
                throw new AppException("Lịch khám này đã được thanh toán hoàn tất trước đó", HttpStatus.BAD_REQUEST);
            }
        }
        validateBookingPrice(order, booking);
    }

    private boolean consultationPayment(Transaction transaction) {
        String description = transaction.getDescription();
        return description == null || (!description.contains("-TREATMENT")
                && !description.contains("-CLS")
                && !description.contains("-TEST")
                && !description.contains("-PRESCRIPTION"));
    }

    private boolean matchesBookingPrice(Transaction transaction, Booking booking) {
        // ALL invoices may include additional services, but must cover the full consultation.
        return booking.getPrice() != null && (transaction.getDescription().contains("-ALL")
                ? transaction.getAmount().compareTo(booking.getPrice()) >= 0
                : transaction.getAmount().compareTo(booking.getPrice()) == 0);
    }

    private void validateBookingPrice(Transaction transaction, Booking booking) {
        if (booking != null && consultationPayment(transaction) && !matchesBookingPrice(transaction, booking)) {
            throw new AppException("Số tiền không khớp với Booking", HttpStatus.BAD_REQUEST);
        }
    }

    private void recordBookingPayment(Transaction transaction, Booking booking) {
        if (booking != null && consultationPayment(transaction)) {
            if (booking.getPrice() != null && booking.getPrice().signum() > 0) booking.setIsPaid(true);
            if (booking.getStatus() == BookingStatus.PENDING_PAYMENT) booking.setStatus(BookingStatus.CONFIRMED);
            bookingRepository.save(booking);
            reception.afterVerifiedPayment(booking);
        }

        if (transaction != null) {
            if (transaction.getMedicalTest() != null) {
                MedicalTest test = transaction.getMedicalTest();
                test.setIsPaid(true);
                testRepository.save(test);
            }
            if (transaction.getPrescription() != null) {
                Prescription presc = transaction.getPrescription();
                presc.setIsPaid(true);
                prescriptionRepository.save(presc);
            }
            if (transaction.getDischarge() != null) {
                Discharge discharge = transaction.getDischarge();
                discharge.setIsPaid(true);
                discharge.setSettlementStatus("SETTLED");
                dischargeRepository.save(discharge);
            }
        }
    }
}
