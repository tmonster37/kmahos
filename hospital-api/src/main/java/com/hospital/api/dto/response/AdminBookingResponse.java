package com.hospital.api.dto.response;

import com.hospital.api.constant.BookingStatus;
import com.hospital.api.entity.Booking;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

public record AdminBookingResponse(
        UUID bookingId,
        String bookingCode,
        Integer queueNumber,
        LocalDate bookingDate,
        LocalTime startTime,
        LocalTime endTime,
        String patientName,
        String patientPhone,
        String doctorName,
        String departmentName,
        Integer departmentId,
        String roomName,
        Boolean isPriority,
        BookingStatus status,
        LocalDateTime checkedInAt
) {
    public static AdminBookingResponse fromEntity(Booking booking) {
        var patient = booking.getPatientProfile();
        var doctor = booking.getDoctor();
        var schedule = booking.getTimeSlot() != null ? booking.getTimeSlot().getDoctorSchedule() : null;
        var department = doctor != null ? doctor.getDepartment() : null;
        return new AdminBookingResponse(
                booking.getBookingId(),
                booking.getBookingCode(),
                booking.getQueueNumber(),
                booking.getBookingDate(),
                booking.getTimeSlot() != null ? booking.getTimeSlot().getStartTime() : null,
                booking.getTimeSlot() != null ? booking.getTimeSlot().getEndTime() : null,
                patient != null ? patient.getFullName() : "N/A",
                patient != null ? patient.getPhoneNumber() : "",
                doctor != null && doctor.getAccount() != null ? doctor.getAccount().getFullName() : "",
                department != null ? department.getDepartmentName() : "",
                department != null ? department.getDepartmentId() : null,
                schedule != null && schedule.getRoom() != null ? schedule.getRoom().getRoomName() : "",
                booking.getIsPriority(),
                booking.getStatus(),
                booking.getCheckedInAt()
        );
    }
}
