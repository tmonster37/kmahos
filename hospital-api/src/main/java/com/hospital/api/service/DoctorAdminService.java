package com.hospital.api.service;

import com.hospital.api.dto.request.DoctorCreateRequest;
import com.hospital.api.dto.request.DoctorUpdateRequest;
import com.hospital.api.dto.request.UpdateDoctorLicenseRequest;
import com.hospital.api.dto.response.DoctorAdminResponse;
import com.hospital.api.dto.response.DoctorLicenseResponse;
import com.hospital.api.security.UserPrincipal;

import java.util.List;
import java.util.UUID;

public interface DoctorAdminService {

    List<DoctorAdminResponse> getAllDoctors(Integer departmentId);

    List<DoctorAdminResponse> getAllDoctors(Integer departmentId, UserPrincipal currentUser);

    DoctorAdminResponse createDoctor(DoctorCreateRequest request);

    DoctorAdminResponse updateDoctor(UUID doctorId, DoctorUpdateRequest request);

    void deleteDoctor(UUID doctorId);

    DoctorAdminResponse assignDepartment(UUID doctorId, Integer departmentId);

    DoctorAdminResponse setHeadOfDepartment(UUID doctorId, boolean isHead);

    DoctorLicenseResponse updateDoctorLicense(UUID doctorId, UpdateDoctorLicenseRequest request);

    List<DoctorLicenseResponse> getDoctorLicenses(boolean onlyUnlicensed);
}
