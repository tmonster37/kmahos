package com.hospital.api.service;

import com.hospital.api.dto.request.ReserveSlotRequest;
import com.hospital.api.dto.response.ReserveSlotResponse;

import java.util.UUID;

public interface SlotReservationService {
    ReserveSlotResponse reserveSlot(ReserveSlotRequest request, UUID accountId);
    void releaseSlot(UUID reservationId);
    void confirmSlotReservation(UUID reservationId);
    boolean isSlotAvailable(UUID timeSlotId);
}
