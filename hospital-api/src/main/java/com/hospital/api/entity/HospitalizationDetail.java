package com.hospital.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hospital.api.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "hospitalization_details")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class HospitalizationDetail extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "detail_id")
    private UUID detailId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admission_id", nullable = false)
    @JsonIgnoreProperties({"hospitalizationDetails", "discharge", "hibernateLazyInitializer", "handler"})
    private HospitalAdmission hospitalAdmission;

    @Column(name = "log_date", nullable = false)
    private LocalDate logDate;

    // Dấu hiệu sinh tồn do Điều dưỡng đo
    @Column(name = "temperature", length = 20)      // Nhiệt độ: 37.2 °C
    private String temperature;

    @Column(name = "blood_pressure", length = 20)   // Huyết áp: 120/80 mmHg
    private String bloodPressure;

    @Column(name = "heart_rate", length = 20)       // Nhịp tim: 80 bpm
    private String heartRate;

    // Ghi chú diễn tiến bệnh của Bác sĩ
    @Column(name = "disease_progression", columnDefinition = "TEXT")
    private String diseaseProgression;

    @Column(name = "doctor_instruction", columnDefinition = "TEXT")
    private String doctorInstruction; // Y lệnh thuốc hoặc xét nghiệm bổ sung
}

