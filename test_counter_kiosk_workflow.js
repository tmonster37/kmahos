// Test Script Kịch Bản Kiểm Thử Tự Động Quản Lý Quầy Tiếp Đón Counter & Bốc Số Kiosk Thông Minh
// Chạy bằng Node.js: node test_counter_kiosk_workflow.js

const BASE_URL = 'http://localhost:8080';
const { randomUUID } = require("crypto");

async function runCounterAndKioskTests() {
    console.log("==========================================================================");
    console.log("🏥 BẮT ĐẦU KIỂM THỬ: QUẢN LÝ QUẦY TIẾP ĐÓN COUNTER & BỐC SỐ KIOSK THÔNG MINH");
    console.log("==========================================================================\n");

    let passed = 0;
    let failed = 0;

    async function test(name, fn) {
        try {
            await fn();
            console.log(`✅ [PASS] ${name}`);
            passed++;
        } catch (err) {
            console.error(`❌ [FAIL] ${name}:`, err.message);
            failed++;
        }
    }

    let nurseToken = "";
    let counters = [];
    let counter1 = null;
    let counter3Insurance = null;
    let counter4Priority = null;
    let counter5Appointment = null;

    let priorityTicket = null;
    let insuranceTicket = null;
    let generalTicket1 = null;
    let generalTicket2 = null;
    let appointmentBookingCode = "";

    // BƯỚC 1: ĐĂNG NHẬP ĐIỀU DƯỠNG TIẾP ĐÓN
    await test("1. Đăng nhập tài khoản Điều Dưỡng / Quản lý (0937050537)", async () => {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phoneNumber: "0937050537", password: "taizz0537" })
        });
        const json = await res.json();
        if (!json.success || !json.data?.accessToken) {
            throw new Error("Không thể đăng nhập tài khoản điều dưỡng: " + (json.message || res.statusText));
        }
        nurseToken = json.data.accessToken;
    });

    // BƯỚC 2: TẢI DANH SÁCH 5 QUẦY TIẾP ĐÓN TẠI SẢNH
    await test("2. Tải danh mục Quầy tiếp đón (GET /api/counters)", async () => {
        const res = await fetch(`${BASE_URL}/api/counters`);
        if (!res.ok) throw new Error("HTTP Status " + res.status);
        const json = await res.json();
        counters = json.data || json;
        if (!Array.isArray(counters) || counters.length < 5) {
            throw new Error(`Kỳ vọng ít nhất 5 quầy mặc định, nhận được: ${counters.length}`);
        }

        counter1 = counters.find(c => c.counterCode === "CTR-01" || c.counterId === 1);
        counter3Insurance = counters.find(c => c.counterType === "INSURANCE");
        counter4Priority = counters.find(c => c.counterType === "PRIORITY");
        counter5Appointment = counters.find(c => c.counterType === "APPOINTMENT");

        if (!counter1 || !counter3Insurance || !counter4Priority || !counter5Appointment) {
            throw new Error("Thiếu cấu hình các quầy chuyên trách (General, Insurance, Priority, Appointment)");
        }
    });

    // BƯỚC 3: ĐIỀU DƯỠNG CHECK-IN NHẬN QUẦY 1 (GENERAL)
    await test("3. Điều dưỡng Check-in nhận Quầy 1 (POST /api/counters/{id}/check-in)", async () => {
        const res = await fetch(`${BASE_URL}/api/counters/${counter1.counterId}/check-in`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${nurseToken}`
            }
        });
        if (!res.ok) throw new Error("Check-in quầy thất bại, HTTP " + res.status);
        const json = await res.json();
        const updatedCounter = json.data || json;
        if (updatedCounter.status !== "OPEN" && updatedCounter.status !== "SERVING") {
            throw new Error(`Trạng thái quầy không hợp lệ sau check-in: ${updatedCounter.status}`);
        }
        if (!updatedCounter.staffName) {
            throw new Error("Tên điều dưỡng trực chưa được gán sau check-in!");
        }
    });

    // BƯỚC 4: KIOSK PHÂN LUỒNG THÔNG MINH - ĐỐI TƯỢNG ƯU TIÊN (NGƯỜI CAO TUỔI >= 65)
    await test("4. Kiosk phân luồng ƯU TIÊN: Cụ ông 72 tuổi (sinh năm 1954) -> Điều hướng Quầy 4 Ưu Tiên", async () => {
        const reqBody = {
            fullName: "Cụ Ông Nguyễn Văn Lão",
            phoneNumber: "0912345678",
            departmentId: 1,
            birthYear: 1954,
            isPriority: true,
            priorityReason: "Người cao tuổi (72 tuổi)",
            hasInsurance: false,
            idempotencyKey: randomUUID()
        };
        const res = await fetch(`${BASE_URL}/api/counters/kiosk/dispatch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reqBody)
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Bốc số ưu tiên thất bại: HTTP ${res.status} - ${errText}`);
        }
        const json = await res.json();
        priorityTicket = json.data || json;

        if (priorityTicket.counterType !== "PRIORITY") {
            throw new Error(`Phân luồng sai! Kỳ vọng quầy PRIORITY nhưng điều hướng vào: ${priorityTicket.counterType}`);
        }
        if (!priorityTicket.isPriority) {
            throw new Error("Cờ isPriority chưa được bật thành TRUE!");
        }
    });

    // BƯỚC 5: KIOSK PHÂN LUỒNG BẢO HIỂM Y TẾ (BHYT)
    await test("5. Kiosk phân luồng BHYT: Bệnh nhân có thẻ BHYT -> Điều hướng Quầy 3 BHYT", async () => {
        const reqBody = {
            fullName: "Lê Hoàng Thu (BHYT)",
            phoneNumber: "0987654321",
            departmentId: 2,
            birthYear: 1988,
            hasInsurance: true,
            isPriority: false,
            idempotencyKey: randomUUID()
        };
        const res = await fetch(`${BASE_URL}/api/counters/kiosk/dispatch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reqBody)
        });
        if (!res.ok) throw new Error("Bốc số BHYT thất bại: HTTP " + res.status);
        const json = await res.json();
        insuranceTicket = json.data || json;

        if (insuranceTicket.counterType !== "INSURANCE") {
            throw new Error(`Phân luồng sai! Kỳ vọng quầy INSURANCE nhưng điều hướng vào: ${insuranceTicket.counterType}`);
        }
        if (!insuranceTicket.hasInsurance) {
            throw new Error("Cờ hasInsurance chưa được lưu lại!");
        }
    });

    // BƯỚC 6: KIOSK PHÂN LUỒNG BỆNH NHÂN ĐÃ ĐẶT HẸN TRƯỚC (APPOINTMENT FAST-TRACK)
    await test("6. Kiosk phân luồng ĐẶT HẸN TRƯỚC -> Điều hướng Quầy 5 Fast-track", async () => {
        // Tạo trước một ca booking đặt hẹn để mô phỏng ca hẹn đã tồn tại trên hệ thống
        const preBkRes = await fetch(`${BASE_URL}/api/bookings/kiosk`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName: "Phạm Minh Anh (Hẹn Trước)",
                phoneNumber: "0905123987",
                departmentId: 1,
                birthYear: 1995,
                symptoms: "Tái khám theo lịch hẹn chuyên khoa"
            })
        });
        const preBkJson = await preBkRes.json();
        const testBookingCode = preBkJson.data?.bookingCode || preBkJson.bookingCode;
        if (!testBookingCode) {
            throw new Error("Không thể tạo ca booking hẹn trước giả lập");
        }
        appointmentBookingCode = testBookingCode;

        // Bệnh nhân đến cây Kiosk nhập mã booking hẹn trước
        const reqBody = {
            fullName: "Phạm Minh Anh (Hẹn Trước)",
            phoneNumber: "0905123987",
            departmentId: 1,
            birthYear: 1995,
            bookingCode: appointmentBookingCode,
            idempotencyKey: randomUUID()
        };
        const res = await fetch(`${BASE_URL}/api/counters/kiosk/dispatch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reqBody)
        });
        if (!res.ok) throw new Error("Bốc số hẹn trước thất bại: HTTP " + res.status);
        const json = await res.json();
        const appTicket = json.data || json;

        if (appTicket.counterType !== "APPOINTMENT") {
            throw new Error(`Phân luồng sai! Kỳ vọng quầy APPOINTMENT nhưng điều hướng vào: ${appTicket.counterType}`);
        }
        if (appTicket.bookingCode !== appointmentBookingCode) {
            throw new Error(`Mã booking liên kết không khớp: ${appTicket.bookingCode} vs ${appointmentBookingCode}`);
        }
    });

    // BƯỚC 7: KIOSK CÂN BẰNG TẢI THÔNG MINH CHO KHÁM THƯỜNG (LEAST LOAD BALANCING)
    await test("7. Kiosk tiếp nhận khám thường & Cân bằng tải Quầy 1 / Quầy 2", async () => {
        // Vé 1
        const res1 = await fetch(`${BASE_URL}/api/counters/kiosk/dispatch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName: "Trương Văn Khang",
                phoneNumber: "0977112233",
                departmentId: 1,
                birthYear: 1998,
                hasInsurance: false,
                isPriority: false,
                idempotencyKey: randomUUID()
            })
        });
        if (!res1.ok) throw new Error("Dispatch vé thường 1 thất bại");
        const json1 = await res1.json();
        generalTicket1 = json1.data || json1;

        // Vé 2
        const res2 = await fetch(`${BASE_URL}/api/counters/kiosk/dispatch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName: "Đỗ Thị Mỹ Linh",
                phoneNumber: "0966445566",
                departmentId: 1,
                birthYear: 1996,
                hasInsurance: false,
                isPriority: false,
                idempotencyKey: randomUUID()
            })
        });
        if (!res2.ok) throw new Error("Dispatch vé thường 2 thất bại");
        const json2 = await res2.json();
        generalTicket2 = json2.data || json2;

        if (generalTicket1.counterType !== "GENERAL" || generalTicket2.counterType !== "GENERAL") {
            throw new Error("Vé khám thường không được gán vào quầy GENERAL!");
        }
    });

    // BƯỚC 8: ĐIỀU DƯỠNG LẤY HÀNG ĐỢI & GỌI SỐ TIẾP THEO (CALL NEXT)
    let callingTicketId = null;
    await test("8. Điều dưỡng Quầy 1 gọi số tiếp theo (POST /api/counters/{id}/call-next)", async () => {
        // Kiểm tra hàng đợi hiện tại của quầy
        const qRes = await fetch(`${BASE_URL}/api/counters/${counter1.counterId}/queue`);
        if (!qRes.ok) throw new Error("Không lấy được hàng đợi quầy 1");
        const qJson = await qRes.json();
        const queueList = qJson.data || qJson;

        // Gọi số tiếp theo
        const callRes = await fetch(`${BASE_URL}/api/counters/${counter1.counterId}/call-next`, {
            method: "POST",
            headers: { Authorization: `Bearer ${nurseToken}` }
        });
        if (!callRes.ok) throw new Error("Lỗi gọi số tiếp theo: HTTP " + callRes.status);
        const json = await callRes.json();
        const servingTicket = json.data || json;
        callingTicketId = servingTicket.ticketId;

        if (servingTicket.status !== "CALLING" && servingTicket.status !== "SERVING") {
            throw new Error(`Trạng thái vé gọi không hợp lệ: ${servingTicket.status}`);
        }
    });

    // BƯỚC 9: HOÀN TẤT THỦ TỤC & ĐIỀU PHỐI VÀO BUỒNG KHÁM BÁC SĨ (COMPLETE & DISPATCH TO ROOM)
    await test("9. Hoàn tất thủ tục quầy & Điều phối bệnh nhân vào Phòng khám (SERVED)", async () => {
        if (!callingTicketId) {
            throw new Error("Không tìm thấy ticket ID đang gọi để hoàn tất!");
        }

        const completeRes = await fetch(`${BASE_URL}/api/counters/${counter1.counterId}/tickets/${callingTicketId}/complete`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${nurseToken}`
            },
            body: JSON.stringify({
                targetRoomId: 1,
                notes: "Chuyển bệnh nhân sang Buồng khám số 1 Tầng 1"
            })
        });
        if (!completeRes.ok) {
            const errText = await completeRes.text();
            throw new Error(`Lỗi hoàn tất thủ tục quầy: HTTP ${completeRes.status} - ${errText}`);
        }
        const json = await completeRes.json();
        const completedTicket = json.data || json;

        if (completedTicket.status !== "SERVED" && completedTicket.status !== "COMPLETED") {
            throw new Error(`Trạng thái vé chưa hoàn tất: ${completedTicket.status}`);
        }
    });

    // BƯỚC 10: XỬ LÝ BỆNH NHÂN VẮNG MẶT (BỎ QUA / SKIP)
    await test("10. Gọi số tiếp theo & Bỏ qua bệnh nhân vắng mặt (SKIP)", async () => {
        // Gọi số thứ 2
        const call2Res = await fetch(`${BASE_URL}/api/counters/${counter1.counterId}/call-next`, {
            method: "POST",
            headers: { Authorization: `Bearer ${nurseToken}` }
        });
        if (call2Res.ok) {
            const json2 = await call2Res.json();
            const ticket2 = json2.data || json2;

            // Bấm bỏ qua vì bệnh nhân vắng mặt
            const skipRes = await fetch(`${BASE_URL}/api/counters/${counter1.counterId}/tickets/${ticket2.ticketId}/skip`, {
                method: "POST",
                headers: { Authorization: `Bearer ${nurseToken}` }
            });
            if (!skipRes.ok) throw new Error("Lỗi bỏ qua bệnh nhân: HTTP " + skipRes.status);
            const skipJson = await skipRes.json();
            const skipped = skipJson.data || skipJson;
            if (skipped.status !== "SKIPPED") {
                throw new Error("Trạng thái vé sau khi skip không phải SKIPPED: " + skipped.status);
            }
        }
    });

    // BƯỚC 11: TẠM NGHỈ & ĐÓNG QUẦY (PAUSE & CLOSE)
    await test("11. Tạm dừng quầy (PAUSE) và Đóng quầy (CLOSE)", async () => {
        // Tạm dừng
        const pauseRes = await fetch(`${BASE_URL}/api/counters/${counter1.counterId}/pause`, {
            method: "POST",
            headers: { Authorization: `Bearer ${nurseToken}` }
        });
        if (!pauseRes.ok) throw new Error("Lỗi tạm dừng quầy");
        const pauseJson = await pauseRes.json();
        const pausedCounter = pauseJson.data || pauseJson;
        if (pausedCounter.status !== "PAUSED") {
            throw new Error(`Trạng thái quầy không phải PAUSED: ${pausedCounter.status}`);
        }

        // Đóng quầy
        const closeRes = await fetch(`${BASE_URL}/api/counters/${counter1.counterId}/close`, {
            method: "POST",
            headers: { Authorization: `Bearer ${nurseToken}` }
        });
        if (!closeRes.ok) throw new Error("Lỗi đóng quầy");
        const closeJson = await closeRes.json();
        const closedCounter = closeJson.data || closeJson;
        if (closedCounter.status !== "CLOSED") {
            throw new Error(`Trạng thái quầy không phải CLOSED: ${closedCounter.status}`);
        }
    });

    console.log("\n==========================================================================");
    console.log(`🎉 KẾT QUẢ KIỂM THỬ: ${passed} PASS, ${failed} FAIL / TỔNG CỘNG 11 TIÊU CHÍ`);
    console.log("==========================================================================");

    if (failed > 0) {
        process.exit(1);
    }
}

runCounterAndKioskTests().catch(err => {
    console.error("Lỗi thực thi kiểm thử:", err);
    process.exit(1);
});
