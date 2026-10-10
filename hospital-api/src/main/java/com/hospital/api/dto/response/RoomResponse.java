package com.hospital.api.dto.response;

import com.hospital.api.constant.RoomType;
import com.hospital.api.entity.Room;

public record RoomResponse(
        Integer roomId,
        String roomName,
        String description,
        RoomType roomType,
        Integer capacity,
        Integer departmentId,
        String departmentName,
        Boolean isActive
) {
    public static RoomResponse fromEntity(Room r) {
        return new RoomResponse(
                r.getRoomId(),
                r.getRoomName(),
                r.getDescription(),
                r.getRoomType(),
                r.getCapacity(),
                r.getDepartment() != null ? r.getDepartment().getDepartmentId() : null,
                r.getDepartment() != null ? r.getDepartment().getDepartmentName() : null,
                !r.isDeleted()
        );
    }
}

