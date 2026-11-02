package com.hospital.api.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.api.constant.BookingStatus;
import com.hospital.api.constant.PaymentMethod;
import com.hospital.api.constant.TransactionType;
import com.hospital.api.dto.request.CashierPaymentRequest;
import com.hospital.api.dto.response.CashierBillItemDto;
import com.hospital.api.dto.response.CashierPendingBillResponse;
import com.hospital.api.dto.response.CashierReceiptResponse;
import com.hospital.api.entity.*;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.BookingRepository;
import com.hospital.api.repository.MedicalExaminationRecordRepository;
import com.hospital.api.repository.NotificationRepository;
import com.hospital.api.repository.TransactionRepository;
import com.hospital.api.service.CashierService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class CashierServiceImpl implements CashierService {

    private final BookingRepository bookingRepository;
    private final MedicalExaminationRecordRepository recordRepository;
    private final TransactionRepository transactionRepository;
    private final NotificationRepository notificationRepository;
    private final com.hospital.api.repository.DischargeRepository dischargeRepository;
    private final com.hospital.api.repository.HospitalAdmissionRepository admissionRepository;
    private final ObjectMapper objectMapper;
    private final com.hospital.api.service.AuditLogService auditLogService;
    private final BookingReceptionTransition reception;

    private static final Pattern BOOKING_CODE_PATTERN = Pattern.compile("(BK|KIOSK)[A-Za-z0-9]+");
    private boolean exactBookingReference(String description, String bookingCode) {
        if (description == null) return false;
        java.util.regex.Matcher matcher = BOOKING_CODE_PATTERN.matcher(description);
        java.util.Set<String> codes = new java.util.HashSet<>();
        while (matcher.find()) codes.add(matcher.group());
        return codes.size() == 1 && codes.contains(bookingCode);
    }

    private static final String SNAPSHOT_PREFIX = "[SNAPSHOT:";
    private static final String SNAPSHOT_SUFFIX = "]";

    @Override
    @Transactional(readOnly = true)
    public List<CashierPendingBillResponse> getPendingBills() {
        return getPendingBills(null, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CashierPendingBillResponse> getPendingBillsForPatient(UUID accountId) {
        if (accountId == null) return Collections.emptyList();
        List<Booking> patientBookings = bookingRepository.findAllByPatientProfile_Account_UserIdAndDeletedFalseOrderByCreatedAtDesc(accountId);
        return buildBillsFromBookings(patientBookings);
    }

    private List<CashierPendingBillResponse> buildBillsFromBookings(List<Booking> bookings) {
        List<CashierPendingBillResponse> pendingBills = new ArrayList<>();
        if (bookings == null) return pendingBills;

        for (Booking booking : bookings) {
            if (booking.getStatus() == BookingStatus.CANCELLED) {
                continue;
            }

            String code = booking.getBookingCode();
            List<Transaction> txns = transactionRepository.findAllByDescriptionContainingAndStatus(code, "SUCCESS");
            BigDecimal totalPaid = txns.stream()
                    .map(Transaction::getAmount)
                    .filter(java.util.Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            List<CashierBillItemDto> examItems = buildExamItems(booking);
            BigDecimal examPrice = examItems.stream()
                    .map(CashierBillItemDto::totalPrice)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            List<CashierBillItemDto> treatmentItems = buildTreatmentItems(booking);
            BigDecimal treatmentPrice = treatmentItems.stream()
                    .map(CashierBillItemDto::totalPrice)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal totalBill = examPrice.add(treatmentPrice);

            // Nếu toàn bộ viện phí đã được đóng đủ (hoặc thừa) -> không còn nợ
            if (totalPaid.compareTo(totalBill) >= 0) {
                continue;
            }

            PatientProfile p = booking.getPatientProfile();
            Doctor doc = booking.getDoctor();
            String deptName = (doc != null && doc.getDepartment() != null)
                    ? doc.getDepartment().getDepartmentName()
                    : "Khoa Khám Bệnh";
            String doctorName = (doc != null && doc.getAccount() != null && doc.getAccount().getFullName() != null)
                    ? doc.getAccount().getFullName()
                    : "Bác sĩ phụ trách";

            LocalDateTime createdTime = booking.getCreatedAt() != null
                    ? LocalDateTime.ofInstant(booking.getCreatedAt(), ZoneId.systemDefault())
                    : LocalDateTime.now();

            // 1. Hóa đơn 01: Tiền công khám ban đầu (nếu chưa đóng đủ tiền khám)
            if (examPrice.compareTo(BigDecimal.ZERO) > 0 && totalPaid.compareTo(examPrice) < 0) {
                BigDecimal remainingExam = examPrice.subtract(totalPaid);
                pendingBills.add(new CashierPendingBillResponse(
                        "BILL-" + code + "-EXAM",
                        code,
                        booking.getBookingId(),
                        p != null ? p.getFullName() : "Khách hàng",
                        p != null ? p.getPhoneNumber() : "",
                        p != null && p.getIdentityNumber() != null ? p.getIdentityNumber() : "",
                        p != null && p.getGender() != null ? p.getGender().name() : "",
                        p != null && p.getStreetAddress() != null ? p.getStreetAddress() : "",
                        deptName,
                        doctorName,
                        "EXAM",
                        examItems,
                        remainingExam,
                        "UNPAID",
                        createdTime
                ));
            }

            // 2. Hóa đơn 02: Tiền cận lâm sàng & Đơn thuốc phát sinh trong quá trình khám
            if (treatmentPrice.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal remainingTreatment;
                if (totalPaid.compareTo(examPrice) <= 0) {
                    remainingTreatment = treatmentPrice;
                } else {
                    remainingTreatment = totalBill.subtract(totalPaid);
                }

                if (remainingTreatment.compareTo(BigDecimal.ZERO) > 0) {
                    boolean hasTest = treatmentItems.stream().anyMatch(i -> "TEST".equals(i.category()));
                    boolean hasMed = treatmentItems.stream().anyMatch(i -> "MEDICINE".equals(i.category()));
                    String treatmentBillType = (hasTest && hasMed) ? "ALL" : (hasMed ? "PRESCRIPTION" : "TEST");

                    pendingBills.add(new CashierPendingBillResponse(
                            "BILL-" + code + "-TREATMENT",
                            code,
                            booking.getBookingId(),
                            p != null ? p.getFullName() : "Khách hàng",
                            p != null ? p.getPhoneNumber() : "",
                            p != null && p.getIdentityNumber() != null ? p.getIdentityNumber() : "",
                            p != null && p.getGender() != null ? p.getGender().name() : "",
                            p != null && p.getStreetAddress() != null ? p.getStreetAddress() : "",
                            deptName,
                            doctorName,
                            treatmentBillType,
                            treatmentItems,
                            remainingTreatment,
                            "UNPAID",
                            createdTime
                    ));
                }
            }
        }
        return pendingBills;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CashierPendingBillResponse> getPendingBills(Integer page, Integer size) {
        List<Booking> allBookings = bookingRepository.findAllByDeletedFalseOrderByCreatedAtDesc();
        List<CashierPendingBillResponse> pendingBills = buildBillsFromBookings(allBookings);

        // 3. Thêm hóa đơn viện phí xuất viện nội trú (Inpatient Discharge Bills)
        List<Discharge> discharges = dischargeRepository.findAll();
        for (Discharge discharge : discharges) {
            HospitalAdmission admission = discharge.getHospitalAdmission();
            if (admission == null) {
                continue;
            }

            BigDecimal totalInpatientCost = discharge.getTotalInpatientCost() != null ? discharge.getTotalInpatientCost() : BigDecimal.ZERO;
            if (totalInpatientCost.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            String inpatientBillCode = "BILL-INPATIENT-" + admission.getAdmissionId();
            String admissionCode = admission.getAdmissionCode() != null ? admission.getAdmissionCode() : ("ADM-" + admission.getAdmissionId().toString().substring(0, 8));

            List<Transaction> txns = transactionRepository.findAllByDescriptionContainingAndStatus(inpatientBillCode, "SUCCESS");
            if (txns.isEmpty() && admission.getAdmissionCode() != null) {
                txns = transactionRepository.findAllByDescriptionContainingAndStatus(admission.getAdmissionCode(), "SUCCESS");
            }

            BigDecimal totalPaid = txns.stream()
                    .map(Transaction::getAmount)
                    .filter(java.util.Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            if (totalPaid.compareTo(totalInpatientCost) >= 0) {
                continue;
            }

            BigDecimal remainingInpatient = totalInpatientCost.subtract(totalPaid);
            PatientProfile p = admission.getPatientProfile();
            Doctor doc = admission.getTreatingDoctor();
            String deptName = (admission.getRoom() != null && admission.getRoom().getDepartment() != null)
                    ? admission.getRoom().getDepartment().getDepartmentName()
                    : (doc != null && doc.getDepartment() != null ? doc.getDepartment().getDepartmentName() : "Khoa Điều Trị Nội Trú");
            String doctorName = (doc != null && doc.getAccount() != null && doc.getAccount().getFullName() != null)
                    ? doc.getAccount().getFullName()
                    : "Bác sĩ điều trị";

            LocalDateTime dischargeTime = discharge.getDischargeDate() != null
                    ? LocalDateTime.ofInstant(discharge.getDischargeDate(), ZoneId.systemDefault())
                    : LocalDateTime.now();

            BigDecimal dailyFee = admission.getDailyRoomFee() != null ? admission.getDailyRoomFee() : BigDecimal.valueOf(300000);
            List<CashierBillItemDto> inpatientItems = List.of(
                    new CashierBillItemDto(
                            "INPATIENT-" + admission.getAdmissionId(),
                            "Viện phí điều trị nội trú - Tiền giường (" + discharge.getTotalDays() + " ngày)",
                            discharge.getTotalDays(),
                            dailyFee,
                            totalInpatientCost,
                            "INPATIENT"
                    )
            );

            pendingBills.add(new CashierPendingBillResponse(
                    inpatientBillCode,
                    admissionCode,
                    admission.getAdmissionId(),
                    p != null ? p.getFullName() : "Bệnh nhân nội trú",
                    p != null ? p.getPhoneNumber() : "",
                    p != null && p.getIdentityNumber() != null ? p.getIdentityNumber() : "",
                    p != null && p.getGender() != null ? p.getGender().name() : "",
                    p != null && p.getStreetAddress() != null ? p.getStreetAddress() : "",
                    deptName,
                    doctorName,
                    "INPATIENT",
                    inpatientItems,
                    remainingInpatient,
                    "UNPAID",
                    dischargeTime
            ));
        }

        // 4. Thêm bệnh nhân đang điều trị nội trú (Active Inpatient Admissions) cần tạm ứng / viện phí
        List<HospitalAdmission> activeAdmissions = admissionRepository.findAllByState(com.hospital.api.constant.HospitalAdmissionState.ADMITTED);
        for (HospitalAdmission adm : activeAdmissions) {
            boolean alreadyAdded = pendingBills.stream().anyMatch(b -> b.bookingId() != null && b.bookingId().equals(adm.getAdmissionId()));
            if (alreadyAdded) continue;

            String inpatientBillCode = "BILL-INPATIENT-" + adm.getAdmissionId();
            String admissionCode = adm.getAdmissionCode() != null ? adm.getAdmissionCode() : ("ADM-" + adm.getAdmissionId().toString().substring(0, 8));

            List<Transaction> txns = transactionRepository.findAllByDescriptionContainingAndStatus(inpatientBillCode, "SUCCESS");
            if (txns.isEmpty() && adm.getAdmissionCode() != null) {
                txns = transactionRepository.findAllByDescriptionContainingAndStatus(adm.getAdmissionCode(), "SUCCESS");
            }
            BigDecimal totalPaid = txns.stream()
                    .map(Transaction::getAmount)
                    .filter(java.util.Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            long daysStayed = Math.max(1, java.time.Duration.between(adm.getAdmissionDate(), java.time.Instant.now()).toDays());
            BigDecimal dailyFee = adm.getDailyRoomFee() != null ? adm.getDailyRoomFee() : BigDecimal.valueOf(300000);
            BigDecimal currentCost = dailyFee.multiply(BigDecimal.valueOf(daysStayed));
            BigDecimal advanceTarget = currentCost.max(BigDecimal.valueOf(1000000));

            if (totalPaid.compareTo(advanceTarget) >= 0) {
                continue;
            }

            BigDecimal remaining = advanceTarget.subtract(totalPaid);
            PatientProfile p = adm.getPatientProfile();
            Doctor doc = adm.getTreatingDoctor();
            String deptName = (adm.getRoom() != null && adm.getRoom().getDepartment() != null)
                    ? adm.getRoom().getDepartment().getDepartmentName()
                    : (doc != null && doc.getDepartment() != null ? doc.getDepartment().getDepartmentName() : "Khoa Điều Trị Nội Trú");
            String doctorName = (doc != null && doc.getAccount() != null && doc.getAccount().getFullName() != null)
                    ? doc.getAccount().getFullName()
                    : "Bác sĩ điều trị";

            List<CashierBillItemDto> inpatientItems = List.of(
                    new CashierBillItemDto(
                            "INPATIENT-ADV-" + adm.getAdmissionId(),
                            "Tạm ứng viện phí điều trị nội trú (" + (adm.getRoom() != null ? adm.getRoom().getRoomName() : "Phòng nội trú") + ")",
                            1,
                            remaining,
                            remaining,
                            "INPATIENT"
                    )
            );

            LocalDateTime admTime = LocalDateTime.ofInstant(adm.getAdmissionDate(), ZoneId.systemDefault());

            pendingBills.add(new CashierPendingBillResponse(
                    inpatientBillCode,
                    admissionCode,
                    adm.getAdmissionId(),
                    p != null ? p.getFullName() : "Bệnh nhân nội trú",
                    p != null ? p.getPhoneNumber() : "",
                    p != null && p.getIdentityNumber() != null ? p.getIdentityNumber() : "",
                    p != null && p.getGender() != null ? p.getGender().name() : "",
                    p != null && p.getStreetAddress() != null ? p.getStreetAddress() : "",
                    deptName,
                    doctorName,
                    "INPATIENT",
                    inpatientItems,
                    remaining,
                    "UNPAID",
                    admTime
            ));
        }

        if (page != null && size != null && size > 0 && page >= 0) {
            int fromIndex = page * size;
            if (fromIndex >= pendingBills.size()) {
                return Collections.emptyList();
            }
            int toIndex = Math.min(fromIndex + size, pendingBills.size());
            return pendingBills.subList(fromIndex, toIndex);
        }

        return pendingBills;
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public CashierReceiptResponse processPayment(String cashierUsername, CashierPaymentRequest request) {
        String input = request.bookingCode().trim();
        if (input.startsWith("BILL-INPATIENT-") || input.contains("INPATIENT") || input.startsWith("HA-") || input.startsWith("ADM-")) {
            return processInpatientPayment(cashierUsername, input, request);
        }

        String rawBookingCode = input;
        String invoiceTarget = "AUTO"; // EXAM, TREATMENT, ALL, or AUTO

        if (input.startsWith("BILL-")) {
            String sub = input.substring("BILL-".length());
            if (sub.endsWith("-EXAM")) {
                rawBookingCode = sub.substring(0, sub.length() - "-EXAM".length());
                invoiceTarget = "EXAM";
            } else if (sub.endsWith("-TREATMENT")) {
                rawBookingCode = sub.substring(0, sub.length() - "-TREATMENT".length());
                invoiceTarget = "TREATMENT";
            } else if (sub.endsWith("-ALL")) {
                rawBookingCode = sub.substring(0, sub.length() - "-ALL".length());
                invoiceTarget = "ALL";
            } else {
                rawBookingCode = sub;
                invoiceTarget = "AUTO";
            }
        }

        final String bookingCode = rawBookingCode;

        // 1. Pessimistic Write Lock ở mức database để chống đồng thời/race condition thu trùng
        Booking booking = bookingRepository.findByBookingCodeForUpdate(bookingCode)
                .orElseThrow(() -> new AppException("Không tìm thấy ca khám với mã: " + bookingCode, HttpStatus.NOT_FOUND));

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new AppException("Ca khám [" + bookingCode + "] đã bị hủy, không thể thu phí!", HttpStatus.BAD_REQUEST);
        }

        // 2. Xác thực phương thức thanh toán tại quầy
        PaymentMethod method = request.paymentMethod();
        if (method != PaymentMethod.CASH && method != PaymentMethod.COUNTER_CASH
                && method != PaymentMethod.POS && method != PaymentMethod.VIETQR && method != PaymentMethod.PAYOS) {
            throw new AppException("Phương thức thanh toán " + method + " không được hỗ trợ tại quầy thu ngân!", HttpStatus.BAD_REQUEST);
        }

        // 3. Tính toán tổng viện phí và số tiền đã thanh toán trước đó
        List<Transaction> txns = transactionRepository.findAllByDescriptionContainingAndStatus(bookingCode, "SUCCESS").stream()
                .filter(t -> t.getTransactionType() == TransactionType.PAY_BOOKING)
                .filter(t -> Boolean.TRUE.equals(t.getIsVerified()) || t.getPaymentMethod() == PaymentMethod.CASH || t.getPaymentMethod() == PaymentMethod.COUNTER_CASH || t.getPaymentMethod() == PaymentMethod.POS)
                .filter(t -> exactBookingReference(t.getDescription(), bookingCode)).toList();
        BigDecimal totalPaid = txns.stream()
                .map(Transaction::getAmount)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<CashierBillItemDto> examItems = buildExamItems(booking);
        BigDecimal examPrice = examItems.stream()
                .map(CashierBillItemDto::totalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<CashierBillItemDto> treatmentItems = buildTreatmentItems(booking);
        BigDecimal treatmentPrice = treatmentItems.stream()
                .map(CashierBillItemDto::totalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalBill = examPrice.add(treatmentPrice);

        List<CashierBillItemDto> itemsToBill;
        BigDecimal billAmount;
        String billId;
        String invoiceTitle;

        boolean isDigitalQr = (method == PaymentMethod.PAYOS || method == PaymentMethod.VIETQR);

        if ("EXAM".equalsIgnoreCase(invoiceTarget)) {
            itemsToBill = examItems;
            billId = "BILL-" + bookingCode + "-EXAM";
            invoiceTitle = "công khám ban đầu";
            if (totalPaid.compareTo(examPrice) >= 0) {
                return buildExistingReceipt(booking, cashierUsername, billId, bookingCode, examPrice, method, itemsToBill, request.notes(), txns);
            }
            billAmount = examPrice.subtract(totalPaid);
        } else if ("TREATMENT".equalsIgnoreCase(invoiceTarget)) {
            if (treatmentPrice.compareTo(BigDecimal.ZERO) <= 0) {
                throw new AppException("Ca khám [" + bookingCode + "] chưa có chỉ định cận lâm sàng hoặc đơn thuốc phát sinh!", HttpStatus.BAD_REQUEST);
            }
            itemsToBill = treatmentItems;
            billId = "BILL-" + bookingCode + "-TREATMENT";
            invoiceTitle = "xét nghiệm & thuốc phát sinh";
            BigDecimal remainingTreatment = (totalPaid.compareTo(examPrice) <= 0)
                    ? treatmentPrice
                    : totalBill.subtract(totalPaid);
            if (remainingTreatment.compareTo(BigDecimal.ZERO) <= 0) {
                return buildExistingReceipt(booking, cashierUsername, billId, bookingCode, treatmentPrice, method, itemsToBill, request.notes(), txns);
            }
            billAmount = remainingTreatment;
        } else {
            // ALL or AUTO
            BigDecimal remaining = totalBill.subtract(totalPaid);
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
                itemsToBill = new ArrayList<>(examItems);
                itemsToBill.addAll(treatmentItems);
                billId = "BILL-" + bookingCode + "-ALL";
                return buildExistingReceipt(booking, cashierUsername, billId, bookingCode, totalBill, method, itemsToBill, request.notes(), txns);
            }
            if (totalPaid.compareTo(examPrice) >= 0 && treatmentPrice.compareTo(BigDecimal.ZERO) > 0) {
                itemsToBill = treatmentItems;
                billAmount = remaining;
                billId = "BILL-" + bookingCode + "-TREATMENT";
                invoiceTitle = "xét nghiệm & thuốc phát sinh";
            } else if (treatmentPrice.compareTo(BigDecimal.ZERO) == 0) {
                itemsToBill = examItems;
                billAmount = remaining;
                billId = "BILL-" + bookingCode + "-EXAM";
                invoiceTitle = "công khám ban đầu";
            } else {
                itemsToBill = new ArrayList<>(examItems);
                itemsToBill.addAll(treatmentItems);
                billAmount = remaining;
                billId = "BILL-" + bookingCode + "-ALL";
                invoiceTitle = "toàn bộ viện phí";
            }
        }

        if (billAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException("Số tiền viện phí cần thanh toán không hợp lệ hoặc bằng 0!", HttpStatus.BAD_REQUEST);
        }

        BigDecimal amountGiven;
        BigDecimal amountChange;

        if (method == PaymentMethod.CASH || method == PaymentMethod.COUNTER_CASH) {
            amountGiven = request.amountGiven() != null ? request.amountGiven() : billAmount;
            if (amountGiven.compareTo(billAmount) < 0) {
                throw new AppException("Số tiền khách đưa (" + amountGiven + " VNĐ) không đủ thanh toán (" + billAmount + " VNĐ)", HttpStatus.BAD_REQUEST);
            }
            amountChange = amountGiven.subtract(billAmount);
        } else {
            // POS, VIETQR, PAYOS: Số tiền đưa khớp chính xác với hóa đơn
            amountGiven = billAmount;
            amountChange = BigDecimal.ZERO;
        }

        if (isDigitalQr) {
            throw new AppException("Chưa có xác nhận thanh toán điện tử cho hóa đơn", HttpStatus.PAYMENT_REQUIRED);
        }

        String receiptCode = "RC-" + bookingCode + "-" + ("EXAM".equalsIgnoreCase(invoiceTarget) ? "EXAM-" : ("TREATMENT".equalsIgnoreCase(invoiceTarget) ? "CLS-" : "")) + (System.currentTimeMillis() % 1000000L);
        String cashierName = (cashierUsername != null && !cashierUsername.isBlank()) ? cashierUsername : "Thu ngân quầy";

        Account account = (booking.getPatientProfile() != null) ? booking.getPatientProfile().getAccount() : null;

        // 4. Lưu JSON Snapshot danh mục dịch vụ để đảm bảo tính bất biến của biên lai (Receipt Immutability)
        String itemsSnapshotJson = null;
        try {
            itemsSnapshotJson = objectMapper.writeValueAsString(itemsToBill);
        } catch (Exception ex) {
            log.warn("Không thể serialize danh sách dịch vụ cho biên lai {}: {}", receiptCode, ex.getMessage());
        }

        String description = "Thu ngân viện phí " + invoiceTitle + " [" + billId + "] cho ca khám [" + bookingCode + "] bởi thu ngân " + cashierName;
        if (itemsSnapshotJson != null) {
            description += "\n" + SNAPSHOT_PREFIX + itemsSnapshotJson + SNAPSHOT_SUFFIX;
        }

        Transaction transaction = Transaction.builder()
                .account(account)
                .amount(billAmount)
                .transactionType(TransactionType.PAY_BOOKING)
                .paymentMethod(method)
                .status("SUCCESS")
                .vnpayTxnRef(receiptCode)
                .isVerified(true)
                .description(description)
                .build();

        Transaction savedTxn = transactionRepository.save(transaction);

        // Ghi Audit Log nghiệp vụ tài chính thu ngân
        auditLogService.log(
                null,
                cashierName,
                "ROLE_CASHIER",
                "CASHIER_PAYMENT",
                "TRANSACTION",
                savedTxn.getTransactionId().toString(),
                "Thu ngân thanh toán " + invoiceTitle + " [" + billId + "] số tiền " + billAmount + " VNĐ qua " + method + " cho ca khám " + bookingCode,
                null
        );

        if (!billId.endsWith("-TREATMENT") && booking.getPrice() != null && booking.getPrice().signum() > 0) booking.setIsPaid(true);
        reception.checkIn(booking, com.hospital.api.constant.CounterType.APPOINTMENT, false);

        // 6. Gửi thông báo đến bệnh nhân nếu có tài khoản
        try {
            if (account != null) {
                Notification notif = Notification.builder()
                        .account(account)
                        .title("Biên lai viện phí điện tử (" + billId + ")")
                        .content("Ca khám [" + bookingCode + "] đã được thu ngân ghi nhận thanh toán thành công số tiền " + billAmount + " VNĐ. Mã biên lai: " + receiptCode)
                        .type("PAYMENT_SUCCESS")
                        .isRead(false)
                        .build();
                notificationRepository.save(notif);
            }
        } catch (Exception ex) {
            log.warn("Không thể gửi thông báo cho bệnh nhân {}: {}", bookingCode, ex.getMessage());
        }

        PatientProfile p = booking.getPatientProfile();
        Doctor doc = booking.getDoctor();
        String deptName = (doc != null && doc.getDepartment() != null)
                ? doc.getDepartment().getDepartmentName()
                : "Khoa Khám Bệnh";

        return new CashierReceiptResponse(
                receiptCode,
                billId,
                bookingCode,
                savedTxn.getTransactionId(),
                p != null ? p.getFullName() : "Khách hàng",
                p != null ? p.getPhoneNumber() : "",
                p != null && p.getIdentityNumber() != null ? p.getIdentityNumber() : "",
                deptName,
                (doc != null && doc.getAccount() != null && doc.getAccount().getFullName() != null) ? doc.getAccount().getFullName() : "Bác sĩ phụ trách",
                itemsToBill,
                billAmount,
                method,
                amountGiven,
                amountChange,
                "SUCCESS",
                LocalDateTime.now(),
                cashierName,
                request.notes()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<CashierReceiptResponse> getPaymentHistory() {
        return getPaymentHistory(null, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CashierReceiptResponse> getPaymentHistory(Integer page, Integer size) {
        List<Transaction> transactions;
        if (page != null && size != null && size > 0 && page >= 0) {
            Pageable pageable = PageRequest.of(page, Math.min(size, 100));
            transactions = transactionRepository.findAllByOrderByCreatedAtDesc(pageable).getContent();
        } else {
            transactions = transactionRepository.findAllByOrderByCreatedAtDesc();
        }

        List<CashierReceiptResponse> history = new ArrayList<>();

        for (Transaction txn : transactions) {
            String rawDesc = txn.getDescription() != null ? txn.getDescription() : "";
            String ref = txn.getVnpayTxnRef() != null ? txn.getVnpayTxnRef() : "";

            boolean isCashierTxn = rawDesc.contains("Thu ngân viện phí")
                    || ref.startsWith("RC-")
                    || txn.getTransactionType() == TransactionType.PAY_BOOKING
                    || txn.getTransactionType() == TransactionType.PAY_INPATIENT_FEE;

            if (!isCashierTxn || !"SUCCESS".equalsIgnoreCase(txn.getStatus())) {
                continue;
            }

            // 1. Thử trích xuất Snapshot items được lưu trong transaction để tránh N+1 và bảo đảm bất biến
            List<CashierBillItemDto> snapshotItems = extractSnapshotItems(rawDesc);

            String bookingCode = extractBookingCode(rawDesc, ref);
            List<CashierBillItemDto> items;
            String patientName = "Khách hàng";
            String phone = "";
            String idCard = "";
            String deptName = "Khoa Khám Bệnh";
            String doctorName = "Bác sĩ phụ trách";

            if (snapshotItems != null && !snapshotItems.isEmpty()) {
                // Đã có snapshot bất biến, không cần query lại booking hay record
                items = snapshotItems;
                if (txn.getAccount() != null) {
                    patientName = txn.getAccount().getFullName() != null ? txn.getAccount().getFullName() : "Khách hàng";
                    phone = txn.getAccount().getPhoneNumber() != null ? txn.getAccount().getPhoneNumber() : "";
                }
            } else {
                // Fallback cho dữ liệu cũ chưa có snapshot
                Booking booking = bookingCode != null ? bookingRepository.findByBookingCode(bookingCode).orElse(null) : null;
                if (booking != null) {
                    items = buildBillItems(booking);
                    if (booking.getPatientProfile() != null) {
                        patientName = booking.getPatientProfile().getFullName();
                        phone = booking.getPatientProfile().getPhoneNumber();
                        idCard = booking.getPatientProfile().getIdentityNumber() != null ? booking.getPatientProfile().getIdentityNumber() : "";
                    }
                    if (booking.getDoctor() != null) {
                        if (booking.getDoctor().getAccount() != null && booking.getDoctor().getAccount().getFullName() != null) {
                            doctorName = booking.getDoctor().getAccount().getFullName();
                        }
                        if (booking.getDoctor().getDepartment() != null) {
                            deptName = booking.getDoctor().getDepartment().getDepartmentName();
                        }
                    }
                } else {
                    items = List.of(new CashierBillItemDto("FEE", "Thu viện phí tại quầy", 1, txn.getAmount(), txn.getAmount(), "EXAM"));
                    if (txn.getAccount() != null) {
                        patientName = txn.getAccount().getFullName() != null ? txn.getAccount().getFullName() : "Khách hàng";
                        phone = txn.getAccount().getPhoneNumber() != null ? txn.getAccount().getPhoneNumber() : "";
                    }
                }
            }

            LocalDateTime paidAt = txn.getCreatedAt() != null
                    ? LocalDateTime.ofInstant(txn.getCreatedAt(), ZoneId.systemDefault())
                    : LocalDateTime.now();

            String cashierName = "Thu ngân quầy";
            if (rawDesc.contains("bởi thu ngân ")) {
                int start = rawDesc.indexOf("bởi thu ngân ") + "bởi thu ngân ".length();
                int end = rawDesc.indexOf("\n", start);
                cashierName = (end > start ? rawDesc.substring(start, end) : rawDesc.substring(start)).trim();
            }

            // Clean description loại bỏ snapshot JSON nội bộ
            String cleanDesc = rawDesc;
            int snapIdx = cleanDesc.indexOf(SNAPSHOT_PREFIX);
            if (snapIdx >= 0) {
                cleanDesc = cleanDesc.substring(0, snapIdx).trim();
            }

            history.add(new CashierReceiptResponse(
                    ref.isBlank() ? "RC-" + txn.getTransactionId().toString().substring(0, 8).toUpperCase() : ref,
                    bookingCode != null ? "BILL-" + bookingCode : "BILL-" + txn.getTransactionId(),
                    bookingCode != null ? bookingCode : "---",
                    txn.getTransactionId(),
                    patientName,
                    phone,
                    idCard,
                    deptName,
                    doctorName,
                    items,
                    txn.getAmount(),
                    txn.getPaymentMethod(),
                    txn.getAmount(),
                    BigDecimal.ZERO,
                    "SUCCESS",
                    paidAt,
                    cashierName,
                    cleanDesc
            ));
        }

        return history;
    }

    private List<CashierBillItemDto> extractSnapshotItems(String description) {
        if (description == null || !description.contains(SNAPSHOT_PREFIX)) {
            return null;
        }
        try {
            int start = description.indexOf(SNAPSHOT_PREFIX) + SNAPSHOT_PREFIX.length();
            int end = description.lastIndexOf(SNAPSHOT_SUFFIX);
            if (end > start) {
                String json = description.substring(start, end).trim();
                return objectMapper.readValue(json, new TypeReference<List<CashierBillItemDto>>() {});
            }
        } catch (Exception ex) {
            log.debug("Không thể trích xuất snapshot items từ description: {}", ex.getMessage());
        }
        return null;
    }

    private List<CashierBillItemDto> buildExamItems(Booking booking) {
        List<CashierBillItemDto> items = new ArrayList<>();
        BigDecimal examPrice = booking.getPrice() != null ? booking.getPrice() : BigDecimal.ZERO;
        String deptName = (booking.getDoctor() != null && booking.getDoctor().getDepartment() != null)
                ? booking.getDoctor().getDepartment().getDepartmentName()
                : "Chuyên khoa";
        items.add(new CashierBillItemDto(
                "EXAM-" + booking.getBookingCode(),
                "Phiếu khám " + deptName,
                1,
                examPrice,
                examPrice,
                "EXAM"
        ));
        return items;
    }

    private List<CashierBillItemDto> buildTreatmentItems(Booking booking) {
        List<CashierBillItemDto> items = new ArrayList<>();
        recordRepository.findByBooking_BookingCode(booking.getBookingCode()).ifPresent(record -> {
            if (record.getMedicalTests() != null) {
                for (MedicalTest test : record.getMedicalTests()) {
                    BigDecimal testPrice = test.getPrice() != null ? test.getPrice() : BigDecimal.ZERO;
                    String testName = (test.getMedicalService() != null)
                            ? test.getMedicalService().getServiceName()
                            : "Xét nghiệm / Cận lâm sàng (" + test.getTestCode() + ")";
                    items.add(new CashierBillItemDto(
                            "TEST-" + test.getTestCode(),
                            testName,
                            1,
                            testPrice,
                            testPrice,
                            "TEST"
                    ));
                }
            }

            if (record.getPrescription() != null && record.getPrescription().getPrescriptionItems() != null) {
                for (PrescriptionItem pItem : record.getPrescription().getPrescriptionItems()) {
                    String medName = (pItem.getMedicine() != null)
                            ? pItem.getMedicine().getMedicineName()
                            : "Thuốc";
                    BigDecimal unitPrice = pItem.getUnitPrice() != null ? pItem.getUnitPrice() : BigDecimal.ZERO;
                    Integer qty = pItem.getQuantity() != null ? pItem.getQuantity() : 1;
                    BigDecimal itemTotal = pItem.getTotalPrice() != null
                            ? pItem.getTotalPrice()
                            : unitPrice.multiply(BigDecimal.valueOf(qty));

                    items.add(new CashierBillItemDto(
                            "MED-" + pItem.getPrescriptionItemId(),
                            medName,
                            qty,
                            unitPrice,
                            itemTotal,
                            "MEDICINE"
                    ));
                }
            }
        });
        return items;
    }

    private List<CashierBillItemDto> buildBillItems(Booking booking) {
        List<CashierBillItemDto> items = new ArrayList<>(buildExamItems(booking));
        items.addAll(buildTreatmentItems(booking));
        return items;
    }

    private String extractBookingCode(String desc, String ref) {
        if (ref != null && (ref.startsWith("RC-BK") || ref.startsWith("RC-KIOSK"))) {
            Matcher matcher = BOOKING_CODE_PATTERN.matcher(ref);
            if (matcher.find()) {
                return matcher.group();
            }
        }
        if (desc != null) {
            Matcher matcher = Pattern.compile("(HA-[A-Za-z0-9-]+|ADM-[A-Za-z0-9-]+|BK[A-Za-z0-9]+|KIOSK[A-Za-z0-9]+)").matcher(desc);
            if (matcher.find()) {
                return matcher.group();
            }
        }
        return null;
    }

    private CashierReceiptResponse processInpatientPayment(String cashierUsername, String input, CashierPaymentRequest request) {
        String key = input.replace("BILL-INPATIENT-", "").trim();
        UUID admissionId = null;
        try {
            admissionId = UUID.fromString(key);
        } catch (Exception ignored) {}

        Discharge discharge = null;
        HospitalAdmission admission = null;
        if (admissionId != null) {
            discharge = dischargeRepository.findByHospitalAdmission_AdmissionId(admissionId).orElse(null);
            if (discharge != null) {
                admission = discharge.getHospitalAdmission();
            } else {
                admission = admissionRepository.findById(admissionId).orElse(null);
            }
        }
        if (discharge == null && admission == null) {
            admission = admissionRepository.findByAdmissionCode(key).orElse(null);
            if (admission != null) {
                discharge = dischargeRepository.findByHospitalAdmission_AdmissionId(admission.getAdmissionId()).orElse(null);
            }
        }
        if (discharge == null && admission == null) {
            throw new AppException("Không tìm thấy thông tin xuất viện / viện phí nội trú tương ứng với mã: " + input, HttpStatus.NOT_FOUND);
        }
        if (admission == null && discharge != null) {
            admission = discharge.getHospitalAdmission();
        }

        PaymentMethod method = request.paymentMethod();
        if (method != PaymentMethod.CASH && method != PaymentMethod.COUNTER_CASH
                && method != PaymentMethod.POS && method != PaymentMethod.VIETQR && method != PaymentMethod.PAYOS) {
            throw new AppException("Phương thức thanh toán " + method + " không được hỗ trợ tại quầy thu ngân!", HttpStatus.BAD_REQUEST);
        }

        BigDecimal dailyFee = admission.getDailyRoomFee() != null ? admission.getDailyRoomFee() : BigDecimal.valueOf(300000);
        int days;
        BigDecimal totalCost;
        String itemTitle;

        if (discharge != null) {
            days = discharge.getTotalDays() != null && discharge.getTotalDays() > 0 ? discharge.getTotalDays() : 1;
            totalCost = discharge.getTotalInpatientCost() != null ? discharge.getTotalInpatientCost() : dailyFee.multiply(BigDecimal.valueOf(days));
            itemTitle = "Viện phí điều trị nội trú - Tiền giường (" + days + " ngày)";
        } else {
            long daysStayed = Math.max(1, java.time.Duration.between(admission.getAdmissionDate(), java.time.Instant.now()).toDays());
            days = (int) daysStayed;
            totalCost = dailyFee.multiply(BigDecimal.valueOf(days)).max(BigDecimal.valueOf(1000000));
            itemTitle = "Tạm ứng viện phí điều trị nội trú (" + (admission.getRoom() != null ? admission.getRoom().getRoomName() : "Nội trú") + " - " + days + " ngày)";
        }

        String billId = "BILL-INPATIENT-" + admission.getAdmissionId();
        String admissionCode = admission.getAdmissionCode() != null ? admission.getAdmissionCode() : ("ADM-" + admission.getAdmissionId().toString().substring(0, 8));

        List<Transaction> txns = transactionRepository.findAllByDescriptionContainingAndStatus(billId, "SUCCESS");
        if (txns.isEmpty() && admission.getAdmissionCode() != null) {
            txns = transactionRepository.findAllByDescriptionContainingAndStatus(admission.getAdmissionCode(), "SUCCESS");
        }
        BigDecimal totalPaid = txns.stream()
                .map(Transaction::getAmount)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalPaid.compareTo(totalCost) >= 0 && discharge != null) {
            throw new AppException("Hóa đơn viện phí nội trú [" + billId + "] đã được thanh toán đầy đủ trước đó!", HttpStatus.CONFLICT);
        }

        BigDecimal billAmount;
        if (discharge != null) {
            billAmount = totalCost.subtract(totalPaid);
        } else {
            billAmount = (request.amountGiven() != null && request.amountGiven().compareTo(BigDecimal.ZERO) > 0)
                    ? request.amountGiven()
                    : totalCost.subtract(totalPaid).max(BigDecimal.valueOf(1000000));
        }

        if (billAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException("Số tiền viện phí nội trú cần thanh toán không hợp lệ hoặc bằng 0!", HttpStatus.BAD_REQUEST);
        }

        BigDecimal amountGiven;
        BigDecimal amountChange;
        if (method == PaymentMethod.CASH || method == PaymentMethod.COUNTER_CASH) {
            amountGiven = request.amountGiven() != null ? request.amountGiven() : billAmount;
            if (amountGiven.compareTo(billAmount) < 0) {
                throw new AppException("Số tiền khách đưa (" + amountGiven + " VNĐ) không đủ thanh toán (" + billAmount + " VNĐ)", HttpStatus.BAD_REQUEST);
            }
            amountChange = amountGiven.subtract(billAmount);
        } else {
            amountGiven = billAmount;
            amountChange = BigDecimal.ZERO;
        }

        String receiptCode = "RC-INP-" + (System.currentTimeMillis() % 10000000L);
        String cashierName = (cashierUsername != null && !cashierUsername.isBlank()) ? cashierUsername : "Thu ngân quầy";
        Account account = (admission.getPatientProfile() != null) ? admission.getPatientProfile().getAccount() : null;

        List<CashierBillItemDto> itemsToBill = List.of(
                new CashierBillItemDto(
                        "INPATIENT-" + admission.getAdmissionId(),
                        itemTitle,
                        days,
                        dailyFee,
                        billAmount,
                        "INPATIENT"
                )
        );

        String itemsSnapshotJson = null;
        try {
            itemsSnapshotJson = objectMapper.writeValueAsString(itemsToBill);
        } catch (Exception ex) {
            log.warn("Không thể serialize danh sách dịch vụ nội trú cho biên lai {}: {}", receiptCode, ex.getMessage());
        }

        String description = "Thu ngân viện phí nội trú [" + billId + "] cho hồ sơ [" + admissionCode + "] bởi thu ngân " + cashierName;
        if (itemsSnapshotJson != null) {
            description += "\n" + SNAPSHOT_PREFIX + itemsSnapshotJson + SNAPSHOT_SUFFIX;
        }

        Transaction transaction = Transaction.builder()
                .account(account)
                .amount(billAmount)
                .transactionType(TransactionType.PAY_INPATIENT_FEE)
                .paymentMethod(method)
                .status("SUCCESS")
                .vnpayTxnRef(receiptCode)
                .description(description)
                .build();

        Transaction savedTxn = transactionRepository.save(transaction);

        auditLogService.log(
                null,
                cashierName,
                "ROLE_CASHIER",
                "CASHIER_PAYMENT_INPATIENT",
                "TRANSACTION",
                savedTxn.getTransactionId().toString(),
                "Thu ngân thanh toán viện phí xuất viện nội trú [" + billId + "] số tiền " + billAmount + " VNĐ qua " + method + " cho hồ sơ " + admissionCode,
                null
        );

        try {
            if (account != null) {
                Notification notif = Notification.builder()
                        .account(account)
                        .title("Biên lai viện phí nội trú điện tử (" + billId + ")")
                        .content("Hồ sơ nội trú [" + admissionCode + "] đã được thu ngân ghi nhận thanh toán thành công số tiền " + billAmount + " VNĐ. Mã biên lai: " + receiptCode)
                        .type("PAYMENT_SUCCESS")
                        .isRead(false)
                        .build();
                notificationRepository.save(notif);
            }
        } catch (Exception ex) {
            log.warn("Không thể gửi thông báo cho bệnh nhân nội trú {}: {}", admissionCode, ex.getMessage());
        }

        PatientProfile p = admission.getPatientProfile();
        Doctor doc = admission.getTreatingDoctor();
        String deptName = (admission.getRoom() != null && admission.getRoom().getDepartment() != null)
                ? admission.getRoom().getDepartment().getDepartmentName()
                : (doc != null && doc.getDepartment() != null ? doc.getDepartment().getDepartmentName() : "Khoa Điều Trị Nội Trú");
        String doctorName = (doc != null && doc.getAccount() != null && doc.getAccount().getFullName() != null)
                ? doc.getAccount().getFullName()
                : "Bác sĩ điều trị";

        return new CashierReceiptResponse(
                receiptCode,
                billId,
                admissionCode,
                savedTxn.getTransactionId(),
                p != null ? p.getFullName() : "Bệnh nhân nội trú",
                p != null ? p.getPhoneNumber() : "",
                p != null && p.getIdentityNumber() != null ? p.getIdentityNumber() : "",
                deptName,
                doctorName,
                itemsToBill,
                billAmount,
                method,
                amountGiven,
                amountChange,
                "SUCCESS",
                LocalDateTime.now(),
                cashierName,
                request.notes()
        );
    }

    private CashierReceiptResponse buildExistingReceipt(
            Booking booking,
            String cashierUsername,
            String billId,
            String bookingCode,
            BigDecimal billAmount,
            PaymentMethod method,
            List<CashierBillItemDto> itemsToBill,
            String notes,
            List<Transaction> txns
    ) {
        Transaction existingTxn = txns.stream()
                .filter(t -> "SUCCESS".equalsIgnoreCase(t.getStatus()))
                .findFirst()
                .orElse(null);

        String receiptCode = (existingTxn != null && existingTxn.getVnpayTxnRef() != null && !existingTxn.getVnpayTxnRef().isBlank())
                ? (existingTxn.getVnpayTxnRef().startsWith("RC-") ? existingTxn.getVnpayTxnRef() : "RC-" + existingTxn.getVnpayTxnRef())
                : ("RC-" + bookingCode + "-" + (System.currentTimeMillis() % 1000000L));

        String cashierName = (cashierUsername != null && !cashierUsername.isBlank()) ? cashierUsername : "Thu ngân quầy";
        PatientProfile p = booking.getPatientProfile();
        Doctor doc = booking.getDoctor();
        String deptName = (doc != null && doc.getDepartment() != null)
                ? doc.getDepartment().getDepartmentName()
                : "Khoa Khám Bệnh";

        BigDecimal consultationPaid = txns.stream().filter(t -> t.getDescription() != null && !t.getDescription().contains("-TREATMENT") && !t.getDescription().contains("-CLS"))
                .map(Transaction::getAmount).filter(java.util.Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (booking.getPrice() != null && booking.getPrice().signum() > 0 && consultationPaid.compareTo(booking.getPrice()) >= 0) booking.setIsPaid(true);
        reception.checkIn(booking, com.hospital.api.constant.CounterType.APPOINTMENT, false);

        return new CashierReceiptResponse(
                receiptCode,
                billId,
                bookingCode,
                existingTxn != null ? existingTxn.getTransactionId() : null,
                p != null ? p.getFullName() : "Khách hàng",
                p != null ? p.getPhoneNumber() : "",
                p != null && p.getIdentityNumber() != null ? p.getIdentityNumber() : "",
                deptName,
                (doc != null && doc.getAccount() != null && doc.getAccount().getFullName() != null) ? doc.getAccount().getFullName() : "Bác sĩ phụ trách",
                itemsToBill,
                billAmount,
                method,
                billAmount,
                BigDecimal.ZERO,
                "SUCCESS",
                existingTxn != null && existingTxn.getCreatedAt() != null
                        ? LocalDateTime.ofInstant(existingTxn.getCreatedAt(), ZoneId.systemDefault())
                        : LocalDateTime.now(),
                cashierName,
                notes
        );
    }
}
