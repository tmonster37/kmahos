# Thiết kế ứng dụng mobile cho bệnh nhân

> **Trạng thái:** Đã được người dùng duyệt  
> **Ngày:** 07-11-2026  
> **Dự án:** `hospital-mobile` dùng backend của repo hiện tại

## Ý định

Xây ứng dụng iOS/Android cho bệnh nhân bằng Expo và TypeScript, kết nối tới `hospital-api`. Dự án `TheDuckHospitalReactNative` là tham khảo cho cách tổ chức điều hướng và các luồng bệnh nhân; không sao chép nguyên mã nguồn, dịch vụ API hay cấu hình xác thực của dự án đó.

Người dùng chính là bệnh nhân hoặc người quản lý hồ sơ gia đình. App giúp họ đặt lịch, theo dõi tiến trình khám, xem dữ liệu sức khỏe do bệnh viện ghi nhận và thanh toán viện phí.

## Quyết định đã chốt

- Tạo app Expo/TypeScript mới, dùng dự án tham khảo cho ý tưởng UX/luồng bệnh nhân.
- Bao gồm thanh toán online PayOS/VietQR trong MVP, quay lại app và xác minh trạng thái qua backend.
- Bản thiết kế này được người dùng duyệt ngày 07-11-2026.

## Mục tiêu

- Tạo app mobile riêng ở `hospital-mobile/`, cùng cấp với `hospital-api/` và `hospital-ui/`.
- Tái sử dụng API hiện có cho đăng nhập, hồ sơ, đặt lịch, bệnh án, thanh toán và thông báo trong app.
- Giới hạn dữ liệu theo hồ sơ mà tài khoản bệnh nhân được quyền truy cập.
- Hiển thị đúng dữ liệu từ backend; có trạng thái tải, rỗng và lỗi rõ ràng.
- Tái hiện những ý tưởng hữu ích trong app tham khảo: tab bệnh nhân, đặt lịch theo bác sĩ/ngày, hồ sơ, hóa đơn và lịch sử khám.

## Ngoài mục tiêu của MVP

- Không đưa màn hình quản trị, bác sĩ, thu ngân hoặc vận hành bệnh viện vào app bệnh nhân.
- Không xây lại nghiệp vụ backend đã có hoặc gọi các route cũ của app tham khảo.
- Không đưa chat, tư vấn AI/triage, quản lý nội trú, ví riêng, nhắc thuốc và push notification vào MVP.
- Không dùng dữ liệu lâm sàng hoặc giá viện phí giả làm fallback.

## Tiêu chí chống thất bại

- App không được xem hoặc sửa hồ sơ bệnh nhân khác do đổi ID trên client.
- App không tự tính số tiền phải trả hoặc tin số tiền client gửi lên.
- Không lưu access token trong AsyncStorage, Realm hoặc log. Không đưa secret vào bundle mobile.
- Không gọi API tra cứu công khai để thay thế endpoint có xác thực cho bệnh nhân đã đăng nhập.
- Không thay đổi cơ chế xác thực dùng chung của web trong phạm vi app này nếu chưa qua cổng chọn token transport của chương trình `production-safety-hardening`.

## Hiện trạng và ràng buộc

- Backend dùng Spring Boot và trả `ApiResponse<T>`. Hợp đồng hiện có gồm `/api/auth/*`, `/api/patient-profiles/*`, `/api/bookings/*`, `/api/clinical/records/*`, `/api/payment/*` và `/api/utilities/*`.
- Web bệnh nhân đã có các luồng hồ sơ, đặt lịch, lịch sử khám, hóa đơn và thông báo; có thể dùng làm tham khảo nghiệp vụ, nhưng MUI/web components không được mang nguyên sang React Native.
- App tham khảo dùng React Native CLI 0.73.2 cùng React Navigation, Redux Toolkit, Axios, Realm, NativeWind/Gluestack và Firebase Messaging. Đây là cấu hình cũ và có các route backend khác; chỉ dùng luồng và bố cục làm tham khảo.
- Phase 3 của `production-safety-hardening` hiện đã hoàn tất. Gate 3A chọn Cookie-Only cho trình duyệt; backend vẫn trả JWT trong response đăng nhập và chấp nhận Bearer token cho CLI/mobile. Mobile sẽ dùng Bearer token và lưu bằng OS secure storage; token hết hạn phải đưa về luồng đăng nhập lại vì chưa thấy refresh-token API. Không thay đổi cơ chế cookie-only của web trong feature này.
- Hợp đồng API hiện tại ghi `/api/doctors` là route quản trị. Không dùng route quản trị để lấy danh sách cho bệnh nhân. Endpoint lịch theo khoa/ngày và dữ liệu đủ để chọn bác sĩ/slot phải được xác minh từ mã và response thực tế trước khi hoàn tất luồng booking.
- API `/api/payment/my-pending-bills` hiện tổng hợp bill từ booking và trả `billId` tổng hợp; `PaymentController` nhận amount/type/description từ client khi tạo link. Chưa coi các mã bill tổng hợp hoặc cách phân bổ khoản đã trả giữa khám/xét nghiệm/thuốc là hợp đồng thu tiền ổn định. Pha 0 phải xác minh và chuẩn hóa ID, số dư theo loại phí, quyền sở hữu và số tiền server-side trước khi Pha 3 bật checkout online. Giao dịch lịch sử không có dấu loại phí phải được coi là `UNRECONCILED`; không tự phân bổ lại và phải chặn checkout của số dư bị ảnh hưởng cho tới khi có đối soát dựa trên nguồn dữ liệu hoặc xác nhận kế toán.
- Các endpoint bệnh án, hồ sơ liên kết, reminder, tra cứu công khai và PDF đơn thuốc cần rà soát quyền sở hữu/riêng tư trước khi app hiển thị dữ liệu thật.
- Repo hiện có nhiều thay đổi chưa commit. Mọi triển khai tiếp theo phải chỉ chạm `hospital-mobile/` và các backend touchpoint được nêu rõ, không ghi đè thay đổi sẵn có.

