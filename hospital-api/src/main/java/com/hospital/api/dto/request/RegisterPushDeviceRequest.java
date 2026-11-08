package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterPushDeviceRequest(
    @NotBlank(message = "deviceInstallId không được để trống")
    @Size(max = 100, message = "deviceInstallId tối đa 100 ký tự")
    String deviceInstallId,

    @NotBlank(message = "deviceToken không được để trống")
    String deviceToken,

    @NotBlank(message = "platform không được để trống")
    @Pattern(regexp = "^(?i)(ANDROID|IOS|WEB)$", message = "platform chỉ chấp nhận ANDROID, IOS hoặc WEB")
    String platform
) {
}

