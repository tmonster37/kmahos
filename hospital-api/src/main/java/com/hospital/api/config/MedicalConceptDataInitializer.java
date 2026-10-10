package com.hospital.api.config;

import com.hospital.api.constant.ConceptDataType;
import com.hospital.api.entity.Department;
import com.hospital.api.entity.MedicalConcept;
import com.hospital.api.repository.DepartmentRepository;
import com.hospital.api.repository.MedicalConceptRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
@Order(2)
@RequiredArgsConstructor
@Slf4j
public class MedicalConceptDataInitializer implements CommandLineRunner {

    private final MedicalConceptRepository conceptRepository;
    private final DepartmentRepository departmentRepository;

    @Override
    public void run(String... args) {
        if (conceptRepository.count() > 0) {
            log.info("Medical Concept Dictionary already contains {} concepts. Skipping initialization.", conceptRepository.count());
            return;
        }

        log.info("Initializing Medical Concept Dictionary for EHR (OpenMRS & FHIR standards)...");
        List<Department> departments = departmentRepository.findAll();
        Department obgynDept = findDept(departments, "Sản", "Phụ sản");
        Department eyeDept = findDept(departments, "Mắt");
        Department pedsDept = findDept(departments, "Nhi");
        Department dentalDept = findDept(departments, "Răng", "Nha");

        // 1. Sinh hiệu chung (Vitals - áp dụng cho mọi khoa)
        createIfNotExist("VITAL_BP_SYS", "Huyết áp tâm thu", ConceptDataType.NUMERIC, "mmHg", "90", "120", null, "8480-6", "Huyết áp tâm thu lúc nghỉ");
        createIfNotExist("VITAL_BP_DIA", "Huyết áp tâm trương", ConceptDataType.NUMERIC, "mmHg", "60", "80", null, "8462-4", "Huyết áp tâm trương lúc nghỉ");
        createIfNotExist("VITAL_PULSE", "Mạch / Nhịp tim", ConceptDataType.NUMERIC, "bpm", "60", "100", null, "8867-4", "Tần số mạch đập mỗi phút");
        createIfNotExist("VITAL_TEMP", "Thân nhiệt", ConceptDataType.NUMERIC, "°C", "36.5", "37.5", null, "8310-5", "Nhiệt độ cơ thể đo tại nách/trán");
        createIfNotExist("VITAL_SPO2", "Độ bão hòa oxy SpO2", ConceptDataType.NUMERIC, "%", "95", "100", null, "2708-6", "Tỷ lệ bão hòa oxy mao mạch ngoại vi");
        createIfNotExist("VITAL_WEIGHT", "Cân nặng", ConceptDataType.NUMERIC, "kg", "40", "120", null, "29463-7", "Trọng lượng cơ thể");
        createIfNotExist("VITAL_HEIGHT", "Chiều cao", ConceptDataType.NUMERIC, "cm", "140", "200", null, "8302-2", "Chiều cao đứng");

        // 2. Khoa Sản (OBGYN)
        createIfNotExist("OB_GEST_AGE", "Tuần thai", ConceptDataType.NUMERIC, "tuần", "1", "42", obgynDept, "49051-6", "Tuổi thai tính theo siêu âm / ngày kinh cuối");
        createIfNotExist("OB_FETAL_HR", "Nhịp tim thai", ConceptDataType.NUMERIC, "bpm", "120", "160", obgynDept, "55283-6", "Tần số tim thai nghe qua doppler/siêu âm");
        createIfNotExist("OB_FUNDAL_HT", "Bề cao tử cung", ConceptDataType.NUMERIC, "cm", "10", "38", obgynDept, "11881-0", "Khoảng cách từ bờ trên xương mu đến đáy tử cung");
        createIfNotExist("OB_FETAL_MOV", "Cử động thai", ConceptDataType.BOOLEAN, null, null, null, obgynDept, null, "Cử động thai có xuất hiện bình thường không");
        createIfNotExist("OB_AMNIOTIC_FLUID", "Chỉ số ối (AFI)", ConceptDataType.NUMERIC, "cm", "5", "25", obgynDept, null, "Chỉ số lượng nước ối qua siêu âm");

        // 3. Khoa Mắt (Ophthalmology)
        createIfNotExist("EYE_VA_OD", "Thị lực Mắt Phải (OD)", ConceptDataType.TEXT, "10/10", null, null, eyeDept, "28631-0", "Thị lực mắt phải qua bảng kiểm tra Snellen");
        createIfNotExist("EYE_VA_OS", "Thị lực Mắt Trái (OS)", ConceptDataType.TEXT, "10/10", null, null, eyeDept, "28632-8", "Thị lực mắt trái qua bảng kiểm tra Snellen");
        createIfNotExist("EYE_IOP_OD", "Nhãn áp Mắt Phải (OD)", ConceptDataType.NUMERIC, "mmHg", "10", "21", eyeDept, "56844-4", "Áp lực nội nhãn mắt phải");
        createIfNotExist("EYE_IOP_OS", "Nhãn áp Mắt Trái (OS)", ConceptDataType.NUMERIC, "mmHg", "10", "21", eyeDept, "56845-1", "Áp lực nội nhãn mắt trái");
        createIfNotExist("EYE_CORNEA", "Tình trạng giác mạc", ConceptDataType.TEXT, null, null, null, eyeDept, null, "Mô tả trong suốt, xước, loét hoặc sẹo giác mạc");

        // 4. Khoa Nhi (Pediatrics)
        createIfNotExist("PED_WEIGHT", "Cân nặng trẻ em", ConceptDataType.NUMERIC, "kg", "2.5", "50", pedsDept, "29463-7", "Cân nặng trẻ em theo biểu đồ WHO");
        createIfNotExist("PED_HEIGHT", "Chiều cao trẻ em", ConceptDataType.NUMERIC, "cm", "45", "150", pedsDept, "8302-2", "Chiều cao hoặc chiều dài nằm của trẻ");
        createIfNotExist("PED_HEAD_CIRC", "Vòng đầu trẻ", ConceptDataType.NUMERIC, "cm", "32", "55", pedsDept, "9843-4", "Chu vi vòng đầu đánh giá phát triển não bộ");
        createIfNotExist("PED_FEEDING", "Tình trạng bú / dinh dưỡng", ConceptDataType.TEXT, null, null, null, pedsDept, null, "Bú mẹ hoàn toàn, sữa công thức hoặc ăn dặm");

        // 5. Khoa Răng Hàm Mặt (Dental)
        createIfNotExist("DENT_CARIES_LOC", "Vị trí răng sâu / hư tổn", ConceptDataType.TEXT, null, null, null, dentalDept, null, "Ký hiệu răng sâu theo sơ đồ số (VD: R16, R26, R37)");
        createIfNotExist("DENT_OCCLUSION", "Phân loại khớp cắn", ConceptDataType.TEXT, null, null, null, dentalDept, null, "Khớp cắn Angle hạng I, II, III");
        createIfNotExist("DENT_PERIODONTAL", "Tình trạng nướu / nha chu", ConceptDataType.TEXT, null, null, null, dentalDept, null, "Viêm nướu, tụt lợi, vôi răng dưới nướu");

        log.info("Medical Concept Dictionary initialized successfully with {} concepts.", conceptRepository.count());
    }

    private Department findDept(List<Department> list, String... keywords) {
        for (Department d : list) {
            for (String kw : keywords) {
                if (d.getDepartmentName() != null && d.getDepartmentName().toLowerCase().contains(kw.toLowerCase())) {
                    return d;
                }
            }
        }
        return null;
    }

    private void createIfNotExist(
            String code, String name, ConceptDataType type, String unit,
            String min, String max, Department dept, String loinc, String desc
    ) {
        if (conceptRepository.findByConceptCode(code).isPresent()) return;

        MedicalConcept c = MedicalConcept.builder()
                .conceptCode(code)
                .name(name)
                .dataType(type)
                .unit(unit)
                .minNormal(min != null ? new BigDecimal(min) : null)
                .maxNormal(max != null ? new BigDecimal(max) : null)
                .department(dept)
                .loincCode(loinc)
                .description(desc)
                .isActive(true)
                .build();
        conceptRepository.save(c);
    }
}
