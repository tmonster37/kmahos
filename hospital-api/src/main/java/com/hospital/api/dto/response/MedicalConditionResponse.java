package com.hospital.api.dto.response;

import com.hospital.api.constant.ConditionType;
import com.hospital.api.entity.MedicalCondition;

import java.util.UUID;

public record MedicalConditionResponse(
        UUID conditionId,
        String icd10Code,
        String diseaseName,
        ConditionType conditionType,
        String clinicalStatus,
        String notes
) {
    public static MedicalConditionResponse fromEntity(MedicalCondition c) {
        return new MedicalConditionResponse(
                c.getConditionId(),
                c.getIcd10Code(),
                c.getDiseaseName(),
                c.getConditionType(),
                c.getClinicalStatus(),
                c.getNotes()
        );
    }
}
