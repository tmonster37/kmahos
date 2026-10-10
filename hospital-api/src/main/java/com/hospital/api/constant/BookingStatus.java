package com.hospital.api.constant;

public enum BookingStatus {
    PENDING_PAYMENT,    // Chờ thanh toán viện phí
    CONFIRMED,          // Đã xác nhận & có số thứ tự
    IN_PROGRESS,        // Đang khám
    COMPLETED,          // Đã hoàn thành khám
    CANCELLED           // Đã hủy lịch
}

