package com.hospital.api.service;

import com.hospital.api.dto.request.LisAutomatedResultRequest;
import com.hospital.api.dto.request.PacsCallbackRequest;
import com.hospital.api.dto.response.DicomWorklistItemResponse;
import com.hospital.api.dto.response.LabTestDetailResponse;
import com.hospital.api.dto.response.MedicalTestResponse;

import java.time.LocalDate;
import java.util.List;

public interface ClinicalGatewayService {

    // 1. DICOM Modality Worklist (MWL) cho máy X-Quang, CT, MRI
    List<DicomWorklistItemResponse> getDicomWorklist(String modality, LocalDate date);

    // 2. Tiếp nhận Webhook từ PACS Server (dcm4chee) & Tích hợp OHIF Web Viewer
    MedicalTestResponse processPacsCallback(PacsCallbackRequest request);

    // 3. Cổng tiếp nhận kết quả tự động từ máy xét nghiệm (LIS Gateway / OpenELIS HL7)
    LabTestDetailResponse ingestLisResults(LisAutomatedResultRequest request);
}
