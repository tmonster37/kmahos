package com.hospital.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hospital.api.common.BaseEntity;
import com.hospital.api.constant.WarehouseType;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "pharmacy_warehouses", indexes = {
        @Index(name = "idx_warehouse_code", columnList = "warehouse_code", unique = true),
        @Index(name = "idx_warehouse_type", columnList = "warehouse_type")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class PharmacyWarehouse extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "warehouse_id")
    private UUID warehouseId;

    @Column(name = "warehouse_code", nullable = false, unique = true, length = 40)
    private String warehouseCode; // VD: WH_CENTRAL, WH_OUTPATIENT, WH_INPATIENT, WH_ER_CABINET

    @Column(name = "warehouse_name", nullable = false, length = 150)
    private String warehouseName; // Kho chẵn Tổng, Nhà thuốc Bệnh viện, Kho Dược nội trú, Tủ trực Cấp cứu A1

    @Enumerated(EnumType.STRING)
    @Column(name = "warehouse_type", nullable = false, length = 30)
    private WarehouseType warehouseType;

    @Column(name = "location", length = 200)
    private String location; // Vị trí tòa nhà, tầng, phòng

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    @JsonIgnoreProperties({"rooms", "hibernateLazyInitializer", "handler"})
    private Department department; // Khoa lâm sàng nếu là Tủ trực khoa

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_staff_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Staff managerStaff; // Dược sĩ phụ trách kho / Điều dưỡng trưởng tủ trực

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
