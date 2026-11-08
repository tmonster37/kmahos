package com.hospital.api.entity;

import com.hospital.api.common.BaseEntity;
import com.hospital.api.constant.MedicalTestState;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "medical_tests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class MedicalTest extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "medical_test_id")
    private UUID medicalTestId;

    @Column(name = "test_code", unique = true, nullable = false, length = 30)
    private String testCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "record_id", nullable = false)
    @JsonIgnoreProperties({"medicalTests", "hibernateLazyInitializer", "handler"})
    private MedicalExaminationRecord medicalRecord;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private MedicalService medicalService;

    @Column(name = "price", precision = 12, scale = 2, nullable = false)
    private BigDecimal price;

    @Column(name = "is_paid", nullable = false)
    @Builder.Default
    private Boolean isPaid = false;


    @Column(name = "test_result", columnDefinition = "TEXT")
    private String testResult; // Kết luận / Mô tả kết quả của KTV

    @Column(name = "result_file_url")
    private String resultFileUrl; // Đường dẫn ảnh X-quang, siêu âm, file PDF

    @Enumerated(EnumType.STRING)
    @Column(name = "state", nullable = false, length = 30)
    @Builder.Default
    private MedicalTestState state = MedicalTestState.WAITING;

    // --- Các trường nghiệp vụ LIS (Open Hospital) ---
    @Column(name = "specimen_type", length = 100)
    private String specimenType; // Loại bệnh phẩm: Máu, Nước tiểu, Dịch màng phổi, Đờm...

    @Column(name = "specimen_barcode", length = 50)
    private String specimenBarcode; // Mã vạch ống nghiệm / mẫu phẩm

    @Column(name = "sample_collected_at")
    private LocalDateTime sampleCollectedAt; // Thời gian lấy mẫu

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sample_collected_by_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Staff sampleCollectedBy; // Nhân viên y tế lấy mẫu

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performed_by_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Staff performedBy; // Kỹ thuật viên xét nghiệm

    @Column(name = "completed_at")
    private LocalDateTime completedAt; // Thời gian ký duyệt hoàn thành

    // --- Các trường tích hợp RIS / PACS (Bahmni DICOM Gateway) ---
    @Column(name = "accession_number", length = 50, unique = true)
    private String accessionNumber; // Mã ca chụp DICOM (VD: ACC-20261009-001)

    @Column(name = "modality", length = 20)
    private String modality; // CR, DX, CT, MR, US (Loại thiết bị chụp CĐHA)

    @Column(name = "study_instance_uid", length = 120)
    private String studyInstanceUid; // Mã ca chụp trên hệ thống PACS dcm4chee

    @Column(name = "pacs_viewer_url", columnDefinition = "TEXT")
    private String pacsViewerUrl; // Đường dẫn xem phim DICOM trực tuyến (OHIF Web Viewer)

    @OneToMany(mappedBy = "medicalTest", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<MedicalTestResultItem> resultItems = new ArrayList<>();
}

