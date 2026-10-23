package com.hospital.api.dto.response;

import com.hospital.api.constant.BookingStatus;
import com.hospital.api.entity.Booking;

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
        String doctorName,
        String symptoms,
        BookingStatus status,
        LocalDateTime checkedInAt
) {
    public static NurseQueueResponse fromEntity(Booking booking) {
        var patient = booking.getPatientProfile();
        var doctor = booking.getDoctor();
        var department = doctor != null ? doctor.getDepartment() : null;
        var slot = booking.getTimeSlot();
        var schedule = slot != null ? slot.getDoctorSchedule() : null;
        boolean priority = Boolean.TRUE.equals(booking.getIsPriority());
        String queueCode = (priority ? "UT-" : "KB-") + String.format("%02d", booking.getQueueNumber() != null ? booking.getQueueNumber() : 1);
        return new NurseQueueResponse(
                booking.getBookingId(), booking.getBookingCode(), booking.getQueueNumber(), queueCode,
                priority, booking.getPriorityReason(), booking.getBookingDate(),
                slot != null ? slot.getStartTime() : null, slot != null ? slot.getEndTime() : null,
                patient != null ? patient.getFullName() : "N/A",
                patient != null ? patient.getPhoneNumber() : "",
                department != null ? department.getDepartmentName() : "",
                department != null ? department.getDepartmentId() : null,
                schedule != null && schedule.getRoom() != null ? schedule.getRoom().getRoomName() : "",
                doctor != null && doctor.getAccount() != null ? doctor.getAccount().getFullName() : "",
                booking.getSymptoms(), booking.getStatus(), booking.getCheckedInAt()
        );
    }
}
