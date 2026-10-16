package com.hospital.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hospital.api.common.BaseEntity;
import com.hospital.api.constant.CounterStatus;
import com.hospital.api.constant.CounterType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "counters", indexes = {
        @Index(name = "idx_counter_code", columnList = "counter_code"),
        @Index(name = "idx_counter_type", columnList = "counter_type"),
        @Index(name = "idx_counter_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Counter extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "counter_id")
    private Integer counterId;

    @Column(name = "counter_code", unique = true, nullable = false, length = 30)
    private String counterCode; // CTR-01, CTR-02, CTR-UT...

    @Column(name = "counter_name", nullable = false, length = 100)
    private String counterName; // Quầy 1 - Tiếp đón thường, Quầy 3 - Tiếp đón ưu tiên...

    @Enumerated(EnumType.STRING)
    @Column(name = "counter_type", nullable = false, length = 30)
    private CounterType counterType;

    @Column(name = "location", length = 100)
    @Builder.Default
    private String location = "Sảnh tiếp đón - Tầng 1";

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private CounterStatus status = CounterStatus.CLOSED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_staff_id")
    @JsonIgnoreProperties({"password", "hibernateLazyInitializer", "handler"})
    private Account currentStaff;

    @Column(name = "current_serving_number")
    private Integer currentServingNumber;

    @Column(name = "current_ticket_code", length = 30)
    private String currentTicketCode; // Ví dụ: UT-01, TH-12

    @Column(name = "max_capacity")
    @Builder.Default
    private Integer maxCapacity = 50;

    @Column(name = "display_order")
    @Builder.Default
    private Integer displayOrder = 1;
}
