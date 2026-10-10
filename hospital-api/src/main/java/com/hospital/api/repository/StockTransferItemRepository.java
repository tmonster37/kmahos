package com.hospital.api.repository;

import com.hospital.api.entity.StockTransferItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StockTransferItemRepository extends JpaRepository<StockTransferItem, UUID> {
    List<StockTransferItem> findByStockTransferTransferId(UUID transferId);
}
