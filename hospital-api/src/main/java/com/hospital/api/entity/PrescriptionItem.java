package com.hospital.api.entity;

import com.hospital.api.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "prescription_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrescriptionItem extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "prescription_item_id")
    private UUID prescriptionItemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prescription_id", nullable = false)
    private Prescription prescription;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medicine_id", nullable = false)
    private Medicine medicine;

    @Column(name = "quantity", nullable = false)
    private Integer quantity; // Số lượng (ví dụ: 20 viên)

    @Column(name = "unit_price", precision = 12, scale = 2, nullable = false)
    private BigDecimal unitPrice;

    @Column(name = "total_price", precision = 12, scale = 2, nullable = false)
    private BigDecimal totalPrice;

    // Hướng dẫn uống thuốc: Sáng 1v, Trưa 0v, Chiều 1v, Tối 0v sau ăn
    @Column(name = "morning_amount")
    private Float morningAmount;

    @Column(name = "noon_amount")
    private Float noonAmount;

    @Column(name = "afternoon_amount")
    private Float afternoonAmount;

    @Column(name = "evening_amount")
    private Float eveningAmount;

    @Column(name = "dosage_instruction", columnDefinition = "TEXT")
    private String dosageInstruction;
}
