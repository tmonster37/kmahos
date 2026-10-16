package com.hospital.api.dto.response;

import com.hospital.api.constant.CounterStatus;
import com.hospital.api.constant.CounterType;
import com.hospital.api.entity.Counter;

public record CounterResponse(
        Integer counterId,
        String counterCode,
        String counterName,
        CounterType counterType,
        String location,
        CounterStatus status,
        String staffName,
        Integer currentServingNumber,
        String currentTicketCode,
        int waitingCount,
        Integer displayOrder
) {
    public static CounterResponse fromEntity(Counter entity, int waitingCount) {
        String staffName = entity.getCurrentStaff() != null ? entity.getCurrentStaff().getFullName() : null;
        return new CounterResponse(
                entity.getCounterId(),
                entity.getCounterCode(),
                entity.getCounterName(),
                entity.getCounterType(),
                entity.getLocation(),
                entity.getStatus(),
                staffName,
                entity.getCurrentServingNumber(),
                entity.getCurrentTicketCode(),
                waitingCount,
                entity.getDisplayOrder()
        );
    }
}
