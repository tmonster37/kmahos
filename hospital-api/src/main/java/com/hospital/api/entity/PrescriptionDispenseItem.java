package com.hospital.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hospital.api.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "prescription_dispense_items", indexes = {
        @Index(name = "idx_disp_item_dispense", columnList = "dispense_id"),
        @Index(name = "idx_disp_item_batch", columnList = "batch_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrescriptionDispenseItem extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "dispense_item_id")
    private UUID dispenseItemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dispense_id", nullable = false)
    @JsonIgnore
    private PrescriptionDispense prescriptionDispense;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medicine_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Medicine medicine;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id", nullable = false)
    @JsonIgnoreProperties({"medicine", "hibernateLazyInitializer", "handler"})
    private MedicineBatch batch; // Lô thuốc được xuất theo thuật toán FEFO

    @Column(name = "batch_number", length = 60)
    private String batchNumber; // Snapshot số lô tại thời điểm cấp phát

    @Column(name = "expiry_date")
    private LocalDate expiryDate; // Snapshot hạn dùng tại thời điểm cấp phát

    @Column(name = "quantity_dispensed", nullable = false)
    private Integer quantityDispensed; // Số lượng viên/gói cấp phát từ lô này

    @Column(name = "unit_price", precision = 12, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "total_price", precision = 12, scale = 2)
    private BigDecimal totalPrice;
}
