/**
 * TEST TẢI & CHỐNG RACE CONDITION ĐỒNG THỜI TRONG ĐẶT LỊCH KHÁM (PESSIMISTIC LOCKING)
 * Chạy bằng: node test_load_concurrency.js
 */

const BASE_URL = "http://localhost:8080/api";

async function runConcurrencyStressTest() {
  console.log("==========================================================================");
  console.log("⚡ BẮT ĐẦU KIỂM THỬ TẢI & KHẢ NĂNG CHỐNG RACE CONDITION (50 REQUESTS ĐỒNG THỜI)");
  console.log("==========================================================================");

  // 1. Admin login & Setup
  const adminRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: "0937050537", password: "taizz0537" })
  });
  const adminData = await adminRes.json();
  const adminToken = adminData.data.accessToken;

  // 2. Tạo bác sĩ mới
  const docPhone = "097" + Math.floor(1000000 + Math.random() * 9000000);
  const docRes = await fetch(`${BASE_URL}/admin/doctors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({
      fullName: "BS. Concurrency Test",
      phoneNumber: docPhone,
      email: `doc_${docPhone}@tnt.vn`,
      password: "password123",
      departmentId: 1,
      degree: "BSCKI",
      consultationFee: 200000
    })
  });
  const docData = await docRes.json();
  const doctorId = docData.data?.doctorId;
  // 2.5. Tạo phòng khám riêng cho test tải đồng thời
  const roomRes = await fetch(`${BASE_URL}/departments/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({
      departmentId: 1,
      roomName: "P-LOAD-" + Math.floor(100 + Math.random() * 900),
      roomType: "EXAMINATION_ROOM",
      capacity: 10
    })
  });
  const roomJson = await roomRes.json();
  const testRoomId = roomJson.data?.roomId || 1;

  // 3. Tạo ca trực hôm nay
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const schedRes = await fetch(`${BASE_URL}/schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({
      doctorId: doctorId,
      roomId: testRoomId,
      scheduleDate: todayStr,
      session: "AFTERNOON"
    })
  });
  const schedData = await schedRes.json();
  if (!schedData.success || !schedData.data?.timeSlots) {
    throw new Error("Lỗi tạo ca trực: " + (schedData.message || JSON.stringify(schedData)));
  }
  const timeSlotId = schedData.data.timeSlots[0].timeSlotId;
  const maxCapacity = schedData.data.timeSlots[0].maxCapacity;

  console.log(`📌 Khung giờ thử nghiệm: ID=${timeSlotId}, Giới hạn tối đa (maxCapacity)=${maxCapacity} lượt.`);

  // 4. Tạo bệnh nhân & hồ sơ
  const patPhone = "098" + Math.floor(1000000 + Math.random() * 9000000);
  const patRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: "Bệnh Nhân Thử Nghiệm Tải",
      phoneNumber: patPhone,
      email: `pat_${patPhone}@gmail.com`,
      password: "password123",
      role: "ROLE_PATIENT"
    })
  });
  const patData = await patRes.json();
  const patToken = patData.data.accessToken;

  const profRes = await fetch(`${BASE_URL}/patient-profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${patToken}` },
    body: JSON.stringify({
      fullName: "Bệnh Nhân Thử Nghiệm Tải",
      relationship: "Bản thân",
      phoneNumber: patPhone,
      dateOfBirth: "1995-05-20",
      gender: "MALE",
      address: "Hà Nội"
    })
  });
  const profData = await profRes.json();
  const profileId = profData.data.patientProfileId;

  // 5. Bắn đồng thời 50 requests đặt lịch
  console.log(`\n🚀 Bắn đồng thời 50 requests Đặt khám vào cùng 1 TimeSlot...`);
  const startTime = Date.now();

  const requests = Array.from({ length: 50 }).map(async (_, idx) => {
    try {
      const res = await fetch(`${BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${patToken}` },
        body: JSON.stringify({
          patientProfileId: profileId,
          timeSlotId: timeSlotId,
          symptoms: `Triệu chứng tải #${idx + 1}`
        })
      });
      const data = await res.json();
      return { status: res.status, success: data.success, message: data.message };
    } catch (err) {
      return { status: 500, success: false, message: err.message };
    }
  });

  const results = await Promise.all(requests);
  const duration = Date.now() - startTime;

  const successCount = results.filter(r => r.success).length;
  const rejectedCount = results.filter(r => !r.success && r.status === 400).length;
  const errorCount = results.filter(r => r.status >= 500).length;

  console.log(`\n⏱️ Hoàn thành 50 requests trong: ${duration}ms (Trung bình ${(duration / 50).toFixed(1)}ms/req)`);
  console.log(`📊 Kết quả:`);
  console.log(`   - Số lượt đặt khám thành công: ${successCount} (Giới hạn tối đa: ${maxCapacity})`);
  console.log(`   - Số lượt bị từ chối do hết chỗ (HTTP 400): ${rejectedCount}`);
  console.log(`   - Số lượt lỗi máy chủ (HTTP 500): ${errorCount}`);

  if (successCount === maxCapacity && errorCount === 0) {
    console.log(`\n✅ [PASSED] PESSIMISTIC LOCKING HOẠT ĐỘNG HOÀN HẢO! Không xảy ra Over-booking (Đúng ${maxCapacity}/${maxCapacity} suất).`);
  } else if (successCount <= maxCapacity && errorCount === 0) {
    console.log(`\n✅ [PASSED] Kiểm soát concurrency an toàn (${successCount} <= ${maxCapacity}).`);
  } else {
    console.log(`\n❌ [FAILED] Có lỗi concurrency: Số đặt thành công ${successCount} vượt quá capacity ${maxCapacity}!`);
  }
  console.log("==========================================================================\n");
}

runConcurrencyStressTest();
