package com.hospital.api.service.impl;

import com.hospital.api.dto.request.PatientProfileRequest;
import com.hospital.api.dto.response.PatientProfileResponse;
import com.hospital.api.entity.Account;
import com.hospital.api.entity.PatientProfile;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.AccountRepository;
import com.hospital.api.repository.PatientProfileRepository;
import com.hospital.api.service.PatientProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import com.hospital.api.dto.response.PatientProfileLookupResponse;
import com.hospital.api.entity.MedicalExaminationRecord;
import com.hospital.api.repository.MedicalExaminationRecordRepository;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class PatientProfileServiceImpl implements PatientProfileService {

    private final PatientProfileRepository patientProfileRepository;
    private final AccountRepository accountRepository;
    private final MedicalExaminationRecordRepository recordRepository;

    @Override
    public List<PatientProfileResponse> getMyProfiles(UUID accountId) {
        return patientProfileRepository.findAllByAccount_UserIdAndDeletedFalse(accountId)
                .stream()
                .map(PatientProfileResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public PatientProfileResponse createProfile(UUID accountId, PatientProfileRequest request) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new AppException("Không tìm thấy tài khoản", HttpStatus.NOT_FOUND));

        PatientProfile profile = PatientProfile.builder()
                .fullName(request.fullName())
                .phoneNumber(request.phoneNumber())
                .identityNumber(request.identityNumber())
                .healthInsuranceNumber(request.healthInsuranceNumber())
                .gender(request.gender())
                .dateOfBirth(request.dateOfBirth())
                .streetAddress(request.streetAddress())
                .province(request.province())
                .district(request.district())
                .ward(request.ward())
                .account(account)
                .build();

        return PatientProfileResponse.fromEntity(patientProfileRepository.save(profile));
    }

    @Override
    @Transactional
    public PatientProfileResponse updateProfile(UUID accountId, UUID profileId, PatientProfileRequest request) {
        PatientProfile profile = patientProfileRepository
                .findByPatientProfileIdAndAccount_UserIdAndDeletedFalse(profileId, accountId)
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ hoặc bạn không có quyền sửa", HttpStatus.NOT_FOUND));

        profile.setFullName(request.fullName());
        profile.setPhoneNumber(request.phoneNumber());
        profile.setIdentityNumber(request.identityNumber());
        profile.setHealthInsuranceNumber(request.healthInsuranceNumber());
        profile.setGender(request.gender());
        profile.setDateOfBirth(request.dateOfBirth());
        profile.setStreetAddress(request.streetAddress());
        profile.setProvince(request.province());
        profile.setDistrict(request.district());
        profile.setWard(request.ward());

        return PatientProfileResponse.fromEntity(patientProfileRepository.save(profile));
    }

    @Override
    @Transactional
    public void deleteProfile(UUID accountId, UUID profileId) {
        PatientProfile profile = patientProfileRepository
                .findByPatientProfileIdAndAccount_UserIdAndDeletedFalse(profileId, accountId)
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ", HttpStatus.NOT_FOUND));

        profile.setDeleted(true);
        patientProfileRepository.save(profile);
    }

    @Override
    public List<PatientProfileLookupResponse> lookupPatients(String keyword) {
        String cleanKw = (keyword != null) ? keyword.trim() : "";
        if (cleanKw.length() < 3) {
            return List.of();
        }
        List<PatientProfile> profiles = patientProfileRepository.searchProfiles(cleanKw);

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        return profiles.stream().map(p -> {
            List<MedicalExaminationRecord> records = recordRepository
                    .findAllByPatientProfile_PatientProfileIdAndDeletedFalseOrderByCreatedAtDesc(p.getPatientProfileId());

            String lastVisitDate = null;
            String lastDepartmentName = null;
            String lastDoctorName = null;
            String lastDiagnosis = null;
            int totalVisits = records.size();

            if (!records.isEmpty()) {
                MedicalExaminationRecord latest = records.get(0);
                if (latest.getCreatedAt() != null) {
                    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
                            .withZone(java.time.ZoneId.systemDefault());
                    lastVisitDate = formatter.format(latest.getCreatedAt());
                }
                if (latest.getDoctor() != null) {
                    if (latest.getDoctor().getAccount() != null) {
                        lastDoctorName = latest.getDoctor().getAccount().getFullName();
                    }
                    if (latest.getDoctor().getDepartment() != null) {
                        lastDepartmentName = latest.getDoctor().getDepartment().getDepartmentName();
                    }
                }
                lastDiagnosis = latest.getFinalDiagnosis() != null ? latest.getFinalDiagnosis() : latest.getInitialDiagnosis();
            }

            return PatientProfileLookupResponse.fromEntity(
                    p,
                    lastVisitDate,
                    lastDepartmentName,
                    lastDoctorName,
                    lastDiagnosis,
                    totalVisits
            );
        }).toList();
    }
}

