package com.hospital.api.service;

import com.hospital.api.constant.ConditionType;
import com.hospital.api.entity.MedicalCondition;
import com.hospital.api.entity.MedicalExaminationRecord;
import com.hospital.api.repository.MedicalConditionRepository;
import com.hospital.api.repository.MedicalExaminationRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EhrDataMigrationService {

    private final MedicalExaminationRecordRepository recordRepository;
    private final MedicalConditionRepository conditionRepository;

    @Transactional
    public Map<String, Object> migrateLegacyDiagnoses() {
        List<MedicalExaminationRecord> records = recordRepository.findAll();
        int migratedCount = 0;
        int skippedCount = 0;

        for (MedicalExaminationRecord record : records) {
            // Nếu đã có cấu trúc conditions rồi thì bỏ qua
            if (record.getMedicalConditions() != null && !record.getMedicalConditions().isEmpty()) {
                skippedCount++;
                continue;
            }

            String diagText = record.getFinalDiagnosis();
            if (diagText == null || diagText.isBlank()) {
                diagText = record.getInitialDiagnosis();
            }

            if (diagText == null || diagText.isBlank()) {
                skippedCount++;
                continue;
            }

            diagText = diagText.trim();
            String icd10 = detectIcd10Code(diagText);

            MedicalCondition cond = MedicalCondition.builder()
                    .medicalRecord(record)
                    .icd10Code(icd10)
                    .diseaseName(diagText)
                    .conditionType(ConditionType.PRIMARY)
                    .clinicalStatus("ACTIVE")
                    .notes("Tự động chuyển đổi từ dữ liệu chẩn đoán tự do của phiên bản cũ")
                    .build();

            conditionRepository.save(cond);
            record.getMedicalConditions().add(cond);
            recordRepository.save(record);
            migratedCount++;
        }

        log.info("Migrated {} legacy medical records to structured ICD-10 conditions (Skipped: {})", migratedCount, skippedCount);

        Map<String, Object> result = new HashMap<>();
        result.put("totalRecords", records.size());
        result.put("migratedCount", migratedCount);
        result.put("skippedCount", skippedCount);
        result.put("status", "SUCCESS");
        return result;
    }

    private String detectIcd10Code(String text) {
        String lower = text.toLowerCase();
        if (lower.contains("sâu răng") || lower.contains("nha")) return "K02";
        if (lower.contains("huyết áp")) return "I10";
        if (lower.contains("họng") || lower.contains("hô hấp")) return "J02";
        if (lower.contains("mắt") || lower.contains("cận thị")) return "H52.1";
        if (lower.contains("thai")) return "Z34";
        if (lower.contains("dạ dày") || lower.contains("tiêu hóa")) return "K29";
        if (lower.contains("sốt")) return "R50";
        return "R69"; // R69: Bệnh chưa xác định / tổng quát
    }
}
