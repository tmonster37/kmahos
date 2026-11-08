# Thiết kế: Cải tiến giao diện toàn hệ thống theo luồng công việc

> **Trạng thái:** Bản nháp — chờ người dùng duyệt  
> **Ngày:** 08-11-2026  
> **Phạm vi:** Web bệnh nhân, ứng dụng bệnh nhân, cổng nhân viên và quản trị TNT Hospital

## Ý định

Cải thiện cách người dùng tìm thông tin, theo dõi trạng thái và hoàn thành các công việc thường gặp trên web và ứng dụng TNT Hospital. Dự án The Duck Hospital được dùng làm tham khảo về cách bố trí lịch, hàng đợi, hồ sơ và bàn làm việc theo vai trò. Hệ màu, logo, dữ liệu và quy tắc nghiệp vụ vẫn thuộc hệ thống TNT.

## Hiện trạng và lý do

- Web dùng React, Vite, React Router và MUI; đã có bố cục điều hướng theo vai trò.
- Ứng dụng di động dùng Expo/React Native cho bệnh nhân. Trang chủ hiện là danh sách tác vụ; các màn hình đặt lịch đi qua nhiều bước.
- Bộ nhận diện và token web/mobile đã có hợp đồng thiết kế được duyệt. Báo cáo đồng bộ ghi nhận hoàn tất.
- Các ảnh tham khảo thể hiện lịch chọn ngày/giờ, trang hồ sơ, tiếp đón/hàng đợi, bàn khám và màn hình quản trị. Đây là gợi ý về thứ bậc thông tin và tổ chức thao tác.
- Một số màn hình tham khảo có dữ liệu mẫu hoặc cách hiển thị cũ. Prototype đã dùng chỗ giữ chỗ, không phản ánh dữ liệu hệ thống.

## Mục tiêu

- Làm nổi bật thao tác chính và trạng thái kế tiếp trong từng luồng.
- Giúp bệnh nhân chọn lịch, xem hồ sơ và theo dõi lịch dễ hơn trên web và app.
- Giúp nhân viên quầy, bác sĩ, kỹ thuật viên xét nghiệm, thu ngân, dược sĩ, trưởng khoa và quản trị viên quét thông tin nhanh hơn trong phạm vi vai trò.
- Giữ hệ nhận diện TNT nhất quán trên web và app, với mật độ thông tin phù hợp từng thiết bị.
- Cải tiến lần lượt theo từng luồng công việc, đánh giá từng pha trước khi mở rộng.

## Ngoài phạm vi

- Thay đổi API, schema, xác thực, phân quyền, trạng thái nghiệp vụ, quy trình thanh toán, dữ liệu lâm sàng hoặc quy tắc tồn kho.
- Thay React/MUI hoặc Expo/React Native, thay logo, đổi thương hiệu, thêm dependency lớn.
- Thêm chức năng từ dự án tham khảo như ví riêng, nhắc thuốc hoặc màn hình nhân viên trên app bệnh nhân.
- Làm mới mọi màn hình cùng lúc.

## Điều sẽ làm cho kết quả thất bại

- Màn hình trình bày số liệu, bác sĩ, mức phí, trạng thái thanh toán hoặc nội dung lâm sàng giả như dữ liệu thật.
- Màu sắc, trạng thái hoặc nhãn mới khiến người dùng hiểu sai ý nghĩa nghiệp vụ.
- Hành động xuất hiện với vai trò không có quyền, hoặc quy trình thay đổi vì bố cục mới.
- Màn hình mobile làm mất thao tác chính khi phóng to chữ, dùng bàn phím hoặc vùng an toàn của thiết bị.

## Ràng buộc

- Giữ các token và quy tắc trong [brand-design-contract.md](../../../process/features/patient-mobile-app/references/brand-design-contract.md): primary TNT teal, logo teal, coral chỉ là điểm nhấn thương hiệu, màu trạng thái giữ đúng ngữ nghĩa, Inter, tương phản văn bản và vùng chạm tối thiểu 44 dp.
- Web tiếp tục dùng component MUI và adapter token hiện tại; app tiếp tục dùng component React Native và token adapter của app.
- Backend là nguồn chuẩn cho hồ sơ, lịch, trạng thái khám và viện phí. Giao diện chỉ trình bày dữ liệu backend trả về, cùng trạng thái tải, rỗng và lỗi phù hợp.
- Dùng bố cục tham khảo làm cảm hứng; giữ luồng, quyền và ranh giới dữ liệu hiện hành của TNT.
- Repo đang có nhiều thay đổi chưa commit. Trước mỗi pha cần kiểm tra tình trạng tệp và chỉ thay đổi các điểm đã được duyệt.
- Báo cáo mobile cho biết các pha 5–9 còn nằm trong thư mục active; trước khi chạm màn hình app phải đối chiếu trạng thái phát hành thực tế. Kế hoạch đồng bộ thương hiệu cũng còn ở active dù báo cáo ghi PASSED.

## Các hướng đã cân nhắc

| Hướng | Ưu điểm | Đánh đổi |
|---|---|---|
| Chuẩn hóa khung và thành phần dùng chung trước | Tính nhất quán xuất hiện sớm trên nhiều vai trò. | Phạm vi thay đổi rộng; lợi ích ở các tác vụ cụ thể đến chậm. |
| **Cải tiến từng luồng thường dùng — được chọn** | Tập trung vào công việc thực tế, dễ đánh giá từng phân hệ và phát hiện vấn đề trong ngữ cảnh. | Giao diện giữa các phân hệ chỉ đồng nhất dần theo từng pha. |
| Chuẩn hóa nền tối thiểu rồi thử một luồng trước | Kiểm tra nhanh các quy tắc dùng chung bằng một màn hình đại diện. | Chuyển trọng tâm khỏi cải tiến từng luồng mà người dùng đã chọn. |

