package com.hospital.api.repository;

import com.hospital.api.entity.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    Optional<Transaction> findByVnpayTxnRef(String vnpayTxnRef);
    Optional<Transaction> findByOrderCode(Long orderCode);
    boolean existsByOrderCode(Long orderCode);
    Optional<Transaction> findFirstByDescriptionContainingAndStatusOrderByCreatedAtDesc(String description, String status);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM Transaction t WHERE t.vnpayTxnRef = :reference")
    Optional<Transaction> findByVnpayTxnRefForUpdate(@Param("reference") String reference);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM Transaction t WHERE t.orderCode = :orderCode")
    Optional<Transaction> findByOrderCodeForUpdate(@Param("orderCode") Long orderCode);

    boolean existsByVnpayTxnRef(String vnpayTxnRef);
    boolean existsByVnpayTxnRefStartingWithAndStatus(String prefix, String status);
    boolean existsByDescriptionContainingAndStatus(String description, String status);
    boolean existsByMedicalTest_MedicalTestIdAndStatus(UUID medicalTestId, String status);
    boolean existsByPrescription_PrescriptionIdAndStatus(UUID prescriptionId, String status);
    boolean existsByHospitalAdmission_AdmissionIdAndStatus(UUID admissionId, String status);
    boolean existsByDischarge_DischargeIdAndStatus(UUID dischargeId, String status);
    List<Transaction> findAllByBooking_BookingIdAndStatus(UUID bookingId, String status);
    List<Transaction> findAllByHospitalAdmission_AdmissionIdAndStatus(UUID admissionId, String status);
    List<Transaction> findAllByDescriptionContainingAndStatus(String description, String status);
    List<Transaction> findAllByAccount_UserIdOrderByCreatedAtDesc(UUID accountId);
    Page<Transaction> findAllByAccount_UserIdOrderByCreatedAtDesc(UUID accountId, Pageable pageable);
    List<Transaction> findAllByOrderByCreatedAtDesc();
    Page<Transaction> findAllByOrderByCreatedAtDesc(Pageable pageable);
    List<Transaction> findAllByStatus(String status);
    List<Transaction> findAllByStatusAndCreatedAtBetween(String status, Instant start, Instant end);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.status = 'SUCCESS' AND t.createdAt >= :start AND t.createdAt <= :end")
    BigDecimal sumSuccessfulAmountBetween(@Param("start") Instant start, @Param("end") Instant end);
}
