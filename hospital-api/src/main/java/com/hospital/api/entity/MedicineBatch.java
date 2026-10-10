package com.hospital.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hospital.api.common.BaseEntity;
import com.hospital.api.constant.BatchStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "medicine_batches", indexes = {
        @Index(name = "idx_batch_medicine", columnList = "medicine_id"),
        @Index(name = "idx_batch_expiry", columnList = "expiry_date"),
        @Index(name = "idx_batch_number", columnList = "batch_number")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class MedicineBatch extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "batch_id")
    private UUID batchId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medicine_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Medicine medicine;

    @Column(name = "batch_number", nullable = false, length = 60)
    private String batchNumber; // Số lô sản xuất (VD: LOT-2026-0881)

    @Column(name = "manufacturing_date")
    private LocalDate manufacturingDate; // Ngày sản xuất

    @Column(name = "expiry_date", nullable = false)
    private LocalDate expiryDate; // Hạn dùng (mốc quan trọng nhất để xếp thứ tự FEFO)

    @Column(name = "purchase_price", precision = 12, scale = 2)
    private BigDecimal purchasePrice; // Giá nhập kho

    @Column(name = "unit_price", precision = 12, scale = 2)
    private BigDecimal unitPrice; // Đơn giá bán/xuất viện

    @Column(name = "manufacturer", length = 150)
    private String manufacturer; // Công ty sản xuất / Xuất xứ

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private BatchStatus status = BatchStatus.ACTIVE;
}
