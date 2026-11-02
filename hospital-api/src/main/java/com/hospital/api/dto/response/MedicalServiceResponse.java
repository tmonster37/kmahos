package com.hospital.api.dto.response;

import com.hospital.api.entity.MedicalService;

import java.math.BigDecimal;

public record MedicalServiceResponse(
        Integer serviceId,
        String serviceName,
        String description,
        BigDecimal price,
        Integer departmentId,
        String departmentName,
        Boolean deleted
) {
    public MedicalServiceResponse(Integer serviceId, String serviceName, String description, BigDecimal price) {
        this(serviceId, serviceName, description, price, null, null, false);
    }

    public static MedicalServiceResponse fromEntity(MedicalService s) {
        if (s == null) return null;
        Integer deptId = s.getDepartment() != null ? s.getDepartment().getDepartmentId() : null;
        String deptName = s.getDepartment() != null ? s.getDepartment().getDepartmentName() : null;
        return new MedicalServiceResponse(
                s.getServiceId(),
                s.getServiceName(),
                s.getDescription(),
                s.getPrice(),
                deptId,
                deptName,
                s.isDeleted()
        );
    }
}
