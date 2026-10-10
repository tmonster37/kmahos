package com.hospital.api.dto.response;

import com.hospital.api.entity.TimeSlot;

import java.time.LocalTime;
import java.util.UUID;

public record TimeSlotResponse(
        UUID timeSlotId,
        LocalTime startTime,
        LocalTime endTime,
        int maxCapacity,
        int currentBookings,
        boolean isFull
) {
    public static TimeSlotResponse fromEntity(TimeSlot ts) {
        return new TimeSlotResponse(
                ts.getTimeSlotId(),
                ts.getStartTime(),
                ts.getEndTime(),
                ts.getMaxCapacity(),
                ts.getCurrentBookings(),
                ts.getCurrentBookings() >= ts.getMaxCapacity()
        );
    }
}

