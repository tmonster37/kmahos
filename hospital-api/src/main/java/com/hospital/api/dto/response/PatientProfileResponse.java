
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
        String ward
) {
    public static PatientProfileResponse fromEntity(PatientProfile p) {
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
                p.getWard()
        );
    }
}
