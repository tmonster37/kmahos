package com.hospital.api.constant;

public enum StockTransferStatus {
    DRAFT,              // Bản nháp đề xuất
    PENDING_APPROVAL,   // Chờ Dược sĩ trưởng duyệt
    APPROVED,           // Đã duyệt điều chuyển
    DISPATCHED,         // Đang vận chuyển
    COMPLETED,          // Đã nhập kho đích thành công
    REJECTED            // Bị từ chối
}
