package com.hospital.api.service.impl;

import com.hospital.api.constant.BookingStatus;
import com.hospital.api.constant.MedicalExamState;
import com.hospital.api.constant.PaymentMethod;
import com.hospital.api.constant.TransactionType;
import com.hospital.api.dto.request.NurseCheckInRequest;
import com.hospital.api.dto.request.PayAtClinicRequest;
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
    private final MedicalConceptRepository conceptRepository;
    private final MedicalObservationRepository observationRepository;
    private final Clock hospitalClock;

    @Override
    @Transactional
    public NurseCheckInResponse checkInByQr(NurseCheckInRequest request, UUID nurseUserId) {
        String code = resolveBookingCode(request);
        if (code == null || code.isBlank()) {
            throw new AppException("Vui lòng cung cấp mã QR hoặc mã đặt khám hợp lệ", HttpStatus.BAD_REQUEST);
        }

        Booking booking = bookingRepository.findByBookingCode(code)
                .orElseThrow(() -> new AppException("Không tìm thấy thông tin lượt khám với mã: " + code, HttpStatus.NOT_FOUND));

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new AppException("Lượt khám này đã bị hủy trên hệ thống, không thể tiếp đón", HttpStatus.BAD_REQUEST);
        }

        // Cập nhật trạng thái Booking sang IN_PROGRESS (Đang tiếp nhận/chờ vào buồng khám)
        booking.setStatus(BookingStatus.IN_PROGRESS);
        bookingRepository.save(booking);

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

        // Lưu thông tin sinh hiệu vào ghi chú bệnh án
        StringBuilder notes = new StringBuilder();
        if (record.getSymptoms() != null) notes.append(record.getSymptoms()).append(" | ");
        if (request.nurseNotes() != null && !request.nurseNotes().isBlank()) {
            notes.append("ĐD ghi chú: ").append(request.nurseNotes()).append(" | ");
        }
        if (request.bloodPressure() != null) notes.append("HA: ").append(request.bloodPressure()).append(" mmHg; ");
        if (request.temperature() != null) notes.append("Nhiệt độ: ").append(request.temperature()).append("°C; ");
        if (request.heartRate() != null) notes.append("Mạch: ").append(request.heartRate()).append(" bpm; ");
        if (request.spo2() != null) notes.append("SpO2: ").append(request.spo2()).append("%; ");
        if (bmi != null) notes.append("BMI: ").append(bmi).append(" (").append(bmiCategory).append("); ");

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
                .map(NurseQueueResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public ClinicReceiptResponse payAtClinic(PayAtClinicRequest request, UUID staffUserId) {
        Booking booking = bookingRepository.findById(request.bookingId())
                .orElseThrow(() -> new AppException("Không tìm thấy lượt khám để thu viện phí", HttpStatus.NOT_FOUND));

        BigDecimal amount = request.amount() != null ? request.amount() : (booking.getPrice() != null ? booking.getPrice() : BigDecimal.valueOf(200000));
        PaymentMethod method;
        try {
            method = request.paymentMethod() != null ? PaymentMethod.valueOf(request.paymentMethod()) : PaymentMethod.CASH;
        } catch (Exception e) {
            method = PaymentMethod.CASH;
        }

        Account staff = accountRepository.findById(staffUserId).orElse(null);
        String staffName = staff != null ? staff.getFullName() : "Lễ tân / Thu ngân tiếp đón";

        // Ghi nhận giao dịch thành công tại quầy
        Transaction txn = Transaction.builder()
                .account(booking.getPatientProfile() != null ? booking.getPatientProfile().getAccount() : null)
                .amount(amount)
                .transactionType(TransactionType.PAY_BOOKING)
                .paymentMethod(method)
                .status("SUCCESS")
                .isVerified(true)
                .description("Thu viện phí khám tại quầy tiếp đón - Mã phiếu: " + booking.getBookingCode())
                .orderCode(System.currentTimeMillis())
                .build();
        transactionRepository.save(txn);

        // Nếu ca khám đang chờ thanh toán tiền khám ban đầu -> Cập nhật sang CONFIRMED
        if (booking.getStatus() == BookingStatus.PENDING_PAYMENT) {
            booking.setStatus(BookingStatus.CONFIRMED);
            bookingRepository.save(booking);
        }

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
                "Thu viện phí tại quầy khám thành công. Xuất hóa đơn A5 hợp lệ."
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
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException("Không tìm thấy ca khám với ID: " + bookingId, HttpStatus.NOT_FOUND));

        BookingStatus oldStatus = booking.getStatus();
        booking.setStatus(newStatus);
        Booking saved = bookingRepository.save(booking);

        log.info("Điều dưỡng cập nhật trạng thái ca khám {}: {} -> {}", booking.getBookingCode(), oldStatus, newStatus);
        return com.hospital.api.dto.response.BookingResponse.fromEntity(saved);
    }

    private void saveObservation(MedicalExaminationRecord record, String conceptCode, BigDecimal numericVal, String textVal) {
        if (record == null || conceptCode == null) return;
        conceptRepository.findByConceptCode(conceptCode).ifPresent(concept -> {
            MedicalObservation obs = MedicalObservation.builder()
                    .medicalRecord(record)
                    .concept(concept)
                    .valueNumeric(numericVal)
                    .valueText(textVal)
                    .recordedAt(LocalDateTime.now(hospitalClock))
                    .build();
            observationRepository.save(obs);
        });
    }
}
