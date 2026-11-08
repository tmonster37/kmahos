package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.dto.request.AdmitPatientRequest;
import com.hospital.api.dto.request.DailyRecordRequest;
import com.hospital.api.dto.request.DischargeRequest;
import com.hospital.api.entity.Discharge;
import com.hospital.api.entity.HospitalAdmission;
import com.hospital.api.entity.HospitalizationDetail;
import com.hospital.api.service.InpatientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.hospital.api.security.UserPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/inpatient")
@RequiredArgsConstructor
public class InpatientController {

    private final InpatientService inpatientService;

    @PostMapping("/admit")
    @PreAuthorize("hasAnyRole('DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<HospitalAdmission>> admitPatient(@Valid @RequestBody AdmitPatientRequest request) {
        HospitalAdmission admission = inpatientService.admitPatient(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(admission, "Làm thủ tục nhập viện thành công"));
    }

    @PostMapping("/{admissionId}/daily-record")
    @PreAuthorize("hasAnyRole('DOCTOR', 'HEAD_OF_DEPARTMENT', 'NURSE')")
    public ResponseEntity<ApiResponse<HospitalizationDetail>> addDailyRecord(
            @PathVariable UUID admissionId,
            @Valid @RequestBody DailyRecordRequest request) {
        HospitalizationDetail detail = inpatientService.addDailyRecord(admissionId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(detail, "Ghi nhật ký theo dõi thành công"));
    }

    @PostMapping("/{admissionId}/discharge")
    @PreAuthorize("hasAnyRole('DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<Discharge>> dischargePatient(
            @PathVariable UUID admissionId,
            @Valid @RequestBody DischargeRequest request) {
        Discharge discharge = inpatientService.dischargePatient(admissionId, request);
        return ResponseEntity.ok(ApiResponse.ok(discharge, "Làm thủ tục xuất viện thành công"));
    }

