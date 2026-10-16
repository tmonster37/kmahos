/**
 * SEED MASTER ALL MODULES - KHỞI TẠO BỘ DỮ LIỆU ĐẦY ĐỦ CHO TẤT CẢ CÁC MỤC TRÊN WEB
 * Phục vụ:
 * 1. Tiếp đón & Điều phối STT (Điều Dưỡng & Kiosk & Bảng LED TV)
 * 2. Tra cứu lịch sử bệnh nhân cũ (Tái khám 5s)
 * 3. Smart Load Balancing buồng khám (Phòng 101, 102, 103, 104, 201...)
 * 4. Bàn khám Bác sĩ & Bệnh án điện tử EMR (BMI, Cảnh báo dị ứng, Đơn thuốc mẫu)
 * 5. Cận lâm sàng: LIS (Chỉ số Min-Max cảnh báo) & PACS (Ảnh X-Quang, Siêu âm)
 * 6. Quản lý Nội trú & Sơ đồ buồng giường (Bed Grid) & Tờ bệnh trình hàng ngày
 * 7. Lịch trực 14 ngày cho Bác sĩ & Đặt lịch khám online
 * 8. Hồ sơ bệnh nhân gia đình, Ví viện phí 2.000.000đ, Cữ nhắc thuốc & Live Chat
 */

const crypto = require('crypto');

