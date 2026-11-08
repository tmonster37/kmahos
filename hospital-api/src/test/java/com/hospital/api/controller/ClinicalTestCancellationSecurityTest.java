package com.hospital.api.controller;

import com.hospital.api.service.ClinicalExaminationService;
import com.hospital.api.service.FhirExportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.junit.jupiter.web.SpringJUnitWebConfig;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import java.util.UUID;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringJUnitWebConfig(ClinicalTestCancellationSecurityTest.Config.class)
class ClinicalTestCancellationSecurityTest {
    @Configuration
    @EnableWebMvc
    @EnableWebSecurity
    @EnableMethodSecurity
    @ComponentScan(basePackageClasses = ClinicalExaminationController.class, useDefaultFilters = false,
            includeFilters = @ComponentScan.Filter(type = FilterType.REGEX,
                    pattern = "com.hospital.api.controller.(ClinicalExaminationController|ClinicalTestCancellationController)"))
    static class Config {
        @Bean ClinicalExaminationService clinicalService() { return mock(ClinicalExaminationService.class); }
        @Bean FhirExportService fhirExportService() { return mock(FhirExportService.class); }
        @Bean com.hospital.api.repository.DoctorRepository doctorRepository() { return mock(com.hospital.api.repository.DoctorRepository.class); }
        @Bean SecurityFilterChain security(HttpSecurity http) throws Exception {
            return http.csrf(c -> c.disable()).authorizeHttpRequests(a -> a.anyRequest().authenticated())
                    .httpBasic(b -> {}).build();
        }
    }

    @Autowired WebApplicationContext context;
    @Autowired ClinicalExaminationService service;
    MockMvc mvc;
    UUID id = UUID.randomUUID();

    @BeforeEach void setup() {
        reset(service);
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    private String url() { return "/api/clinical-examinations/tests/" + id + "/cancel"; }

    @ParameterizedTest
    @ValueSource(strings = {"DOCTOR", "LAB_TECHNICIAN", "HEAD_OF_DEPARTMENT", "ADMIN"})
    void clinicalRolesCanCancelWithRequiredClinicalReason(String role) throws Exception {
        mvc.perform(post(url()).with(user("staff").roles(role)).contentType("application/json")
                .content("{\"cancelReason\":\"Patient declined\"}")).andExpect(status().isOk());
        verify(service).cancelMedicalTest(id, "Patient declined");
    }

    @ParameterizedTest
    @ValueSource(strings = {"PATIENT", "NURSE", "CASHIER"})
    void otherRolesCannotCancel(String role) throws Exception {
        mvc.perform(post(url()).with(user("other").roles(role)).contentType("application/json")
                .content("{\"cancelReason\":\"Declined\"}")).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test void unauthenticatedCancellationIsRejected() throws Exception {
        mvc.perform(post(url()).contentType("application/json").content("{\"cancelReason\":\"Declined\"}"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"cancelReason\":null}", "{\"cancelReason\":\"\"}", "{\"cancelReason\":\"   \"}"})
    void missingOrBlankReasonIsRejected(String body) throws Exception {
        mvc.perform(post(url()).with(user("staff").roles("DOCTOR")).contentType("application/json")
                .content(body)).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test void missingBodyIsRejected() throws Exception {
        mvc.perform(post(url()).with(user("staff").roles("DOCTOR"))).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test void existingClinicalRouteAndReasonParameterRemainSupported() throws Exception {
        mvc.perform(post("/api/clinical/tests/" + id + "/cancel").with(user("staff").roles("LAB_TECHNICIAN"))
                .param("reason", "Declined")).andExpect(status().isOk());
        verify(service).cancelMedicalTest(id, "Declined");
    }
}
