// Test Suite for Module 5: AI Trợ Lý Y Tế 24/7 & Smart AI Triage Booking
const BASE_URL = 'http://localhost:8080/api';

async function runTests() {
  console.log("==========================================================================");
  console.log("🤖 BẮT ĐẦU KIỂM THỬ MODULE 5: AI TRỢ LÝ Y TẾ 24/7 & SMART TRIAGE BOOKING");
  console.log("==========================================================================\n");

  let passed = 0;
  let total = 5;

  try {
    // 1. Kiểm tra lấy danh sách câu hỏi mẫu gợi ý nhanh (Quick Prompts)
    console.log("[Test 1/5] Kiểm tra lấy danh sách câu hỏi gợi ý nhanh (/api/ai/prompts)...");
    const promptsRes = await fetch(`${BASE_URL}/ai/prompts`);
    const promptsData = await promptsRes.json();
    if (promptsRes.status === 200 && Array.isArray(promptsData?.data) && promptsData.data.length > 0) {
      console.log(`✅ Lấy thành công ${promptsData.data.length} câu hỏi mẫu:`);
      promptsData.data.slice(0, 3).forEach(p => console.log(`   - "${p}"`));
      passed++;
    } else {
      console.error("❌ Lấy danh sách câu hỏi mẫu thất bại:", promptsData);
    }

    // 2. Kiểm tra tư vấn triệu chứng Tim Mạch & Gợi ý Thẻ Đặt Khám 1-Click
    console.log("\n[Test 2/5] Kiểm tra AI phân tích triệu chứng Tim Mạch & Gợi ý Đặt Khám...");
    const cardioRes = await fetch(`${BASE_URL}/ai/consult`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "Tôi bị đau tức ngực trái và cảm giác hồi hộp, khó thở khi gắng sức"
      })
    });
    const cardioData = await cardioRes.json();
    if (cardioRes.status === 200 && cardioData?.data?.bookingAction) {
      const d = cardioData.data;
      console.log("✅ AI phân tích triệu chứng Tim Mạch thành công:");
      console.log(`   - Mức độ: ${d.triageLevel}`);
      console.log(`   - Khoa đề xuất: ${d.suggestedDepartment?.name}`);
      console.log(`   - Nút hành động: ${d.bookingAction.buttonLabel}`);
      console.log(`   - URL Đặt khám: ${d.bookingAction.actionUrl}`);
      passed++;
    } else {
      console.error("❌ AI phân tích Tim Mạch thất bại:", cardioData);
    }

    // 3. Kiểm tra phát hiện dấu hiệu CẤP CỨU NGUY CẤP (Đột quỵ / Nhồi máu cơ tim)
    console.log("\n[Test 3/5] Kiểm tra AI phát hiện dấu hiệu CẤP CỨU (Đột quỵ / FAST)...");
    const emergencyRes = await fetch(`${BASE_URL}/ai/consult`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "Người nhà tôi bị méo miệng và liệt nửa người đột ngột, nói ngọng"
      })
    });
    const emergencyData = await emergencyRes.json();
    if (emergencyRes.status === 200 && emergencyData?.data?.triageLevel === "EMERGENCY" && emergencyData?.data?.emergencyAlert) {
      console.log("✅ AI nhận diện chính xác trạng thái CẤP CỨU NGUY CẤP:");
      console.log(`   - Cảnh báo: ${emergencyData.data.emergencyAlert.substring(0, 100)}...`);
      passed++;
    } else {
      console.error("❌ AI nhận diện Cấp cứu thất bại:", emergencyData);
    }

    // 4. Kiểm tra tư vấn triệu chứng Nhi khoa (Trẻ em sốt ho)
    console.log("\n[Test 4/5] Kiểm tra AI phân tích triệu chứng Nhi Khoa...");
    const pediRes = await fetch(`${BASE_URL}/ai/consult`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "Bé nhà em 2 tuổi bị sốt 39 độ và ho có đờm nhiều ngày chưa dứt"
      })
    });
    const pediData = await pediRes.json();
    if (pediRes.status === 200 && pediData?.data?.suggestedDepartment) {
      console.log("✅ AI phân tích triệu chứng Nhi khoa thành công:");
      console.log(`   - Khoa đề xuất: ${pediData.data.suggestedDepartment.name}`);
      console.log(`   - Có trích dẫn y khoa: ${pediData.data.medicalCitations?.length > 0 ? 'CÓ' : 'KHÔNG'}`);
      passed++;
    } else {
      console.error("❌ AI phân tích Nhi khoa thất bại:", pediData);
    }

    // 5. Kiểm tra tư vấn Cơ Xương Khớp & Nguồn tài liệu tham khảo chính thống
    console.log("\n[Test 5/5] Kiểm tra AI phân tích triệu chứng Cơ Xương Khớp & Trích dẫn...");
    const orthoRes = await fetch(`${BASE_URL}/ai/consult`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "Tôi bị đau khớp gối kêu lục cục khi đi lại và leo cầu thang"
      })
    });
    const orthoData = await orthoRes.json();
    if (orthoRes.status === 200 && orthoData?.data?.medicalCitations?.length > 0) {
      console.log("✅ AI phân tích Cơ Xương Khớp & trả về tài liệu tham khảo:");
      orthoData.data.medicalCitations.forEach(c => console.log(`   - [${c.source}] ${c.title}`));
      passed++;
    } else {
      console.error("❌ AI phân tích Cơ Xương Khớp thất bại:", orthoData);
    }

  } catch (err) {
    console.error("❌ Lỗi ngoại lệ trong quá trình chạy test:", err);
  }

  console.log(`\n==========================================================================`);
  console.log(`📊 KẾT QUẢ TEST MODULE 5: ${passed}/${total} BÀI KIỂM THỬ THÀNH CÔNG!`);
  console.log(`==========================================================================`);
}

runTests();
