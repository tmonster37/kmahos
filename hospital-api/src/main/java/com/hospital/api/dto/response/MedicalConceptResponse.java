package com.hospital.api.dto.response;

import com.hospital.api.constant.ConceptDataType;
import com.hospital.api.entity.MedicalConcept;

import java.math.BigDecimal;
import java.util.UUID;

public record MedicalConceptResponse(
        UUID conceptId,
        String conceptCode,
        String name,
        ConceptDataType dataType,
        String unit,
        BigDecimal minNormal,
        BigDecimal maxNormal,
        Integer departmentId,
        String departmentName,
        String loincCode,
        String description
) {
    public static MedicalConceptResponse fromEntity(MedicalConcept c) {
        return new MedicalConceptResponse(
                c.getConceptId(),
                c.getConceptCode(),
                c.getName(),
                c.getDataType(),
                c.getUnit(),
                c.getMinNormal(),
                c.getMaxNormal(),
                c.getDepartment() != null ? c.getDepartment().getDepartmentId() : null,
                c.getDepartment() != null ? c.getDepartment().getDepartmentName() : "Dùng chung (Sinh hiệu)",
                c.getLoincCode(),
                c.getDescription()
        );
    }
}
