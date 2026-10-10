const BASE_URL = 'http://localhost:8080';

async function runTests() {
    console.log("==========================================================================");
    console.log("🚀 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN MODULE 2: DOCTOR QUEUE & LAB RESULTS PORTAL");
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

    let token = "";

    // 1. Xác thực đăng nhập
    await test("1. Đăng nhập hệ thống Bệnh viện (Login with 0937050537)", async () => {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phoneNumber: "0937050537", password: "taizz0537" }),
        });
        const json = await res.json();
        if (!json.success || !json.data?.accessToken) throw new Error(json.message || "Login failed");
        token = json.data.accessToken;
    });

    const authHeaders = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    });

    // 2. Danh mục dịch vụ cận lâm sàng
    await test("2. Lấy danh mục dịch vụ cận lâm sàng (/api/clinical/services)", async () => {
        const res = await fetch(`${BASE_URL}/api/clinical/services`, {
            headers: authHeaders(),
        });
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data)) throw new Error(json.message || "Lỗi lấy danh mục dịch vụ");
        console.log(`   -> Tìm thấy ${json.data.length} dịch vụ cận lâm sàng`);
    });

    // 3. Danh mục thuốc trong kho
    await test("3. Lấy danh mục thuốc tồn kho (/api/clinical/medicines)", async () => {
        const res = await fetch(`${BASE_URL}/api/clinical/medicines`, {
            headers: authHeaders(),
        });
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data)) throw new Error(json.message || "Lỗi lấy danh mục thuốc");
        console.log(`   -> Tìm thấy ${json.data.length} loại thuốc`);
    });

    // 4. Bảng gọi số sảnh chờ công cộng
    await test("4. Bảng hiển thị số gọi khám công cộng LED TV (/api/clinical/queue/public)", async () => {
        const res = await fetch(`${BASE_URL}/api/clinical/queue/public`, {
            headers: authHeaders(),
        });
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data)) throw new Error(json.message || "Lỗi lấy bảng gọi số công cộng");
        console.log(`   -> Hàng đợi sảnh chờ: ${json.data.length} lượt khám`);
    });

    // 5. Hàng đợi khám bệnh của Bác sĩ
    await test("5. Hàng đợi bệnh nhân của Bác sĩ (/api/clinical/doctor/queue)", async () => {
        const res = await fetch(`${BASE_URL}/api/clinical/doctor/queue`, {
            headers: authHeaders(),
        });
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data)) throw new Error(json.message || "Lỗi lấy hàng đợi bác sĩ");
        console.log(`   -> Hàng đợi Bác sĩ: ${json.data.length} bệnh nhân`);
    });

    // 6. Phân hệ phòng Lab Kỹ thuật viên
    await test("6. Phân hệ Tiếp nhận & Trả kết quả phòng Lab (/api/clinical/lab/tests)", async () => {
        const res = await fetch(`${BASE_URL}/api/clinical/lab/tests`, {
            headers: authHeaders(),
        });
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data)) throw new Error(json.message || "Lỗi lấy danh sách Lab tests");
        console.log(`   -> Danh sách chỉ định phòng Lab: ${json.data.length} chỉ định`);
    });

    console.log("\n=========================================================");
    console.log(`📊 TỔNG KẾT KIỂM THỬ: ${passed}/${passed + failed} TESTCASES THÀNH CÔNG!`);
    console.log("=========================================================\n");

    if (failed > 0) process.exit(1);
}

runTests();
