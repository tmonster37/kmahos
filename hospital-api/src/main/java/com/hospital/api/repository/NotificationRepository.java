package com.hospital.api.repository;

import com.hospital.api.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findAllByAccount_UserIdAndDeletedFalseOrderByCreatedAtDesc(UUID accountId);
}
