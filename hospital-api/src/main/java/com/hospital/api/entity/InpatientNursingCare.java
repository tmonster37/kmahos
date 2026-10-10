package com.hospital.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hospital.api.common.BaseEntity;
import com.hospital.api.constant.CareLevel;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "inpatient_nursing_cares", indexes = {
        @Index(name = "idx_nursing_care_admission", columnList = "admission_id"),
        @Index(name = "idx_nursing_care_time", columnList = "care_time")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class InpatientNursingCare extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "care_id")
    private UUID careId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admission_id", nullable = false)
    @JsonIgnoreProperties({"hospitalizationDetails", "discharge", "bedTransfers", "doctorOrders", "nursingCares", "hibernateLazyInitializer", "handler"})
    private HospitalAdmission hospitalAdmission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "nurse_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Staff nurse; // Điều dưỡng thực hiện chăm sóc

    @Column(name = "care_time", nullable = false)
    @Builder.Default
    private Instant careTime = Instant.now();

    // Dấu hiệu sinh tồn đo tại thời điểm chăm sóc
    @Column(name = "temperature", precision = 4, scale = 1)
    private BigDecimal temperature; // Thân nhiệt: 37.2 °C

    @Column(name = "blood_pressure", length = 30)
    private String bloodPressure; // Huyết áp: 120/80 mmHg

    @Column(name = "pulse")
    private Integer pulse; // Mạch: 82 bpm

    @Column(name = "respiratory_rate")
    private Integer respiratoryRate; // Nhịp thở: 18 lần/phút

    @Column(name = "spo2")
    private Integer spo2; // SpO2: 98%

    @Enumerated(EnumType.STRING)
    @Column(name = "care_level", length = 30)
    @Builder.Default
    private CareLevel careLevel = CareLevel.CAP_2;

    @Column(name = "nursing_note", columnDefinition = "TEXT")
    private String nursingNote; // Diễn biến & can thiệp điều dưỡng: da niêm mạc, dẫn lưu, vết mổ, dịch truyền

    @Column(name = "medication_administered", columnDefinition = "TEXT")
    private String medicationAdministered; // Thực hiện y lệnh: đã tiêm kháng sinh, cho uống thuốc hạ sốt
}
