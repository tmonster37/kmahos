package com.hospital.api.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;

public record UpdateTestResultRequest(
        @NotBlank(message = "Kết luận xét nghiệm không được để trống")
        @JsonAlias({"resultSummary", "result"})
        String testResult,

        @JsonAlias({"fileUrl", "url"})
        String resultFileUrl
) {}

