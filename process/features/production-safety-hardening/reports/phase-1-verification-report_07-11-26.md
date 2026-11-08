# Báo cáo Nghiệm thu Giai đoạn 1: An toàn Dữ liệu Lâm sàng, Tồn kho Dược & Phân luồng AI

> **Chương trình:** `production-safety-hardening`  
> **Kế hoạch đã hoàn thành:** [`phase-1-clinical-and-inventory-safety_PLAN_07-11-26.md`](../completed/phase-1-clinical-and-inventory-safety_PLAN_07-11-26.md)  
> **Ngày nghiệm thu:** 07-11-2026  
> **Trạng thái Cổng 1 (Phase 1 Gate):** **PASSED (ĐẠT 100%)**

---

## 1. Tóm tắt Các Thay đổi Đã Thực thi

1. **Cô lập Seeder Lâm sàng Nội trú & Xét nghiệm ([`InpatientAndLabDataInitializer.java`](../../../../hospital-api/src/main/java/com/hospital/api/config/InpatientAndLabDataInitializer.java)):**
   - Gắn `@Profile("!prod & !production")` để loại bỏ hoàn toàn bean khỏi môi trường production.
   - Bổ sung cờ `@Value("${app.seed-demo-data:false}")` (mặc định `false`). Khi khởi động ở chế độ mặc định, runner ghi log bỏ qua và không thực hiện bất kỳ thao tác ghi dữ liệu mẫu nào vào hồ sơ bệnh nhân hay kết quả xét nghiệm.

2. **Cô lập Seeder Tồn kho Dược & RIS/PACS ([`PharmacyAndGatewayDataInitializer.java`](../../../../hospital-api/src/main/java/com/hospital/api/config/PharmacyAndGatewayDataInitializer.java)):**
   - Gắn `@Profile("!prod & !production")` và kiểm tra `@Value("${app.seed-demo-data:false}")`.
   - Ngăn chặn việc tự tạo lô thuốc mẫu (`LOT-2026A-*`, `LOT-2027B-*`) và số lượng tồn cố định ngoài chế độ demo tường minh.

3. **Cấu hình Mặc định An toàn ([`application.yml`](../../../../hospital-api/src/main/resources/application.yml)):**
   - Thiết lập `app.seed-demo-data: ${APP_SEED_DEMO_DATA:false}` ở cấu hình mặc định và khóa cứng `app.seed-demo-data: false` ở profile `prod,production`.
   - Thiết lập `app.ai-triage.clinical-approved: ${APP_AI_TRIAGE_CLINICAL_APPROVED:false}`.

4. **Khóa An toàn Phân luồng Cấp cứu AI ([`AiTriageServiceImpl.java`](../../../../hospital-api/src/main/java/com/hospital/api/service/impl/AiTriageServiceImpl.java)):**
   - Mở rộng [`checkEmergencyFlags`](../../../../hospital-api/src/main/java/com/hospital/api/service/impl/AiTriageServiceImpl.java#L114-L144) để phát hiện tổ hợp đau/tức ngực kèm khó thở/đi lại nhanh/gắng sức/vã mồ hôi, đau đầu dữ dội kèm chóng mặt/buồn nôn/nhìn mờ, và sốt cao ở trẻ nhỏ kèm dấu hiệu nguy hiểm.
   - Khi không phải tình huống `EMERGENCY` và chưa bật `app.ai-triage.clinical-approved=true`, trả về `triageLevel = "ADVISORY_ONLY"` thay vì `"ROUTINE"`.

5. **Xóa Dịch vụ Xét nghiệm Giả trên UI ([`AssignTestsModal.jsx`](../../../../hospital-ui/src/pages/Doctor/AssignTestsModal.jsx)):**
   - Xóa hoàn toàn 2 khối dữ liệu giả (`serviceId: 1..7`) trong [`fetchServices`](../../../../hospital-ui/src/pages/Doctor/AssignTestsModal.jsx#L42-L60); giữ `services = []` và hiển thị thông báo lỗi rõ ràng khi danh mục trống hoặc lỗi kết nối.

---

## 2. Bằng chứng Kiểm thử (Verification Evidence)

- **Backend Unit Tests ([`ProductionSafetyPhase1Test.java`](../../../../hospital-api/src/test/java/com/hospital/api/service/ProductionSafetyPhase1Test.java)):**
  - Command: `.\mvnw.cmd test "-Dtest=ProductionSafetyPhase1Test"`
  - Kết quả: `Tests run: 5, Failures: 0, Errors: 0, Skipped: 0` (`BUILD SUCCESS`).
- **Frontend Tests & Build:**
  - Command: `npx vitest run` & `npx vite build`
  - Kết quả: 14 test files (`52 passed`), production bundle build thành công.

