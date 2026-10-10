package com.hospital.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hospital.api.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "stock_transfer_items", indexes = {
        @Index(name = "idx_trf_item_transfer", columnList = "transfer_id"),
        @Index(name = "idx_trf_item_batch", columnList = "batch_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockTransferItem extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "item_id")
    private UUID itemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transfer_id", nullable = false)
    @JsonIgnore
    private StockTransfer stockTransfer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medicine_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Medicine medicine;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id", nullable = false)
    @JsonIgnoreProperties({"medicine", "hibernateLazyInitializer", "handler"})
    private MedicineBatch batch; // Điều chuyển chính xác theo Số lô và Hạn dùng

    @Column(name = "quantity", nullable = false)
    private Integer quantity; // Số lượng điều chuyển

    @Column(name = "notes")
    private String notes;
}
