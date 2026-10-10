package com.hospital.api.repository;

import com.hospital.api.constant.BatchStatus;
import com.hospital.api.entity.MedicineBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MedicineBatchRepository extends JpaRepository<MedicineBatch, UUID> {

    Optional<MedicineBatch> findByMedicineMedicineIdAndBatchNumber(Integer medicineId, String batchNumber);

    List<MedicineBatch> findByMedicineMedicineIdOrderByExpiryDateAsc(Integer medicineId);

    // Tìm các lô thuốc sắp hết hạn (trong vòng N ngày tới) còn hiệu lực
    @Query("SELECT b FROM MedicineBatch b WHERE b.expiryDate BETWEEN :today AND :alertDate AND b.status = :status ORDER BY b.expiryDate ASC")
    List<MedicineBatch> findNearExpiryBatches(@Param("today") LocalDate today, @Param("alertDate") LocalDate alertDate, @Param("status") BatchStatus status);

    // Tìm các lô thuốc đã quá hạn sử dụng
    @Query("SELECT b FROM MedicineBatch b WHERE b.expiryDate < :today ORDER BY b.expiryDate ASC")
    List<MedicineBatch> findExpiredBatches(@Param("today") LocalDate today);
}
