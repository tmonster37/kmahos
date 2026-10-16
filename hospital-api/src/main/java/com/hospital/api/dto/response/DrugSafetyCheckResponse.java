package com.hospital.api.dto.response;

import lombok.Builder;
import java.util.List;

@Builder
public record DrugSafetyCheckResponse(
        boolean safe,
        int criticalCount,
        int warningCount,
        List<DrugSafetyWarningDto> warnings,
        String summaryMessage
) {}
