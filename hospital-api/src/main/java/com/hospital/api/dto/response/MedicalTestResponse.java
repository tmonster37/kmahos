package com.hospital.api.dto.response;

import com.hospital.api.constant.MedicalTestState;
import com.hospital.api.entity.MedicalTest;

import java.math.BigDecimal;
import java.util.UUID;

import java.util.Collections;
import java.util.List;

public record MedicalTestResponse(
        UUID testId,
        String testCode,
        String serviceName,
        BigDecimal price,
        String testResult,
        String resultFileUrl,
        MedicalTestState state,
        String specimenType,
        String specimenBarcode,
        List<TestResultItemResponse> resultItems,
        Boolean isPaid,
        String paymentStatus
) {
    public static MedicalTestResponse fromEntity(MedicalTest t) {
        return fromEntity(t, false);
    }

    public static MedicalTestResponse fromEntity(MedicalTest t, boolean isPaid) {
        List<TestResultItemResponse> items = t.getResultItems() != null
                ? t.getResultItems().stream().map(TestResultItemResponse::fromEntity).toList()
                : Collections.emptyList();

        return new MedicalTestResponse(
                t.getMedicalTestId(),
                t.getTestCode(),
                t.getMedicalService() != null ? t.getMedicalService().getServiceName() : "N/A",
                t.getPrice(),
                t.getTestResult(),
                t.getResultFileUrl(),
                t.getState(),
                t.getSpecimenType(),
                t.getSpecimenBarcode(),
                items,
                isPaid,
                isPaid ? "PAID" : "UNPAID"
        );
    }
}
