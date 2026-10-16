const BASE_URL = 'http://localhost:8080';

async function runTests() {
    console.log("==========================================================================");
    console.log("🏥 BẮT ĐẦU KIỂM THỬ LUỒNG THU NGÂN VIỆN PHÍ (5 TIÊU CHÍ XÁC MINH)");
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

    let cashierToken = "";
    let patientToken = "";
    let testBookingCode = "";
    let testBillTotal = 0;

    // BƯỚC 0: ĐĂNG NHẬP CÁC TÀI KHOẢN KIỂM THỬ
    await test("0.1. Đăng nhập tài khoản Thu Ngân / Admin (0937050537)", async () => {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phoneNumber: "0937050537", password: "taizz0537" })
        });
        const json = await res.json();
        if (!json.success || !json.data?.accessToken) {
            throw new Error("Không thể đăng nhập tài khoản Admin/Cashier: " + json.message);
        }
        cashierToken = json.data.accessToken;
    });

    await test("0.2. Đăng nhập tài khoản Bệnh Nhân thường (0988889999)", async () => {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phoneNumber: "0988889999", password: "password123" })
        });
        const json = await res.json();
        if (!json.success || !json.data?.accessToken) {
            throw new Error("Không thể đăng nhập tài khoản Bệnh nhân: " + json.message);
        }
        patientToken = json.data.accessToken;
    });

    // BƯỚC 0.3: CHUẨN BỊ DỮ LIỆU CA KHÁM NẾU CHƯA CÓ CA CHỜ
    await test("0.3. Chuẩn bị ca khám kiểm thử (Booking & Viện phí)", async () => {
        // Kiểm tra danh sách chờ thu hiện tại
        const checkRes = await fetch(`${BASE_URL}/api/cashier/pending-bills`, {
            headers: { Authorization: `Bearer ${cashierToken}` }
        });
        const checkJson = await checkRes.json();
        const pending = checkJson.data || [];

        if (pending.length > 0) {
            testBookingCode = pending[0].bookingCode;
            testBillTotal = Number(pending[0].totalAmount);
            console.log(`   -> Sử dụng ca khám có sẵn trong DB: [${testBookingCode}], tổng tiền: ${testBillTotal}đ`);
        } else {
            // Tạo 1 ca khám mới qua Kiosk
            const kioskRes = await fetch(`${BASE_URL}/api/bookings/kiosk`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullName: "Nguyễn Kiểm Thử Thu Ngân",
                    phoneNumber: "0987654321",
                    departmentId: 4,
                    symptoms: "Đau đầu, kiểm tra tổng quát viện phí",
                    isPriority: false
                })
            });
            const kioskJson = await kioskRes.json();
            if (!kioskJson.success || !kioskJson.data?.bookingCode) {
                throw new Error("Không thể tạo ca khám mới: " + (kioskJson.message || "Lỗi Kiosk"));
            }
            testBookingCode = kioskJson.data.bookingCode;
            testBillTotal = Number(kioskJson.data.price || 150000);
            console.log(`   -> Đã tạo ca khám mới thành công: [${testBookingCode}], tổng tiền: ${testBillTotal}đ`);
        }
    });

    // TIÊU CHÍ 1: LẤY DANH SÁCH KHOẢN CHỜ THU TỪ DỮ LIỆU THẬT CƠ SỞ DỮ LIỆU
    await test("Tiêu chí 1: GET /api/cashier/pending-bills trả về dữ liệu thật từ DB", async () => {
        const res = await fetch(`${BASE_URL}/api/cashier/pending-bills`, {
            headers: { Authorization: `Bearer ${cashierToken}` }
        });
        if (res.status !== 200) {
            throw new Error(`Mã phản hồi không hợp lệ: ${res.status}`);
        }
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data)) {
            throw new Error("Cấu trúc phản hồi không đúng chuẩn ApiResponse");
        }

        const found = json.data.find(b => b.bookingCode === testBookingCode);
        if (!found) {
            throw new Error(`Không tìm thấy ca khám [${testBookingCode}] trong danh sách chờ thu`);
        }

        if (!found.items || found.items.length === 0) {
            throw new Error("Phiếu viện phí không có chi tiết các khoản mục");
        }

        if (Number(found.totalAmount) <= 0) {
            throw new Error("Tổng tiền viện phí không hợp lệ: " + found.totalAmount);
        }

        console.log(`   -> Ca khám [${found.bookingCode}]: BN ${found.patientName}, Khoa: ${found.departmentName}, Tổng viện phí: ${found.totalAmount}đ, Số khoản mục: ${found.items.length}`);
    });

    // TIÊU CHÍ 2: THU TIỀN THÀNH CÔNG TẠO GIAO DỊCH VÀ CẬP NHẬT TRẠNG THÁI DB
    let receiptCode = "";
    await test("Tiêu chí 2: POST /api/cashier/pay xác nhận thu tiền, tạo Transaction & biên lai", async () => {
        const amountGiven = testBillTotal + 50000; // Đưa dư 50.000đ tiền mặt
        const res = await fetch(`${BASE_URL}/api/cashier/pay`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${cashierToken}`
            },
            body: JSON.stringify({
                bookingCode: testBookingCode,
                paymentMethod: "CASH",
                amountGiven: amountGiven,
                notes: "Kiểm thử thu ngân tại quầy 01"
            })
        });

        if (res.status !== 200) {
            const errJson = await res.json();
            throw new Error(`Thanh toán thất bại (HTTP ${res.status}): ${errJson.message}`);
        }

        const json = await res.json();
        if (!json.success || !json.data) {
            throw new Error("Phản hồi thanh toán không thành công: " + json.message);
        }

        const r = json.data;
        if (!r.receiptCode || !r.receiptCode.startsWith("RC-")) {
            throw new Error("Mã biên lai không đúng quy chuẩn (phải bắt đầu bằng RC-): " + r.receiptCode);
        }
        receiptCode = r.receiptCode;

        if (r.status !== "SUCCESS") {
            throw new Error("Trạng thái giao dịch không phải SUCCESS: " + r.status);
        }

        if (Number(r.amountChange) !== 50000) {
            throw new Error(`Tiền thối lại tính sai: mong đợi 50000, thực tế ${r.amountChange}`);
        }

        console.log(`   -> Giao dịch thành công! Mã BL: [${receiptCode}], Thu: ${r.totalAmount}đ, Khách đưa: ${r.amountGiven}đ, Tiền thừa: ${r.amountChange}đ, Thu ngân: ${r.cashierName}`);
    });

    // TIÊU CHÍ 3: LÀM MỚI TRANG (F5) KHÔNG MẤT KẾT QUẢ THANH TOÁN
    await test("Tiêu chí 3: Tải lại lịch sử (F5) bảo toàn giao dịch và loại bỏ khỏi hàng chờ", async () => {
        // 3.1. Kiểm tra trong danh sách lịch sử
        const histRes = await fetch(`${BASE_URL}/api/cashier/history`, {
            headers: { Authorization: `Bearer ${cashierToken}` }
        });
        const histJson = await histRes.json();
        if (!histJson.success || !Array.isArray(histJson.data)) {
            throw new Error("Không thể lấy lịch sử giao dịch từ DB");
        }

        const foundInHistory = histJson.data.find(h => h.receiptCode === receiptCode || h.bookingCode === testBookingCode);
        if (!foundInHistory) {
            throw new Error(`Biên lai [${receiptCode}] không tồn tại trong lịch sử DB sau khi hoàn tất thanh toán`);
        }

        // 3.2. Kiểm tra không còn nằm trong danh sách chờ thu
        const pendingRes = await fetch(`${BASE_URL}/api/cashier/pending-bills`, {
            headers: { Authorization: `Bearer ${cashierToken}` }
        });
        const pendingJson = await pendingRes.json();
        const foundInPending = pendingJson.data.find(p => p.bookingCode === testBookingCode);
        if (foundInPending) {
            throw new Error(`Ca khám [${testBookingCode}] vẫn còn xuất hiện trong danh sách chờ thu sau khi đã thanh toán!`);
        }

        console.log(`   -> Xác nhận: Biên lai [${receiptCode}] lưu bền vững trong DB, ca khám đã loại khỏi danh sách chờ thu.`);
    });

    // TIÊU CHÍ 4: NGĂN THU TRÙNG KHI GỬI YÊU CẦU LẶP LẠI (409 CONFLICT)
    await test("Tiêu chí 4: Gửi yêu cầu thu tiền lần 2 cho cùng ca khám bị từ chối với 409 Conflict", async () => {
        const res = await fetch(`${BASE_URL}/api/cashier/pay`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${cashierToken}`
            },
            body: JSON.stringify({
                bookingCode: testBookingCode,
                paymentMethod: "CASH",
                amountGiven: testBillTotal,
                notes: "Thử thu tiền lần 2"
            })
        });

        if (res.status !== 409) {
            throw new Error(`Mong đợi mã HTTP 409 Conflict nhưng nhận được HTTP ${res.status}`);
        }

        const json = await res.json();
        if (!json.message || !json.message.includes("đã được thanh toán")) {
            throw new Error("Thông báo từ chối không khớp nội dung mong đợi: " + json.message);
        }

        console.log(`   -> Hệ thống từ chối thành công với HTTP 409: "${json.message}"`);
    });

    // TIÊU CHÍ 5: TÀI KHOẢN KHÔNG CÓ QUYỀN THU NGÂN BỊ CHẶN VỚI 403 FORBIDDEN
    await test("Tiêu chí 5: Phân quyền RBAC chặn tài khoản không có quyền thu ngân (403 Forbidden)", async () => {
        // Thử gọi POST /api/cashier/pay với tài khoản bệnh nhân
        const payRes = await fetch(`${BASE_URL}/api/cashier/pay`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${patientToken}`
            },
            body: JSON.stringify({
                bookingCode: "BK999999",
                paymentMethod: "CASH",
                amountGiven: 100000
            })
        });

        if (payRes.status !== 403) {
            throw new Error(`Tài khoản Bệnh nhân gọi /api/cashier/pay không bị chặn 403 (HTTP ${payRes.status})`);
        }

        // Thử gọi GET /api/cashier/pending-bills với tài khoản bệnh nhân
        const getRes = await fetch(`${BASE_URL}/api/cashier/pending-bills`, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });

        if (getRes.status !== 403) {
            throw new Error(`Tài khoản Bệnh nhân gọi /api/cashier/pending-bills không bị chặn 403 (HTTP ${getRes.status})`);
        }

        console.log("   -> Xác nhận: Cả POST và GET /api/cashier/** đều chặn 403 Forbidden đối với tài khoản không có quyền.");
    });

    console.log("\n==========================================================================");
    console.log(`📊 TỔNG KẾT KIỂM THỬ: ${passed} PASS, ${failed} FAIL`);
    console.log("==========================================================================");

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error("LỖI TOÀN CỤC KHI CHẠY KIỂM THỬ:", err);
    process.exit(1);
});
