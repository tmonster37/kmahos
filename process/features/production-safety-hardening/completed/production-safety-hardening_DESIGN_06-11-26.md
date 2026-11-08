# Thiết kế: An toàn dữ liệu và sẵn sàng production

> **Trạng thái:** Đã duyệt (Approved) — Đã lập Kế hoạch Mẹ & 3 Kế hoạch Giai đoạn  
> **Ngày:** 06-11-2026 (Cập nhật: 07-11-2026)  
> **Phạm vi:** `hospital-api`, `hospital-ui` và quy trình phát hành

## Mục tiêu

Giảm các rủi ro được xác nhận trong rà soát: runner có thể ghi dữ liệu lâm sàng/tồn kho mẫu lúc khởi động; rule triage có thể xếp dấu hiệu đáng lo là `ROUTINE`; credential DB mặc định nằm trong cấu hình; schema có thể tự sửa khi chạy; lỗi nội bộ có thể lộ ra client; JWT được lưu trong `localStorage`; và fixture demo có mặt trong luồng bác sĩ.

## Ngoài mục tiêu / điều không làm

- Không tự chọn chính sách triage, ngưỡng cấp cứu hoặc hành vi lâm sàng khi chưa có phê duyệt của người phụ trách chuyên môn.
- Không chạy migration hoặc thay schema trên production trong chương trình này.
- Không thực hiện refactor diện rộng ngoài phần cần thiết để xử lý các rủi ro đã xác nhận.

## Phương án

1. **Chặn một số rủi ro trước mắt:** nhanh giảm rủi ro dữ liệu và secret, nhưng để lại vấn đề API/frontend.
2. **Hardening toàn bộ trong một lượt:** bao quát hơn, nhưng thay đổi rộng và khó khoanh vùng hồi quy.
3. **Ba giai đoạn có cổng nghiệm thu — đã chọn:** dữ liệu lâm sàng trước, cấu hình/migration tiếp theo, API/frontend/quy trình sau cùng. Chia giai đoạn để xử lý rủi ro có hậu quả cao trước và cô lập hồi quy để review riêng. Mỗi giai đoạn được xác minh trước khi mở giai đoạn kế tiếp.

## Phạm vi theo giai đoạn

### 1. An toàn dữ liệu lâm sàng

- Cô lập các seeder lâm sàng và tồn kho khỏi mọi môi trường có thể dùng dữ liệu thật.
- Không cho giao diện ghi dịch vụ/kết quả giả khi API lỗi hoặc danh mục rỗng.
- Coi dữ liệu bệnh nhân/kho thật là có thể tồn tại. Giữ triage ở trạng thái tắt hoặc hiển thị rõ là không dùng để quyết định lâm sàng cho tới khi một người phụ trách lâm sàng có thẩm quyền duyệt mục đích sử dụng và chính sách. Không tự thiết kế quy tắc y khoa; chưa cần biết tên người phụ trách để lập kế hoạch.

**Cổng:** xác minh bằng test trên DB cô lập rằng cấu hình production không ghi dữ liệu mẫu; xác nhận chủ sở hữu, mục đích và chính sách triage. Nếu chưa có phê duyệt, triage tiếp tục bị tắt hoặc không quyết định lâm sàng.

### 2. Credential và toàn vẹn schema

- Bỏ credential DB mặc định khỏi cấu hình được commit; production thiếu secret phải dừng an toàn.
- Giới hạn script kiểm toán DB vào DB disposable được chỉ định rõ và dọn fixture sau khi chạy.
- Bắt đầu bằng việc lập baseline schema và kiểm kê backup/restore/rollback trên một bản sao cô lập. Sau khi review các kết quả đó mới chọn công cụ migration; không giả định công cụ hoặc áp dụng migration production trước bước review.
- Sau khi baseline được chấp thuận, dùng Hibernate `validate` trong production và bỏ DDL thay đổi schema khỏi startup runner.
- Chỉ thử migration trên DB cô lập; không chạy trên production trong giai đoạn này.

**Cổng:** baseline cùng bằng chứng backup/restore/rollback được review; công cụ migration được chọn sau review; migration có phiên bản và kiểm tra thành công trên DB cô lập. Không áp dụng lên production trong chương trình này.

### 3. API, frontend và quy trình

