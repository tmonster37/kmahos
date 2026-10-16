package com.hospital.api.constant;

public enum CounterType {
    GENERAL,       // Quầy khám thường
    INSURANCE,     // Quầy tiếp nhận BHYT
    PRIORITY,      // Quầy tiếp đón ưu tiên (Người già >= 65, trẻ em < 6, phụ nữ mang thai, khuyết tật)
    APPOINTMENT    // Quầy tiếp nhận đặt hẹn trước (Fast-track)
}
