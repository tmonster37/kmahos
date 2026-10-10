package com.hospital.api.service;

import com.hospital.api.dto.request.PatientProfileRequest;
import com.hospital.api.dto.response.PatientProfileResponse;

import com.hospital.api.dto.response.PatientProfileLookupResponse;

import java.util.List;
import java.util.UUID;

public interface PatientProfileService {
    List<PatientProfileResponse> getMyProfiles(UUID accountId);
    PatientProfileResponse createProfile(UUID accountId, PatientProfileRequest request);
    PatientProfileResponse updateProfile(UUID accountId, UUID profileId, PatientProfileRequest request);
    void deleteProfile(UUID accountId, UUID profileId);
    List<PatientProfileLookupResponse> lookupPatients(String keyword);
}

