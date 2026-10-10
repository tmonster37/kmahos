package com.hospital.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hospital.api.common.BaseEntity;
import com.hospital.api.constant.BedStatus;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "beds", indexes = {
        @Index(name = "idx_bed_room", columnList = "room_id"),
        @Index(name = "idx_bed_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Bed extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "bed_id")
    private UUID bedId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    @JsonIgnoreProperties({"department", "hibernateLazyInitializer", "handler"})
    private Room room;

    @Column(name = "bed_number", nullable = false, length = 50)
    private String bedNumber; // VD: Giường 01, G-102-A, ICU-03

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private BedStatus status = BedStatus.AVAILABLE;

    @Column(name = "notes")
    private String notes; // VD: Giường điện tử đa năng, có monitor theo dõi
}