- Làm sạch phản hồi lỗi/health để không lộ exception hoặc chi tiết DB.
- Kiểm kê trước mọi client đang dùng token/header/cookie và tương thích hiện tại. So sánh tác động cookie-only và hybrid, rồi chờ người dùng chọn phương án; chưa đổi token transport hoặc API contract trước lựa chọn đó.
- Giới hạn mẫu PACS/dịch vụ ở demo; cập nhật hướng dẫn, phiên bản stack và kiểm tra tự động theo đúng checkout.

**Cổng:** có danh sách client và phân tích tương thích; người dùng chọn token transport trước khi thay đổi. Review hợp đồng API/auth; hồi quy cho lỗi, phân quyền và dữ liệu demo; tài liệu trỏ tới đường dẫn tồn tại.

## Giới hạn và giả định an toàn

- Tạm coi ứng dụng có thể được trỏ tới DB bệnh nhân hoặc kho thật; nếu chưa xác nhận, fail-closed là mặc định.
- Không chạy migration, sửa dữ liệu, rotate secret hoặc thay đổi luồng clinical trong giai đoạn lập kế hoạch.
- Không ghi secret hay dữ liệu bệnh nhân vào tài liệu, log hoặc test output.
- Giữ nguyên thay đổi chưa commit hiện có; phạm vi triển khai sau này phải tách rõ tệp của chương trình này.
- Không tái cấu trúc các trang lớn hoặc thay hợp đồng API ngoài phần cần thiết cho các rủi ro đã xác nhận.

## Quyết định còn mở

- Môi trường nào dùng DB bệnh nhân/kho thật và ai sở hữu cấu hình phát hành? Mặc định an toàn hiện tại là coi dữ liệu thật có thể tồn tại.
- Triage là demo hay hỗ trợ quyết định cho bệnh nhân; ai có thẩm quyền duyệt chính sách và cách xử lý trường hợp chưa chắc chắn? Nếu chưa có quyết định, triage không được đưa ra quyết định lâm sàng.
- Baseline schema và tình trạng backup/restore/rollback trên bản sao cô lập là gì? Chỉ sau review mới chọn công cụ migration.
- Những client nào phụ thuộc token transport hiện tại; người dùng chọn cookie-only hay hybrid sau khi thấy phân tích tương thích.
- CI, staging, backup và monitoring có được cung cấp ngoài repo không?

## Tiêu chí chấp nhận

- Không có đường khởi động production nào tự thêm ghi chú/sinh hiệu/kết quả xét nghiệm/tồn kho giả.
- Production không tự thay đổi schema ngoài migration có phiên bản; thiếu secret thì dừng.
- Endpoint công khai không trả exception nội bộ; phương án token có kiểm thử CSRF/CORS tương ứng.
- Triage chỉ được dùng với bệnh nhân sau khi có duyệt chuyên môn và tiêu chí an toàn được kiểm thử.
- Quy trình/test được mô tả đúng bằng tài liệu và đường dẫn hiện có.

## Rủi ro và khoảng trống

Các kế hoạch hoàn thành trước đây ghi rằng một số hạng mục migration/token đã xử lý, nhưng mã hiện tại vẫn có `ddl-auto: update`, DDL trong startup runner và lưu JWT trong `localStorage`; vì vậy cần xác minh từ mã hiện tại thay vì tin trạng thái kế hoạch cũ. `AGENTS.md` tham chiếu các thư mục protocol/agent và hướng dẫn test không có trong checkout. Checkout cũng đang có thay đổi chưa commit; chưa chạy test/build trong lượt rà soát. CI bên ngoài, staging, backup và monitoring chưa được xác minh.

## Các quyết định an toàn sau builder check

- Coi DB thật là có thể được dùng; triage giữ tắt hoặc không quyết định lâm sàng cho đến khi người phụ trách lâm sàng có thẩm quyền duyệt mục đích và chính sách. Không cần nêu tên người đó để tiếp tục lập kế hoạch.
- Pha schema bắt đầu bằng baseline và kiểm kê backup/restore/rollback trên bản sao cô lập; chưa chọn công cụ migration và không giả định có production apply trước review.
- Pha token bắt đầu bằng kiểm kê client và phân tích tương thích; chưa đổi token transport/API contract cho tới khi người dùng chọn cookie-only hoặc hybrid.
