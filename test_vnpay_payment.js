const crypto = require('crypto');

const BASE_URL = 'http://localhost:8080';
const HASH_SECRET = 'BRYEEDJIJFAGUSDLEPIOPDMDYEMLDCAX';
const TMN_CODE = 'P48XA8RI';

// Hàm mã hóa khớp chính xác với Java URLEncoder.encode(..., "US-ASCII")
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
    
    const hashData = sortedKeys
        .map(k => `${k}=${javaUrlEncode(params[k])}`)
        .join('&');
    
    const hmac = crypto.createHmac('sha512', secretKey);
    hmac.update(Buffer.from(hashData, 'utf-8'));
    return hmac.digest('hex');
}

async function runVNPayTests() {
    console.log("==========================================================================");
    console.log("💳 BẮT ĐẦU KIỂM THỬ QUY TRÌNH THANH TOÁN VNPAY (END-TO-END AUTOMATED)");
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

    let patientToken = "";
    let patientId = "";
    let testPhone = `098${Math.floor(1000000 + Math.random() * 9000000)}`;

    // 1. Đăng ký & Đăng nhập tài khoản Bệnh nhân mới
    await test("1. Đăng ký & Đăng nhập tài khoản Bệnh nhân", async () => {
        const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName: "Bệnh Nhân Test VNPay",
                phoneNumber: testPhone,
                email: `vnpay_${Date.now()}@gmail.com`,
                password: "password123",
                role: "ROLE_PATIENT"
            }),
        });
        const regJson = await regRes.json();
        if (!regJson.success) throw new Error(regJson.message || "Đăng ký thất bại");

        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phoneNumber: testPhone, password: "password123" }),
        });
        const loginJson = await loginRes.json();
        if (!loginJson.success || !loginJson.data?.accessToken) throw new Error("Đăng nhập thất bại");
        patientToken = loginJson.data.accessToken;
        patientId = loginJson.data.userId;
    });

    // 2. Tạo URL thanh toán VNPay nạp tiền ví (DEPOSIT_WALLET)
    let depositTxnRef = "";
    let depositPaymentUrl = "";
    const depositAmount = 500000; // 500,000 VND

    await test("2. Khởi tạo liên kết thanh toán VNPay nạp tiền ví (DEPOSIT_WALLET 500.000đ)", async () => {
        const res = await fetch(`${BASE_URL}/api/payment/vnpay/create-url?amount=${depositAmount}&type=DEPOSIT_WALLET`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${patientToken}` }
        });
        const json = await res.json();
        if (!json.success || !json.data) throw new Error(json.message || "Không tạo được URL thanh toán");

        depositPaymentUrl = json.data;
        const urlObj = new URL(depositPaymentUrl);
        depositTxnRef = urlObj.searchParams.get("vnp_TxnRef");
        const amountParam = urlObj.searchParams.get("vnp_Amount");
        const secureHash = urlObj.searchParams.get("vnp_SecureHash");

        if (!depositPaymentUrl.includes("sandbox.vnpayment.vn")) throw new Error("URL không trỏ đến VNPay Sandbox");
        if (!depositTxnRef) throw new Error("Thiếu mã vnp_TxnRef trong URL");
        if (amountParam !== String(depositAmount * 100)) throw new Error(`vnp_Amount không đúng: ${amountParam}`);
        if (!secureHash) throw new Error("Thiếu vnp_SecureHash trong URL khởi tạo");

        console.log(`   -> VNPay URL Sandbox: ${depositPaymentUrl.substring(0, 75)}...`);
        console.log(`   -> Transaction Ref (vnp_TxnRef): ${depositTxnRef}`);
    });

    // 3. Giả lập VNPay Callback THÀNH CÔNG (Response Code 00)
    await test("3. Giả lập VNPay Callback thanh toán THÀNH CÔNG (vnp_ResponseCode = 00)", async () => {
        const callbackParams = {
            vnp_Amount: String(depositAmount * 100),
            vnp_BankCode: "NCB",
            vnp_BankTranNo: "VNP14321234",
            vnp_CardType: "ATM",
            vnp_OrderInfo: "Thanh toan vien phi The Duck Hospital",
            vnp_PayDate: "20261002230000",
            vnp_ResponseCode: "00",
            vnp_TmnCode: TMN_CODE,
            vnp_TransactionNo: "14123456",
            vnp_TransactionStatus: "00",
            vnp_TxnRef: depositTxnRef
        };

        const secureHash = signVNPayParams(callbackParams, HASH_SECRET);
        callbackParams.vnp_SecureHash = secureHash;

        const queryParams = new URLSearchParams(callbackParams);
        const res = await fetch(`${BASE_URL}/api/payment/vnpay/callback?${queryParams.toString()}`);
        const json = await res.json();
        
        if (!json.success || !json.data) throw new Error(json.message || "Callback xử lý thất bại");
        if (json.data.status !== "SUCCESS") throw new Error(`Trạng thái giao dịch không phải SUCCESS: ${json.data.status} - ${json.data.description}`);
        console.log(`   -> Trạng thái giao dịch: ${json.data.status} | Loại: ${json.data.transactionType}`);
    });

    // 4. Kiểm thử thanh toán dịch vụ bằng Ví nội bộ sau khi nạp tiền thành công
    await test("4. Thanh toán dịch vụ khám bệnh bằng Ví nội bộ (/api/payment/wallet/pay)", async () => {
        const payRes = await fetch(`${BASE_URL}/api/payment/wallet/pay?amount=${depositAmount}&type=PAY_BOOKING`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${patientToken}` }
        });
        const payJson = await payRes.json();
        if (!payJson.success) throw new Error(payJson.message || "Thanh toán ví thất bại");
        console.log(`   -> Thanh toán 500.000đ bằng ví thành công (Số dư còn lại: 0đ)`);
    });

    // 5. Kiểm thử số dư không đủ khi tiếp tục thanh toán
    await test("5. Kiểm thử bảo vệ số dư ví: Cố tình thanh toán khi số dư đã hết", async () => {
        const payRes = await fetch(`${BASE_URL}/api/payment/wallet/pay?amount=10000&type=PAY_BOOKING`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${patientToken}` }
        });
        const payJson = await payRes.json();
        if (payRes.status === 400 && payJson.message && payJson.message.includes("Số dư ví không đủ")) {
            console.log(`   -> Đã chặn chính xác: ${payJson.message}`);
        } else {
            throw new Error(`Kỳ vọng chặn với mã 400 nhưng nhận status ${payRes.status}: ${JSON.stringify(payJson)}`);
        }
    });

    // 6. Khởi tạo thanh toán viện phí trực tiếp qua VNPay & Giả lập KHÁCH HÀNG HỦY (Response Code 24)
    let failTxnRef = "";
    await test("6. Khởi tạo thanh toán Viện phí & Giả lập HỦY giao dịch (vnp_ResponseCode = 24)", async () => {
        const createRes = await fetch(`${BASE_URL}/api/payment/vnpay/create-url?amount=150000&type=PAY_INPATIENT_FEE`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${patientToken}` }
        });
        const createJson = await createRes.json();
        if (!createJson.success || !createJson.data) throw new Error("Không tạo được URL viện phí");
        
        const urlObj = new URL(createJson.data);
        failTxnRef = urlObj.searchParams.get("vnp_TxnRef");

        const callbackParams = {
            vnp_Amount: "15000000",
            vnp_BankCode: "NCB",
            vnp_OrderInfo: "Thanh toan vien phi The Duck Hospital",
            vnp_PayDate: "20261002230500",
            vnp_ResponseCode: "24", // 24 = Khách hàng hủy giao dịch
            vnp_TmnCode: TMN_CODE,
            vnp_TransactionNo: "0",
            vnp_TransactionStatus: "02",
            vnp_TxnRef: failTxnRef
        };

        const secureHash = signVNPayParams(callbackParams, HASH_SECRET);
        callbackParams.vnp_SecureHash = secureHash;

        const queryParams = new URLSearchParams(callbackParams);
        const res = await fetch(`${BASE_URL}/api/payment/vnpay/callback?${queryParams.toString()}`);
        const json = await res.json();

        if (!json.success || !json.data) throw new Error(json.message || "Callback thất bại");
        if (json.data.status !== "FAILED") throw new Error(`Kỳ vọng FAILED nhưng nhận: ${json.data.status}`);
        console.log(`   -> Trạng thái giao dịch: ${json.data.status} | Ghi chú lỗi: ${json.data.description}`);
    });

    // 7. Kiểm thử Bảo mật: Callback với SAI CHỮ KÝ BẢO MẬT (Tampered Signature)
    await test("7. Kiểm thử Bảo mật: Chống giả mạo chữ ký VNPay (Tampered Signature)", async () => {
        const createRes = await fetch(`${BASE_URL}/api/payment/vnpay/create-url?amount=300000&type=DEPOSIT_WALLET`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${patientToken}` }
        });
        const createJson = await createRes.json();
        const urlObj = new URL(createJson.data);
        const tamperedTxnRef = urlObj.searchParams.get("vnp_TxnRef");

        const callbackParams = {
            vnp_Amount: "30000000",
            vnp_BankCode: "NCB",
            vnp_OrderInfo: "Thanh toan vien phi The Duck Hospital",
            vnp_PayDate: "20261002231000",
            vnp_ResponseCode: "00", // Kẻ tấn công cố tình giả lập 00 (Thành công)
            vnp_TmnCode: TMN_CODE,
            vnp_TransactionNo: "14123457",
            vnp_TransactionStatus: "00",
            vnp_TxnRef: tamperedTxnRef,
            vnp_SecureHash: "TAMPERED_INVALID_HASH_VALUE_1234567890abcdef"
        };

        const queryParams = new URLSearchParams(callbackParams);
        const res = await fetch(`${BASE_URL}/api/payment/vnpay/callback?${queryParams.toString()}`);
        const json = await res.json();

        if (json.data && json.data.status === "FAILED" && json.data.description.includes("Chữ ký không hợp lệ")) {
            console.log(`   -> Đã chặn thành công: Giao dịch bị đánh dấu FAILED do sai chữ ký.`);
        } else {
            throw new Error(`Hệ thống không phát hiện sai chữ ký: ${JSON.stringify(json)}`);
        }
    });

    // 8. Kiểm tra Lịch sử giao dịch của Bệnh nhân
    await test("8. Kiểm tra Lịch sử giao dịch của Bệnh nhân (/api/payment/history)", async () => {
        const res = await fetch(`${BASE_URL}/api/payment/history`, {
            headers: { "Authorization": `Bearer ${patientToken}` }
        });
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data)) throw new Error(json.message || "Lỗi lấy lịch sử");
        if (json.data.length < 4) throw new Error(`Số lượng giao dịch không đủ: ${json.data.length}`);
        console.log(`   -> Tìm thấy ${json.data.length} giao dịch trong lịch sử bệnh nhân:`);
        json.data.forEach(tx => {
            console.log(`      * [${tx.transactionType}] ${Number(tx.amount).toLocaleString('vi-VN')} VND | Status: ${tx.status} | Method: ${tx.paymentMethod}`);
        });
    });

    // 9. Đăng nhập Admin & Kiểm tra Đối soát toàn bộ giao dịch
    await test("9. Quản trị viên đối soát toàn bộ giao dịch (/api/payment/admin/transactions)", async () => {
        const adminLogin = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phoneNumber: "0937050537", password: "taizz0537" }),
        });
        const adminData = await adminLogin.json();
        const adminToken = adminData.data?.accessToken;

        const res = await fetch(`${BASE_URL}/api/payment/admin/transactions`, {
            headers: { "Authorization": `Bearer ${adminToken}` }
        });
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data)) throw new Error(json.message || "Lỗi lấy danh sách đối soát");
        console.log(`   -> Tổng số giao dịch toàn hệ thống: ${json.data.length}`);
    });

    console.log("\n==========================================================================");
    console.log(`📊 TỔNG KẾT KIỂM THỬ VNPAY: ${passed} PASSED | ${failed} FAILED / 9 TESTS`);
    console.log("==========================================================================");
}

runVNPayTests();
