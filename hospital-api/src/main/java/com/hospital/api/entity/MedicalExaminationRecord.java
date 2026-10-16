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

    @Column(name = "completed_at")
    private java.time.LocalDateTime completedAt; // Thời điểm hoàn thành khám

    @Column(name = "is_locked")
    @Builder.Default
    private Boolean isLocked = false; // Khóa sau 24h theo Thông tư 46/2018/TT-BYT

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

    @OneToMany(mappedBy = "medicalRecord", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<MedicalRecordAddendum> addendums = new ArrayList<>();

    /**
     * Lazy lock evaluation: Kiểm tra và đánh dấu khóa tự động nếu đã qua 24 giờ kể từ lúc hoàn tất khám.
     * @return true nếu hồ sơ đã khóa bất biến.
     */
    public boolean isLockedRecord() {
        if (Boolean.TRUE.equals(this.isLocked)) {
            return true;
        }
        if (this.completedAt != null && this.completedAt.plusHours(24).isBefore(java.time.LocalDateTime.now())) {
            this.isLocked = true;
            return true;
        }
        return false;
    }
}

