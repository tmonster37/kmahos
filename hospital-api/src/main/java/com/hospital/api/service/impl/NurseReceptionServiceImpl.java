package com.hospital.api.service.impl;

import com.hospital.api.constant.BookingStatus;
import com.hospital.api.constant.CounterType;
import com.hospital.api.constant.MedicalExamState;
import com.hospital.api.constant.PaymentMethod;
import com.hospital.api.constant.TransactionType;
import com.hospital.api.dto.request.KioskBookingRequest;
import com.hospital.api.dto.request.NurseCheckInRequest;
import com.hospital.api.dto.request.NurseWalkInReceptionRequest;
import com.hospital.api.dto.request.PayAtClinicRequest;
import com.hospital.api.dto.response.BookingResponse;
import com.hospital.api.dto.response.ClinicReceiptResponse;
import com.hospital.api.dto.response.NurseQueueResponse;
import com.hospital.api.dto.response.NurseCheckInResponse;
import com.hospital.api.entity.*;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.*;
import com.hospital.api.service.NurseReceptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NurseReceptionServiceImpl implements NurseReceptionService {

    private final BookingRepository bookingRepository;
    private final MedicalExaminationRecordRepository recordRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final RoomRepository roomRepository;
    private final DoctorRepository doctorRepository;
    private final DoctorScheduleRepository doctorScheduleRepository;
    private final MedicalConceptRepository conceptRepository;
    private final MedicalObservationRepository observationRepository;
    private final HospitalAdmissionRepository admissionRepository;
    private final DischargeRepository dischargeRepository;
    private final BookingReceptionTransition reception;
    private final Clock hospitalClock;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.hospital.api.service.BookingService bookingService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private PatientProfileRepository patientProfileRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private CounterRepository counterRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private CounterTicketRepository counterTicketRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.hospital.api.service.CashierService cashierService;

    @Override
    @Transactional
    public NurseCheckInResponse checkInByQr(NurseCheckInRequest request, UUID nurseUserId) {
        String code = resolveBookingCode(request);
        if (code == null || code.isBlank()) {
            throw new AppException("Vui lòng cung cấp mã QR hoặc mã đặt khám hợp lệ", HttpStatus.BAD_REQUEST);
        }

        Booking booking = bookingRepository.findByBookingCodeForUpdate(code)
                .orElseThrow(() -> new AppException("Không tìm thấy thông tin lượt khám với mã: " + code, HttpStatus.NOT_FOUND));

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new AppException("Lượt khám này đã bị hủy trên hệ thống, không thể tiếp đón", HttpStatus.BAD_REQUEST);
        }

        reception.checkIn(booking, com.hospital.api.constant.CounterType.APPOINTMENT, false);

        // Tạo hoặc lấy hồ sơ bệnh án khám lâm sàng ban đầu
        MedicalExaminationRecord record = recordRepository.findByBooking_BookingId(booking.getBookingId())
                .orElseGet(() -> {
                    MedicalExaminationRecord newRec = MedicalExaminationRecord.builder()
                            .booking(booking)
                            .doctor(booking.getDoctor())
                            .patientProfile(booking.getPatientProfile())
                            .symptoms(booking.getSymptoms())
                            .state(MedicalExamState.WAITING)
                            .isLocked(false)
                            .build();
                    return recordRepository.save(newRec);
                });

        // 1. Tự động tính chỉ số BMI và phân loại thể trạng theo chuẩn Bộ Y tế
        BigDecimal bmi = null;
        String bmiCategory = "Chưa đo sinh hiệu";
        if (request.weight() != null && request.height() != null && request.height().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal heightInM = request.height().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
            BigDecimal heightSquared = heightInM.multiply(heightInM);
            if (heightSquared.compareTo(BigDecimal.ZERO) > 0) {
                bmi = request.weight().divide(heightSquared, 2, RoundingMode.HALF_UP);
                if (bmi.compareTo(BigDecimal.valueOf(18.5)) < 0) {
                    bmiCategory = "Gầy (Thiếu cân)";
                } else if (bmi.compareTo(BigDecimal.valueOf(23.0)) < 0) {
                    bmiCategory = "Thể trạng bình thường";
                } else if (bmi.compareTo(BigDecimal.valueOf(25.0)) < 0) {
                    bmiCategory = "Thừa cân (Tiền béo phì)";
                } else {
                    bmiCategory = "Béo phì";
                }
            }
        }

        // Lưu thông tin sinh hiệu vào ghi chú bệnh án (giữ nguyên triệu chứng ban đầu, không nhân đôi khi retry)
        String baseSymptoms = booking.getSymptoms() != null ? booking.getSymptoms() : (record.getSymptoms() != null ? record.getSymptoms() : "");
        if (baseSymptoms.contains(" | ĐD ghi chú:") || baseSymptoms.contains(" | HA:")) {
            baseSymptoms = baseSymptoms.split(" \\| (ĐD ghi chú:|HA:|Nhiệt độ:)")[0].trim();
        }
        StringBuilder notes = new StringBuilder(baseSymptoms);
        if (request.nurseNotes() != null && !request.nurseNotes().isBlank()) {
            if (notes.length() > 0) notes.append(" | ");
            notes.append("ĐD ghi chú: ").append(request.nurseNotes());
        }
        if (request.bloodPressure() != null && !request.bloodPressure().isBlank()) {
            if (notes.length() > 0) notes.append(" | ");
            notes.append("HA: ").append(request.bloodPressure()).append(" mmHg");
        }
        if (request.temperature() != null) {
            if (notes.length() > 0) notes.append("; ");
            notes.append("Nhiệt độ: ").append(request.temperature()).append("°C");
        }
        if (request.heartRate() != null) {
            if (notes.length() > 0) notes.append("; ");
            notes.append("Mạch: ").append(request.heartRate()).append(" bpm");
        }
        if (request.spo2() != null) {
            if (notes.length() > 0) notes.append("; ");
            notes.append("SpO2: ").append(request.spo2()).append("%");
        }
        if (bmi != null) {
            if (notes.length() > 0) notes.append("; ");
            notes.append("BMI: ").append(bmi).append(" (").append(bmiCategory).append(")");
        }

        record.setSymptoms(notes.toString());
        recordRepository.save(record);

        // Lưu các chỉ số sinh hiệu dạng cấu trúc (Structured EHR Observations)
        if (request.weight() != null) {
            saveObservation(record, "VITAL_WEIGHT", request.weight(), null);
        }
        if (request.height() != null) {
            saveObservation(record, "VITAL_HEIGHT", request.height(), null);
        }
        if (request.temperature() != null) {
            saveObservation(record, "VITAL_TEMP", request.temperature(), null);
        }
        if (request.heartRate() != null) {
            saveObservation(record, "VITAL_PULSE", BigDecimal.valueOf(request.heartRate()), null);
        }
        if (request.spo2() != null) {
            saveObservation(record, "VITAL_SPO2", BigDecimal.valueOf(request.spo2()), null);
        }
        if (request.bloodPressure() != null && !request.bloodPressure().isBlank()) {
            String bp = request.bloodPressure().trim();
            if (bp.contains("/")) {
                String[] parts = bp.split("/");
                try {
                    BigDecimal sys = new BigDecimal(parts[0].trim());
                    saveObservation(record, "VITAL_BP_SYS", sys, null);
                } catch (Exception ignored) {}
                try {
                    BigDecimal dia = new BigDecimal(parts[1].trim());
                    saveObservation(record, "VITAL_BP_DIA", dia, null);
                } catch (Exception ignored) {}
            } else {
                saveObservation(record, "VITAL_BP_SYS", null, bp);
            }
        }

        // Lấy thông tin phòng khám
        String roomName = "Phòng Khám 101";
        if (booking.getTimeSlot() != null && booking.getTimeSlot().getDoctorSchedule() != null && booking.getTimeSlot().getDoctorSchedule().getRoom() != null) {
            roomName = booking.getTimeSlot().getDoctorSchedule().getRoom().getRoomName();
        } else if (booking.getDoctor() != null && booking.getDoctor().getDepartment() != null) {
            roomName = "Phòng " + booking.getDoctor().getDepartment().getDepartmentName();
        }

        PatientProfile patient = booking.getPatientProfile();
        String patientName = patient != null ? patient.getFullName() : "Bệnh nhân";
        String gender = patient != null && patient.getGender() != null ? patient.getGender().name() : "N/A";
        Integer birthYear = patient != null && patient.getDateOfBirth() != null ? patient.getDateOfBirth().getYear() : null;
        String deptName = (booking.getDoctor() != null && booking.getDoctor().getDepartment() != null)
                ? booking.getDoctor().getDepartment().getDepartmentName()
                : "Khoa Khám Bệnh";
        String doctorName = (booking.getDoctor() != null && booking.getDoctor().getAccount() != null)
                ? booking.getDoctor().getAccount().getFullName()
                : "Bác sĩ phụ trách";

        String checkInTime = LocalTime.now(hospitalClock).format(DateTimeFormatter.ofPattern("HH:mm:ss"));
        log.info("Lễ tân/Điều dưỡng tiếp nhận check-in QR thành công cho mã {}: STT={}, Phòng={}", code, booking.getQueueNumber(), roomName);

        return new NurseCheckInResponse(
                booking.getBookingId(),
                booking.getBookingCode(),
                booking.getQueueNumber(),
                patientName,
                gender,
                birthYear,
                deptName,
                roomName,
                doctorName,
                bmi,
                bmiCategory,
                checkInTime,
                booking.getStatus().name(),
                "Tiếp đón check-in QR thành công trong 5 giây! Mời bệnh nhân chuẩn bị vào buồng khám."
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<NurseQueueResponse> getReceptionQueue(Integer departmentId) {
        LocalDate today = LocalDate.now(hospitalClock);
        List<Booking> bookings;
        if (departmentId != null) {
            bookings = bookingRepository.findAllByDoctor_Department_DepartmentIdAndBookingDateAndDeletedFalseOrderByIsPriorityDescQueueNumberAsc(departmentId, today);
        } else {
            bookings = bookingRepository.findAllByBookingDateAndDeletedFalseOrderByIsPriorityDescQueueNumberAsc(today);
        }

        return bookings.stream()
                .filter(b -> b.getStatus() != BookingStatus.CANCELLED && b.getStatus() != BookingStatus.COMPLETED)
                .filter(b -> b.getCheckedInAt() != null)
                .map(NurseQueueResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public ClinicReceiptResponse payAtClinic(PayAtClinicRequest request, UUID staffUserId) {
        Booking booking = null;
        if (request.bookingId() != null) {
            booking = bookingRepository.findByIdWithLock(request.bookingId()).orElse(null);
        }
        if (booking == null && request.bookingCode() != null && !request.bookingCode().isBlank()) {
            String lookupCode = request.bookingCode().trim();
            if (lookupCode.startsWith("BILL-")) {
                lookupCode = lookupCode.substring("BILL-".length())
                        .replaceAll("-(EXAM|TEST|PRESCRIPTION|TREATMENT|ALL)$", "");
            }
            booking = bookingRepository.findByBookingCode(lookupCode).orElse(null);
            if (booking != null) {
                booking = bookingRepository.findByIdWithLock(booking.getBookingId()).orElse(booking);
            }
        }
        if (booking == null) {
            // Hỗ trợ thu tiền tạm ứng / viện phí nội trú tại quầy tiếp đón & thu ngân
            HospitalAdmission admission = request.bookingId() != null ? admissionRepository.findById(request.bookingId()).orElse(null) : null;
            if (admission != null) {
                Discharge discharge = dischargeRepository.findByHospitalAdmission_AdmissionId(admission.getAdmissionId()).orElse(null);
                BigDecimal defaultFee = (discharge != null && discharge.getTotalInpatientCost() != null)
                        ? discharge.getTotalInpatientCost()
                        : (admission.getDailyRoomFee() != null ? admission.getDailyRoomFee() : BigDecimal.valueOf(1000000));
                BigDecimal amount = request.amount() != null ? request.amount() : defaultFee;

                PaymentMethod method;
                try {
                    method = request.paymentMethod() != null ? PaymentMethod.valueOf(request.paymentMethod()) : PaymentMethod.CASH;
                } catch (Exception e) {
                    method = PaymentMethod.CASH;
                }

                Account staff = accountRepository.findById(staffUserId).orElse(null);
                String staffName = staff != null ? staff.getFullName() : "Thu ngân quầy nội trú";

                String admissionCode = admission.getAdmissionCode() != null ? admission.getAdmissionCode() : ("ADM-" + admission.getAdmissionId().toString().substring(0, 8));
                String billId = "BILL-INPATIENT-" + admission.getAdmissionId();

                Transaction txn = Transaction.builder()
                        .account(admission.getPatientProfile() != null ? admission.getPatientProfile().getAccount() : null)
                        .amount(amount)
                        .transactionType(TransactionType.PAY_INPATIENT_FEE)
                        .paymentMethod(method)
                        .status("SUCCESS")
                        .isVerified(true)
                        .description("Thu viện phí nội trú [" + billId + "] tại quầy tiếp đón - Hồ sơ: " + admissionCode)
                        .orderCode(System.currentTimeMillis())
                        .build();
                transactionRepository.save(txn);

                String receiptCode = "HD-NT-" + LocalDate.now(hospitalClock).format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-" + (System.currentTimeMillis() % 10000L);
                String paidAt = LocalDateTime.now(hospitalClock).format(DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy"));

                PatientProfile patient = admission.getPatientProfile();
                String patientName = patient != null ? patient.getFullName() : "Bệnh nhân nội trú";
                String phone = patient != null ? patient.getPhoneNumber() : "N/A";
                String deptName = (admission.getRoom() != null && admission.getRoom().getDepartment() != null)
                        ? admission.getRoom().getDepartment().getDepartmentName()
                        : "Khoa Điều Trị Nội Trú";
                String docName = (admission.getTreatingDoctor() != null && admission.getTreatingDoctor().getAccount() != null)
                        ? admission.getTreatingDoctor().getAccount().getFullName()
                        : "Bác sĩ điều trị";

                log.info("Thu viện phí nội trú tại quầy thành công: Biên lai {}, Số tiền {}đ, Thu ngân: {}", receiptCode, amount, staffName);

                return new ClinicReceiptResponse(
                        receiptCode,
                        admissionCode,
                        patientName,
                        phone,
                        deptName,
                        docName,
                        amount,
                        amount,
                        method.name(),
                        staffName,
                        paidAt,
                        "Thu viện phí nội trú (" + (discharge != null ? "Thanh toán xuất viện" : "Tạm ứng viện phí") + ") thành công"
                );
            }
            throw new AppException("Không tìm thấy lượt khám hoặc hồ sơ nội trú để thu viện phí", HttpStatus.NOT_FOUND);
        }

        PaymentMethod method;
        try { method = request.paymentMethod() == null ? PaymentMethod.CASH : PaymentMethod.valueOf(request.paymentMethod()); }
        catch (IllegalArgumentException ex) { throw new AppException("Phương thức thanh toán không hợp lệ", HttpStatus.BAD_REQUEST); }
        if (method != PaymentMethod.CASH && method != PaymentMethod.COUNTER_CASH && method != PaymentMethod.POS
                && method != PaymentMethod.VIETQR && method != PaymentMethod.PAYOS) {
            throw new AppException("Phương thức thanh toán " + method + " không được hỗ trợ tại quầy tiếp đón", HttpStatus.BAD_REQUEST);
        }
        Account staff = accountRepository.findById(staffUserId).orElse(null);
        String staffName = staff == null ? "Thu ngân tiếp đón" : staff.getFullName();

        if (booking.getPrice() == null) {
            BigDecimal derivedPrice = request.amount() != null ? request.amount() : BigDecimal.ZERO;
            booking.setPrice(derivedPrice);
        }
        BigDecimal amount = request.amount() != null ? request.amount() : booking.getPrice();
        if (amount == null) {
            amount = booking.getPrice();
        }
        boolean isExplicitTreatmentBill = request.bookingCode() != null
                && request.bookingCode().trim().matches("(?i)^BILL-.*-(TEST|PRESCRIPTION|TREATMENT)$");
        if ((Boolean.TRUE.equals(booking.getIsPaid()) || isExplicitTreatmentBill)
                && amount.signum() > 0
                && amount.compareTo(booking.getPrice()) != 0
                && cashierService != null) {
            String targetBillCode = isExplicitTreatmentBill
                    ? request.bookingCode().trim()
                    : "BILL-" + booking.getBookingCode() + "-TREATMENT";
            var cashierReceipt = cashierService.processPayment(
                    staffName,
                    new com.hospital.api.dto.request.CashierPaymentRequest(
                            targetBillCode,
                            method,
                            amount,
                            request.cashierNotes()
                    )
            );
            String paidAtStr = LocalDateTime.now(hospitalClock).format(DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy"));
            return new ClinicReceiptResponse(
                    cashierReceipt.receiptCode(),
                    booking.getBookingCode(),
                    cashierReceipt.patientName(),
                    cashierReceipt.phoneNumber(),
                    cashierReceipt.departmentName(),
                    cashierReceipt.doctorName(),
                    cashierReceipt.totalAmount(),
                    cashierReceipt.amountGiven(),
                    method.name(),
                    staffName,
                    paidAtStr,
                    "Thu phí cận lâm sàng / điều trị tại quầy tiếp đón thành công.",
                    "PENDING_BILLS"
            );
        }
        if (amount.compareTo(booking.getPrice()) != 0 || amount.signum() < 0) {
            throw new AppException("Số tiền không khớp tiền khám (hệ thống yêu cầu: " + booking.getPrice() + "đ)", HttpStatus.BAD_REQUEST);
        }
        if (amount.signum() > 0 && !Boolean.TRUE.equals(booking.getIsPaid())) {
            Transaction txn = Transaction.builder()
                    .account(booking.getPatientProfile() != null ? booking.getPatientProfile().getAccount() : null)
                    .amount(amount).transactionType(TransactionType.PAY_BOOKING).paymentMethod(method)
                    .status("SUCCESS").isVerified(true).vnpayTxnRef("CLINIC:" + booking.getBookingId())
                    .description("Thu tiền khám tại quầy - " + booking.getBookingCode()).build();
            transactionRepository.save(txn);
            booking.setIsPaid(true);
        }
        reception.checkIn(booking, com.hospital.api.constant.CounterType.APPOINTMENT, false);

        int qNum = booking.getQueueNumber() != null ? booking.getQueueNumber() : 1;
        String receiptCode = "HD-" + LocalDate.now(hospitalClock).format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-" + String.format("%04d", qNum);
        String paidAt = LocalDateTime.now(hospitalClock).format(DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy"));

        PatientProfile patient = booking.getPatientProfile();
        String patientName = patient != null ? patient.getFullName() : "Bệnh nhân";
        String phone = patient != null ? patient.getPhoneNumber() : "N/A";
        String deptName = (booking.getDoctor() != null && booking.getDoctor().getDepartment() != null)
                ? booking.getDoctor().getDepartment().getDepartmentName()
                : "Khoa Khám Bệnh";
        String docName = (booking.getDoctor() != null && booking.getDoctor().getAccount() != null)
                ? booking.getDoctor().getAccount().getFullName()
                : "Bác sĩ phụ trách";

        log.info("Thu viện phí tại quầy thành công: Phiếu {}, Số tiền {}đ, Thu ngân: {}", receiptCode, amount, staffName);

        String source = "ONLINE_APPOINTMENT";
        if (booking.getSymptoms() != null && booking.getSymptoms().contains("Kiosk")) {
            source = "KIOSK_TICKET";
        } else if (booking.getSymptoms() != null && booking.getSymptoms().contains("quầy tiếp đón")) {
            source = "COUNTER_WALKIN";
        }

        return new ClinicReceiptResponse(
                receiptCode,
                booking.getBookingCode(),
                patientName,
                phone,
                deptName,
                docName,
                booking.getPrice(),
                amount,
                method.name(),
                staffName,
                paidAt,
                "Thu viện phí tại quầy khám thành công. Xuất hóa đơn A5 hợp lệ.",
                source
        );
    }

    private String resolveBookingCode(NurseCheckInRequest request) {
        if (request.bookingCode() != null && !request.bookingCode().isBlank()) {
            return request.bookingCode().trim();
        }
        if (request.qrData() != null && !request.qrData().isBlank()) {
            String raw = request.qrData().trim();
            if (raw.startsWith("BK")) {
                return raw;
            }
            if (raw.contains("code=")) {
                int idx = raw.indexOf("code=");
                String sub = raw.substring(idx + 5);
                int amp = sub.indexOf('&');
                return amp != -1 ? sub.substring(0, amp) : sub;
            }
            return raw;
        }
        return null;
    }

    @Override
    @Transactional
    public com.hospital.api.dto.response.BookingResponse updateBookingStatus(UUID bookingId, BookingStatus newStatus) {
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new AppException("Không tìm thấy ca khám với ID: " + bookingId, HttpStatus.NOT_FOUND));

        BookingStatus oldStatus = booking.getStatus();
        booking.setStatus(newStatus);
        Booking saved = bookingRepository.save(booking);

        log.info("Điều dưỡng cập nhật trạng thái ca khám {}: {} -> {}", booking.getBookingCode(), oldStatus, newStatus);
        return com.hospital.api.dto.response.BookingResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public NurseQueueResponse dispatchBooking(UUID bookingId, Integer roomId, String roomName, UUID doctorId) {
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new AppException("Không tìm thấy lượt khám", HttpStatus.NOT_FOUND));
        reception.dispatchTo(booking, roomId, roomName, doctorId);
        return NurseQueueResponse.fromEntity(booking);
    }

    @Override
    @Transactional
    public NurseQueueResponse admitWalkInPatient(NurseWalkInReceptionRequest request, UUID nurseUserId) {
        if (request == null) {
            throw new AppException("Dữ liệu tiếp nhận không được để trống", HttpStatus.BAD_REQUEST);
        }

        // 0. Kiểm tra Idempotency Key để chống tạo lượt trùng khi retry hoặc double-click
        if (request.idempotencyKey() != null && !request.idempotencyKey().isBlank() && counterTicketRepository != null) {
            var existingTicket = counterTicketRepository.findByIdempotencyKeyAndDeletedFalse(request.idempotencyKey().trim());
            if (existingTicket.isPresent() && existingTicket.get().getBooking() != null) {
                log.info("Idempotent walk-in reception hit for key: {}", request.idempotencyKey());
                return NurseQueueResponse.fromEntity(existingTicket.get().getBooking());
            }
        }

        LocalDate today = LocalDate.now(hospitalClock);
        boolean isPriority = Boolean.TRUE.equals(request.isPriority());
        String priorityReason = request.priorityReason();

        if (request.dateOfBirth() != null) {
            int age = today.getYear() - request.dateOfBirth().getYear();
            if (age >= 65) {
                isPriority = true;
                if (priorityReason == null || priorityReason.isBlank()) {
                    priorityReason = "Người cao tuổi (" + age + " tuổi)";
                }
            } else if (age < 6) {
                isPriority = true;
                if (priorityReason == null || priorityReason.isBlank()) {
                    priorityReason = "Trẻ nhỏ dưới 6 tuổi (" + age + " tuổi)";
                }
            }
        }

        // 1. Tạo lượt khám và hồ sơ bệnh nhân qua BookingService
        int birthYear = request.dateOfBirth() != null ? request.dateOfBirth().getYear() : 1990;
        String symptomsDesc = request.symptoms() != null && !request.symptoms().isBlank()
                ? request.symptoms()
                : "Tiếp nhận vãng lai tại quầy tiếp đón";
        if (!symptomsDesc.contains("quầy tiếp đón")) {
            symptomsDesc = symptomsDesc + " (Tiếp nhận tại quầy tiếp đón)";
        }

        if (bookingService == null) {
            throw new AppException("Dịch vụ đặt khám chưa sẵn sàng", HttpStatus.INTERNAL_SERVER_ERROR);
        }

        BookingResponse bookingResponse = bookingService.createKioskBooking(new KioskBookingRequest(
                request.fullName(),
                request.phoneNumber(),
                request.departmentId(),
                birthYear,
                isPriority,
                priorityReason,
                symptomsDesc,
                false
        ));

        Booking booking = bookingRepository.findByBookingCodeForUpdate(bookingResponse.bookingCode())
                .orElseThrow(() -> new AppException("Không thể khởi tạo lượt khám cho bệnh nhân vãng lai", HttpStatus.INTERNAL_SERVER_ERROR));

        // 2. Cập nhật các thông tin chi tiết của PatientProfile nếu có
        PatientProfile profile = booking.getPatientProfile();
        if (profile != null) {
            boolean updated = false;
            if (request.identityNumber() != null && !request.identityNumber().isBlank()) {
                profile.setIdentityNumber(request.identityNumber().trim());
                updated = true;
            }
            if (request.gender() != null && !request.gender().isBlank()) {
                try {
                    profile.setGender(com.hospital.api.constant.Gender.valueOf(request.gender().toUpperCase()));
                    updated = true;
                } catch (Exception ignored) {}
            }
            if (request.dateOfBirth() != null) {
                profile.setDateOfBirth(request.dateOfBirth());
                updated = true;
            }
            if (request.address() != null && !request.address().isBlank()) {
                profile.setStreetAddress(request.address().trim());
                updated = true;
            }
            if (updated && patientProfileRepository != null) {
                patientProfileRepository.save(profile);
            }
        }

        // 3. Cấp phiếu quầy tiếp đón CounterTicket
        CounterType targetType = isPriority ? CounterType.PRIORITY : (Boolean.TRUE.equals(request.hasInsurance()) ? CounterType.INSURANCE : CounterType.GENERAL);
        CounterTicket ticket = reception.ensureTicket(booking, targetType, Boolean.TRUE.equals(request.hasInsurance()));
        if (request.idempotencyKey() != null && !request.idempotencyKey().isBlank()) {
            ticket.setIdempotencyKey(request.idempotencyKey().trim());
        }
        if (request.counterId() != null && counterRepository != null) {
            counterRepository.findById(request.counterId()).ifPresent(ticket::setCounter);
        }
        if (counterTicketRepository != null) {
            counterTicketRepository.save(ticket);
        }

        // 4. Nếu có đo sinh hiệu thực tế, tạo và lưu MedicalObservation
        if (request.weight() != null || request.height() != null || request.bloodPressure() != null
                || request.temperature() != null || request.heartRate() != null || request.spo2() != null
                || (request.nurseNotes() != null && !request.nurseNotes().isBlank())) {
            MedicalExaminationRecord record = recordRepository.findByBooking_BookingId(booking.getBookingId())
                    .orElseGet(() -> {
                        MedicalExaminationRecord newRec = MedicalExaminationRecord.builder()
                                .booking(booking)
                                .doctor(booking.getDoctor())
                                .patientProfile(booking.getPatientProfile())
                                .symptoms(booking.getSymptoms())
                                .state(MedicalExamState.WAITING)
                                .isLocked(false)
                                .build();
                        return recordRepository.save(newRec);
                    });

            BigDecimal bmi = null;
            String bmiCategory = "Chưa đo sinh hiệu";
            if (request.weight() != null && request.height() != null && request.height().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal heightInM = request.height().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
                BigDecimal heightSquared = heightInM.multiply(heightInM);
                if (heightSquared.compareTo(BigDecimal.ZERO) > 0) {
                    bmi = request.weight().divide(heightSquared, 2, RoundingMode.HALF_UP);
                    if (bmi.compareTo(BigDecimal.valueOf(18.5)) < 0) {
                        bmiCategory = "Gầy (Thiếu cân)";
                    } else if (bmi.compareTo(BigDecimal.valueOf(23.0)) < 0) {
                        bmiCategory = "Thể trạng bình thường";
                    } else if (bmi.compareTo(BigDecimal.valueOf(25.0)) < 0) {
                        bmiCategory = "Thừa cân (Tiền béo phì)";
                    } else {
                        bmiCategory = "Béo phì";
                    }
                }
            }

            StringBuilder notes = new StringBuilder(booking.getSymptoms() != null ? booking.getSymptoms() : "");
            if (request.nurseNotes() != null && !request.nurseNotes().isBlank()) {
                if (notes.length() > 0) notes.append(" | ");
                notes.append("ĐD ghi chú: ").append(request.nurseNotes());
            }
            if (request.bloodPressure() != null && !request.bloodPressure().isBlank()) {
                if (notes.length() > 0) notes.append(" | ");
                notes.append("HA: ").append(request.bloodPressure()).append(" mmHg");
            }
            if (request.temperature() != null) {
                if (notes.length() > 0) notes.append("; ");
                notes.append("Nhiệt độ: ").append(request.temperature()).append("°C");
            }
            if (request.heartRate() != null) {
                if (notes.length() > 0) notes.append("; ");
                notes.append("Mạch: ").append(request.heartRate()).append(" bpm");
            }
            if (request.spo2() != null) {
                if (notes.length() > 0) notes.append("; ");
                notes.append("SpO2: ").append(request.spo2()).append("%");
            }
            if (bmi != null) {
                if (notes.length() > 0) notes.append("; ");
                notes.append("BMI: ").append(bmi).append(" (").append(bmiCategory).append(")");
            }

            record.setSymptoms(notes.toString());
            recordRepository.save(record);

            if (request.weight() != null) saveObservation(record, "VITAL_WEIGHT", request.weight(), null);
            if (request.height() != null) saveObservation(record, "VITAL_HEIGHT", request.height(), null);
            if (request.temperature() != null) saveObservation(record, "VITAL_TEMP", request.temperature(), null);
            if (request.heartRate() != null) saveObservation(record, "VITAL_PULSE", BigDecimal.valueOf(request.heartRate()), null);
            if (request.spo2() != null) saveObservation(record, "VITAL_SPO2", BigDecimal.valueOf(request.spo2()), null);
            if (request.bloodPressure() != null && !request.bloodPressure().isBlank()) {
                String bp = request.bloodPressure().trim();
                if (bp.contains("/")) {
                    String[] parts = bp.split("/");
                    try {
                        BigDecimal sys = new BigDecimal(parts[0].trim());
                        saveObservation(record, "VITAL_BP_SYS", sys, null);
                    } catch (Exception ignored) {}
                    try {
                        BigDecimal dia = new BigDecimal(parts[1].trim());
                        saveObservation(record, "VITAL_BP_DIA", dia, null);
                    } catch (Exception ignored) {}
                } else {
                    saveObservation(record, "VITAL_BP_SYS", null, bp);
                }
            }
        }

        log.info("Điều dưỡng [{}] tiếp nhận bệnh nhân vãng lai thành công: Mã ca={}, STT={}, Bệnh nhân={}",
                nurseUserId, booking.getBookingCode(), booking.getQueueNumber(), request.fullName());

        return NurseQueueResponse.fromEntity(booking);
    }

    private void saveObservation(MedicalExaminationRecord record, String conceptCode, BigDecimal numericVal, String textVal) {
        if (record == null || conceptCode == null) return;
        conceptRepository.findByConceptCode(conceptCode).ifPresent(concept -> {
            MedicalObservation obs = observationRepository
                    .findByMedicalRecord_RecordIdAndConcept_ConceptCode(record.getRecordId(), conceptCode)
                    .orElseGet(() -> MedicalObservation.builder()
                            .medicalRecord(record)
                            .concept(concept)
                            .build());
            obs.setValueNumeric(numericVal);
            obs.setValueText(textVal);
            obs.setRecordedAt(LocalDateTime.now(hospitalClock));
            observationRepository.save(obs);
        });
    }
}
