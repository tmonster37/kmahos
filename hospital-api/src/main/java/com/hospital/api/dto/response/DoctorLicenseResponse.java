package com.hospital.api.dto.response;

import com.hospital.api.constant.Degree;
import com.hospital.api.entity.Doctor;

import java.time.LocalDate;
import java.util.UUID;

public record DoctorLicenseResponse(
        UUID doctorId,
        String fullName,
        String phoneNumber,
        String departmentName,
        Degree degree,
        String doctorLicense,
        LocalDate licenseIssuedDate,
        String licenseScope,
        boolean isLicensed,
        String licenseStatus
) {
    public static DoctorLicenseResponse fromEntity(Doctor doctor) {
        boolean licensed = doctor.getDoctorLicense() != null && !doctor.getDoctorLicense().isBlank();
        String status = licensed ? "Đã cấp CCHN hợp lệ" : "Chưa có CCHN (Cần bổ sung)";

        return new DoctorLicenseResponse(
                doctor.getDoctorId(),
                doctor.getAccount() != null ? doctor.getAccount().getFullName() : "N/A",
                doctor.getAccount() != null ? doctor.getAccount().getPhoneNumber() : "N/A",
                doctor.getDepartment() != null ? doctor.getDepartment().getDepartmentName() : "N/A",
                doctor.getDegree(),
                doctor.getDoctorLicense(),
                doctor.getLicenseIssuedDate(),
                doctor.getLicenseScope(),
                licensed,
                status
        );
    }
}
