package com.hospital.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hospital.api.common.BaseEntity;
import com.hospital.api.constant.StockTransferStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "stock_transfers", indexes = {
        @Index(name = "idx_transfer_code", columnList = "transfer_code", unique = true),
        @Index(name = "idx_transfer_from_to", columnList = "from_warehouse_id, to_warehouse_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class StockTransfer extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "transfer_id")
    private UUID transferId;

    @Column(name = "transfer_code", nullable = false, unique = true, length = 40)
    private String transferCode; // VD: TRF-20261009-001

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_warehouse_id", nullable = false)
    @JsonIgnoreProperties({"department", "managerStaff", "hibernateLazyInitializer", "handler"})
    private PharmacyWarehouse fromWarehouse; // Kho xuất (VD: Kho chẵn Tổng)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_warehouse_id", nullable = false)
    @JsonIgnoreProperties({"department", "managerStaff", "hibernateLazyInitializer", "handler"})
    private PharmacyWarehouse toWarehouse; // Kho nhập (VD: Tủ trực Cấp cứu hoặc Kho lẻ Ngoại trú)

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private StockTransferStatus status = StockTransferStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by_staff_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Staff requestedBy; // Người lập phiếu đề xuất điều chuyển

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_staff_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Staff approvedBy; // Dược sĩ trưởng phê duyệt

    @Column(name = "transfer_date")
    private LocalDateTime transferDate; // Ngày thực hiện chuyển kho

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason; // Lý do xuất chuyển (VD: Bổ sung cơ số tủ trực cấp cứu, Cấp hàng định kỳ)

    @OneToMany(mappedBy = "stockTransfer", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<StockTransferItem> items = new ArrayList<>();
}
