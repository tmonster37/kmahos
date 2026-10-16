package com.hospital.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "audit_logs", indexes = {
        @Index(name = "idx_audit_action", columnList = "action"),
        @Index(name = "idx_audit_actor_id", columnList = "actor_id"),
        @Index(name = "idx_audit_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "log_id", updatable = false, nullable = false)
    private UUID logId;

    @Column(name = "actor_id", updatable = false)
    private UUID actorId;

    @Column(name = "actor_name", length = 100, updatable = false)
    private String actorName;

    @Column(name = "actor_role", length = 50, updatable = false)
    private String actorRole;

    @Column(name = "action", nullable = false, length = 50, updatable = false)
    private String action;

    @Column(name = "entity_type", length = 50, updatable = false)
    private String entityType;

    @Column(name = "entity_id", length = 100, updatable = false)
    private String entityId;

    @Column(name = "ip_address", length = 50, updatable = false)
    private String ipAddress;

    @Column(name = "details", columnDefinition = "TEXT", updatable = false)
    private String details;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
