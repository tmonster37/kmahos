# 🧪 TESTING PLAN: MODULE 5 - AI TRỢ LÝ Y TẾ TRIAGE 24/7 & ĐẶT KHÁM
**Mã phân hệ:** MOD-05 | **Trạng thái:** ✅ ĐÃ KIỂM THỬ THÀNH CÔNG

---

## 🎯 1. MỤC TIÊU KIỂM THỬ
Xác minh tính chính xác của các chức năng:
1. Nhận diện triệu chứng bệnh qua ngôn ngữ tự nhiên tiếng Việt từ bệnh nhân.
2. Guardrail an toàn y tế: Phát hiện dấu hiệu cấp cứu khẩn cấp (`EMERGENCY` - tức ngực khó thở, đột quỵ, co giật) và hiển thị cảnh báo đỏ + hotline 115.
3. Phân loại mức độ khẩn cấp: `EMERGENCY` 🚨, `URGENT` ⚠️, `ROUTINE` ℹ️, `GENERAL_INFO`.
4. Khớp chính xác Chuyên khoa và Bác sĩ từ cơ sở dữ liệu thực tế.
5. Tạo thẻ hành động đặt khám 1-Click (tự động điền Chuyên khoa và Triệu chứng vào màn hình đặt khám).
6. Danh mục trích dẫn y khoa tham khảo chính thống.

---

## 📋 2. CÁC CA KIỂM THỬ (TEST CASES)

| ID | Ngữ cảnh kiểm thử | Câu hỏi / Triệu chứng mẫu | Chuyên khoa khớp | Mức độ cảnh báo | Kết quả |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **TC-01** | Cảnh báo Cấp cứu Tim Mạch | "Tôi bị đau thắt ngực dữ dội, khó thở toát mồ hôi" | Khoa Tim Mạch Can Thiệp | `EMERGENCY` 🚨 | ✅ PASS |
| **TC-02** | Khớp Khoa Nhi | "Bé nhà tôi 3 tuổi bị sốt cao 39 độ, ho có đờm" | Khoa Nhi | `URGENT` ⚠️ | ✅ PASS |
| **TC-03** | Khớp Răng Hàm Mặt | "Tôi bị đau buốt răng hàm khi uống nước lạnh" | Khoa Răng Hàm Mặt | `ROUTINE` ℹ️ | ✅ PASS |
| **TC-04** | Khớp Tai Mũi Họng | "Tôi bị nghẹt mũi, chảy nước mũi và đau rát họng 3 ngày" | Khoa Tai Mũi Họng | `ROUTINE` ℹ️ | ✅ PASS |
| **TC-05** | Khớp Da Liễu | "Da tay tôi bị nổi mẩn đỏ, ngứa rát sau khi tiếp xúc hóa chất" | Khoa Da Liễu | `ROUTINE` ℹ️ | ✅ PASS |
| **TC-06** | Thẻ hành động 1-Click | Kiểm tra payload `bookingAction` | Đầy đủ `departmentId`, `symptoms`, `actionUrl` | — | ✅ PASS |

---

## 💻 3. KỊCH BẢN KIỂM THỬ TỰ ĐỘNG
Chạy lệnh kiểm thử hồi quy:
```bash
node test_module5_ai_chat.js
```
