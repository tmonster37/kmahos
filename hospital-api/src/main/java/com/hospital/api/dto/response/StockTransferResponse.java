package com.hospital.api.dto.response;

import com.hospital.api.constant.StockTransferStatus;
import com.hospital.api.entity.StockTransfer;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

public record StockTransferResponse(
        UUID transferId,
        String transferCode,
        UUID fromWarehouseId,
        String fromWarehouseName,
        UUID toWarehouseId,
        String toWarehouseName,
        StockTransferStatus status,
        String requestedByName,
        String approvedByName,
        LocalDateTime transferDate,
        String reason,
        List<StockTransferItemResponse> items,
        LocalDateTime createdAt
) {
    public static StockTransferResponse fromEntity(StockTransfer t) {
        List<StockTransferItemResponse> itemList = t.getItems() != null
                ? t.getItems().stream().map(StockTransferItemResponse::fromEntity).toList()
                : Collections.emptyList();

        return new StockTransferResponse(
                t.getTransferId(),
                t.getTransferCode(),
                t.getFromWarehouse() != null ? t.getFromWarehouse().getWarehouseId() : null,
                t.getFromWarehouse() != null ? t.getFromWarehouse().getWarehouseName() : null,
                t.getToWarehouse() != null ? t.getToWarehouse().getWarehouseId() : null,
                t.getToWarehouse() != null ? t.getToWarehouse().getWarehouseName() : null,
                t.getStatus(),
                t.getRequestedBy() != null ? t.getRequestedBy().getFullName() : null,
                t.getApprovedBy() != null ? t.getApprovedBy().getFullName() : null,
                t.getTransferDate(),
                t.getReason(),
                itemList,
                t.getCreatedAt() != null ? LocalDateTime.ofInstant(t.getCreatedAt(), java.time.ZoneId.systemDefault()) : null
        );
    }
}
