package com.hospital.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hospital.api.common.BaseEntity;
import com.hospital.api.constant.RoomType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "rooms", indexes = {
        @Index(name = "idx_room_department", columnList = "department_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Room extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "room_id")
    private Integer roomId;

    @Column(name = "room_name", nullable = false, length = 100)
    private String roomName;

    @Column(name = "description")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "room_type", nullable = false, length = 40)
    private RoomType roomType;

    @Column(name = "capacity")
    @Builder.Default
    private Integer capacity = 1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    @JsonIgnoreProperties({"rooms", "hibernateLazyInitializer", "handler"})
    private Department department;
}

