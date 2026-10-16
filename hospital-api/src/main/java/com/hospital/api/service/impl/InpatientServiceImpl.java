package com.hospital.api.service.impl;

import com.hospital.api.constant.BedStatus;
import com.hospital.api.constant.HospitalAdmissionState;
import com.hospital.api.dto.request.*;
import com.hospital.api.dto.response.*;
import com.hospital.api.entity.*;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.*;
import com.hospital.api.service.InpatientService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InpatientServiceImpl implements InpatientService {

    private final HospitalAdmissionRepository admissionRepository;
    private final PatientProfileRepository profileRepository;
    private final DoctorRepository doctorRepository;
    private final RoomRepository roomRepository;
    private final HospitalizationDetailRepository detailRepository;
    private final DischargeRepository dischargeRepository;
    private final BedRepository bedRepository;
    private final InpatientBedTransferRepository transferRepository;
    private final InpatientDoctorOrderRepository doctorOrderRepository;
    private final InpatientNursingCareRepository nursingCareRepository;
    private final StaffRepository staffRepository;
    private final AccountRepository accountRepository;
    private final com.hospital.api.service.AuditLogService auditLogService;

    @Override
    @Transactional
    public HospitalAdmission admitPatient(AdmitPatientRequest request) {
        PatientProfile profile = profileRepository.findById(request.patientProfileId())
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ bệnh nhân", HttpStatus.NOT_FOUND));

        Doctor doctor = doctorRepository.findById(request.doctorId())
                .orElseThrow(() -> new AppException("Không tìm thấy bác sĩ", HttpStatus.NOT_FOUND));

        Room room = roomRepository.findById(request.roomId())
                .orElseGet(() -> roomRepository.findAll().stream().findFirst()
                        .orElseThrow(() -> new AppException("Không tìm thấy buồng bệnh phù hợp", HttpStatus.NOT_FOUND)));

        // Xử lý phân bổ giường bệnh có khóa bi quan PESSIMISTIC_WRITE (BIZ-P1-04)
        Bed assignedBed = null;
        if (request.bedId() != null) {
            assignedBed = bedRepository.findByIdForUpdate(request.bedId())
                    .orElseThrow(() -> new AppException("Không tìm thấy giường bệnh với ID: " + request.bedId(), HttpStatus.NOT_FOUND));
            if (assignedBed.getStatus() != BedStatus.AVAILABLE) {
                throw new AppException("Giường [" + assignedBed.getBedNumber() + "] hiện không khả dụng (Trạng thái: " + assignedBed.getStatus() + ")", HttpStatus.BAD_REQUEST);
            }
            assignedBed.setStatus(BedStatus.OCCUPIED);
            bedRepository.save(assignedBed);
        } else {
            // Tự động tìm giường trống đầu tiên trong buồng bệnh có khóa bi quan PESSIMISTIC_WRITE
            List<Bed> availableBeds = bedRepository.findByRoom_RoomIdAndStatusForUpdate(room.getRoomId(), BedStatus.AVAILABLE);
            if (!availableBeds.isEmpty()) {
                assignedBed = availableBeds.get(0);
                assignedBed.setStatus(BedStatus.OCCUPIED);
                bedRepository.save(assignedBed);
            }
        }

        HospitalAdmission admission = HospitalAdmission.builder()
                .admissionCode("HA-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .patientProfile(profile)
                .treatingDoctor(doctor)
                .room(room)
                .bed(assignedBed)
                .admissionDate(Instant.now())
                .initialDiagnosis(request.initialDiagnosis())
                .dailyRoomFee(BigDecimal.valueOf(300000))
                .state(HospitalAdmissionState.ADMITTED)
                .build();

        HospitalAdmission savedAdmission = admissionRepository.save(admission);

        // Ghi Audit Log tiếp nhận nội trú
        auditLogService.log(
                doctor.getAccount() != null ? doctor.getAccount().getUserId() : null,
                doctor.getAccount() != null ? doctor.getAccount().getFullName() : "Bác sĩ",
                "ROLE_DOCTOR",
                "ADMIT_INPATIENT",
                "HOSPITAL_ADMISSION",
                savedAdmission.getAdmissionId().toString(),
                "Tiếp nhận bệnh nhân " + profile.getFullName() + " vào nội trú buồng " + room.getRoomName()
                        + (assignedBed != null ? " - Giường " + assignedBed.getBedNumber() : ""),
                null
        );

        return savedAdmission;
    }

    @Override
    @Transactional
    public HospitalizationDetail addDailyRecord(UUID admissionId, DailyRecordRequest request) {
        HospitalAdmission admission = admissionRepository.findById(admissionId)
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ nhập viện", HttpStatus.NOT_FOUND));

        HospitalizationDetail detail = HospitalizationDetail.builder()
                .hospitalAdmission(admission)
                .logDate(LocalDate.now())
                .temperature(request.temperature())
                .bloodPressure(request.bloodPressure())
                .heartRate(request.heartRate())
                .diseaseProgression(request.diseaseProgression())
                .doctorInstruction(request.doctorInstruction())
                .build();

        return detailRepository.save(detail);
    }

    @Override
    @Transactional
    public Discharge dischargePatient(UUID admissionId, DischargeRequest request) {
        HospitalAdmission admission = admissionRepository.findById(admissionId)
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ nhập viện", HttpStatus.NOT_FOUND));

        Instant now = Instant.now();
        admission.setDischargeDate(now);
        admission.setState(HospitalAdmissionState.DISCHARGED);

        // Tính số ngày nằm viện (tối thiểu 1 ngày)
        long days = Math.max(1, Duration.between(admission.getAdmissionDate(), now).toDays());
        BigDecimal dailyFee = admission.getDailyRoomFee() != null ? admission.getDailyRoomFee() : BigDecimal.valueOf(300000);
        BigDecimal totalCost = dailyFee.multiply(BigDecimal.valueOf(days));

        Discharge discharge = Discharge.builder()
                .hospitalAdmission(admission)
                .dischargeDate(now)
                .dischargeSummary(request.dischargeSummary())
                .doctorRecommendation(request.doctorRecommendation())
                .reExaminationDate(request.reExaminationDate())
                .totalDays((int) days)
                .totalInpatientCost(totalCost)
                .build();

        // Giải phóng giường bệnh khi xuất viện -> chuyển sang CLEANING (vệ sinh khử khuẩn)
        if (admission.getBed() != null) {
            Bed bed = admission.getBed();
            bed.setStatus(BedStatus.CLEANING);
            bedRepository.save(bed);
        }

        admissionRepository.save(admission);
        return dischargeRepository.save(discharge);
    }

    @Override
    @Transactional(readOnly = true)
    public HospitalAdmission getAdmissionById(UUID admissionId) {
        return getAdmissionById(admissionId, null, true);
    }

    @Override
    @Transactional(readOnly = true)
    public HospitalAdmission getAdmissionById(UUID admissionId, UUID currentUserId, boolean isStaff) {
        HospitalAdmission admission = admissionRepository.findById(admissionId)
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ nhập viện", HttpStatus.NOT_FOUND));

        if (!isStaff) {
            if (admission.getPatientProfile() == null
                    || admission.getPatientProfile().getAccount() == null
                    || !admission.getPatientProfile().getAccount().getUserId().equals(currentUserId)) {
                throw new AppException("Bạn không có quyền truy cập hồ sơ nhập viện này", HttpStatus.FORBIDDEN);
            }
        }

        return admission;
    }

    @Override
    @Transactional(readOnly = true)
    public List<HospitalAdmission> getAdmissionsByPatient(UUID patientProfileId) {
        return getAdmissionsByPatient(patientProfileId, null, true);
    }

    @Override
    @Transactional(readOnly = true)
    public List<HospitalAdmission> getAdmissionsByPatient(UUID patientProfileId, UUID currentUserId, boolean isStaff) {
        if (!isStaff) {
            PatientProfile profile = profileRepository.findById(patientProfileId)
                    .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ bệnh nhân", HttpStatus.NOT_FOUND));
            if (profile.getAccount() == null || !profile.getAccount().getUserId().equals(currentUserId)) {
                throw new AppException("Bạn không có quyền truy cập danh sách hồ sơ nhập viện của bệnh nhân khác", HttpStatus.FORBIDDEN);
            }
        }
        return admissionRepository.findAllByPatientProfile_PatientProfileId(patientProfileId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<HospitalAdmission> getActiveAdmissions() {
        return admissionRepository.findAllByState(HospitalAdmissionState.ADMITTED);
    }

    @Override
    @Transactional(readOnly = true)
    public List<HospitalizationDetail> getDailyRecords(UUID admissionId) {
        return getDailyRecords(admissionId, null, true);
    }

    @Override
    @Transactional(readOnly = true)
    public List<HospitalizationDetail> getDailyRecords(UUID admissionId, UUID currentUserId, boolean isStaff) {
        if (!isStaff) {
            HospitalAdmission admission = admissionRepository.findById(admissionId)
                    .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ nhập viện", HttpStatus.NOT_FOUND));
            if (admission.getPatientProfile() == null
                    || admission.getPatientProfile().getAccount() == null
                    || !admission.getPatientProfile().getAccount().getUserId().equals(currentUserId)) {
                throw new AppException("Bạn không có quyền xem nhật ký theo dõi của hồ sơ này", HttpStatus.FORBIDDEN);
            }
        }
        return detailRepository.findAllByHospitalAdmission_AdmissionIdOrderByLogDateDesc(admissionId);
    }

    @Override
    @Transactional
    public HospitalAdmission transferRoom(UUID admissionId, Integer newRoomId) {
        HospitalAdmission admission = admissionRepository.findById(admissionId)
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ nhập viện", HttpStatus.NOT_FOUND));

        Room newRoom = roomRepository.findById(newRoomId)
                .orElseThrow(() -> new AppException("Không tìm thấy phòng chuyển đến", HttpStatus.NOT_FOUND));

        admission.setRoom(newRoom);
        return admissionRepository.save(admission);
    }

    // 1. Quản lý Giường bệnh (Bed Allocation)
    @Override
    @Transactional
    public BedResponse createBed(CreateBedRequest request) {
        Room room = roomRepository.findById(request.roomId())
                .orElseThrow(() -> new AppException("Không tìm thấy buồng bệnh với ID: " + request.roomId(), HttpStatus.NOT_FOUND));

        Bed bed = Bed.builder()
                .room(room)
                .bedNumber(request.bedNumber().trim())
                .status(request.status() != null ? request.status() : BedStatus.AVAILABLE)
                .notes(request.notes())
                .build();

        return BedResponse.fromEntity(bedRepository.save(bed));
    }

    @Override
    @Transactional(readOnly = true)
    public BedResponse getBedById(UUID bedId) {
        Bed bed = bedRepository.findById(bedId)
                .orElseThrow(() -> new AppException("Không tìm thấy giường với ID: " + bedId, HttpStatus.NOT_FOUND));
        return BedResponse.fromEntity(bed);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BedResponse> getBedsByRoom(Integer roomId) {
        return bedRepository.findByRoom_RoomIdOrderByBedNumberAsc(roomId)
                .stream()
                .map(BedResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<BedResponse> getBedsByDepartment(Integer departmentId) {
        return bedRepository.findByRoom_Department_DepartmentIdOrderByRoom_RoomNameAscBedNumberAsc(departmentId)
                .stream()
                .map(BedResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public BedResponse updateBedStatus(UUID bedId, BedStatus status) {
        Bed bed = bedRepository.findById(bedId)
                .orElseThrow(() -> new AppException("Không tìm thấy giường với ID: " + bedId, HttpStatus.NOT_FOUND));
        bed.setStatus(status);
        return BedResponse.fromEntity(bedRepository.save(bed));
    }

    // 2. Điều chuyển buồng / giường (Bed Transfer Workflow)
    @Override
    @Transactional
    public BedTransferResponse transferBed(UUID admissionId, BedTransferRequest request) {
        HospitalAdmission admission = admissionRepository.findById(admissionId)
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ nhập viện", HttpStatus.NOT_FOUND));

        Bed toBed = bedRepository.findById(request.targetBedId())
                .orElseThrow(() -> new AppException("Không tìm thấy giường đích với ID: " + request.targetBedId(), HttpStatus.NOT_FOUND));

        if (toBed.getStatus() != BedStatus.AVAILABLE) {
            throw new AppException("Giường đích [" + toBed.getBedNumber() + "] hiện không khả dụng (Trạng thái: " + toBed.getStatus() + ")", HttpStatus.BAD_REQUEST);
        }

        Bed fromBed = admission.getBed();
        Room fromRoom = admission.getRoom();
        Room toRoom = toBed.getRoom();

        // Giải phóng giường cũ
        if (fromBed != null) {
            fromBed.setStatus(BedStatus.CLEANING);
            bedRepository.save(fromBed);
        }

        // Khóa giường mới
        toBed.setStatus(BedStatus.OCCUPIED);
        bedRepository.save(toBed);

        Doctor doctor = null;
        if (request.doctorId() != null) {
            doctor = doctorRepository.findById(request.doctorId()).orElse(null);
        } else {
            doctor = admission.getTreatingDoctor();
        }

        InpatientBedTransfer transfer = InpatientBedTransfer.builder()
                .hospitalAdmission(admission)
                .fromBed(fromBed)
                .toBed(toBed)
                .fromRoom(fromRoom)
                .toRoom(toRoom)
                .transferReason(request.transferReason())
                .orderedByDoctor(doctor)
                .transferredAt(Instant.now())
                .build();

        transferRepository.save(transfer);

        // Cập nhật vị trí hiện tại trong hồ sơ nhập viện
        admission.setBed(toBed);
        admission.setRoom(toRoom);
        admissionRepository.save(admission);

        return BedTransferResponse.fromEntity(transfer);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BedTransferResponse> getBedTransfers(UUID admissionId) {
        return transferRepository.findAllByHospitalAdmission_AdmissionIdOrderByTransferredAtDesc(admissionId)
                .stream()
                .map(BedTransferResponse::fromEntity)
                .toList();
    }

    // 3. Tờ điều trị Bác sĩ hàng ngày (Doctor Orders)
    @Override
    @Transactional
    public DoctorOrderResponse addDoctorOrder(UUID admissionId, UUID doctorAccountId, DoctorOrderRequest request) {
        HospitalAdmission admission = admissionRepository.findById(admissionId)
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ nhập viện", HttpStatus.NOT_FOUND));

        Doctor doctor = doctorRepository.findByAccount_UserId(doctorAccountId)
                .orElseGet(() -> admission.getTreatingDoctor());

        InpatientDoctorOrder order = InpatientDoctorOrder.builder()
                .hospitalAdmission(admission)
                .doctor(doctor)
                .orderDate(request.orderDate() != null ? request.orderDate() : LocalDate.now())
                .diseaseProgression(request.diseaseProgression())
                .doctorInstruction(request.doctorInstruction())
                .dietaryDiet(request.dietaryDiet())
                .careLevel(request.careLevel() != null ? request.careLevel() : com.hospital.api.constant.CareLevel.CAP_2)
                .build();

        return DoctorOrderResponse.fromEntity(doctorOrderRepository.save(order));
    }

    @Override
    @Transactional(readOnly = true)
    public List<DoctorOrderResponse> getDoctorOrders(UUID admissionId) {
        return doctorOrderRepository.findAllByHospitalAdmission_AdmissionIdOrderByOrderDateDesc(admissionId)
                .stream()
                .map(DoctorOrderResponse::fromEntity)
                .toList();
    }

    // 4. Phiếu chăm sóc Điều dưỡng (Nursing Care)
    @Override
    @Transactional
    public NursingCareResponse addNursingCare(UUID admissionId, UUID nurseAccountId, NursingCareRequest request) {
        HospitalAdmission admission = admissionRepository.findById(admissionId)
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ nhập viện", HttpStatus.NOT_FOUND));

        Staff nurse = null;
        if (nurseAccountId != null) {
            Account account = accountRepository.findById(nurseAccountId).orElse(null);
            if (account != null && account.getPhoneNumber() != null) {
                nurse = staffRepository.findByPhoneNumber(account.getPhoneNumber()).orElse(null);
            }
        }

        InpatientNursingCare care = InpatientNursingCare.builder()
                .hospitalAdmission(admission)
                .nurse(nurse)
                .careTime(request.careTime() != null ? request.careTime() : Instant.now())
                .temperature(request.temperature())
                .bloodPressure(request.bloodPressure())
                .pulse(request.pulse())
                .respiratoryRate(request.respiratoryRate())
                .spo2(request.spo2())
                .careLevel(request.careLevel() != null ? request.careLevel() : com.hospital.api.constant.CareLevel.CAP_2)
                .nursingNote(request.nursingNote())
                .medicationAdministered(request.medicationAdministered())
                .build();

        return NursingCareResponse.fromEntity(nursingCareRepository.save(care));
    }

    @Override
    @Transactional(readOnly = true)
    public List<NursingCareResponse> getNursingCares(UUID admissionId) {
        return nursingCareRepository.findAllByHospitalAdmission_AdmissionIdOrderByCareTimeDesc(admissionId)
                .stream()
                .map(NursingCareResponse::fromEntity)
                .toList();
    }
}
