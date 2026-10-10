package com.hospital.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.hospital.api.common.BaseEntity;
import com.hospital.api.constant.TestResultFlag;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "medical_test_result_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalTestResultItem extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "result_item_id")
    private UUID resultItemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medical_test_id", nullable = false)
    @JsonIgnore
    private MedicalTest medicalTest;

    @Column(name = "parameter_code", nullable = false, length = 50)
    private String parameterCode; // VD: WBC, RBC, HGB, GLUCOSE, ALT, AST

    @Column(name = "parameter_name", nullable = false, length = 150)
    private String parameterName; // VD: Bạch cầu, Đường huyết đói

    @Column(name = "value_numeric", precision = 12, scale = 4)
    private BigDecimal valueNumeric; // Kết quả dạng số nếu có

    @Column(name = "value_text", length = 255)
    private String valueText; // Kết quả dạng chữ (hoặc biểu diễn định tính "Âm tính", "Dương tính")

    @Column(name = "unit", length = 50)
    private String unit; // Đơn vị: mmol/L, g/dL, G/L, %

    @Column(name = "reference_range", length = 100)
    private String referenceRange; // Khoảng tham chiếu bình thường: "4.0 - 10.0"

    @Enumerated(EnumType.STRING)
    @Column(name = "flag", length = 20)
    @Builder.Default
    private TestResultFlag flag = TestResultFlag.NORMAL; // NORMAL, HIGH, LOW, CRITICAL, ABNORMAL

    @Column(name = "notes", length = 255)
    private String notes; // Ghi chú riêng cho chỉ số
}
