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
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

import com.hospital.api.dto.request.FindPatientByInfoRequest;
import com.hospital.api.dto.request.LinkPatientProfileRequest;
import com.hospital.api.dto.response.PatientLinkSummaryResponse;

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
    public PatientProfileResponse getProfileById(UUID accountId, UUID profileId, boolean isStaff) {
        PatientProfile profile = patientProfileRepository.findById(profileId)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ bệnh nhân", HttpStatus.NOT_FOUND));

        if (!isStaff) {
            if (profile.getAccount() == null || !profile.getAccount().getUserId().equals(accountId)) {
                throw new AppException("Bạn không có quyền truy cập hồ sơ bệnh nhân của tài khoản khác", HttpStatus.FORBIDDEN);
            }
        }

        return PatientProfileResponse.fromEntity(profile);
    }

    @Override
    @Transactional
    public PatientProfileResponse createProfile(UUID accountId, PatientProfileRequest request) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new AppException("Không tìm thấy tài khoản", HttpStatus.NOT_FOUND));

        String fullName = request.fullName() != null ? request.fullName().trim() : "";
        LocalDate dob = request.dateOfBirth();

        // Ràng buộc chống tạo trùng lặp cùng 1 người trong tài khoản gia đình (cùng họ tên và ngày sinh)
        List<PatientProfile> existing = patientProfileRepository.findAllByAccount_UserIdAndDeletedFalse(accountId);
        boolean duplicate = existing.stream().anyMatch(p ->
                p.getFullName() != null && p.getFullName().trim().equalsIgnoreCase(fullName)
                && p.getDateOfBirth() != null && p.getDateOfBirth().equals(dob)
        );
        if (duplicate) {
            throw new AppException("Hồ sơ bệnh nhân '" + fullName + "' (ngày sinh " + dob + ") đã tồn tại trong tài khoản gia đình của bạn!", HttpStatus.BAD_REQUEST);
        }

        // Người trong cùng gia đình dùng chung số điện thoại của tài khoản nếu không nhập riêng
        String phone = (request.phoneNumber() != null && !request.phoneNumber().trim().isBlank())
                ? request.phoneNumber().trim()
                : account.getPhoneNumber();

        String rel = (request.relationship() != null && !request.relationship().trim().isBlank())
                ? request.relationship().trim().toUpperCase()
                : "SELF";

        PatientProfile profile = PatientProfile.builder()
                .fullName(fullName)
                .phoneNumber(phone)
                .identityNumber(request.identityNumber())
                .healthInsuranceNumber(request.healthInsuranceNumber())
                .gender(request.gender())
                .dateOfBirth(dob)
                .streetAddress(request.streetAddress())
                .province(request.province())
                .district(request.district())
                .ward(request.ward())
                .account(account)
                .isLinked(true)
                .relationship(rel)
                .build();

        return PatientProfileResponse.fromEntity(patientProfileRepository.save(profile));
    }

    @Override
    @Transactional
    public PatientProfileResponse updateProfile(UUID accountId, UUID profileId, PatientProfileRequest request) {
        PatientProfile profile = patientProfileRepository.findById(profileId)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ bệnh nhân", HttpStatus.NOT_FOUND));

        if (profile.getAccount() == null || !profile.getAccount().getUserId().equals(accountId)) {
            throw new AppException("Bạn không có quyền sửa hồ sơ bệnh nhân của tài khoản khác", HttpStatus.FORBIDDEN);
        }

        String fullName = request.fullName() != null ? request.fullName().trim() : "";
        LocalDate dob = request.dateOfBirth();

        // Kiểm tra trùng lặp với các hồ sơ khác trong cùng tài khoản
        List<PatientProfile> existing = patientProfileRepository.findAllByAccount_UserIdAndDeletedFalse(accountId);
        boolean duplicate = existing.stream()
                .filter(p -> !p.getPatientProfileId().equals(profileId))
                .anyMatch(p ->
                        p.getFullName() != null && p.getFullName().trim().equalsIgnoreCase(fullName)
                        && p.getDateOfBirth() != null && p.getDateOfBirth().equals(dob)
                );
        if (duplicate) {
            throw new AppException("Hồ sơ bệnh nhân '" + fullName + "' (ngày sinh " + dob + ") đã tồn tại trong tài khoản gia đình của bạn!", HttpStatus.BAD_REQUEST);
        }

        String phone = (request.phoneNumber() != null && !request.phoneNumber().trim().isBlank())
                ? request.phoneNumber().trim()
                : (profile.getAccount() != null ? profile.getAccount().getPhoneNumber() : profile.getPhoneNumber());

        profile.setFullName(fullName);
        profile.setPhoneNumber(phone);
        profile.setIdentityNumber(request.identityNumber());
        profile.setHealthInsuranceNumber(request.healthInsuranceNumber());
        profile.setGender(request.gender());
        profile.setDateOfBirth(dob);
        profile.setStreetAddress(request.streetAddress());
        profile.setProvince(request.province());
        profile.setDistrict(request.district());
        profile.setWard(request.ward());
        if (request.relationship() != null && !request.relationship().trim().isBlank()) {
            profile.setRelationship(request.relationship().trim().toUpperCase());
        }

        return PatientProfileResponse.fromEntity(patientProfileRepository.save(profile));
    }

    @Override
    @Transactional
    public void deleteProfile(UUID accountId, UUID profileId) {
        PatientProfile profile = patientProfileRepository.findById(profileId)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ bệnh nhân", HttpStatus.NOT_FOUND));

        if (profile.getAccount() == null || !profile.getAccount().getUserId().equals(accountId)) {
            throw new AppException("Bạn không có quyền xóa hồ sơ bệnh nhân của tài khoản khác", HttpStatus.FORBIDDEN);
        }

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

    @Override
    @Transactional(readOnly = true)
    public PatientLinkSummaryResponse findProfileByCode(UUID currentAccountId, String patientCode) {
        if (patientCode == null || patientCode.trim().isBlank()) {
            throw new AppException("Mã bệnh nhân không được để trống!", HttpStatus.BAD_REQUEST);
        }
        String cleanCode = patientCode.trim().toUpperCase().replace("-", "").replace("BN", "");

        List<PatientProfile> allProfiles = patientProfileRepository.findAllByDeletedFalseOrderByCreatedAtDesc();
        PatientProfile matched = allProfiles.stream()
                .filter(p -> {
                    String idStr = p.getPatientProfileId().toString().replace("-", "").toUpperCase();
                    if (idStr.startsWith(cleanCode) || idStr.contains(cleanCode)) {
                        return true;
                    }
                    if (p.getIdentityNumber() != null && p.getIdentityNumber().trim().equalsIgnoreCase(patientCode.trim())) {
                        return true;
                    }
                    if (p.getHealthInsuranceNumber() != null && p.getHealthInsuranceNumber().trim().equalsIgnoreCase(patientCode.trim())) {
                        return true;
                    }
                    return false;
                })
                .findFirst()
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ bệnh nhân phù hợp với mã '" + patientCode + "'", HttpStatus.NOT_FOUND));

        int totalVisits = recordRepository
                .findAllByPatientProfile_PatientProfileIdAndDeletedFalseOrderByCreatedAtDesc(matched.getPatientProfileId()).size();

        return PatientLinkSummaryResponse.fromEntity(matched, totalVisits, currentAccountId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PatientLinkSummaryResponse> findProfilesByInfo(UUID currentAccountId, FindPatientByInfoRequest request) {
        if (request.fullName() == null || request.fullName().trim().isBlank()) {
            throw new AppException("Vui lòng nhập họ và tên bệnh nhân", HttpStatus.BAD_REQUEST);
        }
        if (request.dateOfBirth() == null) {
            throw new AppException("Vui lòng nhập ngày sinh bệnh nhân", HttpStatus.BAD_REQUEST);
        }
        if (request.gender() == null) {
            throw new AppException("Vui lòng chọn giới tính bệnh nhân", HttpStatus.BAD_REQUEST);
        }

        String searchName = request.fullName().trim();
        List<PatientProfile> candidates = patientProfileRepository.findCandidateProfiles(
                searchName, request.dateOfBirth(), request.gender()
        );

        return candidates.stream()
                .filter(p -> {
                    if (request.identityNumber() != null && !request.identityNumber().isBlank()) {
                        if (p.getIdentityNumber() == null || !p.getIdentityNumber().trim().equalsIgnoreCase(request.identityNumber().trim())) {
                            return false;
                        }
                    }
                    if (request.province() != null && !request.province().isBlank()) {
                        String reqProv = request.province().trim().toLowerCase();
                        if (p.getProvince() != null) {
                            String pProv = p.getProvince().trim().toLowerCase();
                            if (!pProv.contains(reqProv) && !reqProv.contains(pProv)) {
                                return false;
                            }
                        }
                    }
                    return true;
                })
                .map(p -> {
                    int totalVisits = recordRepository
                            .findAllByPatientProfile_PatientProfileIdAndDeletedFalseOrderByCreatedAtDesc(p.getPatientProfileId()).size();
                    return PatientLinkSummaryResponse.fromEntity(p, totalVisits, currentAccountId);
                })
                .toList();
    }

    @Override
    @Transactional
    public PatientProfileResponse linkExistingProfile(UUID currentAccountId, LinkPatientProfileRequest request) {
        Account currentAccount = accountRepository.findById(currentAccountId)
                .filter(Account::isActive)
                .orElseThrow(() -> new AppException("Không tìm thấy tài khoản đang đăng nhập", HttpStatus.NOT_FOUND));

        PatientProfile profile = patientProfileRepository.findById(request.patientProfileId())
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ bệnh nhân cần liên kết", HttpStatus.NOT_FOUND));

        // 1. Kiểm tra nếu hồ sơ đã thuộc tài khoản hiện tại
        if (profile.getAccount() != null && profile.getAccount().getUserId().equals(currentAccountId)) {
            throw new AppException("Hồ sơ bệnh nhân này đã nằm trong danh sách quản lý của bạn!", HttpStatus.BAD_REQUEST);
        }

        // 2. Kiểm tra nếu hồ sơ đã được liên kết với một tài khoản người dùng khác đang hoạt động
        if (profile.isLinked() && profile.getAccount() != null && !profile.getAccount().getUserId().equals(currentAccountId)) {
            throw new AppException("Hồ sơ bệnh nhân này đã được liên kết với một tài khoản khác. Vui lòng liên hệ quầy tiếp đón của bệnh viện để được hỗ trợ chuyển quyền quản lý.", HttpStatus.CONFLICT);
        }

        // 3. Lấy số điện thoại gốc trên hồ sơ bệnh nhân
        String profilePhone = profile.getPhoneNumber();
        if ((profilePhone == null || profilePhone.isBlank()) && profile.getAccount() != null) {
            profilePhone = profile.getAccount().getPhoneNumber();
        }

        if (profilePhone == null || profilePhone.trim().isBlank()) {
            throw new AppException("Hồ sơ này chưa có số điện thoại lưu trữ trong hệ thống để xác thực. Vui lòng mang CCCD đến quầy tiếp đón bệnh viện để được hỗ trợ bổ sung thông tin.", HttpStatus.BAD_REQUEST);
        }

        // 4. Xác thực số điện thoại
        String enteredPhone = normalizePhoneNumber(request.verificationPhoneNumber());
        String expectedPhone = normalizePhoneNumber(profilePhone);

        if (!enteredPhone.equals(expectedPhone)) {
            throw new AppException("Số điện thoại xác thực không khớp với số điện thoại lưu trên hồ sơ bệnh nhân! Vui lòng kiểm tra lại.", HttpStatus.BAD_REQUEST);
        }

        // 5. Kiểm tra chống trùng lặp: tài khoản hiện tại đã có hồ sơ trùng họ tên và ngày sinh này chưa
        List<PatientProfile> myProfiles = patientProfileRepository.findAllByAccount_UserIdAndDeletedFalse(currentAccountId);
        boolean duplicate = myProfiles.stream().anyMatch(p ->
                !p.getPatientProfileId().equals(profile.getPatientProfileId())
                && p.getFullName() != null && p.getFullName().trim().equalsIgnoreCase(profile.getFullName().trim())
                && p.getDateOfBirth() != null && p.getDateOfBirth().equals(profile.getDateOfBirth())
        );
        if (duplicate) {
            throw new AppException("Tài khoản của bạn đã có một hồ sơ khác trùng họ tên và ngày sinh này!", HttpStatus.BAD_REQUEST);
        }

        // 6. Thực hiện liên kết an toàn: bảo toàn toàn bộ dữ liệu lịch sử khám
        profile.setAccount(currentAccount);
        profile.setLinked(true);
        if (profile.getPhoneNumber() == null || profile.getPhoneNumber().isBlank()) {
            profile.setPhoneNumber(profilePhone);
        }

        PatientProfile saved = patientProfileRepository.save(profile);
        return PatientProfileResponse.fromEntity(saved);
    }

    private String normalizePhoneNumber(String phone) {
        if (phone == null) return "";
        String cleaned = phone.replaceAll("[^0-9+]", "");
        if (cleaned.startsWith("+84")) {
            cleaned = "0" + cleaned.substring(3);
        } else if (cleaned.startsWith("84") && cleaned.length() == 11) {
            cleaned = "0" + cleaned.substring(2);
        }
        return cleaned;
    }
}

