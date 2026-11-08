# PROJECT_RULES.md — Quy ước dự án YOUMED TNT HOSPITAL

> Tài liệu này là quick reference cho công việc trong repo. `AGENTS.md`, `CLAUDE.md`, RIPER-5, plan đã duyệt và chỉ dẫn cụ thể của người dùng vẫn là nguồn điều hành chính khi có khác biệt.

## 1. Tổng quan

- **Mục đích:** Hệ thống quản lý bệnh viện gồm đặt lịch, hồ sơ bệnh nhân, khám chữa bệnh, cận lâm sàng, nội trú, dược, viện phí và tích hợp y tế.
- **Người dùng:** Bệnh nhân và nhân viên bệnh viện theo vai trò được cấp.
- **Giai đoạn:** Đang phát triển. Các hạng mục hardening có tài liệu nghiệm thu riêng; điều đó không tự chứng minh hệ thống đang chạy production.
- **Client mobile:** App `hospital-mobile` bằng Expo/React Native đã được lên kế hoạch nhưng chưa được scaffold. Chỉ tạo hoặc sửa app khi phase tương ứng được duyệt thực thi.
- **Môi trường làm việc của AI:** Chỉ local/dev hoặc DB disposable được chỉ định rõ. Không chạy lệnh, migration, seed, kiểm thử ghi dữ liệu hay thao tác nào trên staging/production.

## 2. Công nghệ và phiên bản

- **Backend:** Java 21, Spring Boot 3.4.3, Spring Security 6, Spring Data JPA/Hibernate, Maven.
- **Database:** PostgreSQL 16, schema thay đổi qua Flyway versioned migrations.
- **Web frontend:** React 18.3, Vite 6.1, React Router 7, MUI 6.4, Emotion, Axios.
- **Mobile mục tiêu:** Expo, React Native, TypeScript. Phiên bản và dependencies sẽ được xác nhận lúc thực thi Phase 1; hiện chưa có package mobile.
- **Thanh toán/tích hợp:** PayOS, VNPay, VietQR; các gateway và phản hồi backend là nguồn sự thật của giao dịch.
- **Kiểm thử hiện có:** JUnit qua Maven ở backend; Vitest ở `hospital-ui`.
- **Không tự thêm thư viện hoặc đổi phiên bản.** Chỉ thêm dependency nếu nằm trong plan được duyệt; nếu phát sinh ngoài plan, nêu lý do và chờ người dùng xác nhận.
- Nếu API của thư viện chưa được kiểm chứng, ghi rõ điều chưa chắc và kiểm tra tài liệu/phiên bản đang dùng; không đoán interface.

## 3. Cấu trúc thư mục

```text
hospital-api/src/main/java/com/hospital/api/
  controller/       # HTTP boundary, auth/validation, gọi service
  service/          # business interfaces
  service/impl/     # business logic
  repository/       # truy vấn Spring Data
  entity/           # JPA entities
  dto/request/      # request DTOs và validation
  dto/response/     # response DTOs
  config/ security/ exception/
hospital-api/src/main/resources/db/migration/  # Flyway migrations
hospital-ui/src/
  pages/ components/ layouts/ routes/
  services/ context/ theme/ utils/
hospital-mobile/    # dự kiến; chỉ tạo sau khi duyệt phase
process/context/    # context router và kiến thức dự án
process/features/   # plan, report, reference theo tính năng
```

- Giữ controller mỏng; nghiệp vụ và quyền sở hữu tài nguyên được kiểm tra ở backend service/security, không tin ID hoặc role do client tự gửi.
- Web gọi API qua `hospital-ui/src/services/`; component/page giữ nhiệm vụ UI và trạng thái màn hình.
- Mobile, khi được triển khai, dùng feature modules riêng (`auth`, `profiles`, `booking`, `records`, `billing`, `notifications`) và API client chung; không bê nguyên component MUI hoặc service từ dự án tham khảo.
- `all-*.md` là context router: đọc router trước rồi theo đường dẫn tới tài liệu chuyên sâu có liên quan.

