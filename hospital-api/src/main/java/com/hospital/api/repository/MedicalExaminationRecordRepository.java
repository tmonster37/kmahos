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
    Optional<MedicalExaminationRecord> findByBooking_BookingId(UUID bookingId);
    List<MedicalExaminationRecord> findAllByPatientProfile_PatientProfileIdAndDeletedFalseOrderByCreatedAtDesc(UUID profileId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT m FROM MedicalExaminationRecord m WHERE m.recordId = :recordId")
    Optional<MedicalExaminationRecord> findByIdForUpdate(@org.springframework.data.repository.query.Param("recordId") UUID recordId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT m FROM MedicalExaminationRecord m WHERE m.booking.bookingCode = :bookingCode")
    Optional<MedicalExaminationRecord> findByBookingCodeForUpdate(@org.springframework.data.repository.query.Param("bookingCode") String bookingCode);
}

