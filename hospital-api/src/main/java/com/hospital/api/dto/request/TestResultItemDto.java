package com.hospital.api.dto.request;

import com.hospital.api.constant.TestResultFlag;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public record TestResultItemDto(
        @NotBlank(message = "Mã chỉ số xét nghiệm không được để trống (VD: WBC, RBC, GLUCOSE)")
        String parameterCode,

        @NotBlank(message = "Tên chỉ số xét nghiệm không được để trống")
        String parameterName,

        BigDecimal valueNumeric,

        String valueText,

        String unit,

        String referenceRange,

        TestResultFlag flag,

        String notes
) {}
