package com.hospital.api.dto.response;

import com.hospital.api.entity.InpatientBedTransfer;

import java.time.Instant;
import java.util.UUID;

public record BedTransferResponse(
        UUID transferId,
        UUID admissionId,
        UUID fromBedId,
        String fromBedNumber,
        String fromRoomName,
        UUID toBedId,
        String toBedNumber,
        String toRoomName,
        String transferReason,
        String orderedByDoctorName,
        Instant transferredAt
) {
    public static BedTransferResponse fromEntity(InpatientBedTransfer t) {
        return new BedTransferResponse(
                t.getTransferId(),
                t.getHospitalAdmission() != null ? t.getHospitalAdmission().getAdmissionId() : null,
                t.getFromBed() != null ? t.getFromBed().getBedId() : null,
                t.getFromBed() != null ? t.getFromBed().getBedNumber() : "Chưa xếp giường",
                t.getFromRoom() != null ? t.getFromRoom().getRoomName() : "N/A",
                t.getToBed() != null ? t.getToBed().getBedId() : null,
                t.getToBed() != null ? t.getToBed().getBedNumber() : "N/A",
                t.getToRoom() != null ? t.getToRoom().getRoomName() : "N/A",
                t.getTransferReason(),
                t.getOrderedByDoctor() != null && t.getOrderedByDoctor().getAccount() != null ? t.getOrderedByDoctor().getAccount().getFullName() : "N/A",
                t.getTransferredAt()
        );
    }
}
