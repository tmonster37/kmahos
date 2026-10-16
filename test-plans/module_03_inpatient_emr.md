# 🧪 TESTING PLAN: MODULE 3 - ĐIỀU TRỊ NỘI TRÚ & BỆNH ÁN EMR
**Mã phân hệ:** MOD-03 | **Trạng thái:** ✅ ĐÃ KIỂM THỬ THÀNH CÔNG

---

## 🎯 1. MỤC TIÊU KIỂM THỬ
Xác minh tính chính xác của các chức năng:
1. Tiếp nhận bệnh nhân nhập viện nội trú từ bàn khám (`HospitalAdmission`).
2. Phân buồng phòng và giường bệnh nội trú (`Bed`, `Room`).
3. Bác sĩ ra Y lệnh hàng ngày (`InpatientDoctorOrder`).
4. Điều dưỡng ghi nhận phiếu Chăm sóc & sinh hiệu (`InpatientNursingCare`: Huyết áp, mạch, nhiệt độ, SpO2).
5. Chuyển giường / chuyển buồng bệnh (`InpatientBedTransfer`).
6. Tổng kết bệnh án và làm thủ tục xuất viện (`Discharge`).
7. Tích hợp toàn diện hồ sơ bệnh án điện tử EMR.

---

## 📋 2. CÁC CA KIỂM THỬ (TEST CASES)

| ID | Mô tả ca kiểm thử | Dữ liệu đầu vào | Kết quả mong đợi | Kết quả thực tế |
| :---: | :--- | :--- | :--- | :---: |
| **TC-01** | Bác sĩ chỉ định nhập viện | `recordId`, `departmentId`, `reason` | Tạo `HospitalAdmission`, giường chuyển `OCCUPIED` | ✅ PASS |
| **TC-02** | Bác sĩ ra Y lệnh nội trú | `admissionId`, y lệnh thuốc/CLS | Tạo `InpatientDoctorOrder` thành công | ✅ PASS |
| **TC-03** | Điều dưỡng cập nhật chăm sóc | `admissionId`, huyết áp, mạch, nhiệt độ | Tạo `InpatientNursingCare` thành công | ✅ PASS |
| **TC-04** | Chuyển giường bệnh | `admissionId`, `newBedId`, lý do | Giường cũ `AVAILABLE`, giường mới `OCCUPIED` | ✅ PASS |
| **TC-05** | Thủ tục xuất viện | `admissionId`, kết luận xuất viện | `HospitalAdmission` chuyển `DISCHARGED`, giải phóng giường | ✅ PASS |
| **TC-06** | Truy xuất bệnh án EMR toàn diện | `patientProfileId` | Trả về toàn bộ lịch sử khám ngoại trú & các đợt nội trú | ✅ PASS |

---

## 💻 3. KỊCH BẢN KIỂM THỬ TỰ ĐỘNG
Chạy lệnh kiểm thử hồi quy:
```bash
node test_module3.js
```
Script kiểm tra toàn bộ vòng đời bệnh nhân nội trú từ lúc nhập viện -> ra y lệnh -> chăm sóc -> xuất viện.
