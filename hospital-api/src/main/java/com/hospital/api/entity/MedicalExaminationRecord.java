package com.hospital.api.entity;

import com.hospital.api.common.BaseEntity;
import com.hospital.api.constant.MedicalExamState;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "medical_examination_records", indexes = {
        @Index(name = "idx_record_booking", columnList = "booking_id"),
        @Index(name = "idx_record_patient", columnList = "patient_profile_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalExaminationRecord extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "record_id")
    private UUID recordId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false, unique = true)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_profile_id", nullable = false)
    private PatientProfile patientProfile;

    @Column(name = "symptoms", columnDefinition = "TEXT")
    private String symptoms;

    @Column(name = "initial_diagnosis", columnDefinition = "TEXT")
    private String initialDiagnosis; // Chẩn đoán sơ bộ

    @Column(name = "final_diagnosis", columnDefinition = "TEXT")
    private String finalDiagnosis; // Chẩn đoán xác định sau khi có KQ xét nghiệm

    @Column(name = "treatment_plan", columnDefinition = "TEXT")
    private String treatmentPlan; // Lời dặn / Hướng điều trị

    @Column(name = "re_examination_date")
    private LocalDate reExaminationDate; // Ngày hẹn tái khám

    @Enumerated(EnumType.STRING)
    @Column(name = "state", nullable = false, length = 30)
    @Builder.Default
    private MedicalExamState state = MedicalExamState.WAITING;

    @OneToMany(mappedBy = "medicalRecord", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<MedicalTest> medicalTests = new ArrayList<>();

    @OneToMany(mappedBy = "medicalRecord", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<MedicalObservation> medicalObservations = new ArrayList<>();

    @OneToMany(mappedBy = "medicalRecord", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<MedicalCondition> medicalConditions = new ArrayList<>();

    @OneToOne(mappedBy = "medicalRecord", cascade = CascadeType.ALL, orphanRemoval = true)
    private Prescription prescription;
}

