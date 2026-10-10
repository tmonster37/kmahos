package com.hospital.api.config;

import com.hospital.api.constant.BatchStatus;
import com.hospital.api.constant.WarehouseType;
import com.hospital.api.entity.*;
import com.hospital.api.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Component
@Order(4)
@RequiredArgsConstructor
@Slf4j
public class PharmacyAndGatewayDataInitializer implements CommandLineRunner {

    private final PharmacyWarehouseRepository warehouseRepository;
    private final MedicineRepository medicineRepository;
    private final MedicineBatchRepository batchRepository;
    private final WarehouseStockRepository stockRepository;
    private final MedicalTestRepository medicalTestRepository;
    private final DepartmentRepository departmentRepository;
    private final StaffRepository staffRepository;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Starting Pharmacy Multi-tier Inventory & Clinical Gateway (Bahmni) data initialization...");

        // 1. Khởi tạo 4 Kho Dược đa cấp chuẩn
        PharmacyWarehouse centralWh = createWarehouseIfNotExist(
                "WH_CENTRAL", "Kho Dược Tổng (Kho chẵn)", WarehouseType.CENTRAL_WAREHOUSE, "Tòa Nhà Dược - Tầng 1"
        );
        PharmacyWarehouse outpatientWh = createWarehouseIfNotExist(
                "WH_OUTPATIENT", "Nhà thuốc Bệnh viện (Kho lẻ ngoại trú)", WarehouseType.OUTPATIENT_PHARMACY, "Tòa Khám bệnh A - Tầng 1"
        );
        PharmacyWarehouse inpatientWh = createWarehouseIfNotExist(
                "WH_INPATIENT", "Kho Dược Nội trú (Cấp phát theo ngày)", WarehouseType.INPATIENT_PHARMACY, "Tòa Điều trị B - Tầng 2"
        );
        PharmacyWarehouse erCabinet = createWarehouseIfNotExist(
                "WH_ER_CABINET", "Tủ trực Cấp cứu Hồi sức (A1)", WarehouseType.DEPARTMENT_CABINET, "Khu Cấp cứu C - Phòng 101"
        );

        // 2. Khởi tạo Lô thuốc & Tồn kho FEFO
        seedBatchesAndStocks(centralWh, outpatientWh, inpatientWh, erCabinet);

        // 3. Khởi tạo mã Accession Number & Modality cho các ca chụp RIS/PACS
        seedRisPacsData();

