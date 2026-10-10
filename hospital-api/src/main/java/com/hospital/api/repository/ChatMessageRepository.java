package com.hospital.api.repository;

import com.hospital.api.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    @Query("SELECT m FROM ChatMessage m WHERE (m.sender.userId = :userA AND m.recipient.userId = :userB) OR (m.sender.userId = :userB AND m.recipient.userId = :userA) ORDER BY m.createdAt ASC")
    List<ChatMessage> findConversationMessages(@Param("userA") UUID userA, @Param("userB") UUID userB);

    @Query("SELECT DISTINCT CASE WHEN m.sender.userId = :userId THEN m.recipient.userId ELSE m.sender.userId END FROM ChatMessage m WHERE m.sender.userId = :userId OR m.recipient.userId = :userId")
    List<UUID> findConversationPartnerIds(@Param("userId") UUID userId);

    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.sender.userId = :partnerId AND m.recipient.userId = :userId AND m.isRead = false")
    long countUnreadMessages(@Param("userId") UUID userId, @Param("partnerId") UUID partnerId);

    @Query("SELECT m FROM ChatMessage m WHERE (m.sender.userId = :userA AND m.recipient.userId = :userB) OR (m.sender.userId = :userB AND m.recipient.userId = :userA) ORDER BY m.createdAt DESC")
    List<ChatMessage> findLatestMessages(@Param("userA") UUID userA, @Param("userB") UUID userB);

    @Modifying
    @Query("UPDATE ChatMessage m SET m.isRead = true WHERE m.sender.userId = :partnerId AND m.recipient.userId = :userId AND m.isRead = false")
    void markMessagesAsRead(@Param("userId") UUID userId, @Param("partnerId") UUID partnerId);
}
