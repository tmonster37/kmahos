package com.hospital.api.service;

import com.hospital.api.dto.request.AiConsultationRequest;
import com.hospital.api.dto.response.AiConsultationResponse;

import java.util.List;

public interface AiTriageService {
    AiConsultationResponse consult(AiConsultationRequest request);
    List<String> getQuickPrompts();
}
