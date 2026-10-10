package com.hospital.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hospital.api.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "discharges")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Discharge extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "discharge_id")
    private UUID dischargeId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admission_id", nullable = false, unique = true)
    @JsonIgnoreProperties({"discharge", "hospitalizationDetails", "hibernateLazyInitializer", "handler"})
    private HospitalAdmission hospitalAdmission;

    @Column(name = "discharge_date", nullable = false)
    private Instant dischargeDate;

    @Column(name = "discharge_summary", columnDefinition = "TEXT")
    private String dischargeSummary; // Tóm tắt quá trình điều trị

    @Column(name = "doctor_recommendation", columnDefinition = "TEXT")
    private String doctorRecommendation; // Lời dặn xuất viện

    @Column(name = "re_examination_date")
    private LocalDate reExaminationDate;

    @Column(name = "total_days", nullable = false)
    private Integer totalDays; // Số ngày nằm viện thực tế

    @Column(name = "total_inpatient_cost", precision = 12, scale = 2, nullable = false)
    private BigDecimal totalInpatientCost; // Tổng viện phí tiền giường
}

