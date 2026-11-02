package com.hospital.api.service;

import com.hospital.api.dto.request.PatientProfileRequest;
import com.hospital.api.dto.response.PatientProfileResponse;

import com.hospital.api.dto.response.PatientProfileLookupResponse;

import com.hospital.api.dto.request.FindPatientByInfoRequest;
import com.hospital.api.dto.request.LinkPatientProfileRequest;
import com.hospital.api.dto.response.PatientLinkSummaryResponse;

import java.util.List;
import java.util.UUID;

public interface PatientProfileService {
    List<PatientProfileResponse> getMyProfiles(UUID accountId);
    PatientProfileResponse getProfileById(UUID accountId, UUID profileId, boolean isStaff);
    PatientProfileResponse createProfile(UUID accountId, PatientProfileRequest request);
    PatientProfileResponse updateProfile(UUID accountId, UUID profileId, PatientProfileRequest request);
    void deleteProfile(UUID accountId, UUID profileId);
    List<PatientProfileLookupResponse> lookupPatients(String keyword);

    // Nghiệp vụ liên kết hồ sơ bệnh nhân cũ (Hình 2.16 - 2.17)
    PatientLinkSummaryResponse findProfileByCode(UUID currentAccountId, String patientCode);
    List<PatientLinkSummaryResponse> findProfilesByInfo(UUID currentAccountId, FindPatientByInfoRequest request);
    PatientProfileResponse linkExistingProfile(UUID currentAccountId, LinkPatientProfileRequest request);
}

