package com.hospital.api.entity;

import com.hospital.api.common.BaseEntity;
import com.hospital.api.constant.ConditionType;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "medical_conditions", indexes = {
        @Index(name = "idx_condition_record", columnList = "record_id"),
        @Index(name = "idx_condition_icd10", columnList = "icd10_code")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalCondition extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "condition_id")
    private UUID conditionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "record_id", nullable = false)
    private MedicalExaminationRecord medicalRecord;

    @Column(name = "icd10_code", nullable = false, length = 30)
    private String icd10Code; // Mã ICD-10 (VD: O80, H52.1, K02, J06, I10)

    @Column(name = "disease_name", nullable = false)
    private String diseaseName; // Tên bệnh theo danh mục Bộ Y Tế / ICD-10

    @Enumerated(EnumType.STRING)
    @Column(name = "condition_type", nullable = false, length = 25)
    @Builder.Default
    private ConditionType conditionType = ConditionType.PRIMARY;

    @Column(name = "clinical_status", length = 30)
    @Builder.Default
    private String clinicalStatus = "ACTIVE"; // ACTIVE, RECURRENCE, RESOLVED

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}
