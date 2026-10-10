package com.hospital.api.dto.response;

import com.hospital.api.entity.Department;

public record DepartmentResponse(
        Integer departmentId,
        String departmentName,
        String description,
        String thumbnailUrl,
        int totalRooms,
        Boolean isActive
) {
    public static DepartmentResponse fromEntity(Department d) {
        return new DepartmentResponse(
                d.getDepartmentId(),
                d.getDepartmentName(),
                d.getDescription(),
                d.getThumbnailUrl(),
                d.getRooms() != null ? d.getRooms().size() : 0,
                !d.isDeleted()
        );
    }
}

