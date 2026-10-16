package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public record UpdateDoctorLicenseRequest(
        @NotBlank(message = "Số chứng chỉ hành nghề không được để trống")
        String doctorLicense,

        LocalDate licenseIssuedDate,

        String licenseScope
) {}
