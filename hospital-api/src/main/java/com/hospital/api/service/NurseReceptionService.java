package com.hospital.api.service;

import com.hospital.api.dto.request.NurseCheckInRequest;
import com.hospital.api.dto.request.PayAtClinicRequest;
import com.hospital.api.dto.response.ClinicReceiptResponse;
import com.hospital.api.dto.response.NurseQueueResponse;
import com.hospital.api.dto.response.NurseCheckInResponse;

import java.util.List;
import java.util.UUID;

public interface NurseReceptionService {
    NurseCheckInResponse checkInByQr(NurseCheckInRequest request, UUID nurseUserId);
    List<NurseQueueResponse> getReceptionQueue(Integer departmentId);
    ClinicReceiptResponse payAtClinic(PayAtClinicRequest request, UUID staffUserId);
    com.hospital.api.dto.response.BookingResponse updateBookingStatus(UUID bookingId, com.hospital.api.constant.BookingStatus newStatus);
}
