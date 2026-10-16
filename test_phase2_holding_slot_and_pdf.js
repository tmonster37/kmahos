const http = require('http');
const crypto = require('crypto');
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

function computePrescriptionHash(prescriptionCode, doctorId, createdAtStr) {
    const payload = `${prescriptionCode}|${doctorId}|${createdAtStr}`;
    return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}

async function runPhase2Tests() {
    console.log('================================================================');
    console.log('   KIỂM THỬ PHASE 2: HOLDING SLOT 10 PHÚT & PDF QR KÝ SỐ SHA-256');
    console.log('================================================================\n');

    let passedAssertions = 0;
    const assert = (condition, message) => {
        if (!condition) {
            console.error(`❌ FAILED: ${message}`);
            throw new Error(`Assertion failed: ${message}`);
        }
        console.log(`  ✅ PASS: ${message}`);
        passedAssertions++;
    };

    const db = new Client({ connectionString: DB_CONN });
    await db.connect();

    try {
        // --- BƯỚC 1: Đăng nhập tài khoản Bác sĩ & Patient ---
        console.log('--- 1. Đăng nhập hệ thống (Bác sĩ & Patient/Admin) ---');
        const docLoginRes = await request('POST', '/api/auth/login', {
            phoneNumber: '0900000002',
            password: 'taizz0537'
        });
        assert(docLoginRes.status === 200 && docLoginRes.data?.data?.accessToken, 'Bác sĩ đăng nhập thành công');
        const doctorToken = docLoginRes.data.data.accessToken;

        const patientLoginRes = await request('POST', '/api/auth/login', {
            phoneNumber: '0937050537',
            password: 'taizz0537'
        });
        assert(patientLoginRes.status === 200 && patientLoginRes.data?.data?.accessToken, 'Patient/Admin đăng nhập thành công');
        const patientToken = patientLoginRes.data.data.accessToken;

        // --- BƯỚC 2: Kiểm thử Holding Slot 10 phút (TTL 600s) ---
        console.log('\n--- 2. Kiểm thử Cơ chế Giữ Slot 10 phút (Holding Slot chống đặt trùng) ---');
        
        // Lấy 1 timeSlot từ DB
        const slotDbRes = await db.query(`
            SELECT ts.time_slot_id, ts.max_capacity, ts.current_bookings, COALESCE(ts.holding_count, 0) as holding_count
            FROM time_slots ts
            WHERE ts.deleted = false
            LIMIT 1
        `);
        assert(slotDbRes.rows.length > 0, 'Tìm thấy TimeSlot trong cơ sở dữ liệu');
        const slotId = slotDbRes.rows[0].time_slot_id;
        const initialHolding = parseInt(slotDbRes.rows[0].holding_count);
        console.log(`   TimeSlot ID: ${slotId} (holding_count ban đầu: ${initialHolding})`);

        // 2.1 Giữ chỗ qua API
        console.log('  * Gọi POST /api/bookings/reserve-slot...');
        const reserveRes = await request('POST', '/api/bookings/reserve-slot', {
            timeSlotId: slotId
        });
        assert(reserveRes.status === 200, 'Giữ chỗ khung giờ thành công (HTTP 200)');
        const reservationData = reserveRes.data?.data;
        assert(reservationData?.reservationId != null, `Đã cấp reservationId: ${reservationData?.reservationId}`);
        assert(reservationData?.ttlSeconds === 600, 'Thời gian giữ chỗ TTL chính xác 600 giây (10 phút)');
        assert(reservationData?.expiresAt != null, 'Có thời điểm hết hạn expiresAt hợp lệ');

        // Kiểm tra DB holding_count đã tăng lên 1
        const slotDbAfterReserve = await db.query('SELECT holding_count FROM time_slots WHERE time_slot_id = $1', [slotId]);
        assert(parseInt(slotDbAfterReserve.rows[0].holding_count) === initialHolding + 1, 'Cơ sở dữ liệu đã tăng holding_count lên +1');

        // 2.2 Thử giải phóng slot giữ chỗ
        console.log('  * Giải phóng slot: POST /api/bookings/release-slot/{id}...');
        const releaseRes = await request('POST', `/api/bookings/release-slot/${reservationData.reservationId}`);
        assert(releaseRes.status === 200, 'Giải phóng slot giữ chỗ thành công (HTTP 200)');

        // Kiểm tra DB holding_count đã giảm về ban đầu
        const slotDbAfterRelease = await db.query('SELECT holding_count FROM time_slots WHERE time_slot_id = $1', [slotId]);
        assert(parseInt(slotDbAfterRelease.rows[0].holding_count) === initialHolding, 'Cơ sở dữ liệu đã giảm holding_count về giá trị cũ');

        // 2.3 Giữ chỗ lại và tạo đặt lịch chính thức với reservationId
        console.log('  * Giữ chỗ lại và tạo đặt lịch khám chính thức với reservationId...');
        const reserveRes2 = await request('POST', '/api/bookings/reserve-slot', {
            timeSlotId: slotId
        });
        assert(reserveRes2.status === 200, 'Giữ chỗ lại thành công');
        const resId2 = reserveRes2.data.data.reservationId;

        // Lấy hoặc tạo hồ sơ bệnh nhân cho tài khoản test
        let profileDbRes = await db.query(`
            SELECT patient_profile_id FROM patient_profiles 
            WHERE account_id = (SELECT user_id FROM accounts WHERE phone_number = '0937050537') 
            AND deleted = false LIMIT 1
        `);
        let profileId = null;
        if (profileDbRes.rows.length === 0) {
            const insRes = await db.query(`
                INSERT INTO patient_profiles (patient_profile_id, account_id, full_name, phone_number, date_of_birth, gender, province, district, ward, street_address, health_insurance_number, created_at, updated_at, deleted) 
                VALUES (gen_random_uuid(), (SELECT user_id FROM accounts WHERE phone_number = '0937050537'), 'Nguyễn Văn Minh', '0937050537', '1995-05-15', 'MALE', 'Hà Nội', 'Cầu Giấy', 'Dịch Vọng', '123 Xuân Thủy', 'GD4010123456789', NOW(), NOW(), false)
                RETURNING patient_profile_id
            `);
            profileId = insRes.rows[0].patient_profile_id;
        } else {
            profileId = profileDbRes.rows[0].patient_profile_id;
        }
        assert(profileId != null, `Tìm thấy/Tạo mới hồ sơ bệnh nhân cho tài khoản test: ${profileId}`);

        const bookingRes = await request('POST', '/api/bookings', {
            patientProfileId: profileId,
            timeSlotId: slotId,
            symptoms: 'Khám tầm soát sức khỏe định kỳ có holding slot',
            reservationId: resId2
        }, patientToken);
        assert(bookingRes.status === 201, 'Tạo booking chính thức thành công với reservationId (HTTP 201)');
        const booking = bookingRes.data?.data;
        assert(booking?.bookingCode != null, `Mã booking: ${booking?.bookingCode}`);

        // --- BƯỚC 3: Chuẩn bị Đơn thuốc điện tử để kiểm thử PDF & QR Ký số ---
        console.log('\n--- 3. Chuẩn bị Đơn thuốc điện tử (Prescription) trong hệ thống ---');
        // Tìm đơn thuốc có sẵn trong DB hoặc gán vào record
        const presDbRes = await db.query(`
            SELECT p.prescription_id, p.prescription_code, p.created_at, p.record_id,
                   r.doctor_id, a.full_name as doctor_name
            FROM prescriptions p
            LEFT JOIN medical_examination_records r ON r.record_id = p.record_id
            LEFT JOIN doctors d ON d.doctor_id = r.doctor_id
            LEFT JOIN accounts a ON a.user_id = d.account_id
            WHERE p.prescription_code IS NOT NULL
            LIMIT 1
        `);

        let testPresCode = null;
        let testDoctorId = null;
        let testCreatedAt = null;

        if (presDbRes.rows.length > 0) {
            testPresCode = presDbRes.rows[0].prescription_code;
            testDoctorId = presDbRes.rows[0].doctor_id ? presDbRes.rows[0].doctor_id.toString() : 'UNKNOWN';
            testCreatedAt = presDbRes.rows[0].created_at ? presDbRes.rows[0].created_at.toISOString() : '';
            console.log(`   Sử dụng đơn thuốc mẫu từ DB: Mã [${testPresCode}] - Bác sĩ [${presDbRes.rows[0].doctor_name}]`);
        } else {
            // Tạo đơn thuốc mẫu trực tiếp vào DB nếu chưa có
            const recordRes = await db.query('SELECT record_id, doctor_id FROM medical_examination_records LIMIT 1');
            assert(recordRes.rows.length > 0, 'Có ít nhất 1 bệnh án trong DB');
            const recId = recordRes.rows[0].record_id;
            testDoctorId = recordRes.rows[0].doctor_id.toString();
            testPresCode = 'RX' + Date.now();
            testCreatedAt = new Date().toISOString();

            await db.query(`
                INSERT INTO prescriptions (prescription_id, prescription_code, record_id, total_amount, doctor_notes, created_at, updated_at, deleted)
                VALUES (gen_random_uuid(), $1, $2, 150000, 'Uống thuốc sau ăn', NOW(), NOW(), false)
            `, [testPresCode, recId]);
            console.log(`   Đã khởi tạo đơn thuốc thử nghiệm: [${testPresCode}]`);
        }

        // --- BƯỚC 4: Xuất Đơn thuốc điện tử PDF khổ A5 chuẩn Bộ Y tế ---
        console.log('\n--- 4. Kiểm thử Xuất Đơn thuốc điện tử PDF (OpenPDF) ---');
        const pdfRes = await request('GET', `/api/prescriptions/${testPresCode}/pdf`);
        assert(pdfRes.status === 200, 'Tải file PDF đơn thuốc thành công (HTTP 200)');
        assert(pdfRes.headers['content-type'] === 'application/pdf', 'Header Content-Type đúng chuẩn application/pdf');
        assert(pdfRes.headers['content-disposition']?.includes('inline'), 'Header Content-Disposition đúng chuẩn inline');
        assert(pdfRes.raw.length > 1500, `Dung lượng file PDF hợp lệ: ${pdfRes.raw.length} bytes (>1.5KB)`);

        // Kiểm tra định dạng binary PDF magic header "%PDF-"
        const magicHeader = pdfRes.raw.subarray(0, 5).toString('ascii');
        assert(magicHeader.startsWith('%PDF-'), `Định dạng tệp tin nhị phân đúng chuẩn PDF (%PDF-)`);

        // --- BƯỚC 5: Cổng Xác thực Chữ ký số SHA-256 (Public Verification) ---
        console.log('\n--- 5. Kiểm thử Cổng Xác thực Chữ ký số SHA-256 (Timing-Safe) ---');
        
        // 5.1 Lấy mã hash chuẩn canonical từ hệ thống
        const hashRes = await request('GET', `/api/prescriptions/${testPresCode}/hash`);
        assert(hashRes.status === 200 && hashRes.data?.data, 'Lấy mã băm chữ ký số chính thức từ hệ thống thành công');
        const validHash = hashRes.data.data;
        console.log(`   Canonical SHA-256 Hash: ${validHash}`);

        // 5.2 Xác thực đơn thuốc hợp lệ qua Query Params
        const verifyRes = await request('GET', `/api/prescriptions/verify?code=${testPresCode}&hash=${validHash}`);
        assert(verifyRes.status === 200, 'Gọi Cổng xác thực đơn thuốc thành công (HTTP 200)');
        const verifyData = verifyRes.data?.data;
        assert(verifyData?.valid === true, 'Đơn thuốc điện tử HỢP LỆ & NGUYÊN VẸN (valid === true)');
        assert(verifyData?.prescriptionCode === testPresCode, `Khớp mã đơn thuốc: ${verifyData?.prescriptionCode}`);
        assert(verifyData?.clinicName?.includes('YOUMED TNT') || verifyData?.clinicName?.includes('BỆNH VIỆN'), 'Tên bệnh viện hiển thị chính xác');

        // 5.3 Xác thực qua Path Variable endpoint
        const verifyPathRes = await request('GET', `/api/prescriptions/${testPresCode}/verify?hash=${validHash}`);
        assert(verifyPathRes.status === 200 && verifyPathRes.data?.data?.valid === true, 'Xác thực qua Path Variable /api/prescriptions/{code}/verify thành công');

        // 5.4 Xác thực với chữ ký số giả mạo (Tampered hash)
        console.log('  * Kiểm thử phòng chống giả mạo: Gửi mã băm sai lệch...');
        const fakeHash = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
        const fakeVerifyRes = await request('GET', `/api/prescriptions/verify?code=${testPresCode}&hash=${fakeHash}`);
        assert(fakeVerifyRes.status === 200, 'Endpoint phản hồi kiểm định (HTTP 200)');
        assert(fakeVerifyRes.data?.data?.valid === false, 'Hệ thống phát hiện CHỮ KÝ SỐ KHÔNG HỢP LỆ (valid === false)');
        assert(fakeVerifyRes.data?.data?.message?.includes('không khớp') || fakeVerifyRes.data?.data?.message?.includes('chỉnh sửa'), 'Cảnh báo chống giả mạo chính xác');

        // 5.5 Kiểm thử đơn thuốc không tồn tại
        const notFoundRes = await request('GET', '/api/prescriptions/verify?code=RX_FAKE_99999&hash=abc');
        assert(notFoundRes.status === 200 && notFoundRes.data?.data?.valid === false, 'Đơn thuốc không tồn tại trả về valid === false');

        console.log('\n================================================================');
        console.log(`🎉 KẾT QUẢ PHASE 2: TẤT CẢ ${passedAssertions} ASSERTIONS ĐỀU ĐẠT CHUẨN (PASS 100%)!`);
        console.log('================================================================\n');

    } catch (err) {
        console.error('\n❌ TEST RUN FAILED WITH ERROR:', err);
        process.exit(1);
    } finally {
        await db.end();
    }
}

runPhase2Tests();
