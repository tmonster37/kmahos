package com.hospital.api.dto.response;

public record PrescriptionVerificationResponse(
        boolean valid,
        String prescriptionCode,
        String doctorName,
        String doctorLicense,
        String clinicName,
        String createdAt,
        String message
) {}
