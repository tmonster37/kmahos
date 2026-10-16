const http = require('http');
const { Client } = require('pg');

const BASE_URL = 'http://localhost:8080';
const DB_CONN = 'postgresql://postgres:taizz0537@localhost:5432/kmahos';

function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Accept': '*/*'
            }
        };

        let requestData = null;
        if (body) {
            requestData = JSON.stringify(body);
            options.headers['Content-Type'] = 'application/json';
            options.headers['Content-Length'] = Buffer.byteLength(requestData);
        }

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const contentType = res.headers['content-type'] || '';
                if (contentType.includes('application/json')) {
                    try {
                        const json = JSON.parse(buffer.toString('utf8'));
                        resolve({ status: res.statusCode, headers: res.headers, data: json, raw: buffer });
                    } catch (e) {
                        resolve({ status: res.statusCode, headers: res.headers, data: buffer.toString('utf8'), raw: buffer });
                    }
                } else {
                    resolve({ status: res.statusCode, headers: res.headers, data: buffer, raw: buffer });
                }
            });
        });

        req.on('error', reject);
        if (requestData) req.write(requestData);
        req.end();
    });
}

async function runTests() {
    console.log('================================================================');
    console.log('🚀 BẮT ĐẦU KIỂM THỬ GIAI ĐOẠN 3: RECEPTION DESK & NURSE CHECK-IN');
    console.log('   (Lễ tân & Điều dưỡng hợp nhất ROLE_NURSE / Check-in QR / Thu viện phí)');
    console.log('================================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`  ✅ PASS: ${message}`);
            passed++;
        } else {
            console.error(`  ❌ FAIL: ${message}`);
            failed++;
        }
    }

    const pgClient = new Client({ connectionString: DB_CONN });
    await pgClient.connect();

    try {
        // 1. Đăng nhập với tài khoản Admin / Điều dưỡng (0937050537 / taizz0537)
        console.log('👉 [BƯỚC 1] Đăng nhập tài khoản Lễ tân / Điều dưỡng (0937050537)...');
        const loginRes = await request('POST', '/api/auth/login', {
            phoneNumber: '0937050537',
            password: 'taizz0537'
        });

        assert(loginRes.status === 200, 'Đăng nhập thành công (HTTP 200)');
        const token = loginRes.data?.data?.accessToken;
        assert(!!token, 'Nhận được JWT Token của Lễ tân/Điều dưỡng');

        // Chuẩn bị dữ liệu Booking cho ngày hôm nay để test (theo ngày địa phương của máy chủ)
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        console.log(`\n👉 [BƯỚC 2] Chuẩn bị lượt khám hôm nay (${todayStr}) trong CSDL...`);

        // Tìm một booking có sẵn trong ngày hôm nay hoặc update booking gần nhất sang ngày hôm nay
        let bookingRes = await pgClient.query(`
            SELECT b.booking_id, b.booking_code, b.queue_number, b.status, b.doctor_id, d.department_id, pp.full_name
            FROM bookings b
            JOIN doctors d ON b.doctor_id = d.doctor_id
            JOIN patient_profiles pp ON b.patient_profile_id = pp.patient_profile_id
            WHERE b.booking_date = $1 AND b.deleted = false
            LIMIT 2
        `, [todayStr]);

        if (bookingRes.rows.length === 0) {
            // Cập nhật 2 booking bất kỳ sang ngày hôm nay để kiểm thử
            await pgClient.query(`
                UPDATE bookings 
                SET booking_date = $1, status = 'CONFIRMED' 
                WHERE booking_id IN (
                    SELECT booking_id FROM bookings WHERE deleted = false LIMIT 2
                )
            `, [todayStr]);

            bookingRes = await pgClient.query(`
                SELECT b.booking_id, b.booking_code, b.queue_number, b.status, b.doctor_id, d.department_id, pp.full_name
                FROM bookings b
                JOIN doctors d ON b.doctor_id = d.doctor_id
                JOIN patient_profiles pp ON b.patient_profile_id = pp.patient_profile_id
                WHERE b.booking_date = $1 AND b.deleted = false
                LIMIT 2
            `, [todayStr]);
        }

        assert(bookingRes.rows.length > 0, `Đã chuẩn bị ${bookingRes.rows.length} lượt khám trong ngày hôm nay`);
        const testBooking1 = bookingRes.rows[0];
        const testBooking2 = bookingRes.rows.length > 1 ? bookingRes.rows[1] : bookingRes.rows[0];

        // Đảm bảo các booking test có status CONFIRMED để xuất hiện trên hàng đợi sảnh chờ
        await pgClient.query(`
            UPDATE bookings 
            SET booking_date = $1, status = 'CONFIRMED' 
            WHERE booking_id IN ($2, $3)
        `, [todayStr, testBooking1.booking_id, testBooking2.booking_id]);

        // 2. Test GET /api/nurse/reception/queue (Hàng đợi sảnh đón)
        console.log('\n👉 [BƯỚC 3] Lấy danh sách hàng đợi sảnh tiếp đón (GET /api/nurse/reception/queue)...');
        const queueRes = await request('GET', '/api/nurse/reception/queue', null, token);
        assert(queueRes.status === 200, 'Lấy hàng đợi tiếp đón thành công (HTTP 200)');
        assert(Array.isArray(queueRes.data?.data), 'Dữ liệu hàng đợi là một danh sách hợp lệ');
        assert(queueRes.data?.data?.length > 0, `Hàng đợi có ${queueRes.data?.data?.length} bệnh nhân chờ tiếp đón`);

        // Test GET với departmentId
        if (testBooking1.department_id) {
            const queueDeptRes = await request('GET', `/api/nurse/reception/queue?departmentId=${testBooking1.department_id}`, null, token);
            assert(queueDeptRes.status === 200, `Lấy hàng đợi theo chuyên khoa ID ${testBooking1.department_id} thành công (HTTP 200)`);
        }

        // 3. Test Tiếp đón Check-in QR trong 5 giây (POST /api/nurse/check-in/qr)
        console.log(`\n👉 [BƯỚC 4] Tiếp đón Check-in QR trong 5 giây cho mã ${testBooking1.booking_code}...`);
        const checkInReq1 = {
            qrData: testBooking1.booking_code,
            height: 170.0,
            weight: 65.0,
            bloodPressure: "120/80",
            temperature: 36.5,
            heartRate: 75,
            spo2: 98,
            nurseNotes: "Bệnh nhân tỉnh táo, tiếp xúc tốt, không phù"
        };

        const checkInRes1 = await request('POST', '/api/nurse/check-in/qr', checkInReq1, token);
        assert(checkInRes1.status === 200, 'Check-in QR thành công (HTTP 200)');
        const checkInData1 = checkInRes1.data?.data;
        assert(checkInData1?.bookingCode === testBooking1.booking_code, `Mã lượt khám khớp chính xác: ${checkInData1?.bookingCode}`);
        assert(checkInData1?.queueNumber !== undefined, `Số thứ tự tiếp nhận: ${checkInData1?.queueNumber}`);
        assert(Number(checkInData1?.bmi) === 22.49, `Tự động tính BMI chính xác: ${checkInData1?.bmi} (Chuẩn: 65 / 1.70^2 = 22.49)`);
        assert(checkInData1?.bmiCategory === 'Thể trạng bình thường', `Phân loại thể trạng đúng: ${checkInData1?.bmiCategory}`);
        assert(checkInData1?.status === 'IN_PROGRESS', 'Trạng thái lượt khám tự động chuyển sang IN_PROGRESS');
        assert(!!checkInData1?.roomName, `Đã điều phối vào phòng khám: ${checkInData1?.roomName}`);

        // Kiểm tra trong CSDL xem MedicalExaminationRecord đã được lưu và chứa sinh hiệu
        const recordCheck = await pgClient.query(`
            SELECT record_id, state, symptoms 
            FROM medical_examination_records 
            WHERE booking_id = $1
        `, [testBooking1.booking_id]);
        assert(recordCheck.rows.length > 0, 'Bản ghi bệnh án MedicalExaminationRecord đã được khởi tạo tự động');
        const symptomsStr = recordCheck.rows[0].symptoms || '';
        assert(symptomsStr.includes('HA: 120/80 mmHg'), 'Ghi nhận huyết áp vào bệnh án');
        assert(symptomsStr.includes('BMI: 22.49'), 'Ghi nhận chỉ số BMI vào bệnh án');
        assert(symptomsStr.includes('Thể trạng bình thường'), 'Ghi nhận phân loại thể trạng vào bệnh án');

        // 4. Test Check-in QR với thể trạng Gầy / Thiếu cân
        console.log(`\n👉 [BƯỚC 5] Test Check-in QR với thể trạng Gầy/Thiếu cân (Height: 175cm, Weight: 50kg)...`);
        const checkInReqLean = {
            bookingCode: testBooking1.booking_code,
            height: 175.0,
            weight: 50.0,
            bloodPressure: "110/70"
        };
        const checkInResLean = await request('POST', '/api/nurse/check-in/qr', checkInReqLean, token);
        assert(checkInResLean.status === 200, 'Cập nhật lại sinh hiệu thành công');
        assert(checkInResLean.data?.data?.bmiCategory === 'Gầy (Thiếu cân)', `Phân loại đúng Gầy (Thiếu cân): BMI = ${checkInResLean.data?.data?.bmi}`);

        // 5. Test Check-in QR với thể trạng Béo phì
        console.log(`\n👉 [BƯỚC 6] Test Check-in QR với thể trạng Béo phì (Height: 160cm, Weight: 80kg)...`);
        const checkInReqObese = {
            qrData: `https://bv.example.vn/checkin?code=${testBooking1.booking_code}`,
            height: 160.0,
            weight: 80.0
        };
        const checkInResObese = await request('POST', '/api/nurse/check-in/qr', checkInReqObese, token);
        assert(checkInResObese.status === 200, 'Trích xuất mã booking từ chuỗi URL QR thành công');
        assert(checkInResObese.data?.data?.bmiCategory === 'Béo phì', `Phân loại đúng Béo phì: BMI = ${checkInResObese.data?.data?.bmi}`);

        // 6. Test Check-in với mã không tồn tại -> 404
        console.log('\n👉 [BƯỚC 7] Test Check-in với mã không tồn tại...');
        const checkInInvalid = await request('POST', '/api/nurse/check-in/qr', { qrData: 'BK_INVALID_9999' }, token);
        assert(checkInInvalid.status === 404, 'Bắt lỗi 404 NOT_FOUND khi mã QR không tồn tại');

        // 7. Test Thu viện phí tại quầy (POST /api/nurse/reception/pay-at-clinic) - Tiền mặt (CASH)
        console.log(`\n👉 [BƯỚC 8] Thu viện phí tại quầy (Tiền mặt - CASH) cho mã ${testBooking1.booking_code}...`);
        const payReqCash = {
            bookingId: testBooking1.booking_id,
            amount: 250000,
            paymentMethod: 'CASH'
        };
        const payResCash = await request('POST', '/api/nurse/reception/pay-at-clinic', payReqCash, token);
        if (payResCash.status !== 200) {
            console.error('PAY ERROR RESPONSE:', JSON.stringify(payResCash.data, null, 2));
        }
        assert(payResCash.status === 200, 'Thu viện phí tiền mặt tại quầy thành công (HTTP 200)');
        const receiptCash = payResCash.data?.data;
        assert(receiptCash?.receiptCode?.startsWith('HD-'), `Sinh mã hóa đơn/biên lai chuẩn A5: ${receiptCash?.receiptCode}`);
        assert(Number(receiptCash?.paidAmount) === 250000, `Số tiền đã thu chuẩn xác: ${receiptCash?.paidAmount}đ`);
        assert(receiptCash?.paymentMethod === 'CASH', 'Phương thức thanh toán là CASH');
        assert(!!receiptCash?.cashierName, `Ghi nhận tên thu ngân/điều dưỡng thực hiện: ${receiptCash?.cashierName}`);
        assert(!!receiptCash?.paidAt, `Ghi nhận thời điểm thanh toán: ${receiptCash?.paidAt}`);

        // Kiểm tra Transaction trong database
        const txnCheck = await pgClient.query(`
            SELECT transaction_id, transaction_type, payment_method, amount, status, is_verified 
            FROM transactions 
            WHERE description LIKE $1 
            ORDER BY created_at DESC 
            LIMIT 1
        `, [`%${testBooking1.booking_code}%`]);
        assert(txnCheck.rows.length > 0, 'Giao dịch Transaction được tạo thành công trong CSDL');
        assert(txnCheck.rows[0].transaction_type === 'PAY_BOOKING', 'Loại giao dịch là PAY_BOOKING');
        assert(txnCheck.rows[0].status === 'SUCCESS', 'Trạng thái giao dịch là SUCCESS');
        assert(txnCheck.rows[0].is_verified === true, 'Giao dịch được đánh dấu is_verified = true');

        // 8. Test Thu viện phí tại quầy với MOMO / Chuyển khoản
        console.log(`\n👉 [BƯỚC 9] Thu viện phí tại quầy với phương thức MOMO / Chuyển khoản...`);
        const payReqMomo = {
            bookingId: testBooking2.booking_id,
            amount: 300000,
            paymentMethod: 'MOMO'
        };
        const payResMomo = await request('POST', '/api/nurse/reception/pay-at-clinic', payReqMomo, token);
        assert(payResMomo.status === 200, 'Thu viện phí MOMO thành công');
        assert(payResMomo.data?.data?.paymentMethod === 'MOMO', 'Phương thức thanh toán ghi nhận MOMO');

        console.log('\n================================================================');
        console.log(`🏁 KẾT QUẢ KIỂM THỬ GIAI ĐOẠN 3: ${passed} PASS, ${failed} FAIL`);
        console.log('================================================================\n');

    } finally {
        await pgClient.end();
    }
}

runTests().catch(err => {
    console.error('Fatal error during test execution:', err);
    process.exit(1);
});
