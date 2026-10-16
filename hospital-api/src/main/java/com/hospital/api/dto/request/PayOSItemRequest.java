package com.hospital.api.dto.request;

public record PayOSItemRequest(
        String name,
        Integer quantity,
        Long price
) {}
