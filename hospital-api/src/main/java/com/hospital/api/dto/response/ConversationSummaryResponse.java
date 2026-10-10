package com.hospital.api.dto.response;

import java.time.Instant;
import java.util.UUID;

public record ConversationSummaryResponse(
        UUID partnerId,
        String partnerName,
        String partnerRole,
        String partnerPhone,
        String partnerAvatar,
        String lastMessage,
        Instant lastMessageTime,
        Long unreadCount
) {}
