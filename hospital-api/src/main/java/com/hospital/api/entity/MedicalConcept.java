package com.hospital.api.entity;

import com.hospital.api.common.BaseEntity;
import com.hospital.api.constant.ConceptDataType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "medical_concepts", indexes = {
        @Index(name = "idx_concept_code", columnList = "concept_code", unique = true),
        @Index(name = "idx_concept_dept", columnList = "department_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalConcept extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "concept_id")
    private UUID conceptId;

    @Column(name = "concept_code", nullable = false, length = 60, unique = true)
    private String conceptCode; // VD: VITAL_BP_SYS, OB_GEST_AGE, EYE_VA_OD, DENT_CARIES_LOC, PED_WEIGHT

    @Column(name = "name", nullable = false)
    private String name; // Tên hiển thị (VD: Huyết áp tâm thu, Tuần thai, Thị lực mắt phải)

    @Enumerated(EnumType.STRING)
    @Column(name = "data_type", nullable = false, length = 20)
    private ConceptDataType dataType;

    @Column(name = "unit", length = 30)
    private String unit; // mmHg, bpm, cm, kg, độ, tuần

    @Column(name = "min_normal", precision = 10, scale = 2)
    private BigDecimal minNormal; // Ngưỡng tham chiếu tối thiểu

    @Column(name = "max_normal", precision = 10, scale = 2)
    private BigDecimal maxNormal; // Ngưỡng tham chiếu tối đa

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department; // null nếu là chỉ số sinh hiệu chung, hoặc chuyên khoa cụ thể

    @Column(name = "loinc_code", length = 40)
    private String loincCode; // Mã quốc tế LOINC để map HL7 FHIR

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
