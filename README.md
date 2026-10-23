# 🏥 HỆ THỐNG QUẢN LÝ BỆNH VIỆN THÔNG MINH (HOSPITAL MANAGEMENT SYSTEM - HMS)

> **Giải pháp số hóa toàn diện quy trình Bệnh viện & Phòng khám Đa khoa (HIS - LIS - PACS - EMR)**
> Kiến trúc Monolithic Modular hiện đại: **ReactJS (Vite) + Java Spring Boot 3 (Java 21) + PostgreSQL 16**

---

## 📑 MỤC LỤC
1. [Giới thiệu dự án](#1-giới-thiệu-dự-án)
2. [Kiến trúc & Công nghệ sử dụng](#2-kiến-trúc--công-nghệ-sử-dụng)
3. [Các Phân hệ & Tính năng nghiệp vụ](#3-các-phân-hệ--tính-năng-nghiệp-vụ)
4. [Yêu cầu môi trường cài đặt](#4-yêu-cầu-môi-trường-cài-đặt)
5. [Hướng dẫn cài đặt & Khởi chạy nhanh](#5-hướng-dẫn-cài-đặt--khởi-chạy-nhanh)
   - [Cách 1: Khởi chạy thủ công (Development)](#cách-1-khởi-chạy-thủ-công-development)
   - [Cách 2: Khởi chạy bằng Docker Compose (Khuyên dùng)](#cách-2-khởi-chạy-bằng-docker-compose-khuyên-dùng)
6. [Tài khoản kiểm thử mẫu (Demo Credentials)](#6-tài-khoản-kiểm-thử-mẫu-demo-credentials)
7. [Hướng dẫn Kiểm thử Hệ thống (Testing & Verification)](#7-hướng-dẫn-kiểm-thử-hệ-thống-testing--verification)
8. [Cơ chế Sao lưu & Phục hồi CSDL tự động (Disaster Recovery)](#8-cơ-chế-sao-lưu--phục-hồi-csdl-tự-động-disaster-recovery)
9. [Cấu trúc Thư mục Dự án](#9-cấu-trúc-thư-mục-dự-án)
10. [Các lỗi thường gặp & Cách khắc phục (Troubleshooting)](#10-các-lỗi-thường-gặp--cách-khắc-phục-troubleshooting)
11. [Nguyên tắc An toàn & Bảo mật Y tế](#11-nguyên-tắc-an-toàn--bảo-mật-y-tế)
12. [Hướng dẫn Triển khai Trực tuyến (Online Deployment)](#12-hướng-dẫn-triển-khai-trực-tuyến-online-deployment)

---

## 1. GIỚI THIỆU DỰ ÁN

Hệ thống Quản lý Bệnh viện Thông minh (**Hospital Management System - HMS**) là nền tảng quản lý khám chữa bệnh chuyên sâu, kết nối liền mạch mọi luồng thông tin giữa Bệnh nhân, Điều dưỡng tiếp đón, Bác sĩ khám lâm sàng, Kỹ thuật viên xét nghiệm (LIS), Bác sĩ chẩn đoán hình ảnh (PACS), Dược sĩ phát thuốc và Kế toán thu viện phí.

### Vấn đề giải quyết:
- **Loại bỏ tình trạng ùn tắc tại sảnh:** Kiosk tự phục vụ tích hợp quét mã, lấy số thứ tự ưu tiên và màn hình LED TV hiển thị số thứ tự hàng đợi theo thời gian thực.
- **Minh bạch hóa bệnh án lâm sàng:** Bác sĩ mở bệnh án điện tử (EMR), nhập chẩn đoán theo danh mục chuẩn ICD-10, ra chỉ định cận lâm sàng và kê đơn thuốc điện tử an toàn.
- **Kiểm soát kho dược theo chuẩn FEFO:** Xuất kho thuốc ưu tiên theo lô có hạn sử dụng gần nhất, chống trừ kho kép và cảnh báo tồn kho an toàn.
- **Thanh toán không tiền mặt:** Tích hợp cổng thanh toán trực tuyến VNPay-QR và chuyển khoản VietQR tự động xác nhận hóa đơn.
- **Trợ lý trí tuệ nhân tạo (AI Medical Triage):** Hỗ trợ bệnh nhân phân tích triệu chứng sơ bộ 24/7 và định hướng chuyên khoa khám phù hợp.

---

## 2. KIẾN TRÚC & CÔNG NGHỆ SỬ DỤNG

```
[ Client: ReactJS 18 + Vite ] <──(HTTP / REST + Bearer JWT)──> [ API Gateway / Nginx ]
                                                                       │
                                                                       ▼
                                                      [ Backend: Spring Boot 3.4 (Java 21) ]
                                                        ├── Security 6 (Stateless JWT)
                                                        ├── Service Layer (FEFO Inventory)
                                                        └── JPA / Hibernate 6.6
                                                                       │ (HikariCP)
                                                                       ▼
                                                      [ Database: PostgreSQL 16 ]
```

Sơ đồ UML chi tiết của luồng đặt lịch, tiếp đón QR và cận lâm sàng được lưu trong [docs/diagrams](docs/diagrams/README.md), gồm cả nguồn Mermaid có thể chỉnh sửa.

### Chi tiết Stack công nghệ đã xác minh:

| Thành phần | Công nghệ | Phiên bản | Ghi chú & Thư viện sử dụng |
| :--- | :--- | :---: | :--- |
| **Backend Framework** | Java Spring Boot | **3.4.0** | Java OpenJDK 21 LTS, Spring Web, Spring Data JPA, Spring Validation |
| **Bảo mật & Auth** | Spring Security 6 | **6.4.x** | JJWT **0.12.6** (HS256/HS512), BCrypt PasswordEncoder (Strength 10) |
| **Cơ sở dữ liệu** | PostgreSQL | **16.x** | Database `kmahos` / `tnt_hospital_db`, Driver `postgresql:42.7.4` |
| **Kết nối CSDL** | HikariCP & Hibernate | **6.6.x** | Transaction Management (`@Transactional`), JPA Sequence Auto-Sync |
| **Frontend Framework** | ReactJS | **18.3.1** | Build tool **Vite 6.0.1** (ESModules), React Router DOM **6.28.0** |
| **Giao diện & UI** | TailwindCSS + Lucide | **3.4.16** | Icons `lucide-react`, Recharts 2.15, Sonner/React-Toastify |
| **HTTP Client** | Axios | **1.7.9** | Request/Response Interceptors, Auto Bearer Token, Error Toast |
| **Thanh toán & Cổng ngoài** | VNPay SDK, Gemini AI | — | Cổng thanh toán VNPay Sandbox, Google Gemini / LangChain4j |
| **Triển khai & Vận hành** | Docker, Nginx, Bash/PS | — | Docker Compose đa container, Scripts sao lưu tự động `pg_dump` |

---

## 3. CÁC PHÂN HỆ & TÍNH NĂNG NGHIỆP VỤ

Hệ thống được thiết kế theo mô hình phân quyền chặt chẽ trên 8 vai trò (Roles):

### 3.1. Phân hệ Tiếp đón & Kiosk Thông minh (Smart Kiosk & Queue)
- **Kiosk tự phục vụ:** Màn hình cảm ứng tại sảnh cho phép bệnh nhân bấm lấy số thứ tự theo khoa, tự động tính số ưu tiên (người già, phụ nữ mang thai, trẻ sơ sinh, cấp cứu).
- **Màn hình LED gọi số (Public LED Display):** Màn hình công khai không cần đăng nhập (`/api/clinical/queue/public`), cập nhật số đang khám và danh sách chờ theo thời gian thực.
- **Tiếp đón điều dưỡng:** Điều dưỡng quầy tra cứu hồ sơ, phân buồng khám và điều phối hàng đợi.

### 3.2. Phân hệ Hồ sơ Sức khỏe & Cổng Bệnh nhân (Patient Portal)
- Quản lý đa hồ sơ sức khỏe trong cùng một tài khoản (bản thân, con cái, cha mẹ).
- Đặt lịch khám trực tuyến theo Bác sĩ / Chuyên khoa / Ngày giờ khám.
- Tra cứu kết quả xét nghiệm, lịch sử đơn thuốc và xem lộ trình điều trị.
- Ví viện phí cá nhân: Nạp tiền trước, tự động khấu trừ viện phí và dịch vụ khám.
- Tính năng nhắc giờ uống thuốc thông minh (Lịch nhắc sáng/trưa/chiều/tối).

### 3.3. Phân hệ Bàn khám Bác sĩ Lâm sàng (Clinical Examination & EMR)
- Tiếp nhận bệnh nhân theo hàng đợi phòng khám riêng biệt của bác sĩ.
- Mở hồ sơ bệnh án điện tử (EMR), ghi nhận lý do khám, tiền sử bệnh, sinh hiệu (huyết áp, mạch, nhiệt độ, SpO2).
- Chẩn đoán bệnh theo danh mục chuẩn **ICD-10** quốc tế.
- Ra chỉ định xét nghiệm Cận lâm sàng và chỉ định thuốc.
- Chỉ định nhập viện nội trú hoặc chuyển tuyến điều trị.

### 3.4. Phân hệ Cận lâm sàng & LIS / PACS (Laboratory & Imaging)
- **Xét nghiệm (LIS):** Tiếp nhận mẫu, sinh mã Barcode ống nghiệm / Accession Number, nhập kết quả định lượng, ghi nhận giá trị bình thường/bất thường, đính kèm kết quả PDF.
- **Chẩn đoán hình ảnh (PACS Viewer):** Tích hợp thông tin Study Instance UID, xem ảnh chụp X-quang, CT-Scanner, MRI và kết luận hình ảnh học.

### 3.5. Phân hệ Dược & Quản lý Kho thuốc FEFO (Pharmacy Management)
- Tiếp nhận đơn thuốc điện tử từ phòng khám của bác sĩ.
- Quản lý kho thuốc theo **Lô nhập & Hạn sử dụng (Batch & Expiry Date)**.
- **Cơ chế FEFO (First Expired, First Out):** Tự động đề xuất và xuất trừ thuốc từ các lô có hạn dùng gần nhất trước.
- Ngăn chặn hoàn toàn lỗi trừ kho kép hoặc âm kho dược.
- In phiếu hướng dẫn sử dụng thuốc cho bệnh nhân.

### 3.6. Phân hệ Quản lý Nội trú & Giường bệnh (Inpatient Management)
- Quy trình nhập viện, phân bổ khoa nội trú, phòng bệnh và gán giường bệnh.
- Quản lý trạng thái giường bệnh trực quan (Trống, Đang sử dụng, Bảo trì).
- Ghi nhật ký theo dõi buồng bệnh hàng ngày (Diễn biến bệnh, y lệnh điều dưỡng).
- Thủ tục xuất viện và quyết toán viện phí nội trú.

### 3.7. Phân hệ Viện phí & Thanh toán Trực tuyến (Billing & Payments)
- Tự động tổng hợp chi phí: Tiền khám + Tiền xét nghiệm + Tiền thuốc + Tiền giường bệnh.
- Tạo mã thanh toán **VNPay-QR** và **VietQR** động theo từng hóa đơn.
- Xử lý xác nhận thanh toán an toàn, bảo vệ chống giả mạo giao dịch (Webhook IPN xác thực chữ ký SHA-512).
- In hóa đơn viện phí chuẩn.

### 3.8. Phân hệ Trợ lý Y tế AI 24/7 (AI Medical Triage Assistant)
- Hộp thoại tư vấn triệu chứng sức khỏe ban đầu cho người bệnh.
- Tự động gợi ý chuyên khoa phù hợp và hỗ trợ đặt lịch khám nhanh 1-Click.
- Chế độ trả lời phòng ngừa: Khuyến cáo rõ ràng người bệnh không tự ý dùng thuốc và đến cơ sở y tế khi có dấu hiệu nguy hiểm.

### 3.9. Phân hệ Quản trị Bệnh viện (Admin Dashboard & Human Resources)
- Dashboard biểu đồ thống kê doanh thu, số lượt khám, tỷ lệ chuyên khoa theo thời gian thực.
- Quản lý cơ cấu Bệnh viện: Chuyên khoa, Phòng khám, Danh mục kỹ thuật xét nghiệm, Danh mục thuốc.
- Quản lý Nhân sự y tế: Bác sĩ, Điều dưỡng, Dược sĩ, Kỹ thuật viên (CRUD, phân ca trực 14 ngày).
- Quản lý người dùng, khóa/mở khóa tài khoản.

---

## 4. YÊU CẦU MÔI TRƯỜNG CÀI ĐẶT

Trước khi khởi chạy dự án, máy tính cần cài đặt các công cụ sau:

- **Java Development Kit (JDK):** Phiên bản **21 LTS** (Oracle OpenJDK, Eclipse Temurin hoặc Amazon Corretto).
- **Node.js:** Phiên bản **18.x** trở lên (khuyên dùng Node 20 LTS) kèm trình quản lý gói `npm`.
- **PostgreSQL:** Phiên bản **16.x** (hoặc 14+).
- **Git:** Để quản lý mã nguồn.
- **Docker & Docker Compose:** *(Tùy chọn)* Nếu muốn khởi chạy trọn gói bằng container.

---

## 5. HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY NHANH

### Cách 1: Khởi chạy thủ công (Development)

#### Bước 1: Clone mã nguồn từ GitHub
```bash
git clone <GITHUB_REPOSITORY_URL>
cd hospital-api
```

#### Bước 2: Thiết lập Cơ sở Dữ liệu PostgreSQL
1. Mở công cụ quản trị PostgreSQL (pgAdmin hoặc `psql`) và tạo database mới:
   ```sql
   CREATE DATABASE kmahos;
   ```
2. Sao chép file cấu hình môi trường mẫu:
   ```bash
   cp .env.example .env
   ```
3. Mở file `.env` và kiểm tra lại thông tin kết nối database (Port 5432, Username `postgres`, Password máy bạn).

#### Bước 3: Khởi chạy Backend Spring Boot
Mở cửa sổ dòng lệnh tại thư mục gốc của dự án:
```bash
# Đối với Linux / macOS:
cd hospital-api
chmod +x ./mvnw
./mvnw spring-boot:run

# Đối với Windows (PowerShell / CMD):
cd hospital-api
.\mvnw.cmd spring-boot:run
```
- Backend sẽ tự động đồng bộ Schema cơ sở dữ liệu qua Hibernate và nạp dữ liệu mẫu khởi tạo (`DataInitializer`).
- Backend khởi chạy thành công tại địa chỉ: **`http://localhost:8080`**.

#### Bước 4: Khởi chạy Frontend ReactJS
Mở một cửa sổ dòng lệnh riêng biệt:
```bash
cd hospital-ui

# Cài đặt toàn bộ thư viện phụ thuộc theo lockfile:
npm install

# Khởi chạy Vite Development Server:
npm run dev
```
- Frontend khởi chạy thành công tại địa chỉ: **`http://localhost:5173`**.
- Mở trình duyệt web và truy cập `http://localhost:5173` để trải nghiệm hệ thống.

---

### Cách 2: Khởi chạy bằng Docker Compose (Khuyên dùng)

Dự án đã được đóng gói sẵn toàn bộ các dịch vụ thông qua `docker-compose.yml`:
- `tnt_postgres_db`: Cơ sở dữ liệu PostgreSQL 16.
- `tnt_backend_api`: Spring Boot API (Java 21 Temurin).
- `tnt_frontend_web`: React Web chạy trên nền Web Server Nginx Alpine.
- `tnt_pgadmin`: Giao diện quản lý CSDL trực quan trên nền web.
- `tnt_postgres_backup`: Dịch vụ tự động sao lưu CSDL hàng ngày lúc 02:00 sáng.

Chỉ cần một câu lệnh duy nhất từ thư mục gốc:
```bash
# Sao chép cấu hình môi trường:
cp .env.example .env

# Khởi chạy toàn bộ hệ thống container ngầm:
docker compose up -d --build
```

**Các cổng dịch vụ truy cập sau khi chạy Docker:**
- **Website Bệnh viện (Frontend):** `http://localhost:3000`
- **Backend API:** `http://localhost:8080`
- **pgAdmin Quản lý CSDL:** `http://localhost:5050` (Tài khoản: `admin@tnthospital.vn` / Mật khẩu: `admin`)

---

## 6. TÀI KHOẢN KIỂM THỬ MẪU (DEMO CREDENTIALS)

Dữ liệu khởi tạo mẫu của hệ thống cung cấp sẵn các tài khoản tương ứng với từng chức năng nghiệp vụ (đã được đồng bộ và kiểm thử an toàn):

| Vai trò (Role) | Số điện thoại / Tài khoản | Mật khẩu | Họ và tên | Quyền hạn & Màn hình trải nghiệm |
| :--- | :---: | :---: | :--- | :--- |
| **Quản trị viên (ADMIN)** | `0937050537` | `taizz0537` | Quản Trị Viên (Tài) | Toàn quyền quản trị nhân sự, khoa phòng, ca trực, doanh thu, KPI |
| **Trưởng khoa (HEAD_OF_DEPT)** | `0900000002` | `password123` | PGS. TS Lê Văn Thịnh | Quản lý chuyên khoa Nội, duyệt chuyển khoa, điều phối |
| **Bác sĩ Lâm sàng (DOCTOR)** | `0911000001` | `password123` | BS.CKII Nguyễn Văn Hoàng | Bàn khám bệnh, chẩn đoán ICD-10, kê đơn thuốc, chỉ định CLS |
| **Điều dưỡng tiếp đón (NURSE)** | `0900000004` | `password123` | ĐD. Nguyễn Mai Hoa | Mở quầy tiếp đón, nhận ca trực, phân buồng khám, gọi số LED |
| **Thu ngân viện phí (CASHIER)** | `0900000007` | `password123` | TN. Hoàng Kim Ngân | Quầy thu ngân, thu tiền mặt/thẻ, thanh toán đa hóa đơn |
| **Dược sĩ phát thuốc (PHARMACIST)** | `0900000005` | `password123` | DS. Phạm Thu Trang | Quầy dược, xuất kho thuốc theo lô hạn dùng gần nhất (FEFO) |
| **Kỹ thuật viên Lab (LAB_TECH)** | `0900000006` | `password123` | KTV. Đỗ Quang Huy | Phòng xét nghiệm, tiếp nhận mẫu bệnh phẩm, trả kết quả LIS |
| **Bệnh nhân (PATIENT)** | `0988889999` | `password123` | Nguyễn Văn Bệnh Nhân | Đặt lịch khám trực tuyến, nạp ví, tra cứu sổ khám và đơn thuốc |

---

## 7. HƯỚNG DẪN KIỂM THỬ HỆ THỐNG (TESTING & VERIFICATION)

Hệ thống được trang bị bộ kiểm thử tự động toàn diện từ Unit Test đến End-to-End Integration Test:

### 7.1. Bộ Kiểm thử Nghiệm thu Tiền Triển khai (Final Pre-Deployment Verification)
Kiểm thử tự động toàn diện xuyên suốt 10 chặng nghiệp vụ cốt lõi (không làm bẩn database):
```bash
node test_final_pre_deploy_verification.js
```
- **Kết quả nghiệm thu:** **31/31 Assertions PASSED (100% PASS, 0 FAIL)**.
- **Phạm vi kiểm tra:** Ping máy chủ & danh mục khoa phòng; Đăng nhập RBAC 7 vai trò & chặn 403 Forbidden; Điều dưỡng nhận ca & mở quầy; Đặt lịch khám trực tuyến; Kiosk sảnh tự động phân luồng Người cao tuổi (`UT-`); Bác sĩ mở bệnh án & chỉ định CLS; **Chốt chặn Lab từ chối HTTP 402 khi chưa đóng tiền**; Thu ngân thu tiền mặt & xuất biên lai; Mở khóa phòng Lab tiếp nhận mẫu & trả kết quả; Bác sĩ chẩn đoán & kê đơn thuốc; Kiểm tra tồn kho dược FEFO; Bệnh nhân tra cứu lịch sử bệnh án điện tử; Xuất chuẩn quốc tế HL7 FHIR R4 Bundle; Điều dưỡng đóng quầy an toàn.

### 7.2. Chạy Unit Test Backend Spring Boot
```bash
cd hospital-api
.\mvnw.cmd test
# (Trên Linux: ./mvnw test)
```
- Kết quả: **8/8 Tests PASSED** (0 Failures, 0 Errors).

### 7.3. Kiểm tra Build Production Frontend
```bash
cd hospital-ui
npm run build
```
- Kết quả: Chuyển đổi 1222 modules thành công trong ~5 giây (Vite v6.4.3), hoàn toàn không có lỗi cú pháp hoặc bundling.

### 7.4. Chạy Bộ Kiểm thử Toàn diện Hệ thống (Master E2E System Audit)
Tại thư mục gốc dự án (yêu cầu Backend đang mở tại cổng 8080):
```bash
node test_master_system_audit.js
```
- Kiểm tra toàn bộ 9 phân hệ xuyên suốt: Auth, Patient Profile, Phòng khám, Lịch trực, Đặt hẹn, Kiosk sảnh, Bàn khám bác sĩ, Lab xét nghiệm, Nội trú, AI Chat và Thanh toán VNPay.
- Kết quả: **32/32 Assertions PASSED (100%)**.

### 7.5. Kiểm thử Tải Đồng thời & Chống Race Condition (Concurrency Test)
```bash
node test_load_concurrency.js
```
- Kịch bản: Bắn **50 requests đồng thời** vào 1 phòng khám có sức chứa tối đa `maxCapacity = 5`.
- Kết quả: Đúng 5 lượt được đặt chỗ thành công, 45 lượt bị từ chối với HTTP 400 (Phòng đã kín chỗ), **0 lỗi HTTP 500**. Không xảy ra hiện tượng overbooking.

---

## 8. CƠ CHẾ SAO LƯU & PHỤC HỒI CSDL TỰ ĐỘNG (DISASTER RECOVERY)

Hệ thống cung cấp sẵn các bộ công cụ sao lưu dự phòng CSDL PostgreSQL theo chuẩn an toàn thông tin y tế:

### 8.1. Script Sao lưu Tự động
- **Trên Linux / Cronjob:**
  ```bash
  chmod +x ./scripts/backup-db.sh
  ./scripts/backup-db.sh
  ```
- **Trên Windows Server:**
  ```powershell
  powershell.exe -ExecutionPolicy Bypass -File .\scripts\backup-db.ps1
  ```
- **Đặc điểm:**
  - Sử dụng lệnh `pg_dump -F c` nén định dạng Custom archive tối ưu dung lượng.
  - Tự động sinh file băm chữ ký toàn vẹn **SHA256 checksum** (`.dump.sha256`).
  - Tự động dọn dẹp các bản sao lưu cũ hơn **30 ngày** (Retention Policy) để tránh tràn ổ đĩa.

### 8.2. Cấu hình Cronjob Sao lưu Hàng ngày
Thêm dòng sau vào crontab Linux (`crontab -e`):
```cron
0 2 * * * cd /opt/hospital-api && ./scripts/backup-db.sh >> /var/log/hospital_backup.log 2>&1
```

### 8.3. Khôi phục CSDL khi gặp sự cố (Restore)
```bash
# Trên Linux:
./scripts/restore-db.sh ./backups/backup_kmahos_20261010_111229.dump kmahos

# Trên Windows:
powershell.exe -ExecutionPolicy Bypass -File .\scripts\restore-db.ps1 -BackupFile .\backups\backup_kmahos_20261010_111229.dump
```

---

## 9. CẤU TRÚC THƯ MỤC DỰ ÁN

```
hospital-management-system/
├── hospital-api/                   # BACKEND SPRING BOOT (Java 21)
│   ├── src/main/java/              # Mã nguồn Java (Controllers, Services, Repositories, Entities)
│   │   └── com/hospital/api/
│   │       ├── config/             # Cấu hình Security, CORS, DataInitializer, Swagger
│   │       ├── controller/         # REST API Controllers (@PreAuthorize)
│   │       ├── entity/             # JPA Entities ánh xạ PostgreSQL
│   │       ├── repository/         # Spring Data JPA Repositories
│   │       ├── service/            # Business Logic & FEFO Inventory Service
│   │       └── security/           # JWT Token Provider & Filter
│   ├── src/main/resources/
│   │   └── application.yml         # Cấu hình ứng dụng Spring Boot
│   ├── Dockerfile                  # Dockerfile đa tầng Eclipse Temurin JRE 21
│   └── pom.xml                     # Maven Project Object Model
│
├── hospital-ui/                    # FRONTEND REACTJS (Vite + TailwindCSS)
│   ├── src/
│   │   ├── layouts/                # Bố cục giao diện theo từng Role (Admin, Doctor, Patient,...)
│   │   ├── pages/                  # Các trang chức năng (Kiosk, Bàn khám, Quầy thuốc, Lab,...)
│   │   ├── components/             # Reusable UI Components
│   │   ├── services/               # Axios Instance & API Services
│   │   └── context/                # AuthContext & State Management
│   ├── Dockerfile                  # Dockerfile đa tầng Nginx Alpine
│   ├── nginx.conf                  # Cấu hình Nginx Reverse Proxy
│   └── package.json                # Dependencies & Scripts
│
├── scripts/                        # SCRIPTS QUẢN TRỊ & SAO LƯU HỆ THỐNG
│   ├── backup-db.sh                # Script sao lưu CSDL tự động (Linux)
│   ├── backup-db.ps1               # Script sao lưu CSDL tự động (Windows Server)
│   ├── restore-db.sh               # Script phục hồi CSDL khẩn cấp (Linux)
│   └── restore-db.ps1              # Script phục hồi CSDL khẩn cấp (Windows)
│
├── docker-compose.yml              # Điều phối toàn bộ các dịch vụ Container
├── .env.example                    # File mẫu cấu hình biến môi trường an toàn
├── .gitignore                      # Quy chuẩn loại trừ file rác, file nhạy cảm và build
└── README.md                       # Tài liệu hướng dẫn dự án chính thức
```

---

## 10. CÁC LỖI THƯỜNG GẶP & CÁCH KHẮC PHỤC (TROUBLESHOOTING)

| Lỗi thường gặp | Nguyên nhân | Hướng khắc phục |
| :--- | :--- | :--- |
| **`Connection refused` khi khởi động Backend** | Dịch vụ PostgreSQL chưa chạy hoặc sai Port/Password trong `.env`. | Mở Services Windows / Terminal kiểm tra `pg_isready` hoặc `sudo systemctl status postgresql`. Đảm bảo Port `5432` đang mở. |
| **`Access-Control-Allow-Origin` (CORS Error)** | Frontend chạy trên domain/port chưa nằm trong Whitelist của `CORS_ALLOWED_ORIGINS`. | Mở file `.env`, thêm URL của frontend vào biến `CORS_ALLOWED_ORIGINS` (VD: `http://localhost:5173,http://localhost:3000`). |
| **`duplicate key value violates unique constraint`** | Bị trùng Sequence tự tăng sau khi nạp dữ liệu thủ công. | Hệ thống đã có class `DatabaseSequenceSyncRunner` tự động đồng bộ lại Max ID của PostgreSQL khi khởi động. Khởi động lại API một lần để tự động sửa. |
| **Giao diện hiển thị `NaN đ` tại số dư ví** | Token đã cũ hoặc chưa cập nhật trường `walletBalance`. | Đăng xuất và đăng nhập lại bằng tài khoản bệnh nhân để cấp lại token mới. |
| **`Room fully booked (HTTP 400)` khi đặt khám** | Khung giờ khám đã đạt giới hạn sức chứa tối đa (`maxCapacity`). | Chọn một khung giờ khám tiếp theo hoặc chọn bác sĩ khác trong khoa. |

---

## 11. NGUYÊN TẮC AN TOÀN & BẢO MẬT Y TẾ

1. **Tuyệt đối không commit file `.env` chứa thông tin thật lên GitHub:** Sử dụng `.env.example` làm mẫu và cấu hình biến môi trường trực tiếp trên máy chủ Production.
2. **Khóa bí mật JWT:** Bắt buộc sử dụng chuỗi bí mật ngẫu nhiên tối thiểu 512-bit trên môi trường triển khai thực tế.
3. **Tuân thủ quy định dữ liệu y tế:** Không sử dụng danh tính và bệnh án thật của bệnh nhân cho mục đích thử nghiệm hoặc demo công khai.
4. **Bảo vệ Cổng thanh toán:** Trước khi Go-Live, thay thế thông tin tài khoản VNPay Sandbox bằng tài khoản Merchant thật được đối tác ngân hàng cấp và ký hợp đồng.
5. **Duy trì lịch sao lưu:** Định kỳ kiểm tra file backup trong thư mục `./backups` và chạy thử quy trình khôi phục định kỳ mỗi quý một lần.

---
 
## 12. HƯỚNG DẪN TRIỂN KHAI TRỰC TUYẾN (ONLINE DEPLOYMENT)

Hệ thống được thiết kế tối ưu để triển khai trực tuyến trên máy chủ VPS (Cloud/On-Premise) hoặc các nền tảng PaaS hiện đại.

### 12.1. Phương án Khuyên dùng: VPS Linux (Ubuntu 22.04 / 24.04 LTS) + Docker Compose
1. **Chuẩn bị máy chủ:**
   - Cấu hình đề xuất: 2 vCPU, 4GB RAM, 40GB SSD NVMe (Vietnix, TinoHost, Viettel Cloud, Hetzner, Vultr,...).
   - Cài đặt Docker Engine & Docker Compose Plugin:
     ```bash
     curl -fsSL https://get.docker.com | sh
     sudo usermod -aG docker $USER
     ```
2. **Kéo mã nguồn và cấu hình môi trường:**
   ```bash
   git clone https://github.com/tmonster37/kmahos.git /opt/hospital-system
   cd /opt/hospital-system
   cp .env.example .env
   # Điền thông tin biến môi trường: JWT_SECRET, SPRING_DATASOURCE_URL, CORS_ALLOWED_ORIGINS
   ```
3. **Khởi chạy toàn bộ hệ thống bằng 1 lệnh duy nhất:**
   ```bash
   docker compose up -d --build
   ```
   *Hệ thống tự động kích hoạt 5 dịch vụ container: Nginx Web (Port 3000), Spring Boot API (Port 8080), PostgreSQL 16 (Port 5432), pgAdmin Quản lý CSDL (Port 5050), và Cronjob Auto Backup lúc 02:00 sáng.*

4. **Cấu hình Tên miền & SSL HTTPS:**
   - Trỏ DNS tên miền chính thức về IP VPS thông qua **Cloudflare**.
   - Bật Proxy Cloudflare (Đám mây màu cam) để tự động nhận chứng chỉ HTTPS chuẩn, kích hoạt tường lửa chống DDoS và bật giao thức HTTP/2.

### 12.2. Phương án PaaS / Cloud Serverless (Thử nghiệm & Báo cáo đồ án)
- **Frontend (hospital-ui):** Triển khai lên **Vercel** hoặc **Cloudflare Pages** (Build: `npm run build`, Output: `dist`, biến `VITE_API_URL`).
- **Backend (hospital-api):** Triển khai lên **Railway.app** hoặc **Render.com** (Tự động nhận diện Dockerfile Eclipse Temurin 21).
- **PostgreSQL Database:** Sử dụng dịch vụ cơ sở dữ liệu đám mây **Neon.tech** hoặc **Supabase**.

---
*Dự án phát triển phục vụ công tác chuyển đổi số y tế và quản lý bệnh viện thông minh.*
