package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.dto.request.*;
import com.hospital.api.dto.response.*;
import com.hospital.api.security.UserPrincipal;
import com.hospital.api.service.PharmacyInventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/pharmacy")
@RequiredArgsConstructor
public class PharmacyInventoryController {

    private final PharmacyInventoryService inventoryService;

    // 1. Quản lý hệ thống Kho Dược
    @PostMapping("/warehouses")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    public ResponseEntity<ApiResponse<WarehouseResponse>> createWarehouse(
            @Valid @RequestBody CreateWarehouseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(inventoryService.createWarehouse(request), "Tạo kho dược thành công"));
    }

    @GetMapping("/warehouses")
    public ResponseEntity<ApiResponse<List<WarehouseResponse>>> getAllWarehouses() {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getAllWarehouses(), "Lấy danh sách kho dược thành công"));
    }

    @GetMapping("/warehouses/{warehouseId}")
    public ResponseEntity<ApiResponse<WarehouseResponse>> getWarehouseById(@PathVariable UUID warehouseId) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getWarehouseById(warehouseId), "Lấy thông tin kho dược thành công"));
    }

    // 2. Nhập kho theo Số lô & Hạn dùng (Goods Receipt)
    @PostMapping({"/goods-receipt", "/batches/receive-goods"})
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT', 'PHARMACIST')")
    public ResponseEntity<ApiResponse<WarehouseStockResponse>> receiveGoodsBatch(
            @Valid @RequestBody ReceiveGoodsBatchRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(inventoryService.receiveGoodsBatch(request), "Nhập kho theo số lô và hạn dùng thành công"));
    }

    @GetMapping("/warehouses/{warehouseId}/stock")
    public ResponseEntity<ApiResponse<List<WarehouseStockResponse>>> getStockByWarehouse(@PathVariable UUID warehouseId) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getStockByWarehouse(warehouseId), "Lấy danh mục tồn kho thành công"));
    }

    @GetMapping({"/medicines/{medicineId}/batches", "/batches"})
    public ResponseEntity<ApiResponse<List<MedicineBatchResponse>>> getBatches(
            @PathVariable(required = false) Integer medicineId,
            @RequestParam(required = false) Integer medId) {
        Integer targetId = medicineId != null ? medicineId : medId;
        List<MedicineBatchResponse> list = targetId != null
                ? inventoryService.getBatchesByMedicine(targetId)
                : inventoryService.getAllBatches();
        return ResponseEntity.ok(ApiResponse.ok(list, "Lấy danh sách lô thuốc thành công"));
    }

    // 3. Điều chuyển kho nội bộ (Kho tổng -> Kho lẻ / Tủ trực)
    @PostMapping("/transfers")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT', 'PHARMACIST', 'NURSE')")
    public ResponseEntity<ApiResponse<StockTransferResponse>> createStockTransfer(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody CreateStockTransferRequest request) {
        UUID staffId = userPrincipal != null ? userPrincipal.getId() : null;
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(inventoryService.createStockTransfer(staffId, request), "Tạo phiếu điều chuyển kho thành công"));
    }

    @RequestMapping(value = {"/transfers/{transferId}/approve", "/transfers/{transferId}/send"}, method = {RequestMethod.PUT, RequestMethod.POST})
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT', 'PHARMACIST', 'NURSE')")
    public ResponseEntity<ApiResponse<StockTransferResponse>> approveAndExecuteTransfer(
            @PathVariable UUID transferId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        UUID staffId = userPrincipal != null ? userPrincipal.getId() : null;
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.approveAndExecuteTransfer(transferId, staffId), "Xử lý điều chuyển kho thành công"));
    }

    @GetMapping("/transfers")
    public ResponseEntity<ApiResponse<List<StockTransferResponse>>> getTransfers(
            @RequestParam(required = false) UUID warehouseId) {
        List<StockTransferResponse> list = warehouseId != null
                ? inventoryService.getTransfersByWarehouse(warehouseId)
                : inventoryService.getAllStockTransfers();
        return ResponseEntity.ok(ApiResponse.ok(list, "Lấy danh sách phiếu điều chuyển kho thành công"));
    }

    // 4. Cấp phát thuốc theo đơn áp dụng Thuật toán FEFO (First Expired, First Out)
    @PostMapping("/prescriptions/{prescriptionId}/dispense")
    @PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN', 'HEAD_OF_DEPARTMENT', 'NURSE')")
    public ResponseEntity<ApiResponse<PrescriptionDispenseResponse>> dispensePrescription(
            @PathVariable UUID prescriptionId,
            @Valid @RequestBody DispensePrescriptionRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.dispensePrescription(prescriptionId, request), "Cấp phát thuốc theo đơn (FEFO) thành công"));
    }

    @GetMapping({"/prescriptions/{prescriptionId}/dispenses", "/dispenses"})
    public ResponseEntity<ApiResponse<List<PrescriptionDispenseResponse>>> getDispenses(
            @PathVariable(required = false) UUID prescriptionId,
            @RequestParam(required = false) UUID pId) {
        UUID targetId = prescriptionId != null ? prescriptionId : pId;
        List<PrescriptionDispenseResponse> list = targetId != null
                ? inventoryService.getDispensesByPrescription(targetId)
                : inventoryService.getAllDispenses();
        return ResponseEntity.ok(ApiResponse.ok(list, "Lấy lịch sử cấp phát đơn thuốc thành công"));
    }

    // 5. Cảnh báo Dược
    @GetMapping({"/alerts/near-expiry", "/alerts/expiring"})
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT', 'PHARMACIST')")
    public ResponseEntity<ApiResponse<List<ExpiryAlertResponse>>> getNearExpiryAlerts(
            @RequestParam(defaultValue = "90") int days) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getNearExpiryAlerts(days), "Lấy danh sách thuốc sắp hết hạn thành công"));
    }

    @GetMapping("/alerts/low-stock")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT', 'PHARMACIST', 'NURSE')")
    public ResponseEntity<ApiResponse<List<LowStockAlertResponse>>> getLowStockAlerts(
            @RequestParam(required = false) UUID warehouseId) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getLowStockAlerts(warehouseId), "Lấy danh sách cảnh báo tồn kho tối thiểu thành công"));
    }
}
