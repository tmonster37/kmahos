package com.hospital.api.dto.request;

import java.util.List;

public record QueueAlertBatchRequest(
        List<QueuePatientAlertItem> upcomingPatients,
        String roomName
) {
    public record QueuePatientAlertItem(
            String bookingCode,
            String patientPhone,
            String patientName,
            String queueCode,
            Integer remainingCount
    ) {}
}
