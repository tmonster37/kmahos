package com.hospital.api.entity;

import com.hospital.api.common.BaseEntity;
import com.hospital.api.constant.MedicineUnit;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "medicines")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Medicine extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "medicine_id")
    private Integer medicineId;

    @Column(name = "medicine_name", nullable = false, length = 150)
    private String medicineName; // Ví dụ: Paracetamol 500mg, Amoxicillin 500mg

    @Column(name = "active_ingredient", length = 150)
    private String activeIngredient; // Hoạt chất chính

    @Enumerated(EnumType.STRING)
    @Column(name = "unit", nullable = false, length = 20)
    private MedicineUnit unit;

    @Column(name = "price", precision = 12, scale = 2, nullable = false)
    private BigDecimal price; // Đơn giá / 1 đơn vị

    @Column(name = "stock_quantity", nullable = false)
    @Builder.Default
    private Integer stockQuantity = 0; // Số lượng tồn kho
}
