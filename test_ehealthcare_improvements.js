const crypto = require('crypto');

const BASE_URL = 'http://localhost:8080';
const VNPAY_SECRET = process.env.VNPAY_HASH_SECRET || 'BRYEEDJIJFAGUSDLEPIOPDMDYEMLDCAX';

function signVnpay(params, secret = VNPAY_SECRET) {
    const keys = Object.keys(params)
        .filter(k => k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType' && params[k] !== undefined && params[k] !== null && params[k] !== '')
        .sort();
    const signData = keys.map(k => `${k}=${encodeURIComponent(params[k])}`).join('&');
    return crypto.createHmac('sha512', secret).update(signData, 'utf8').digest('hex');
}

async function runTests() {
    console.log("==========================================================================");
    console.log("🏥 BẮT ĐẦU KIỂM THỬ TÍNH NĂNG CẢI TIẾN TỪ E-HEALTHCARE (TASK-13)");
    console.log("   1. Chuẩn hóa phản hồi VNPay IPN & Idempotency");
    console.log("   2. Clinical Decision Support (CDS) - Backend Drug Allergy Safety Check");
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

    let doctorToken = "";
    let testRecordId = "";
    let amoxMedicineId = null;
    let berberinMedicineId = null;

    // BƯỚC 0: ĐĂNG NHẬP BÁC SĨ / ADMIN
    await test("0.1. Đăng nhập tài khoản Bác sĩ / Admin (0937050537)", async () => {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phoneNumber: "0937050537", password: "taizz0537" })
        });
        const json = await res.json();
        if (!json.success || !json.data?.accessToken) {
            throw new Error("Không thể đăng nhập tài khoản Doctor/Admin: " + json.message);
        }
        doctorToken = json.data.accessToken;
    });

    // BƯỚC 0.2: LẤY DANH MỤC THUỐC
    await test("0.2. Lấy danh mục thuốc (Tìm Amoxicillin & Berberin)", async () => {
        const res = await fetch(`${BASE_URL}/api/clinical/medicines`, {
            headers: { Authorization: `Bearer ${doctorToken}` }
        });
        const json = await res.json();
        const medicines = json.data || [];
        if (medicines.length === 0) throw new Error("Danh mục thuốc trống!");

        const amox = medicines.find(m => m.medicineName.toLowerCase().includes("amoxicillin") || (m.activeIngredient && m.activeIngredient.toLowerCase().includes("amoxicillin")));
        const berberin = medicines.find(m => m.medicineName.toLowerCase().includes("berberin") || (m.activeIngredient && m.activeIngredient.toLowerCase().includes("berberin")));

        if (!amox) throw new Error("Không tìm thấy Amoxicillin trong danh mục thuốc!");
        amoxMedicineId = amox.medicineId;
        berberinMedicineId = berberin ? berberin.medicineId : medicines[0].medicineId;
        console.log(`   -> Thuốc Amoxicillin ID: ${amoxMedicineId}, Berberin ID: ${berberinMedicineId}`);
    });

    // BƯỚC 0.3: KHỞI TẠO CA KHÁM VÀ HỒ SƠ BỆNH ÁN CÓ TIỀN SỬ DỊ ỨNG
    await test("0.3. Khởi tạo ca khám bệnh có tiền sử dị ứng Penicillin", async () => {
        const kioskRes = await fetch(`${BASE_URL}/api/bookings/kiosk`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName: "Trần Văn Dị Ứng Kháng Sinh",
                phoneNumber: "0912349999",
                departmentId: 1,
                symptoms: "Sốt cao, đau rát họng, tiền sử dị ứng Penicillin và Amoxicillin (Sốc phản vệ độ 2)",
                isPriority: false
            })
        });
        const kioskJson = await kioskRes.json();
        if (!kioskJson.success || !kioskJson.data?.bookingCode) {
            throw new Error("Không thể tạo ca khám qua Kiosk: " + kioskJson.message);
        }
        const bCode = kioskJson.data.bookingCode;

        // Bác sĩ tiếp nhận bệnh nhân
        const startRes = await fetch(`${BASE_URL}/api/clinical/start`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${doctorToken}`
            },
            body: JSON.stringify({
                bookingCode: bCode,
                symptoms: "Sốt cao, đau họng, bệnh nhân có tiền sử dị ứng Penicillin và Amoxicillin (Sốc phản vệ)",
                initialDiagnosis: "Viêm họng cấp (J02.9) - Dị ứng Penicillin"
            })
        });
        const startJson = await startRes.json();
        if (!startJson.success || !startJson.data?.recordId) {
            throw new Error("Không thể tiếp nhận bệnh nhân: " + startJson.message);
        }
        testRecordId = startJson.data.recordId;
        console.log(`   -> Khởi tạo thành công hồ sơ khám bệnh ID: ${testRecordId}`);
    });

    // =========================================================================
    // PHẦN 1: KIỂM THỬ CHUẨN HÓA VNPAY IPN & IDEMPOTENCY
    // =========================================================================

    await test("1.1. VNPay IPN từ chối chữ ký không hợp lệ (RspCode: 97)", async () => {
        const params = new URLSearchParams({
            vnp_TxnRef: "TXN_TEST_INVALID_SIG",
            vnp_Amount: "10000000",
            vnp_ResponseCode: "00",
            vnp_SecureHash: "deadbeefcafebabe12345678"
        });

        const res = await fetch(`${BASE_URL}/api/payment/vnpay/ipn?${params.toString()}`);
        const json = await res.json();
        if (json.RspCode !== "97") {
            throw new Error(`Kỳ vọng RspCode 97 nhưng nhận ${json.RspCode} (${json.Message})`);
        }
    });

    await test("1.2. VNPay IPN báo đơn hàng không tồn tại (RspCode: 01)", async () => {
        const rawParams = {
            vnp_TxnRef: "TXN_NON_EXISTENT_999999",
            vnp_Amount: "10000000",
            vnp_ResponseCode: "00",
            vnp_TmnCode: "P48XA8RI"
        };
        rawParams.vnp_SecureHash = signVnpay(rawParams);

        const params = new URLSearchParams(rawParams);
        const res = await fetch(`${BASE_URL}/api/payment/vnpay/ipn?${params.toString()}`);
        const json = await res.json();
        if (json.RspCode !== "01") {
            throw new Error(`Kỳ vọng RspCode 01 nhưng nhận ${json.RspCode} (${json.Message})`);
        }
    });

    let createdTxnRef = "";
    await test("1.3. Chuẩn bị giao dịch nạp tiền kiểm thử VNPay IPN", async () => {
        const urlRes = await fetch(`${BASE_URL}/api/payment/vnpay/create-url?amount=50000&type=DEPOSIT_WALLET`, {
            method: "POST",
            headers: { Authorization: `Bearer ${doctorToken}` }
        });
        const urlJson = await urlRes.json();
        if (!urlJson.success || !urlJson.data) {
            throw new Error("Không tạo được VNPay URL: " + urlJson.message);
        }
        const payUrl = new URL(urlJson.data);
        createdTxnRef = payUrl.searchParams.get("vnp_TxnRef");
        if (!createdTxnRef) throw new Error("Không tìm thấy vnp_TxnRef trong payUrl");
        console.log(`   -> Đã tạo giao dịch VNPay kiểm thử: ${createdTxnRef}`);
    });

    await test("1.4. VNPay IPN từ chối khi số tiền không khớp (RspCode: 04)", async () => {
        const rawParams = {
            vnp_TxnRef: createdTxnRef,
            vnp_Amount: "99999900", // 999,999 VND khác 50,000 VND
            vnp_ResponseCode: "00",
            vnp_TmnCode: "P48XA8RI"
        };
        rawParams.vnp_SecureHash = signVnpay(rawParams);

        const params = new URLSearchParams(rawParams);
        const res = await fetch(`${BASE_URL}/api/payment/vnpay/ipn?${params.toString()}`);
        const json = await res.json();
        if (json.RspCode !== "04") {
            throw new Error(`Kỳ vọng RspCode 04 nhưng nhận ${json.RspCode} (${json.Message})`);
        }
    });

    await test("1.5. VNPay IPN xác nhận đơn hàng thành công (RspCode: 00)", async () => {
        const rawParams = {
            vnp_TxnRef: createdTxnRef,
            vnp_Amount: "5000000", // 50,000 VND * 100
            vnp_ResponseCode: "00",
            vnp_TmnCode: "P48XA8RI"
        };
        rawParams.vnp_SecureHash = signVnpay(rawParams);

        const params = new URLSearchParams(rawParams);
        const res = await fetch(`${BASE_URL}/api/payment/vnpay/ipn?${params.toString()}`);
        const json = await res.json();
        if (json.RspCode !== "00") {
            throw new Error(`Kỳ vọng RspCode 00 nhưng nhận ${json.RspCode} (${json.Message})`);
        }

        // Kiểm tra lại trạng thái transaction trong DB
        const stRes = await fetch(`${BASE_URL}/api/payment/status/${createdTxnRef}`, {
            headers: { Authorization: `Bearer ${doctorToken}` }
        });
        const stJson = await stRes.json();
        if (stJson.data?.status !== "SUCCESS") {
            throw new Error(`Trạng thái transaction kỳ vọng SUCCESS nhưng là: ${stJson.data?.status}`);
        }
    });

    await test("1.6. VNPay IPN Idempotency: từ chối xử lý lặp khi đã SUCCESS (RspCode: 02)", async () => {
        const rawParams = {
            vnp_TxnRef: createdTxnRef,
            vnp_Amount: "5000000",
            vnp_ResponseCode: "00",
            vnp_TmnCode: "P48XA8RI"
        };
        rawParams.vnp_SecureHash = signVnpay(rawParams);

        const params = new URLSearchParams(rawParams);
        const res = await fetch(`${BASE_URL}/api/payment/vnpay/ipn?${params.toString()}`);
        const json = await res.json();
        if (json.RspCode !== "02") {
            throw new Error(`Kỳ vọng RspCode 02 (Order already confirmed) nhưng nhận ${json.RspCode} (${json.Message})`);
        }
    });

    // =========================================================================
    // PHẦN 2: KIỂM THỬ CLINICAL DECISION SUPPORT (CDS) - DRUG ALLERGY SAFETY CHECK
    // =========================================================================

    await test("2.1. CDS Check Safety phát hiện dị ứng Penicillin khi kê Amoxicillin", async () => {
        const payload = {
            patientAllergies: "Dị ứng Penicillin, Amoxicillin (Sốc phản vệ độ 2)",
            items: [
                {
                    medicineId: amoxMedicineId,
                    quantity: 14,
                    morningAmount: 1,
                    noonAmount: 0,
                    afternoonAmount: 1,
                    eveningAmount: 0,
                    dosageInstruction: "Uống sau ăn"
                }
            ]
        };

        const res = await fetch(`${BASE_URL}/api/clinical/records/${testRecordId}/prescription/check-safety`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${doctorToken}`
            },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (!json.success || !json.data) {
            throw new Error("API check-safety thất bại: " + json.message);
        }

        const data = json.data;
        if (data.safe !== false || data.criticalCount < 1) {
            throw new Error(`Kỳ vọng safe=false và criticalCount >= 1 nhưng nhận safe=${data.safe}, criticalCount=${data.criticalCount}`);
        }
        console.log(`   -> Cảnh báo nhận được: ${data.warnings[0].warningMessage}`);
    });

    await test("2.2. CDS Check Safety xác nhận an toàn khi không trùng dị ứng (Berberin)", async () => {
        const payload = {
            patientAllergies: "Dị ứng Penicillin, Amoxicillin",
            items: [
                {
                    medicineId: berberinMedicineId,
                    quantity: 10,
                    morningAmount: 1,
                    noonAmount: 0,
                    afternoonAmount: 1,
                    eveningAmount: 0,
                    dosageInstruction: "Uống sau ăn"
                }
            ]
        };

        const res = await fetch(`${BASE_URL}/api/clinical/records/${testRecordId}/prescription/check-safety`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${doctorToken}`
            },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (!json.success || !json.data) {
            throw new Error("API check-safety thất bại: " + json.message);
        }

        const data = json.data;
        if (data.safe !== true || data.criticalCount !== 0) {
            throw new Error(`Kỳ vọng safe=true và criticalCount=0 nhưng nhận safe=${data.safe}, criticalCount=${data.criticalCount}`);
        }
    });

    await test("2.3. Backend từ chối kê đơn dị ứng nếu không có overrideAllergyWarning (HTTP 400)", async () => {
        const res = await fetch(`${BASE_URL}/api/clinical/records/${testRecordId}/prescriptions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${doctorToken}`
            },
            body: JSON.stringify({
                doctorNotes: "Kê đơn thử nghiệm không override",
                overrideAllergyWarning: false,
                items: [
                    {
                        medicineId: amoxMedicineId,
                        quantity: 10,
                        morningAmount: 1,
                        noonAmount: 0,
                        afternoonAmount: 1,
                        eveningAmount: 0,
                        dosageInstruction: "Uống sau ăn"
                    }
                ]
            })
        });

        if (res.status !== 400) {
            throw new Error(`Kỳ vọng HTTP 400 Bad Request chặn dị ứng nhưng nhận status: ${res.status}`);
        }
        const json = await res.json();
        console.log(`   -> Backend chặn thành công với HTTP 400: "${json.message}"`);
    });

    await test("2.4. Bác sĩ xác nhận ghi đè lâm sàng (overrideAllergyWarning=true) kê đơn thành công", async () => {
        const res = await fetch(`${BASE_URL}/api/clinical/records/${testRecordId}/prescriptions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${doctorToken}`
            },
            body: JSON.stringify({
                doctorNotes: "Đã đánh giá lâm sàng, ghi đè cảnh báo dị ứng",
                overrideAllergyWarning: true,
                items: [
                    {
                        medicineId: amoxMedicineId,
                        quantity: 10,
                        morningAmount: 1,
                        noonAmount: 0,
                        afternoonAmount: 1,
                        eveningAmount: 0,
                        dosageInstruction: "Uống sau ăn"
                    }
                ]
            })
        });

        if (res.status !== 201) {
            const errText = await res.text();
            throw new Error(`Kỳ vọng HTTP 201 Created nhưng nhận status: ${res.status} (${errText})`);
        }
        const json = await res.json();
        if (!json.success || !json.data?.prescriptionCode) {
            throw new Error("Không tạo được đơn thuốc: " + json.message);
        }
        console.log(`   -> Đã tạo toa thuốc thành công với ghi đè lâm sàng: Mã toa [${json.data.prescriptionCode}], tổng tiền: ${json.data.totalAmount}đ`);
    });

    console.log("\n==========================================================================");
    console.log(`🎉 TỔNG KẾT KIỂM THỬ: ${passed} PASS, ${failed} FAIL / TỔNG SỐ ${passed + failed} TEST`);
    console.log("==========================================================================");

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error("Lỗi thực thi kiểm thử:", err);
    process.exit(1);
});
