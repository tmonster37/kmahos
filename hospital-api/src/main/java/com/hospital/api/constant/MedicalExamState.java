package com.hospital.api.constant;
public enum MedicalExamState {
    WAITING,        // Đang chờ tới lượt khám
    IN_TESTING,     // Đang đi làm các xét nghiệm cận lâm sàng
    DIAGNOSING,     // Đã có kết quả xét nghiệm, đang chẩn đoán & kê đơn
    DONE            // Đã hoàn thành buổi khám
}
