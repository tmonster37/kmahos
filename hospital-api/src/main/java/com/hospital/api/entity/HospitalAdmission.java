package com.hospital.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hospital.api.common.BaseEntity;
import com.hospital.api.constant.HospitalAdmissionState;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "hospital_admissions", indexes = {
        @Index(name = "idx_admission_patient", columnList = "patient_profile_id"),
        @Index(name = "idx_admission_room", columnList = "room_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class HospitalAdmission extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "admission_id")
    private UUID admissionId;

    @Column(name = "admission_code", unique = true, nullable = false, length = 30)
    private String admissionCode; // Ví dụ: HA-20260910-XXXX

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_profile_id", nullable = false)
    @JsonIgnoreProperties({"account", "medicalRecords", "hibernateLazyInitializer", "handler"})
    private PatientProfile patientProfile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    @JsonIgnoreProperties({"department", "hibernateLazyInitializer", "handler"})
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bed_id")
    @JsonIgnoreProperties({"room", "hibernateLazyInitializer", "handler"})
    private Bed bed; // Giường bệnh cụ thể đang nằm

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    @JsonIgnoreProperties({"account", "department", "schedules", "hibernateLazyInitializer", "handler"})
    private Doctor treatingDoctor; // Bác sĩ điều trị chính

    @Column(name = "admission_date", nullable = false)
    private Instant admissionDate;

    @Column(name = "discharge_date")
    private Instant dischargeDate;

    @Column(name = "initial_diagnosis", columnDefinition = "TEXT")
    private String initialDiagnosis;

    @Column(name = "daily_room_fee", precision = 12, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal dailyRoomFee = BigDecimal.valueOf(300000); // Giá tiền giường / ngày

    @Enumerated(EnumType.STRING)
    @Column(name = "state", nullable = false, length = 30)
    @Builder.Default
    private HospitalAdmissionState state = HospitalAdmissionState.ADMITTED;

    @OneToMany(mappedBy = "hospitalAdmission", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @JsonIgnoreProperties({"hospitalAdmission", "hibernateLazyInitializer", "handler"})
    private List<HospitalizationDetail> hospitalizationDetails = new ArrayList<>();

    @OneToMany(mappedBy = "hospitalAdmission", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @JsonIgnoreProperties({"hospitalAdmission", "hibernateLazyInitializer", "handler"})
    private List<InpatientBedTransfer> bedTransfers = new ArrayList<>();

    @OneToMany(mappedBy = "hospitalAdmission", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @JsonIgnoreProperties({"hospitalAdmission", "hibernateLazyInitializer", "handler"})
    private List<InpatientDoctorOrder> doctorOrders = new ArrayList<>();

    @OneToMany(mappedBy = "hospitalAdmission", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @JsonIgnoreProperties({"hospitalAdmission", "hibernateLazyInitializer", "handler"})
    private List<InpatientNursingCare> nursingCares = new ArrayList<>();

    @OneToOne(mappedBy = "hospitalAdmission", cascade = CascadeType.ALL)
    @JsonIgnoreProperties({"hospitalAdmission", "hibernateLazyInitializer", "handler"})
    private Discharge discharge;
}
