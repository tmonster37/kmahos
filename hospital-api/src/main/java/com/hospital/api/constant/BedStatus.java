package com.hospital.api.constant;

public enum BedStatus {
    AVAILABLE,    // Giường trống, sẵn sàng tiếp nhận bệnh nhân
    OCCUPIED,     // Đang có bệnh nhân nội trú nằm
    CLEANING,     // Đang vệ sinh / khử khuẩn buồng sau khi xuất viện
    MAINTENANCE   // Đang bảo trì / sửa chữa thiết bị y tế tại giường
}
