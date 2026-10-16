package com.hospital.api.constant;

public enum CheckInWindowStatus {
    OPEN,        // Khung giờ tiếp nhận hợp lệ
    TOO_EARLY,   // Quá sớm (trước giờ khám hơn 60 phút)
    TOO_LATE,    // Quá trễ (sau khi kết thúc khung giờ quá 15 phút)
    OTHER_DAY    // Khác ngày khám
}
