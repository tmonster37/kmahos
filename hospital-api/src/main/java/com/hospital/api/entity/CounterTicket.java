package com.hospital.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hospital.api.common.BaseEntity;
import com.hospital.api.constant.CounterTicketStatus;
import com.hospital.api.constant.CounterType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "counter_tickets", indexes = {
        @Index(name = "idx_ticket_date_counter", columnList = "ticket_date, counter_id"),
        @Index(name = "idx_ticket_status", columnList = "status"),
        @Index(name = "idx_ticket_code", columnList = "ticket_code")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class CounterTicket extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ticket_id")
    private Long ticketId;

    @Column(name = "ticket_code", nullable = false, length = 30)
    private String ticketCode; // Ví dụ: UT-01, BH-03, TH-15, AP-02

    @Column(name = "queue_number", nullable = false)
    private Integer queueNumber; // 1, 2, 3...

    @Column(name = "ticket_date", nullable = false)
    private LocalDate ticketDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "counter_type", nullable = false, length = 30)
    private CounterType counterType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "counter_id")
    private Counter counter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @Column(name = "patient_name", nullable = false, length = 100)
    private String patientName;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Column(name = "is_priority")
    @Builder.Default
    private Boolean isPriority = false;

    @Column(name = "priority_reason")
    private String priorityReason;

    @Column(name = "has_insurance")
    @Builder.Default
    private Boolean hasInsurance = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private CounterTicketStatus status = CounterTicketStatus.WAITING;

    @Column(name = "called_at")
    private LocalDateTime calledAt;

    @Column(name = "served_at")
    private LocalDateTime servedAt;

    @Column(name = "dispatched_room_id")
    private Integer dispatchedRoomId; // Phòng khám bác sĩ sau khi tiếp nhận xong
}
