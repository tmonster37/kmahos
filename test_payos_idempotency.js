/**
 * KỊCH BẢN KIỂM THỬ TỰ ĐỘNG: PAYOS WEBHOOK IDEMPOTENCY & ĐỐI SOÁT GIAO DỊCH
 * Phân hệ: Payment & Financial Integrity (TASK-12)
 */

const crypto = require('crypto');

const BASE_URL = 'http://localhost:8080/api';
const CHECKSUM_KEY = 'demo-checksum-key'; // Khóa demo cấu hình trong application.yml

let token = '';
let testAccountId = '';
let createdOrderCode = null;
let createdTxnRef = '';

async function request(url, options = {}) {
    const headers = options.headers || {};
    if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(url, { ...options, headers });
    const text = await res.text();
    let json;
    try {
        json = JSON.parse(text);
    } catch {
        json = { raw: text };
    }
    return { status: res.status, ok: res.ok, data: json };
}

function calculatePayOSSignature(checksumKey, amount, description, orderCode) {
    const dataToSign = `amount=${amount}&cancelUrl=&description=${description || ''}&orderCode=${orderCode}&returnUrl=`;
    return crypto.createHmac('sha256', checksumKey).update(dataToSign).digest('hex');
}

async function runTests() {
    console.log('==========================================================================');
    console.log('💳 BẮT ĐẦU KIỂM THỬ: PAYOS WEBHOOK IDEMPOTENCY & ĐỐI SOÁT GIAO DỊCH (5 TIÊU CHÍ)');
    console.log('==========================================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`✅ [PASS] ${message}`);
            passed++;
        } else {
            console.error(`❌ [FAIL] ${message}`);
            failed++;
        }
    }

    try {
        // Bước 0: Đăng nhập tài khoản kiểm thử
        const loginRes = await request(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phoneNumber: '0988889999',
                password: 'password123'
            })
        });

        const accessToken = loginRes.data.data?.accessToken;
        assert(loginRes.status === 200 && accessToken, '0. Đăng nhập tài khoản Bệnh nhân kiểm thử thành công');
        token = accessToken;
        testAccountId = loginRes.data.data?.user?.userId || loginRes.data.data?.userId;

        // Lấy số dư ví hiện tại để kiểm tra tính toàn vẹn (chống nạp đúp)
        const profileRes = await request(`${BASE_URL}/auth/me`);
        const initialBalance = Number(profileRes.data.data?.balance || 0);

        // TIÊU CHÍ 1: Tạo thanh toán VietQR / PayOS sinh orderCode số hợp lệ
        const amount = 100000;
        const vietQrRes = await request(`${BASE_URL}/payment/vietqr/create?amount=${amount}&type=DEPOSIT_WALLET`, {
            method: 'POST'
        });

        const qrData = vietQrRes.data.data;
        createdOrderCode = qrData?.orderCode;
        createdTxnRef = qrData?.txnRef;

        const isSafeInteger = Number.isSafeInteger(createdOrderCode) && createdOrderCode > 0;
        assert(
            vietQrRes.status === 200 && isSafeInteger && createdTxnRef.startsWith('TNT'),
            `TC 1: Tạo VietQR sinh orderCode số hợp lệ [orderCode=${createdOrderCode}] (<= Number.MAX_SAFE_INTEGER)`
        );

        // TIÊU CHÍ 2: Webhook PayOS với chữ ký HMAC-SHA256 giả mạo bị từ chối với HTTP 400
        const fakeSignatureWebhook = {
            code: '00',
            desc: 'success',
            data: {
                orderCode: createdOrderCode,
                amount: amount,
                description: createdTxnRef,
                accountNumber: '0987654321',
                reference: 'MB_REF_FAKE_001'
            },
            signature: 'invalid_fake_signature_hex_1234567890abcdef'
        };

        const fakeWebhookRes = await request(`${BASE_URL}/payment/payos/webhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fakeSignatureWebhook)
        });

        assert(
            fakeWebhookRes.status === 400,
            `TC 2: Webhook PayOS chữ ký giả mạo bị từ chối với HTTP 400 Bad Request`
        );

        // TIÊU CHÍ 3: Webhook PayOS với chữ ký HMAC-SHA256 hợp lệ được phê duyệt thành công
        const validSignature = calculatePayOSSignature(CHECKSUM_KEY, amount, createdTxnRef, createdOrderCode);
        const validWebhook = {
            code: '00',
            desc: 'success',
            data: {
                orderCode: createdOrderCode,
                amount: amount,
                description: createdTxnRef,
                accountNumber: '0987654321',
                reference: 'MB_REF_BANK_8899',
                transactionDateTime: new Date().toISOString()
            },
            signature: validSignature
        };

        const validWebhookRes = await request(`${BASE_URL}/payment/payos/webhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validWebhook)
        });

        const webhookData = validWebhookRes.data.data;
        assert(
            validWebhookRes.status === 200 &&
            webhookData?.status === 'SUCCESS' &&
            webhookData?.isVerified === true &&
            webhookData?.orderCode === createdOrderCode &&
            webhookData?.webhookReference === 'MB_REF_BANK_8899',
            `TC 3: Webhook PayOS chữ ký hợp lệ -> Giao dịch SUCCESS, isVerified=true, webhookReference lưu trữ chính xác`
        );

        // TIÊU CHÍ 4: Xử lý Idempotency khi Webhook PayOS gửi lặp lại lần 2 (Không cộng tiền ví đúp)
        const duplicateWebhookRes = await request(`${BASE_URL}/payment/payos/webhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validWebhook)
        });

        // Kiểm tra số dư ví tài khoản sau 2 lần webhook
        const checkProfileRes = await request(`${BASE_URL}/auth/me`);
        const finalBalance = Number(checkProfileRes.data.data?.balance || 0);
        const expectedBalance = initialBalance + amount;

        assert(
            duplicateWebhookRes.status === 200 &&
            duplicateWebhookRes.data.data?.status === 'SUCCESS' &&
            duplicateWebhookRes.data.data?.isVerified === true &&
            finalBalance === expectedBalance,
            `TC 4: Webhook gửi lặp lại lần 2 (Idempotent): HTTP 200, isVerified=true, số dư ví không bị cộng đúp (Đầu: ${initialBalance}đ -> Cuối: ${finalBalance}đ)`
        );

        // TIÊU CHÍ 5: Tra cứu trạng thái giao dịch hiển thị đầy đủ orderCode và isVerified phục vụ đối soát
        const statusRes = await request(`${BASE_URL}/payment/status/${createdTxnRef}`);
        const statusData = statusRes.data.data;

        assert(
            statusRes.status === 200 &&
            statusData?.orderCode === createdOrderCode &&
            statusData?.isVerified === true &&
            statusData?.webhookReference === 'MB_REF_BANK_8899',
            `TC 5: API tra cứu giao dịch (/api/payment/status/{ref}) trả về orderCode=${statusData?.orderCode}, isVerified=true và reference cho nhân viên đối soát`
        );

    } catch (err) {
        console.error('Lỗi ngoại lệ trong quá trình kiểm thử:', err);
        failed++;
    }

    console.log('\n==========================================================================');
    console.log(`🏁 KẾT THÚC KIỂM THỬ: ${passed} PASS, ${failed} FAIL`);
    console.log('==========================================================================');

    process.exit(failed > 0 ? 1 : 0);
}

runTests();
