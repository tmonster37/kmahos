package com.hospital.api.dto.response;

import com.hospital.api.entity.ChatMessage;

import java.time.Instant;
import java.util.UUID;

public record ChatMessageResponse(
        UUID messageId,
        UUID senderId,
        String senderName,
        String senderRole,
        String senderAvatar,
        UUID recipientId,
        String recipientName,
        String content,
        String messageType,
        String attachmentUrl,
        Boolean isRead,
        Instant createdAt
) {
    public static ChatMessageResponse fromEntity(ChatMessage m) {
        return new ChatMessageResponse(
                m.getMessageId(),
                m.getSender() != null ? m.getSender().getUserId() : null,
                m.getSender() != null ? m.getSender().getFullName() : "N/A",
                m.getSender() != null && m.getSender().getRole() != null ? m.getSender().getRole().name() : "",
                m.getSender() != null ? m.getSender().getAvatar() : null,
                m.getRecipient() != null ? m.getRecipient().getUserId() : null,
                m.getRecipient() != null ? m.getRecipient().getFullName() : "N/A",
                m.getContent(),
                m.getMessageType(),
                m.getAttachmentUrl(),
                m.getIsRead(),
                m.getCreatedAt()
        );
    }
}
