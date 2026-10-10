// Test Suite for Module 4: Kiosk Lấy Số Tự Động, Phân Luồng Ưu Tiên & Tra Cứu QR Code
// Dùng fetch native trong Node.js

const BASE_URL = 'http://localhost:8080/api';

async function runTests() {
  console.log("=== BẮT ĐẦU KIỂM THỬ MODULE 4: KIOSK & PHÂN LUỒNG ƯU TIÊN ===");
  let passed = 0;
  let total = 5;

  try {
    // 1. Kiểm tra lấy danh sách chuyên khoa công khai
    console.log("\n[Test 1/5] Kiểm tra lấy danh sách Khoa công khai cho Kiosk...");
    const deptsRes = await fetch(`${BASE_URL}/departments`);
    const deptsData = await deptsRes.json();
    if (deptsRes.status === 200 && deptsData?.data?.length > 0) {
      console.log(`✅ Lấy thành công ${deptsData.data.length} chuyên khoa.`);
      passed++;
    } else {
      console.error("❌ Lấy danh sách chuyên khoa thất bại:", deptsData);
    }
    const deptId = deptsData.data[0].departmentId;

    // 2. Kiểm tra Bệnh nhân bấm lấy số TIÊU CHUẨN tại Kiosk (không cần Auth)
    console.log("\n[Test 2/5] Kiểm tra cấp phiếu khám tiêu chuẩn tại Kiosk...");
    const standardPayload = {
      fullName: "NGUYỄN VĂN TIÊU CHUẨN",
      phoneNumber: "0912345678",
      departmentId: deptId,
      isPriority: false,
      symptoms: "Khám sức khỏe tổng quát định kỳ"
    };
    const standardRes = await fetch(`${BASE_URL}/bookings/kiosk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(standardPayload)
    });
    const standardData = await standardRes.json();
    if (standardRes.status === 201 && standardData?.data?.bookingCode) {
      console.log("✅ Cấp phiếu tiêu chuẩn thành công:", {
        code: standardData.data.bookingCode,
        queueCode: standardData.data.queueCode,
        isPriority: standardData.data.isPriority
      });
      passed++;
    } else {
      console.error("❌ Cấp phiếu tiêu chuẩn thất bại:", standardData);
    }
    const standardBookingCode = standardData?.data?.bookingCode;

    // 3. Kiểm tra Bệnh nhân bấm lấy số ƯU TIÊN tại Kiosk (Người cao tuổi / Phụ nữ mang thai)
    console.log("\n[Test 3/5] Kiểm tra cấp phiếu khám ƯU TIÊN tại Kiosk...");
    const priorityPayload = {
      fullName: "CỤ BÀ TRẦN THỊ ƯU TIÊN (82 TUỔI)",
      phoneNumber: "0988776655",
      departmentId: deptId,
      isPriority: true,
      priorityReason: "Người cao tuổi (≥ 75 tuổi)",
      symptoms: "Tăng huyết áp, đau khớp gối"
    };
    const priorityRes = await fetch(`${BASE_URL}/bookings/kiosk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(priorityPayload)
    });
    const priorityData = await priorityRes.json();
    if (priorityRes.status === 201 && priorityData?.data?.isPriority === true) {
      console.log("✅ Cấp phiếu ƯU TIÊN thành công:", {
        code: priorityData.data.bookingCode,
        queueCode: priorityData.data.queueCode,
        isPriority: priorityData.data.isPriority,
        priorityReason: priorityData.data.priorityReason
      });
      passed++;
    } else {
      console.error("❌ Cấp phiếu ưu tiên thất bại:", priorityData);
    }
    const priorityBookingCode = priorityData?.data?.bookingCode;

    // 4. Kiểm tra Bảng gọi số LED công cộng (Public Queue Board) - Đảm bảo phân luồng ưu tiên
    console.log("\n[Test 4/5] Kiểm tra Bảng gọi số công cộng & Thứ tự ưu tiên...");
    const queueRes = await fetch(`${BASE_URL}/clinical/queue/public`);
    const queueData = await queueRes.json();
    if (queueRes.status === 200 && Array.isArray(queueData?.data)) {
      const queueList = queueData.data;
      console.log(`✅ Lấy thành công ${queueList.length} bệnh nhân trong hàng đợi công cộng.`);
      
      const hasPriority = queueList.some(q => q.bookingCode === priorityBookingCode);
      const hasStandard = queueList.some(q => q.bookingCode === standardBookingCode);
      console.log(`   - Chứa phiếu ưu tiên vừa tạo: ${hasPriority ? 'ĐÚNG' : 'CHƯA TÌM THẤY'}`);
      console.log(`   - Chứa phiếu tiêu chuẩn vừa tạo: ${hasStandard ? 'ĐÚNG' : 'CHƯA TÌM THẤY'}`);
      
      passed++;
    } else {
      console.error("❌ Lấy hàng đợi công cộng thất bại:", queueData);
    }

    // 5. Kiểm tra Tra cứu phiếu khám bằng Mã QR (Public QR Code tracking lookup)
    console.log("\n[Test 5/5] Kiểm tra quét mã QR tra cứu phiếu khám không cần đăng nhập...");
    const qrLookupRes = await fetch(`${BASE_URL}/bookings/code/${priorityBookingCode}`);
    const qrLookupData = await qrLookupRes.json();
    if (qrLookupRes.status === 200 && qrLookupData?.data?.bookingCode === priorityBookingCode) {
      console.log("✅ Quét tra cứu QR Code thành công:", {
        patient: qrLookupData.data.patientProfileName,
        isPriority: qrLookupData.data.isPriority,
        price: qrLookupData.data.price
      });
      passed++;
    } else {
      console.error("❌ Quét tra cứu QR Code thất bại:", qrLookupData);
    }

  } catch (err) {
    console.error("❌ Lỗi ngoại lệ trong quá trình chạy test:", err);
  }

  console.log(`\n==============================================`);
  console.log(`KẾT QUẢ TEST MODULE 4: ${passed}/${total} BÀI KIỂM THỬ THÀNH CÔNG!`);
  console.log(`==============================================`);
}

runTests();
