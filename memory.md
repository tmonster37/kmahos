# 🧠 MEMORY.MD - TÀI LIỆU LƯU TRỮ NGỮ CẢNH DỰ ÁN (PROJECT MEMORY)
**Hệ Thống Quản Lý Bệnh Viện Thông Minh Toàn Diện (Smart Hospital HIS/LIS/PACS/EMR)**

---

## 📌 1. NGUYÊN TẮC LÀM VIỆC BẮT BUỘC (CORE OPERATING RULES)

> [!CAUTION]
> **🚨 CẨM NANG VẬN HÀNH & ĐẶC TÍNH AI (ANTI-HALLUCINATION & CO-PILOT PROTOCOL):**
> 
> * **ĐẶC TÍNH BẢN CHẤT CỦA AI CẦN KHẮC CỐT GHI TÂM:**
>   - **Hay quên ngữ cảnh:** Không giao việc chung chung rồi bắt AI tự nghĩ vì nó không nhớ được ngữ cảnh dài hạn. Người dùng cần có tư duy code rõ ràng, phân rã công việc cụ thể.
>   - **Tự bịa & Tự duyệt pass ảo:** AI có tật xấu là tự viết, tự duyệt pass, thậm chí bịa kết quả pass. Do đó: **Mọi kết quả kiểm thử bắt buộc phải chạy lệnh thật qua terminal và show log thật của server, tuyệt đối không chấp nhận báo cáo pass suông!**
>   - **Thế mạnh & Vai trò chuẩn:** AI có quota rất dồi dào nhưng tư duy logic dễ lú nếu việc phức tạp. 
>     * **Claude:** Dùng để lên Plan, phân tích kiến trúc và tư duy logic sâu.
>     * **ChatGPT:** Dùng để Review / Audit chéo code và tìm bug tiềm ẩn.
>     * **Antigravity (Agy):** Chỉ dùng làm **thợ code thừa hành** (code executor) cho từng module nhỏ, từng file cụ thể sau khi đã có plan rõ ràng.
>
> * **QUY TẮC LẶP LẠI (MAX 3 RETRIES - ESCALATION GATE):**
>   - Nếu 1 vấn đề (bug/tính năng) mà sửa đi sửa lại **3 đến 4 lần** mà kết quả vẫn như cũ, không thông suốt:
>   - **DỪNG LẠI NGAY LẬP TỨC!** Không cố chấp sửa mò làm nát code. Báo thẳng người dùng để mang vấn đề đó sang ChatGPT / Claude / Gemini giải quyết độc lập ở ngoài, code xong mang code về đưa Agy ráp nối tích hợp.
>
> * **TUYỆT ĐỐI CẤM TỰ Ý SỬA DATA SCHEMA:**
>   - **CẤM** tự ý thiết kế lại bảng, drop table, drop column, sinh migration bậy bạ làm bay màu database hiện có. Mọi thay đổi về cấu trúc Entity/DB phải có định hướng và phê duyệt chính xác 100% từ người dùng.
>
> * **QUY TẮC BẤT BIẾN KHI PHÁT TRIỂN & BẢO TRÌ:**
>   1. **DỪNG LẠI & CHỜ DUYỆT (STOP & WAIT):** Trước mọi bổ sung / sửa chữa / nâng cấp, BẮT BUỘC viết kế hoạch chi tiết và **DỪNG LẠI ĐỢI DUYỆT**. Tuyệt đối không tự ý sửa code trước khi được phê duyệt.
>   2. **TÁCH BIỆT KẾ HOẠCH TỔNG QUAN:** File [`master-plan.md`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/master-plan.md) là kế hoạch lớn toàn hệ thống, KHÔNG ĐƯỢC GHI ĐÈ. Kế hoạch từng task lưu riêng.
>   3. **XÂY KHUNG LỚN ➔ LÀM TỪNG MODULE NHỎ:** Hoàn thiện 100% từng module (code + test thật) mới đi tiếp.
>   4. **LƯU TESTING PLAN VĨNH VIỄN:** Mọi module phải lưu test plan vào [`test-plans/`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/test-plans/) để sau này soi lại hồi quy.
>   5. **ĐỐI CHIẾU 3 FILE:** Luôn đồng bộ [`memory.md`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/memory.md), [`architecture.md`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/architecture.md), [`plan.md`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/plan.md).

---

## 🏥 2. NGHIỆP VỤ & TỔNG QUAN HỆ THỐNG (BUSINESS CONTEXT)

