package com.hospital.api.entity;

import com.hospital.api.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "push_devices", indexes = {
        @Index(name = "idx_push_devices_account_id", columnList = "account_id"),
        @Index(name = "idx_push_devices_install_id", columnList = "device_install_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PushDevice extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Column(name = "device_install_id", length = 100, nullable = false, unique = true)
    private String deviceInstallId;

    @Column(name = "device_token", nullable = false, columnDefinition = "TEXT")
    private String deviceToken;

    @Column(name = "platform", length = 20, nullable = false)
    private String platform;
}

