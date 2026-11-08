package com.hospital.api.config;

import com.hospital.api.constant.BedStatus;
import com.hospital.api.constant.CareLevel;
import com.hospital.api.constant.ConceptDataType;
import com.hospital.api.constant.MedicalTestState;
import com.hospital.api.constant.TestResultFlag;
import com.hospital.api.entity.*;
import com.hospital.api.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Component
@Profile("!prod & !production")
@Order(3)
@RequiredArgsConstructor
@Slf4j
public class InpatientAndLabDataInitializer implements CommandLineRunner {

    private final RoomRepository roomRepository;
    private final BedRepository bedRepository;
    private final HospitalAdmissionRepository admissionRepository;
    private final InpatientDoctorOrderRepository doctorOrderRepository;
    private final InpatientNursingCareRepository nursingCareRepository;
    private final MedicalConceptRepository conceptRepository;
    private final MedicalTestRepository medicalTestRepository;
    private final DoctorRepository doctorRepository;
    private final StaffRepository staffRepository;

    @Value("${app.seed-demo-data:false}")
    private boolean seedDemoData;

    public void setSeedDemoData(boolean seedDemoData) {
        this.seedDemoData = seedDemoData;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!seedDemoData) {
            log.info("Skipping Inpatient (IPD) and Laboratory (LIS) demo data seeding (app.seed-demo-data=false).");
            return;
        }

        log.info("Starting Inpatient (IPD) and Laboratory (LIS) data initialization...");

        // 1. Khởi tạo giường bệnh cho các buồng bệnh
        seedBedsForRooms();

        // 2. Khởi tạo Concept xét nghiệm LIS chuẩn Open Hospital & LOINC
        seedLabConcepts();

        // 3. Khởi tạo dữ liệu mẫu cho hồ sơ nội trú (nếu có)
        seedInpatientClinicalData();

        // 4. Khởi tạo dữ liệu mẫu cho các chỉ định xét nghiệm (nếu có)
        seedLabTestData();

