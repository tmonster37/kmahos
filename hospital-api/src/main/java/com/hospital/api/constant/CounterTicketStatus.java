package com.hospital.api.constant;

public enum CounterTicketStatus {
    WAITING, // Đang chờ gọi
    CALLING, // Đang gọi vào quầy
    SERVED,  // Đã tiếp nhận xong thủ tục
    SKIPPED  // Vắng mặt / Bỏ qua
}
