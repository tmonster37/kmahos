package com.hospital.api.constant;

public enum MedicalTestState {
    WAITING,            // Đang chờ xét nghiệm
    SAMPLE_COLLECTED,   // Đã tiếp nhận & lấy mẫu bệnh phẩm (có barcode)
    PROCESSING,         // Đang thực hiện phân tích
    COMPLETED,          // Đã có kết quả chi tiết & ký duyệt
    CANCELLED           // Đã hủy chỉ định
}

