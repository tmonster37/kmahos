package com.hospital.api.entity;

import com.hospital.api.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * Phụ lục Bệnh án điện tử (EMR Addendum) theo quy định tại Thông tư 46/2018/TT-BYT.
 * Được lập khi hồ sơ bệnh án đã khóa sau 24 giờ kể từ thời điểm kết thúc buổi khám.
 */
@Entity
@Table(name = "medical_record_addendums", indexes = {
        @Index(name = "idx_addendum_record", columnList = "record_id"),
        @Index(name = "idx_addendum_doctor", columnList = "doctor_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalRecordAddendum extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "addendum_id")
    private UUID addendumId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "record_id", nullable = false)
    private MedicalExaminationRecord medicalRecord;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @Column(name = "reason", columnDefinition = "TEXT", nullable = false)
    private String reason; // Lý do bổ sung/đính chính (Bắt buộc theo Thông tư 46/2018/TT-BYT)

    @Column(name = "previous_diagnosis", columnDefinition = "TEXT")
    private String previousDiagnosis; // Chẩn đoán trước khi lập phụ lục

    @Column(name = "updated_diagnosis", columnDefinition = "TEXT")
    private String updatedDiagnosis; // Chẩn đoán mới sau khi đính chính

    @Column(name = "previous_treatment_plan", columnDefinition = "TEXT")
    private String previousTreatmentPlan; // Kế hoạch điều trị cũ

    @Column(name = "updated_treatment_plan", columnDefinition = "TEXT")
    private String updatedTreatmentPlan; // Kế hoạch điều trị mới

    @Column(name = "clinical_notes", columnDefinition = "TEXT")
    private String clinicalNotes; // Ghi chú lâm sàng bổ sung của Bác sĩ
}
