package com.hospital.api.entity;

import com.hospital.api.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "medicine_reminders", indexes = {
        @Index(name = "idx_reminder_profile", columnList = "patient_profile_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicineReminder extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "reminder_id")
    private UUID reminderId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_profile_id", nullable = false)
    private PatientProfile patientProfile;

    @Column(name = "medicine_name", nullable = false, length = 150)
    private String medicineName; // Tên thuốc

    @Column(name = "dosage", nullable = false)
    private Float dosage; // Liều lượng (VD: 1.5 viên)

    @Column(name = "unit", nullable = false, length = 20)
    private String unit; // Viên / Gói / Thìa

    @Column(name = "reminder_time", nullable = false)
    private LocalTime reminderTime; // Giờ uống (VD: 07:00, 12:00, 18:00)

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "is_taken_today", nullable = false)
    @Builder.Default
    private boolean isTakenToday = false; // Đã uống hôm nay chưa

    @Column(name = "instruction")
    private String instruction; // Lời dặn: Uống sau khi ăn no
}

