const BASE_URL = "http://localhost:8080";

async function runTests() {
    console.log("=========================================================");
    console.log("🚀 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN MODULE 1 (BÁC SĨ & LỊCH TRỰC)");
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

    let adminToken = "";
    let newDoctorId = "";
    let newScheduleId = "";

    // TEST 1: Đăng nhập Admin
    await test("1. Xác thực tài khoản Quản trị viên (Admin Login)", async () => {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phoneNumber: "0937050537", password: "taizz0537" }),
        });
        const data = await res.json();
        if (!data.success || !data.data?.accessToken) throw new Error(data.message || "Không lấy được token");
        adminToken = data.data.accessToken;
    });

    // TEST 2: Lấy danh sách Bác sĩ
    await test("2. Admin lấy danh sách Bác sĩ (/api/admin/doctors)", async () => {
        const res = await fetch(`${BASE_URL}/api/admin/doctors`, {
            headers: { "Authorization": `Bearer ${adminToken}` }
        });
        const data = await res.json();
        if (!data.success || !Array.isArray(data.data)) throw new Error(data.message || "Lỗi lấy danh sách");
    });

    // TEST 3: Admin tạo Bác sĩ mới
    const doctorPhone = "097" + Math.floor(1000000 + Math.random() * 9000000);
    await test("3. Admin tạo Bác sĩ mới (/api/admin/doctors)", async () => {
        const res = await fetch(`${BASE_URL}/api/admin/doctors`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                fullName: "BS. CKI Hoàng Tuấn Kiệt",
                phoneNumber: doctorPhone,
                email: `doctor_${doctorPhone}@tnthospital.vn`,
                password: "password123",
                departmentId: 1,
                degree: "BSCKI",
                consultationFee: 250000,
                biography: "Bác sĩ giàu kinh nghiệm chẩn đoán nội khoa."
            })
        });
        const data = await res.json();
        if (!data.success || !data.data?.doctorId) throw new Error(data.message || "Lỗi tạo bác sĩ");
        newDoctorId = data.data.doctorId;
    });

    // TEST 4: Admin phân Lịch trực mới cho Bác sĩ vừa tạo
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    await test("4. Admin tạo Ca trực & Khung giờ khám (/api/schedules)", async () => {
        const roomRes = await fetch(`${BASE_URL}/api/departments/rooms`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                departmentId: 1,
                roomName: "P-MOD1-" + Math.floor(100 + Math.random() * 900),
                roomType: "EXAMINATION_ROOM",
                capacity: 10
            })
        });
        const roomData = await roomRes.json();
        const testRoomId = roomData.data?.roomId || 101;

        const res = await fetch(`${BASE_URL}/api/schedules`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                doctorId: newDoctorId,
                roomId: testRoomId,
                scheduleDate: tomorrow,
                session: "MORNING"
            })
        });
        const data = await res.json();
        if (!data.success || !data.data?.scheduleId) throw new Error(data.message || "Lỗi tạo ca trực");
        if (!data.data.timeSlots || data.data.timeSlots.length === 0) throw new Error("Chưa tự động sinh khung giờ khám");
        newScheduleId = data.data.scheduleId;
    });

    // TEST 5: Admin xem toàn bộ ca trực trong ngày
    await test("5. Admin xem danh sách tất cả ca trực (/api/schedules/all)", async () => {
        const res = await fetch(`${BASE_URL}/api/schedules/all?date=${tomorrow}`, {
            headers: { "Authorization": `Bearer ${adminToken}` }
        });
        const data = await res.json();
        if (!data.success || !Array.isArray(data.data)) throw new Error(data.message || "Lỗi xem lịch trực");
        const found = data.data.some(s => s.scheduleId === newScheduleId);
        if (!found) throw new Error("Không tìm thấy ca trực vừa tạo trong danh sách");
    });

    console.log("\n=========================================================");
    console.log(`📊 TỔNG KẾT MODULE 1: ${passed} PASSED | ${failed} FAILED / 5 TESTS`);
    console.log("=========================================================");
}

runTests();
