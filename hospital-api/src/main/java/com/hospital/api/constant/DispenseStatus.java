package com.hospital.api.constant;

public enum DispenseStatus {
    PENDING,        // Đang chờ cấp phát thuốc
    PARTIALLY_DISPENSED, // Đã cấp phát một phần
    DISPENSED,      // Đã hoàn tất cấp phát theo FEFO
    CANCELLED       // Hủy cấp phát / Trả thuốc
}
