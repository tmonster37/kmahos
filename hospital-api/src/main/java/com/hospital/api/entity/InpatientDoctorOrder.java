package com.hospital.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hospital.api.common.BaseEntity;
import com.hospital.api.constant.CareLevel;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "inpatient_doctor_orders", indexes = {
        @Index(name = "idx_doc_order_admission", columnList = "admission_id"),
        @Index(name = "idx_doc_order_date", columnList = "order_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class InpatientDoctorOrder extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "order_id")
    private UUID orderId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admission_id", nullable = false)
    @JsonIgnoreProperties({"hospitalizationDetails", "discharge", "bedTransfers", "doctorOrders", "nursingCares", "hibernateLazyInitializer", "handler"})
    private HospitalAdmission hospitalAdmission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    @JsonIgnoreProperties({"account", "department", "hibernateLazyInitializer", "handler"})
    private Doctor doctor; // Bác sĩ ra y lệnh điều trị

    @Column(name = "order_date", nullable = false)
    private LocalDate orderDate;

    @Column(name = "disease_progression", columnDefinition = "TEXT", nullable = false)
    private String diseaseProgression; // Diễn biến bệnh lý (khám ngày, hội chứng, đáp ứng thuốc)

    @Column(name = "doctor_instruction", columnDefinition = "TEXT", nullable = false)
    private String doctorInstruction; // Y lệnh thuốc, dịch truyền, xét nghiệm bổ sung, thủ thuật

    @Column(name = "dietary_diet", length = 150)
    private String dietaryDiet; // Chế độ ăn: Cơm thường, cháo loãng, ăn qua sonde, kiêng muối

    @Enumerated(EnumType.STRING)
    @Column(name = "care_level", length = 30)
    @Builder.Default
    private CareLevel careLevel = CareLevel.CAP_2; // Chế độ chăm sóc
}
