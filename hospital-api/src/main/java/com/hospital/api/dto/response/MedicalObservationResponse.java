package com.hospital.api.dto.response;

import com.hospital.api.constant.ConceptDataType;
import com.hospital.api.entity.MedicalObservation;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record MedicalObservationResponse(
        UUID obsId,
        String conceptCode,
        String conceptName,
        ConceptDataType dataType,
        String unit,
        BigDecimal valueNumeric,
        String valueText,
        Boolean valueBoolean,
        String interpretation,
        LocalDateTime recordedAt,
        String comments
) {
    public static MedicalObservationResponse fromEntity(MedicalObservation o) {
        return new MedicalObservationResponse(
                o.getObsId(),
                o.getConcept() != null ? o.getConcept().getConceptCode() : null,
                o.getConcept() != null ? o.getConcept().getName() : null,
                o.getConcept() != null ? o.getConcept().getDataType() : null,
                o.getConcept() != null ? o.getConcept().getUnit() : null,
                o.getValueNumeric(),
                o.getValueText(),
                o.getValueBoolean(),
                o.getInterpretation(),
                o.getRecordedAt(),
                o.getComments()
        );
    }
}
