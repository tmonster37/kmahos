package com.hospital.api.dto.response;

public record OtpResponse(
        boolean success,
        String message,
        long expiresInSeconds
) {
    public static OtpResponse ofSuccess(String message, long expiresInSeconds) {
        return new OtpResponse(true, message, expiresInSeconds);
    }
}
