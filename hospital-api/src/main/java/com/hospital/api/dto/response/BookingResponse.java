package com.hospital.api.dto.response;

import com.hospital.api.constant.BookingStatus;
import com.hospital.api.entity.Booking;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

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
        String symptoms
) {
    public static BookingResponse fromEntity(Booking b) {
        boolean priority = Boolean.TRUE.equals(b.getIsPriority());
        String qCode = (priority ? "UT-" : "KB-") + String.format("%02d", b.getQueueNumber() != null ? b.getQueueNumber() : 1);

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
                b.getPatientProfile() != null ? b.getPatientProfile().getFullName() : "N/A",
                b.getDoctor() != null && b.getDoctor().getAccount() != null ? b.getDoctor().getAccount().getFullName() : "Bác sĩ khám",
                b.getDoctor() != null && b.getDoctor().getDepartment() != null ? b.getDoctor().getDepartment().getDepartmentName() : "Khoa khám bệnh",
                b.getTimeSlot() != null && b.getTimeSlot().getDoctorSchedule() != null && b.getTimeSlot().getDoctorSchedule().getRoom() != null ? b.getTimeSlot().getDoctorSchedule().getRoom().getRoomName() : "Phòng khám 101",
                b.getPrice(),
                b.getStatus(),
                b.getSymptoms()
        );
    }
}
