package com.hospital.api.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

/**
 * Bản tin tiếp nhận kết quả tự động từ máy xét nghiệm (HL7 v2 ORU hoặc LIS REST Webhook)
 */
public record LisAutomatedResultRequest(
        String specimenBarcode,     // Mã vạch dán trên ống nghiệm
        String testCode,            // Mã xét nghiệm (nếu máy gửi trực tiếp theo mã dịch vụ)
        String machineIdentifier,   // Định danh máy xét nghiệm (VD: Sysmex XN-1000, Cobas 6000)
        String technicianNotes,     // Ghi chú của kỹ thuật viên máy
        Boolean autoSyncToEhr,      // Tự động đồng bộ sang hồ sơ bệnh án EHR (mặc định true)

        @NotEmpty(message = "Danh sách kết quả chỉ số từ máy không được để trống")
        @Valid
        List<LisMachineResultItemDto> items
) {}
