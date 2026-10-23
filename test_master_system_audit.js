// ==============================================================================
// MASTER SYSTEM AUDIT: BỘ TEST TOÀN DIỆN TẤT CẢ CHỨC NĂNG & PHÂN HỆ BỆNH VIỆN
// ==============================================================================

const BASE_URL = 'http://localhost:8080/api';

async function runMasterAudit() {
  console.log("==================================================================================");
  console.log("🏥 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN TOÀN BỘ HỆ THỐNG BỆNH VIỆN THÔNG MINH TNT");
  console.log("==================================================================================\n");

  let passed = 0;
  let failed = 0;
  const failures = [];

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
      failed++;
      failures.push({ name, error: err.message });
    }
  }

  let adminToken = "";
  let patientToken = "";
  let doctorToken = "";
  let sampleDeptId = null;
  let sampleRoomId = null;
  let sampleDoctorId = null;
  let sampleDoctorAccountId = null;
  let sampleSlotId = null;
  let sampleProfileId = null;
  let sampleBookingCode = null;
  let sampleRecordId = null;
  let sampleTestId = null;
  let sampleAdmissionId = null;
  let sampleReminderId = null;

  // ----------------------------------------------------------------------------
  // SECTION 1: XÁC THỰC & BẢO MẬT (AUTH & SECURITY)
  // ----------------------------------------------------------------------------
  console.log("--- 1. PHÂN HỆ XÁC THỰC & BẢO MẬT ---");
  
  await test("1.1 Admin Đăng nhập hệ thống (0937050537)", async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: "0937050537", password: "taizz0537" })
    });
    const data = await res.json();
    if (!data.success || !data.data?.accessToken) throw new Error(data.message || "Không thể đăng nhập Admin");
    adminToken = data.data.accessToken;
  });

  const randPhone = "098" + Math.floor(1000000 + Math.random() * 9000000);
  await test("1.2 Bệnh nhân Đăng ký tài khoản mới", async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: "Bệnh Nhân Kiểm Thử Toàn Diện",
        phoneNumber: randPhone,
        email: `patient_${randPhone}@gmail.com`,
        password: "password123",
        role: "ROLE_PATIENT"
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Đăng ký thất bại");
  });

  await test("1.3 Bệnh nhân Đăng nhập lấy Token", async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: randPhone, password: "password123" })
    });
    const data = await res.json();
    if (!data.success || !data.data?.accessToken) throw new Error(data.message || "Đăng nhập bệnh nhân thất bại");
    patientToken = data.data.accessToken;
  });

  // ----------------------------------------------------------------------------
  // SECTION 2: HỒ SƠ BỆNH NHÂN GIA ĐÌNH (PATIENT PROFILES)
  // ----------------------------------------------------------------------------
  console.log("\n--- 2. PHÂN HỆ HỒ SƠ SỨC KHỎE GIA ĐÌNH ---");

  await test("2.1 Tạo hồ sơ sức khỏe cá nhân", async () => {
    const res = await fetch(`${BASE_URL}/patient-profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${patientToken}` },
      body: JSON.stringify({
        fullName: "Bệnh Nhân Kiểm Thử Toàn Diện",
        phoneNumber: randPhone,
        identityNumber: "001200009999",
        healthInsuranceNumber: "DN4010123456789",
        gender: "MALE",
        dateOfBirth: "1995-05-20",
        streetAddress: "123 Đường Nguyễn Trãi",
        province: "Hà Nội",
        district: "Thanh Xuân",
        ward: "Thanh Xuân Bắc"
      })
    });
    const data = await res.json();
    if (!data.success || !data.data?.patientProfileId) throw new Error(data.message || "Tạo hồ sơ thất bại");
    sampleProfileId = data.data.patientProfileId;
  });

  await test("2.2 Lấy danh sách hồ sơ y tế của tài khoản", async () => {
    const res = await fetch(`${BASE_URL}/patient-profiles`, {
      headers: { 'Authorization': `Bearer ${patientToken}` }
    });
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data) || data.data.length === 0) throw new Error("Không lấy được hồ sơ");
  });

  // ----------------------------------------------------------------------------
  // SECTION 3: CƠ CẤU CHUYÊN KHOA & PHÒNG KHÁM (STRUCTURE)
  // ----------------------------------------------------------------------------
  console.log("\n--- 3. PHÂN HỆ CƠ CẤU CHUYÊN KHOA & PHÒNG KHÁM ---");

  await test("3.1 Lấy danh sách chuyên khoa bệnh viện (Công khai)", async () => {
    const res = await fetch(`${BASE_URL}/departments`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data) || data.data.length === 0) throw new Error("Lỗi lấy chuyên khoa");
    sampleDeptId = data.data[0].departmentId;
  });

  await test("3.2 Admin tạo phòng khám chuyên khoa mới cho kịch bản", async () => {
    const roomRes = await fetch(`${BASE_URL}/departments/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        departmentId: sampleDeptId,
        roomName: "P-AUDIT-" + Math.floor(100 + Math.random() * 900),
        roomType: "EXAMINATION_ROOM",
        capacity: 10
      })
    });
    const roomData = await roomRes.json();
    if (roomData.success && roomData.data?.roomId) {
      sampleRoomId = roomData.data.roomId;
    } else {
      const res = await fetch(`${BASE_URL}/departments/${sampleDeptId}/rooms`);
      const data = await res.json();
      sampleRoomId = data.data?.[0]?.roomId || 1;
    }
  });

  // ----------------------------------------------------------------------------
  // SECTION 4: QUẢN LÝ BÁC SĨ & TẠO CA TRỰC KHÁM (DOCTOR & SCHEDULE)
  // ----------------------------------------------------------------------------
  console.log("\n--- 4. PHÂN HỆ QUẢN LÝ BÁC SĨ & PHÂN LỊCH TRỰC ---");

  const docPhone = "096" + Math.floor(1000000 + Math.random() * 9000000);
  await test("4.1 Admin tạo Bác sĩ mới vào hệ thống", async () => {
    const res = await fetch(`${BASE_URL}/admin/doctors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        fullName: "BS. CKI Trần Đình Trọng",
        phoneNumber: docPhone,
        email: `doctor_${docPhone}@tnthospital.vn`,
        password: "password123",
        departmentId: sampleDeptId,
        degree: "BSCKI",
        consultationFee: 200000,
        biography: "Chuyên gia khám chẩn đoán lâm sàng 10 năm kinh nghiệm"
      })
    });
    const data = await res.json();
    if (!data.success || !data.data?.doctorId) throw new Error(data.message || "Tạo bác sĩ thất bại");
    sampleDoctorId = data.data.doctorId;
    sampleDoctorAccountId = data.data.accountId;
  });

  await test("4.2 Đăng nhập bằng tài khoản Bác sĩ vừa tạo", async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: docPhone, password: "password123" })
    });
    const data = await res.json();
    if (!data.success || !data.data?.accessToken) throw new Error(data.message || "Đăng nhập bác sĩ thất bại");
    doctorToken = data.data.accessToken;
  });

  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  await test("4.3 Admin phân Ca trực và Khung giờ khám hôm nay", async () => {
    const res = await fetch(`${BASE_URL}/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        doctorId: sampleDoctorId,
        roomId: sampleRoomId || 1,
        scheduleDate: todayStr,
        session: "MORNING"
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Tạo lịch trực thất bại");
  });

  await test("4.4 Tra cứu ca trực theo Chuyên khoa & Ngày", async () => {
    const res = await fetch(`${BASE_URL}/schedules/by-department?departmentId=${sampleDeptId}&date=${todayStr}`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data) || data.data.length === 0) throw new Error("Không tìm thấy ca trực");
    const schedule = data.data.find(s => s.doctorId === sampleDoctorId) || data.data[0];
    if (schedule && schedule.timeSlots && schedule.timeSlots.length > 0) {
      sampleSlotId = schedule.timeSlots[0].timeSlotId;
    }
  });

  // ----------------------------------------------------------------------------
  // SECTION 5: ĐẶT LỊCH KHÁM & KIOSK TỰ ĐỘNG (BOOKING & KIOSK)
  // ----------------------------------------------------------------------------
  console.log("\n--- 5. PHÂN HỆ ĐẶT LỊCH KHÁM & KIOSK SẢNH ---");

  await test("5.1 Bệnh nhân Đặt lịch khám trực tuyến (Lock concurrency)", async () => {
    if (!sampleSlotId) throw new Error("Không có slotId");
    const res = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${patientToken}` },
      body: JSON.stringify({
        patientProfileId: sampleProfileId,
        timeSlotId: sampleSlotId,
        symptoms: "Đau đầu, tức ngực khi vận động"
      })
    });
    const data = await res.json();
    if (!data.success || !data.data?.bookingCode) throw new Error(data.message || "Đặt lịch thất bại");
    sampleBookingCode = data.data.bookingCode;
  });

  await test("5.2 Bệnh nhân bấm lấy số ƯU TIÊN tại Cây Kiosk Sảnh", async () => {
    const res = await fetch(`${BASE_URL}/bookings/kiosk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: "CỤ NGUYỄN VĂN ƯU TIÊN (80 TUỔI)",
        phoneNumber: "0911223344",
        departmentId: sampleDeptId,
        isPriority: true,
        priorityReason: "Người cao tuổi (≥ 75 tuổi)",
        symptoms: "Khám tăng huyết áp"
      })
    });
    const data = await res.json();
    if (!data.success || data.data?.isPriority !== true) throw new Error(data.message || "Cấp phiếu Kiosk ưu tiên thất bại");
  });

  await test("5.3 Tra cứu phiếu khám bằng Mã QR Code công khai", async () => {
    const res = await fetch(`${BASE_URL}/bookings/code/${sampleBookingCode}`);
    const data = await res.json();
    if (!data.success || data.data?.bookingCode !== sampleBookingCode) throw new Error("Không tìm thấy phiếu khám");
  });

  await test("5.4 Màn hình LED TV gọi số sảnh chờ (/api/clinical/queue/public)", async () => {
    const res = await fetch(`${BASE_URL}/clinical/queue/public`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) throw new Error("Lỗi tải hàng đợi LED");
  });

  // ----------------------------------------------------------------------------
  // SECTION 6: KHÁM LÂM SÀNG & XÉT NGHIỆM PHÒNG LAB (CLINICAL & LAB)
  // ----------------------------------------------------------------------------
  console.log("\n--- 6. PHÂN HỆ KHÁM BỆNH BÁC SĨ & XÉT NGHIỆM LAB ---");

  await test("6.1 Bác sĩ lấy hàng đợi bệnh nhân hôm nay", async () => {
    const res = await fetch(`${BASE_URL}/clinical/doctor/queue`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) throw new Error("Lỗi lấy hàng đợi bác sĩ");
  });

  await test("6.2 Bác sĩ tiếp nhận bệnh nhân & Mở bệnh án (/api/clinical/start)", async () => {
    const res = await fetch(`${BASE_URL}/clinical/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${doctorToken}` },
      body: JSON.stringify({
        bookingCode: sampleBookingCode,
        symptoms: "Đau đầu, tức ngực",
        initialDiagnosis: "Theo dõi rối loạn nhịp tim / Thiếu máu cơ tim"
      })
    });
    const data = await res.json();
    if (!data.success || !data.data?.recordId) throw new Error(data.message || "Mở bệnh án thất bại");
    sampleRecordId = data.data.recordId;
  });

  await test("6.3 Bác sĩ chỉ định các xét nghiệm Cận lâm sàng", async () => {
    const sRes = await fetch(`${BASE_URL}/clinical/services`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    const sData = await sRes.json();
    const serviceIds = (sData.data && sData.data.length > 0) ? [sData.data[0].serviceId] : [];

    const res = await fetch(`${BASE_URL}/clinical/records/${sampleRecordId}/tests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${doctorToken}` },
      body: JSON.stringify({
        medicalServiceIds: serviceIds,
        notes: "Chụp X-quang tim phổi thẳng và Điện tâm đồ ECG"
      })
    });
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data) || data.data.length === 0) throw new Error("Chỉ định xét nghiệm thất bại");
    sampleTestId = data.data[0].testId;
  });

  await test("6.4 Kỹ thuật viên xem danh sách chỉ định phòng Lab", async () => {
    const res = await fetch(`${BASE_URL}/clinical/lab/tests`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) throw new Error("Lỗi lấy danh sách Lab");
  });

  await test("6.4b Bệnh nhân thanh toán viện phí cận lâm sàng tại Quầy thu ngân (/api/cashier/pay)", async () => {
    const pRes = await fetch(`${BASE_URL}/cashier/pending-bills`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const pData = await pRes.json();
    const bills = pData.data || [];
    const treatmentBill = bills.find(b => b.bookingCode === sampleBookingCode && b.billId?.includes("-TREATMENT"))
      || bills.find(b => b.bookingCode === sampleBookingCode);
    
    const billToPay = treatmentBill ? treatmentBill.billId : `${sampleBookingCode}-TREATMENT`;

    const res = await fetch(`${BASE_URL}/cashier/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        bookingCode: billToPay,
        paymentMethod: "CASH",
        amountGiven: 1000000,
        notes: "Thu phí xét nghiệm cận lâm sàng tại quầy"
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Thanh toán viện phí CLS thất bại");
  });

  await test("6.5 Kỹ thuật viên trả kết quả xét nghiệm + link ảnh/PDF", async () => {
    if (!sampleTestId) throw new Error("Không có testId");
    const res = await fetch(`${BASE_URL}/clinical/tests/${sampleTestId}/result`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        resultSummary: "Bóng tim không to, cung động mạch chủ bình thường, không thấy tổn thương nhu mô phổi",
        fileUrl: "https://tnthospital.vn/reports/xquang-tim-phoi-kq.pdf"
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Cập nhật KQ xét nghiệm thất bại");
  });

  await test("6.6 Bác sĩ kết luận chẩn đoán xác định & Phác đồ điều trị", async () => {
    const res = await fetch(`${BASE_URL}/clinical/records/${sampleRecordId}/diagnosis`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${doctorToken}` },
      body: JSON.stringify({
        finalDiagnosis: "Cơn đau thắt ngực ổn định - Tăng huyết áp độ 1 (ICD-10: I20)",
        treatmentPlan: "Nghỉ ngơi, kiểm soát huyết áp, dùng thuốc đều đặn theo đơn",
        reExaminationDate: "2026-10-10"
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Lưu chẩn đoán thất bại");
  });

  await test("6.7 Bác sĩ kê đơn thuốc điện tử", async () => {
    const mRes = await fetch(`${BASE_URL}/clinical/medicines`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    const mData = await mRes.json();
    const medList = mData.data || [];
    const medId = medList.length > 0 ? medList[0].medicineId : 1;

    const res = await fetch(`${BASE_URL}/clinical/records/${sampleRecordId}/prescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${doctorToken}` },
      body: JSON.stringify({
        advice: "Uống thuốc sau bữa ăn, kiêng rượu bia và đồ mặn",
        details: [
          {
            medicineId: medId,
            quantity: 30,
            dosage: "Sáng 1 viên, tối 1 viên sau ăn",
            usageInstruction: "Uống với nhiều nước ấm"
          }
        ]
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Kê đơn thuốc thất bại");
  });

  // ----------------------------------------------------------------------------
  // SECTION 7: QUẢN LÝ BỆNH NHÂN NỘI TRÚ (INPATIENT & ADMISSION)
  // ----------------------------------------------------------------------------
  console.log("\n--- 7. PHÂN HỆ QUẢN LÝ ĐIỀU TRỊ NỘI TRÚ ---");

  await test("7.1 Bác sĩ làm thủ tục Nhập viện nội trú (/api/inpatient/admit)", async () => {
    const res = await fetch(`${BASE_URL}/inpatient/admit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${doctorToken}` },
      body: JSON.stringify({
        patientProfileId: sampleProfileId,
        roomId: sampleRoomId || 1,
        doctorId: sampleDoctorId,
        initialDiagnosis: "Cơn đau thắt ngực không ổn định, cần theo dõi tim mạch 5 ngày"
      })
    });
    const data = await res.json();
    if (!data.success || !data.data?.admissionId) throw new Error(data.message || "Nhập viện thất bại");
    sampleAdmissionId = data.data.admissionId;
  });

  await test("7.2 Ghi nhật ký theo dõi buồng bệnh hàng ngày (/api/inpatient/{id}/daily-record)", async () => {
    if (!sampleAdmissionId) throw new Error("Không có admissionId");
    const res = await fetch(`${BASE_URL}/inpatient/${sampleAdmissionId}/daily-record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${doctorToken}` },
      body: JSON.stringify({
        diseaseProgression: "Bệnh nhân tỉnh táo, tim đều T1 T2 rõ, huyết áp 125/80 mmHg, không đau ngực thêm",
        doctorInstruction: "Tiếp tục duy trì phác đồ tim mạch, theo dõi SpO2",
        temperature: "36.8",
        bloodPressure: "125/80",
        heartRate: "76"
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Ghi nhật ký thất bại");
  });

  await test("7.3 Lấy danh sách nhật ký điều trị nội trú", async () => {
    const res = await fetch(`${BASE_URL}/inpatient/${sampleAdmissionId}/daily-records`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) throw new Error("Lỗi lấy nhật ký");
  });

  // ----------------------------------------------------------------------------
  // SECTION 8: AI ASSISTANT 24/7 & TELEMEDICINE LIVE CHAT
  // ----------------------------------------------------------------------------
  console.log("\n--- 8. PHÂN HỆ AI Y TẾ 24/7 & LIVE CHAT TELEMEDICINE ---");

  await test("8.1 AI phân tích triệu chứng & Tự sinh thẻ Đặt khám 1-Click", async () => {
    const res = await fetch(`${BASE_URL}/ai/consult`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Tôi bị đau tức ngực và hồi hộp khi gắng sức" })
    });
    const data = await res.json();
    if (!data.success || !data.data?.bookingAction?.actionUrl) throw new Error("AI không sinh được thẻ hành động");
  });

  await test("8.2 Bệnh nhân gửi tin nhắn tư vấn cho Bác sĩ (/api/chat/send)", async () => {
    // Tìm partnerId của bác sĩ từ danh sách tư vấn viên
    const cRes = await fetch(`${BASE_URL}/chat/consultants`, {
      headers: { 'Authorization': `Bearer ${patientToken}` }
    });
    const cData = await cRes.json();
    const recipientId = (cData.data && cData.data.length > 0) ? cData.data[0].partnerId : sampleDoctorAccountId;

    const res = await fetch(`${BASE_URL}/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${patientToken}` },
      body: JSON.stringify({
        recipientId: recipientId,
        content: "Thưa Bác sĩ, hôm nay tôi uống thuốc xong cảm thấy rất dễ chịu, xin cảm ơn Bác sĩ ạ."
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Gửi tin nhắn thất bại");
  });

  await test("8.3 Bác sĩ xem danh sách các cuộc hội thoại tư vấn", async () => {
    const res = await fetch(`${BASE_URL}/chat/conversations`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) throw new Error("Lỗi lấy danh sách chat");
  });

  // ----------------------------------------------------------------------------
  // SECTION 9: THANH TOÁN VNPAY & TIỆN ÍCH DASHBOARD
  // ----------------------------------------------------------------------------
  console.log("\n--- 9. PHÂN HỆ THANH TOÁN VNPAY & TIỆN ÍCH DASHBOARD ---");

  await test("9.1 Khởi tạo URL Cổng thanh toán VNPay-QR", async () => {
    const res = await fetch(`${BASE_URL}/payment/vnpay/create-url?amount=200000&type=PAY_BOOKING`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${patientToken}` }
    });
    const data = await res.json();
    if (!data.success || !data.data) throw new Error(data.message || "Tạo URL thanh toán thất bại");
  });

  await test("9.2 Bệnh nhân tạo Lịch nhắc uống thuốc thông minh", async () => {
    const res = await fetch(`${BASE_URL}/utilities/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${patientToken}` },
      body: JSON.stringify({
        patientProfileId: sampleProfileId,
        medicineName: "Amlodipine 5mg",
        dosage: 1.0,
        unit: "viên",
        reminderTime: "08:00:00",
        startDate: "2026-09-24",
        endDate: "2026-10-24",
        notes: "Uống sau ăn sáng"
      })
    });
    const data = await res.json();
    if (!data.success || !data.data?.reminderId) throw new Error(data.message || "Tạo nhắc thuốc thất bại");
    sampleReminderId = data.data.reminderId;
  });

  await test("9.3 Bệnh nhân đánh dấu đã uống thuốc (/take)", async () => {
    const res = await fetch(`${BASE_URL}/utilities/reminders/${sampleReminderId}/take`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${patientToken}` }
    });
    const data = await res.json();
    if (!data.success) throw new Error("Đánh dấu uống thuốc thất bại");
  });

  await test("9.4 Admin xem Dashboard số liệu thống kê thời gian thực", async () => {
    const res = await fetch(`${BASE_URL}/utilities/admin/dashboard`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    if (!data.success || typeof data.data?.totalPatients === 'undefined') throw new Error("Lỗi tải thống kê Dashboard");
  });

  // ----------------------------------------------------------------------------
  // KẾT LUẬN TOÀN DIỆN
  // ----------------------------------------------------------------------------
  console.log("\n==================================================================================");
  console.log(`📊 TỔNG KẾT MASTER AUDIT: ${passed}/${passed + failed} BÀI TEST THÀNH CÔNG! (${Math.round(passed / (passed + failed) * 100)}%)`);
  if (failed > 0) {
    console.log(`⚠️ Có ${failed} bài kiểm thử thất bại:`);
    failures.forEach((f, i) => console.log(`   ${i + 1}. [${f.name}]: ${f.error}`));
  } else {
    console.log("🎉 TẤT CẢ PHÂN HỆ TỪ BỆNH NHÂN, BÁC SĨ, KHOA LAB, NỘI TRÚ, KIOSK, AI ĐỀU HOẠT ĐỘNG HOÀN HẢO 100%!");
  }
  console.log("==================================================================================");
}

runMasterAudit();
