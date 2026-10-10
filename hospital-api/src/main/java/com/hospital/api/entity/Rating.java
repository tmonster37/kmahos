package com.hospital.api.entity;

import com.hospital.api.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "ratings", indexes = {
        @Index(name = "idx_rating_doctor", columnList = "doctor_id"),
        @Index(name = "idx_rating_booking", columnList = "booking_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Rating extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "rating_id")
    private UUID ratingId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false, unique = true)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @Column(name = "stars", nullable = false)
    private Integer stars; // 1 đến 5 sao

    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;
}
