package com.hospital.api.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;

public record SaveDetailedTestResultRequest(
        String testResult,          // Kết luận chung của xét nghiệm
        String resultFileUrl,       // Link tài liệu / kết quả PDF / hình ảnh
        UUID performerStaffId,      // Kỹ thuật viên thực hiện xét nghiệm
        Boolean autoSyncToEhr,      // Tự động đồng bộ các chỉ số sang MedicalObservation của bệnh án điện tử (mặc định true)

        @NotEmpty(message = "Danh sách chi tiết các chỉ số xét nghiệm không được để trống")
        @Valid
        List<TestResultItemDto> items
) {}
