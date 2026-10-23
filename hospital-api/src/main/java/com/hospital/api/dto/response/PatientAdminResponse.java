package com.hospital.api.dto.response;

import com.hospital.api.constant.Gender;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Builder
public record PatientAdminResponse(
        UUID patientProfileId,
        String patientCode,
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
        String fullAddress,
        UUID accountId,
        String email,
        BigDecimal balance,
        boolean accountActive,
        Integer totalVisits,
        String lastVisitDate,
        Instant createdAt,
        List<PatientVisitHistoryDto> history
) {
    @Builder
    public record PatientVisitHistoryDto(
            UUID recordId,
            String visitDate,
            String departmentName,
            String doctorName,
            String diagnosis,
            BigDecimal cost,
            String status
    ) {}
}
