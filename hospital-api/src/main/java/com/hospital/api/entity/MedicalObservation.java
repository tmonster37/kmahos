package com.hospital.api.entity;

import com.hospital.api.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "medical_observations", indexes = {
        @Index(name = "idx_obs_record", columnList = "record_id"),
        @Index(name = "idx_obs_concept", columnList = "concept_id"),
        @Index(name = "idx_obs_recorded_at", columnList = "recorded_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalObservation extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "obs_id")
    private UUID obsId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "record_id", nullable = false)
    private MedicalExaminationRecord medicalRecord;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "concept_id", nullable = false)
    private MedicalConcept concept;

    @Column(name = "value_numeric", precision = 12, scale = 2)
    private BigDecimal valueNumeric;

    @Column(name = "value_text", columnDefinition = "TEXT")
    private String valueText;

    @Column(name = "value_boolean")
    private Boolean valueBoolean;

    @Column(name = "interpretation", length = 30)
    private String interpretation; // NORMAL, HIGH, LOW, CRITICAL

    @Column(name = "recorded_at", nullable = false)
    @Builder.Default
    private LocalDateTime recordedAt = LocalDateTime.now();

    @Column(name = "comments", columnDefinition = "TEXT")
    private String comments;
}
