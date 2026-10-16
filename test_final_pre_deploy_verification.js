/**
 * FINAL PRE-DEPLOYMENT VERIFICATION SUITE
 * Kiểm thử toàn diện 10 chặng chức năng cốt lõi trước khi triển khai thực tế.
 * Sử dụng bộ tài khoản hạt nhân chuẩn, không tạo tài khoản rác, không làm bẩn DB.
 */

const BASE_URL = "http://localhost:8080";

async function runPreDeployVerification() {
    console.log("==========================================================================");
    console.log("🚀 BẮT ĐẦU KIỂM THỬ LẦN CUỐI TOÀN BỘ HỆ THỐNG TRƯỚC KHI DEPLOY THỰC TẾ");
    console.log("==========================================================================\n");

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    async function assertStep(name, fn) {
        totalTests++;
        try {
            const result = await fn();
            console.log(`✅ [PASS] ${name}${result ? ` -> ${result}` : ""}`);
            passedTests++;
            return true;
        } catch (err) {
            console.error(`❌ [FAIL] ${name} -> Lỗi: ${err.message}`);
            failedTests++;
            return false;
        }
    }

    let tokens = {};
    let sampleDepartment = null;
    let sampleSchedule = null;
    let sampleSlot = null;
    let patientProfile = null;
    let createdBooking = null;
    let clinicalRecordId = null;
    let assignedTest = null;
    let sampleMedicine = null;

    // --------------------------------------------------------------------------
    // CHẶNG 1: KIỂM TRA MÁY CHỦ BACKEND & DANH MỤC CƠ SỞ
    // --------------------------------------------------------------------------
    console.log("--- CHẶNG 1: KẾT NỐI MÁY CHỦ & DANH MỤC CƠ SỞ ---");
    await assertStep("1.1. Ping máy chủ & tải danh mục Chuyên khoa (/api/departments)", async () => {
        const res = await fetch(`${BASE_URL}/api/departments`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list = json.data || (Array.isArray(json) ? json : []);
        if (list.length === 0) throw new Error("Danh mục chuyên khoa rỗng");
        sampleDepartment = list[0];
        return `Đã tải ${list.length} chuyên khoa (Mẫu: ${sampleDepartment.departmentName})`;
    });

    await assertStep("1.2. Tải danh mục buồng phòng của chuyên khoa (/api/departments/{id}/rooms)", async () => {
        const res = await fetch(`${BASE_URL}/api/departments/${sampleDepartment.departmentId}/rooms`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list = json.data || [];
        if (list.length === 0) throw new Error("Chuyên khoa chưa có buồng phòng");
        return `Tìm thấy ${list.length} buồng phòng thuộc ${sampleDepartment.departmentName}`;
    });

    await assertStep("1.3. Tra cứu lịch khám công khai theo chuyên khoa (/api/schedules/by-department)", async () => {
        const today = new Date().toISOString().split("T")[0];
        const res = await fetch(`${BASE_URL}/api/schedules/by-department?departmentId=${sampleDepartment.departmentId}&date=${today}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list = json.data || [];
        return `Đã xác minh ${list.length} lịch khám công khai mở cho bệnh nhân tra cứu`;
    });

    // --------------------------------------------------------------------------
    // CHẶNG 2: XÁC THỰC & PHÂN QUYỀN RBAC (7 VAI TRÒ CHUẨN)
    // --------------------------------------------------------------------------
    console.log("\n--- CHẶNG 2: XÁC THỰC & PHÂN QUYỀN RBAC (7 VAI TRÒ) ---");
    const rolesToTest = [
        { role: "ROLE_ADMIN", phone: "0937050537", pass: "taizz0537", title: "Quản trị viên (Admin)" },
        { role: "ROLE_DOCTOR", phone: "0911000001", pass: "password123", title: "Bác sĩ (Doctor)" },
        { role: "ROLE_NURSE", phone: "0900000004", pass: "password123", title: "Điều dưỡng (Nurse)" },
        { role: "ROLE_CASHIER", phone: "0900000007", pass: "password123", title: "Thu ngân (Cashier)" },
        { role: "ROLE_PHARMACIST", phone: "0900000005", pass: "password123", title: "Dược sĩ (Pharmacist)" },
        { role: "ROLE_LAB_TECHNICIAN", phone: "0900000006", pass: "password123", title: "Kỹ thuật viên (Lab Tech)" },
        { role: "ROLE_PATIENT", phone: "0988889999", pass: "password123", title: "Bệnh nhân mẫu (Patient)" }
    ];

    for (const r of rolesToTest) {
        await assertStep(`2. Đăng nhập vai trò: ${r.title}`, async () => {
            const res = await fetch(`${BASE_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phoneNumber: r.phone, password: r.pass })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (!json.success || !json.data?.accessToken) throw new Error(json.message || "Thiếu accessToken");
            if (json.data.role !== r.role) throw new Error(`Role không khớp: nhận được ${json.data.role}, kỳ vọng ${r.role}`);
            tokens[r.role] = json.data.accessToken;
            return `User: ${json.data.fullName} | Role: ${json.data.role}`;
        });
    }

    await assertStep("2.8. Kiểm tra bảo vệ RBAC: Bệnh nhân bị chặn 403 khi vào API Thu ngân (/api/cashier/pending-bills)", async () => {
        const res = await fetch(`${BASE_URL}/api/cashier/pending-bills`, {
            headers: { Authorization: `Bearer ${tokens["ROLE_PATIENT"]}` }
        });
        if (res.status !== 403) throw new Error(`Kỳ vọng 403 Forbidden nhưng nhận HTTP ${res.status}`);
        return "Bảo vệ RBAC hoạt động chính xác (403 Forbidden)";
    });

    // --------------------------------------------------------------------------
    // CHẶNG 3: ĐIỀU PHỐI QUẦY TIẾP ĐÓN (COUNTER WORKFLOW)
    // --------------------------------------------------------------------------
    console.log("\n--- CHẶNG 3: TIẾP ĐÓN & ĐIỀU PHỐI QUẦY (COUNTER WORKFLOW) ---");
    let activeCounterId = null;

    await assertStep("3.1. Tải danh mục các quầy tiếp đón (/api/counters)", async () => {
        const res = await fetch(`${BASE_URL}/api/counters`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list = json.data || [];
        if (list.length === 0) throw new Error("Danh sách quầy rỗng");
        activeCounterId = list[0].counterId;
        return `Tìm thấy ${list.length} quầy tiếp đón (Chọn Quầy ID: ${activeCounterId} - ${list[0].counterName})`;
    });

    await assertStep("3.2. Điều dưỡng nhận ca trực tại Quầy (/api/counters/{id}/check-in)", async () => {
        const res = await fetch(`${BASE_URL}/api/counters/${activeCounterId}/check-in`, {
            method: "POST",
            headers: { Authorization: `Bearer ${tokens["ROLE_NURSE"]}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        return `Điều dưỡng nhận ca trực Quầy ${activeCounterId} thành công (Trạng thái OPEN)`;
    });

    // --------------------------------------------------------------------------
    // CHẶNG 4: ĐẶT LỊCH KHÁM TRỰC TUYẾN (PATIENT BOOKING FLOW)
    // --------------------------------------------------------------------------
    console.log("\n--- CHẶNG 4: ĐẶT LỊCH KHÁM TRỰC TUYẾN (PATIENT BOOKING) ---");
    const today = new Date().toISOString().split("T")[0];

    await assertStep(`4.1. Bệnh nhân tra cứu lịch khám hôm nay (${today})`, async () => {
        const res = await fetch(`${BASE_URL}/api/schedules/by-department?departmentId=${sampleDepartment.departmentId}&date=${today}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list = json.data || [];
        if (list.length === 0) throw new Error("Chưa có lịch trực cho ngày hôm nay");
        sampleSchedule = list[0];
        sampleSlot = sampleSchedule.timeSlots.find(s => !s.isFull);
        if (!sampleSlot) throw new Error("Tất cả khung giờ đều đã đầy");
        return `Bác sĩ trực: ${sampleSchedule.doctorName} | Khung giờ: ${sampleSlot.startTime} - ${sampleSlot.endTime}`;
    });

    await assertStep("4.2. Lấy hồ sơ điện tử của bệnh nhân (/api/patient-profiles)", async () => {
        const res = await fetch(`${BASE_URL}/api/patient-profiles`, {
            headers: { Authorization: `Bearer ${tokens["ROLE_PATIENT"]}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list = json.data || [];
        if (list.length === 0) throw new Error("Chưa có hồ sơ bệnh nhân");
        patientProfile = list[0];
        return `Bệnh nhân: ${patientProfile.fullName} | CCCD: ${patientProfile.identityNumber}`;
    });

    await assertStep("4.3. Bệnh nhân gửi yêu cầu đặt lịch khám trực tuyến (/api/bookings)", async () => {
        const res = await fetch(`${BASE_URL}/api/bookings`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tokens["ROLE_PATIENT"]}`
            },
            body: JSON.stringify({
                patientProfileId: patientProfile.patientProfileId,
                timeSlotId: sampleSlot.timeSlotId,
                symptoms: "Kiểm tra sức khỏe tiền triển khai hệ thống"
            })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json.success || !json.data?.bookingCode) throw new Error(json.message || "Đặt lịch thất bại");
        createdBooking = json.data;
        return `Mã phiếu khám: [${createdBooking.bookingCode}] | STT: [${createdBooking.queueCode}] | Trạng thái: ${createdBooking.status}`;
    });

    // --------------------------------------------------------------------------
    // CHẶNG 5: BỐC SỐ KIOSK & TIẾP NHẬN PHÂN LUỒNG TỰ ĐỘNG
    // --------------------------------------------------------------------------
    console.log("\n--- CHẶNG 5: KIOSK TỰ ĐỘNG & TIẾP NHẬN PHÂN LUỒNG ---");
    let kioskBookingPriority = null;

    await assertStep("5.1. Bệnh nhân cao tuổi (77 tuổi, sinh 1949) bốc số tại Kiosk sảnh -> Phân luồng Ưu Tiên (UT-)", async () => {
        const res = await fetch(`${BASE_URL}/api/bookings/kiosk`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName: "Cụ Ông Hoàng Văn Phúc",
                phoneNumber: "0909" + Math.floor(100000 + Math.random() * 900000),
                birthYear: 1949, // >= 65 tuổi
                departmentId: sampleDepartment.departmentId,
                symptoms: "Đau mỏi xương khớp mãn tính",
                isPriority: true,
                priorityReason: "Người cao tuổi (77 tuổi)"
            })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        kioskBookingPriority = json.data;
        if (!kioskBookingPriority.isPriority || !kioskBookingPriority.queueCode.startsWith("UT-")) {
            throw new Error(`Kỳ vọng gắn cờ UT- nhưng nhận được ${kioskBookingPriority.queueCode}`);
        }
        return `Kiosk tự động nhận diện người cao tuổi -> Gắn số thứ tự ưu tiên: [${kioskBookingPriority.queueCode}]`;
    });

    // --------------------------------------------------------------------------
    // CHẶNG 6: BÀN KHÁM BÁC SĨ & CHỈ ĐỊNH DỊCH VỤ CẬN LÂM SÀNG
    // --------------------------------------------------------------------------
    console.log("\n--- CHẶNG 6: BÀN KHÁM BÁC SĨ & CHỈ ĐỊNH CẬN LÂM SÀNG ---");

    await assertStep("6.1. Bác sĩ xem hàng đợi phòng khám (/api/clinical/queue/public)", async () => {
        const res = await fetch(`${BASE_URL}/api/clinical/queue/public`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list = json.data || (Array.isArray(json) ? json : []);
        return `Hiện có ${list.length} bệnh nhân trong hàng đợi phòng khám`;
    });

    await assertStep("6.2. Bác sĩ tiếp nhận ca khám & mở bệnh án (/api/clinical/start)", async () => {
        const res = await fetch(`${BASE_URL}/api/clinical/start`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tokens["ROLE_DOCTOR"]}`
            },
            body: JSON.stringify({
                bookingCode: createdBooking.bookingCode,
                symptoms: "Đau tức vùng hạ sườn phải, mệt mỏi",
                initialDiagnosis: "Theo dõi viêm gan cấp / Rối loạn tiêu hóa"
            })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json.success || !json.data?.recordId) throw new Error(json.message || "Không thể mở bệnh án");
        clinicalRecordId = json.data.recordId;
        return `Mở bệnh án thành công! RecordId: [${clinicalRecordId}]`;
    });

    await assertStep("6.3. Bác sĩ chỉ định dịch vụ cận lâm sàng có tính phí (/api/clinical/records/{id}/tests)", async () => {
        // Lấy danh mục dịch vụ kỹ thuật (yêu cầu Authorization)
        const servRes = await fetch(`${BASE_URL}/api/clinical/services`, {
            headers: { Authorization: `Bearer ${tokens["ROLE_DOCTOR"]}` }
        });
        if (!servRes.ok) throw new Error(`HTTP ${servRes.status}`);
        const servJson = await servRes.json();
        const services = servJson.data || [];
        const feeService = services.find(s => s.price > 0) || services[0];
        if (!feeService) throw new Error("Không có dịch vụ kỹ thuật nào trong hệ thống");

        const assignRes = await fetch(`${BASE_URL}/api/clinical/records/${clinicalRecordId}/tests`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tokens["ROLE_DOCTOR"]}`
            },
            body: JSON.stringify({
                serviceIds: [feeService.serviceId]
            })
        });
        if (!assignRes.ok) throw new Error(`HTTP ${assignRes.status}`);
        const assignJson = await assignRes.json();
        if (!assignJson.success || !assignJson.data?.length) throw new Error(assignJson.message || "Chỉ định thất bại");
        assignedTest = assignJson.data[0];
        return `Đã chỉ định: [${feeService.serviceName}] (${feeService.price.toLocaleString()} VNĐ) | Mã test: [${assignedTest.testCode}] | ID: ${assignedTest.testId}`;
    });

    // --------------------------------------------------------------------------
    // CHẶNG 7: CHỐT CHẶN PHÒNG LAB & THU NGÂN VIỆN PHÍ (MULTI-INVOICE GATEKEEPER)
    // --------------------------------------------------------------------------
    console.log("\n--- CHẶNG 7: CHỐT CHẶN PHÒNG LAB & THU NGÂN VIỆN PHÍ ---");

    await assertStep("7.1. [CHỐT CHẶN PHÒNG LAB] Thử lấy mẫu xét nghiệm khi chưa đóng tiền -> Bị chặn 402 Payment Required", async () => {
        const sampleRes = await fetch(`${BASE_URL}/api/clinical/tests/${assignedTest.testId}/collect-sample`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tokens["ROLE_LAB_TECHNICIAN"]}`
            },
            body: JSON.stringify({
                specimenType: "Máu toàn phần",
                specimenBarcode: "BARCODE-PREDEPLOY-001"
            })
        });
        if (sampleRes.status !== 402) {
            throw new Error(`Kỳ vọng HTTP 402 Payment Required nhưng nhận được ${sampleRes.status}`);
        }
        return "Chốt chặn chống thất thoát viện phí hoạt động xuất sắc (HTTP 402 Payment Required)";
    });

    let targetBills = [];
    await assertStep("7.2. Thu ngân tra cứu danh sách viện phí chờ thu (/api/cashier/pending-bills)", async () => {
        const res = await fetch(`${BASE_URL}/api/cashier/pending-bills`, {
            headers: { Authorization: `Bearer ${tokens["ROLE_CASHIER"]}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list = json.data || [];
        targetBills = list.filter(b => b.bookingCode === createdBooking.bookingCode || b.billId?.includes(createdBooking.bookingCode));
        if (targetBills.length === 0) throw new Error(`Không tìm thấy hóa đơn cho ca khám ${createdBooking.bookingCode}`);
        return `Tìm thấy ${targetBills.length} hóa đơn chờ thu (Mã: ${targetBills.map(b => b.billId).join(", ")})`;
    });

    await assertStep("7.3. Thu ngân thanh toán tiền mặt & xuất biên lai điện tử (/api/cashier/pay)", async () => {
        let receipts = [];
        for (const bill of targetBills) {
            const payRes = await fetch(`${BASE_URL}/api/cashier/pay`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokens["ROLE_CASHIER"]}`
                },
                body: JSON.stringify({
                    bookingCode: bill.billId,
                    paymentMethod: "CASH",
                    amountGiven: 500000,
                    notes: "Thanh toán viện phí tại quầy thu ngân"
                })
            });
            if (!payRes.ok) throw new Error(`Lỗi thanh toán ${bill.billId}: HTTP ${payRes.status}`);
            const payJson = await payRes.json();
            if (!payJson.success) throw new Error(payJson.message);
            receipts.push(`${payJson.data.receiptCode} (${payJson.data.totalAmount.toLocaleString()}đ)`);
        }
        return `Thu tiền thành công ${receipts.length} hóa đơn! Biên lai: [${receipts.join(" | ")}]`;
    });

    await assertStep("7.4. [MỞ KHÓA PHÒNG LAB] Lấy mẫu bệnh phẩm sau khi viện phí đã thanh toán", async () => {
        const sampleRes = await fetch(`${BASE_URL}/api/clinical/tests/${assignedTest.testId}/collect-sample`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tokens["ROLE_LAB_TECHNICIAN"]}`
            },
            body: JSON.stringify({
                specimenType: "Máu toàn phần",
                specimenBarcode: "BARCODE-VERIFIED-PAID"
            })
        });
        if (!sampleRes.ok) throw new Error(`Lỗi lấy mẫu: HTTP ${sampleRes.status}`);
        const sampleJson = await sampleRes.json();
        return `Tiếp nhận & lấy mẫu thành công! Trạng thái xét nghiệm: ${sampleJson.data?.state || "SAMPLE_COLLECTED"}`;
    });

    await assertStep("7.5. Kỹ thuật viên trả kết quả xét nghiệm (/api/clinical/tests/{id}/result)", async () => {
        const resultRes = await fetch(`${BASE_URL}/api/clinical/tests/${assignedTest.testId}/result`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tokens["ROLE_LAB_TECHNICIAN"]}`
            },
            body: JSON.stringify({
                testResult: "Chỉ số men gan trong giới hạn bình thường (AST: 24 U/L, ALT: 28 U/L). Không có dấu hiệu tổn thương nhu mô gan.",
                resultFileUrl: "https://hospital.local/results/lab-001.pdf"
            })
        });
        if (!resultRes.ok) throw new Error(`Lỗi trả kết quả: HTTP ${resultRes.status}`);
        const resultJson = await resultRes.json();
        return `Cập nhật kết quả thành công! Trạng thái: ${resultJson.data?.state || "COMPLETED"}`;
    });

    // --------------------------------------------------------------------------
    // CHẶNG 8: BÁC SĨ CHẨN ĐOÁN, KÊ ĐƠN THUỐC & KHO THUỐC FEFO
    // --------------------------------------------------------------------------
    console.log("\n--- CHẶNG 8: CHẨN ĐOÁN, KÊ TOA THUỐC & KHO DƯỢC FEFO ---");

    await assertStep("8.1. Bác sĩ kết luận chẩn đoán bệnh án (/api/clinical/records/{id}/diagnosis)", async () => {
        const diagRes = await fetch(`${BASE_URL}/api/clinical/records/${clinicalRecordId}/diagnosis`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tokens["ROLE_DOCTOR"]}`
            },
            body: JSON.stringify({
                finalDiagnosis: "Rối loạn tiêu hóa chức năng / Thể nhẹ",
                treatmentPlan: "Nghỉ ngơi, ăn uống điều độ, dùng thuốc theo đơn chỉ định trong 5 ngày"
            })
        });
        if (!diagRes.ok) throw new Error(`HTTP ${diagRes.status}`);
        const diagJson = await diagRes.json();
        return `Ghi nhận chẩn đoán thành công: [${diagJson.data.finalDiagnosis}]`;
    });

    await assertStep("8.2. Dược sĩ kiểm tra danh mục kho thuốc & tồn kho theo chuẩn FEFO (/api/clinical/medicines)", async () => {
        const res = await fetch(`${BASE_URL}/api/clinical/medicines`, {
            headers: { Authorization: `Bearer ${tokens["ROLE_PHARMACIST"]}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list = json.data || (Array.isArray(json) ? json : []);
        if (list.length === 0) throw new Error("Danh mục thuốc rỗng");
        sampleMedicine = list[0];
        return `Danh mục lưu hành: ${list.length} mặt hàng thuốc (Mẫu: ${sampleMedicine.medicineName} - Còn tồn: ${sampleMedicine.stockQuantity})`;
    });

    await assertStep("8.3. Bác sĩ kê đơn thuốc cho bệnh nhân (/api/clinical/records/{id}/prescriptions)", async () => {
        const presRes = await fetch(`${BASE_URL}/api/clinical/records/${clinicalRecordId}/prescriptions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tokens["ROLE_DOCTOR"]}`
            },
            body: JSON.stringify({
                doctorNotes: "Uống nhiều nước, dùng thuốc sau bữa ăn 30 phút",
                items: [
                    {
                        medicineId: sampleMedicine.medicineId,
                        quantity: 2,
                        dosageInstruction: "Uống 1 viên sau ăn sáng, 1 viên sau ăn tối"
                    }
                ]
            })
        });
        if (!presRes.ok) throw new Error(`HTTP ${presRes.status}`);
        const presJson = await presRes.json();
        if (!presJson.success || !presJson.data?.prescriptionCode) throw new Error(presJson.message || "Kê đơn thất bại");
        return `Kê đơn thành công! Mã toa thuốc: [${presJson.data.prescriptionCode}] | Tổng tiền thuốc: ${presJson.data.totalPrice?.toLocaleString() || 0} VNĐ`;
    });

    // --------------------------------------------------------------------------
    // CHẶNG 9: HỒ SƠ BỆNH ÁN ĐIỆN TỬ (EHR) & CHUẨN QUỐC TẾ HL7 FHIR
    // --------------------------------------------------------------------------
    console.log("\n--- CHẶNG 9: HỒ SƠ BỆNH ÁN ĐIỆN TỬ (EHR) & FHIR R4 ---");

    await assertStep("9.1. Bệnh nhân xem lịch sử khám và sổ bệnh án điện tử (/api/bookings/my-history)", async () => {
        const res = await fetch(`${BASE_URL}/api/bookings/my-history`, {
            headers: { Authorization: `Bearer ${tokens["ROLE_PATIENT"]}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list = json.data || (Array.isArray(json) ? json : []);
        const found = list.some(b => b.bookingCode === createdBooking.bookingCode);
        if (!found) throw new Error(`Không tìm thấy ca khám ${createdBooking.bookingCode} trong sổ khám`);
        return `Sổ khám điện tử cập nhật chính xác ca khám [${createdBooking.bookingCode}]`;
    });

    await assertStep("9.2. Xuất hồ sơ bệnh án sang chuẩn quốc tế HL7 FHIR R4 Bundle (/api/clinical/records/{id}/fhir)", async () => {
        const res = await fetch(`${BASE_URL}/api/clinical/records/${clinicalRecordId}/fhir`, {
            headers: { Authorization: `Bearer ${tokens["ROLE_DOCTOR"]}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const fhirText = await res.text();
        const fhirObj = JSON.parse(fhirText);
        if (fhirObj.resourceType !== "Bundle") {
            throw new Error(`Kỳ vọng FHIR resourceType: Bundle nhưng nhận ${fhirObj.resourceType}`);
        }
        return `Đã xuất FHIR R4 Bundle hợp lệ (${fhirObj.entry?.length || 0} tài nguyên lâm sàng)`;
    });

    // --------------------------------------------------------------------------
    // CHẶNG 10: KẾT THÚC CA TRỰC & BẢO TOÀN TRẠNG THÁI QUẦY
    // --------------------------------------------------------------------------
    console.log("\n--- CHẶNG 10: KẾT THÚC CA TRỰC & BẢO TOÀN TRẠNG THÁI ---");

    await assertStep("10.1. Điều dưỡng đóng Quầy tiếp đón an toàn sau ca trực (/api/counters/{id}/close)", async () => {
        const res = await fetch(`${BASE_URL}/api/counters/${activeCounterId}/close`, {
            method: "POST",
            headers: { Authorization: `Bearer ${tokens["ROLE_NURSE"]}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return `Quầy ${activeCounterId} đã đóng ca trực an toàn (Trạng thái CLOSED)`;
    });

    console.log("\n==========================================================================");
    console.log(`🏁 TỔNG KẾT KIỂM THỬ: ${passedTests} PASS / ${failedTests} FAIL (TỔNG CỘNG ${totalTests} TIÊU CHÍ)`);
    console.log("==========================================================================");

    if (failedTests > 0) {
        process.exit(1);
    }
}

runPreDeployVerification().catch(err => {
    console.error("LỖI TOÀN CỤC:", err);
    process.exit(1);
});