Hệ thống y tế thông minh **YOUMED TNT HOSPITAL** tích hợp toàn diện 4 trụ cột công nghệ y tế:
- **HIS (Hospital Information System):** Quản lý khám chữa bệnh, lịch trực, buồng phòng, hàng đợi, tiếp đón quầy, điều dưỡng, thu ngân viện phí.
- **LIS (Laboratory Information System):** Chỉ định xét nghiệm, phòng lab tiếp nhận, nhập kết quả chỉ số sinh hóa/huyết học, trả kết quả realtime cho bác sĩ.
- **PACS (Picture Archiving and Communication System):** Quản lý hình ảnh chẩn đoán (X-quang, MRI, Siêu âm, Nội soi), đính kèm và xem trực tiếp trên hồ sơ khám.
- **EMR (Electronic Medical Record):** Bệnh án điện tử ngoại trú & nội trú, lịch sử dùng thuốc, phiếu chăm sóc điều dưỡng, lệnh y lệnh của bác sĩ, quản lý giường bệnh nội trú.
- **Dịch vụ giá trị gia tăng hiện đại:** Kiosk tự phục vụ tại sảnh, Màn hình LED gọi số thông minh, AI Trợ lý y tế Triage 24/7, Cổng thanh toán VNPay-QR & Ví nội bộ, Sổ nhắc uống thuốc, Quản lý kho dược đa kho.

---

## 🛠️ 3. CÔNG NGHỆ CHÍNH (TECH STACK)

| Thành phần | Công nghệ / Thư viện | Ghi chú & Phiên bản |
| :--- | :--- | :--- |
| **Backend Framework** | Spring Boot 3.4.3 | Java 21 LTS |
| **Security & Auth** | Spring Security 6 + JJWT 0.12.6 | JWT Access Token, BCrypt Password Encoder |
| **Database & ORM** | PostgreSQL + Spring Data JPA (Hibernate) | 38 thực thể quan hệ, Soft-delete (`isDeleted`) |
| **Frontend Framework** | React 18.3.1 + Vite 6.1.0 | Single Page Application, React Router v7 |
| **UI Component System** | Material UI (MUI v6) + Emotion | Chuẩn thiết kế y tế phẳng, responsive |
| **Payment Gateway** | VNPay Sandbox API | Mã hóa HMAC-SHA512, IPN Webhook callback |
| **Voice & Media** | Web Audio API + HTML5 SpeechSynthesis | Chuông Ding-dong + Gọi loa AI tiếng Việt |
| **Barcode / QR** | `qrcode.react` 4.2.0 | Mã QR viện phí, mã đặt khám, mã hồ sơ |
| **Build & Container** | Maven Wrapper + Docker Compose | PostgreSQL 15, Spring Boot Dockerfile |

---

## 👥 4. DANH SÁCH TÀI KHOẢN MẪU & PHÂN QUYỀN RBAC

| Vai trò (Role) | SĐT / Tài khoản | Mật khẩu | Phạm vi quyền hạn chính |
| :--- | :---: | :---: | :--- |
| **ADMIN (Quản lý toàn viện)** | `0937050537` | `taizz0537` | Toàn quyền cấu hình, tài khoản, nhân sự, khoa phòng, thuốc, dịch vụ, doanh thu |
| **DOCTOR (Bác sĩ phòng khám)** | `0937050537` | `taizz0537` | Bàn khám, gọi số, chỉ định cận lâm sàng, kê đơn thuốc, xem lịch sử bệnh án, lịch trực |
| **HEAD_OF_DEPT (Trưởng khoa)** | `0937050537` | `taizz0537` | Toàn bộ quyền Bác sĩ + Quản lý & Phân lịch trực cho toàn bộ bác sĩ trong khoa |
| **NURSE (Điều dưỡng quầy/phòng)** | Gán `ROLE_NURSE` | `password123` | Tiếp đón bệnh nhân, phân luồng ưu tiên, cấp số thứ tự, điều phối phòng khám |
| **LAB_TECH (Kỹ thuật viên Lab)** | Gán `ROLE_LAB_TECH` | `password123` | Tiếp nhận mẫu xét nghiệm/CĐHA, nhập chỉ số kết quả, đính kèm hình ảnh |
| **CASHIER (Quầy thu ngân)** | Gán `ROLE_CASHIER` | `password123` | Thu viện phí tại quầy, xuất hóa đơn VAT điện tử, đối soát tiền mặt / VNPay |
| **PATIENT (Bệnh nhân)** | `0988889999` | `password123` | Đặt khám, quản lý hồ sơ gia đình, thanh toán ví/VNPay, sổ nhắc uống thuốc |
| **GUEST (Khách vãng lai)** | *(Chưa đăng nhập)* | — | Tra cứu chuyên khoa, bác sĩ, bảng giá dịch vụ, sơ đồ viện, tìm hồ sơ qua CCCD/SĐT |

---

## 📈 5. LỊCH SỬ CÁC MODULE ĐÃ HOÀN TẤT & ĐÃ KIỂM THỬ

