package com.hospital.api.service;

import com.hospital.api.dto.request.ChatMessageRequest;
import com.hospital.api.dto.response.ChatMessageResponse;
import com.hospital.api.dto.response.ConversationSummaryResponse;

import java.util.List;
import java.util.UUID;

public interface ChatService {
    ChatMessageResponse sendMessage(UUID senderId, ChatMessageRequest request);
    List<ChatMessageResponse> getMessages(UUID currentUserId, UUID partnerId);
    List<ConversationSummaryResponse> getConversations(UUID currentUserId);
    void markAsRead(UUID currentUserId, UUID partnerId);
    List<ConversationSummaryResponse> getAvailableConsultants(UUID currentUserId);
}
