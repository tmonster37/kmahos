package com.hospital.api.constant;

public enum MedicalExamState {
    WAITING,        // Đang chờ tới lượt khám
    CALLING,        // Bác sĩ đang gọi vào buồng khám
    IN_PROGRESS,    // Đang khám lâm sàng tại bàn
    IN_TESTING,     // Đang đi làm các xét nghiệm cận lâm sàng
    DIAGNOSING,     // Đã có kết quả xét nghiệm, đang chẩn đoán & kê đơn
    SKIPPED,        // Bệnh nhân vắng mặt / Bỏ qua tạm thời
    DONE            // Đã hoàn thành buổi khám
}