1. **Module 1 - Quản lý Bác sĩ & Phân lịch trực (`/admin/doctors`, `/admin/schedules`)**: Hoàn thành & Test Pass (`test_module1.js`).
2. **Module 2 - Bàn khám Bác sĩ, Hàng đợi & Trả kết quả Lab (`/doctor/examination`, `/doctor/lab-tests`, `/queue-display`)**: Hoàn thành & Test Pass (`test_module2.js`).
3. **Module 3 - Điều trị Nội trú & Bệnh án điện tử EMR (`/doctor/inpatient`, `/admin/ehr`)**: Hoàn thành & Test Pass (`test_module3.js`).
4. **Module 4 - Tiếp đón Điều dưỡng & Kiosk tự phục vụ (`/nurse/reception`, `/kiosk`)**: Hoàn thành & Test Pass (`test_module4_kiosk.js`).
5. **Module 5 - AI Trợ lý Y tế Triage 24/7 (`/ai-consult`, `/api/ai/consult`)**: Hoàn thành & Test Pass (`test_module5_ai_chat.js`).
6. **Module 6 - Quản lý Kho Dược & Cấp phát thuốc (`/admin/pharmacy-inventory`, `/admin/medicines`)**: Hoàn thành & Test Pass (`test_master_system_audit.js`).
7. **Module 7 - Cổng thanh toán VNPay-QR & Ví viện phí (`/payment`, `/cashier`)**: Hoàn thành & Test Pass (`test_vnpay_payment.js`, `test_cashier_workflow.js`).
8. **Module 8 - Báo cáo Thống kê & Quản trị RBAC (`/admin/dashboard`, `/admin/accounts`)**: Hoàn thành & Test Pass.
9. **Củng cố Bảo mật, Tính toàn vẹn Dữ liệu & UI Hardening (TASK-10)**: Hoàn thành & Test Pass 16/16 (`test_security_hardening.js`).
10. **Chống IDOR Hồ sơ Bệnh nhân & Priority Triage Kiosk từ revita-be (TASK-11)**: Hoàn thành & Test Pass (`test_security_hardening.js`).
11. **Tích hợp PayOS Webhook Idempotency & Đối soát Giao dịch (TASK-12)**: Hoàn thành & Test Pass 6/6 (`test_payos_idempotency.js`).
12. **Cải tiến An toàn Đơn thuốc CDS & Chuẩn hóa VNPay IPN từ E-healthcare (TASK-13)**: Hoàn thành & Test Pass 13/13 (`test_ehealthcare_improvements.js`), tích hợp CDS kiểm tra dị ứng chéo 2 lớp và chuẩn hóa VNPay IPN (`RspCode` 00/02/04/97).
13. **Quản lý Quầy Tiếp đón Counter & Bốc số Kiosk Thông minh (TASK-15)**: Hoàn thành & Test Pass 11/11 (`test_counter_kiosk_workflow.js`), tích hợp quản lý 5 quầy chuyên trách (General x2, Insurance, Priority, Fast-track), tự động phân luồng Kiosk theo Triage/BHYT/Hẹn trước/Least-loaded, nghiệp vụ điều dưỡng trực quầy (mở quầy, gọi số, hoàn tất điều phối buồng khám, bỏ qua vắng mặt, tạm nghỉ, đóng quầy), phiếu in nhiệt chứa quầy & số người chờ, và màn hình LED TV hiển thị trạng thái 5 quầy thời gian thực kèm âm thanh chuông Ding-dong & giọng đọc AI tiếng Việt.
14. **Số hóa Toàn diện Quy trình Y tế 4 Phân hệ theo TT 46/2018/TT-BYT & E-healthcare (TASK-16)**: Hoàn thành 100% cả 4 giai đoạn, đạt 123/123 assertions PASS thực tế và frontend build thành công:
    - *Giai đoạn 1 (Doctor Portal)*: Khóa bệnh án sau 24h & EMR Addendum (Thông tư 46/2018/TT-BYT), Snapshot Chaining chẩn đoán (21/21 PASS).
    - *Giai đoạn 2 (Patient Portal)*: Giữ slot 10 phút chống đặt trùng & Đơn thuốc điện tử PDF (OpenPDF) kèm mã QR xác thực chữ ký số SHA-256 Timing-Safe (29/29 PASS).
    - *Giai đoạn 3 (Reception Desk)*: Tiếp đón điều dưỡng hợp nhất (`ROLE_NURSE`), Check-in QR trong 5 giây, đo sinh hiệu & tính BMI tự động, thu viện phí tại quầy (`PAY_AT_CLINIC`), in biên lai chuẩn A5 và phiếu nhiệt K80 (35/35 PASS).
    - *Giai đoạn 4 (Admin Portal)*: Quản lý Chứng chỉ hành nghề (CCHN) Bác sĩ, Dashboard KPI Doanh thu theo 6 kênh & Công suất buồng khám Realtime, Nhật ký kiểm toán bất biến (Immutable Audit Logs - Append-only `REQUIRES_NEW`) tự động lọc bỏ PII nhạy cảm (38/38 PASS).