    private boolean checkIsStaff(UserPrincipal userPrincipal) {
        return userPrincipal != null && userPrincipal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().contains("ADMIN") ||
                               a.getAuthority().contains("DOCTOR") ||
                               a.getAuthority().contains("HEAD_OF_DEPARTMENT") ||
                               a.getAuthority().contains("NURSE") ||
                               a.getAuthority().contains("CASHIER") ||
                               a.getAuthority().contains("PHARMACIST") ||
                               a.getAuthority().contains("LAB_TECHNICIAN") ||
                               a.getAuthority().contains("STAFF"));
    }

    @GetMapping("/{admissionId}")
    public ResponseEntity<ApiResponse<HospitalAdmission>> getAdmissionById(
            @PathVariable UUID admissionId,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        boolean isStaff = checkIsStaff(userPrincipal);
        UUID currentUserId = userPrincipal != null ? userPrincipal.getId() : null;
        HospitalAdmission admission = inpatientService.getAdmissionById(admissionId, currentUserId, isStaff);
        return ResponseEntity.ok(ApiResponse.ok(admission, "Lấy thông tin nhập viện thành công"));
    }

    @GetMapping("/patient/{patientProfileId}")
    public ResponseEntity<ApiResponse<List<HospitalAdmission>>> getAdmissionsByPatient(
            @PathVariable UUID patientProfileId,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        boolean isStaff = checkIsStaff(userPrincipal);
        UUID currentUserId = userPrincipal != null ? userPrincipal.getId() : null;
        List<HospitalAdmission> admissions = inpatientService.getAdmissionsByPatient(patientProfileId, currentUserId, isStaff);
        return ResponseEntity.ok(ApiResponse.ok(admissions, "Lấy danh sách hồ sơ nhập viện của bệnh nhân thành công"));
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('DOCTOR', 'HEAD_OF_DEPARTMENT', 'NURSE', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<HospitalAdmission>>> getActiveAdmissions(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(required = false) Integer departmentId
    ) {
        boolean isAdmin = userPrincipal != null && userPrincipal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().contains("ADMIN"));
        UUID currentUserId = userPrincipal != null ? userPrincipal.getId() : null;
        List<HospitalAdmission> admissions = inpatientService.getActiveAdmissions(currentUserId, departmentId, isAdmin);
        return ResponseEntity.ok(ApiResponse.ok(admissions, "Lấy danh sách bệnh nhân đang nội trú thành công"));
    }

    @GetMapping("/{admissionId}/daily-records")
    public ResponseEntity<ApiResponse<List<HospitalizationDetail>>> getDailyRecords(
            @PathVariable UUID admissionId,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        boolean isStaff = checkIsStaff(userPrincipal);
        UUID currentUserId = userPrincipal != null ? userPrincipal.getId() : null;
        List<HospitalizationDetail> details = inpatientService.getDailyRecords(admissionId, currentUserId, isStaff);
        return ResponseEntity.ok(ApiResponse.ok(details, "Lấy danh sách nhật ký theo dõi thành công"));
    }

    @PostMapping("/beds")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    public ResponseEntity<ApiResponse<com.hospital.api.dto.response.BedResponse>> createBed(
            @Valid @RequestBody com.hospital.api.dto.request.CreateBedRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(inpatientService.createBed(request, userPrincipal), "Tạo giường bệnh thành công"));
    }

    @PutMapping("/beds/{bedId}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT', 'NURSE', 'DOCTOR')")
    public ResponseEntity<ApiResponse<com.hospital.api.dto.response.BedResponse>> updateBedStatus(
            @PathVariable UUID bedId,
            @RequestParam com.hospital.api.constant.BedStatus status,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(ApiResponse.ok(inpatientService.updateBedStatus(bedId, status, userPrincipal), "Cập nhật trạng thái giường thành công"));
    }

    @GetMapping("/beds")
    public ResponseEntity<ApiResponse<List<com.hospital.api.dto.response.BedResponse>>> getBedsByRoom(
            @RequestParam(required = false) Integer roomId) {
        return ResponseEntity.ok(ApiResponse.ok(inpatientService.getBedsByRoom(roomId), "Lấy danh sách giường theo buồng thành công"));
    }

    @GetMapping("/beds/department/{departmentId}")
    public ResponseEntity<ApiResponse<List<com.hospital.api.dto.response.BedResponse>>> getBedsByDepartment(
            @PathVariable Integer departmentId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(ApiResponse.ok(inpatientService.getBedsByDepartment(departmentId, userPrincipal), "Lấy danh sách giường theo khoa thành công"));
    }

    @GetMapping("/beds/{bedId}")
    public ResponseEntity<ApiResponse<com.hospital.api.dto.response.BedResponse>> getBedById(@PathVariable UUID bedId) {
        return ResponseEntity.ok(ApiResponse.ok(inpatientService.getBedById(bedId), "Lấy thông tin giường thành công"));
    }

    @PostMapping("/{admissionId}/transfer-bed")
    @PreAuthorize("hasAnyRole('DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<com.hospital.api.dto.response.BedTransferResponse>> transferBed(
            @PathVariable UUID admissionId,
            @Valid @RequestBody com.hospital.api.dto.request.BedTransferRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(inpatientService.transferBed(admissionId, request), "Điều chuyển giường bệnh nhân thành công"));
    }

    @RequestMapping(value = "/{admissionId}/transfer", method = {RequestMethod.PUT, RequestMethod.POST})
    @PreAuthorize("hasAnyRole('DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<HospitalAdmission>> transferRoom(
            @PathVariable UUID admissionId,
            @RequestParam Integer newRoomId) {
        return ResponseEntity.ok(ApiResponse.ok(inpatientService.transferRoom(admissionId, newRoomId), "Chuyển buồng bệnh nhân thành công"));
    }

    @GetMapping("/{admissionId}/transfers")
    public ResponseEntity<ApiResponse<List<com.hospital.api.dto.response.BedTransferResponse>>> getBedTransfers(
            @PathVariable UUID admissionId) {
        return ResponseEntity.ok(ApiResponse.ok(inpatientService.getBedTransfers(admissionId), "Lấy lịch sử điều chuyển giường thành công"));
    }

    @PostMapping("/{admissionId}/doctor-orders")
    @PreAuthorize("hasAnyRole('DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<com.hospital.api.dto.response.DoctorOrderResponse>> createDoctorOrder(
            @PathVariable UUID admissionId,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.hospital.api.security.UserPrincipal userPrincipal,
            @Valid @RequestBody com.hospital.api.dto.request.DoctorOrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(inpatientService.addDoctorOrder(admissionId, userPrincipal.getId(), request), "Thêm tờ điều trị bác sĩ thành công"));
    }

    @GetMapping("/{admissionId}/doctor-orders")
    public ResponseEntity<ApiResponse<List<com.hospital.api.dto.response.DoctorOrderResponse>>> getDoctorOrders(
            @PathVariable UUID admissionId) {
        return ResponseEntity.ok(ApiResponse.ok(inpatientService.getDoctorOrders(admissionId), "Lấy danh sách tờ điều trị bác sĩ thành công"));
    }

    @PostMapping("/{admissionId}/nursing-cares")
    @PreAuthorize("hasAnyRole('NURSE', 'HEAD_OF_DEPARTMENT', 'DOCTOR')")
    public ResponseEntity<ApiResponse<com.hospital.api.dto.response.NursingCareResponse>> createNursingCare(
            @PathVariable UUID admissionId,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.hospital.api.security.UserPrincipal userPrincipal,
            @Valid @RequestBody com.hospital.api.dto.request.NursingCareRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(inpatientService.addNursingCare(admissionId, userPrincipal.getId(), request), "Ghi phiếu chăm sóc điều dưỡng thành công"));
    }

    @GetMapping("/{admissionId}/nursing-cares")
    public ResponseEntity<ApiResponse<List<com.hospital.api.dto.response.NursingCareResponse>>> getNursingCares(
            @PathVariable UUID admissionId) {
        return ResponseEntity.ok(ApiResponse.ok(inpatientService.getNursingCares(admissionId), "Lấy danh sách phiếu chăm sóc điều dưỡng thành công"));
    }
}
