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
    console.log('🚀 BẮT ĐẦU KIỂM THỬ GIAI ĐOẠN 4: ADMIN PORTAL');
    console.log('   (Quản lý CCHN Bác sĩ / Dashboard KPI Doanh thu & Buồng khám / Immutable Audit Logs)');
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
        // 1. Đăng nhập Admin (0937050537 / taizz0537)
        console.log('👉 [BƯỚC 1] Đăng nhập tài khoản Quản trị viên Admin (0937050537)...');
        const loginRes = await request('POST', '/api/auth/login', {
            phoneNumber: '0937050537',
            password: 'taizz0537'
        });

        assert(loginRes.status === 200, 'Đăng nhập Admin thành công (HTTP 200)');
        const token = loginRes.data?.data?.accessToken;
        assert(!!token, 'Nhận được JWT Token của Quản trị viên (ROLE_ADMIN)');

        // =========================================================================
        // PHẦN 1: QUẢN LÝ CHỨNG CHỈ HÀNH NGHỀ (CCHN) BÁC SĨ (THÔNG TƯ BỘ Y TẾ)
        // =========================================================================
        console.log('\n👉 [BƯỚC 2] Tra cứu danh sách Chứng chỉ hành nghề bác sĩ (GET /api/admin/doctors/licenses)...');
        const licensesRes = await request('GET', '/api/admin/doctors/licenses', null, token);
        assert(licensesRes.status === 200, 'Lấy danh sách CCHN bác sĩ thành công (HTTP 200)');
        const doctorList = licensesRes.data?.data;
        assert(Array.isArray(doctorList) && doctorList.length > 0, `Hệ thống có ${doctorList?.length} bác sĩ trong danh bạ`);

        const targetDoctor = doctorList[0];
        console.log(`\n👉 [BƯỚC 3] Cập nhật Chứng chỉ hành nghề cho BS. ${targetDoctor.fullName} (ID: ${targetDoctor.doctorId})...`);
        const updateLicenseReq = {
            doctorLicense: 'CCHN-009876/BYT-CCHN',
            licenseIssuedDate: '2020-05-15',
            licenseScope: 'Khám bệnh, chữa bệnh chuyên khoa Tim mạch và Hồi sức cấp cứu (Bộ Y tế cấp)'
        };

        const updateRes = await request('PUT', `/api/admin/doctors/${targetDoctor.doctorId}/license`, updateLicenseReq, token);
        assert(updateRes.status === 200, 'Cập nhật CCHN thành công (HTTP 200)');
        const updatedDoc = updateRes.data?.data;
        assert(updatedDoc?.doctorLicense === 'CCHN-009876/BYT-CCHN', `Số CCHN khớp chính xác: ${updatedDoc?.doctorLicense}`);
        assert(updatedDoc?.isLicensed === true, 'Bác sĩ được xác nhận isLicensed = true');
        assert(updatedDoc?.licenseStatus === 'Đã cấp CCHN hợp lệ', `Trạng thái: ${updatedDoc?.licenseStatus}`);
        assert(updatedDoc?.licenseScope?.includes('Tim mạch'), `Phạm vi chuyên môn: ${updatedDoc?.licenseScope}`);

        // Kiểm tra trong CSDL PostgreSQL
        const dbDocCheck = await pgClient.query(`
            SELECT doctor_id, doctor_license, license_issued_date, license_scope 
            FROM doctors 
            WHERE doctor_id = $1
        `, [targetDoctor.doctorId]);
        assert(dbDocCheck.rows.length > 0, 'Tìm thấy bản ghi bác sĩ trong CSDL');
        assert(dbDocCheck.rows[0].doctor_license === 'CCHN-009876/BYT-CCHN', 'CSDL đã lưu bền vững mã CCHN');

        // Test lọc bác sĩ chưa có CCHN (onlyUnlicensed=true)
        console.log('\n👉 [BƯỚC 4] Lọc danh sách bác sĩ chưa bổ sung CCHN (onlyUnlicensed=true)...');
        const unlicensedRes = await request('GET', '/api/admin/doctors/licenses?onlyUnlicensed=true', null, token);
        assert(unlicensedRes.status === 200, 'Lọc danh sách bác sĩ chưa cấp CCHN thành công');
        const unlicensedList = unlicensedRes.data?.data || [];
        const isTargetInUnlicensed = unlicensedList.some(d => d.doctorId === targetDoctor.doctorId);
        assert(!isTargetInUnlicensed, 'Bác sĩ vừa cấp CCHN không còn nằm trong danh sách thiếu CCHN');

        // =========================================================================
        // PHẦN 2: DASHBOARD KPI DOANH THU THỜI GIAN THỰC
        // =========================================================================
        console.log('\n👉 [BƯỚC 5] Lấy dữ liệu KPI Doanh thu tổng hợp (GET /api/admin/dashboard/kpi-revenue)...');
        const revenueRes = await request('GET', '/api/admin/dashboard/kpi-revenue', null, token);
        assert(revenueRes.status === 200, 'Lấy dữ liệu KPI doanh thu thành công (HTTP 200)');
        const revData = revenueRes.data?.data;
        assert(revData?.totalRevenue !== undefined, `Tổng doanh thu hệ thống: ${revData?.totalRevenue}đ`);
        assert(revData?.cashRevenue !== undefined, `Doanh thu tiền mặt (CASH): ${revData?.cashRevenue}đ`);
        assert(revData?.momoRevenue !== undefined, `Doanh thu ví MoMo: ${revData?.momoRevenue}đ`);
        assert(revData?.vietQrRevenue !== undefined, `Doanh thu chuyển khoản VietQR: ${revData?.vietQrRevenue}đ`);
        assert(revData?.totalTransactions >= 0, `Tổng số giao dịch thành công: ${revData?.totalTransactions}`);
        assert(revData?.todayAppointments >= 0, `Lượt khám hôm nay: ${revData?.todayAppointments}`);
        assert(revData?.completionRate >= 0, `Tỷ lệ hoàn tất khám: ${revData?.completionRate}%`);
        assert(Array.isArray(revData?.dailyBreakdown) && revData?.dailyBreakdown?.length > 0, `Biểu đồ doanh thu 7 ngày có ${revData?.dailyBreakdown?.length} điểm dữ liệu`);

        // =========================================================================
        // PHẦN 3: DASHBOARD KPI CÔNG SUẤT SỬ DỤNG BUỒNG KHÁM THỜI GIAN THỰC
        // =========================================================================
        console.log('\n👉 [BƯỚC 6] Lấy dữ liệu KPI Công suất buồng khám (GET /api/admin/dashboard/room-capacity)...');
        const capacityRes = await request('GET', '/api/admin/dashboard/room-capacity', null, token);
        assert(capacityRes.status === 200, 'Lấy dữ liệu công suất buồng khám thành công (HTTP 200)');
        const capData = capacityRes.data?.data;
        assert(capData?.totalRooms > 0, `Tổng số buồng khám: ${capData?.totalRooms}`);
        assert(capData?.overallUtilizationRate >= 0, `Công suất sử dụng trung bình toàn viện: ${capData?.overallUtilizationRate}%`);
        assert(Array.isArray(capData?.rooms) && capData?.rooms?.length > 0, `Danh sách chi tiết có ${capData?.rooms?.length} buồng khám`);

        const firstRoom = capData.rooms[0];
        assert(firstRoom?.roomName !== undefined, `Phòng mẫu: ${firstRoom?.roomName} (${firstRoom?.departmentName})`);
        assert(['LIGHT', 'MEDIUM', 'HEAVY'].includes(firstRoom?.loadLevel), `Phân loại mức tải buồng khám chuẩn: ${firstRoom?.loadLevel}`);
        assert(firstRoom?.utilizationRate >= 0, `Tỷ lệ lấp đầy: ${firstRoom?.utilizationRate}%`);

        // =========================================================================
        // PHẦN 4: IMMUTABLE AUDIT LOGS (APPEND-ONLY + SANITIZE PII)
        // =========================================================================
        console.log('\n👉 [BƯỚC 7] Ghi nhận Audit Log sự kiện nhạy cảm (POST /api/admin/audit-logs)...');
        const auditPayload = {
            action: 'DOCTOR_LICENSE_AUDIT',
            entityType: 'DOCTOR',
            entityId: targetDoctor.doctorId,
            details: 'Admin cập nhật hồ sơ CCHN, thông tin tài khoản password=UltraSecretPassword123 và mã otp=987654'
        };

        const postAuditRes = await request('POST', '/api/admin/audit-logs', auditPayload, token);
        assert(postAuditRes.status === 200, 'Ghi nhận Audit Log thành công (HTTP 200)');

        console.log('\n👉 [BƯỚC 8] Tra cứu Audit Log và kiểm tra tính bất biến + Sanitize PII...');
        const getAuditRes = await request('GET', '/api/admin/audit-logs?action=DOCTOR_LICENSE_AUDIT', null, token);
        assert(getAuditRes.status === 200, 'Lấy danh sách Audit Log thành công (HTTP 200)');
        const auditList = getAuditRes.data?.data || [];
        assert(auditList.length > 0, `Tìm thấy ${auditList.length} bản ghi Audit Log`);

        const latestLog = auditList[0];
        assert(latestLog.action === 'DOCTOR_LICENSE_AUDIT', 'Mã hành động audit khớp chính xác');
        assert(latestLog.actorRole === 'ROLE_ADMIN', 'Ghi nhận đúng vai trò thực hiện: ROLE_ADMIN');
        assert(!!latestLog.createdAt, `Thời điểm ghi nhận bất biến: ${latestLog.createdAt}`);

        // KIỂM TRA QUAN TRỌNG: SANITIZE PII KHÔNG LỘ MẬT KHẨU / OTP
        assert(!latestLog.details.includes('UltraSecretPassword123'), 'Mật khẩu gốc ĐÃ ĐƯỢC CHE HOÀN TOÀN (Sanitized PII)');
        assert(latestLog.details.includes('password=***MASKED***'), 'Định dạng che mật khẩu chuẩn: password=***MASKED***');
        assert(!latestLog.details.includes('987654'), 'Mã OTP ĐÃ ĐƯỢC CHE HOÀN TOÀN');

        console.log('\n================================================================');
        console.log(`🏁 KẾT QUẢ KIỂM THỬ GIAI ĐOẠN 4: ${passed} PASS, ${failed} FAIL`);
        console.log('================================================================\n');

    } finally {
        await pgClient.end();
    }
}

runTests().catch(err => {
    console.error('Fatal error during Phase 4 test execution:', err);
    process.exit(1);
});
