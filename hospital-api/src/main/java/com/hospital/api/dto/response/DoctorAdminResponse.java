package com.hospital.api.dto.response;

import com.hospital.api.constant.Degree;
import com.hospital.api.constant.Role;
import com.hospital.api.entity.Doctor;

import java.math.BigDecimal;
import java.util.UUID;

public record DoctorAdminResponse(
        UUID doctorId,
        UUID accountId,
        String fullName,
        String phoneNumber,
        String email,
        Integer departmentId,
        String departmentName,
        Degree degree,
        String biography,
        BigDecimal consultationFee,
        Double ratingAverage,
        boolean isActive,
        Role role
) {
    public static DoctorAdminResponse fromEntity(Doctor doctor) {
        return new DoctorAdminResponse(
                doctor.getDoctorId(),
                doctor.getAccount().getUserId(),
                doctor.getAccount().getFullName(),
                doctor.getAccount().getPhoneNumber(),
                doctor.getAccount().getEmail(),
                doctor.getDepartment() != null ? doctor.getDepartment().getDepartmentId() : null,
                doctor.getDepartment() != null ? doctor.getDepartment().getDepartmentName() : null,
                doctor.getDegree(),
                doctor.getBiography(),
                doctor.getConsultationFee(),
                doctor.getRatingAverage() != null ? doctor.getRatingAverage() : 5.0,
                doctor.getAccount().isActive(),
                doctor.getAccount().getRole()
        );
    }
}
