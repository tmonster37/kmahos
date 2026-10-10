package com.hospital.api.service;

import com.hospital.api.constant.BedStatus;
import com.hospital.api.dto.request.*;
import com.hospital.api.dto.response.*;
import com.hospital.api.entity.Bed;
import com.hospital.api.entity.Discharge;
import com.hospital.api.entity.HospitalAdmission;
import com.hospital.api.entity.HospitalizationDetail;

import java.util.List;
import java.util.UUID;

public interface InpatientService {
    HospitalAdmission admitPatient(AdmitPatientRequest request);
    HospitalizationDetail addDailyRecord(UUID admissionId, DailyRecordRequest request);
    Discharge dischargePatient(UUID admissionId, DischargeRequest request);
    HospitalAdmission getAdmissionById(UUID admissionId);
    List<HospitalAdmission> getAdmissionsByPatient(UUID patientProfileId);
    List<HospitalAdmission> getActiveAdmissions();
    List<HospitalizationDetail> getDailyRecords(UUID admissionId);
    HospitalAdmission transferRoom(UUID admissionId, Integer newRoomId);

    // 1. Quản lý Giường bệnh (Bed Allocation - Open Hospital Ward/Bed)
    BedResponse createBed(CreateBedRequest request);
    BedResponse getBedById(UUID bedId);
    List<BedResponse> getBedsByRoom(Integer roomId);
    List<BedResponse> getBedsByDepartment(Integer departmentId);
    BedResponse updateBedStatus(UUID bedId, BedStatus status);

    // 2. Điều chuyển giường/buồng (Bed Transfer Workflow)
    BedTransferResponse transferBed(UUID admissionId, BedTransferRequest request);
    List<BedTransferResponse> getBedTransfers(UUID admissionId);

    // 3. Tờ điều trị Bác sĩ hàng ngày (Doctor Progress Notes & Orders)
    DoctorOrderResponse addDoctorOrder(UUID admissionId, UUID doctorAccountId, DoctorOrderRequest request);
    List<DoctorOrderResponse> getDoctorOrders(UUID admissionId);

    // 4. Phiếu chăm sóc Điều dưỡng (Nursing Care & Vitals Sheet)
    NursingCareResponse addNursingCare(UUID admissionId, UUID nurseAccountId, NursingCareRequest request);
    List<NursingCareResponse> getNursingCares(UUID admissionId);
}
