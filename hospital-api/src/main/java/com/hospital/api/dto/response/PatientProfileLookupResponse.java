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
                p.getPhoneNumber(),
                p.getIdentityNumber(),
                p.getHealthInsuranceNumber(),
                p.getGender(),
                p.getDateOfBirth(),
                p.getStreetAddress(),
                p.getProvince(),
                p.getDistrict(),
                p.getWard(),
                lastVisitDate,
                lastDepartmentName,
                lastDoctorName,
                lastDiagnosis,
                totalVisits
        );
    }
}
