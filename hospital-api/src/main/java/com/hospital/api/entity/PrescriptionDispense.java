package com.hospital.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hospital.api.common.BaseEntity;
import com.hospital.api.constant.DispenseStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "prescription_dispenses", uniqueConstraints = {
        @UniqueConstraint(name = "uk_dispense_prescription", columnNames = {"prescription_id"})
}, indexes = {
        @Index(name = "idx_dispense_code", columnList = "dispense_code", unique = true),
        @Index(name = "idx_dispense_presc", columnList = "prescription_id", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class PrescriptionDispense extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "dispense_id")
    private UUID dispenseId;

    @Column(name = "dispense_code", nullable = false, unique = true, length = 40)
    private String dispenseCode; // VD: DISP-20261009-001

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prescription_id", nullable = false)
    @JsonIgnoreProperties({"prescriptionItems", "hibernateLazyInitializer", "handler"})
    private Prescription prescription;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", nullable = false)
    @JsonIgnoreProperties({"department", "managerStaff", "hibernateLazyInitializer", "handler"})
    private PharmacyWarehouse warehouse; // Kho phát thuốc (Kho ngoại trú hoặc Kho nội trú)

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private DispenseStatus status = DispenseStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dispensed_by_staff_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Staff dispensedBy; // Dược sĩ cấp phát

    @Column(name = "dispensed_at")
    private LocalDateTime dispensedAt;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @OneToMany(mappedBy = "prescriptionDispense", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PrescriptionDispenseItem> items = new ArrayList<>();
}
