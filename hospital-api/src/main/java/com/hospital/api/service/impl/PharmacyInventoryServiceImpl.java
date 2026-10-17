package com.hospital.api.service.impl;

import com.hospital.api.constant.BatchStatus;
import com.hospital.api.constant.DispenseStatus;
import com.hospital.api.constant.StockTransferStatus;
import com.hospital.api.dto.request.*;
import com.hospital.api.dto.response.*;
import com.hospital.api.entity.*;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.*;
import com.hospital.api.service.PharmacyInventoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PharmacyInventoryServiceImpl implements PharmacyInventoryService {

    private final PharmacyWarehouseRepository warehouseRepository;
    private final MedicineBatchRepository batchRepository;
    private final WarehouseStockRepository stockRepository;
    private final StockTransferRepository transferRepository;
    private final StockTransferItemRepository transferItemRepository;
    private final PrescriptionDispenseRepository dispenseRepository;
    private final PrescriptionDispenseItemRepository dispenseItemRepository;
    private final MedicineRepository medicineRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final StaffRepository staffRepository;
    private final DepartmentRepository departmentRepository;
    private final TransactionRepository transactionRepository;
    private final com.hospital.api.service.AuditLogService auditLogService;

    // 1. Quản lý hệ thống Kho Dược đa cấp
    @Override
    @Transactional
    public WarehouseResponse createWarehouse(CreateWarehouseRequest request) {
        if (warehouseRepository.findByWarehouseCode(request.warehouseCode().trim()).isPresent()) {
            throw new AppException("Mã kho [" + request.warehouseCode() + "] đã tồn tại trong hệ thống", HttpStatus.BAD_REQUEST);
        }

        Department department = null;
        if (request.departmentId() != null) {
            department = departmentRepository.findById(request.departmentId()).orElse(null);
        }

        Staff manager = null;
        if (request.managerStaffId() != null) {
            manager = staffRepository.findById(request.managerStaffId()).orElse(null);
        }

        PharmacyWarehouse warehouse = PharmacyWarehouse.builder()
                .warehouseCode(request.warehouseCode().trim().toUpperCase())
                .warehouseName(request.warehouseName().trim())
                .warehouseType(request.warehouseType())
                .location(request.location())
                .department(department)
                .managerStaff(manager)
                .isActive(true)
                .build();

        return WarehouseResponse.fromEntity(warehouseRepository.save(warehouse));
    }

    @Override
    @Transactional(readOnly = true)
    public List<WarehouseResponse> getAllWarehouses() {
        return warehouseRepository.findAllByIsActiveTrue().stream()
                .map(WarehouseResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public WarehouseResponse getWarehouseById(UUID warehouseId) {
        PharmacyWarehouse w = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new AppException("Không tìm thấy kho dược với ID: " + warehouseId, HttpStatus.NOT_FOUND));
        return WarehouseResponse.fromEntity(w);
    }

    // 2. Nhập kho theo Lô & Hạn sử dụng (Goods Receipt)
    @Override
    @Transactional
    public WarehouseStockResponse receiveGoodsBatch(ReceiveGoodsBatchRequest request) {
        PharmacyWarehouse warehouse = warehouseRepository.findById(request.warehouseId())
                .orElseThrow(() -> new AppException("Không tìm thấy kho nhận hàng", HttpStatus.NOT_FOUND));

        Medicine medicine = medicineRepository.findById(request.medicineId())
                .orElseThrow(() -> new AppException("Không tìm thấy thuốc với ID: " + request.medicineId(), HttpStatus.NOT_FOUND));

        if (request.expiryDate().isBefore(LocalDate.now())) {
            throw new AppException("Hạn sử dụng của lô thuốc [" + request.expiryDate() + "] không được nhỏ hơn ngày hiện tại!", HttpStatus.BAD_REQUEST);
        }

        // Tìm hoặc tạo mới Lô thuốc (MedicineBatch)
        String batchNum = request.batchNumber().trim().toUpperCase();
        MedicineBatch batch = batchRepository.findByMedicineMedicineIdAndBatchNumber(medicine.getMedicineId(), batchNum)
                .orElseGet(() -> {
                    MedicineBatch newBatch = MedicineBatch.builder()
                            .medicine(medicine)
                            .batchNumber(batchNum)
                            .manufacturingDate(request.manufacturingDate())
                            .expiryDate(request.expiryDate())
                            .purchasePrice(request.purchasePrice())
                            .unitPrice(request.unitPrice() != null ? request.unitPrice() : medicine.getPrice())
                            .manufacturer(request.manufacturer())
                            .status(BatchStatus.ACTIVE)
                            .build();
                    return batchRepository.save(newBatch);
                });

        // Tìm hoặc tạo mới Tồn kho (WarehouseStock)
        WarehouseStock stock = stockRepository.findByWarehouseWarehouseIdAndBatchBatchId(warehouse.getWarehouseId(), batch.getBatchId())
                .orElseGet(() -> WarehouseStock.builder()
                        .warehouse(warehouse)
                        .medicine(medicine)
                        .batch(batch)
                        .quantityOnHand(0)
                        .quantityReserved(0)
                        .minimumThreshold(10)
                        .build());

        stock.setQuantityOnHand(stock.getQuantityOnHand() + request.quantity());
        WarehouseStock savedStock = stockRepository.save(stock);

        // Cập nhật tổng tồn kho trong Medicine để đảm bảo tương thích ngược
        medicine.setStockQuantity(medicine.getStockQuantity() + request.quantity());
        medicineRepository.save(medicine);

        log.info("Goods received: Warehouse={}, Medicine={}, Batch={}, Qty={}", warehouse.getWarehouseName(), medicine.getMedicineName(), batch.getBatchNumber(), request.quantity());
        return WarehouseStockResponse.fromEntity(savedStock);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WarehouseStockResponse> getStockByWarehouse(UUID warehouseId) {
        return stockRepository.findByWarehouseWarehouseId(warehouseId).stream()
                .map(WarehouseStockResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MedicineBatchResponse> getBatchesByMedicine(Integer medicineId) {
        if (medicineId == null) {
            return getAllBatches();
        }
        return batchRepository.findByMedicineMedicineIdOrderByExpiryDateAsc(medicineId).stream()
                .map(MedicineBatchResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MedicineBatchResponse> getAllBatches() {
        return batchRepository.findAll().stream()
                .map(MedicineBatchResponse::fromEntity)
                .toList();
    }

    // 3. Luân chuyển Kho nội bộ (Internal Stock Transfer)
    @Override
    @Transactional
    public StockTransferResponse createStockTransfer(UUID requestedStaffId, CreateStockTransferRequest request) {
        if (request.fromWarehouseId().equals(request.toWarehouseId())) {
            throw new AppException("Kho xuất và Kho nhận không được trùng nhau!", HttpStatus.BAD_REQUEST);
        }

        PharmacyWarehouse fromWh = warehouseRepository.findById(request.fromWarehouseId())
                .orElseThrow(() -> new AppException("Không tìm thấy kho xuất hàng", HttpStatus.NOT_FOUND));

        PharmacyWarehouse toWh = warehouseRepository.findById(request.toWarehouseId())
                .orElseThrow(() -> new AppException("Không tìm thấy kho nhận hàng", HttpStatus.NOT_FOUND));

        Staff staff = requestedStaffId != null ? staffRepository.findById(requestedStaffId).orElse(null) : null;

        String code = "TRF-" + LocalDate.now().toString().replace("-", "") + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        StockTransfer transfer = StockTransfer.builder()
                .transferCode(code)
                .fromWarehouse(fromWh)
                .toWarehouse(toWh)
                .status(StockTransferStatus.PENDING_APPROVAL)
                .requestedBy(staff)
                .transferDate(LocalDateTime.now())
                .reason(request.reason())
                .build();

        List<StockTransferItem> items = new ArrayList<>();
        for (var itemReq : request.items()) {
            Medicine medicine = medicineRepository.findById(itemReq.medicineId())
                    .orElseThrow(() -> new AppException("Không tìm thấy thuốc với ID: " + itemReq.medicineId(), HttpStatus.NOT_FOUND));

            MedicineBatch batch = batchRepository.findById(itemReq.batchId())
                    .orElseThrow(() -> new AppException("Không tìm thấy lô thuốc với ID: " + itemReq.batchId(), HttpStatus.NOT_FOUND));

            // Kiểm tra số lượng tồn kho khả dụng tại kho xuất
            WarehouseStock stock = stockRepository.findByWarehouseWarehouseIdAndBatchBatchId(fromWh.getWarehouseId(), batch.getBatchId())
                    .orElseThrow(() -> new AppException("Lô thuốc [" + batch.getBatchNumber() + "] không tồn tại tại kho xuất [" + fromWh.getWarehouseName() + "]", HttpStatus.BAD_REQUEST));

            if (stock.getAvailableQuantity() < itemReq.quantity()) {
                throw new AppException("Lô thuốc [" + batch.getBatchNumber() + "] tại kho xuất chỉ còn " + stock.getAvailableQuantity() + " khả dụng, không đủ điều chuyển " + itemReq.quantity(), HttpStatus.BAD_REQUEST);
            }

            // Đặt giữ chỗ số lượng để tránh bị xuất trùng
            stock.setQuantityReserved(stock.getQuantityReserved() + itemReq.quantity());
            stockRepository.save(stock);

            StockTransferItem item = StockTransferItem.builder()
                    .stockTransfer(transfer)
                    .medicine(medicine)
                    .batch(batch)
                    .quantity(itemReq.quantity())
                    .notes(itemReq.notes())
                    .build();
            items.add(item);
        }

        transfer.setItems(items);
        return StockTransferResponse.fromEntity(transferRepository.save(transfer));
    }

    @Override
    @Transactional
    public StockTransferResponse approveAndExecuteTransfer(UUID transferId, UUID approvedStaffId) {
        StockTransfer transfer = transferRepository.findById(transferId)
                .orElseThrow(() -> new AppException("Không tìm thấy phiếu điều chuyển với ID: " + transferId, HttpStatus.NOT_FOUND));

        if (transfer.getStatus() == StockTransferStatus.COMPLETED) {
            throw new AppException("Phiếu điều chuyển đã được hoàn tất trước đó!", HttpStatus.BAD_REQUEST);
        }

        Staff approvedStaff = approvedStaffId != null ? staffRepository.findById(approvedStaffId).orElse(null) : null;
        transfer.setApprovedBy(approvedStaff);

        PharmacyWarehouse fromWh = transfer.getFromWarehouse();
        PharmacyWarehouse toWh = transfer.getToWarehouse();

        // Thực thi chuyển kho: trừ kho xuất, cộng kho nhận
        for (StockTransferItem item : transfer.getItems()) {
            // Trừ kho xuất
            WarehouseStock sourceStock = stockRepository.findByWarehouseWarehouseIdAndBatchBatchId(fromWh.getWarehouseId(), item.getBatch().getBatchId())
                    .orElseThrow(() -> new AppException("Lỗi dữ liệu: Lô thuốc không tồn tại tại kho xuất", HttpStatus.INTERNAL_SERVER_ERROR));

            sourceStock.setQuantityOnHand(sourceStock.getQuantityOnHand() - item.getQuantity());
            sourceStock.setQuantityReserved(Math.max(0, sourceStock.getQuantityReserved() - item.getQuantity()));
            stockRepository.save(sourceStock);

            // Cộng kho nhận
            WarehouseStock targetStock = stockRepository.findByWarehouseWarehouseIdAndBatchBatchId(toWh.getWarehouseId(), item.getBatch().getBatchId())
                    .orElseGet(() -> WarehouseStock.builder()
                            .warehouse(toWh)
                            .medicine(item.getMedicine())
                            .batch(item.getBatch())
                            .quantityOnHand(0)
                            .quantityReserved(0)
                            .minimumThreshold(5)
                            .build());

            targetStock.setQuantityOnHand(targetStock.getQuantityOnHand() + item.getQuantity());
            stockRepository.save(targetStock);
        }

        transfer.setStatus(StockTransferStatus.COMPLETED);
        transfer.setTransferDate(LocalDateTime.now());
        return StockTransferResponse.fromEntity(transferRepository.save(transfer));
    }

    @Override
    @Transactional(readOnly = true)
    public List<StockTransferResponse> getTransfersByWarehouse(UUID warehouseId) {
        if (warehouseId == null) {
            return getAllStockTransfers();
        }
        List<StockTransfer> list = transferRepository.findByFromWarehouseWarehouseId(warehouseId);
        list.addAll(transferRepository.findByToWarehouseWarehouseId(warehouseId));
        return list.stream().map(StockTransferResponse::fromEntity).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<StockTransferResponse> getAllStockTransfers() {
        return transferRepository.findAll().stream()
                .map(StockTransferResponse::fromEntity)
                .toList();
    }

    // 4. Cấp phát thuốc theo đơn áp dụng THUẬT TOÁN FEFO (First Expired, First Out)
    @Override
    @Transactional
    public PrescriptionDispenseResponse dispensePrescription(UUID prescriptionId, DispensePrescriptionRequest request) {
        Prescription prescription = prescriptionRepository.findById(prescriptionId)
                .orElseThrow(() -> new AppException("Không tìm thấy đơn thuốc với ID: " + prescriptionId, HttpStatus.NOT_FOUND));

        // 1. Chống xuất kho lặp lại (Chống Double Dispense)
        List<PrescriptionDispense> existingDispenses = dispenseRepository.findByPrescriptionPrescriptionId(prescriptionId);
        if (!existingDispenses.isEmpty()) {
            throw new AppException("Đơn thuốc này đã được cấp phát trước đó (Mã phiếu xuất: "
                    + existingDispenses.get(0).getDispenseCode() + ") vào lúc "
                    + existingDispenses.get(0).getDispensedAt(), HttpStatus.BAD_REQUEST);
        }

        // 2. Chốt chặn Quầy Thu Ngân (Pharmacy Payment Gatekeeper - BIZ-P1-01)
        Booking booking = (prescription.getMedicalRecord() != null) ? prescription.getMedicalRecord().getBooking() : null;
        if (booking != null && !Boolean.TRUE.equals(booking.getIsPriority())) {
            String code = booking.getBookingCode();
            List<Transaction> txns = transactionRepository.findAllByDescriptionContainingAndStatus(code, "SUCCESS");
            BigDecimal totalPaid = txns.stream()
                    .map(Transaction::getAmount)
                    .filter(java.util.Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal examPrice = booking.getPrice() != null ? booking.getPrice() : BigDecimal.ZERO;
            BigDecimal prescPrice = prescription.getTotalAmount() != null ? prescription.getTotalAmount() : BigDecimal.ZERO;

            boolean hasPrescriptionTxn = txns.stream().anyMatch(t -> {
                String desc = t.getDescription() != null ? t.getDescription() : "";
                String ref = t.getVnpayTxnRef() != null ? t.getVnpayTxnRef() : "";
                return desc.contains("TREATMENT") || desc.contains("PRESCRIPTION") || desc.contains("MEDICINE") || ref.contains("MED");
            });

            if (!hasPrescriptionTxn && totalPaid.compareTo(examPrice.add(prescPrice)) < 0) {
                throw new AppException("Đơn thuốc [" + prescription.getPrescriptionCode() + "] chưa được thanh toán tiền thuốc tại quầy thu ngân! Vui lòng hướng dẫn bệnh nhân hoàn tất viện phí trước khi cấp phát.", HttpStatus.PAYMENT_REQUIRED);
            }
        }

        PharmacyWarehouse warehouse = warehouseRepository.findById(request.warehouseId())
                .orElseThrow(() -> new AppException("Không tìm thấy kho cấp phát thuốc", HttpStatus.NOT_FOUND));

        Staff dispenser = request.dispenserStaffId() != null ? staffRepository.findById(request.dispenserStaffId()).orElse(null) : null;

        String code = "DISP-" + LocalDate.now().toString().replace("-", "") + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        PrescriptionDispense dispense = PrescriptionDispense.builder()
                .dispenseCode(code)
                .prescription(prescription)
                .warehouse(warehouse)
                .status(DispenseStatus.DISPENSED)
                .dispensedBy(dispenser)
                .dispensedAt(LocalDateTime.now())
                .notes(request.notes())
                .build();

        List<PrescriptionDispenseItem> dispenseItems = new ArrayList<>();
        LocalDate today = LocalDate.now();

        // 3. Duyệt từng mặt hàng trong đơn thuốc để cấp phát theo FEFO có khóa bi quan PESSIMISTIC_WRITE
        for (PrescriptionItem prescItem : prescription.getPrescriptionItems()) {
            Medicine medicine = prescItem.getMedicine();
            int remainingNeeded = prescItem.getQuantity();

            // THUẬT TOÁN FEFO CÓ KHÓA BI QUAN: Tránh race-condition khi 2 dược sĩ cùng xuất cùng lô thuốc
            List<WarehouseStock> fefoStocks = stockRepository.findAvailableStockByFefoForUpdate(warehouse.getWarehouseId(), medicine.getMedicineId(), today);

            int totalAvailable = fefoStocks.stream().mapToInt(WarehouseStock::getAvailableQuantity).sum();
            if (totalAvailable < remainingNeeded) {
                throw new AppException("Kho [" + warehouse.getWarehouseName() + "] không đủ số lượng thuốc [" + medicine.getMedicineName() + "] để cấp phát! "
                        + "(Cần: " + remainingNeeded + ", Khả dụng FEFO: " + totalAvailable + ")", HttpStatus.BAD_REQUEST);
            }

            // Trừ dần theo từng lô có date gần nhất đến xa hơn
            for (WarehouseStock stock : fefoStocks) {
                if (remainingNeeded <= 0) break;

                int availableInBatch = stock.getAvailableQuantity();
                int takeFromThisBatch = Math.min(remainingNeeded, availableInBatch);

                // Trừ tồn kho lô này
                stock.setQuantityOnHand(stock.getQuantityOnHand() - takeFromThisBatch);
                stockRepository.save(stock);

                // Cập nhật tổng tồn kho Medicine
                medicine.setStockQuantity(Math.max(0, medicine.getStockQuantity() - takeFromThisBatch));
                medicineRepository.save(medicine);

                BigDecimal unitPrice = stock.getBatch().getUnitPrice() != null ? stock.getBatch().getUnitPrice() : medicine.getPrice();
                BigDecimal totalPrice = unitPrice.multiply(BigDecimal.valueOf(takeFromThisBatch));

                PrescriptionDispenseItem dispenseItem = PrescriptionDispenseItem.builder()
                        .prescriptionDispense(dispense)
                        .medicine(medicine)
                        .batch(stock.getBatch())
                        .batchNumber(stock.getBatch().getBatchNumber())
                        .expiryDate(stock.getBatch().getExpiryDate())
                        .quantityDispensed(takeFromThisBatch)
                        .unitPrice(unitPrice)
                        .totalPrice(totalPrice)
                        .build();

                dispenseItems.add(dispenseItem);
                remainingNeeded -= takeFromThisBatch;

                log.info("FEFO Dispensed: Medicine={}, Batch={}, Exp={}: Qty={}", medicine.getMedicineName(), stock.getBatch().getBatchNumber(), stock.getBatch().getExpiryDate(), takeFromThisBatch);
            }
        }

        dispense.setItems(dispenseItems);
        PrescriptionDispense savedDispense = dispenseRepository.save(dispense);

        // 4. Ghi Audit Log theo quy định y tế
        auditLogService.log(
                dispenser != null ? dispenser.getStaffId() : null,
                dispenser != null ? dispenser.getFullName() : "Dược Sĩ",
                "ROLE_PHARMACIST",
                "DISPENSE_PRESCRIPTION",
                "PRESCRIPTION_DISPENSE",
                savedDispense.getDispenseId().toString(),
                "Xuất kho FEFO đơn thuốc " + prescription.getPrescriptionCode() + " với " + dispenseItems.size() + " mặt hàng từ kho " + warehouse.getWarehouseName(),
                null
        );

        return PrescriptionDispenseResponse.fromEntity(savedDispense);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PrescriptionDispenseResponse> getDispensesByPrescription(UUID prescriptionId) {
        if (prescriptionId == null) {
            return getAllDispenses();
        }
        return dispenseRepository.findByPrescriptionPrescriptionId(prescriptionId).stream()
                .map(PrescriptionDispenseResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PrescriptionDispenseResponse> getAllDispenses() {
        return dispenseRepository.findAll().stream()
                .map(PrescriptionDispenseResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public PrescriptionDispenseResponse dispensePrescriptionByCodeOrId(String idOrCode, DispensePrescriptionRequest request) {
        if (idOrCode == null || idOrCode.trim().isEmpty()) {
            throw new AppException("Vui lòng cung cấp mã đơn thuốc", HttpStatus.BAD_REQUEST);
        }
        String trimmed = idOrCode.trim();
        UUID targetId;
        try {
            targetId = UUID.fromString(trimmed);
        } catch (IllegalArgumentException e) {
            Prescription p = prescriptionRepository.findByPrescriptionCode(trimmed)
                    .orElseThrow(() -> new AppException("Không tìm thấy đơn thuốc với mã: " + trimmed, HttpStatus.NOT_FOUND));
            targetId = p.getPrescriptionId();
        }
        return dispensePrescription(targetId, request);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PharmacyPrescriptionResponse> getPrescriptions(String status, String keyword) {
        List<Prescription> allPrescriptions = prescriptionRepository.findAll();
        List<PharmacyPrescriptionResponse> result = new ArrayList<>();
        String kw = (keyword != null && !keyword.trim().isEmpty()) ? keyword.trim().toLowerCase() : null;

        for (Prescription p : allPrescriptions) {
            var record = p.getMedicalRecord();
            var booking = record != null ? record.getBooking() : null;
            var patient = record != null ? record.getPatientProfile() : null;
            var doctor = booking != null ? booking.getDoctor() : null;
            var dept = (doctor != null && doctor.getDepartment() != null) ? doctor.getDepartment().getDepartmentName() : "Khoa Khám Bệnh";
            var doctorName = (doctor != null && doctor.getAccount() != null) ? doctor.getAccount().getFullName() : "Bác sĩ điều trị";

            List<PrescriptionDispense> dispenses = dispenseRepository.findByPrescriptionPrescriptionId(p.getPrescriptionId());
            boolean isDispensed = !dispenses.isEmpty();
            String dispenseCode = isDispensed ? dispenses.get(0).getDispenseCode() : null;

            // Kiểm tra trạng thái thanh toán viện phí
            boolean isPaid = false;
            if (booking != null) {
                if (Boolean.TRUE.equals(booking.getIsPriority())) {
                    isPaid = true;
                } else {
                    String code = booking.getBookingCode();
                    List<Transaction> txns = transactionRepository.findAllByDescriptionContainingAndStatus(code, "SUCCESS");
                    BigDecimal totalPaid = txns.stream()
                            .map(Transaction::getAmount)
                            .filter(Objects::nonNull)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    BigDecimal examPrice = booking.getPrice() != null ? booking.getPrice() : BigDecimal.ZERO;
                    BigDecimal prescPrice = p.getTotalAmount() != null ? p.getTotalAmount() : BigDecimal.ZERO;

                    boolean hasPrescriptionTxn = txns.stream().anyMatch(t -> {
                        String desc = t.getDescription() != null ? t.getDescription() : "";
                        String ref = t.getVnpayTxnRef() != null ? t.getVnpayTxnRef() : "";
                        return desc.contains("TREATMENT") || desc.contains("PRESCRIPTION") || desc.contains("MEDICINE") || ref.contains("MED");
                    });

                    isPaid = hasPrescriptionTxn || totalPaid.compareTo(examPrice.add(prescPrice)) >= 0;
                }
            }

            // Lọc theo status
            if ("PENDING".equalsIgnoreCase(status) && isDispensed) {
                continue;
            }
            if ("DISPENSED".equalsIgnoreCase(status) && !isDispensed) {
                continue;
            }
            if ("PAID".equalsIgnoreCase(status) && (!isPaid || isDispensed)) {
                continue;
            }

            String patientName = patient != null ? patient.getFullName() : "Khách hàng";
            String patientPhone = patient != null ? patient.getPhoneNumber() : "";
            String identityNum = (patient != null && patient.getIdentityNumber() != null) ? patient.getIdentityNumber() : "";
            String gender = (patient != null && patient.getGender() != null) ? patient.getGender().name() : "";
            String bookingCode = booking != null ? booking.getBookingCode() : "";
            String diagnosis = (record != null && record.getFinalDiagnosis() != null) ? record.getFinalDiagnosis() : "";

            // Lọc theo keyword
            if (kw != null) {
                boolean match = p.getPrescriptionCode().toLowerCase().contains(kw)
                        || bookingCode.toLowerCase().contains(kw)
                        || patientName.toLowerCase().contains(kw)
                        || patientPhone.contains(kw)
                        || identityNum.contains(kw)
                        || doctorName.toLowerCase().contains(kw);
                if (!match) {
                    continue;
                }
            }

            LocalDateTime prescribedAt = p.getCreatedAt() != null
                    ? LocalDateTime.ofInstant(p.getCreatedAt(), ZoneId.systemDefault())
                    : LocalDateTime.now();

            List<PharmacyPrescriptionResponse.PrescriptionItemDetail> itemDetails = p.getPrescriptionItems().stream()
                    .map(it -> new PharmacyPrescriptionResponse.PrescriptionItemDetail(
                            it.getMedicine() != null ? it.getMedicine().getMedicineId() : null,
                            it.getMedicine() != null ? it.getMedicine().getMedicineName() : "Thuốc",
                            it.getMedicine() != null ? it.getMedicine().getActiveIngredient() : "",
                            it.getMedicine() != null && it.getMedicine().getUnit() != null ? it.getMedicine().getUnit().name() : "Viên",
                            it.getQuantity(),
                            it.getUnitPrice(),
                            it.getTotalPrice(),
                            it.getMorningAmount(),
                            it.getNoonAmount(),
                            it.getAfternoonAmount(),
                            it.getEveningAmount(),
                            it.getDosageInstruction()
                    )).toList();

            result.add(new PharmacyPrescriptionResponse(
                    p.getPrescriptionId(),
                    p.getPrescriptionCode(),
                    bookingCode,
                    patientName,
                    patientPhone,
                    identityNum,
                    gender,
                    doctorName,
                    dept,
                    diagnosis,
                    p.getTotalAmount(),
                    p.getDoctorNotes(),
                    isPaid,
                    isDispensed,
                    dispenseCode,
                    prescribedAt,
                    itemDetails
            ));
        }

        // Sắp xếp đơn mới nhất lên đầu
        result.sort((a, b) -> {
            if (a.prescribedAt() == null || b.prescribedAt() == null) return 0;
            return b.prescribedAt().compareTo(a.prescribedAt());
        });

        return result;
    }

    // 5. Hệ thống Cảnh báo Dược
    @Override
    @Transactional(readOnly = true)
    public List<ExpiryAlertResponse> getNearExpiryAlerts(int daysAhead) {
        LocalDate today = LocalDate.now();
        LocalDate alertDate = today.plusDays(daysAhead > 0 ? daysAhead : 90);
        return batchRepository.findNearExpiryBatches(today, alertDate, BatchStatus.ACTIVE).stream()
                .map(b -> ExpiryAlertResponse.fromEntity(b, today))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<LowStockAlertResponse> getLowStockAlerts(UUID warehouseId) {
        if (warehouseId == null) {
            return stockRepository.findAllLowStockAlerts().stream()
                    .map(LowStockAlertResponse::fromEntity)
                    .toList();
        }
        return stockRepository.findLowStockAlerts(warehouseId).stream()
                .map(LowStockAlertResponse::fromEntity)
                .toList();
    }
}
