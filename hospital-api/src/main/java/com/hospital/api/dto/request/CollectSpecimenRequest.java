package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record CollectSpecimenRequest(
        @NotBlank(message = "Loại mẫu bệnh phẩm không được để trống (VD: Máu toàn phần, Huyết thanh, Nước tiểu)")
        String specimenType,

        String specimenBarcode, // Có thể để trống để hệ thống tự sinh mã barcode

        UUID collectorStaffId   // ID nhân viên lấy mẫu (tùy chọn)
) {}
