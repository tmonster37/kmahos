# Kế hoạch Giai đoạn 1: An toàn Dữ liệu Lâm sàng, Tồn kho Dược & Phân luồng AI (`phase-1-clinical-and-inventory-safety`)

> **Thuộc Chương trình:** [`production-safety-hardening_UMBRELLA_PLAN_07-11-26.md`](../active/production-safety-hardening_UMBRELLA_PLAN_07-11-26.md)  
> **Trạng thái:** COMPLETED (07-11-2026)  
> **Ngày tạo:** 07-11-2026

---

## 1. Mục tiêu & Phạm vi (Scope)

Xử lý dứt điểm 3 rủi ro an toàn lâm sàng và dữ liệu kho mức độ **Cao**:
1. **Cô lập `InpatientAndLabDataInitializer`:** Ngăn chặn việc tự động ghi tờ điều trị mẫu (`Ceftriaxone 1g...`), phiếu chăm sóc điều dưỡng mẫu, mẫu bệnh phẩm (`Máu toàn phần (EDTA)`) và kết quả xét nghiệm giả (`WBC = 7.5`, `RBC = 4.65`, `GLUCOSE = 5.2`) vào các hồ sơ nội trú/xét nghiệm đang tồn tại khi khởi động ứng dụng.
2. **Cô lập `PharmacyAndGatewayDataInitializer`:** Ngăn chặn việc tự động sinh các lô thuốc mẫu (`LOT-2026A-*`, `LOT-2027B-*`), cộng thêm số lượng tồn kho cố định (`500`, `1000`, `80`, `200`...) và gán dữ liệu RIS/PACS mẫu cho các chỉ định xét nghiệm khi khởi động ngoài chế độ demo tường minh.
3. **Loại bỏ dịch vụ xét nghiệm giả trong `AssignTestsModal.jsx`:** Xóa mảng 7 dịch vụ cận lâm sàng và đơn giá giả lập khi API `/api/clinical/services` trả về rỗng hoặc gặp lỗi mạng.
4. **Khóa an toàn lâm sàng cho `AiTriageServiceImpl` & `/api/ai/**`:**
   - Tuân thủ cổng an toàn: Khi chưa có phê duyệt chính sách lâm sàng, AI Triage không được phép phân loại triệu chứng là `ROUTINE` (tránh gây chủ quan cho người bệnh có triệu chứng nặng như *"đau tức ngực và khó thở khi đi lại nhanh"*).
   - Mở rộng bộ nhận diện dấu hiệu nguy cấp (bao gồm đau ngực kèm khó thở/gắng sức, đau đầu dữ dội kèm nôn/chóng mặt, sốt cao ở trẻ nhỏ...).
   - Chuyển nhãn mặc định từ `ROUTINE` sang `ADVISORY_ONLY` (Chỉ mang tính chất tham khảo định hướng chuyên khoa, không phải quyết định phân loại cấp cứu lâm sàng) và bổ sung cảnh báo rõ ràng.

---

## 2. Điểm chạm Mã nguồn Đã Thực Thi

| File | Thay đổi đã áp dụng |
| :--- | :--- |
| `hospital-api/src/main/java/com/hospital/api/config/InpatientAndLabDataInitializer.java` | Thêm `@Profile("!prod & !production")` và kiểm tra cờ `@Value("${app.seed-demo-data:false}")`. Khi `seedDemoData=false` (mặc định), bỏ qua toàn bộ seeding dữ liệu mẫu. |
| `hospital-api/src/main/java/com/hospital/api/config/PharmacyAndGatewayDataInitializer.java` | Thêm `@Profile("!prod & !production")` và kiểm tra cờ `@Value("${app.seed-demo-data:false}")`. Khi `seedDemoData=false` (mặc định), bỏ qua toàn bộ seeding lô thuốc, tồn kho và RIS/PACS mẫu. |
| `hospital-api/src/main/resources/application.yml` | Khai báo `app.seed-demo-data: ${APP_SEED_DEMO_DATA:false}` (khối `prod,production` khóa cứng `false`) và `app.ai-triage.clinical-approved: ${APP_AI_TRIAGE_CLINICAL_APPROVED:false}`. |
| `hospital-api/src/main/java/com/hospital/api/service/impl/AiTriageServiceImpl.java` | Mở rộng `checkEmergencyFlags` để bắt tổ hợp đau/tức ngực kèm khó thở/gắng sức, đau đầu dữ dội kèm chóng mặt/buồn nôn, trẻ sốt cao kèm dấu hiệu nguy hiểm; trả `ADVISORY_ONLY` thay vì `ROUTINE` khi `clinicalApproved=false`. |
| `hospital-ui/src/pages/Doctor/AssignTestsModal.jsx` | Xóa toàn bộ mảng fallback dịch vụ mẫu (`serviceId: 1..7`); đặt `setServices([])` và hiển thị thông báo lỗi rõ ràng qua `setError(...)`. |

---

## 3. Cổng Nghiệm thu Giai đoạn 1 (Phase 1 Gate Criteria)

- [x] Không có đường khởi động mặc định hoặc production nào tự động thêm ghi chú điều trị, sinh hiệu, kết quả xét nghiệm hoặc tồn kho thuốc mẫu.
- [x] `AssignTestsModal.jsx` không còn chứa hoặc hiển thị dịch vụ/giá giả khi API rỗng hoặc lỗi.
- [x] `AiTriageServiceImpl` nhận diện đúng triệu chứng đau tức ngực kèm khó thở là `EMERGENCY` và không trả `ROUTINE` khi chưa có phê duyệt chuyên môn.
- [x] Toàn bộ test mới (`ProductionSafetyPhase1Test` - 5/5 pass) và test hồi quy Frontend (`vitest` 52/52 pass + `vite build` pass) xanh 100%.

