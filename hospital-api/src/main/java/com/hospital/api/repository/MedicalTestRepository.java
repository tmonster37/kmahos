package com.hospital.api.repository;

import com.hospital.api.constant.MedicalTestState;
import com.hospital.api.entity.MedicalTest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MedicalTestRepository extends JpaRepository<MedicalTest, UUID> {
    Optional<MedicalTest> findByTestCode(String testCode);
    Optional<MedicalTest> findByAccessionNumber(String accessionNumber);
    Optional<MedicalTest> findBySpecimenBarcode(String specimenBarcode);
    List<MedicalTest> findAllByMedicalRecord_RecordId(UUID recordId);
    List<MedicalTest> findAllByDeletedFalseOrderByCreatedAtDesc();
    List<MedicalTest> findAllByStateAndDeletedFalseOrderByCreatedAtDesc(MedicalTestState state);
}

