package com.hospital.api.controller;

import com.hospital.api.service.DoctorAdminService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DoctorAdminSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DoctorAdminService doctorAdminService;

    @Test
    @DisplayName("Unauthenticated request to /api/admin/doctors is rejected with 401 Unauthorized")
    void unauthenticatedRequest_isRejectedWith401() throws Exception {
        mockMvc.perform(get("/api/admin/doctors"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Authenticated user with ROLE_PATIENT receives 403 Forbidden on /api/admin/doctors")
    @WithMockUser(username = "0912345678", roles = {"PATIENT"})
    void patientRole_receives403Forbidden() throws Exception {
        mockMvc.perform(get("/api/admin/doctors"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Authenticated user with ROLE_DOCTOR receives 403 Forbidden on /api/admin/doctors")
    @WithMockUser(username = "0911000001", roles = {"DOCTOR"})
    void doctorRole_receives403Forbidden() throws Exception {
        mockMvc.perform(get("/api/admin/doctors"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Authenticated user with ROLE_ADMIN is allowed (200 OK) on /api/admin/doctors")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void adminRole_isAllowed200Ok() throws Exception {
        when(doctorAdminService.getAllDoctors(any(), any())).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/admin/doctors"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Authenticated user with ROLE_HEAD_OF_DEPARTMENT is allowed (200 OK) on GET /api/admin/doctors")
    @WithMockUser(username = "0900000002", roles = {"HEAD_OF_DEPARTMENT"})
    void headOfDepartmentRole_isAllowed200Ok() throws Exception {
        when(doctorAdminService.getAllDoctors(any(), any())).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/admin/doctors"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Authenticated user with ROLE_HEAD_OF_DEPARTMENT receives 403 Forbidden on POST /api/admin/doctors")
    @WithMockUser(username = "0900000002", roles = {"HEAD_OF_DEPARTMENT"})
    void headOfDepartmentRole_receives403ForbiddenOnPost() throws Exception {
        mockMvc.perform(post("/api/admin/doctors")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }
}
