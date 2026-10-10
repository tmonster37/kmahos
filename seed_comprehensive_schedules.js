const BASE_URL = 'http://localhost:8080';

async function seedComprehensiveSchedules() {
    console.log("==========================================================================");
    console.log("📅 BẮT ĐẦU KHỞI TẠO LỊCH TRỰC & CÁC CA KHÁM CHO TOÀN BỘ BÁC SĨ (14 NGÀY)");
    console.log("==========================================================================\n");

    // 1. Đăng nhập Admin
    const adminLogin = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: "0937050537", password: "taizz0537" })
    });
    const adminData = await adminLogin.json();
    const adminToken = adminData.data?.accessToken;
    if (!adminToken) throw new Error("Không thể đăng nhập Admin");

    // 2. Lấy danh sách khoa và phòng
    const deptsRes = await fetch(`${BASE_URL}/api/departments`);
    const deptsData = await deptsRes.json();
    const departments = deptsData.data || [];

    let deptRooms = {};
    for (const d of departments) {
        const rRes = await fetch(`${BASE_URL}/api/departments/${d.departmentId}/rooms`);
        const rData = await rRes.json();
        deptRooms[d.departmentId] = rData.data || [];
    }

    // 3. Lấy danh sách bác sĩ
    const docRes = await fetch(`${BASE_URL}/api/admin/doctors`, {
        headers: { Authorization: `Bearer ${adminToken}` }
    });
    const docData = await docRes.json();
    const doctors = docData.data || [];
    console.log(`-> Tìm thấy ${doctors.length} Bác sĩ thuộc ${departments.length} chuyên khoa.`);

    // 4. Tạo ca trực cho 14 ngày liên tiếp
    const today = new Date();
    const pad = n => String(n).padStart(2, '0');
    let totalSchedulesCreated = 0;

    const sessions = ["MORNING", "AFTERNOON", "EVENING"];

    for (let day = 0; day < 14; day++) {
        const dObj = new Date(today.getTime() + day * 86400000);
        const dateStr = `${dObj.getFullYear()}-${pad(dObj.getMonth() + 1)}-${pad(dObj.getDate())}`;

        for (const doc of doctors) {
            const rooms = deptRooms[doc.departmentId] || [];
            if (rooms.length === 0) continue;
            const roomId = rooms[0].roomId;

            // Bác sĩ trực Ca Sáng & Chiều (với một số ngày có thêm Ca Tối)
            const sessionsToCreate = (day % 2 === 0) ? ["MORNING", "AFTERNOON"] : ["MORNING", "AFTERNOON", "EVENING"];

            for (const ses of sessionsToCreate) {
                try {
                    const res = await fetch(`${BASE_URL}/api/schedules`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${adminToken}`
                        },
                        body: JSON.stringify({
                            doctorId: doc.doctorId,
                            roomId: roomId,
                            scheduleDate: dateStr,
                            session: ses
                        })
                    });
                    const resJson = await res.json();
                    if (resJson.success) {
                        totalSchedulesCreated++;
                    }
                } catch (e) {}
            }
        }
    }

    console.log(`\n🎉 ĐÃ KHỞI TẠO THÀNH CÔNG ${totalSchedulesCreated} CA TRỰC MỚI CHO 14 NGÀY TIẾP THEO!`);
    console.log("==========================================================================");
}

seedComprehensiveSchedules().catch(err => console.error("Lỗi:", err.message));