## 4. Lệnh thường dùng

Chạy trong đúng thư mục con, chỉ với cấu hình local/dev:

| Việc | Lệnh |
|---|---|
| Khởi động PostgreSQL local | `docker compose up -d postgres_db` tại repo root |
| Chạy backend | `cd hospital-api; .\mvnw.cmd spring-boot:run` |
| Test backend | `cd hospital-api; .\mvnw.cmd test` |
| Chạy web dev server | `cd hospital-ui; npm run dev` |
| Test web | `cd hospital-ui; npm test` |
| Build web | `cd hospital-ui; npm run build` |

- `hospital-ui/package.json` hiện không khai báo script lint hoặc typecheck; web hiện dùng JavaScript/JSX. Không tự thêm công cụ lint/typecheck để lấp chỗ trống.
- `hospital-mobile` chưa có script. Ghi lệnh mobile vào tài liệu khi scaffold thực tế được duyệt, không suy đoán trước.
- Sau thay đổi code, chạy các kiểm tra phù hợp với phạm vi và plan; báo đúng lệnh/kết quả. Với thay đổi chỉ có tài liệu, không chạy test/build không liên quan.

## 5. Quy tắc viết code

- Java: class/record `PascalCase`, method/field `camelCase`; React component `PascalCase`, biến/hàm `camelCase`.
- Tìm và dùng lại pattern/API/helper hiện có trước khi viết mới. Mỗi file nên có một trách nhiệm rõ; cân nhắc tách file khi vượt khoảng 300 dòng nếu việc tách giúp dễ hiểu hơn.
- Không hard-code secret, host môi trường, giá tiền, nội dung lâm sàng, màu hoặc khoảng cách giao diện. Dùng cấu hình server-side và theme/design tokens hiện có.
- Không để mock bệnh án, kết quả xét nghiệm, thuốc, bác sĩ, lịch khám hoặc giá viện phí làm fallback cho dữ liệu thật. Dữ liệu rỗng phải hiển thị trạng thái rỗng.
- Xử lý loading, empty, error, timeout, retry, null/partial DTO, xung đột slot và trạng thái thanh toán pending/failed/cancelled.
- Backend trả `ApiResponse<T>`; dùng DTO đúng hợp đồng và giữ xử lý lỗi nhất quán. Không expose exception, stack trace hoặc thông tin nội bộ cho client.
- Tiền dùng `BigDecimal` ở backend; client chỉ định dạng số tiền server trả. Thời gian phải phân biệt `LocalDate`, UTC `Instant` và giờ nghiệp vụ bệnh viện `Asia/Ho_Chi_Minh`; không tự đổi timezone khi chưa xét loại dữ liệu.
- Không để `console.log`, `System.out` hoặc log chứa token, secret, dữ liệu định danh hay nội dung bệnh án.

## 6. Phạm vi được phép và cần duyệt

### Mặc định được phép

- Chỉ sửa file nằm trong task/phase được duyệt và các touchpoint được ghi trong plan.
- Tài liệu feature được đặt trong `process/features/{feature}/` theo quy tắc trong `AGENTS.md`.
- Bảo toàn mọi thay đổi chưa commit ngoài phạm vi; không format/rewrite diện rộng.

### Cần được nêu rõ trong task/plan trước khi sửa

- `.env`, secrets, application config, CORS/JWT/auth transport, public API contracts, schema và Flyway migrations.
- CI/CD, Docker/Compose, package manifests/lockfiles, build/release identifiers.
- Tests: chỉ thêm/sửa khi task yêu cầu hoặc plan đã duyệt có bước kiểm thử đó; tuyệt đối không xóa hoặc làm yếu kiểm tra để đạt pass.
- File có ghi chú không được chỉnh sửa và dữ liệu trong database.

## 7. Điều AI không được làm

