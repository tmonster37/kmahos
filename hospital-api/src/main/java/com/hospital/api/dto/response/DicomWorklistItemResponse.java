package com.hospital.api.dto.response;

import java.time.Instant;
import java.util.UUID;

/**
 * DTO mô phỏng bản tin DICOM Modality Worklist (MWL) cho các máy X-Quang, CT, MRI
 */
public record DicomWorklistItemResponse(
        String accessionNumber,     // Tag (0008,0050)
        String patientId,           // Tag (0010,0020)
        String patientName,         // Tag (0010,0010)
        String patientBirthDate,    // Tag (0010,0030)
        String patientSex,          // Tag (0010,0040)
        String modality,            // Tag (0008,0060) - CR, DX, CT, MR, US
        String scheduledProcedureDescription, // Tên chỉ định chụp (VD: Chụp X-quang ngực thẳng)
        String requestingPhysician, // Bác sĩ chỉ định
        String scheduledStationName, // Phòng chụp
        UUID testId,
        Instant scheduledDateTime
) {}
