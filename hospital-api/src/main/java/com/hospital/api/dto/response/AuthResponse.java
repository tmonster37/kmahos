package com.hospital.api.dto.response;

import com.hospital.api.constant.Role;

import java.util.UUID;

public record AuthResponse(
    String accessToken,
    String tokenType,
    UUID userId,
    String fullName,
    String phoneNumber,
    Role role
) {
    public static AuthResponse of(String token, UUID userId, String fullName, String phoneNumber, Role role) {
        return new AuthResponse(token, "Bearer", userId, fullName, phoneNumber, role);
    }
}
