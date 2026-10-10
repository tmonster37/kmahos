package com.hospital.api.repository;

import com.hospital.api.constant.StockTransferStatus;
import com.hospital.api.entity.StockTransfer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StockTransferRepository extends JpaRepository<StockTransfer, UUID> {
    Optional<StockTransfer> findByTransferCode(String transferCode);
    List<StockTransfer> findByFromWarehouseWarehouseId(UUID fromWarehouseId);
    List<StockTransfer> findByToWarehouseWarehouseId(UUID toWarehouseId);
    List<StockTransfer> findAllByStatusOrderByCreatedAtDesc(StockTransferStatus status);
}
