# 🧪 TESTING PLAN: MODULE 6 - QUẢN LÝ KHO DƯỢC & CẤP PHÁT THUỐC
**Mã phân hệ:** MOD-06 | **Trạng thái:** ✅ ĐÃ KIỂM THỬ THÀNH CÔNG

---

## 🎯 1. MỤC TIÊU KIỂM THỬ
Xác minh tính chính xác của các chức năng:
1. Quản lý danh mục thuốc: Tên thuốc, hoạt chất, đường dùng, đơn vị tính, giá bán.
2. Quản lý hệ thống Kho Dược đa kho: Kho chẵn (Kho tổng), Kho lẻ (Kho ngoại trú, Kho nội trú).
3. Quản lý lô thuốc (`MedicineBatch`): Số lô, ngày sản xuất, hạn sử dụng, số lượng tồn.
4. Cảnh báo thuốc sắp hết hạn (dưới 90 ngày) và cảnh báo thuốc dưới định mức tồn kho tối thiểu.
5. Quy trình duyệt và cấp phát thuốc theo toa bác sĩ (`PrescriptionDispense`).
6. Trừ tồn kho tự động theo nguyên tắc FIFO / FEFO (Hết hạn trước xuất trước).

---

## 📋 2. CÁC CA KIỂM THỬ (TEST CASES)

| ID | Mô tả ca kiểm thử | Dữ liệu đầu vào | Kết quả mong đợi | Kết quả thực tế |
| :---: | :--- | :--- | :--- | :---: |
| **TC-01** | Tạo kho dược mới | Tên kho, loại kho | HTTP 200, tạo `PharmacyWarehouse` | ✅ PASS |
| **TC-02** | Nhập kho lô thuốc mới | Thuốc, số lô, hạn dùng, số lượng | Tăng tồn kho `WarehouseStock` & `MedicineBatch` | ✅ PASS |
| **TC-03** | Cảnh báo hạn sử dụng | Truy vấn lô thuốc có hạn < 90 ngày | Trả về danh sách cảnh báo chính xác | ✅ PASS |
| **TC-04** | Cấp phát thuốc theo đơn | `prescriptionId`, `warehouseId` | Tạo phiếu phát thuốc, trừ tồn kho tương ứng | ✅ PASS |
| **TC-05** | Chặn cấp phát khi hết tồn kho | Thuốc có số lượng tồn < số lượng kê | Báo lỗi không đủ số lượng tồn | ✅ PASS |

---

## 💻 3. KỊCH BẢN KIỂM THỬ TỰ ĐỘNG
Được tích hợp và kiểm thử tự động trong:
```bash
node test_master_system_audit.js
```
