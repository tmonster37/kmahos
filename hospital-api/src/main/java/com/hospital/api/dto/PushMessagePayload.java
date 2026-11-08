package com.hospital.api.dto;

public record PushMessagePayload(
    String type,
    String title,
    String body,
    String referenceId,
    String deepLink
) {
    public static PushMessagePayload generic(String type, String title, String body, String referenceId, String deepLink) {
        return new PushMessagePayload(type, title, body, referenceId, deepLink);
    }
}