        log.info("Pharmacy Inventory and Clinical Gateway initialization completed successfully.");
    }

    private PharmacyWarehouse createWarehouseIfNotExist(String code, String name, WarehouseType type, String location) {
        return warehouseRepository.findByWarehouseCode(code).orElseGet(() -> {
            PharmacyWarehouse wh = PharmacyWarehouse.builder()
                    .warehouseCode(code)
                    .warehouseName(name)
                    .warehouseType(type)
                    .location(location)
                    .isActive(true)
                    .build();
            return warehouseRepository.save(wh);
        });
    }

    private void seedBatchesAndStocks(
            PharmacyWarehouse centralWh,
            PharmacyWarehouse outpatientWh,
            PharmacyWarehouse inpatientWh,
            PharmacyWarehouse erCabinet
    ) {
        List<Medicine> medicines = medicineRepository.findAll();
        if (medicines.isEmpty()) return;

        LocalDate today = LocalDate.now();

        for (Medicine med : medicines) {
            String medCodePrefix = med.getMedicineName().replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
            if (medCodePrefix.length() > 6) {
                medCodePrefix = medCodePrefix.substring(0, 6);
            }

            // Lô 1: Date gần hơn (hết hạn sau 4 tháng) -> Sẽ được FEFO xuất trước
            String batchNum1 = "LOT-2026A-" + medCodePrefix;
            LocalDate exp1 = today.plusMonths(4);
            MedicineBatch batch1 = batchRepository.findByMedicineMedicineIdAndBatchNumber(med.getMedicineId(), batchNum1)
                    .orElseGet(() -> batchRepository.save(MedicineBatch.builder()
                            .medicine(med)
                            .batchNumber(batchNum1)
                            .manufacturingDate(today.minusMonths(8))
                            .expiryDate(exp1)
                            .purchasePrice(med.getPrice().multiply(new BigDecimal("0.75")))
                            .unitPrice(med.getPrice())
                            .manufacturer("Dược Hậu Giang (DHG Pharma)")
                            .status(BatchStatus.ACTIVE)
                            .build()));

            // Lô 2: Date xa hơn (hết hạn sau 18 tháng) -> Sẽ được FEFO xuất sau khi lô 1 cạn
            String batchNum2 = "LOT-2027B-" + medCodePrefix;
            LocalDate exp2 = today.plusMonths(18);
            MedicineBatch batch2 = batchRepository.findByMedicineMedicineIdAndBatchNumber(med.getMedicineId(), batchNum2)
                    .orElseGet(() -> batchRepository.save(MedicineBatch.builder()
                            .medicine(med)
                            .batchNumber(batchNum2)
                            .manufacturingDate(today.minusMonths(2))
                            .expiryDate(exp2)
                            .purchasePrice(med.getPrice().multiply(new BigDecimal("0.78")))
                            .unitPrice(med.getPrice())
                            .manufacturer("Sanofi-Aventis Việt Nam")
                            .status(BatchStatus.ACTIVE)
                            .build()));

            // Cập nhật tồn kho cho từng kho
            initStock(centralWh, med, batch1, 500, 50);
            initStock(centralWh, med, batch2, 1000, 50);

            initStock(outpatientWh, med, batch1, 80, 20); // Lô date gần trong kho ngoại trú
            initStock(outpatientWh, med, batch2, 200, 20); // Lô date xa trong kho ngoại trú

            initStock(inpatientWh, med, batch1, 60, 15);
            initStock(inpatientWh, med, batch2, 150, 15);

            initStock(erCabinet, med, batch1, 20, 5); // Tủ trực cơ số cấp cứu
        }
    }

    private void initStock(PharmacyWarehouse wh, Medicine med, MedicineBatch batch, int qty, int minThreshold) {
        if (stockRepository.findByWarehouseWarehouseIdAndBatchBatchId(wh.getWarehouseId(), batch.getBatchId()).isEmpty()) {
            WarehouseStock stock = WarehouseStock.builder()
                    .warehouse(wh)
                    .medicine(med)
                    .batch(batch)
                    .quantityOnHand(qty)
                    .quantityReserved(0)
                    .minimumThreshold(minThreshold)
                    .build();
            stockRepository.save(stock);
        }
    }

    private void seedRisPacsData() {
        List<MedicalTest> tests = medicalTestRepository.findAll();
        int accIndex = 1;
        for (MedicalTest t : tests) {
            String name = t.getMedicalService() != null ? t.getMedicalService().getServiceName().toLowerCase() : "";
            if (name.contains("x-quang") || name.contains("ct") || name.contains("mri") || name.contains("siêu âm")) {
                if (t.getAccessionNumber() == null) {
                    String acc;
                    do {
                        acc = "ACC-20261009-" + String.format("%04d", accIndex++);
                    } while (medicalTestRepository.findByAccessionNumber(acc).isPresent());
                    t.setAccessionNumber(acc);
                    if (name.contains("ct")) {
                        t.setModality("CT");
                    } else if (name.contains("mri") || name.contains("cộng hưởng từ")) {
                        t.setModality("MR");
                    } else if (name.contains("siêu âm")) {
                        t.setModality("US");
                    } else {
                        t.setModality("CR");
                    }

                    // Tạo sẵn link xem ảnh DICOM OHIF Viewer chuẩn mẫu
                    String studyUid = "1.2.840.113619.2.55.3.2831172836." + (1000 + accIndex);
                    t.setStudyInstanceUid(studyUid);
                    String viewerUrl = "https://pacs.duckhospital.vn/viewer?studyUID=" + studyUid;
                    t.setPacsViewerUrl(viewerUrl);
                    if (t.getResultFileUrl() == null) {
                        t.setResultFileUrl(viewerUrl);
                    }

                    medicalTestRepository.save(t);
                }
            }
        }
    }
}
