package com.hospital.api.entity;

import com.hospital.api.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "time_slots", indexes = {
        @Index(name = "idx_timeslot_schedule", columnList = "doctor_schedule_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimeSlot extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "time_slot_id")
    private UUID timeSlotId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_schedule_id", nullable = false)
    private DoctorSchedule doctorSchedule;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "max_capacity", nullable = false)
    @Builder.Default
    private Integer maxCapacity = 5; // Tối đa 5 bệnh nhân / 30 phút

    @Column(name = "current_bookings", nullable = false)
    @Builder.Default
    private Integer currentBookings = 0; // Số người đã đặt thành công

    @Column(name = "holding_count", nullable = false)
    @Builder.Default
    private Integer holdingCount = 0; // Số người đang giữ chỗ tạm thời (Holding 10 phút)
}