**Quyết định:** Người dùng chọn hướng thứ hai: cải tiến luồng thường dùng, từng phân hệ một. Các quy tắc hoặc component dùng chung sẽ được rút ra khi cần trong mỗi pha, không tạo một đợt làm mới toàn cục riêng. Người dùng cũng đồng ý với mockup và thứ tự pha dưới đây.

## Hướng giao diện

- TNT Hospital giữ phong cách y tế rõ ràng, bình tĩnh, dễ đọc; nền sáng, bề mặt trắng, tiêu đề và hành động có phân cấp rõ.
- Màu teal primary dùng cho hành động chính; trạng thái tiếp tục dùng màu ngữ nghĩa đã có. Tránh gradient xanh dương và cách trang trí của hệ nhận diện The Duck.
- Bệnh nhân được ưu tiên lời gọi hành động và bước tiếp theo; nhân viên được ưu tiên dữ liệu vận hành, trạng thái và hành động được phép.
- Mỗi vai trò giữ điều hướng riêng. Không ép dashboard quản trị và bàn khám dùng cùng mật độ hoặc cấu trúc nội dung.
- Màn hình rộng và hẹp được thiết kế theo cách dùng phù hợp: bảng có thể chuyển thành danh sách trên màn hình nhỏ; app giữ vùng chạm và thanh điều hướng native.

## Phạm vi theo nhóm luồng

1. **Bệnh nhân web và app:** trang chủ/tác vụ, chọn chuyên khoa, ngày/giờ và bác sĩ, hồ sơ, lịch hẹn. Lịch và trạng thái phải đến từ API hiện có.
2. **Tiếp đón và điều dưỡng:** tra cứu/chọn đúng hồ sơ, tiếp nhận, vé quầy, hàng đợi, trạng thái phòng và các tác vụ chăm sóc.
3. **Bác sĩ, xét nghiệm và nội trú:** người bệnh được chọn, thông tin lâm sàng liên quan, chỉ định, kết quả và trạng thái cần theo dõi.
4. **Thu ngân và dược:** khoản cần xử lý, trạng thái đối soát, biên lai và bước cấp phát thuốc theo quy tắc hiện có.
5. **Trưởng khoa và quản trị:** điều hướng, bộ lọc, bảng nhân sự/lịch trực, KPI và biểu đồ dựa trên dữ liệu hệ thống.

App native hiện dành cho bệnh nhân; các vai trò vận hành đang thuộc web. Không có mục tiêu tạo app nhân viên trong thiết kế này.

## Thứ tự pha đề xuất

Thứ tự này được người dùng xác nhận ngày 08-11-2026. App mobile được phối hợp với kế hoạch phát hành hiện tại.

1. **Đặt lịch bệnh nhân trên web.**
2. **Đặt lịch bệnh nhân trên app, theo lịch phát hành mobile hiện tại.**
3. **Tiếp đón và hàng đợi:** tra cứu, xác nhận hồ sơ, hiển thị vé quầy và thao tác điều phối.
4. **Bác sĩ, xét nghiệm và nội trú:** làm rõ thông tin ngữ cảnh và trạng thái công việc.
5. **Thu ngân và dược:** làm rõ các trạng thái thanh toán/đối soát và cấp phát.
6. **Trưởng khoa và quản trị:** bảng, bộ lọc, chỉ số và phân cấp menu.

Thứ tự có thể đổi khi người dùng duyệt tài liệu. Mỗi pha tập trung vào một nhóm luồng; các màn hình khác giữ nguyên cho tới pha tương ứng.

## Tiêu chí chấp nhận

- Mỗi màn hình có tiêu đề, trạng thái hiện tại và hành động chính dễ nhận biết.
- Tải, rỗng, lỗi, thành công và bị vô hiệu hóa được trình bày rõ; không suy diễn khi API thiếu dữ liệu.
- Mọi hành động giữ đúng vai trò, API và quy tắc nghiệp vụ đang có.
- Bảng, bộ lọc, biểu mẫu và điều hướng vẫn hoạt động trên desktop và màn hình nhỏ; app hỗ trợ vùng chạm tối thiểu 44 dp và không cắt nội dung khi phóng to chữ.
- Dùng màu và token TNT hiện có; màu trạng thái không bị dùng thay cho điểm nhấn thương hiệu.
- Mỗi pha có ảnh chụp/quan sát màn hình tại các kích thước phù hợp và bằng chứng kiểm tra chức năng của các luồng bị ảnh hưởng trước khi chuyển pha.

## Cách triển khai sau khi thiết kế được duyệt

Do phạm vi bao phủ nhiều vai trò, đây là chương trình nhiều pha. Sau khi tài liệu thiết kế được duyệt, tạo kế hoạch mẹ và kế hoạch rõ ràng cho từng pha. Chỉ triển khai một pha mỗi lần theo quy trình của repo: rà soát phạm vi, xin xác nhận thực thi, thực hiện, kiểm chứng, ghi báo cáo và cập nhật ngữ cảnh trước khi chuyển sang pha kế tiếp. Không có nội dung nào trong tài liệu này tự cấp quyền thay đổi code hoặc triển khai.

## Phần để lập kế hoạch quyết định

- Danh sách màn hình và component cụ thể trong pha đầu sau khi rà soát source hiện hành.
- Thứ tự chi tiết giữa đặt lịch web và mobile theo tình trạng thực tế của các pha phát hành.
- Cách đo thời gian/độ rõ của tác vụ bằng kiểm tra giao diện hiện hành, không dùng dữ liệu bệnh nhân thật.
- Cách trình bày các trường hợp dữ liệu mẫu/fallback đã có trong code mà không đổi nghiệp vụ ngoài phạm vi.

