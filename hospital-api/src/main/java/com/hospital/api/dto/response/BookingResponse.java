package com.hospital.api.dto.response;

import com.hospital.api.constant.BookingStatus;
import com.hospital.api.entity.Booking;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Builder(toBuilder = true)
public record BookingResponse(
        UUID bookingId,
        String bookingCode,
        Integer queueNumber,
        String queueCode,
        Boolean isPriority,
        String priorityReason,
        LocalDate bookingDate,
        LocalTime startTime,
        LocalTime endTime,
        String patientName,
        String doctorName,
        String departmentName,
        String roomName,
        BigDecimal price,
        BookingStatus status,
        String symptoms,
        UUID patientProfileId,
        String patientPhone,
        LocalDate patientDob,
        String patientGender,
        String identityNumber,
        Boolean isPaid,
        LocalDateTime checkedInAt,
        LocalDateTime dispatchedAt,
        String counterTicketCode,
        Integer counterQueueNumber,
        String counterName
) {
    public BookingResponse(
            UUID bookingId, String bookingCode, Integer queueNumber, String queueCode,
            Boolean isPriority, String priorityReason, LocalDate bookingDate,
            LocalTime startTime, LocalTime endTime, String patientName, String doctorName,
            String departmentName, String roomName, BigDecimal price, BookingStatus status,
            String symptoms, UUID patientProfileId, String patientPhone, LocalDate patientDob,
            String patientGender, String identityNumber
    ) {
        this(bookingId, bookingCode, queueNumber, queueCode, isPriority, priorityReason,
                bookingDate, startTime, endTime, patientName, doctorName, departmentName,
                roomName, price, status, symptoms, patientProfileId, patientPhone,
                patientDob, patientGender, identityNumber, false, null, null, null, null, null);
    }

    public static BookingResponse fromEntity(Booking b) {
        return fromEntity(b, null, null, null);
    }

    public static BookingResponse fromEntity(Booking b, String counterTicketCode, Integer counterQueueNumber, String counterName) {
        if (b == null) return null;
        boolean priority = Boolean.TRUE.equals(b.getIsPriority());
        String qCode = (priority ? "UT-" : "KB-") + String.format("%02d", b.getQueueNumber() != null ? b.getQueueNumber() : 1);
        var p = b.getPatientProfile();

        return new BookingResponse(
                b.getBookingId(),
                b.getBookingCode(),
                b.getQueueNumber(),
                qCode,
                priority,
                b.getPriorityReason(),
                b.getBookingDate(),
                b.getTimeSlot() != null ? b.getTimeSlot().getStartTime() : null,
                b.getTimeSlot() != null ? b.getTimeSlot().getEndTime() : null,
                p != null ? p.getFullName() : "N/A",
                b.getDoctor() != null && b.getDoctor().getAccount() != null ? b.getDoctor().getAccount().getFullName() : "Bác sĩ khám",
                b.getDoctor() != null && b.getDoctor().getDepartment() != null ? b.getDoctor().getDepartment().getDepartmentName() : "Khoa khám bệnh",
                b.getTimeSlot() != null && b.getTimeSlot().getDoctorSchedule() != null && b.getTimeSlot().getDoctorSchedule().getRoom() != null ? b.getTimeSlot().getDoctorSchedule().getRoom().getRoomName() : "Phòng khám 101",
                b.getPrice(),
                b.getStatus(),
                b.getSymptoms(),
                p != null ? p.getPatientProfileId() : null,
                p != null ? (p.getPhoneNumber() != null ? p.getPhoneNumber() : (p.getAccount() != null ? p.getAccount().getPhoneNumber() : null)) : null,
                p != null ? p.getDateOfBirth() : null,
                p != null && p.getGender() != null ? p.getGender().name() : null,
                p != null ? p.getIdentityNumber() : null,
                Boolean.TRUE.equals(b.getIsPaid()),
                b.getCheckedInAt(),
                b.getDispatchedAt(),
                counterTicketCode,
                counterQueueNumber,
                counterName
        );
    }

    /**
     * Phương thức chuyển đổi bảo vệ quyền riêng tư y tế cho các truy vấn công khai
     */
    public BookingResponse withMaskedPatientInfo(String maskedName, String maskedPhone) {
        return new BookingResponse(
                this.bookingId,
                this.bookingCode,
                this.queueNumber,
                this.queueCode,
                this.isPriority,
                this.priorityReason,
                this.bookingDate,
                this.startTime,
                this.endTime,
                maskedName,
                this.doctorName,
                this.departmentName,
                this.roomName,
                this.price,
                this.status,
                null, // Ẩn triệu chứng bệnh lý
                null, // Ẩn patientProfileId để tránh lộ khóa chính DB
                maskedPhone,
                null, // Ẩn ngày sinh chi tiết
                this.patientGender,
                null, // Ẩn CCCD
                this.isPaid,
                this.checkedInAt,
                this.dispatchedAt,
                this.counterTicketCode,
                this.counterQueueNumber,
                this.counterName
        );
    }
}
