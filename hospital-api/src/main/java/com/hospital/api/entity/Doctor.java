package com.hospital.api.entity;

import com.hospital.api.common.BaseEntity;
import com.hospital.api.constant.Degree;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "doctors")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Doctor extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "doctor_id")
    private UUID doctorId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false, unique = true)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @Enumerated(EnumType.STRING)
    @Column(name = "degree", nullable = false, length = 30)
    private Degree degree;

    @Column(name = "biography", columnDefinition = "TEXT")
    private String biography;

    @Column(name = "consultation_fee", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal consultationFee = BigDecimal.valueOf(150000); // Giá khám gốc

    @Column(name = "rating_average")
    @Builder.Default
    private Double ratingAverage = 5.0;

    @Column(name = "doctor_license", length = 50)
    private String doctorLicense;

    @Column(name = "license_issued_date")
    private java.time.LocalDate licenseIssuedDate;

    @Column(name = "license_scope", length = 255)
    private String licenseScope;
}
