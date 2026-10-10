const crypto = require('crypto');

const BASE_URL = 'http://localhost:8080';
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

async function runMasterSeed() {
    console.log("==========================================================================");
    console.log("🏥 BẮT ĐẦU KHỞI TẠO BỘ DỮ LIỆU CHUẨN ĐẦY ĐỦ: KHOA, PHÒNG, BÁC SĨ, LỊCH TRỰC, BỆNH NHÂN");
    console.log("==========================================================================\n");

    // 1. Đăng nhập Admin
    console.log("1. Đăng nhập Quản trị viên (Admin Login)...");
    const adminLogin = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: "0937050537", password: "taizz0537" })
    });
    const adminData = await adminLogin.json();
    if (!adminData.success || !adminData.data?.accessToken) {
        throw new Error("Không thể đăng nhập Admin: " + JSON.stringify(adminData));
    }
    const adminToken = adminData.data.accessToken;
    console.log("   -> Admin đăng nhập thành công!");

    // 2. Kiểm tra và Tạo Phòng khám cho tất cả các khoa
    console.log("\n2. Khởi tạo Phòng khám (Clinic Rooms) cho các Chuyên khoa...");
    const deptsRes = await fetch(`${BASE_URL}/api/departments`);
    const deptsData = await deptsRes.json();
    const departments = deptsData.data || [];

    const roomConfigs = [
        { deptId: 1, name: "Phòng khám Nội 101", desc: "Khám nội tổng quát và tiêu hóa" },
        { deptId: 1, name: "Phòng khám Nội 102", desc: "Khám hô hấp và nội tiết" },
        { deptId: 2, name: "Phòng khám Tim mạch 201", desc: "Khám chuyên sâu tim mạch & tăng huyết áp" },
        { deptId: 2, name: "Phòng điện tâm đồ 202", desc: "Đo ECG và siêu âm tim Doppler màu" },
        { deptId: 3, name: "Phòng khám Nhi 301", desc: "Khám bệnh trẻ em và tư vấn dinh dưỡng" },
        { deptId: 4, name: "Phòng khám Răng Hàm Mặt 401", desc: "Nha khoa kỹ thuật số và phục hình" },
        { deptId: 5, name: "Phòng khám Tai Mũi Họng 501", desc: "Nội soi chẩn đoán tai mũi họng" },
        { deptId: 6, name: "Phòng khám Da Liễu 601", desc: "Khám và điều trị da liễu thẩm mỹ" }
    ];

    let createdRooms = {};
    for (const r of roomConfigs) {
        try {
            const res = await fetch(`${BASE_URL}/api/departments/rooms`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${adminToken}`
                },
                body: JSON.stringify({
                    departmentId: r.deptId,
                    roomName: r.name,
                    description: r.desc
                })
            });
            const data = await res.json();
            if (data.success && data.data) {
                createdRooms[r.deptId] = data.data.roomId;
                console.log(`   -> [Khoa ${r.deptId}] Đã tạo phòng: ${r.name}`);
            }
        } catch (e) {}
    }

    // 3. Khởi tạo Bác sĩ chuyên khoa cho các khoa còn thiếu
    console.log("\n3. Khởi tạo Danh sách Bác sĩ Chuyên khoa cho từng khoa...");
    const doctorConfigs = [
        {
            fullName: "BS. CKII Lê Thị Hương",
            phoneNumber: "0911000101",
            email: "huong.le@hospital.vn",
            password: "password123",
            departmentId: 4, // Răng Hàm Mặt
            degree: "BSCKII",
            biography: "15 năm kinh nghiệm chuyên khoa Răng Hàm Mặt và phẫu thuật tạo hình nha chu",
            consultationFee: 250000
        },
        {
            fullName: "ThS. BS Phạm Minh Tuấn",
            phoneNumber: "0911000102",
            email: "tuan.pham@hospital.vn",
            password: "password123",
            departmentId: 5, // Tai Mũi Họng
            degree: "THS",
            biography: "Chuyên gia nội soi phẫu thuật tai mũi họng kỹ thuật cao",
            consultationFee: 200000
        },
        {
            fullName: "BS. CKI Vũ Thu Hà",
            phoneNumber: "0911000103",
            email: "ha.vu@hospital.vn",
            password: "password123",
            departmentId: 6, // Da Liễu
            degree: "BSCKI",
            biography: "Chuyên khoa Da liễu, điều trị laser thẩm mỹ và bệnh lý dị ứng tự miễn",
            consultationFee: 200000
        }
    ];

    let doctorList = [];
    // Lấy danh sách bác sĩ hiện có
    const docRes = await fetch(`${BASE_URL}/api/admin/doctors`, {
        headers: { Authorization: `Bearer ${adminToken}` }
    });
    const docData = await docRes.json();
    doctorList = docData.data || [];

    for (const d of doctorConfigs) {
        const existing = doctorList.find(x => x.phoneNumber === d.phoneNumber || x.departmentId === d.departmentId);
        if (!existing) {
            try {
                const res = await fetch(`${BASE_URL}/api/admin/doctors`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${adminToken}`
                    },
                    body: JSON.stringify(d)
                });
                const data = await res.json();
                if (data.success && data.data) {
                    doctorList.push(data.data);
                    console.log(`   -> Đã thêm Bác sĩ: ${d.fullName} (${d.degree}) - Khoa ID: ${d.departmentId}`);
                }
            } catch (e) {}
        }
    }

    // 4. Tạo Lịch trực (Doctor Schedules) cho các ngày trong tuần
    console.log("\n4. Khởi tạo Lịch trực & Khung giờ khám (Doctor Schedules)...");
    const today = new Date();
    const pad = n => String(n).padStart(2, '0');

    // Tạo lịch cho hôm nay và 6 ngày tiếp theo
    for (let dayOffset = 0; dayOffset <= 6; dayOffset++) {
        const targetDateObj = new Date(today.getTime() + dayOffset * 86400000);
        const dateStr = `${targetDateObj.getFullYear()}-${pad(targetDateObj.getMonth() + 1)}-${pad(targetDateObj.getDate())}`;

        for (const doc of doctorList) {
            if (!doc.doctorId) continue;

            // Tìm phòng thuộc khoa của bác sĩ
            let roomId = createdRooms[doc.departmentId];
            if (!roomId) {
                // Thử lấy danh sách phòng của khoa
                try {
                    const rRes = await fetch(`${BASE_URL}/api/departments/${doc.departmentId}/rooms`);
                    const rData = await rRes.json();
                    if (rData.data && rData.data.length > 0) {
                        roomId = rData.data[0].roomId;
                    }
                } catch (e) {}
            }

            if (roomId) {
                // Tạo ca sáng
                try {
                    await fetch(`${BASE_URL}/api/schedules`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${adminToken}`
                        },
                        body: JSON.stringify({
                            doctorId: doc.doctorId,
                            roomId: roomId,
                            workDate: dateStr,
                            shiftType: "MORNING",
                            startTime: "08:00:00",
                            endTime: "11:30:00",
                            maxPatients: 10,
                            slotDurationMinutes: 30
                        })
                    });
                } catch (e) {}

                // Tạo ca chiều
                try {
                    await fetch(`${BASE_URL}/api/schedules`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${adminToken}`
                        },
                        body: JSON.stringify({
                            doctorId: doc.doctorId,
                            roomId: roomId,
                            workDate: dateStr,
                            shiftType: "AFTERNOON",
                            startTime: "13:30:00",
                            endTime: "17:00:00",
                            maxPatients: 10,
                            slotDurationMinutes: 30
                        })
                    });
                } catch (e) {}
            }
        }
    }
    console.log("   -> Đã khởi tạo lịch trực đầy đủ 7 ngày liên tiếp cho tất cả các Bác sĩ.");

    // 5. Đăng ký & Nạp ví cho Tài khoản Bệnh nhân chuẩn
    console.log("\n5. Thiết lập Tài khoản Bệnh nhân chuẩn (0988889999 / password123)...");
    let patientToken = "";
    let patientUserId = "";

    try {
        await fetch(`${BASE_URL}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName: "Nguyễn Văn Bệnh Nhân",
                phoneNumber: "0988889999",
                email: "patient.standard@gmail.com",
                password: "password123",
                role: "ROLE_PATIENT"
            })
        });
    } catch (e) {}

    const patLogin = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: "0988889999", password: "password123" })
    });
    const patData = await patLogin.json();
    if (patData.success && patData.data?.accessToken) {
        patientToken = patData.data.accessToken;
        patientUserId = patData.data.userId;
        console.log("   -> Đăng nhập Bệnh nhân thành công!");
    }

    // Nạp tiền ví
    if (patientToken) {
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
                vnp_PayDate: "20261003080000",
                vnp_ResponseCode: "00",
                vnp_TmnCode: TMN_CODE,
                vnp_TransactionNo: "14889900",
                vnp_TransactionStatus: "00",
                vnp_TxnRef: txnRef
            };
            cbParams.vnp_SecureHash = signVNPayParams(cbParams, HASH_SECRET);
            const qs = new URLSearchParams(cbParams).toString();
            await fetch(`${BASE_URL}/api/payment/vnpay/callback?${qs}`);
            console.log("   -> Đã nạp 2.000.000 VNĐ vào ví Bệnh nhân (Mã GD:", txnRef + ")");
        }

        // Tạo 4 hồ sơ y tế gia đình
        const familyProfiles = [
            {
                fullName: "Nguyễn Văn Bệnh Nhân",
                relationship: "Bản thân",
                phoneNumber: "0988889999",
                identityNumber: "001090012345",
                healthInsuranceNumber: "DN4010900123456",
                gender: "MALE",
                dateOfBirth: "1990-05-15",
                streetAddress: "141 Chiến Thắng",
                province: "Hà Nội",
                district: "Thanh Trì",
                ward: "Tân Triều"
            },
            {
                fullName: "Nguyễn Thảo My",
                relationship: "Con cái",
                phoneNumber: "0988889999",
                identityNumber: "001215009876",
                healthInsuranceNumber: "TE1012150098765",
                gender: "FEMALE",
                dateOfBirth: "2018-09-20",
                streetAddress: "141 Chiến Thắng",
                province: "Hà Nội",
                district: "Thanh Trì",
                ward: "Tân Triều"
            },
            {
                fullName: "Nguyễn Minh Khang",
                relationship: "Con cái",
                phoneNumber: "0988889999",
                identityNumber: "001221008765",
                healthInsuranceNumber: "TE1012210087654",
                gender: "MALE",
                dateOfBirth: "2021-03-12",
                streetAddress: "141 Chiến Thắng",
                province: "Hà Nội",
                district: "Thanh Trì",
                ward: "Tân Triều"
            },
            {
                fullName: "Trần Thị Mai",
                relationship: "Bố mẹ",
                phoneNumber: "0912345678",
                identityNumber: "001062005432",
                healthInsuranceNumber: "HT3010620054321",
                gender: "FEMALE",
                dateOfBirth: "1962-11-10",
                streetAddress: "88 Giải Phóng",
                province: "Hà Nội",
                district: "Đống Đa",
                ward: "Phương Mai"
            }
        ];

        let createdProfList = [];
        for (const p of familyProfiles) {
            try {
                const res = await fetch(`${BASE_URL}/api/patient-profiles`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${patientToken}`
                    },
                    body: JSON.stringify(p)
                });
                const data = await res.json();
                if (data.success && data.data) {
                    createdProfList.push(data.data);
                    console.log(`   -> Đã tạo hồ sơ: ${p.fullName} (${p.relationship})`);
                }
            } catch (e) {}
        }

        // Tạo 5 cữ nhắc thuốc
        const reminders = [
            { medicineName: "Augmentin 1g (Kháng sinh)", dosage: "1 viên", reminderTime: "07:30", session: "Sáng", instruction: "Uống sau ăn sáng no 15 phút" },
            { medicineName: "Vitamin C 500mg", dosage: "1 viên sủi", reminderTime: "08:00", session: "Sáng", instruction: "Pha nước uống sau ăn" },
            { medicineName: "Alpha Choay", dosage: "2 viên", reminderTime: "12:30", session: "Trưa", instruction: "Ngậm dưới lưỡi sau ăn" },
            { medicineName: "Augmentin 1g (Kháng sinh)", dosage: "1 viên", reminderTime: "18:30", session: "Chiều", instruction: "Uống sau ăn tối" },
            { medicineName: "Decolgen Forte", dosage: "1 viên", reminderTime: "21:30", session: "Tối", instruction: "Uống trước khi đi ngủ" }
        ];

        for (const r of reminders) {
            try {
                await fetch(`${BASE_URL}/api/utilities/reminders`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${patientToken}`
                    },
                    body: JSON.stringify({ ...r, startDate: "2026-10-01", endDate: "2026-10-15" })
                });
            } catch (e) {}
        }
        console.log("   -> Đã khởi tạo 5 cữ nhắc thuốc hàng ngày (Sáng, Trưa, Chiều, Tối).");
    }

    console.log("\n==========================================================================");
    console.log("🎉 TẤT CẢ DỮ LIỆU ĐÃ ĐƯỢC KHỞI TẠO HOÀN HẢO!");
    console.log("==========================================================================");
}

runMasterSeed().catch(err => console.error("Lỗi:", err.message));
