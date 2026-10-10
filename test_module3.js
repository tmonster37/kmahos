const BASE_URL = 'http://localhost:8080';

async function runTests() {
    console.log("==========================================================================");
    console.log("🚀 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN MODULE 3: LIVE CHAT & MEDICAL DOCUMENT PRINT");
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

    let adminToken = "";
    let adminId = "";
    let patientToken = "";
    let patientId = "";

    // 1. Đăng nhập Admin
    await test("1. Đăng nhập Quản trị viên / Bác sĩ (Admin Login)", async () => {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phoneNumber: "0937050537", password: "taizz0537" }),
        });
        const json = await res.json();
        if (!json.success || !json.data?.accessToken) throw new Error(json.message || "Admin login failed");
        adminToken = json.data.accessToken;
        adminId = json.data.userId;
    });

    // 2. Đăng ký & Đăng nhập Bệnh nhân
    await test("2. Đăng ký / Đăng nhập tài khoản Bệnh nhân", async () => {
        const testPhone = `098${Math.floor(1000000 + Math.random() * 9000000)}`;
        const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName: "Nguyễn Văn Test Chat",
                phoneNumber: testPhone,
                email: `patient_${Date.now()}@gmail.com`,
                password: "password123",
                role: "ROLE_PATIENT",
            }),
        });
        const regJson = await regRes.json();
        if (!regJson.success) throw new Error(regJson.message || "Register failed");

        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phoneNumber: testPhone, password: "password123" }),
        });
        const loginJson = await loginRes.json();
        if (!loginJson.success || !loginJson.data?.accessToken) throw new Error("Patient login failed");
        patientToken = loginJson.data.accessToken;
        patientId = loginJson.data.userId;
    });

    // 3. Bệnh nhân lấy danh sách Tư vấn viên y tế
    await test("3. Bệnh nhân lấy danh sách Bác sĩ / Tư vấn viên trực tuyến (/api/chat/consultants)", async () => {
        const res = await fetch(`${BASE_URL}/api/chat/consultants`, {
            headers: { Authorization: `Bearer ${patientToken}` },
        });
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data)) throw new Error(json.message || "Lỗi lấy danh sách consultants");
        console.log(`   -> Tìm thấy ${json.data.length} Bác sĩ / Tư vấn viên y tế sẵn sàng`);
    });

    // 4. Bệnh nhân gửi tin nhắn cho Bác sĩ
    await test("4. Bệnh nhân gửi tin nhắn tư vấn (/api/chat/send)", async () => {
        const res = await fetch(`${BASE_URL}/api/chat/send`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${patientToken}`,
            },
            body: JSON.stringify({
                recipientId: adminId,
                content: "Bác sĩ ơi, tôi bị đau họng và sốt nhẹ từ tối qua, cần dùng thuốc gì ạ?",
                messageType: "TEXT",
            }),
        });
        const json = await res.json();
        if (!json.success || !json.data?.messageId) throw new Error(json.message || "Lỗi gửi tin nhắn");
        console.log(`   -> Tin nhắn đã gửi: ID ${json.data.messageId}`);
    });

    // 5. Bác sĩ nhận tin nhắn và xem lịch sử chat
    await test("5. Bác sĩ tra cứu lịch sử tin nhắn với bệnh nhân (/api/chat/messages/{patientId})", async () => {
        const res = await fetch(`${BASE_URL}/api/chat/messages/${patientId}`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data) || json.data.length === 0) {
            throw new Error(json.message || "Không tìm thấy tin nhắn");
        }
        console.log(`   -> Lịch sử hội thoại có ${json.data.length} tin nhắn`);
    });

    // 6. Bác sĩ phản hồi tin nhắn
    await test("6. Bác sĩ gửi phản hồi tư vấn y tế cho bệnh nhân (/api/chat/send)", async () => {
        const res = await fetch(`${BASE_URL}/api/chat/send`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({
                recipientId: patientId,
                content: "Chào bạn, bạn nên súc họng nước muối ấm, uống đủ nước và đặt lịch đến viện để Bác sĩ nội soi họng nhé.",
                messageType: "TEXT",
            }),
        });
        const json = await res.json();
        if (!json.success || !json.data?.messageId) throw new Error(json.message || "Lỗi phản hồi tin nhắn");
        console.log(`   -> Bác sĩ đã gửi câu trả lời: "${json.data.content}"`);
    });

    // 7. Lấy danh sách hội thoại gần đây
    await test("7. Bác sĩ xem danh sách các cuộc hội thoại (/api/chat/conversations)", async () => {
        const res = await fetch(`${BASE_URL}/api/chat/conversations`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data)) throw new Error(json.message || "Lỗi lấy hội thoại");
        console.log(`   -> Bác sĩ hiện có ${json.data.length} cuộc trò chuyện`);
    });

    // 8. Đánh dấu đã đọc tin nhắn
    await test("8. Đánh dấu đã đọc tin nhắn (/api/chat/read/{patientId})", async () => {
        const res = await fetch(`${BASE_URL}/api/chat/read/${patientId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || "Lỗi đánh dấu đã đọc");
        console.log("   -> Đánh dấu đã đọc thành công");
    });

    console.log("\n=========================================================");
    console.log(`📊 TỔNG KẾT KIỂM THỬ MODULE 3: ${passed}/${passed + failed} TESTCASES THÀNH CÔNG!`);
    console.log("=========================================================\n");

    if (failed > 0) process.exit(1);
}

runTests();
