package com.hospital.api.service.impl;

import com.hospital.api.constant.Role;
import com.hospital.api.dto.request.ChatMessageRequest;
import com.hospital.api.dto.response.ChatMessageResponse;
import com.hospital.api.dto.response.ConversationSummaryResponse;
import com.hospital.api.entity.Account;
import com.hospital.api.entity.ChatMessage;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.AccountRepository;
import com.hospital.api.repository.ChatMessageRepository;
import com.hospital.api.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final ChatMessageRepository chatRepository;
    private final AccountRepository accountRepository;

    @Override
    @Transactional
    public ChatMessageResponse sendMessage(UUID senderId, ChatMessageRequest request) {
        Account sender = accountRepository.findById(senderId)
                .orElseThrow(() -> new AppException("Không tìm thấy tài khoản người gửi", HttpStatus.NOT_FOUND));

        Account recipient = accountRepository.findById(request.recipientId())
                .orElseThrow(() -> new AppException("Không tìm thấy tài khoản người nhận", HttpStatus.NOT_FOUND));

        ChatMessage message = ChatMessage.builder()
                .sender(sender)
                .recipient(recipient)
                .content(request.content())
                .messageType(request.messageType() != null ? request.messageType() : "TEXT")
                .attachmentUrl(request.attachmentUrl())
                .isRead(false)
                .build();

        return ChatMessageResponse.fromEntity(chatRepository.save(message));
    }

    @Override
    @Transactional
    public List<ChatMessageResponse> getMessages(UUID currentUserId, UUID partnerId) {
        // Tự động đánh dấu đã đọc các tin nhắn gửi cho currentUserId từ partnerId
        chatRepository.markMessagesAsRead(currentUserId, partnerId);

        List<ChatMessage> messages = chatRepository.findConversationMessages(currentUserId, partnerId);
        return messages.stream().map(ChatMessageResponse::fromEntity).toList();
    }

    @Override
    public List<ConversationSummaryResponse> getConversations(UUID currentUserId) {
        List<UUID> partnerIds = chatRepository.findConversationPartnerIds(currentUserId);
        List<ConversationSummaryResponse> summaries = new ArrayList<>();

        for (UUID partnerId : partnerIds) {
            Account partner = accountRepository.findById(partnerId).orElse(null);
            if (partner == null) continue;

            List<ChatMessage> latestMessages = chatRepository.findLatestMessages(currentUserId, partnerId);
            ChatMessage latest = latestMessages.isEmpty() ? null : latestMessages.get(0);
            long unread = chatRepository.countUnreadMessages(currentUserId, partnerId);

            summaries.add(new ConversationSummaryResponse(
                    partner.getUserId(),
                    partner.getFullName(),
                    partner.getRole() != null ? partner.getRole().name() : "",
                    partner.getPhoneNumber(),
                    partner.getAvatar(),
                    latest != null ? latest.getContent() : "",
                    latest != null ? latest.getCreatedAt() : null,
                    unread
            ));
        }

        // Sắp xếp hội thoại có tin nhắn mới nhất lên đầu
        summaries.sort((a, b) -> {
            if (a.lastMessageTime() == null && b.lastMessageTime() == null) return 0;
            if (a.lastMessageTime() == null) return 1;
            if (b.lastMessageTime() == null) return -1;
            return b.lastMessageTime().compareTo(a.lastMessageTime());
        });

        return summaries;
    }

    @Override
    @Transactional
    public void markAsRead(UUID currentUserId, UUID partnerId) {
        chatRepository.markMessagesAsRead(currentUserId, partnerId);
    }

    @Override
    public List<ConversationSummaryResponse> getAvailableConsultants(UUID currentUserId) {
        // Lấy danh sách Bác sĩ và Admin có thể tư vấn
        List<Account> consultants = accountRepository.findAllByRoleInAndDeletedFalse(
                List.of(Role.ROLE_DOCTOR, Role.ROLE_HEAD_OF_DEPARTMENT, Role.ROLE_ADMIN)
        );

        List<ConversationSummaryResponse> result = new ArrayList<>();
        for (Account c : consultants) {
            if (c.getUserId().equals(currentUserId)) continue;

            List<ChatMessage> latestMessages = chatRepository.findLatestMessages(currentUserId, c.getUserId());
            ChatMessage latest = latestMessages.isEmpty() ? null : latestMessages.get(0);
            long unread = chatRepository.countUnreadMessages(currentUserId, c.getUserId());

            result.add(new ConversationSummaryResponse(
                    c.getUserId(),
                    c.getFullName(),
                    c.getRole() != null ? c.getRole().name() : "",
                    c.getPhoneNumber(),
                    c.getAvatar(),
                    latest != null ? latest.getContent() : "Sẵn sàng hỗ trợ tư vấn sức khỏe trực tuyến",
                    latest != null ? latest.getCreatedAt() : null,
                    unread
            ));
        }

        return result;
    }
}
