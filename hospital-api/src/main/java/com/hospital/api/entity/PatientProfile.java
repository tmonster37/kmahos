package com.hospital.api.entity;

import com.hospital.api.common.BaseEntity;
import com.hospital.api.constant.Gender;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "patient_profiles", indexes = {
        @Index(name = "idx_patient_account", columnList = "account_id"),
        @Index(name = "idx_patient_identity", columnList = "identity_number")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatientProfile extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "patient_profile_id", updatable = false, nullable = false)
    private UUID patientProfileId;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Column(name = "identity_number", length = 20) // CCCD / Mã định danh
    private String identityNumber;

    @Column(name = "health_insurance_number", length = 30) // Mã BHYT
    private String healthInsuranceNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", nullable = false, length = 10)
    private Gender gender;

    @Column(name = "date_of_birth", nullable = false)
    private LocalDate dateOfBirth;

    @Column(name = "street_address")
    private String streetAddress;

    @Column(name = "province", length = 100)
    private String province;

    @Column(name = "district", length = 100)
    private String district;

    @Column(name = "ward", length = 100)
    private String ward;

    @Column(name = "allergies", columnDefinition = "TEXT")
    private String allergies; // Tiền sử dị ứng thuốc, thức ăn...

    @Column(name = "medical_history", columnDefinition = "TEXT")
    private String medicalHistory; // Tiền sử bệnh bản thân / gia đình

    // Tài khoản người nhà/bệnh nhân quản lý hồ sơ này
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = true)
    private Account account;

    // Đánh dấu hồ sơ đã được liên kết chính thức vào tài khoản ứng dụng
    @Builder.Default
    @Column(name = "is_linked", nullable = false, columnDefinition = "boolean default false")
    private boolean isLinked = false;

    // Mối quan hệ với chủ tài khoản: SELF, SPOUSE, CHILD, PARENT, OTHER
    @Builder.Default
    @Column(name = "relationship", length = 50)
    private String relationship = "SELF";
}
