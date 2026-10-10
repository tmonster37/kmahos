package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;

/**
 * Webhook payload từ PACS Server (dcm4chee / Orthanc PACS) khi hoàn tất ca chụp
 */
public record PacsCallbackRequest(
        @NotBlank(message = "Accession Number không được để trống")
        String accessionNumber,

        @NotBlank(message = "Study Instance UID không được để trống")
        String studyInstanceUid,

        String modality,

        Integer numberOfInstances, // Số lượng tấm ảnh DICOM trong ca chụp

        String radiologyNotes, // Kết luận mô tả hình ảnh của Bác sĩ CĐHA

        String pacsViewerBaseUrl // URL gốc của OHIF Web Viewer (nếu có tùy chỉnh)
) {}
