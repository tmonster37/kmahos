package com.hospital.api.repository;

import com.hospital.api.entity.MedicalExaminationRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MedicalExaminationRecordRepository extends JpaRepository<MedicalExaminationRecord, UUID> {
    Optional<MedicalExaminationRecord> findByBooking_BookingCode(String bookingCode);
    List<MedicalExaminationRecord> findAllByPatientProfile_PatientProfileIdAndDeletedFalseOrderByCreatedAtDesc(UUID profileId);
}

