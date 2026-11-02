package com.hospital.api.dto.response;

import com.hospital.api.constant.Gender;
import com.hospital.api.entity.PatientProfile;

import java.time.LocalDate;
import java.util.UUID;

public record PatientProfileResponse(
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
        boolean isLinked,
        String relationship
) {
    public PatientProfileResponse(
            UUID patientProfileId, String fullName, String phoneNumber,
            String identityNumber, String healthInsuranceNumber, Gender gender,
            LocalDate dateOfBirth, String streetAddress, String province,
            String district, String ward, boolean isLinked
    ) {
        this(patientProfileId, fullName, phoneNumber, identityNumber, healthInsuranceNumber,
                gender, dateOfBirth, streetAddress, province, district, ward, isLinked, "SELF");
    }

    public static PatientProfileResponse fromEntity(PatientProfile p) {
        if (p == null) return null;
        return new PatientProfileResponse(
                p.getPatientProfileId(),
                p.getFullName(),
                p.getPhoneNumber(),
                p.getIdentityNumber(),
                p.getHealthInsuranceNumber(),
                p.getGender(),
                p.getDateOfBirth(),
                p.getStreetAddress(),
                p.getProvince(),
                p.getDistrict(),
                p.getWard(),
                p.isLinked(),
                p.getRelationship() != null ? p.getRelationship() : "SELF"
        );
    }
}