        log.info("Inpatient and Laboratory data initialization completed successfully.");
    }

    private void seedBedsForRooms() {
        List<Room> rooms = roomRepository.findAll();
        int totalBedsCreated = 0;

        for (Room room : rooms) {
            long existingBeds = bedRepository.countByRoom_RoomId(room.getRoomId());
            if (existingBeds == 0) {
                int bedCount = 4; // Mặc định mỗi buồng tạo 4 giường
                for (int i = 1; i <= bedCount; i++) {
                    String bedNumber = "G-" + String.format("%02d", i);
                    Bed bed = Bed.builder()
                            .room(room)
                            .bedNumber(bedNumber)
                            .status(BedStatus.AVAILABLE)
                            .notes("Giường tiêu chuẩn buồng " + room.getRoomName())
                            .build();
                    bedRepository.save(bed);
                    totalBedsCreated++;
                }
            }
        }

        if (totalBedsCreated > 0) {
            log.info("Created {} inpatient beds across {} rooms.", totalBedsCreated, rooms.size());
        }
    }

    private void seedLabConcepts() {
        createLabConcept("WBC", "Bạch cầu (White Blood Cells)", ConceptDataType.NUMERIC, "G/L", "4.0", "10.0", "6690-2", "Số lượng bạch cầu trong máu ngoại vi");
        createLabConcept("RBC", "Hồng cầu (Red Blood Cells)", ConceptDataType.NUMERIC, "T/L", "3.8", "5.5", "789-8", "Số lượng hồng cầu trong máu");
        createLabConcept("HGB", "Hemoglobin (Huyết sắc tố)", ConceptDataType.NUMERIC, "g/dL", "12.0", "16.5", "718-7", "Lượng huyết sắc tố trong hồng cầu");
        createLabConcept("HCT", "Hematocrit (Thể tích khối hồng cầu)", ConceptDataType.NUMERIC, "%", "35.0", "48.0", "4544-3", "Tỷ lệ thể tích hồng cầu trên thể tích máu toàn phần");
        createLabConcept("PLT", "Tiểu cầu (Platelet Count)", ConceptDataType.NUMERIC, "G/L", "150", "450", "777-3", "Số lượng tiểu cầu tham gia đông máu");

        createLabConcept("GLUCOSE", "Đường huyết đói (Fasting Glucose)", ConceptDataType.NUMERIC, "mmol/L", "3.9", "6.4", "2345-7", "Nồng độ glucose máu lúc đói");
        createLabConcept("UREA", "Ure máu (Blood Urea)", ConceptDataType.NUMERIC, "mmol/L", "2.5", "7.5", "3094-0", "Nồng độ ure máu đánh giá chức năng thận");
        createLabConcept("CREATININE", "Creatinine huyết thanh", ConceptDataType.NUMERIC, "µmol/L", "53", "106", "2160-0", "Chỉ số đánh giá độ lọc cầu thận");
        createLabConcept("ALT", "Men gan ALT (GPT)", ConceptDataType.NUMERIC, "U/L", "0", "45", "1742-6", "Enzyme alanine aminotransferase trong tế bào gan");
        createLabConcept("AST", "Men gan AST (GOT)", ConceptDataType.NUMERIC, "U/L", "0", "40", "1920-8", "Enzyme aspartate aminotransferase");
        createLabConcept("CHOLESTEROL", "Cholesterol toàn phần", ConceptDataType.NUMERIC, "mmol/L", "2.6", "5.2", "2093-3", "Nồng độ mỡ máu toàn phần");
        createLabConcept("TRIGLYCERIDE", "Triglyceride huyết thanh", ConceptDataType.NUMERIC, "mmol/L", "0.4", "1.7", "2571-8", "Chỉ số chất béo trung tính trong máu");
    }

    private void createLabConcept(String code, String name, ConceptDataType type, String unit, String min, String max, String loinc, String desc) {
        if (conceptRepository.findByConceptCode(code).isPresent()) return;

        MedicalConcept concept = MedicalConcept.builder()
                .conceptCode(code)
                .name(name)
                .dataType(type)
                .unit(unit)
                .minNormal(min != null ? new BigDecimal(min) : null)
                .maxNormal(max != null ? new BigDecimal(max) : null)
                .loincCode(loinc)
                .description(desc)
                .isActive(true)
                .build();
        conceptRepository.save(concept);
    }

    private void seedInpatientClinicalData() {
        List<HospitalAdmission> admissions = admissionRepository.findAll();
        if (admissions.isEmpty()) return;

        Doctor sampleDoctor = doctorRepository.findAll().stream().findFirst().orElse(null);
        Staff sampleNurse = staffRepository.findAll().stream().findFirst().orElse(null);

        for (HospitalAdmission adm : admissions) {
            // Nếu bệnh nhân đang nội trú mà chưa có giường, gán 1 giường trống
            if (adm.getBed() == null && adm.getRoom() != null) {
                List<Bed> availableBeds = bedRepository.findByRoom_RoomIdAndStatus(adm.getRoom().getRoomId(), BedStatus.AVAILABLE);
                if (!availableBeds.isEmpty()) {
                    Bed bed = availableBeds.get(0);
                    bed.setStatus(BedStatus.OCCUPIED);
                    bedRepository.save(bed);
                    adm.setBed(bed);
                    admissionRepository.save(adm);
                }
            }

            // Tạo mẫu tờ điều trị bác sĩ nếu chưa có
            List<InpatientDoctorOrder> existingOrders = doctorOrderRepository.findAllByHospitalAdmission_AdmissionIdOrderByOrderDateDesc(adm.getAdmissionId());
            if (existingOrders.isEmpty() && sampleDoctor != null) {
                InpatientDoctorOrder order = InpatientDoctorOrder.builder()
                        .hospitalAdmission(adm)
                        .doctor(sampleDoctor)
                        .orderDate(java.time.LocalDate.now())
                        .diseaseProgression("Bệnh nhân tỉnh táo, tiếp xúc tốt. Vết mổ khô ráo, không sưng nề. Giảm đau đáng kể.")
                        .doctorInstruction("Ceftriaxone 1g x 02 lọ tiêm TMC chia 2 lần; Paracetamol 500mg uống 1 viên khi sốt/đau > 38.5C.")
                        .dietaryDiet("Cháo loãng dinh dưỡng, nhiều rau xanh, uống đủ 2 lít nước.")
                        .careLevel(CareLevel.CAP_2)
                        .build();
                doctorOrderRepository.save(order);
            }

            // Tạo mẫu phiếu chăm sóc điều dưỡng nếu chưa có
            List<InpatientNursingCare> existingCares = nursingCareRepository.findAllByHospitalAdmission_AdmissionIdOrderByCareTimeDesc(adm.getAdmissionId());
            if (existingCares.isEmpty() && sampleNurse != null) {
                InpatientNursingCare care = InpatientNursingCare.builder()
                        .hospitalAdmission(adm)
                        .nurse(sampleNurse)
                        .careTime(java.time.Instant.now().minusSeconds(7200))
                        .temperature(new BigDecimal("36.8"))
                        .bloodPressure("120/80")
                        .pulse(78)
                        .respiratoryRate(18)
                        .spo2(98)
                        .careLevel(CareLevel.CAP_2)
                        .nursingNote("Thực hiện thuốc đúng 5 đúng. Thay băng vô khuẩn vết mổ sạch. Bệnh nhân ăn uống được.")
                        .medicationAdministered("Đã tiêm Ceftriaxone 1g TMC lúc 08:00 sáng.")
                        .build();
                nursingCareRepository.save(care);
            }
        }
    }

    private void seedLabTestData() {
        List<MedicalTest> tests = medicalTestRepository.findAll();
        for (MedicalTest test : tests) {
            if (test.getSpecimenType() == null) {
                test.setSpecimenType("Máu toàn phần (EDTA)");
                test.setSpecimenBarcode("BAR-" + test.getTestCode());
                test.setSampleCollectedAt(LocalDateTime.now().minusHours(3));
            }

            // Nếu chưa có resultItems, bổ sung các chỉ số mẫu cho bài test
            if (test.getResultItems().isEmpty() && test.getState() == MedicalTestState.COMPLETED) {
                MedicalTestResultItem wbc = MedicalTestResultItem.builder()
                        .medicalTest(test)
                        .parameterCode("WBC")
                        .parameterName("Bạch cầu (White Blood Cells)")
                        .valueNumeric(new BigDecimal("7.5"))
                        .unit("G/L")
                        .referenceRange("4.0 - 10.0")
                        .flag(TestResultFlag.NORMAL)
                        .build();

                MedicalTestResultItem rbc = MedicalTestResultItem.builder()
                        .medicalTest(test)
                        .parameterCode("RBC")
                        .parameterName("Hồng cầu (Red Blood Cells)")
                        .valueNumeric(new BigDecimal("4.65"))
                        .unit("T/L")
                        .referenceRange("3.8 - 5.5")
                        .flag(TestResultFlag.NORMAL)
                        .build();

                MedicalTestResultItem hgb = MedicalTestResultItem.builder()
                        .medicalTest(test)
                        .parameterCode("HGB")
                        .parameterName("Hemoglobin")
                        .valueNumeric(new BigDecimal("14.2"))
                        .unit("g/dL")
                        .referenceRange("12.0 - 16.5")
                        .flag(TestResultFlag.NORMAL)
                        .build();

                MedicalTestResultItem plt = MedicalTestResultItem.builder()
                        .medicalTest(test)
                        .parameterCode("PLT")
                        .parameterName("Tiểu cầu")
                        .valueNumeric(new BigDecimal("260"))
                        .unit("G/L")
                        .referenceRange("150 - 450")
                        .flag(TestResultFlag.NORMAL)
                        .build();

                MedicalTestResultItem glucose = MedicalTestResultItem.builder()
                        .medicalTest(test)
                        .parameterCode("GLUCOSE")
                        .parameterName("Đường huyết đói")
                        .valueNumeric(new BigDecimal("5.4"))
                        .unit("mmol/L")
                        .referenceRange("3.9 - 6.4")
                        .flag(TestResultFlag.NORMAL)
                        .build();

                test.getResultItems().add(wbc);
                test.getResultItems().add(rbc);
                test.getResultItems().add(hgb);
                test.getResultItems().add(plt);
                test.getResultItems().add(glucose);

                medicalTestRepository.save(test);
            }
        }
    }
}
