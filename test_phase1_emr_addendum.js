/**
 * test_phase1_emr_addendum.js
 * Test suite tự động xác thực Giai đoạn 1: Bệnh án khóa sau 24h & EMR Addendum (Thông tư 46/2018/TT-BYT)
 */
const http = require('http');
const { Client } = require('pg');

const BASE_URL = 'http://localhost:8080';

function request(options, body = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = data;
                try {
                    parsed = JSON.parse(data);
                } catch (e) {}
                resolve({ status: res.statusCode, headers: res.headers, data: parsed });
            });
        });
        req.on('error', reject);
        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

async function login(phoneNumber, password) {
    const res = await request({
        hostname: 'localhost',
        port: 8080,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { phoneNumber, password });

    if (res.status !== 200 || !res.data?.data?.accessToken) {
        throw new Error(`Đăng nhập thất bại cho ${phoneNumber}: ${JSON.stringify(res.data)}`);
    }
    return res.data.data.accessToken;
}

async function runTests() {
    console.log('================================================================');
    console.log('🩺 KIỂM THỬ TỰ ĐỘNG GIAI ĐOẠN 1: EMR ADDENDUM (TT 46/2018/TT-BYT)');
    console.log('================================================================\n');

    let passedCount = 0;
    let totalCount = 0;

    function assert(condition, message) {
        totalCount++;
        if (condition) {
            console.log(`  ✅ [PASS] ${message}`);
            passedCount++;
        } else {
            console.error(`  ❌ [FAIL] ${message}`);
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    try {
        // 1. Lấy thông tin tài khoản Bác sĩ từ DB và Đăng nhập
        console.log('1. Lấy tài khoản Bác sĩ và Đăng nhập...');
        const initDb = new Client({
            connectionString: 'postgresql://postgres:taizz0537@localhost:5432/kmahos'
        });
        await initDb.connect();
        const docRes = await initDb.query(`
            SELECT d.doctor_id, a.user_id, a.phone_number, a.full_name
            FROM doctors d
            JOIN accounts a ON d.account_id = a.user_id
            WHERE d.deleted = false
            LIMIT 1
        `);

        if (docRes.rows.length === 0) {
            throw new Error('Không tìm thấy bác sĩ nào trong cơ sở dữ liệu');
        }

        const docPhone = docRes.rows[0].phone_number;
        const docName = docRes.rows[0].full_name;
        const docUserId = docRes.rows[0].user_id;
        console.log(`   Tìm thấy Bác sĩ: [${docName}] - SĐT: [${docPhone}]`);

        // Đảm bảo mật khẩu bác sĩ đồng bộ cho môi trường test (mật khẩu taizz0537)
        const testHash = '$2a$06$SFjVcQoV/QiF5ArWMy.1Tetd0UEb3AmAM/ud6ro9y5mMCB77XQRDy';
        await initDb.query('UPDATE accounts SET password = $1 WHERE user_id = $2', [testHash, docUserId]);
        await initDb.end();

        const doctorToken = await login(docPhone, 'taizz0537');
        assert(doctorToken, `Bác sĩ ${docName} đăng nhập thành công và có JWT token`);

        // 2. Lấy hàng đợi khám của bác sĩ để tìm hồ sơ
        console.log('\n2. Tra cứu hàng đợi buồng khám Bác sĩ...');
        const queueRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/clinical/doctor/queue',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${doctorToken}`,
                'Content-Type': 'application/json'
            }
        });

        assert(queueRes.status === 200, 'Lấy danh sách hàng đợi khám bệnh thành công (HTTP 200)');
        const queue = queueRes.data?.data || [];
        console.log(`   Tìm thấy ${queue.length} bệnh nhân trong hàng đợi.`);

        let recordId = null;
        let bookingCode = null;

        // Nếu hàng đợi có bệnh nhân đã có record
        const patientWithRecord = queue.find(p => p.recordId);
        if (patientWithRecord) {
            recordId = patientWithRecord.recordId;
            bookingCode = patientWithRecord.bookingCode;
        } else if (queue.length > 0) {
            // Mở khám cho bệnh nhân đầu tiên
            bookingCode = queue[0].bookingCode;
            const startRes = await request({
                hostname: 'localhost',
                port: 8080,
                path: '/api/clinical/start',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${doctorToken}`,
                    'Content-Type': 'application/json'
                }
            }, { bookingCode });
            assert(startRes.status === 200 || startRes.status === 201, 'Bác sĩ mở khám bệnh nhân thành công');
            recordId = startRes.data?.data?.recordId;
        } else {
            // Tra cứu qua DB nếu hàng đợi trống
            const db = new Client({
                connectionString: 'postgresql://postgres:taizz0537@localhost:5432/kmahos'
            });
            await db.connect();
            const dbRes = await db.query('SELECT record_id FROM medical_examination_records LIMIT 1');
            await db.end();
            if (dbRes.rows.length > 0) {
                recordId = dbRes.rows[0].record_id;
            }
        }

        assert(recordId, `Xác định được recordId để kiểm thử: ${recordId}`);

        // 3. Kiểm tra hồ sơ khi CHƯA BỊ KHÓA (< 24h)
        console.log('\n3. Kiểm tra quy tắc nghiệp vụ khi hồ sơ CHƯA KHÓA (<24h)...');
        
        // Reset thời gian để hồ sơ không bị khóa
        const dbClient = new Client({
            connectionString: 'postgresql://postgres:taizz0537@localhost:5432/kmahos'
        });
        await dbClient.connect();
        await dbClient.query(`
            UPDATE medical_examination_records 
            SET completed_at = NOW(), is_locked = false 
            WHERE record_id = $1
        `, [recordId]);
        await dbClient.query('DELETE FROM medical_record_addendums WHERE record_id = $1', [recordId]);

        // Thử tạo Addendum khi chưa bị khóa -> Bắt buộc phải bị từ chối
        const earlyAddendumRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: `/api/clinical/records/${recordId}/addendums`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${doctorToken}`,
                'Content-Type': 'application/json'
            }
        }, {
            reason: 'Thử lập phụ lục khi hồ sơ chưa đủ 24h',
            updatedDiagnosis: 'Chẩn đoán thử nghiệm'
        });

        assert(earlyAddendumRes.status === 400, 'Hệ thống từ chối lập Phụ lục khi hồ sơ chưa đủ 24h (HTTP 400)');
        assert(
            earlyAddendumRes.data?.message?.includes('chưa bị khóa'),
            'Thông điệp thông báo chính xác: Chưa đủ 24 giờ sau khi hoàn tất ca khám'
        );

        // Bác sĩ có thể sửa chẩn đoán trực tiếp bình thường
        const directDiagRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: `/api/clinical/records/${recordId}/diagnosis`,
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${doctorToken}`,
                'Content-Type': 'application/json'
            }
        }, {
            finalDiagnosis: 'Viêm phế quản cấp (J20) - Chẩn đoán ban đầu',
            treatmentPlan: 'Uống nhiều nước ấm, kháng sinh 5 ngày'
        });
        assert(directDiagRes.status === 200, 'Bác sĩ sửa trực tiếp chẩn đoán thành công khi chưa khóa (<24h)');

        // 4. Giả lập hồ sơ ĐÃ KHÓA SAU 24H (Quá 24 giờ kể từ completed_at)
        console.log('\n4. Giả lập hồ sơ ĐÃ QUA 24H (completed_at = NOW() - 25 giờ)...');
        await dbClient.query(`
            UPDATE medical_examination_records 
            SET completed_at = NOW() - INTERVAL '25 hours', is_locked = true 
            WHERE record_id = $1
        `, [recordId]);

        // 5. Kiểm tra tính BẤT BIẾN: Chặn sửa trực tiếp
        console.log('\n5. Kiểm tra tính Bất biến: Chặn các thao tác sửa trực tiếp bệnh án...');
        const blockedDiagRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: `/api/clinical/records/${recordId}/diagnosis`,
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${doctorToken}`,
                'Content-Type': 'application/json'
            }
        }, {
            finalDiagnosis: 'Cố tình sửa trực tiếp khi đã qua 24h'
        });

        assert(blockedDiagRes.status === 400, 'Chặn sửa chẩn đoán trực tiếp khi hồ sơ đã khóa sau 24h (HTTP 400)');
        assert(
            blockedDiagRes.data?.message?.includes('Thông tư 46/2018/TT-BYT'),
            'Thông báo viện dẫn đúng Thông tư 46/2018/TT-BYT'
        );

        // 6. Lập Phụ lục Bệnh án (EMR Addendum) lần 1
        console.log('\n6. Lập Phụ lục Bệnh án (Addendum #1) theo TT 46/2018/TT-BYT...');
        const addendum1Res = await request({
            hostname: 'localhost',
            port: 8080,
            path: `/api/clinical/records/${recordId}/addendums`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${doctorToken}`,
                'Content-Type': 'application/json'
            }
        }, {
            reason: 'Bổ sung kết quả xét nghiệm đờm vi sinh trả chậm sau 24h',
            updatedDiagnosis: 'Viêm phế quản bội nhiễm do Streptococcus pneumoniae (J20.2)',
            updatedTreatmentPlan: 'Đổi phác đồ sang Ceftriaxon 1g IV x 5 ngày',
            clinicalNotes: 'Bệnh nhân có sốt tăng nhẹ vào tối qua, CRP tăng 45 mg/L'
        });

        assert(addendum1Res.status === 201, 'Lập Phụ lục Bệnh án lần 1 thành công (HTTP 201 Created)');
        const ad1 = addendum1Res.data?.data;
        assert(ad1?.addendumId, 'Phụ lục được cấp mã UUID duy nhất');
        assert(ad1?.reason === 'Bổ sung kết quả xét nghiệm đờm vi sinh trả chậm sau 24h', 'Lý do lập phụ lục được lưu trữ chính xác');
        assert(ad1?.previousDiagnosis?.includes('Viêm phế quản cấp'), 'Snapshot chẩn đoán cũ được lưu trữ nguyên vẹn');
        assert(ad1?.updatedDiagnosis?.includes('Streptococcus pneumoniae'), 'Chẩn đoán mới được cập nhật');

        // 7. Lập Phụ lục Bệnh án (Addendum #2) - Kiểm tra Snapshot Chaining
        console.log('\n7. Lập Phụ lục Bệnh án (Addendum #2) - Kiểm tra chuỗi Snapshot Chaining...');
        const addendum2Res = await request({
            hostname: 'localhost',
            port: 8080,
            path: `/api/clinical/records/${recordId}/addendums`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${doctorToken}`,
                'Content-Type': 'application/json'
            }
        }, {
            reason: 'Đính chính liều dùng và hẹn tái khám sớm',
            updatedTreatmentPlan: 'Duy trì Ceftriaxon 1g IV, tái khám sau 3 ngày',
            clinicalNotes: 'Hạ sốt tốt, SpO2 98%'
        });

        assert(addendum2Res.status === 201, 'Lập Phụ lục Bệnh án lần 2 thành công (HTTP 201 Created)');
        const ad2 = addendum2Res.data?.data;
        assert(
            ad2?.previousDiagnosis?.includes('Streptococcus pneumoniae'),
            'Snapshot Chaining thành công: Addendum #2 kế thừa chính xác chẩn đoán từ Addendum #1'
        );

        // 8. Tra cứu danh sách Phụ lục Bệnh án
        console.log('\n8. Tra cứu lịch sử chuỗi Phụ lục Bệnh án...');
        const listAddendumsRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: `/api/clinical/records/${recordId}/addendums`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${doctorToken}`,
                'Content-Type': 'application/json'
            }
        });

        assert(listAddendumsRes.status === 200, 'Lấy danh sách phụ lục bệnh án thành công (HTTP 200)');
        const addendumsList = listAddendumsRes.data?.data || [];
        assert(addendumsList.length >= 2, `Danh sách phụ lục đầy đủ (có ${addendumsList.length} bản ghi)`);

        // 9. Kiểm tra chi tiết hồ sơ bệnh án qua API getRecord
        console.log('\n9. Kiểm tra trạng thái hồ sơ bệnh án tổng thể...');
        const recordDetailRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: `/api/clinical/records/${recordId}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${doctorToken}`,
                'Content-Type': 'application/json'
            }
        });

        assert(recordDetailRes.status === 200, 'Tra cứu chi tiết bệnh án thành công (HTTP 200)');
        const rec = recordDetailRes.data?.data;
        assert(rec?.isLocked === true, 'Trường isLocked = true phản ánh đúng hồ sơ đã khóa sau 24h');
        assert(rec?.addendumCount >= 2, `Trường addendumCount = ${rec?.addendumCount} phản ánh đúng số lượng phụ lục`);
        assert(rec?.finalDiagnosis?.includes('Streptococcus pneumoniae'), 'Chẩn đoán hiển thị đồng bộ với phụ lục mới nhất');

        await dbClient.end();

        console.log('\n================================================================');
        console.log(`🎉 TẤT CẢ CÁC BƯỚC KIỂM THỬ GIAI ĐOẠN 1 ĐÃ VƯỢT QUA: ${passedCount}/${totalCount} PASS`);
        console.log('================================================================');

    } catch (err) {
        console.error('\n❌ KIỂM THỬ THẤT BẠI:', err.message);
        process.exit(1);
    }
}

// Chờ 3 giây cho backend ổn định rồi chạy
setTimeout(runTests, 3000);
