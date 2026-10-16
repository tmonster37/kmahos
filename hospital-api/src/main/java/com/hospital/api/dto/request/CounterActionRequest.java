package com.hospital.api.dto.request;

public record CounterActionRequest(
        Integer targetRoomId, // Phòng khám bác sĩ chuyển tới khi tiếp nhận xong
        String notes
) {}
