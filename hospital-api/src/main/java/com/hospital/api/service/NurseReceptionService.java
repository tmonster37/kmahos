package com.hospital.api.service;

import com.hospital.api.dto.request.NurseCheckInRequest;
import com.hospital.api.dto.request.PayAtClinicRequest;
import com.hospital.api.dto.response.ClinicReceiptResponse;
import com.hospital.api.dto.response.DoctorQueueResponse;
import com.hospital.api.dto.response.NurseCheckInResponse;

import java.util.List;
import java.util.UUID;

public interface NurseReceptionService {
    NurseCheckInResponse checkInByQr(NurseCheckInRequest request, UUID nurseUserId);
    List<DoctorQueueResponse> getReceptionQueue(Integer departmentId);
    ClinicReceiptResponse payAtClinic(PayAtClinicRequest request, UUID staffUserId);
}
