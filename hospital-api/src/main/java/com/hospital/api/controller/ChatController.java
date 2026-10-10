package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.dto.request.ChatMessageRequest;
import com.hospital.api.dto.response.ChatMessageResponse;
import com.hospital.api.dto.response.ConversationSummaryResponse;
import com.hospital.api.security.UserPrincipal;
import com.hospital.api.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    // 1. Gửi tin nhắn
    @PostMapping("/send")
    public ResponseEntity<ApiResponse<ChatMessageResponse>> sendMessage(
            @AuthenticationPrincipal UserPrincipal user,
            @Valid @RequestBody ChatMessageRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(chatService.sendMessage(user.getId(), request), "Gửi tin nhắn thành công"));
    }

    // 2. Lấy lịch sử tin nhắn với 1 đối tác
    @GetMapping("/messages/{partnerId}")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getMessages(
            @AuthenticationPrincipal UserPrincipal user,
            @PathVariable UUID partnerId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                chatService.getMessages(user.getId(), partnerId),
                "Lấy lịch sử tin nhắn thành công"
        ));
    }

    // 3. Lấy danh sách cuộc hội thoại gần đây
    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<List<ConversationSummaryResponse>>> getConversations(
            @AuthenticationPrincipal UserPrincipal user
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                chatService.getConversations(user.getId()),
                "Lấy danh sách cuộc hội thoại thành công"
        ));
    }

    // 4. Lấy danh sách Bác sĩ / Tư vấn viên y tế trực tuyến
    @GetMapping("/consultants")
    public ResponseEntity<ApiResponse<List<ConversationSummaryResponse>>> getAvailableConsultants(
            @AuthenticationPrincipal UserPrincipal user
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                chatService.getAvailableConsultants(user.getId()),
                "Lấy danh sách tư vấn viên y tế thành công"
        ));
    }

    // 5. Đánh dấu đã đọc tin nhắn
    @PutMapping("/read/{partnerId}")
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @AuthenticationPrincipal UserPrincipal user,
            @PathVariable UUID partnerId
    ) {
        chatService.markAsRead(user.getId(), partnerId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã đánh dấu đã đọc"));
    }
}
