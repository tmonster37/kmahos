package com.hospital.api.entity;

import com.hospital.api.common.BaseEntity;
import com.hospital.api.constant.BookingStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "bookings", indexes = {
        @Index(name = "idx_booking_code", columnList = "booking_code"),
        @Index(name = "idx_booking_patient", columnList = "patient_profile_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "booking_id")
    private UUID bookingId;

    @Column(name = "booking_code", unique = true, nullable = false, length = 20)
    private String bookingCode; // Ví dụ: BK202609080001

    @Column(name = "queue_number", nullable = false)
    private Integer queueNumber; // Số thứ tự khám trong ngày (1, 2, 3...)

    @Column(name = "booking_date", nullable = false)
    private LocalDate bookingDate;

    @Column(name = "symptoms", columnDefinition = "TEXT")
    private String symptoms; // Triệu chứng ban đầu

    @Column(name = "price", precision = 12, scale = 2, nullable = false)
    private BigDecimal price;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private BookingStatus status = BookingStatus.CONFIRMED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_profile_id", nullable = false)
    private PatientProfile patientProfile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "time_slot_id", nullable = false)
    private TimeSlot timeSlot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @Column(name = "is_priority", nullable = false)
    @Builder.Default
    private Boolean isPriority = false; // Luồng ưu tiên (Người già từ 65 tuổi, Phụ nữ mang thai, Trẻ em...)

    @Column(name = "priority_reason", length = 150)
    private String priorityReason;

    @Column(name = "checked_in_at")
    private LocalDateTime checkedInAt;
}