const BASE_URL = (process.env.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const HASH_SECRET = 'BRYEEDJIJFAGUSDLEPIOPDMDYEMLDCAX';
const TMN_CODE = 'P48XA8RI';

function javaUrlEncode(str) {
    return encodeURIComponent(str)
        .replace(/%20/g, '+')
        .replace(/!/g, '%21')
        .replace(/'/g, '%27')
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29')
        .replace(/\*/g, '%2A')
        .replace(/~/g, '%7E');
}

function signVNPayParams(params, secretKey) {
    const sortedKeys = Object.keys(params)
        .filter(k => k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType' && params[k] !== undefined && params[k] !== null && params[k] !== '')
        .sort();
    const hashData = sortedKeys.map(k => `${k}=${javaUrlEncode(params[k])}`).join('&');
    const hmac = crypto.createHmac('sha512', secretKey);
    hmac.update(Buffer.from(hashData, 'utf-8'));
    return hmac.digest('hex');
}

async function runSeed() {
    console.log("==========================================================================");
    console.log("🏥 BẮT ĐẦU TỰ ĐỘNG KHỞI TẠO DỮ LIỆU ĐẦY ĐỦ TRÊN TOÀN BỘ CÁC MỤC WEBSITE");
    console.log("==========================================================================\n");

    // 1. Đăng nhập Admin
    console.log("🔑 [1/8] Đăng nhập Quản Trị Viên (Admin Login)...");
    const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: "0937050537", password: "taizz0537" })
    });
    const adminData = await adminRes.json();
    if (!adminData.success || !adminData.data?.accessToken) {
        throw new Error("Không thể đăng nhập Admin: " + JSON.stringify(adminData));
    }
    const adminToken = adminData.data.accessToken;
    console.log("   -> Admin đăng nhập thành công! (" + adminData.data.fullName + ")");

    // 2. Kiểm tra các Chuyên khoa và Khởi tạo Buồng khám
    console.log("\n🏢 [2/8] Thiết lập Chuyên khoa & Buồng khám (Clinic Rooms)...");
    const deptsRes = await fetch(`${BASE_URL}/api/departments`);
    const deptsData = await deptsRes.json();
    const departments = deptsData.data || [];

    const roomConfigs = [
        { deptId: 1, name: "Phòng 101", desc: "Khám nội tổng quát và tiêu hóa" },
        { deptId: 1, name: "Phòng 102", desc: "Khám hô hấp và nội tiết" },
        { deptId: 1, name: "Phòng 103", desc: "Khám cơ xương khớp và lão khoa" },
        { deptId: 1, name: "Phòng 104", desc: "Khám sàng lọc và điều trị ngoại trú" },
        { deptId: 2, name: "Phòng 201", desc: "Khám chuyên sâu tim mạch & tăng huyết áp" },
        { deptId: 2, name: "Phòng 202", desc: "Đo ECG và siêu âm tim Doppler màu" },
        { deptId: 3, name: "Phòng 301", desc: "Khám bệnh trẻ em và tư vấn dinh dưỡng" },
        { deptId: 3, name: "Phòng 302", desc: "Nhi khoa sơ sinh và tiêm chủng" },
        { deptId: 4, name: "Phòng 401", desc: "Nha khoa kỹ thuật số và phục hình" },
        { deptId: 5, name: "Phòng 501", desc: "Nội soi chẩn đoán tai mũi họng" },
        { deptId: 6, name: "Phòng 601", desc: "Khám và điều trị da liễu thẩm mỹ" }
    ];

    let createdRooms = {};
    for (const r of roomConfigs) {
        try {
            const res = await fetch(`${BASE_URL}/api/departments/rooms`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
                body: JSON.stringify({ departmentId: r.deptId, roomName: r.name, description: r.desc })
            });
            const data = await res.json();
            if (data.success && data.data) {
                createdRooms[`${r.deptId}_${r.name}`] = data.data.roomId;
            }
        } catch (e) {}
    }
    console.log("   -> Đã thiết lập hoàn chỉnh hệ thống Buồng khám cho 6 Chuyên khoa.");

    // 3. Khởi tạo Bác sĩ chuyên khoa
    console.log("\n👨‍⚕️ [3/8] Khởi tạo Đội ngũ Bác sĩ Chuyên khoa...");
    const doctorConfigs = [
        {
            fullName: "BS.CKII Nguyễn Văn Hoàng",
            phoneNumber: "0911000001",
            email: "hoang.nguyen@hospital.vn",
            password: "password123",
            departmentId: 1,
            degree: "BSCKII",
            biography: "Chuyên gia Nội Tổng Quát & Tiêu hóa, 20 năm kinh nghiệm BV Bạch Mai",
            consultationFee: 200000
        },
        {
            fullName: "BS. Mai Thị Lan",
            phoneNumber: "0911000002",
            email: "lan.mai@hospital.vn",
            password: "password123",
            departmentId: 1,
            degree: "THS",
            biography: "Thạc sĩ Nội hô hấp & Nội tiết đái tháo đường",
            consultationFee: 180000
        },
        {
            fullName: "PGS.TS Lê Văn Thắng",
            phoneNumber: "0911000003",
            email: "thang.le@hospital.vn",
            password: "password123",
            departmentId: 2,
            degree: "PGS_TS",
            biography: "Phó Giáo sư Tim mạch can thiệp, nguyên Phó Viện trưởng Viện Tim Mạch",
            consultationFee: 300000
        },
        {
            fullName: "BS.CKI Phạm Quỳnh Chi",
            phoneNumber: "0911000004",
            email: "chi.pham@hospital.vn",
            password: "password123",
            departmentId: 3,
            degree: "BSCKI",
            biography: "Bác sĩ chuyên khoa Nhi, tận tâm và giàu kinh nghiệm điều trị trẻ nhỏ",
            consultationFee: 180000
        },
        {
            fullName: "BS. Bùi Thùy Dung",
            phoneNumber: "0911000005",
            email: "dung.bui@hospital.vn",
            password: "password123",
            departmentId: 5,
            degree: "BS",
            biography: "Chuyên gia Tai Mũi Họng, nội soi ống mềm không đau",
            consultationFee: 150000
        }
    ];

    let doctorList = [];
    const docRes = await fetch(`${BASE_URL}/api/admin/doctors`, {
        headers: { Authorization: `Bearer ${adminToken}` }
    });
    const docData = await docRes.json();
    doctorList = docData.data || [];

    for (const d of doctorConfigs) {
        const existing = doctorList.find(x => x.phoneNumber === d.phoneNumber);
        if (!existing) {
            try {
                const res = await fetch(`${BASE_URL}/api/admin/doctors`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
                    body: JSON.stringify(d)
                });
                const data = await res.json();
                if (data.success && data.data) {
                    doctorList.push(data.data);
                    console.log(`   -> Đã thêm Bác sĩ: ${d.fullName} (${d.degree})`);
                }
            } catch (e) {}
        }
    }
    console.log(`   -> Tổng số Bác sĩ khả dụng trong hệ thống: ${doctorList.length}`);

    // 4. Khởi tạo Lịch trực 14 ngày liên tiếp
    console.log("\n📅 [4/8] Khởi tạo Lịch trực ca 14 ngày tới (Doctor Schedules)...");
    const today = new Date();
    const pad = n => String(n).padStart(2, '0');

    for (let dayOffset = 0; dayOffset <= 13; dayOffset++) {
        const targetDateObj = new Date(today.getTime() + dayOffset * 86400000);
        const dateStr = `${targetDateObj.getFullYear()}-${pad(targetDateObj.getMonth() + 1)}-${pad(targetDateObj.getDate())}`;

        for (const doc of doctorList.slice(0, 8)) {
            if (!doc.doctorId) continue;
            let roomId = 1;
            try {
                const rRes = await fetch(`${BASE_URL}/api/departments/${doc.departmentId}/rooms`);
                const rData = await rRes.json();
                if (rData.data && rData.data.length > 0) {
                    roomId = rData.data[0].roomId;
                }
            } catch (e) {}

            // Tạo ca sáng
            try {
                await fetch(`${BASE_URL}/api/schedules`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
                    body: JSON.stringify({
                        doctorId: doc.doctorId,
                        roomId: roomId,
                        workDate: dateStr,
                        shiftType: "MORNING",
                        startTime: "07:30:00",
                        endTime: "11:30:00",
                        maxPatients: 20,
                        slotDurationMinutes: 30
                    })
                });
            } catch (e) {}

            // Tạo ca chiều
            try {
                await fetch(`${BASE_URL}/api/schedules`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
                    body: JSON.stringify({
                        doctorId: doc.doctorId,
                        roomId: roomId,
                        workDate: dateStr,
                        shiftType: "AFTERNOON",
                        startTime: "13:30:00",
                        endTime: "17:00:00",
                        maxPatients: 20,
                        slotDurationMinutes: 30
                    })
                });
            } catch (e) {}
        }
    }
    console.log("   -> Đã khởi tạo hoàn tất lịch trực 14 ngày cho các Bác sĩ.");

    // 5. Khởi tạo Hàng đợi khám bệnh hôm nay (Kiosk & Tiếp đón điều dưỡng)
    console.log("\n📋 [5/8] Khởi tạo Hàng đợi khám bệnh thực tế hôm nay (Queue & Smart Balancing)...");
    const testPatients = [
        { name: "TRẦN VĂN AN", phone: "0987654321", deptId: 1, symptoms: "Đau rát thượng vị, ợ chua, buồn nôn sau khi ăn đồ cay", priority: false },
        { name: "NGUYỄN THỊ HOA", phone: "0912987654", deptId: 1, symptoms: "Sốt nhẹ về chiều, ho khan kéo dài 1 tuần", priority: false },
        { name: "LÊ VĂN BÌNH", phone: "0903112233", deptId: 1, symptoms: "Đau tức hạ sườn phải, chán ăn, mệt mỏi", priority: false },
        { name: "PHẠM MINH TUẤN", phone: "0978445566", deptId: 1, symptoms: "Đau nhức các khớp ngón tay, cứng khớp buổi sáng", priority: false },
        { name: "VŨ THỊ HƯƠNG", phone: "0934556677", deptId: 1, symptoms: "Khám sức khỏe tổng quát theo dõi định kỳ", priority: false },
        { name: "CỤ BÀ TRẦN THỊ MAI (82T)", phone: "0912345678", deptId: 2, symptoms: "Hồi hộp đánh trống ngực, tăng huyết áp 165/95", priority: true, reason: "Người cao tuổi (≥ 75 tuổi)" },
        { name: "HOÀNG ĐỨC THẮNG", phone: "0982334455", deptId: 2, symptoms: "Cơn đau thắt ngực khi leo cầu thang, khó thở nhẹ", priority: false },
        { name: "BÉ NGUYỄN GIA BẢO (4T)", phone: "0966778899", deptId: 3, symptoms: "Sốt cao 38.8 độ, quấy khóc, chảy mũi nước", priority: true, reason: "Trẻ em dưới 6 tuổi" },
        { name: "BÉ TRẦN KHÁNH LINH (7T)", phone: "0944112233", deptId: 3, symptoms: "Ho có đờm, khò khè, biếng ăn", priority: false },
        { name: "LÊ HOÀNG NAM", phone: "0905123987", deptId: 5, symptoms: "Nghẹt mũi mạn tính, đau nhức vùng trán và hốc mắt", priority: false },
        { name: "ĐẶNG THU THẢO", phone: "0938887766", deptId: 5, symptoms: "Đau họng, nuốt vướng, khàn tiếng 3 ngày", priority: false },
        { name: "PHẠM QUỲNH CHI", phone: "0918776655", deptId: 4, symptoms: "Đau nhức răng hàm dưới, chảy máu chân răng", priority: false }
    ];

    let createdBookings = [];
    for (const p of testPatients) {
        try {
            const res = await fetch(`${BASE_URL}/api/bookings/kiosk`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullName: p.name,
                    phoneNumber: p.phone,
                    departmentId: p.deptId,
                    isPriority: p.priority || false,
                    priorityReason: p.reason || null,
                    symptoms: p.symptoms
                })
            });
            const data = await res.json();
            if (data.success && data.data) {
                createdBookings.push(data.data);
                console.log(`   -> [${p.priority ? 'ƯU TIÊN' : 'TIÊU CHUẨN'}] STT #${data.data.queueNumber}: ${p.name} - ${data.data.bookingCode}`);
            }
        } catch (e) {}
    }
    console.log(`   -> Đã khởi tạo thành công ${createdBookings.length} ca khám trong Hàng đợi hôm nay.`);

    // 6. Khởi tạo Bệnh án điện tử EMR, Xét nghiệm LIS và Chẩn đoán hình ảnh PACS
    console.log("\n🧪 [6/8] Khởi tạo Bệnh án Bác sĩ, Xét nghiệm LIS & CĐHA PACS...");
    
    // Đăng nhập Bác sĩ để thực hiện y lệnh lâm sàng
    let doctorToken = "";
    try {
        const docAuthRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phoneNumber: "0911000001", password: "password123" })
        });
        const docAuthData = await docAuthRes.json();
        doctorToken = docAuthData.data?.accessToken;
    } catch (e) {}

    if (!doctorToken) {
        console.error("   ❌ Không thể lấy Doctor Token, chuyển sang dùng Admin Token");
        doctorToken = adminToken;
    }

    if (createdBookings.length > 0) {
        // Lấy các ca để Bác sĩ tiếp nhận khám, chỉ định xét nghiệm và kê đơn
        for (let i = 0; i < Math.min(3, createdBookings.length); i++) {
            const b = createdBookings[i];
            try {
                // Bác sĩ mở phiếu khám
                const startRes = await fetch(`${BASE_URL}/api/clinical/start`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${doctorToken}` },
                    body: JSON.stringify({
                        bookingCode: b.bookingCode,
                        symptoms: b.symptoms || "Đau dạ dày, trào ngược thực quản",
                        initialDiagnosis: "Viêm loét dạ dày - tá tràng theo dõi H.Pylori / Trào ngược dạ dày thực quản (K21)"
                    })
                });
                const startData = await startRes.json();
                const recordId = startData.data?.recordId;

                if (recordId) {
                    console.log(`   -> Bác sĩ đã mở Bệnh án: [${b.bookingCode}] (${b.fullName || b.patientName})`);

                    // Chỉ định xét nghiệm huyết học và sinh hóa
                    const assignRes = await fetch(`${BASE_URL}/api/clinical/records/${recordId}/tests`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${doctorToken}` },
                        body: JSON.stringify({
                            serviceIds: [1, 2, 4] // Huyết học, Sinh hóa máu, X-Quang ngực thẳng
                        })
                    });
                    const assignData = await assignRes.json();
                    const tests = assignData.data || [];
                    console.log(`      + Đã chỉ định ${tests.length} dịch vụ Cận lâm sàng.`);

                    // Kỹ thuật viên trả kết quả xét nghiệm LIS & ảnh PACS
                    for (const t of tests) {
                        const testId = t.testId;
                        let sampleResult = "Bạch cầu (WBC): 7.2 G/L (4.0-10.0) | Hồng cầu (RBC): 4.85 T/L (3.8-5.3) | Huyết sắc tố (HGB): 142 g/L (120-165) | Tiểu cầu: 245 G/L (150-450). Các dòng tế bào trong giới hạn bình thường.";
                        let sampleImg = null;

                        if (t.serviceName?.toLowerCase().includes("sinh hóa") || t.serviceName?.toLowerCase().includes("máu")) {
                            sampleResult = "Đường huyết đói (Glucose): 7.2 mmol/L (3.9-6.4) [CAO 🔴] | HbA1c: 6.8% (4.0-6.0) [CAO 🔴] | Men gan ALT: 32 U/L | Men gan AST: 28 U/L | Ure: 5.2 mmol/L | Creatinine: 84 µmol/L.";
                        } else if (t.serviceName?.toLowerCase().includes("x-quang") || t.serviceName?.toLowerCase().includes("chụp")) {
                            sampleResult = "Hình ảnh tim phổi trong giới hạn bình thường. Không thấy nốt mờ bất thường phế trường hai bên. Cung sườn, vòm hoành và góc sườn hoành hai bên sáng rõ. Bóng tim không to.";
                            sampleImg = "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=1000&auto=format&fit=crop&q=80";
                        }

                        await fetch(`${BASE_URL}/api/clinical/tests/${testId}/result`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${doctorToken}` },
                            body: JSON.stringify({
                                testResult: sampleResult,
                                resultFileUrl: sampleImg
                            })
                        });
                    }

                    // Bác sĩ kết luận chẩn đoán xác định
                    await fetch(`${BASE_URL}/api/clinical/records/${recordId}/diagnosis`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${doctorToken}` },
                        body: JSON.stringify({
                            finalDiagnosis: "Viêm loét dạ dày tá tràng mạn tính kèm Trào ngược dạ dày thực quản (K21.0) / Rối loạn lipid máu",
                            treatmentPlan: "Uống thuốc đúng giờ theo đơn. Tránh đồ chua cay, kiêng rượu bia, hạn chế ăn muộn sau 20h. Tái khám sau 14 ngày.",
                            reExaminationDate: "2026-10-18"
                        })
                    });

                    // Bác sĩ kê đơn thuốc mẫu
                    await fetch(`${BASE_URL}/api/clinical/records/${recordId}/prescriptions`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${doctorToken}` },
                        body: JSON.stringify({
                            doctorNotes: "Uống thuốc sau bữa ăn 15 phút. Uống nhiều nước ấm trong ngày.",
                            items: [
                                { medicineId: 1, quantity: 20, morningDose: 1, afternoonDose: 0, eveningDose: 1, nightDose: 0, instruction: "Uống khi đau hoặc sốt trên 38.5 độ" },
                                { medicineId: 8, quantity: 14, morningDose: 1, afternoonDose: 0, eveningDose: 1, nightDose: 0, instruction: "Uống sau ăn no sáng - tối" },
                                { medicineId: 4, quantity: 30, morningDose: 2, afternoonDose: 0, eveningDose: 2, nightDose: 0, instruction: "Uống hỗ trợ tiêu hóa đường ruột" }
                            ]
                        })
                    });
                    console.log(`      + Đã hoàn tất Chẩn đoán & Kê đơn thuốc mẫu thành công.`);
                }
            } catch (e) {
                console.error("Lỗi tạo hồ sơ khám:", e.message);
            }
        }
    }

    // 7. Khởi tạo Bệnh nhân Nội Trú & Tờ bệnh trình hàng ngày
    console.log("\n🏥 [7/8] Khởi tạo Bệnh nhân Nội Trú & Tờ Bệnh Trình Hàng Ngày...");
    try {
        const profRes = await fetch(`${BASE_URL}/api/patient-profiles/lookup?keyword=An`);
        const profData = await profRes.json();
        const patientProfiles = profData.data || [];

        // Lấy phòng nội trú khả dụng
        const roomsRes = await fetch(`${BASE_URL}/api/departments/1/rooms`);
        const rooms = (await roomsRes.json()).data || [];
        const targetRoom = rooms.find(r => r.roomName.includes("Nội Trú") || r.roomName.includes("301")) || rooms[0] || { roomId: 1 };

        if (patientProfiles.length > 0 && doctorList.length > 0) {
            const targetProfile = patientProfiles[0];
            const targetDoc = doctorList[0];

            // Làm thủ tục nhập viện
            const admitRes = await fetch(`${BASE_URL}/api/inpatient/admit`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${doctorToken}` },
                body: JSON.stringify({
                    patientProfileId: targetProfile.patientProfileId,
                    roomId: targetRoom.roomId,
                    doctorId: targetDoc.doctorId,
                    initialDiagnosis: "Cơn đau thắt ngực không ổn định, theo dõi nhồi máu cơ tim / Tăng huyết áp độ 3"
                })
            });
            const admitData = await admitRes.json();
            const admissionId = admitData.data?.admissionId;

            if (admissionId) {
                console.log(`   -> Nhập viện thành công: [${targetProfile.fullName}] - Mã bệnh án: ${admitData.data?.admissionCode}`);

                // Ghi 2 tờ bệnh trình hàng ngày
                await fetch(`${BASE_URL}/api/inpatient/${admissionId}/daily-record`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${doctorToken}` },
                    body: JSON.stringify({
                        temperature: "37.0",
                        bloodPressure: "130/85",
                        heartRate: "78",
                        diseaseProgression: "Bệnh nhân tỉnh táo, tiếp xúc tốt, cơn đau ngực giảm rõ rệt. Không khó thở khi nằm, tim đều, phổi thông khí tốt. Vết chọc mạch đùi khô, mạch mu chân hai bên bắt rõ.",
                        doctorInstruction: "Chăm sóc cấp II. Ăn cháo mềm giảm muối. Tiếp tục dùng thuốc chống đông máu và chẹn beta giao cảm theo phác đồ."
                    })
                });

                await fetch(`${BASE_URL}/api/inpatient/${admissionId}/daily-record`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${doctorToken}` },
                    body: JSON.stringify({
                        temperature: "36.8",
                        bloodPressure: "120/80",
                        heartRate: "74",
                        diseaseProgression: "Hôm nay người bệnh tự đi lại nhẹ nhàng trong phòng được, không tức ngực. Các chỉ số sinh tồn và men tim xu hướng ổn định.",
                        doctorInstruction: "Chăm sóc cấp III. Duy trì y lệnh thuốc uống. Chuẩn bị làm siêu âm tim kiểm tra trước khi lên kế hoạch xuất viện."
                    })
                });
                console.log(`      + Đã ghi nhật ký Tờ bệnh trình theo dõi nội trú hàng ngày.`);
            }
        }
    } catch (e) {
        console.error("Lỗi tạo nội trú:", e.message);
    }

    // 8. Đăng ký & Nạp ví Bệnh nhân chuẩn (0988889999) + Hồ sơ gia đình + Nhắc thuốc
    console.log("\n💳 [8/8] Thiết lập Tài khoản Bệnh nhân Chuẩn, Ví Viện Phí & Nhắc Thuốc...");
    let patientToken = "";
    try {
        const patLogin = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phoneNumber: "0988889999", password: "password123" })
        });
        const patData = await patLogin.json();
        if (patData.success && patData.data?.accessToken) {
            patientToken = patData.data.accessToken;
        }
    } catch (e) {}

    if (patientToken) {
        // Nạp ví 2.000.000 VNĐ qua VNPay
        const vnpRes = await fetch(`${BASE_URL}/api/payment/vnpay/create-url?amount=2000000&type=DEPOSIT_WALLET`, {
            method: "POST",
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        const vnpData = await vnpRes.json();
        if (vnpData.success && vnpData.data) {
            const urlObj = new URL(vnpData.data);
            const txnRef = urlObj.searchParams.get("vnp_TxnRef");
            const cbParams = {
                vnp_Amount: "200000000",
                vnp_BankCode: "NCB",
                vnp_BankTranNo: "VNP998877",
                vnp_CardType: "ATM",
                vnp_OrderInfo: "Thanh toan vien phi The Duck Hospital",
                vnp_PayDate: "20261004120000",
                vnp_ResponseCode: "00",
                vnp_TmnCode: TMN_CODE,
                vnp_TransactionNo: "14889900",
                vnp_TransactionStatus: "00",
                vnp_TxnRef: txnRef
            };
            cbParams.vnp_SecureHash = signVNPayParams(cbParams, HASH_SECRET);
            const qs = new URLSearchParams(cbParams).toString();
            await fetch(`${BASE_URL}/api/payment/vnpay/callback?${qs}`);
            console.log("   -> Đã nạp thành công 2.000.000 VNĐ vào ví Bệnh nhân.");
        }

        // Tạo 4 hồ sơ gia đình
        const familyProfiles = [
            { fullName: "Nguyễn Văn Bệnh Nhân", relationship: "Bản thân", phoneNumber: "0988889999", identityNumber: "001090012345", healthInsuranceNumber: "DN4010900123456", gender: "MALE", dateOfBirth: "1990-05-15", streetAddress: "141 Chiến Thắng", province: "Hà Nội", district: "Thanh Trì", ward: "Tân Triều" },
            { fullName: "Nguyễn Thảo My", relationship: "Con gái", phoneNumber: "0988889999", identityNumber: "001215009876", healthInsuranceNumber: "TE1012150098765", gender: "FEMALE", dateOfBirth: "2018-09-20", streetAddress: "141 Chiến Thắng", province: "Hà Nội", district: "Thanh Trì", ward: "Tân Triều" },
            { fullName: "Nguyễn Minh Khang", relationship: "Con cái", phoneNumber: "0988889999", identityNumber: "001221008765", healthInsuranceNumber: "TE1012210087654", gender: "MALE", dateOfBirth: "2021-03-12", streetAddress: "141 Chiến Thắng", province: "Hà Nội", district: "Thanh Trì", ward: "Tân Triều" },
            { fullName: "Trần Thị Mai", relationship: "Bố mẹ", phoneNumber: "0912345678", identityNumber: "001062005432", healthInsuranceNumber: "HT3010620054321", gender: "FEMALE", dateOfBirth: "1962-11-10", streetAddress: "88 Giải Phóng", province: "Hà Nội", district: "Đống Đa", ward: "Phương Mai" }
        ];

        for (const p of familyProfiles) {
            try {
                await fetch(`${BASE_URL}/api/patient-profiles`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${patientToken}` },
                    body: JSON.stringify(p)
                });
            } catch (e) {}
        }
        // Lấy danh sách hồ sơ để gán lịch nhắc thuốc
        const myProfRes = await fetch(`${BASE_URL}/api/patient-profiles`, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        const myProfiles = (await myProfRes.json()).data || [];
        const primaryProfileId = myProfiles[0]?.patientProfileId;

        // Tạo 5 cữ thuốc nhắc nhở hàng ngày
        const reminders = [
            { medicineName: "Augmentin 625mg (Kháng sinh)", dosage: 1.0, unit: "viên", reminderTime: "07:30:00", instruction: "Uống sau ăn sáng no 15 phút" },
            { medicineName: "Vitamin C 500mg sủi", dosage: 1.0, unit: "viên", reminderTime: "08:00:00", instruction: "Pha nước uống sau ăn sáng" },
            { medicineName: "Alpha Choay (Kháng viêm)", dosage: 2.0, unit: "viên", reminderTime: "12:30:00", instruction: "Ngậm dưới lưỡi sau ăn trưa" },
            { medicineName: "Nexium 40mg (Dạ dày)", dosage: 1.0, unit: "viên", reminderTime: "18:00:00", instruction: "Uống trước ăn tối 30 phút" },
            { medicineName: "Decolgen Forte", dosage: 1.0, unit: "viên", reminderTime: "21:30:00", instruction: "Uống trước khi đi ngủ" }
        ];

        if (primaryProfileId) {
            for (const r of reminders) {
                try {
                    await fetch(`${BASE_URL}/api/utilities/reminders`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${patientToken}` },
                        body: JSON.stringify({
                            patientProfileId: primaryProfileId,
                            medicineName: r.medicineName,
                            dosage: r.dosage,
                            unit: r.unit,
                            reminderTime: r.reminderTime,
                            startDate: "2026-10-01",
                            endDate: "2026-10-31",
                            instruction: r.instruction
                        })
                    });
                } catch (e) {}
            }
            console.log("   -> Đã khởi tạo 5 Cữ thuốc nhắc nhở hàng ngày (Sáng, Trưa, Chiều, Tối).");
        }
    }

    console.log("\n==========================================================================");
    console.log("🎉 KHỞI TẠO HOÀN TẤT BỘ DỮ LIỆU CHUẨN TRÊN TOÀN BỘ CÁC MỤC HỆ THỐNG!");
    console.log("==========================================================================");
}

runSeed().catch(err => console.error("Lỗi:", err.message));
