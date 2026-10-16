const BASE_URL = 'http://localhost:8080';

async function runSecurityTests() {
    console.log("==========================================================================");
    console.log("🛡️  BẮT ĐẦU KIỂM THỬ BẢO MẬT & TÍNH TOÀN VẸN DỮ LIỆU (10 TIÊU CHÍ)");
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

    // 0. Đăng nhập để lấy tokens
    await test("0. Đăng nhập tài khoản kiểm thử", async () => {
        const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phoneNumber: "0937050537", password: "taizz0537" })
        });
        const adminJson = await adminRes.json();
        if (!adminJson.data?.accessToken) throw new Error("Không thể đăng nhập Admin: " + adminJson.message);
        cashierToken = adminJson.data.accessToken;

        const pRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phoneNumber: "0988889999", password: "password123" })
        });
        const pJson = await pRes.json();
        if (!pJson.data?.accessToken) throw new Error("Không thể đăng nhập Bệnh nhân: " + pJson.message);
        patientToken = pJson.data.accessToken;
    });

    // TIÊU CHÍ 1: Người chưa xác thực không thể tra cứu hồ sơ bệnh nhân, đọc DICOM worklist hoặc gửi callback PACS/LIS
    await test("TC 1.1: Chặn truy cập công khai vào /api/patient-profiles/lookup (kỳ vọng 401/403)", async () => {
        const res = await fetch(`${BASE_URL}/api/patient-profiles/lookup?keyword=0987`);
        if (res.status !== 401 && res.status !== 403) {
            throw new Error(`Endpoint vẫn mở công khai! HTTP Status trả về: ${res.status}`);
        }
    });

    await test("TC 1.2: Chặn truy cập công khai vào /api/gateway/ris/worklist (kỳ vọng 401/403)", async () => {
        const res = await fetch(`${BASE_URL}/api/gateway/ris/worklist`);
        if (res.status !== 401 && res.status !== 403) {
            throw new Error(`DICOM worklist vẫn mở công khai! HTTP Status trả về: ${res.status}`);
        }
    });

    await test("TC 1.3: Chặn truy cập công khai vào /api/gateway/pacs/callback (kỳ vọng 401/403)", async () => {
        const res = await fetch(`${BASE_URL}/api/gateway/pacs/callback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studyInstanceUid: "1.2.3.4", status: "COMPLETED" })
        });
        if (res.status !== 401 && res.status !== 403) {
            throw new Error(`PACS callback vẫn mở công khai! HTTP Status trả về: ${res.status}`);
        }
    });

    await test("TC 1.4: Chặn truy cập công khai vào /api/gateway/lis/results (kỳ vọng 401/403)", async () => {
        const res = await fetch(`${BASE_URL}/api/gateway/lis/results`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ barcode: "TEST-001", results: [] })
        });
        if (res.status !== 401 && res.status !== 403) {
            throw new Error(`LIS results vẫn mở công khai! HTTP Status trả về: ${res.status}`);
        }
    });

    // TIÊU CHÍ 2: Người dùng có quyền chỉ nhận dữ liệu tối thiểu cần thiết (Data Minimization & Masking)
    await test("TC 2: Tra cứu hồ sơ có xác thực che/masking CCCD, SĐT, BHYT, địa chỉ", async () => {
        const res = await fetch(`${BASE_URL}/api/patient-profiles/lookup?keyword=0987`, {
            headers: { Authorization: `Bearer ${cashierToken}` }
        });
        if (res.status !== 200) throw new Error(`Tra cứu thất bại với quyền hợp lệ: HTTP ${res.status}`);
        const json = await res.json();
        const list = json.data || [];
        if (list.length > 0) {
            const first = list[0];
            // Kiểm tra masking
            if (first.identityNumber && !first.identityNumber.includes("*")) {
                throw new Error(`Số CCCD chưa được che/masking: ${first.identityNumber}`);
            }
            if (first.phoneNumber && !first.phoneNumber.includes("*")) {
                throw new Error(`Số điện thoại chưa được che/masking: ${first.phoneNumber}`);
            }
            if (first.healthInsuranceNumber && !first.healthInsuranceNumber.includes("*")) {
                throw new Error(`Số BHYT chưa được che/masking: ${first.healthInsuranceNumber}`);
            }
        }
    });

    // TIÊU CHÍ 3: Thanh toán ví với số tiền âm, bằng 0, hoặc quá scale bị từ chối
    await test("TC 3.1: Từ chối thanh toán số tiền âm (-50,000 VNĐ) qua /api/payment/wallet/pay (kỳ vọng 400)", async () => {
        const res = await fetch(`${BASE_URL}/api/payment/wallet/pay?amount=-50000&type=PAY_BOOKING`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${patientToken}`
            }
        });
        if (res.status !== 400) {
            throw new Error(`Số tiền âm không bị từ chối! HTTP Status trả về: ${res.status}`);
        }
    });

    await test("TC 3.2: Từ chối thanh toán số tiền bằng 0 qua /api/payment/wallet/pay (kỳ vọng 400)", async () => {
        const res = await fetch(`${BASE_URL}/api/payment/wallet/pay?amount=0&type=PAY_BOOKING`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${patientToken}`
            }
        });
        if (res.status !== 400) {
            throw new Error(`Số tiền 0đ không bị từ chối! HTTP Status trả về: ${res.status}`);
        }
    });

    await test("TC 3.3: Từ chối nạp tiền ví số tiền âm qua /api/payment/vnpay/create-url (kỳ vọng 400)", async () => {
        const res = await fetch(`${BASE_URL}/api/payment/vnpay/create-url?amount=-100000&type=DEPOSIT_WALLET`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${patientToken}`
            }
        });
        if (res.status !== 400) {
            throw new Error(`Nạp tiền âm không bị từ chối! HTTP Status trả về: ${res.status}`);
        }
    });

    // TIÊU CHÍ 4: Webhook / Callback VNPay / PayOS chống lặp (Idempotency) & xác minh chữ ký
    await test("TC 4.1: VNPay Callback từ chối khi sai chữ ký (SecureHash) (kỳ vọng 400)", async () => {
        // Tạo trước 1 URL nạp ví hợp lệ để có transaction trong DB
        const createRes = await fetch(`${BASE_URL}/api/payment/vnpay/create-url?amount=100000&type=DEPOSIT_WALLET`, {
            method: "POST",
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        const createJson = await createRes.json();
        const paymentUrl = typeof createJson.data === 'string' ? createJson.data : createJson.data?.paymentUrl;
        if (!paymentUrl) throw new Error("Không thể tạo URL VNPay test: " + createJson.message);
        
        // Trích xuất vnp_TxnRef từ URL
        const parsedUrl = new URL(paymentUrl);
        const validTxnRef = parsedUrl.searchParams.get("vnp_TxnRef");
        if (!validTxnRef) throw new Error("Không tìm thấy vnp_TxnRef trong paymentUrl");

        const fakeParams = new URLSearchParams({
            vnp_Amount: "10000000",
            vnp_BankCode: "NCB",
            vnp_BankTranNo: "VNP14043254",
            vnp_CardType: "ATM",
            vnp_OrderInfo: "Nap tien vi qua VNPay",
            vnp_PayDate: "20261013210000",
            vnp_ResponseCode: "00",
            vnp_TmnCode: "P48XA8RI",
            vnp_TransactionNo: "14043254",
            vnp_TransactionStatus: "00",
            vnp_TxnRef: validTxnRef,
            vnp_SecureHash: "INVALID_HASH_SECRET_ATTACK_123456"
        });

        const res = await fetch(`${BASE_URL}/api/payment/vnpay/callback?${fakeParams.toString()}`);
        if (res.status !== 400) {
            throw new Error(`VNPay callback sai chữ ký không bị từ chối 400! HTTP Status: ${res.status}`);
        }
    });

    // TIÊU CHÍ 5: Hai yêu cầu thu tiền đồng thời cho cùng một booking chỉ tạo tối đa một giao dịch thành công (409 Conflict)
    await test("TC 5: Chống thu trùng viện phí đồng thời (Race condition) với Pessimistic Lock (kỳ vọng 1 thành công 200, 1 xung đột 409)", async () => {
        // Tạo một booking mới qua Kiosk
        const kioskRes = await fetch(`${BASE_URL}/api/bookings/kiosk`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName: "Bệnh Nhân Test RaceCondition",
                phoneNumber: "0912999888",
                departmentId: 1,
                symptoms: "Kiểm thử thu trùng đồng thời"
            })
        });
        const kioskJson = await kioskRes.json();
        const bookingCode = kioskJson.data?.bookingCode;
        if (!bookingCode) throw new Error("Không thể tạo booking test qua Kiosk");

        // Gửi 2 yêu cầu thu tiền song song cho cùng mã ca khám với amountGiven = 500,000đ (đủ chi trả 300,000đ)
        const [req1, req2] = await Promise.all([
            fetch(`${BASE_URL}/api/cashier/pay`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${cashierToken}`
                },
                body: JSON.stringify({
                    bookingCode: bookingCode,
                    paymentMethod: "CASH",
                    amountGiven: 500000,
                    notes: "Thu đồng thời 1"
                })
            }),
            fetch(`${BASE_URL}/api/cashier/pay`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${cashierToken}`
                },
                body: JSON.stringify({
                    bookingCode: bookingCode,
                    paymentMethod: "CASH",
                    amountGiven: 500000,
                    notes: "Thu đồng thời 2"
                })
            })
        ]);

        const statuses = [req1.status, req2.status];
        const successCount = statuses.filter(s => s === 200).length;
        const conflictCount = statuses.filter(s => s === 409).length;

        if (successCount !== 1 || conflictCount !== 1) {
            throw new Error(`Kỳ vọng chính xác 1 yêu cầu thành công (200) và 1 yêu cầu bị xung đột (409). Kết quả thực tế: ${JSON.stringify(statuses)}`);
        }
    });

    // TIÊU CHÍ 6: API giao dịch không trả password/hash/token/pin; chặn IDOR
    await test("TC 6.1: API /api/payment/admin/transactions không chứa password, hash, token, pin (DTO allowlist)", async () => {
        const res = await fetch(`${BASE_URL}/api/payment/admin/transactions?page=0&size=10`, {
            headers: { Authorization: `Bearer ${cashierToken}` }
        });
        if (res.status !== 200) throw new Error(`Lấy danh sách giao dịch thất bại: HTTP ${res.status}`);
        const text = await res.text();
        const forbiddenKeys = ["password", "passwordHash", "token", "pinCode", "secretKey"];
        for (const key of forbiddenKeys) {
            if (text.toLowerCase().includes(`"${key.toLowerCase()}"`)) {
                throw new Error(`Phát hiện rò rỉ trường bảo mật [${key}] trong response JSON!`);
            }
        }
    });

    await test("TC 6.2: Người dùng thường không thể xem trạng thái giao dịch của người khác (IDOR Protection) (kỳ vọng 403)", async () => {
        // Lấy 1 giao dịch của Admin/Cashier vừa tạo
        const listRes = await fetch(`${BASE_URL}/api/payment/admin/transactions?page=0&size=1`, {
            headers: { Authorization: `Bearer ${cashierToken}` }
        });
        const listJson = await listRes.json();
        const txns = listJson.data?.content || listJson.data || [];
        if (txns.length > 0) {
            const adminTxnRef = txns[0].vnpayTxnRef;
            if (adminTxnRef) {
                // Bệnh nhân thường tra cứu txnRef của Admin -> phải nhận 403 Forbidden!
                const idorRes = await fetch(`${BASE_URL}/api/payment/status/${adminTxnRef}`, {
                    headers: { Authorization: `Bearer ${patientToken}` }
                });
                if (idorRes.status !== 403) {
                    throw new Error(`Lỗ hổng IDOR! Bệnh nhân thường xem được giao dịch của tài khoản khác (HTTP Status: ${idorRes.status})`);
                }
            }
        }
    });

    // TIÊU CHÍ 7: Bảo vệ chống IDOR cho Hồ sơ Bệnh nhân (Học hỏi từ revita-be: medical-record.service.ts)
    await test("TC 7.1: Bệnh nhân thường không thể xem hồ sơ bệnh nhân của tài khoản khác (kỳ vọng 403)", async () => {
        // Lấy danh sách hồ sơ của Admin/Staff
        const adminProfilesRes = await fetch(`${BASE_URL}/api/patient-profiles`, {
            headers: { Authorization: `Bearer ${cashierToken}` }
        });
        const adminProfilesJson = await adminProfilesRes.json();
        const adminProfiles = adminProfilesJson.data || [];
        if (adminProfiles.length > 0) {
            const otherProfileId = adminProfiles[0].patientProfileId;
            // Bệnh nhân thường gọi GET /api/patient-profiles/{otherProfileId}
            const res = await fetch(`${BASE_URL}/api/patient-profiles/${otherProfileId}`, {
                headers: { Authorization: `Bearer ${patientToken}` }
            });
            if (res.status !== 403) {
                throw new Error(`Lỗ hổng IDOR! Bệnh nhân thường truy cập được hồ sơ của người khác (HTTP Status: ${res.status})`);
            }
        }
    });

    await test("TC 7.2: Bệnh nhân được phép xem hồ sơ bệnh nhân của chính mình (kỳ vọng 200)", async () => {
        // Lấy danh sách hồ sơ của chính bệnh nhân
        const myProfilesRes = await fetch(`${BASE_URL}/api/patient-profiles`, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        const myProfilesJson = await myProfilesRes.json();
        const myProfiles = myProfilesJson.data || [];
        if (myProfiles.length > 0) {
            const myProfileId = myProfiles[0].patientProfileId;
            const res = await fetch(`${BASE_URL}/api/patient-profiles/${myProfileId}`, {
                headers: { Authorization: `Bearer ${patientToken}` }
            });
            if (res.status !== 200) {
                throw new Error(`Không thể xem hồ sơ của chính mình: HTTP ${res.status}`);
            }
        }
    });

    // TIÊU CHÍ 8: Thuật toán Phân loại Ưu tiên Y tế (Priority Triage) tại Tiếp đón / Kiosk (Học hỏi từ revita-be: priority-calculator.service.ts)
    await test("TC 8: Kiosk tự động phát hiện Người cao tuổi (>= 65 tuổi) và gắn nhãn UT- (Ưu tiên)", async () => {
        const elderlyRes = await fetch(`${BASE_URL}/api/bookings/kiosk`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName: "Cụ Ông Ưu Tiên 71 Tuổi",
                phoneNumber: "0901234777",
                departmentId: 1,
                birthYear: 1955, // 71 tuổi
                symptoms: "Đau mỏi vai gáy người cao tuổi"
            })
        });
        if (elderlyRes.status !== 201 && elderlyRes.status !== 200) {
            throw new Error(`Tạo ca khám Kiosk cho người cao tuổi thất bại: HTTP ${elderlyRes.status}`);
        }
        const json = await elderlyRes.json();
        const booking = json.data;
        if (!booking) throw new Error("Không nhận được dữ liệu booking từ response");

        if (booking.isPriority !== true) {
            throw new Error(`Ca khám của bệnh nhân 71 tuổi không được tự động gắn cờ isPriority = true!`);
        }
        if (!booking.queueCode || !booking.queueCode.startsWith("UT-")) {
            throw new Error(`Mã số thứ tự không có tiền tố UT- (Ưu tiên)! Nhận được: ${booking.queueCode}`);
        }
        if (!booking.priorityReason || !booking.priorityReason.includes("Người cao tuổi")) {
            throw new Error(`Lý do ưu tiên không khớp! Nhận được: ${booking.priorityReason}`);
        }
    });

    console.log("\n==========================================================================");
    console.log(`🏁 KẾT THÚC KIỂM THỬ: ${passed} PASS, ${failed} FAIL`);
    console.log("==========================================================================");

    if (failed > 0) {
        process.exit(1);
    }
}

runSecurityTests().catch(err => {
    console.error("Lỗi thực thi kiểm thử:", err);
    process.exit(1);
});