## Các hướng đã cân nhắc

1. **Tạo app Expo mới và dùng app tham khảo làm mẫu UX — chọn.** Tách sạch dependencies và API contract; dễ giới hạn app ở bệnh nhân. Đổi lại cần dựng lại màn hình/điều hướng cần dùng.
2. **Sao chép toàn bộ app mẫu rồi gỡ dần.** Có nhiều màn hình sẵn, nhưng kéo theo cấu hình cũ, màn quản trị, dịch vụ API không tương thích và cách lưu token không phù hợp.
3. **Chép riêng các màn bệnh nhân vào app mới.** Có thể giữ một phần giao diện, nhưng tạo chi phí thích nghi component và dependency mà không tái sử dụng được backend service.

## Phạm vi MVP đề xuất

1. **Tài khoản:** đăng nhập bệnh nhân, đăng xuất, xử lý phiên hết hạn. Đăng ký chỉ bật nếu quy trình tạo tài khoản bệnh nhân hiện có được xác nhận là phù hợp.
2. **Trang chủ và hồ sơ:** xem hồ sơ bản thân/người thân, tạo/cập nhật hồ sơ và trạng thái các lịch sắp tới.
3. **Đặt lịch:** duyệt khoa, bác sĩ và slot hợp lệ; giữ/chọn slot, xác nhận booking, xem lịch sử và hủy lịch theo quy tắc backend.
4. **Theo dõi lượt khám:** xem mã lịch, thời gian, trạng thái thanh toán/check-in và số thứ tự nếu API trả về; không suy diễn trạng thái thiếu dữ liệu.
5. **Bệnh án:** xem hồ sơ khám, kết quả xét nghiệm và đơn thuốc mà tài khoản được phép truy cập; trạng thái chưa có dữ liệu phải hiển thị rõ.
6. **Viện phí:** xem khoản cần nộp và lịch sử giao dịch; hoàn tất thanh toán online qua PayOS/VietQR trong app; quay lại app và xác nhận trạng thái bằng API backend. Số tiền cuối cùng phải do server xác định/kiểm chứng; không coi riêng redirect/callback từ client là bằng chứng thanh toán thành công.
7. **Thông báo trong app:** đọc danh sách và đánh dấu đã đọc qua `/api/utilities/notifications`. Push notification để giai đoạn sau vì chưa thấy API đăng ký thiết bị trong hợp đồng hiện có.

## Kiến trúc dự kiến

- App độc lập `hospital-mobile/`, Expo + TypeScript.
- Một API client duy nhất đọc URL môi trường, chuẩn hóa `ApiResponse<T>`, thêm thông tin xác thực theo quyết định Gate 3A và xử lý lỗi mạng/401.
- Chia mã theo tính năng bệnh nhân (auth, profiles, booking, records, billing, notifications); tách màn hình, service API và kiểu dữ liệu.
- Không chia sẻ component MUI. Có thể chuyển hóa ý tưởng từ `PatientBottomNavigator`, luồng chọn bác sĩ/ngày và bố cục hồ sơ/hóa đơn của app mẫu.
- Dữ liệu clinical không được cache offline ở MVP. Token native được lưu trong vùng lưu trữ bảo mật của nền tảng; không dùng AsyncStorage, Realm hoặc localStorage. Khi token hết hạn/nhận 401, xóa phiên và yêu cầu đăng nhập lại; không thêm refresh-token endpoint trong MVP.

