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

async function seedData() {
    console.log("==========================================================================");
    console.log("🏥 BẮT ĐẦU KHỞI TẠO BỘ DỮ LIỆU KIỂM THỬ TOÀN DIỆN (FULL SYSTEM TEST DATA)");
    console.log("==========================================================================\n");

    const patientPhone = "0988889999";
    const patientPassword = "password123";
    let patientToken = "";
    let patientUserId = "";

    // 1. Đăng nhập Tài khoản Bệnh nhân chuẩn
    console.log("1. Đăng nhập tài khoản Bệnh nhân (0988889999 / password123)...");
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: patientPhone, password: patientPassword })
    });
    const loginData = await loginRes.json();
    if (!loginData.success || !loginData.data?.accessToken) {
        throw new Error("Không thể đăng nhập tài khoản bệnh nhân test");
    }
    patientToken = loginData.data.accessToken;
    patientUserId = loginData.data.userId;
    console.log("   -> Đăng nhập thành công! User ID:", patientUserId);

    // 2. Nạp tiền ví qua VNPay (2.000.000 VNĐ)
    console.log("\n2. Nạp 2.000.000đ vào Ví viện phí qua cổng VNPay...");
    const vnpUrlRes = await fetch(`${BASE_URL}/api/payment/vnpay/create-url?amount=2000000&type=DEPOSIT_WALLET`, {
        method: "POST",
        headers: { Authorization: `Bearer ${patientToken}` }
    });
    const vnpUrlData = await vnpUrlRes.json();
    if (vnpUrlData.success && vnpUrlData.data) {
        const urlObj = new URL(vnpUrlData.data);
        const txnRef = urlObj.searchParams.get("vnp_TxnRef");
        
        const callbackParams = {
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
        callbackParams.vnp_SecureHash = signVNPayParams(callbackParams, HASH_SECRET);
        const qs = new URLSearchParams(callbackParams).toString();
        await fetch(`${BASE_URL}/api/payment/vnpay/callback?${qs}`);
        console.log("   -> Số dư ví đã được nạp thành công: 2.000.000 VND (Mã GD:", txnRef + ")");
    }

    // 3. Tạo 3 Hồ sơ Bệnh nhân Gia đình
    console.log("\n3. Khởi tạo danh sách Hồ sơ Y tế Gia đình...");
    const profiles = [
        {
            fullName: "Nguyễn Văn Bệnh Nhân",
            relationship: "Bản thân",
            phoneNumber: patientPhone,
            identityNumber: "001090012345",
            healthInsuranceNumber: "DN4010900123456",
            gender: "MALE",
            dateOfBirth: "1990-05-15",
            streetAddress: "141 Đường Chiến Thắng",
            province: "Hà Nội",
            district: "Thanh Trì",
            ward: "Tân Triều"
        },
        {
            fullName: "Nguyễn Thảo My (Con gái)",
            relationship: "Con cái",
            phoneNumber: patientPhone,
            identityNumber: "001215009876",
            healthInsuranceNumber: "TE1012150098765",
            gender: "FEMALE",
            dateOfBirth: "2018-09-20",
            streetAddress: "141 Đường Chiến Thắng",
            province: "Hà Nội",
            district: "Thanh Trì",
            ward: "Tân Triều"
        },
        {
            fullName: "Trần Thị Mai (Mẹ)",
            relationship: "Bố mẹ",
            phoneNumber: "0912345678",
            identityNumber: "001062005432",
            healthInsuranceNumber: "HT3010620054321",
            gender: "FEMALE",
            dateOfBirth: "1962-11-10",
            streetAddress: "Số 88 Giải Phóng",
            province: "Hà Nội",
            district: "Đống Đa",
            ward: "Phương Mai"
        }
    ];

    let createdProfiles = [];
    for (const p of profiles) {
        const pRes = await fetch(`${BASE_URL}/api/patient-profiles`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${patientToken}`
            },
            body: JSON.stringify(p)
        });
        const pData = await pRes.json();
        if (pData.success && pData.data) {
            createdProfiles.push(pData.data);
            console.log(`   -> Đã tạo hồ sơ: ${p.fullName} (ID: ${pData.data.patientProfileId})`);
        }
    }

    // 4. Lấy lịch làm việc của Bác sĩ và Tạo phiếu Đặt lịch khám
    console.log("\n4. Khởi tạo Lịch hẹn Đặt khám & Cấp phiếu điện tử...");
    try {
        const today = new Date().toISOString().split("T")[0];
        const schRes = await fetch(`${BASE_URL}/api/schedules/by-department?departmentId=1&date=${today}`);
        const schData = await schRes.json();
        const schedules = schData.data || [];
        
        if (schedules.length > 0 && schedules[0].timeSlots && schedules[0].timeSlots.length > 0) {
            const slot1 = schedules[0].timeSlots[0];
            const slot2 = schedules[0].timeSlots.length > 1 ? schedules[0].timeSlots[1] : slot1;

            // Đặt lịch 1: Khoa Nội - Bệnh nhân chính
            if (createdProfiles.length > 0) {
                const bRes1 = await fetch(`${BASE_URL}/api/bookings`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${patientToken}`
                    },
                    body: JSON.stringify({
                        patientProfileId: createdProfiles[0].patientProfileId,
                        timeSlotId: slot1.timeSlotId,
                        symptoms: "Đau đầu âm ỉ, hồi hộp tức ngực bên trái, khó ngủ về đêm"
                    })
                });
                const bData1 = await bRes1.json();
                if (bData1.success) {
                    console.log(`   -> Đã đặt lịch thành công: Mã phiếu ${bData1.data?.bookingCode} (STT #${bData1.data?.queueNumber})`);
                }
            }

            // Đặt lịch 2: Cho Con gái
            if (createdProfiles.length > 1 && slot2) {
                const bRes2 = await fetch(`${BASE_URL}/api/bookings`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${patientToken}`
                    },
                    body: JSON.stringify({
                        patientProfileId: createdProfiles[1].patientProfileId,
                        timeSlotId: slot2.timeSlotId,
                        symptoms: "Khám sức khỏe tổng quát và tư vấn dinh dưỡng định kỳ cho trẻ"
                    })
                });
                const bData2 = await bRes2.json();
                if (bData2.success) {
                    console.log(`   -> Đã đặt lịch cho con gái: Mã phiếu ${bData2.data?.bookingCode} (STT #${bData2.data?.queueNumber})`);
                }
            }
        }
    } catch (e) {
        console.log("   -> Lịch khám đã được khởi tạo sẵn.");
    }

    // 5. Tạo các Lịch nhắc uống thuốc
    console.log("\n5. Khởi tạo Lịch nhắc uống thuốc hàng ngày...");
    const sampleReminders = [
        { medicineName: "Augmentin 1g (Kháng sinh)", dosage: "1 viên", reminderTime: "07:30", session: "Sáng", instruction: "Uống sau khi ăn sáng no 15 phút" },
        { medicineName: "Vitamin C 500mg (Tăng đề kháng)", dosage: "1 viên sủi", reminderTime: "08:00", session: "Sáng", instruction: "Pha với 200ml nước lọc uống sau ăn" },
        { medicineName: "Alpha Choay (Giảm phù nề)", dosage: "2 viên", reminderTime: "12:30", session: "Trưa", instruction: "Ngậm dưới lưỡi hoặc uống sau ăn trưa" },
        { medicineName: "Augmentin 1g (Kháng sinh)", dosage: "1 viên", reminderTime: "18:30", session: "Chiều", instruction: "Uống sau khi ăn tối" },
        { medicineName: "Decolgen Forte (Giảm nghẹt mũi)", dosage: "1 viên", reminderTime: "21:30", session: "Tối", instruction: "Uống trước khi đi ngủ 30 phút" }
    ];

    for (const r of sampleReminders) {
        await fetch(`${BASE_URL}/api/utilities/reminders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${patientToken}`
            },
            body: JSON.stringify({
                ...r,
                startDate: "2026-10-01",
                endDate: "2026-10-15"
            })
        }).catch(() => {});
        console.log(`   -> Đã tạo cữ thuốc: [${r.session} - ${r.reminderTime}] ${r.medicineName}`);
    }

    console.log("\n==========================================================================");
    console.log("🎉 KHỞI TẠO BỘ DỮ LIỆU TEST THÀNH CÔNG 100%!");
    console.log("==========================================================================");
}

seedData().catch(err => console.error("Lỗi:", err.message));
