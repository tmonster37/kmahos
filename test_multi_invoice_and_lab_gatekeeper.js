const BASE_URL = 'http://localhost:8080';

async function runTests() {
    console.log("==========================================================================");
    console.log("🏥 BẮT ĐẦU KIỂM THỬ: ĐA HÓA ĐƠN (MULTI-INVOICE), CHỐT CHẶN PHÒNG LAB & PAYOS");
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

    let cashierToken = "";
    let doctorToken = "";

    // BƯỚC 1: Đăng nhập
    await test("1.1. Đăng nhập tài khoản Thu Ngân / Admin", async () => {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phoneNumber: "0937050537", password: "taizz0537" })
        });
        const json = await res.json();
        if (!json.success || !json.data?.accessToken) {
            throw new Error("Không thể đăng nhập tài khoản Admin/Cashier: " + json.message);
        }
        cashierToken = json.data.accessToken;
    });

    // BƯỚC 2: Kiểm tra cấu trúc danh sách hóa đơn chờ thu (Pending Bills)
    let pendingBills = [];
    await test("2.1. Lấy danh sách hóa đơn chờ thu từ /api/cashier/pending-bills", async () => {
        const res = await fetch(`${BASE_URL}/api/cashier/pending-bills`, {
            headers: { Authorization: `Bearer ${cashierToken}` }
        });
        const json = await res.json();
        if (!json.success) {
            throw new Error("API pending-bills trả về thất bại: " + json.message);
        }
        pendingBills = json.data || [];
        console.log(`   -> Số lượng hóa đơn chờ thu hiện tại: ${pendingBills.length}`);
        if (pendingBills.length > 0) {
            const sample = pendingBills[0];
            console.log(`   -> Mẫu hóa đơn đầu tiên: ID=${sample.billId}, Code=${sample.bookingCode}, Loại=${sample.billType}, Tổng tiền=${sample.totalAmount}đ`);
        }
    });

    // BƯỚC 3: Kiểm tra chốt chặn phòng xét nghiệm (Lab Gatekeeper)
    await test("3.1. Kiểm tra trường isPaid và paymentStatus trong danh sách xét nghiệm (/api/clinical/lab/tests)", async () => {
        const res = await fetch(`${BASE_URL}/api/clinical/lab/tests`, {
            headers: { Authorization: `Bearer ${cashierToken}` }
        });
        const json = await res.json();
        if (!json.success) {
            throw new Error("API lab/tests trả về thất bại: " + json.message);
        }
        const tests = json.data || [];
        console.log(`   -> Tổng số chỉ định xét nghiệm trong hệ thống: ${tests.length}`);
        if (tests.length > 0) {
            const unpaid = tests.find(t => t.isPaid === false || t.paymentStatus === 'UNPAID');
            const paid = tests.find(t => t.isPaid === true || t.paymentStatus === 'PAID');
            console.log(`   -> Có xét nghiệm UNPAID: ${!!unpaid} (Ví dụ: ${unpaid ? unpaid.testCode + ' - ' + unpaid.serviceName : 'N/A'})`);
            console.log(`   -> Có xét nghiệm PAID: ${!!paid} (Ví dụ: ${paid ? paid.testCode + ' - ' + paid.serviceName : 'N/A'})`);

            // Nếu có xét nghiệm chưa thanh toán, kiểm tra xem chốt chặn có từ chối lấy mẫu không
            if (unpaid) {
                console.log(`   -> Thử chốt chặn lấy mẫu trên xét nghiệm chưa thanh toán [${unpaid.testCode}]...`);
                const collectRes = await fetch(`${BASE_URL}/api/clinical/lab/tests/${unpaid.testId}/collect-specimen`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${cashierToken}`
                    },
                    body: JSON.stringify({
                        specimenType: "Máu toàn phần",
                        specimenBarcode: "TEST-GATEKEEPER-BARCODE"
                    })
                });

                if (collectRes.status === 402) {
                    const errJson = await collectRes.json();
                    console.log(`   -> [GATEKEEPER CHẶN THÀNH CÔNG] HTTP 402: ${errJson.message}`);
                } else if (collectRes.ok) {
                    throw new Error(`Chốt chặn bị lọt! Lấy mẫu thành công HTTP ${collectRes.status} trên xét nghiệm chưa thanh toán!`);
                } else {
                    console.log(`   -> Server từ chối với HTTP ${collectRes.status}`);
                }
            }
        }
    });

    // BƯỚC 4: Tạo 1 ca khám mới, thanh toán tiền khám ban đầu (HĐ 01), sau đó chỉ định cận lâm sàng (HĐ 02)
    let newBookingCode = "";
    await test("4.1. Tạo ca khám mới qua Kiosk (/api/bookings/kiosk)", async () => {
        const res = await fetch(`${BASE_URL}/api/bookings/kiosk`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName: "Trần Bệnh Nhân Tiêu Chuẩn",
                phoneNumber: "0988" + Math.floor(100000 + Math.random() * 900000),
                birthYear: 2000,
                departmentId: 1,
                symptoms: "Kiểm thử mô hình đa hóa đơn và chốt chặn viện phí",
                isPriority: false
            })
        });
        const json = await res.json();
        if (!json.success || !json.data?.bookingCode) {
            throw new Error("Tạo ca khám kiosk thất bại: " + json.message);
        }
        newBookingCode = json.data.bookingCode;
        console.log(`   -> Tạo thành công ca khám: ${newBookingCode}`);
    });

    // BƯỚC 4.2: Kiểm tra Hóa đơn 01: Công khám ban đầu
    let examBillId = "";
    await test("4.2. Kiểm tra hóa đơn công khám ban đầu (BILL-*-EXAM) trong pending-bills", async () => {
        const res = await fetch(`${BASE_URL}/api/cashier/pending-bills`, {
            headers: { Authorization: `Bearer ${cashierToken}` }
        });
        const json = await res.json();
        const bills = json.data || [];
        const myBill = bills.find(b => b.bookingCode === newBookingCode || b.billId?.includes(newBookingCode));
        if (!myBill) {
            throw new Error(`Không tìm thấy hóa đơn công khám cho ca khám ${newBookingCode}`);
        }
        examBillId = myBill.billId;
        console.log(`   -> Tìm thấy hóa đơn công khám: ID=${examBillId}, Loại=${myBill.billType}, Tiền=${myBill.totalAmount}đ`);
        if (!examBillId.endsWith("-EXAM") && !examBillId.includes(newBookingCode)) {
            throw new Error(`Mã hóa đơn không đúng quy ước: ${examBillId}`);
        }
    });

    // BƯỚC 4.3: Thanh toán Hóa đơn 01 (Công khám)
    await test("4.3. Thu tiền hóa đơn công khám HĐ 01 tại quầy thu ngân", async () => {
        const res = await fetch(`${BASE_URL}/api/cashier/pay`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${cashierToken}`
            },
            body: JSON.stringify({
                bookingCode: examBillId,
                paymentMethod: "CASH",
                amountGiven: 500000,
                notes: "Thu tiền công khám HĐ 01"
            })
        });
        const json = await res.json();
        if (!json.success) {
            throw new Error("Thu tiền công khám thất bại: " + json.message);
        }
        console.log(`   -> Thanh toán HĐ 01 thành công: Mã biên lai=${json.data.receiptCode}, Đã thu=${json.data.totalAmount}đ, Tiền thối=${json.data.amountChange}đ`);
    });

    // BƯỚC 4.4: Bắt đầu khám và chỉ định cận lâm sàng (Test phát sinh)
    let orderedTestId = "";
    await test("4.4. Bác sĩ bắt đầu khám và chỉ định dịch vụ cận lâm sàng phát sinh", async () => {
        // Bắt đầu khám
        const startRes = await fetch(`${BASE_URL}/api/clinical/start`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${cashierToken}`
            },
            body: JSON.stringify({
                bookingCode: newBookingCode,
                symptoms: "Đau tức vùng hạ sườn",
                initialDiagnosis: "Theo dõi rối loạn tiêu hóa"
            })
        });
        const startJson = await startRes.json();
        if (!startJson.success) {
            throw new Error("Bác sĩ không thể bắt đầu ca khám: " + startJson.message);
        }
        const recordId = startJson.data.recordId;

        // Lấy danh mục dịch vụ để chỉ định
        const servicesRes = await fetch(`${BASE_URL}/api/clinical/services`, {
            headers: { Authorization: `Bearer ${cashierToken}` }
        });
        const servicesJson = await servicesRes.json();
        const services = servicesJson.data || [];
        const testService = services.find(s => s.price > 0) || services[0];
        if (!testService) {
            throw new Error("Không có dịch vụ xét nghiệm nào trong hệ thống");
        }

        // Chỉ định xét nghiệm
        const orderRes = await fetch(`${BASE_URL}/api/clinical/records/${recordId}/tests`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${cashierToken}`
            },
            body: JSON.stringify({
                serviceIds: [testService.serviceId]
            })
        });
        const orderJson = await orderRes.json();
        if (!orderJson.success || !orderJson.data?.length) {
            throw new Error("Chỉ định xét nghiệm thất bại: " + orderJson.message);
        }
        orderedTestId = orderJson.data[0].testId;
        console.log(`   -> Đã chỉ định thành công dịch vụ: [${testService.serviceName}] (Giá: ${testService.price}đ), TestId=${orderedTestId}`);
    });

    // BƯỚC 4.5: KIỂM TRA CHỐT CHẶN PHÒNG XÉT NGHIỆM TRÊN CA VỪA TẠO
    await test("4.5. [CHỐT CHẶN PHÒNG LAB] Thử lấy mẫu khi chưa nộp HĐ 02 phát sinh -> Phải bị chặn 402", async () => {
        const collectRes = await fetch(`${BASE_URL}/api/clinical/tests/${orderedTestId}/collect-sample`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${cashierToken}`
            },
            body: JSON.stringify({
                specimenType: "Máu toàn phần",
                specimenBarcode: "BARCODE-MULTI-INVOICE-TEST"
            })
        });

        if (collectRes.status === 402) {
            const errJson = await collectRes.json();
            console.log(`   -> [CHẶN THÀNH CÔNG] HTTP 402: ${errJson.message}`);
        } else {
            throw new Error(`Thất bại: Chốt chặn không hoạt động! Status: ${collectRes.status}`);
        }
    });

    // BƯỚC 4.6: KIỂM TRA HÓA ĐƠN 02 PHÁT SINH TRONG PENDING-BILLS (CHỐNG THẤT THOÁT VIỆN PHÍ)
    let treatmentBillId = "";
    await test("4.6. [CHỐNG THẤT THOÁT] Hóa đơn 02 (BILL-*-TREATMENT) phải xuất hiện trong pending-bills", async () => {
        const res = await fetch(`${BASE_URL}/api/cashier/pending-bills`, {
            headers: { Authorization: `Bearer ${cashierToken}` }
        });
        const json = await res.json();
        const bills = json.data || [];
        const treatmentBill = bills.find(b => b.bookingCode === newBookingCode && b.billId?.includes("-TREATMENT"));
        if (!treatmentBill) {
            throw new Error(`THẤT THOÁT VIỆN PHÍ! Hóa đơn phát sinh HĐ 02 không xuất hiện trong pending-bills vì ca khám đã đóng tiền khám ban đầu!`);
        }
        treatmentBillId = treatmentBill.billId;
        console.log(`   -> Tìm thấy HĐ 02 phát sinh: ID=${treatmentBillId}, Số tiền cần thu=${treatmentBill.totalAmount}đ`);
    });

    // BƯỚC 4.7: THU TIỀN HÓA ĐƠN 02 TẠI QUẦY THU NGÂN
    await test("4.7. Thu tiền Hóa đơn 02 (BILL-*-TREATMENT) tại quầy thu ngân", async () => {
        const res = await fetch(`${BASE_URL}/api/cashier/pay`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${cashierToken}`
            },
            body: JSON.stringify({
                bookingCode: treatmentBillId,
                paymentMethod: "CASH",
                amountGiven: 500000,
                notes: "Thu tiền cận lâm sàng phát sinh HĐ 02"
            })
        });
        const json = await res.json();
        if (!json.success) {
            throw new Error("Thu tiền HĐ 02 thất bại: " + json.message);
        }
        console.log(`   -> Thu tiền HĐ 02 thành công! Biên lai: ${json.data.receiptCode}, Đã thu: ${json.data.totalAmount}đ`);
    });

    // BƯỚC 4.8: KIỂM TRA CHỐT CHẶN PHÒNG LAB SAU KHI ĐÃ ĐÓNG TIỀN -> PHẢI CHO PHÉP THAO TÁC!
    await test("4.8. [MỞ KHÓA PHÒNG LAB] Lấy mẫu và trả kết quả xét nghiệm sau khi đã thanh toán", async () => {
        // Lấy mẫu
        const collectRes = await fetch(`${BASE_URL}/api/clinical/tests/${orderedTestId}/collect-sample`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${cashierToken}`
            },
            body: JSON.stringify({
                specimenType: "Máu toàn phần",
                specimenBarcode: "BARCODE-VERIFIED-PAID"
            })
        });
        const collectJson = await collectRes.json();
        if (!collectJson.success) {
            throw new Error("Lấy mẫu thất bại sau khi đã thanh toán: " + collectJson.message);
        }
        console.log(`   -> Lấy mẫu thành công! State=${collectJson.data.state}, isPaid=${collectJson.data.isPaid}`);

        // Nhập kết quả
        const resultRes = await fetch(`${BASE_URL}/api/clinical/tests/${orderedTestId}/detailed-result`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${cashierToken}`
            },
            body: JSON.stringify({
                testResult: "Kết quả kiểm nghiệm hoàn toàn bình thường trong ngưỡng an toàn",
                resultFileUrl: "https://example.com/pacs/sample.jpg",
                items: [
                    {
                        parameterCode: "WBC",
                        parameterName: "Bạch cầu",
                        valueNumeric: 6.5,
                        unit: "G/L",
                        referenceRange: "4.0 - 10.0",
                        flag: "NORMAL"
                    }
                ]
            })
        });
        const resultJson = await resultRes.json();
        if (!resultJson.success) {
            throw new Error("Nhập kết quả xét nghiệm thất bại: " + resultJson.message);
        }
        console.log(`   -> Nhập kết quả xét nghiệm chi tiết thành công! State=${resultJson.data.state}, isPaid=${resultJson.data.isPaid}`);
    });

    console.log("\n==========================================================================");
    console.log(`🎉 KẾT QUẢ KIỂM THỬ: ${passed} PASS, ${failed} FAIL`);
    console.log("==========================================================================");
}

runTests().catch(console.error);
