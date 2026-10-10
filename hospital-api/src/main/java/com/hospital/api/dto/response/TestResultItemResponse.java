package com.hospital.api.dto.response;

import com.hospital.api.constant.TestResultFlag;
import com.hospital.api.entity.MedicalTestResultItem;

import java.math.BigDecimal;
import java.util.UUID;

public record TestResultItemResponse(
        UUID resultItemId,
        String parameterCode,
        String parameterName,
        BigDecimal valueNumeric,
        String valueText,
        String unit,
        String referenceRange,
        TestResultFlag flag,
        String notes
) {
    public static TestResultItemResponse fromEntity(MedicalTestResultItem item) {
        return new TestResultItemResponse(
                item.getResultItemId(),
                item.getParameterCode(),
                item.getParameterName(),
                item.getValueNumeric(),
                item.getValueText(),
                item.getUnit(),
                item.getReferenceRange(),
                item.getFlag(),
                item.getNotes()
        );
    }
}
