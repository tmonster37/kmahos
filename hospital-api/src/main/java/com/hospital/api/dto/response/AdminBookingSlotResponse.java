package com.hospital.api.dto.response;

import com.hospital.api.entity.TimeSlot;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record AdminBookingSlotResponse(
        UUID timeSlotId,
        LocalDate bookingDate,
        LocalTime startTime,
        LocalTime endTime,
        String doctorName,
        String roomName,
        Integer currentBookings,
        Integer maxCapacity
) {
    public static AdminBookingSlotResponse fromEntity(TimeSlot slot) {
        var schedule = slot.getDoctorSchedule();
        var doctor = schedule.getDoctor();
        return new AdminBookingSlotResponse(
                slot.getTimeSlotId(),
                schedule.getScheduleDate(),
                slot.getStartTime(),
                slot.getEndTime(),
                doctor != null && doctor.getAccount() != null ? doctor.getAccount().getFullName() : "",
                schedule.getRoom() != null ? schedule.getRoom().getRoomName() : "",
                slot.getCurrentBookings(),
                slot.getMaxCapacity()
        );
    }
}
