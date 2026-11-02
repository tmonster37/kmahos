package com.hospital.api.service;

import com.hospital.api.dto.request.ReserveSlotRequest;
import com.hospital.api.dto.response.ReserveSlotResponse;

import java.util.UUID;

public interface SlotReservationService {
    ReserveSlotResponse reserveSlot(ReserveSlotRequest request, UUID accountId);
    void releaseSlot(UUID reservationId);
    void confirmSlotReservation(UUID reservationId);
    void consumeReservation(UUID reservationId, UUID timeSlotId, UUID accountId, UUID patientProfileId);
    boolean isSlotAvailable(UUID timeSlotId);
}
