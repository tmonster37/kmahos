package com.hospital.api.controller;

import com.hospital.api.service.AuditLogService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuditLogSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuditLogService auditLogService;

    @Test
    @DisplayName("Unauthenticated request to /api/admin/audit-logs is rejected with 401 Unauthorized")
    void unauthenticatedRequest_isRejectedWith401() throws Exception {
        mockMvc.perform(get("/api/admin/audit-logs"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Authenticated user with ROLE_PATIENT receives 403 Forbidden on /api/admin/audit-logs")
    @WithMockUser(username = "0912345678", roles = {"PATIENT"})
    void patientRole_receives403Forbidden() throws Exception {
        mockMvc.perform(get("/api/admin/audit-logs"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Authenticated user with ROLE_CASHIER receives 403 Forbidden on /api/admin/audit-logs")
    @WithMockUser(username = "cashier01", roles = {"CASHIER"})
    void cashierRole_receives403Forbidden() throws Exception {
        mockMvc.perform(get("/api/admin/audit-logs"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Authenticated user with ROLE_ADMIN is allowed (200 OK) on /api/admin/audit-logs")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void adminRole_isAllowed200Ok() throws Exception {
        when(auditLogService.getRecentAuditLogs(anyString(), anyInt())).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/admin/audit-logs"))
                .andExpect(status().isOk());
    }
}

