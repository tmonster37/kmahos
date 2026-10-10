package com.hospital.api.dto.response;

import com.hospital.api.entity.MedicalService;

import java.math.BigDecimal;

public record MedicalServiceResponse(
        Integer serviceId,
        String serviceName,
        String description,
        BigDecimal price
) {
    public static MedicalServiceResponse fromEntity(MedicalService s) {
        return new MedicalServiceResponse(
                s.getServiceId(),
                s.getServiceName(),
                s.getDescription(),
                s.getPrice()
        );
    }
}
