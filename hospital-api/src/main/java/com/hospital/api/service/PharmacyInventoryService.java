package com.hospital.api.service;

import com.hospital.api.dto.request.*;
import com.hospital.api.dto.response.*;

import java.util.List;
import java.util.UUID;

public interface PharmacyInventoryService {

    // 1. Quản lý hệ thống Kho Dược đa cấp (Warehouse Management)
    WarehouseResponse createWarehouse(CreateWarehouseRequest request);
    List<WarehouseResponse> getAllWarehouses();
    WarehouseResponse getWarehouseById(UUID warehouseId);

    // 2. Nhập kho theo Lô & Hạn sử dụng (Goods Receipt / PO Ingestion)
    WarehouseStockResponse receiveGoodsBatch(ReceiveGoodsBatchRequest request);
    List<WarehouseStockResponse> getStockByWarehouse(UUID warehouseId);
    List<MedicineBatchResponse> getBatchesByMedicine(Integer medicineId);
    List<MedicineBatchResponse> getAllBatches();

    // 3. Luân chuyển Kho nội bộ (Internal Stock Transfer: Kho tổng -> Kho lẻ / Tủ trực)
    StockTransferResponse createStockTransfer(UUID requestedStaffId, CreateStockTransferRequest request);
    StockTransferResponse approveAndExecuteTransfer(UUID transferId, UUID approvedStaffId);
    List<StockTransferResponse> getTransfersByWarehouse(UUID warehouseId);
    List<StockTransferResponse> getAllStockTransfers();

    // 4. Cấp phát thuốc theo đơn áp dụng Thuật toán FEFO (First Expired, First Out)
    PrescriptionDispenseResponse dispensePrescription(UUID prescriptionId, DispensePrescriptionRequest request);
    PrescriptionDispenseResponse dispensePrescriptionByCodeOrId(String idOrCode, DispensePrescriptionRequest request);
    List<PrescriptionDispenseResponse> getDispensesByPrescription(UUID prescriptionId);
    List<PrescriptionDispenseResponse> getAllDispenses();
    List<PharmacyPrescriptionResponse> getPrescriptions(String status, String keyword);

    // 5. Hệ thống Cảnh báo Dược (Safety Alerts)
    List<ExpiryAlertResponse> getNearExpiryAlerts(int daysAhead);
    List<LowStockAlertResponse> getLowStockAlerts(UUID warehouseId);
}
