const BASE_URL = "http://localhost:8080";

async function runTests() {
    console.log("=========================================================");
    console.log("🚀 BẮT ĐẦU KIỂM THỬ LIÊN KẾT FRONTEND - BACKEND (E2E)");
    console.log("=========================================================\n");

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

    let patientToken = "";
    let adminToken = "";
    let sampleDepartmentId = "";
    let sampleProfileId = "";

    // TEST 1: Kiểm tra kết nối Backend & CORS
    await test("1. Kiểm tra kết nối máy chủ Backend (Ping / Health)", async () => {
        const res = await fetch(`${BASE_URL}/api/departments`);
        if (!res.ok && res.status !== 200) throw new Error(`HTTP Status ${res.status}`);
        const data = await res.json();
        if (!data.success && !Array.isArray(data)) throw new Error("Cấu trúc trả về không hợp lệ");
        const list = Array.isArray(data) ? data : (data.data || []);
        if (list.length > 0) sampleDepartmentId = list[0].departmentId;
    });

    // TEST 2: Đăng nhập tài khoản Quản trị Admin
    await test("2. Xác thực tài khoản Quản trị viên (Admin Login)", async () => {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phoneNumber: "0937050537", password: "taizz0537" }),
        });
        const data = await res.json();
        if (!data.success || !data.data?.accessToken) throw new Error(data.message || "Không lấy được token");
        if (data.data.role !== "ROLE_ADMIN") throw new Error(`Role không đúng: ${data.data.role}`);
        adminToken = data.data.accessToken;
    });

    // TEST 3: Đăng ký tài khoản Bệnh nhân mới
    const testPhone = "098" + Math.floor(1000000 + Math.random() * 9000000);
    await test("3. Đăng ký tài khoản Bệnh nhân mới (/api/auth/register)", async () => {
        const res = await fetch(`${BASE_URL}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName: "Nguyễn Văn Test (Auto)",
                phoneNumber: testPhone,
                email: `patient_${testPhone}@gmail.com`,
                password: "password123",
                role: "ROLE_PATIENT"
            }),
        });
        const data = await res.json();
        if (!data.success && !data.data?.accessToken) throw new Error(data.message || "Đăng ký thất bại");
        patientToken = data.data?.accessToken;
    });

    // TEST 4: Đăng nhập tài khoản Bệnh nhân
    await test("4. Đăng nhập tài khoản Bệnh nhân (/api/auth/login)", async () => {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phoneNumber: testPhone, password: "password123" }),
        });
        const data = await res.json();
        if (!data.success || !data.data?.accessToken) throw new Error(data.message || "Đăng nhập thất bại");
        patientToken = data.data.accessToken;
    });

    // TEST 5: Tạo hồ sơ sức khỏe bệnh nhân
    await test("5. Tạo hồ sơ y tế gia đình (/api/patient-profiles)", async () => {
        const res = await fetch(`${BASE_URL}/api/patient-profiles`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${patientToken}`
            },
            body: JSON.stringify({
                fullName: "Nguyễn Văn Test Con",
                phoneNumber: testPhone,
                identityNumber: "001200001234",
                healthInsuranceNumber: "DN4010123456789",
                gender: "MALE",
                dateOfBirth: "2015-06-15",
                streetAddress: "141 Chiến Thắng",
                province: "Hà Nội",
                district: "Thanh Trì",
                ward: "Thanh Liệt"
            }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || "Lỗi tạo hồ sơ");
        sampleProfileId = data.data?.patientProfileId;
    });

    // TEST 6: Lấy danh sách hồ sơ của tôi
    await test("6. Lấy danh sách hồ sơ y tế của tài khoản", async () => {
        const res = await fetch(`${BASE_URL}/api/patient-profiles`, {
            headers: { "Authorization": `Bearer ${patientToken}` }
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || "Lỗi tải danh sách");
        const list = Array.isArray(data.data) ? data.data : [];
        if (list.length === 0) throw new Error("Danh sách hồ sơ rỗng sau khi tạo");
    });

    // TEST 7: Tra cứu lịch khám bác sĩ theo chuyên khoa
    await test("7. Tra cứu lịch trực & ca khám theo chuyên khoa (/api/schedules/by-department)", async () => {
        const today = new Date().toISOString().split("T")[0];
        const res = await fetch(`${BASE_URL}/api/schedules/by-department?departmentId=${sampleDepartmentId || '11111111-1111-1111-1111-111111111111'}&date=${today}`);
        // Chấp nhận 200 hoặc danh sách rỗng
        if (res.status !== 200) throw new Error(`HTTP Status ${res.status}`);
    });

    // TEST 8: Lịch sử đặt khám của tôi
    await test("8. Lấy lịch sử đặt khám của bệnh nhân (/api/bookings/my-bookings)", async () => {
        const res = await fetch(`${BASE_URL}/api/bookings/my-bookings`, {
            headers: { "Authorization": `Bearer ${patientToken}` }
        });
        if (res.status !== 200) throw new Error(`HTTP Status ${res.status}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message || "Không thể lấy lịch sử");
    });

    // TEST 9: Tạo URL thanh toán VNPay Sandbox
    await test("9. Khởi tạo liên kết thanh toán VNPay-QR (/api/payment/vnpay/create-url)", async () => {
        const res = await fetch(`${BASE_URL}/api/payment/vnpay/create-url?amount=200000&type=DEPOSIT_WALLET`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${patientToken}` }
        });
        const data = await res.json();
        if (!data.success || !data.data || !data.data.includes("vnpayment.vn")) {
            throw new Error(data.message || "Không tạo được URL thanh toán");
        }
    });

    // TEST 10: Kiểm tra bảo mật (Phân quyền Admin & Token không hợp lệ)
    await test("10. Kiểm tra phân quyền bảo mật Spring Security (RBAC)", async () => {
        // Patient cố tình gọi API của Admin -> Phải bị chặn 403 Forbidden
        const res = await fetch(`${BASE_URL}/api/departments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${patientToken}` // Token bệnh nhân không có quyền tạo khoa
            },
            body: JSON.stringify({ departmentName: "Khoa Hack", description: "Test Hack" })
        });
        if (res.status !== 403) throw new Error(`Lỗi bảo mật: Bệnh nhân gọi API Admin nhận status ${res.status}, kỳ vọng 403`);
    });

    console.log("\n=========================================================");
    console.log(`📊 TỔNG KẾT: ${passed} PASSED | ${failed} FAILED / 10 TESTS`);
    console.log("=========================================================");
}

runTests();
