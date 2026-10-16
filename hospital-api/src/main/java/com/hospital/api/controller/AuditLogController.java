package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.dto.response.AuditLogResponse;
import com.hospital.api.security.UserPrincipal;
import com.hospital.api.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/audit-logs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AuditLogController {

    private final AuditLogService auditLogService;

    /**
     * Tra cứu danh sách nhật ký kiểm toán bất biến (Immutable Audit Logs)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<AuditLogResponse>>> getAuditLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false, defaultValue = "50") int limit
    ) {
        List<AuditLogResponse> logs = auditLogService.getRecentAuditLogs(action, limit);
        return ResponseEntity.ok(ApiResponse.ok(logs, "Lấy danh sách nhật ký kiểm toán thành công"));
    }

    /**
     * Ghi nhận chủ động một sự kiện audit từ giao diện Admin
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> recordCustomAuditLog(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestBody Map<String, String> payload
    ) {
        String action = payload.getOrDefault("action", "ADMIN_CUSTOM_EVENT");
        String entityType = payload.getOrDefault("entityType", "SYSTEM");
        String entityId = payload.getOrDefault("entityId", "");
        String details = payload.getOrDefault("details", "");

        auditLogService.log(
                userPrincipal.getId(),
                userPrincipal.getUsername(),
                "ROLE_ADMIN",
                action,
                entityType,
                entityId,
                details,
                "127.0.0.1"
        );

        return ResponseEntity.ok(ApiResponse.ok(null, "Đã ghi nhận nhật ký kiểm toán thành công"));
    }
}
