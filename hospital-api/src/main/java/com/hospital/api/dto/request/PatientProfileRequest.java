package com.hospital.api.dto.request;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.hospital.api.common.FlexibleLocalDateDeserializer;
import com.hospital.api.constant.Gender;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;

import java.time.LocalDate;

public record PatientProfileRequest(
        @NotBlank(message = "Họ tên không được để trống")
        String fullName,

        String phoneNumber,
        String identityNumber,
        String healthInsuranceNumber,

        @NotNull(message = "Giới tính không được để trống")
        Gender gender,

        @NotNull(message = "Ngày sinh không được để trống")
        @Past(message = "Ngày sinh phải trong quá khứ")
        @JsonDeserialize(using = FlexibleLocalDateDeserializer.class)
        LocalDate dateOfBirth,

        String streetAddress,
        String province,
        String district,
        String ward,
        String relationship
) {
    public PatientProfileRequest(
            String fullName, String phoneNumber, String identityNumber,
            String healthInsuranceNumber, Gender gender, LocalDate dateOfBirth,
            String streetAddress, String province, String district, String ward
    ) {
        this(fullName, phoneNumber, identityNumber, healthInsuranceNumber, gender,
                dateOfBirth, streetAddress, province, district, ward, "SELF");
    }
}
