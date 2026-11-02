package com.hospital.api.dto.response;

import com.hospital.api.constant.Gender;
import com.hospital.api.entity.PatientProfile;

import java.time.LocalDate;
import java.util.UUID;

public record PatientLinkSummaryResponse(
        UUID patientProfileId,
        String patientCode,
        String fullName,
        LocalDate dateOfBirth,
        Gender gender,
        String maskedPhoneNumber,
        String maskedIdentityNumber,
        String province,
        String district,
        String ward,
        int totalVisits,
        boolean isAlreadyMine,
        boolean isOwnedByOtherAccount
) {
    public static PatientLinkSummaryResponse fromEntity(
            PatientProfile p,
            int totalVisits,
            UUID currentAccountId
    ) {
        String idStr = p.getPatientProfileId().toString().replace("-", "").toUpperCase();
        String patientCode = "BN-" + idStr.substring(0, 6);

        String rawPhone = p.getPhoneNumber() != null ? p.getPhoneNumber() :
                (p.getAccount() != null ? p.getAccount().getPhoneNumber() : "");
        String maskedPhone = maskPhone(rawPhone);
        String maskedId = maskIdentity(p.getIdentityNumber());

        boolean isAlreadyMine = p.getAccount() != null && p.getAccount().getUserId().equals(currentAccountId);
        boolean isOwnedByOther = p.isLinked() && p.getAccount() != null && !p.getAccount().getUserId().equals(currentAccountId);

        return new PatientLinkSummaryResponse(
                p.getPatientProfileId(),
                patientCode,
                p.getFullName(),
                p.getDateOfBirth(),
                p.getGender(),
                maskedPhone,
                maskedId,
                p.getProvince(),
                p.getDistrict(),
                p.getWard(),
                totalVisits,
                isAlreadyMine,
                isOwnedByOther
        );
    }

    private static String maskPhone(String phone) {
        if (phone == null || phone.isBlank()) return "Chưa cập nhật";
        String clean = phone.trim();
        if (clean.length() <= 5) return "***";
        return clean.substring(0, 3) + "****" + clean.substring(clean.length() - 3);
    }

    private static String maskIdentity(String identity) {
        if (identity == null || identity.isBlank()) return null;
        String clean = identity.trim();
        if (clean.length() <= 6) return "***";
        return clean.substring(0, 3) + "****" + clean.substring(clean.length() - 3);
    }
}
