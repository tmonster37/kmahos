package com.hospital.api.dto.response;

import com.hospital.api.constant.BedStatus;
import com.hospital.api.entity.Bed;

import java.util.UUID;

public record BedResponse(
        UUID bedId,
        Integer roomId,
        String roomName,
        Integer departmentId,
        String departmentName,
        String bedNumber,
        BedStatus status,
        String notes
) {
    public static BedResponse fromEntity(Bed b) {
        return new BedResponse(
                b.getBedId(),
                b.getRoom() != null ? b.getRoom().getRoomId() : null,
                b.getRoom() != null ? b.getRoom().getRoomName() : null,
                b.getRoom() != null && b.getRoom().getDepartment() != null ? b.getRoom().getDepartment().getDepartmentId() : null,
                b.getRoom() != null && b.getRoom().getDepartment() != null ? b.getRoom().getDepartment().getDepartmentName() : null,
                b.getBedNumber(),
                b.getStatus(),
                b.getNotes()
        );
    }
}
