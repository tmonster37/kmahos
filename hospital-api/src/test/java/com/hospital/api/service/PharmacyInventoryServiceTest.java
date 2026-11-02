package com.hospital.api.service;

import com.hospital.api.constant.DispenseStatus;
import com.hospital.api.constant.WarehouseType;
import com.hospital.api.dto.request.DispensePrescriptionRequest;
import com.hospital.api.dto.response.PrescriptionDispenseResponse;
import com.hospital.api.entity.*;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.*;
import com.hospital.api.service.impl.PharmacyInventoryServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PharmacyInventoryServiceTest {

    @Mock
    private PharmacyWarehouseRepository warehouseRepository;
    @Mock
    private MedicineBatchRepository batchRepository;
    @Mock
    private WarehouseStockRepository stockRepository;
    @Mock
    private StockTransferRepository transferRepository;
    @Mock
    private StockTransferItemRepository transferItemRepository;
    @Mock
    private PrescriptionDispenseRepository dispenseRepository;
    @Mock
    private PrescriptionDispenseItemRepository dispenseItemRepository;
    @Mock
    private MedicineRepository medicineRepository;
    @Mock
    private PrescriptionRepository prescriptionRepository;
    @Mock
    private StaffRepository staffRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private TransactionRepository transactionRepository;
    @Mock
    private AuditLogService auditLogService;

    private PharmacyInventoryServiceImpl pharmacyService;

    private PharmacyWarehouse testWarehouse;
    private Medicine testMedicine;
    private Prescription testPrescription;
    private Booking testBooking;
    private MedicalExaminationRecord testRecord;

    @BeforeEach
    void setUp() {
        pharmacyService = new PharmacyInventoryServiceImpl(
                warehouseRepository,
                batchRepository,
                stockRepository,
                transferRepository,
                transferItemRepository,
                dispenseRepository,
                dispenseItemRepository,
                medicineRepository,
                prescriptionRepository,
                staffRepository,
                departmentRepository,
                transactionRepository,
                auditLogService
        );

        testWarehouse = PharmacyWarehouse.builder()
                .warehouseId(UUID.randomUUID())
                .warehouseCode("WH_OUTPATIENT")
                .warehouseName("Nhà Thuốc Bệnh Viện")
                .warehouseType(WarehouseType.OUTPATIENT_PHARMACY)
                .build();

        testMedicine = Medicine.builder()
                .medicineId(100)
                .medicineName("Paracetamol 500mg")
                .price(BigDecimal.valueOf(2000))
                .stockQuantity(100)
                .build();

        testBooking = Booking.builder()
                .bookingId(UUID.randomUUID())
                .bookingCode("BK-20261102-001")
                .isPriority(true)
                .build();

        testRecord = MedicalExaminationRecord.builder()
                .recordId(UUID.randomUUID())
                .booking(testBooking)
                .build();

        testPrescription = Prescription.builder()
                .prescriptionId(UUID.randomUUID())
                .prescriptionCode("RX-20261102-001")
                .medicalRecord(testRecord)
                .totalAmount(BigDecimal.valueOf(20000))
                .prescriptionItems(new ArrayList<>())
                .build();
    }

    @Test
    @DisplayName("Dispense prescription successfully using FEFO algorithm with multiple batches")
    void dispensePrescription_fefo_success() {
        PrescriptionItem item = PrescriptionItem.builder()
                .prescriptionItemId(UUID.randomUUID())
                .prescription(testPrescription)
                .medicine(testMedicine)
                .quantity(5)
                .unitPrice(BigDecimal.valueOf(2000))
                .build();
        testPrescription.getPrescriptionItems().add(item);

        MedicineBatch batch1 = MedicineBatch.builder()
                .batchId(UUID.randomUUID())
                .batchNumber("BATCH-EARLY")
                .expiryDate(LocalDate.now().plusMonths(1))
                .unitPrice(BigDecimal.valueOf(2000))
                .build();
        WarehouseStock stock1 = WarehouseStock.builder()
                .stockId(UUID.randomUUID())
                .warehouse(testWarehouse)
                .medicine(testMedicine)
                .batch(batch1)
                .quantityOnHand(3)
                .quantityReserved(0)
                .build();

        MedicineBatch batch2 = MedicineBatch.builder()
                .batchId(UUID.randomUUID())
                .batchNumber("BATCH-LATE")
                .expiryDate(LocalDate.now().plusMonths(6))
                .unitPrice(BigDecimal.valueOf(2000))
                .build();
        WarehouseStock stock2 = WarehouseStock.builder()
                .stockId(UUID.randomUUID())
                .warehouse(testWarehouse)
                .medicine(testMedicine)
                .batch(batch2)
                .quantityOnHand(10)
                .quantityReserved(0)
                .build();

        DispensePrescriptionRequest request = new DispensePrescriptionRequest(
                testWarehouse.getWarehouseId(),
                null,
                "Cấp thuốc đúng liều lượng"
        );

        when(prescriptionRepository.findByIdWithLock(testPrescription.getPrescriptionId()))
                .thenReturn(Optional.of(testPrescription));
        when(dispenseRepository.findByPrescriptionPrescriptionId(testPrescription.getPrescriptionId()))
                .thenReturn(List.of());
        when(warehouseRepository.findById(testWarehouse.getWarehouseId()))
                .thenReturn(Optional.of(testWarehouse));
        when(stockRepository.findAvailableStockByFefoForUpdate(eq(testWarehouse.getWarehouseId()), eq(testMedicine.getMedicineId()), any(LocalDate.class)))
                .thenReturn(List.of(stock1, stock2));
        when(dispenseRepository.save(any(PrescriptionDispense.class)))
                .thenAnswer(invocation -> {
                    PrescriptionDispense d = invocation.getArgument(0);
                    d.setDispenseId(UUID.randomUUID());
                    return d;
                });

        PrescriptionDispenseResponse response = pharmacyService.dispensePrescription(testPrescription.getPrescriptionId(), request);

        assertNotNull(response);
        assertEquals(DispenseStatus.DISPENSED, response.status());

        assertEquals(0, stock1.getQuantityOnHand());
        assertEquals(8, stock2.getQuantityOnHand());

        assertTrue(testPrescription.getIsPaid());
        verify(stockRepository, times(2)).save(any(WarehouseStock.class));
        verify(dispenseRepository).save(any(PrescriptionDispense.class));
    }

    @Test
    @DisplayName("Dispense prescription throws AppException when stock is insufficient")
    void dispensePrescription_insufficientStock_throwsAppException() {
        PrescriptionItem item = PrescriptionItem.builder()
                .prescriptionItemId(UUID.randomUUID())
                .prescription(testPrescription)
                .medicine(testMedicine)
                .quantity(15)
                .build();
        testPrescription.getPrescriptionItems().add(item);

        MedicineBatch batch1 = MedicineBatch.builder()
                .batchId(UUID.randomUUID())
                .batchNumber("BATCH-01")
                .expiryDate(LocalDate.now().plusMonths(1))
                .build();
        WarehouseStock stock1 = WarehouseStock.builder()
                .stockId(UUID.randomUUID())
                .warehouse(testWarehouse)
                .medicine(testMedicine)
                .batch(batch1)
                .quantityOnHand(5)
                .quantityReserved(0)
                .build();

        DispensePrescriptionRequest request = new DispensePrescriptionRequest(
                testWarehouse.getWarehouseId(),
                null,
                "Ghi chú"
        );

        when(prescriptionRepository.findByIdWithLock(testPrescription.getPrescriptionId()))
                .thenReturn(Optional.of(testPrescription));
        when(dispenseRepository.findByPrescriptionPrescriptionId(testPrescription.getPrescriptionId()))
                .thenReturn(List.of());
        when(warehouseRepository.findById(testWarehouse.getWarehouseId()))
                .thenReturn(Optional.of(testWarehouse));
        when(stockRepository.findAvailableStockByFefoForUpdate(eq(testWarehouse.getWarehouseId()), eq(testMedicine.getMedicineId()), any(LocalDate.class)))
                .thenReturn(List.of(stock1));

        AppException ex = assertThrows(AppException.class, () -> pharmacyService.dispensePrescription(testPrescription.getPrescriptionId(), request));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().contains("không đủ số lượng thuốc"));
    }

    @Test
    @DisplayName("Dispense prescription throws AppException on double dispensing attempt")
    void dispensePrescription_doubleDispense_throwsAppException() {
        PrescriptionDispense existingDispense = PrescriptionDispense.builder()
                .dispenseId(UUID.randomUUID())
                .dispenseCode("DISP-EXISTING-001")
                .status(DispenseStatus.DISPENSED)
                .build();

        DispensePrescriptionRequest request = new DispensePrescriptionRequest(
                testWarehouse.getWarehouseId(),
                null,
                "Ghi chú"
        );

        when(prescriptionRepository.findByIdWithLock(testPrescription.getPrescriptionId()))
                .thenReturn(Optional.of(testPrescription));
        when(dispenseRepository.findByPrescriptionPrescriptionId(testPrescription.getPrescriptionId()))
                .thenReturn(List.of(existingDispense));

        AppException ex = assertThrows(AppException.class, () -> pharmacyService.dispensePrescription(testPrescription.getPrescriptionId(), request));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().contains("đã được cấp phát trước đó"));
    }
}