## Lộ trình nhiều pha

### Pha 0 — Sẵn sàng API và xác thực

- Xác minh mobile dùng Bearer token theo backend sau khi Gate 3A đã chọn Cookie-Only cho browser; xác nhận thời hạn token 24 giờ, secure storage, logout và xử lý 401.
- Xác minh endpoint patient-safe cho danh sách bác sĩ/lịch, quyền hồ sơ bệnh án, profile linking và reminder.
- Chuẩn hóa bill identity, balance/category allocation, ownership và amount checks phía server cho tạo thanh toán; chặn mọi cách dùng giá fallback ở app. Không đoán cách phân bổ giao dịch lịch sử thiếu category marker; đánh dấu chưa đối soát và chặn checkout bị ảnh hưởng.
- Ghi rõ API còn thiếu và chỉ bổ sung backend tối thiểu sau khi review phạm vi. Nếu bill identity/balance không thể được chuẩn hóa an toàn trong pha này, giữ checkout ở trạng thái BLOCKED dù màn danh sách hóa đơn có thể phát triển bằng dữ liệu hợp đồng đã xác minh.

### Pha 1 — Nền tảng app

- Tạo Expo TypeScript project, điều hướng, cấu hình môi trường dev/staging/prod, API client, session flow và thành phần UI cơ sở.
- Xác minh kết nối với backend staging/development mà không dùng dữ liệu bệnh nhân thật trong fixture.

### Pha 2 — Hồ sơ và đặt lịch

- Hoàn thiện hồ sơ bản thân/người thân, duyệt lịch, đặt/hủy và theo dõi tiến trình.
- Kiểm tra mapping dữ liệu/luồng với booking API đích; không sao chép route của app tham khảo.

### Pha 3 — Bệnh án và viện phí

- Thêm lịch sử khám, kết quả, đơn thuốc, khoản cần thanh toán, tạo thanh toán và lịch sử giao dịch.
- Chỉ sau khi Pha 0 xác minh billId ổn định, số dư và phân bổ phí: kiểm tra quyền xem, dùng bill-scoped server amount, cấu hình return link cho PayOS/VietQR và xác minh giao dịch bằng status API khi app được mở lại.

### Pha 4 — Hoàn thiện và phát hành

- Rà soát Android/iOS, accessibility, lỗi/mạng chậm, cấu hình build và hướng dẫn phát hành.
- Sau MVP, xem xét push APNs/FCM và các deep links ngoài luồng thanh toán; chỉ thêm khi có endpoint, cấu hình và tiêu chí nghiệp vụ rõ ràng.

## Tiêu chí nghiệm thu ở cấp sản phẩm

- Bệnh nhân đăng nhập và chỉ xem hồ sơ/bệnh án thuộc quyền của mình.
- Booking hiển thị dữ liệu lịch do backend cấp; app không mở route quản trị.
- Không có dữ liệu bệnh nhân, chẩn đoán, giá tiền hoặc tên nhân viên giả để lấp chỗ trống API.
- Thanh toán dùng khoản thu do server xác định và app hiển thị trạng thái từ API.
- App có loading/empty/error/retry states và không ghi token/dữ liệu y tế vào log.
- MVP chạy được trên Android và iOS; lựa chọn công cụ build/release cụ thể được xác định trong kế hoạch triển khai.

## Quyết định mở cần xử lý trong Pha 0

- API logout có thu hồi JWT hay chỉ xóa cookie; hành vi native cần tương thích với response backend.
- API chính xác cho duyệt bác sĩ/slot và response fields cần cho màn chọn lịch.
- Mức độ bao phủ kết quả xét nghiệm/đơn thuốc nào đủ cho MVP, dựa trên quyền và response hiện có.
- Cách cấu hình provider return URL/deep link theo nền tảng và tần suất kiểm tra status API khi app resume; mục tiêu quay lại app và xác nhận giao dịch trong MVP đã được người dùng chọn.
- Hợp đồng bill ID/số dư ổn định cho thu online và quy trình xử lý giao dịch lịch sử thiếu category marker; mặc định block checkout khi không thể đối soát từ nguồn tin cậy.
- Android+iOS cùng lúc là mục tiêu sản phẩm; việc dev/test trên Windows và cách tạo iOS build cần được chốt ở kế hoạch.

## Phần để người lập kế hoạch quyết định

Thư viện điều hướng/state/UI, cấu trúc component chi tiết, command/version scaffold Expo hiện hành, chiến lược build phù hợp môi trường CI, và thứ tự tiểu nhiệm vụ trong từng pha. Các quyết định này không được làm thay đổi phạm vi MVP hoặc cổng bảo mật trong thiết kế.
