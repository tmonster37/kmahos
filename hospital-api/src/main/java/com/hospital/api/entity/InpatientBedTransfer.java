package com.hospital.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hospital.api.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "inpatient_bed_transfers", indexes = {
        @Index(name = "idx_transfer_admission", columnList = "admission_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class InpatientBedTransfer extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "transfer_id")
    private UUID transferId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admission_id", nullable = false)
    @JsonIgnoreProperties({"hospitalizationDetails", "discharge", "bedTransfers", "doctorOrders", "nursingCares", "hibernateLazyInitializer", "handler"})
    private HospitalAdmission hospitalAdmission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_bed_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Bed fromBed;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_bed_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Bed toBed;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_room_id")
    @JsonIgnoreProperties({"department", "hibernateLazyInitializer", "handler"})
    private Room fromRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_room_id", nullable = false)
    @JsonIgnoreProperties({"department", "hibernateLazyInitializer", "handler"})
    private Room toRoom;

    @Column(name = "transfer_reason", columnDefinition = "TEXT")
    private String transferReason; // VD: Chuyển ICU hồi sức tích cực, chuyển phòng cách ly, bệnh nhân yêu cầu đổi phòng

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ordered_by_doctor_id")
    @JsonIgnoreProperties({"account", "department", "hibernateLazyInitializer", "handler"})
    private Doctor orderedByDoctor; // Bác sĩ chỉ định điều chuyển

    @Column(name = "transferred_at", nullable = false)
    @Builder.Default
    private Instant transferredAt = Instant.now();
}
