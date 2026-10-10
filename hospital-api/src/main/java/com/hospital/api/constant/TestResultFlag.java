package com.hospital.api.constant;

public enum TestResultFlag {
    NORMAL,     // Bình thường trong khoảng tham chiếu
    HIGH,       // Cao hơn ngưỡng bình thường
    LOW,        // Thấp hơn ngưỡng bình thường
    CRITICAL,   // Ngưỡng báo động cấp cứu
    ABNORMAL    // Bất thường (dành cho xét nghiệm định tính / vi sinh)
}
