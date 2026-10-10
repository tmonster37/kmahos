package com.hospital.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hospital.api.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "warehouse_stocks", indexes = {
        @Index(name = "idx_stock_wh_med", columnList = "warehouse_id, medicine_id"),
        @Index(name = "idx_stock_wh_batch", columnList = "warehouse_id, batch_id", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class WarehouseStock extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "stock_id")
    private UUID stockId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", nullable = false)
    @JsonIgnoreProperties({"department", "managerStaff", "hibernateLazyInitializer", "handler"})
    private PharmacyWarehouse warehouse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medicine_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Medicine medicine;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id", nullable = false)
    @JsonIgnoreProperties({"medicine", "hibernateLazyInitializer", "handler"})
    private MedicineBatch batch;

    @Column(name = "quantity_on_hand", nullable = false)
    @Builder.Default
    private Integer quantityOnHand = 0; // Số lượng tồn thực tế trên kệ

    @Column(name = "quantity_reserved", nullable = false)
    @Builder.Default
    private Integer quantityReserved = 0; // Số lượng đã giữ chỗ chờ phát

    @Column(name = "minimum_threshold", nullable = false)
    @Builder.Default
    private Integer minimumThreshold = 10; // Ngưỡng tồn an toàn tối thiểu

    @Transient
    public Integer getAvailableQuantity() {
        return Math.max(0, (quantityOnHand != null ? quantityOnHand : 0) - (quantityReserved != null ? quantityReserved : 0));
    }
}
