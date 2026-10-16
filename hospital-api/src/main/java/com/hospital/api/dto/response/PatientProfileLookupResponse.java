package com.hospital.api.dto.response;

import com.hospital.api.constant.Gender;
import com.hospital.api.entity.PatientProfile;

import java.time.LocalDate;
import java.util.UUID;

public record PatientProfileLookupResponse(
        UUID patientProfileId,
        String fullName,
        String phoneNumber,
        String identityNumber,
        String healthInsuranceNumber,
        Gender gender,
        LocalDate dateOfBirth,
        String streetAddress,
        String province,
        String district,
        String ward,
        // Lịch sử khám bệnh gần nhất
        String lastVisitDate,
        String lastDepartmentName,
        String lastDoctorName,
        String lastDiagnosis,
        int totalVisits
) {
    public static PatientProfileLookupResponse fromEntity(
            PatientProfile p,
            String lastVisitDate,
            String lastDepartmentName,
            String lastDoctorName,
            String lastDiagnosis,
            int totalVisits
    ) {
        return new PatientProfileLookupResponse(
                p.getPatientProfileId(),
                p.getFullName(),
                maskPhone(p.getPhoneNumber()),
                maskIdentity(p.getIdentityNumber()),
                maskInsurance(p.getHealthInsuranceNumber()),
                p.getGender(),
                p.getDateOfBirth(),
                p.getStreetAddress() != null && !p.getStreetAddress().isBlank() ? "***" : "",
                p.getProvince(),
                p.getDistrict(),
                p.getWard(),
                lastVisitDate,
                lastDepartmentName,
                lastDoctorName,
                maskDiagnosis(lastDiagnosis),
                totalVisits
        );
    }

    private static String maskPhone(String phone) {
        if (phone == null || phone.isBlank()) return "";
        String clean = phone.trim();
        if (clean.length() <= 5) return "***";
        return clean.substring(0, 3) + "****" + clean.substring(clean.length() - 3);
    }

    private static String maskIdentity(String id) {
        if (id == null || id.isBlank()) return "";
        String clean = id.trim();
        if (clean.length() <= 6) return "******";
        return clean.substring(0, 3) + "******" + clean.substring(clean.length() - 3);
    }

    private static String maskInsurance(String bhyt) {
        if (bhyt == null || bhyt.isBlank()) return "";
        String clean = bhyt.trim();
        if (clean.length() <= 6) return "******";
        return clean.substring(0, 4) + "******" + clean.substring(clean.length() - 3);
    }

    private static String maskDiagnosis(String diag) {
        if (diag == null || diag.isBlank()) return null;
        // Rút gọn chẩn đoán để tránh lộ bệnh án chi tiết trong tra cứu nhanh
        return "Đã hoàn thành khám chuyên khoa";
    }
}
