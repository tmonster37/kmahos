package com.hospital.api.dto.response;

import com.hospital.api.constant.BookingStatus;
import com.hospital.api.entity.Booking;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

public record NurseQueueResponse(
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
        String patientPhone,
        String departmentName,
        Integer departmentId,
        String roomName,
        Integer roomId,
        String doctorName,
        UUID doctorId,
        String symptoms,
        BookingStatus status,
        LocalDateTime checkedInAt,
        LocalDateTime dispatchedAt,
        Boolean isDispatched,
        Boolean isPaid,
        BigDecimal price,
        UUID patientProfileId,
        String patientGender,
        LocalDate patientDob,
        Integer birthYear,
        String receptionSource
) {
    public NurseQueueResponse(
            UUID bookingId, String bookingCode, Integer queueNumber, String queueCode,
            Boolean isPriority, String priorityReason, LocalDate bookingDate,
            LocalTime startTime, LocalTime endTime, String patientName, String patientPhone,
            String departmentName, Integer departmentId, String roomName, Integer roomId,
            String doctorName, UUID doctorId, String symptoms, BookingStatus status,
            LocalDateTime checkedInAt, LocalDateTime dispatchedAt, Boolean isDispatched,
            Boolean isPaid, BigDecimal price, UUID patientProfileId, String patientGender,
            LocalDate patientDob, Integer birthYear
    ) {
        this(bookingId, bookingCode, queueNumber, queueCode, isPriority, priorityReason,
                bookingDate, startTime, endTime, patientName, patientPhone, departmentName,
                departmentId, roomName, roomId, doctorName, doctorId, symptoms, status,
                checkedInAt, dispatchedAt, isDispatched, isPaid, price, patientProfileId,
                patientGender, patientDob, birthYear, "ONLINE_APPOINTMENT");
    }

    public static NurseQueueResponse fromEntity(Booking booking) {
        var patient = booking.getPatientProfile();
        var doctor = booking.getDoctor();
        var department = doctor != null ? doctor.getDepartment() : null;
        var slot = booking.getTimeSlot();
        var schedule = slot != null ? slot.getDoctorSchedule() : null;
        var room = schedule != null ? schedule.getRoom() : null;
        boolean priority = Boolean.TRUE.equals(booking.getIsPriority());
        String queueCode = (priority ? "UT-" : "KB-") + String.format("%02d", booking.getQueueNumber() != null ? booking.getQueueNumber() : 1);
        boolean isDispatched = com.hospital.api.service.impl.BookingReceptionTransition.doctorEligible(booking);
        boolean isPaid = Boolean.TRUE.equals(booking.getIsPaid());

        String source = "ONLINE_APPOINTMENT";
        if (booking.getSymptoms() != null && booking.getSymptoms().contains("Kiosk")) {
            source = "KIOSK_TICKET";
        } else if (booking.getSymptoms() != null && booking.getSymptoms().contains("quầy tiếp đón")) {
            source = "COUNTER_WALKIN";
        }

        return new NurseQueueResponse(
                booking.getBookingId(), booking.getBookingCode(), booking.getQueueNumber(), queueCode,
                priority, booking.getPriorityReason(), booking.getBookingDate(),
                slot != null ? slot.getStartTime() : null, slot != null ? slot.getEndTime() : null,
                patient != null ? patient.getFullName() : "N/A",
                patient != null ? patient.getPhoneNumber() : "",
                department != null ? department.getDepartmentName() : "",
                department != null ? department.getDepartmentId() : null,
                room != null ? room.getRoomName() : "",
                room != null ? room.getRoomId() : null,
                doctor != null && doctor.getAccount() != null ? doctor.getAccount().getFullName() : "",
                doctor != null ? doctor.getDoctorId() : null,
                booking.getSymptoms(), booking.getStatus(), booking.getCheckedInAt(),
                booking.getDispatchedAt(),
                isDispatched,
                isPaid,
                booking.getPrice(),
                patient != null ? patient.getPatientProfileId() : null,
                patient != null && patient.getGender() != null ? patient.getGender().name() : null,
                patient != null ? patient.getDateOfBirth() : null,
                patient != null && patient.getDateOfBirth() != null ? patient.getDateOfBirth().getYear() : null,
                source
        );
    }
}