- Không xóa/disable test, bỏ validation, bypass authentication/authorization, hoặc tắt cảnh báo để che lỗi.
- Không chạy lệnh destructive, migration, seed, backup/restore hoặc data cleanup trên production/staging.
- Không chạy `DROP`, `DELETE` không có điều kiện, `rm -rf`, `git push --force`, `--no-verify` hay lệnh tương tự.
- Không tự thêm dependency, đổi public API, schema, token transport hoặc quyền truy cập ngoài plan đã duyệt.
- Không ghi secret vào source, app bundle, log, fixture, screenshot, report hoặc commit.
- Không refactor, đổi tên hoặc định dạng lại code ngoài phạm vi nhiệm vụ.
- Không gửi email, chat hay thông điệp tới người khác nếu chưa được người dùng cho phép cụ thể.

## 8. Bảo mật

- Mọi endpoint phải xác thực và kiểm tra quyền với tài nguyên cụ thể; ID do client cung cấp luôn không đáng tin.
- Validate request tại boundary bằng DTO/Bean Validation; dùng query tham số hóa qua repository/ORM.
- Không dùng endpoint public lookup để thay thế truy cập có xác thực vào hồ sơ bệnh nhân.
- Web hiện dùng Cookie-Only với `HttpOnly` cookie; không đưa JWT trở lại `localStorage`.
- Mobile theo kiến trúc đã duyệt dùng Bearer token do backend cấp và OS secure storage; không lưu trong AsyncStorage/Realm. Token hết hạn/401 thì xóa session và đăng nhập lại; không tự thêm refresh-token API.
- `VITE_*` và `EXPO_PUBLIC_*` là dữ liệu công khai trong client bundle; chỉ để URL/cấu hình không bí mật. Secret chỉ ở backend environment hoặc secret store.
- Mật khẩu phải dùng encoder chuẩn đã có; không tự chế mã hóa.
- Tiền và quyền thanh toán do server xác định. Bill chưa đối soát (`UNRECONCILED`) không có payable amount và không được checkout.

## 9. Database

- Thay đổi schema qua migration Flyway mới, không sửa tay database hoặc chỉnh migration đã được áp dụng.
- Trước khi đề xuất migration, nêu ảnh hưởng đến dữ liệu cũ, khả năng tương thích deploy và cách rollback.
- Mọi thay đổi nhiều bảng cần transaction phù hợp; không chạy thao tác ghi dữ liệu ngoài dev/disposable DB.
- Giữ độ chính xác tiền tệ (`BigDecimal`), khóa ngoại, ownership và soft-delete conventions hiện có.
- Không bật schema auto-update hoặc thêm startup DDL; tuân thủ cấu hình validate/migration hiện hành.

## 10. Quy trình làm việc

1. Đọc `AGENTS.md`, `CLAUDE.md`, `process/context/all-context.md` và các tài liệu sâu liên quan; kiểm tra plan đang hoạt động trước khi tạo plan trùng.
2. Với công việc lớn, theo RIPER-5: RESEARCH → INNOVATE → PLAN → EXECUTE, yêu cầu chuyển pha rõ ràng; không tự bắt đầu EXECUTE chỉ vì đã có plan.
3. Với chương trình nhiều pha, chỉ làm một pha tại một thời điểm; mỗi pha cần research, execution approval, implementation, validation và report theo umbrella plan.
4. Chia thay đổi nhỏ, có thể review; không sửa các file bẩn ngoài touchpoints đã duyệt.
5. Nếu mắc cùng một vấn đề sau hai lần thử, dừng sửa thêm; nêu bằng chứng, nguyên nhân còn nghi ngờ và các lựa chọn tiếp theo.

## 11. Cách báo cáo

Sau mỗi nhiệm vụ, báo cáo:

- **Đã thay đổi:** file và nội dung chính.
- **Đã kiểm tra:** lệnh và kết quả thực tế; ghi rõ nếu không chạy.
- **Chưa làm/chưa chắc:** phần còn thiếu và giả định.
- **Rủi ro:** tác động có thể xảy ra ngoài phạm vi.
- **Cần người dùng quyết định:** câu hỏi còn mở.

Không tuyên bố test/build đã pass nếu chưa chạy lệnh tương ứng.
