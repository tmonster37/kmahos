# 🧪 TEST-PLANS: THƯ MỤC LƯU VẾT TESTING PLAN TỪNG MODULE
**Hệ Thống Quản Lý Bệnh Viện Thông Minh - YOUMED TNT HOSPITAL**

---

## 📌 I. MỤC ĐÍCH CỦA THƯ MỤC `test-plans/`

Thư mục này đóng vai trò là **Kho lưu trữ vĩnh viễn Kế hoạch Kiểm Thử (Testing Plans) và Bằng chứng Kiểm Thử (Verification Evidence)** cho từng module nghiệp vụ trong hệ thống.

> [!IMPORTANT]
> **VAI TRÒ TRỌNG YẾU:**
> 1. **Kiểm thử hồi quy (Regression Testing):** Khi một module mới được thêm vào hoặc một module cũ được nâng cấp/sửa lỗi, AI và lập trình viên sẽ đối chiếu lại các file test plan tại đây để đảm bảo các tính năng cũ không bị ảnh hưởng (no breaking changes).
> 2. **Lưu vết chất lượng (Quality Assurance Traceability):** Mỗi module được coi là hoàn thành khi và chỉ khi có tài liệu test plan tương ứng, xác nhận đạt chuẩn 100%.

---

## 📂 II. DANH MỤC CÁC FILE TESTING PLAN ĐANG ĐƯỢC LƯU VẾT

| STT | File Testing Plan | Tên Module / Phân Hệ | Script Kiểm Thử Đi Kèm |
| :---: | :--- | :--- | :--- |
| **01** | [`module_01_doctor_schedule.md`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/test-plans/module_01_doctor_schedule.md) | Quản lý Bác sĩ & Phân lịch trực 14 ngày | [`test_module1.js`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/test_module1.js) |
| **02** | [`module_02_doctor_queue_lab.md`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/test-plans/module_02_doctor_queue_lab.md) | Bàn khám Bác sĩ, Hàng đợi & Trả kết quả Lab | [`test_module2.js`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/test_module2.js) |
| **03** | [`module_03_inpatient_emr.md`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/test-plans/module_03_inpatient_emr.md) | Điều trị Nội trú EMR, Y lệnh & Chăm sóc | [`test_module3.js`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/test_module3.js) |
| **04** | [`module_04_kiosk_reception.md`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/test-plans/module_04_kiosk_reception.md) | Tiếp đón Điều dưỡng & Cây Kiosk sảnh tự phục vụ | [`test_module4_kiosk.js`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/test_module4_kiosk.js) |
| **05** | [`module_05_ai_triage.md`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/test-plans/module_05_ai_triage.md) | AI Trợ lý Y tế Triage 24/7 & Gợi ý Đặt khám | [`test_module5_ai_chat.js`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/test_module5_ai_chat.js) |
| **06** | [`module_06_pharmacy_inventory.md`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/test-plans/module_06_pharmacy_inventory.md) | Quản lý Kho Dược đa kho, hạn dùng & Cấp phát thuốc | [`test_master_system_audit.js`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/test_master_system_audit.js) |
| **07** | [`module_07_payment_cashier.md`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/test-plans/module_07_payment_cashier.md) | Quầy Thu ngân Viện phí & Cổng thanh toán VNPay | [`test_vnpay_payment.js`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/test_vnpay_payment.js) |
| **18** | [`kiosk_booking_hardening.md`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/test-plans/kiosk_booking_hardening.md) | Đặt lịch Kiosk, check-in bền vững, sức chứa & quản lý lịch Admin | Maven unit tests; syntax-only kiosk script checks (API-backed runs pending) |

---

## 🏃 III. LỆNH CHẠY KIỂM THỬ NHANH

```bash
# Kiểm thử đơn lẻ từng module:
node test_module1.js
node test_module2.js
node test_module3.js
node test_module4_kiosk.js
node test_module5_ai_chat.js
node test_vnpay_payment.js

# Kiểm thử toàn diện tất cả các phân hệ (Master Audit):
node test_master_system_audit.js
```
