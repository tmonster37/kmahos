package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record AiConsultationRequest(
        @NotBlank(message = "Nội dung câu hỏi/triệu chứng không được để trống")
        String message,
        List<String> conversationHistory,
        Integer age,
        String gender
) {
}
