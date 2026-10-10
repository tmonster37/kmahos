package com.hospital.api.constant;

public enum BatchStatus {
    ACTIVE,         // Đang lưu hành bình thường
    NEAR_EXPIRY,    // Cận hạn dùng (cần ưu tiên xuất FEFO hoặc trả lại nhà SX)
    EXPIRED,        // Đã hết hạn (khóa không cho xuất)
    RECALLED        // Bị thu hồi theo công văn
}
