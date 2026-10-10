package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.dto.request.AiConsultationRequest;
import com.hospital.api.dto.response.AiConsultationResponse;
import com.hospital.api.service.AiTriageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiChatController {

    private final AiTriageService aiTriageService;

    // 1. Bệnh nhân / Khách hỏi tư vấn triệu chứng AI 24/7 (Phân luồng & gợi ý đặt khám)
    @PostMapping("/consult")
    public ResponseEntity<ApiResponse<AiConsultationResponse>> consultAi(
            @Valid @RequestBody AiConsultationRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                aiTriageService.consult(request),
                "Phân tích triệu chứng & tư vấn y tế AI thành công"
        ));
    }

    // 2. Lấy danh sách câu hỏi mẫu gợi ý nhanh (Quick Prompts)
    @GetMapping("/prompts")
    public ResponseEntity<ApiResponse<List<String>>> getQuickPrompts() {
        return ResponseEntity.ok(ApiResponse.ok(
                aiTriageService.getQuickPrompts(),
                "Lấy danh sách câu hỏi gợi ý thành công"
        ));
    }
}
