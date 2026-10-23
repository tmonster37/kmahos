const { Client } = require('pg');

const BASE_URL = 'http://localhost:8080';
const DB_CONFIG = {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'taizz0537',
    database: 'kmahos'
};

async function runTests() {
    console.log("==========================================================================");
    console.log("🏥 BẮT ĐẦU KIỂM THỬ: KIOSK CHECK-IN WINDOW GUARD & LAB PRIORITY (TASK-14)");
    console.log("   1. Check-in Kiosk Window Guard (E-healthcare Reference):");
    console.log("      - Chặn check-in không tồn tại (400/404 Not Found)");
    console.log("      - Chặn check-in khác ngày (OTHER_DAY)");
    console.log("      - Chặn check-in quá sớm > 60 phút (TOO_EARLY)");
    console.log("      - Chặn check-in quá trễ > 15 phút (TOO_LATE)");
    console.log("      - Tiếp nhận check-in hợp lệ trong khung giờ (OPEN)");
    console.log("      - Đảm bảo Idempotency khi check-in lặp lại (Giữ nguyên STT)");
    console.log("   2. Ưu tiên Đọc Kết quả Xét nghiệm (revita-be Reference):");
    console.log("      - Bác sĩ chỉ định cận lâm sàng cho bệnh nhân");
    console.log("      - Kỹ thuật viên hoàn tất kết quả xét nghiệm (DIAGNOSING)");
    console.log("      - Hàng đợi Bác sĩ: isReturnAfterResult = true, mã STT prefix 'KQ-'");
    console.log("      - Bệnh nhân có kết quả xếp ưu tiên trước bệnh nhân chờ thường");
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

    const pgClient = new Client(DB_CONFIG);
    await pgClient.connect();

    let doctorToken = "";
    let doctorPhone = "0937050537";
    let doctorId = "";
    let patientToken = "";
    let patientProfileId = "";
    let patientPhone = "0988889999";

    // --- PHẦN 0: ĐĂNG NHẬP VÀ CHUẨN BỊ THÔNG TIN ---
    await test("0.1. Đăng nhập Bác sĩ / Admin & Lấy thông tin Bác sĩ", async () => {
        // Lấy thông tin bác sĩ từ DB
        const docRes = await pgClient.query(`
            SELECT d.doctor_id, a.user_id, a.phone_number 
            FROM doctors d 
            JOIN accounts a ON d.account_id = a.user_id 
            WHERE d.deleted = false 
            LIMIT 1;
        `);
        if (docRes.rows.length === 0) throw new Error("Không tìm thấy bác sĩ trong hệ thống");
        doctorId = docRes.rows[0].doctor_id;
        doctorPhone = docRes.rows[0].phone_number;

        // Đăng nhập tài khoản bác sĩ / admin
        let res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phoneNumber: doctorPhone, password: "password123" })
        });
        let json = await res.json();
        if (!json.success) {
            // Thử mật khẩu admin
            res = await fetch(`${BASE_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phoneNumber: "0937050537", password: "taizz0537" })
            });
            json = await res.json();
        }
        if (!json.success || !json.data?.accessToken) throw new Error("Đăng nhập bác sĩ thất bại: " + json.message);
        doctorToken = json.data.accessToken;
        console.log(`   -> Doctor ID: ${doctorId}, Doctor Phone: ${doctorPhone}`);
    });

    let cashierToken = "";
    await test("0.1b. Đăng nhập Thu ngân / Admin để phục vụ chốt chặn", async () => {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phoneNumber: "0937050537", password: "taizz0537" })
        });
        const json = await res.json();
        if (!json.success || !json.data?.accessToken) throw new Error("Đăng nhập thu ngân thất bại");
        cashierToken = json.data.accessToken;
    });

    await test("0.2. Đăng nhập Bệnh nhân (0988889999) & Lấy Hồ sơ", async () => {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phoneNumber: patientPhone, password: "password123" })
        });
        const json = await res.json();
        if (!json.success || !json.data?.accessToken) throw new Error("Đăng nhập bệnh nhân thất bại: " + json.message);
        patientToken = json.data.accessToken;

        const profRes = await fetch(`${BASE_URL}/api/patient-profiles`, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        const profJson = await profRes.json();
        if (!profJson.success || profJson.data.length === 0) throw new Error("Không có hồ sơ bệnh nhân!");
        patientProfileId = profJson.data[0].patientProfileId;
        console.log(`   -> Patient Profile ID: ${patientProfileId}`);
    });

    // --- PHẦN 1: KIỂM THỬ KIOSK CHECK-IN WINDOW GUARD ---
    await test("1.1. Chặn check-in mã/SĐT không tồn tại", async () => {
        const res = await fetch(`${BASE_URL}/api/bookings/kiosk/check-in`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingCodeOrPhone: "INVALID_CODE_999999" })
        });
        const json = await res.json();
        if (![400, 404].includes(res.status) || json.success !== false) {
            throw new Error(`Kỳ vọng 400/404, nhận được status: ${res.status}`);
        }
        if (!json.message.includes("Không tìm thấy thông tin lịch khám")) {
            throw new Error("Thông báo lỗi không đúng format: " + json.message);
        }
        console.log(`   -> Phản hồi chính xác: "${json.message}"`);
    });

    let otherDayBookingCode = "";
    await test("1.2. Chặn check-in lịch khám khác ngày (OTHER_DAY)", async () => {
        const queryRes = await pgClient.query(`
            SELECT booking_code, booking_date 
            FROM bookings 
            WHERE booking_date < CURRENT_DATE AND deleted = false 
            LIMIT 1;
        `);
        if (queryRes.rows.length > 0) {
            otherDayBookingCode = queryRes.rows[0].booking_code;
        } else {
            const slotQuery = await pgClient.query("SELECT time_slot_id FROM time_slots LIMIT 1;");
            const slotId = slotQuery.rows[0].time_slot_id;
            const insRes = await pgClient.query(`
                INSERT INTO bookings (booking_id, booking_code, patient_profile_id, doctor_id, time_slot_id, booking_date, status, price, queue_number, created_at, updated_at, deleted)
                VALUES (gen_random_uuid(), 'BK_YESTERDAY_' || floor(random()*10000), $1, $2, $3, CURRENT_DATE - INTERVAL '1 day', 'CONFIRMED', 200000, 99, NOW(), NOW(), false)
                RETURNING booking_code;
            `, [patientProfileId, doctorId, slotId]);
            otherDayBookingCode = insRes.rows[0].booking_code;
        }

        const res = await fetch(`${BASE_URL}/api/bookings/kiosk/check-in`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingCodeOrPhone: otherDayBookingCode })
        });
        const json = await res.json();
        if (res.status !== 400 || json.success !== false) {
            throw new Error(`Kỳ vọng 400 Bad Request, nhận được status: ${res.status}`);
        }
        if (!json.message.includes("Không phải ngày hôm nay") && !json.message.includes("đúng ngày khám")) {
            throw new Error("Thông báo từ chối khác ngày không khớp: " + json.message);
        }
        console.log(`   -> Phản hồi chặn khác ngày: "${json.message}"`);
    });

    let tooEarlyBookingCode = "";
    let slotTooEarlyId = "";
    await test("1.3. Chặn check-in quá sớm > 60 phút (TOO_EARLY)", async () => {
        const nowRes = await pgClient.query("SELECT EXTRACT(HOUR FROM CURRENT_TIME)*60 + EXTRACT(MINUTE FROM CURRENT_TIME) as current_mins;");
        const currentMins = parseInt(nowRes.rows[0].current_mins);

        // Lấy hoặc tạo doctor_schedule hôm nay
        const schRes = await pgClient.query(`
            SELECT doctor_schedule_id FROM doctor_schedules 
            WHERE schedule_date = CURRENT_DATE AND deleted = false 
            LIMIT 1;
        `);
        let scheduleId;
        if (schRes.rows.length > 0) {
            scheduleId = schRes.rows[0].doctor_schedule_id;
        } else {
            const insSch = await pgClient.query(`
                INSERT INTO doctor_schedules (doctor_schedule_id, doctor_id, room_id, schedule_date, session, created_at, updated_at, deleted)
                VALUES (gen_random_uuid(), $1, 1, CURRENT_DATE, 'MORNING', NOW(), NOW(), false)
                RETURNING doctor_schedule_id;
            `, [doctorId]);
            scheduleId = insSch.rows[0].doctor_schedule_id;
        }

        if (currentMins >= 22 * 60 + 30) {
            console.log("   -> [THỜI ĐIỂM ĐÊM MUỘN: > 22h30] Hệ thống bệnh viện khép ca trong ngày; kiểm tra phản hồi từ chối thời gian chuẩn xác.");
        }

        // Tính toán khung giờ khám: nếu ban ngày thì lấy sau 90 phút, nếu ban đêm thì lấy slot tương lai của ngày hôm sau hoặc kiểm tra chặn
        const targetStartMins = (currentMins + 90) % (24 * 60);
        const targetEndMins = (targetStartMins + 20) % (24 * 60);
        const startH = String(Math.floor(targetStartMins / 60)).padStart(2, "0");
        const startM = String(targetStartMins % 60).padStart(2, "0");
        const endH = String(Math.floor(targetEndMins / 60)).padStart(2, "0");
        const endM = String(targetEndMins % 60).padStart(2, "0");
        const startTimeStr = `${startH}:${startM}:00`;
        const endTimeStr = `${endH}:${endM}:00`;

        const slotRes = await pgClient.query(`
            INSERT INTO time_slots (time_slot_id, doctor_schedule_id, start_time, end_time, max_capacity, current_bookings, created_at, updated_at, deleted)
            VALUES (gen_random_uuid(), $1, $2, $3, 5, 0, NOW(), NOW(), false)
            RETURNING time_slot_id;
        `, [scheduleId, startTimeStr, endTimeStr]);
        slotTooEarlyId = slotRes.rows[0].time_slot_id;

        // Đặt lịch với slot này
        const bookRes = await fetch(`${BASE_URL}/api/bookings`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${patientToken}` },
            body: JSON.stringify({
                patientProfileId: patientProfileId,
                timeSlotId: slotTooEarlyId,
                symptoms: "Test Kiosk Check-in TOO_EARLY"
            })
        });
        const bookJson = await bookRes.json();
        if (!bookJson.success) throw new Error("Đặt lịch thất bại: " + bookJson.message);
        tooEarlyBookingCode = bookJson.data.bookingCode;

        // Gọi Check-in Kiosk
        const checkInRes = await fetch(`${BASE_URL}/api/bookings/kiosk/check-in`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingCodeOrPhone: tooEarlyBookingCode })
        });
        const checkInJson = await checkInRes.json();
        if (checkInRes.status !== 400 || checkInJson.success !== false) {
            throw new Error(`Kỳ vọng 400 Bad Request cho TOO_EARLY, nhận: ${checkInRes.status}`);
        }
        if (currentMins < 22 * 60 + 30) {
            if (!checkInJson.message.includes("Chưa đến khung giờ tiếp nhận") && !checkInJson.message.includes("quá sớm")) {
                throw new Error("Thông điệp từ chối TOO_EARLY không đúng: " + checkInJson.message);
            }
        }
        console.log(`   -> Phản hồi chặn thời gian ca khám: "${checkInJson.message}"`);
    });

    let tooLateBookingCode = "";
    let slotTooLateId = "";
    await test("1.4. Chặn check-in quá trễ > 15 phút (TOO_LATE)", async () => {
        const schRes = await pgClient.query(`
            SELECT doctor_schedule_id FROM doctor_schedules 
            WHERE schedule_date = CURRENT_DATE AND deleted = false 
            LIMIT 1;
        `);
        const scheduleId = schRes.rows[0].doctor_schedule_id;

        // Giờ ca khám đã kết thúc hơn 15 phút trong ngày hôm nay
        const nowRes = await pgClient.query("SELECT EXTRACT(HOUR FROM CURRENT_TIME)*60 + EXTRACT(MINUTE FROM CURRENT_TIME) as current_mins;");
        const currentMins = parseInt(nowRes.rows[0].current_mins);
        let startTime = '00:01:00';
        let endTime = '00:05:00';
        if (currentMins >= 60) {
            const pastTimeRes = await pgClient.query("SELECT (CURRENT_TIME - INTERVAL '40 minutes')::time(0) as start_time, (CURRENT_TIME - INTERVAL '20 minutes')::time(0) as end_time;");
            startTime = pastTimeRes.rows[0].start_time;
            endTime = pastTimeRes.rows[0].end_time;
        }

        const slotRes = await pgClient.query(`
            INSERT INTO time_slots (time_slot_id, doctor_schedule_id, start_time, end_time, max_capacity, current_bookings, created_at, updated_at, deleted)
            VALUES (gen_random_uuid(), $1, $2, $3, 5, 0, NOW(), NOW(), false)
            RETURNING time_slot_id;
        `, [scheduleId, startTime, endTime]);
        slotTooLateId = slotRes.rows[0].time_slot_id;

        const bookRes = await fetch(`${BASE_URL}/api/bookings`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${patientToken}` },
            body: JSON.stringify({
                patientProfileId: patientProfileId,
                timeSlotId: slotTooLateId,
                symptoms: "Test Kiosk Check-in TOO_LATE"
            })
        });
        const bookJson = await bookRes.json();
        if (!bookJson.success) throw new Error("Đặt lịch thất bại: " + bookJson.message);
        tooLateBookingCode = bookJson.data.bookingCode;

        // Gọi Check-in Kiosk
        const checkInRes = await fetch(`${BASE_URL}/api/bookings/kiosk/check-in`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingCodeOrPhone: tooLateBookingCode })
        });
        const checkInJson = await checkInRes.json();
        if (checkInRes.status !== 400 || checkInJson.success !== false) {
            throw new Error(`Kỳ vọng 400 Bad Request cho TOO_LATE, nhận: ${checkInRes.status}`);
        }
        if (!checkInJson.message.includes("quá thời gian tiếp nhận") && !checkInJson.message.includes("quá 15 phút") && !checkInJson.message.includes("quá trễ")) {
            throw new Error("Thông điệp từ chối TOO_LATE không đúng: " + checkInJson.message);
        }
        console.log(`   -> Phản hồi chặn đến quá trễ: "${checkInJson.message}"`);
    });

    let validBookingCode = "";
    let slotValidId = "";
    let checkInTicketData = null;
    await test("1.5. Tiếp nhận check-in hợp lệ trong khung giờ (OPEN)", async () => {
        const schRes = await pgClient.query(`
            SELECT doctor_schedule_id FROM doctor_schedules 
            WHERE schedule_date = CURRENT_DATE AND deleted = false 
            LIMIT 1;
        `);
        const scheduleId = schRes.rows[0].doctor_schedule_id;

        // Giờ ca khám được thiết kế bao trùm thời điểm hiện tại: bắt đầu 10 phút trước và kết thúc sau 30 phút (hoặc 23:59:00 nếu đêm muộn)
        const curDate = new Date();
        const nowMins = curDate.getHours() * 60 + curDate.getMinutes();
        const validStartM = Math.max(0, nowMins - 10);
        const validEndM = Math.min(23 * 60 + 59, nowMins + 25);
        const sH = String(Math.floor(validStartM / 60)).padStart(2, "0");
        const sM = String(validStartM % 60).padStart(2, "0");
        const eH = String(Math.floor(validEndM / 60)).padStart(2, "0");
        const eM = String(validEndM % 60).padStart(2, "0");
        const startTimeStr = `${sH}:${sM}:00`;
        const endTimeStr = `${eH}:${eM}:00`;

        const slotRes = await pgClient.query(`
            INSERT INTO time_slots (time_slot_id, doctor_schedule_id, start_time, end_time, max_capacity, current_bookings, created_at, updated_at, deleted)
            VALUES (gen_random_uuid(), $1, $2, $3, 5, 0, NOW(), NOW(), false)
            RETURNING time_slot_id;
        `, [scheduleId, startTimeStr, endTimeStr]);
        slotValidId = slotRes.rows[0].time_slot_id;

        const bookRes = await fetch(`${BASE_URL}/api/bookings`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${patientToken}` },
            body: JSON.stringify({
                patientProfileId: patientProfileId,
                timeSlotId: slotValidId,
                symptoms: "Test Kiosk Check-in OPEN Window"
            })
        });
        const bookJson = await bookRes.json();
        if (!bookJson.success) throw new Error("Đặt lịch thất bại: " + bookJson.message);
        validBookingCode = bookJson.data.bookingCode;

        // Gọi Check-in Kiosk
        const checkInRes = await fetch(`${BASE_URL}/api/bookings/kiosk/check-in`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingCodeOrPhone: validBookingCode })
        });
        const checkInJson = await checkInRes.json();
        if (checkInRes.status !== 200 || !checkInJson.success) {
            throw new Error(`Check-in thất bại: ${checkInJson.message}`);
        }

        checkInTicketData = checkInJson.data;
        if (!checkInTicketData.queueNumber || !checkInTicketData.queueCode) {
            throw new Error("Không có số thứ tự khám được cấp!");
        }
        if (checkInTicketData.windowStatus !== "OPEN") {
            throw new Error("Trạng thái khung giờ không phải OPEN: " + checkInTicketData.windowStatus);
        }

        console.log(`   -> Check-in thành công: Bệnh nhân [${checkInTicketData.patientName}]`);
        console.log(`   -> STT Khám: [${checkInTicketData.queueCode}] (#${checkInTicketData.queueNumber})`);
        console.log(`   -> Phòng khám: [${checkInTicketData.roomName || ''}]`);
        console.log(`   -> Bác sĩ: [${checkInTicketData.doctorName}]`);
    });

    await test("1.6. Đảm bảo Idempotency khi check-in lặp lại (Giữ nguyên STT)", async () => {
        // Check-in lại lần 2 bằng Mã đặt lịch vừa check-in
        const repeatRes = await fetch(`${BASE_URL}/api/bookings/kiosk/check-in`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingCodeOrPhone: validBookingCode })
        });
        const repeatJson = await repeatRes.json();
        if (repeatRes.status !== 200 || !repeatJson.success) {
            throw new Error(`Gọi lại check-in thất bại: ${repeatJson.message}`);
        }

        const data2 = repeatJson.data;
        if (data2.queueNumber !== checkInTicketData.queueNumber) {
            throw new Error(`STT bị thay đổi: Cũ #${checkInTicketData.queueNumber}, Mới #${data2.queueNumber}`);
        }
        if (data2.queueCode !== checkInTicketData.queueCode) {
            throw new Error(`Mã STT bị thay đổi: Cũ ${checkInTicketData.queueCode}, Mới ${data2.queueCode}`);
        }
        console.log(`   -> Idempotency xác minh: Giữ nguyên STT #${data2.queueNumber} (${data2.queueCode})`);
    });

    // --- PHẦN 2: KIỂM THỬ ƯU TIÊN ĐỌC KẾT QUẢ XÉT NGHIỆM (RETURN_AFTER_RESULT) ---
    let labTestRecordId = "";
    let labTestId = "";
    let labBookingCode = "";

    await test("2.1. Tạo ca khám mới & Bác sĩ tiếp nhận bắt đầu khám", async () => {
        const kioskRes = await fetch(`${BASE_URL}/api/bookings/kiosk`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName: "Đoàn Văn Xét Nghiệm Huyết Học",
                phoneNumber: "0966554433",
                departmentId: 1,
                symptoms: "Chóng mặt, da xanh xao, nghi ngờ thiếu máu",
                isPriority: false
            })
        });
        const kioskJson = await kioskRes.json();
        if (!kioskJson.success) throw new Error("Cấp phiếu khám Kiosk thất bại: " + kioskJson.message);
        labBookingCode = kioskJson.data.bookingCode;

        // Bác sĩ bắt đầu khám
        const startRes = await fetch(`${BASE_URL}/api/clinical/start`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${doctorToken}`
            },
            body: JSON.stringify({
                bookingCode: labBookingCode,
                symptoms: "Chóng mặt, da xanh, tim đập nhanh"
            })
        });
        const startJson = await startRes.json();
        if (!startJson.success) throw new Error("Bác sĩ bắt đầu khám thất bại: " + startJson.message);
        labTestRecordId = startJson.data.recordId;
        console.log(`   -> Khởi tạo hồ sơ khám bệnh: ${labTestRecordId}`);
    });

    await test("2.2. Bác sĩ chỉ định dịch vụ cận lâm sàng", async () => {
        const srvRes = await pgClient.query("SELECT service_id, service_name FROM medical_services WHERE deleted = false LIMIT 1;");
        if (srvRes.rows.length === 0) throw new Error("Không có dịch vụ y tế nào trong CSDL");
        const serviceId = srvRes.rows[0].service_id;
        console.log(`   -> Chỉ định dịch vụ: [ID ${serviceId}] ${srvRes.rows[0].service_name}`);

        const assignRes = await fetch(`${BASE_URL}/api/clinical/records/${labTestRecordId}/tests`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${doctorToken}`
            },
            body: JSON.stringify({
                serviceIds: [serviceId]
            })
        });
        const assignJson = await assignRes.json();
        if (!assignJson.success || !assignJson.data || assignJson.data.length === 0) {
            throw new Error("Chỉ định xét nghiệm thất bại: " + assignJson.message);
        }
        labTestId = assignJson.data[0].testId;
        console.log(`   -> Chỉ định xét nghiệm thành công: Test ID = ${labTestId}`);
    });

    await test("2.2b. Thanh toán viện phí cận lâm sàng tại Quầy thu ngân (Chốt chặn phòng Lab)", async () => {
        // Thu ngân thu tiền HĐ 02: BILL-...-TREATMENT
        const payRes = await fetch(`${BASE_URL}/api/cashier/pay`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${cashierToken}`
            },
            body: JSON.stringify({
                bookingCode: `BILL-${labBookingCode}-TREATMENT`,
                paymentMethod: "CASH",
                amountGiven: 500000,
                notes: "Thu phí cận lâm sàng trước khi thực hiện"
            })
        });
        const payJson = await payRes.json();
        if (!payJson.success) {
            throw new Error("Thu tiền viện phí cận lâm sàng tại quầy thất bại: " + payJson.message);
        }
        console.log(`   -> Thu viện phí HĐ 02 thành công: Biên lai=${payJson.data.receiptCode}, Số tiền=${payJson.data.totalAmount}đ`);
    });

    await test("2.3. Kỹ thuật viên/Bác sĩ cập nhật hoàn tất kết quả xét nghiệm (DIAGNOSING)", async () => {
        const updateRes = await fetch(`${BASE_URL}/api/clinical/tests/${labTestId}/result`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${doctorToken}`
            },
            body: JSON.stringify({
                testResult: "Hồng cầu: 4.8 T/L, Huyết sắc tố: 142 g/L, Bạch cầu: 6.5 G/L - Các chỉ số huyết học trong giới hạn bình thường.",
                resultFileUrl: "http://localhost:8080/results/xet-nghiem-huyet-hoc-0966554433.pdf"
            })
        });
        const updateJson = await updateRes.json();
        if (!updateJson.success) throw new Error("Cập nhật kết quả thất bại: " + updateJson.message);

        // Kiểm tra trạng thái record trong CSDL
        const recDb = await pgClient.query("SELECT state FROM medical_examination_records WHERE record_id = $1;", [labTestRecordId]);
        if (recDb.rows[0].state !== "DIAGNOSING") {
            throw new Error(`Trạng thái hồ sơ kỳ vọng DIAGNOSING, thực tế: ${recDb.rows[0].state}`);
        }
        console.log(`   -> Kết quả xét nghiệm đã nạp. Record state = ${recDb.rows[0].state} (Sẵn sàng quay lại buồng khám)`);
    });

    await test("2.4. Xác minh Bệnh nhân có kết quả xếp ưu tiên hàng đầu trong hàng đợi", async () => {
        // Lấy danh sách hàng đợi công cộng của ngày hôm nay
        const queueRes = await fetch(`${BASE_URL}/api/clinical/queue/public`);
        const queueJson = await queueRes.json();
        if (!queueJson.success) throw new Error("Lấy hàng đợi thất bại: " + queueJson.message);

        const queue = queueJson.data || [];
        console.log(`   -> Tổng số bệnh nhân trong hàng đợi công cộng: ${queue.length}`);

        // Tìm ca khám có kết quả
        const labPatient = queue.find(q => q.bookingCode === labBookingCode);
        if (!labPatient) throw new Error(`Không tìm thấy bệnh nhân ${labBookingCode} trong hàng đợi!`);

        // 1. Kiểm tra cờ isReturnAfterResult
        if (labPatient.isReturnAfterResult !== true) {
            throw new Error(`Kỳ vọng isReturnAfterResult = true, thực tế: ${labPatient.isReturnAfterResult}`);
        }

        // 2. Kiểm tra tiền tố mã hàng đợi "KQ-"
        if (!labPatient.queueCode.startsWith("KQ-")) {
            throw new Error(`Mã hàng đợi kỳ vọng prefix 'KQ-', thực tế: ${labPatient.queueCode}`);
        }

        // 3. Kiểm tra vị trí ưu tiên trong danh sách chờ:
        // Bệnh nhân RETURN_AFTER_RESULT phải đứng trước các bệnh nhân WAITING thường
        const waitingRegularPatients = queue.filter(q => q.status === "WAITING" && !q.isReturnAfterResult && !q.isPriority);
        if (waitingRegularPatients.length > 0) {
            const labIndex = queue.indexOf(labPatient);
            const regularIndex = queue.indexOf(waitingRegularPatients[0]);
            if (labIndex > regularIndex) {
                throw new Error(`Bệnh nhân có KQ (${labPatient.queueCode}, vị trí #${labIndex}) bị xếp sau bệnh nhân thường (${waitingRegularPatients[0].queueCode}, vị trí #${regularIndex})!`);
            }
            console.log(`   -> Xác minh thứ hạng: Bệnh nhân trả kết quả [${labPatient.queueCode}] (index #${labIndex}) xếp TRƯỚC bệnh nhân thường [${waitingRegularPatients[0].queueCode}] (index #${regularIndex})`);
        } else {
            console.log(`   -> Bệnh nhân trả kết quả [${labPatient.queueCode}] xếp ưu tiên hàng đầu!`);
        }

        console.log(`   -> Chi tiết thẻ hàng đợi:`, {
            bookingCode: labPatient.bookingCode,
            patientName: labPatient.patientName,
            queueCode: labPatient.queueCode,
            isReturnAfterResult: labPatient.isReturnAfterResult,
            status: labPatient.status
        });
    });

    await pgClient.end();

    console.log("\n==========================================================================");
    console.log(`🏁 KẾT QUẢ KIỂM THỬ: ${passed} PASSED | ${failed} FAILED`);
    console.log("==========================================================================");

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error("Lỗi ngoại lệ trong quá trình chạy test:", err);
    process.exit(1);
});
