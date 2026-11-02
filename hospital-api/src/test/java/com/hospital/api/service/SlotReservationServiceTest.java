package com.hospital.api.service;

import com.hospital.api.dto.request.ReserveSlotRequest;
import com.hospital.api.entity.TimeSlot;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.TimeSlotRepository;
import com.hospital.api.service.impl.SlotReservationServiceImpl;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SlotReservationServiceTest {
    @Test void reserveAndReleaseLockSlotBeforeMutatingHolds() {
        TimeSlotRepository slots = mock(TimeSlotRepository.class);
        UUID id = UUID.randomUUID();
        TimeSlot slot = TimeSlot.builder().timeSlotId(id).currentBookings(1).holdingCount(0).maxCapacity(2).build();
        lenient().when(slots.findById(id)).thenReturn(Optional.of(slot));
        lenient().when(slots.findByIdWithLock(id)).thenReturn(Optional.of(slot));
        var service = new SlotReservationServiceImpl(slots);
        var reservation = service.reserveSlot(new ReserveSlotRequest(id, UUID.randomUUID()), UUID.randomUUID());
        assertEquals(1, slot.getHoldingCount());
        service.releaseSlot(reservation.reservationId());
        service.releaseSlot(reservation.reservationId());
        assertEquals(0, slot.getHoldingCount());
        verify(slots, times(2)).findByIdWithLock(id);
        verify(slots, never()).findById(id);
    }
    @Test void fullSlotDoesNotCreateOrIncrementAHold() {
        TimeSlotRepository slots = mock(TimeSlotRepository.class);
        UUID id = UUID.randomUUID();
        TimeSlot slot = TimeSlot.builder().timeSlotId(id).currentBookings(1).holdingCount(1).maxCapacity(2).build();
        lenient().when(slots.findById(id)).thenReturn(Optional.of(slot));
        lenient().when(slots.findByIdWithLock(id)).thenReturn(Optional.of(slot));
        var service = new SlotReservationServiceImpl(slots);
        assertThrows(AppException.class, () -> service.reserveSlot(new ReserveSlotRequest(id, null), UUID.randomUUID()));
        assertEquals(1, slot.getHoldingCount());
        verify(slots, never()).save(any());
    }

    @Test void reservationMustMatchSlotAccountAndProfileAndCannotBeConsumedTwice() {
        TimeSlotRepository slots = mock(TimeSlotRepository.class);
        UUID id = UUID.randomUUID(), account = UUID.randomUUID(), profile = UUID.randomUUID();
        TimeSlot slot = TimeSlot.builder().timeSlotId(id).currentBookings(0).holdingCount(0).maxCapacity(1).build();
        when(slots.findByIdWithLock(id)).thenReturn(Optional.of(slot));
        var service = new SlotReservationServiceImpl(slots);
        var reservation = service.reserveSlot(new ReserveSlotRequest(id, profile), account);
        assertThrows(AppException.class, () -> service.consumeReservation(reservation.reservationId(), id, UUID.randomUUID(), profile));
        assertThrows(AppException.class, () -> service.consumeReservation(reservation.reservationId(), UUID.randomUUID(), account, profile));
        assertThrows(AppException.class, () -> service.consumeReservation(reservation.reservationId(), id, account, UUID.randomUUID()));
        assertEquals(1, slot.getHoldingCount());
        service.consumeReservation(reservation.reservationId(), id, account, profile);
        assertEquals(0, slot.getHoldingCount());
        assertThrows(AppException.class, () -> service.consumeReservation(reservation.reservationId(), id, account, profile));
    }

    @Test void rollbackRestoresConsumedReservationForRetry() {
        TimeSlotRepository slots = mock(TimeSlotRepository.class);
        UUID id = UUID.randomUUID(), account = UUID.randomUUID(), profile = UUID.randomUUID();
        TimeSlot slot = TimeSlot.builder().timeSlotId(id).currentBookings(0).holdingCount(0).maxCapacity(1).build();
        when(slots.findByIdWithLock(id)).thenReturn(Optional.of(slot));
        var service = new SlotReservationServiceImpl(slots);
        var reservation = service.reserveSlot(new ReserveSlotRequest(id, profile), account);
        org.springframework.transaction.support.TransactionSynchronizationManager.initSynchronization();
        try {
            service.consumeReservation(reservation.reservationId(), id, account, profile);
            org.springframework.transaction.support.TransactionSynchronizationManager.getSynchronizations().forEach(
                    sync -> sync.afterCompletion(org.springframework.transaction.support.TransactionSynchronization.STATUS_ROLLED_BACK));
        } finally { org.springframework.transaction.support.TransactionSynchronizationManager.clearSynchronization(); }
        slot.setHoldingCount(1); // Simulate the database rollback; only the cache compensation is under unit test.
        service.consumeReservation(reservation.reservationId(), id, account, profile);
        assertEquals(0, slot.getHoldingCount());
    }
}
