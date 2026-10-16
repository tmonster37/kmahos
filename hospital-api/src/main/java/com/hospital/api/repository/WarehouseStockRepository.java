package com.hospital.api.repository;

import com.hospital.api.entity.WarehouseStock;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WarehouseStockRepository extends JpaRepository<WarehouseStock, UUID> {

    Optional<WarehouseStock> findByWarehouseWarehouseIdAndBatchBatchId(UUID warehouseId, UUID batchId);

    List<WarehouseStock> findByWarehouseWarehouseId(UUID warehouseId);

    List<WarehouseStock> findByWarehouseWarehouseIdAndMedicineMedicineId(UUID warehouseId, Integer medicineId);

    // THUẬT TOÁN FEFO (First Expired, First Out):
    // Lấy danh sách tồn kho của thuốc tại 1 kho, lọc lô còn hạn, còn hàng khả dụng, sắp xếp hạn dùng gần nhất lên đầu
    @Query("""
        SELECT ws FROM WarehouseStock ws
        JOIN ws.batch b
        WHERE ws.warehouse.warehouseId = :warehouseId
          AND ws.medicine.medicineId = :medicineId
          AND (ws.quantityOnHand - ws.quantityReserved) > 0
          AND b.expiryDate > :currentDate
          AND b.status = com.hospital.api.constant.BatchStatus.ACTIVE
        ORDER BY b.expiryDate ASC, ws.quantityOnHand DESC
    """)
    List<WarehouseStock> findAvailableStockByFefo(
            @Param("warehouseId") UUID warehouseId,
            @Param("medicineId") Integer medicineId,
            @Param("currentDate") LocalDate currentDate
    );

    // FEFO có khóa bi quan PESSIMISTIC_WRITE chống tranh chấp đồng thời khi xuất kho (BIZ-P1-01)
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT ws FROM WarehouseStock ws
        JOIN ws.batch b
        WHERE ws.warehouse.warehouseId = :warehouseId
          AND ws.medicine.medicineId = :medicineId
          AND (ws.quantityOnHand - ws.quantityReserved) > 0
          AND b.expiryDate > :currentDate
          AND b.status = com.hospital.api.constant.BatchStatus.ACTIVE
        ORDER BY b.expiryDate ASC, ws.quantityOnHand DESC
    """)
    List<WarehouseStock> findAvailableStockByFefoForUpdate(
            @Param("warehouseId") UUID warehouseId,
            @Param("medicineId") Integer medicineId,
            @Param("currentDate") LocalDate currentDate
    );

    // Cảnh báo các mặt hàng tồn kho chạm hoặc dưới ngưỡng an toàn tối thiểu
    @Query("""
        SELECT ws FROM WarehouseStock ws
        WHERE ws.warehouse.warehouseId = :warehouseId
          AND ws.quantityOnHand <= ws.minimumThreshold
        ORDER BY ws.quantityOnHand ASC
    """)
    List<WarehouseStock> findLowStockAlerts(@Param("warehouseId") UUID warehouseId);

    // Cảnh báo trên toàn bộ các kho
    @Query("""
        SELECT ws FROM WarehouseStock ws
        WHERE ws.quantityOnHand <= ws.minimumThreshold
        ORDER BY ws.quantityOnHand ASC
    """)
    List<WarehouseStock> findAllLowStockAlerts();
}
