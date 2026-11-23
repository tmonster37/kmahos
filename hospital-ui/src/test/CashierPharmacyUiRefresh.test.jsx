import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import CashierPage, { isBillTotalAmountValid, executeCashierPayment } from "../pages/cashier/CashierPage";
import MedicineManagePage, { getDaysUntilExpiry, filterProcurementMedicines } from "../pages/admin/MedicineManagePage";
import PharmacyInventoryPage, { evaluateStockStatus, executeDispenseFefoPure } from "../pages/admin/PharmacyInventoryPage";
import ReconciliationModal from "../pages/cashier/ReconciliationModal";
import TransactionDetailModal from "../pages/cashier/TransactionDetailModal";
import AuditEntryModal from "../pages/cashier/AuditEntryModal";
import { printReceipt, printDispenseSlip, printShiftReconciliation } from "../utils/printHelper";

let mockAuthUser = { userId: "cashier-1", role: "ROLE_CASHIER", fullName: "Thu Ngân Viên" };

vi.mock("../context/AuthContext", () => ({
    useAuth: () => ({
        user: mockAuthUser,
        isAuthenticated: true,
        role: mockAuthUser.role
    })
}));

vi.mock("../services/AxiosInstance", () => ({
    default: {
        get: vi.fn(() => Promise.resolve({ data: [] })),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        put: vi.fn(() => Promise.resolve({ data: {} }))
    }
}));

vi.mock("../services/pharmacyApi", () => ({
    default: {
        getWarehouses: vi.fn(() => Promise.resolve({ data: [] })),
        getPrescriptions: vi.fn(() => Promise.resolve({ data: [] })),
        getBatches: vi.fn(() => Promise.resolve({ data: [] })),
        getTransfers: vi.fn(() => Promise.resolve({ data: [] })),
        getWarehouseStock: vi.fn(() => Promise.resolve({ data: [] })),
        dispensePrescription: vi.fn(() => Promise.resolve({ data: {} })),
        getDispenses: vi.fn(() => Promise.resolve({ data: [] })),
        getExpiringAlerts: vi.fn(() => Promise.resolve({ data: [] })),
        getLowStockAlerts: vi.fn(() => Promise.resolve({ data: [] }))
    }
}));

describe("Phase 5 Cashier & Pharmacy UI Refresh Comprehensive Test Suite", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("1. cashierPharmacyRetainPermittedActions & RBAC", () => {
        it("CashierPage: renders cashier workspace title and actions for ROLE_CASHIER", () => {
            mockAuthUser = { userId: "cashier-1", role: "ROLE_CASHIER", fullName: "Thu Ngân Viên" };
            const html = renderToStaticMarkup(
                <MemoryRouter>
                    <CashierPage />
                </MemoryRouter>
            );
            expect(html).toContain("Quầy Thu Ngân &amp; Viện Phí Điện Tử");
            expect(html).toContain("Đối Soát Ca Trực");
            expect(html).toContain("Làm Mới");
        });

        it("MedicineManagePage: permits add/edit/lock actions for ROLE_ADMIN and ROLE_PHARMACIST", () => {
            mockAuthUser = { userId: "admin-1", role: "ROLE_ADMIN", fullName: "Quản Trị Viên" };
            const html = renderToStaticMarkup(
                <MemoryRouter>
                    <MedicineManagePage />
                </MemoryRouter>
            );
            expect(html).toContain("Thêm Thuốc Mới");
            expect(html).toContain("Quản Lý Danh Mục Thuốc");
        });

        it("MedicineManagePage: head of department cannot see mutation buttons (Thêm Thuốc Mới, Nhập thêm, Sửa)", () => {
            mockAuthUser = { userId: "head-1", role: "ROLE_HEAD_OF_DEPARTMENT", fullName: "Trưởng Khoa Dược" };
            const html = renderToStaticMarkup(
                <MemoryRouter>
                    <MedicineManagePage />
                </MemoryRouter>
            );
            expect(html).toContain("Chế độ Trưởng khoa");
            // Must NOT render add medicine button for head of department
            expect(html).not.toContain("Thêm Thuốc Mới");
        });
    });

    describe("2. financialSafetyAndMissingTotalAmount (Area A)", () => {
        it("isBillTotalAmountValid correctly identifies valid vs invalid amounts", () => {
            expect(isBillTotalAmountValid(null)).toBe(false);
            expect(isBillTotalAmountValid({})).toBe(false);
            expect(isBillTotalAmountValid({ totalAmount: null })).toBe(false);
            expect(isBillTotalAmountValid({ totalAmount: undefined })).toBe(false);
            expect(isBillTotalAmountValid({ totalAmount: "" })).toBe(false);
            expect(isBillTotalAmountValid({ totalAmount: "   " })).toBe(false);
            expect(isBillTotalAmountValid({ totalAmount: "invalid" })).toBe(false);
            expect(isBillTotalAmountValid({ totalAmount: NaN })).toBe(false);
            expect(isBillTotalAmountValid({ totalAmount: Infinity })).toBe(false);
            expect(isBillTotalAmountValid({ totalAmount: -Infinity })).toBe(false);
            expect(isBillTotalAmountValid({ totalAmount: -50000 })).toBe(false);

            // Objects with amount field
            expect(isBillTotalAmountValid({ amount: null })).toBe(false);
            expect(isBillTotalAmountValid({ amount: "" })).toBe(false);
            expect(isBillTotalAmountValid({ amount: Infinity })).toBe(false);
            expect(isBillTotalAmountValid({ amount: -100 })).toBe(false);
            expect(isBillTotalAmountValid({ amount: 120000 })).toBe(true);

            // Primitive values
            expect(isBillTotalAmountValid("")).toBe(false);
            expect(isBillTotalAmountValid("   ")).toBe(false);
            expect(isBillTotalAmountValid(Infinity)).toBe(false);
            expect(isBillTotalAmountValid(-500)).toBe(false);
            expect(isBillTotalAmountValid(0)).toBe(true);
            expect(isBillTotalAmountValid("0")).toBe(true);
            expect(isBillTotalAmountValid(150000)).toBe(true);
            expect(isBillTotalAmountValid("150000")).toBe(true);

            // Genuine 0 is valid (e.g. miễn phí hoặc bảo hiểm 100%)
            expect(isBillTotalAmountValid({ totalAmount: 0 })).toBe(true);
            expect(isBillTotalAmountValid({ totalAmount: "0" })).toBe(true);
            expect(isBillTotalAmountValid({ totalAmount: 150000 })).toBe(true);
        });

        it("executeCashierPayment blocks payment when bill has missing or invalid totalAmount", async () => {
            const mockClient = { post: vi.fn() };

            await expect(
                executeCashierPayment({
                    selectedBill: { billId: "BILL-001", totalAmount: null },
                    paymentMethod: "CASH",
                    cashGiven: "200000",
                    paymentSuccess: false,
                    apiClient: mockClient
                })
            ).rejects.toThrow("Hóa đơn chưa có tổng tiền hợp lệ từ hệ thống");

            expect(mockClient.post).not.toHaveBeenCalled();
        });

        it("executeCashierPayment blocks QR confirmation when paymentSuccess is false", async () => {
            const mockClient = { post: vi.fn() };

            await expect(
                executeCashierPayment({
                    selectedBill: { billId: "BILL-002", totalAmount: 250000 },
                    paymentMethod: "QR",
                    cashGiven: "",
                    paymentSuccess: false,
                    apiClient: mockClient
                })
            ).rejects.toThrow("Thanh toán PayOS VietQR cần được xác nhận tự động");

            expect(mockClient.post).not.toHaveBeenCalled();
        });

        it("executeCashierPayment blocks CASH confirmation when cashGiven is insufficient", async () => {
            const mockClient = { post: vi.fn() };

            await expect(
                executeCashierPayment({
                    selectedBill: { billId: "BILL-003", totalAmount: 250000 },
                    paymentMethod: "CASH",
                    cashGiven: "200000", // Thiếu 50.000 đ
                    paymentSuccess: false,
                    apiClient: mockClient
                })
            ).rejects.toThrow("Số tiền khách đưa không hợp lệ hoặc chưa đủ để thanh toán");

            expect(mockClient.post).not.toHaveBeenCalled();
        });

        it("executeCashierPayment permits payment when amount is genuine 0 or valid cash given", async () => {
            const mockClient = {
                post: vi.fn(() => Promise.resolve({ data: { receiptId: "RC-OK-01" } }))
            };

            // Test case: bill totalAmount is 0 (miễn phí)
            const resultZero = await executeCashierPayment({
                selectedBill: { billId: "BILL-FREE", totalAmount: 0 },
                paymentMethod: "CASH",
                cashGiven: "0",
                paymentSuccess: false,
                apiClient: mockClient
            });

            expect(resultZero).toEqual({ receiptId: "RC-OK-01" });
            expect(mockClient.post).toHaveBeenCalledWith("/api/cashier/pay", expect.objectContaining({
                bookingCode: "BILL-FREE",
                paymentMethod: "CASH",
                amountGiven: 0
            }));

            // Test case: valid cash payment
            const resultPaid = await executeCashierPayment({
                selectedBill: { billId: "BILL-PAID", totalAmount: 150000 },
                paymentMethod: "CASH",
                cashGiven: "200000",
                paymentSuccess: false,
                apiClient: mockClient
            });

            expect(resultPaid).toEqual({ receiptId: "RC-OK-01" });
            expect(mockClient.post).toHaveBeenCalledWith("/api/cashier/pay", expect.objectContaining({
                bookingCode: "BILL-PAID",
                amountGiven: 200000
            }));
        });

        it("executeCashierPayment handles verified QR payment correctly", async () => {
            const mockClient = {
                post: vi.fn(() => Promise.resolve({ data: { receiptId: "RC-QR-OK" } }))
            };

            const result = await executeCashierPayment({
                selectedBill: { billId: "BILL-QR-99", totalAmount: 300000 },
                paymentMethod: "QR",
                cashGiven: "",
                paymentSuccess: true, // Đã được cổng xác nhận
                apiClient: mockClient
            });

            expect(result).toEqual({ receiptId: "RC-QR-OK" });
            expect(mockClient.post).toHaveBeenCalledWith("/api/cashier/pay", expect.objectContaining({
                bookingCode: "BILL-QR-99",
                paymentMethod: "PAYOS",
                amountGiven: 300000
            }));
        });
    });

    describe("3. pharmacyDispensingDoubleSubmissionLock (Area C)", () => {
        it("blocks duplicate concurrent FEFO dispense calls via synchronous ref lock", async () => {
            const mockApi = {
                dispensePrescription: vi.fn(() => new Promise((resolve) => setTimeout(() => resolve({ data: { dispenseCode: "DISP-101" } }), 50)))
            };

            const isDispensingRef = { current: false };

            // First call triggers API
            const promise1 = executeDispenseFefoPure({
                isDispensingRef,
                dispensing: false,
                dispenseResult: null,
                dispenseData: { warehouseId: "WH-01", prescriptionId: "RX-01" },
                apiClient: mockApi
            });

            // Concurrent second call while first is in-flight (isDispensingRef.current === true)
            const result2 = await executeDispenseFefoPure({
                isDispensingRef,
                dispensing: true,
                dispenseResult: null,
                dispenseData: { warehouseId: "WH-01", prescriptionId: "RX-01" },
                apiClient: mockApi
            });

            expect(result2).toEqual({ locked: true });
            expect(mockApi.dispensePrescription).toHaveBeenCalledTimes(1);

            const result1 = await promise1;
            expect(result1.success).toBe(true);
            expect(isDispensingRef.current).toBe(false);
        });

        it("blocks dispense if prescription has already been dispensed (dispenseResult present)", async () => {
            const mockApi = { dispensePrescription: vi.fn() };
            const isDispensingRef = { current: false };

            const result = await executeDispenseFefoPure({
                isDispensingRef,
                dispensing: false,
                dispenseResult: { dispenseCode: "DISP-ALREADY-DONE" },
                dispenseData: { warehouseId: "WH-01", prescriptionId: "RX-02" },
                apiClient: mockApi
            });

            expect(result).toEqual({ locked: true });
            expect(mockApi.dispensePrescription).not.toHaveBeenCalled();
        });

        it("releases lock upon API error to allow pharmacist to retry", async () => {
            const mockApi = {
                dispensePrescription: vi.fn(() => Promise.reject(new Error("Lỗi kết nối kho FEFO")))
            };
            const isDispensingRef = { current: false };

            await expect(
                executeDispenseFefoPure({
                    isDispensingRef,
                    dispensing: false,
                    dispenseResult: null,
                    dispenseData: { warehouseId: "WH-01", prescriptionId: "RX-ERR" },
                    apiClient: mockApi
                })
            ).rejects.toThrow("Lỗi kết nối kho FEFO");

            // Lock MUST be released
            expect(isDispensingRef.current).toBe(false);
        });
    });

    describe("4. stockAndPriceTruthfulness (Area B)", () => {
        it("evaluateStockStatus renders 'CHƯA XÁC ĐỊNH TỒN KHO' when availableQuantity or threshold is null", () => {
            // Null available quantity
            const res1 = evaluateStockStatus({ availableQuantity: null, minimumThreshold: 50 });
            expect(res1.isStockKnown).toBe(false);
            expect(res1.statusLabel).toBe("CHƯA XÁC ĐỊNH TỒN KHO");

            // Null minimum threshold
            const res2 = evaluateStockStatus({ availableQuantity: 100, minimumThreshold: null });
            expect(res2.isStockKnown).toBe(false);
            expect(res2.statusLabel).toBe("CHƯA XÁC ĐỊNH TỒN KHO");

            // Both null
            const res3 = evaluateStockStatus({ availableQuantity: undefined, minimumThreshold: undefined });
            expect(res3.isStockKnown).toBe(false);
            expect(res3.statusLabel).toBe("CHƯA XÁC ĐỊNH TỒN KHO");
        });

        it("evaluateStockStatus accurately flags low stock vs safe stock when numbers are known", () => {
            // Low stock
            const low = evaluateStockStatus({ availableQuantity: 15, minimumThreshold: 20 });
            expect(low.isStockKnown).toBe(true);
            expect(low.isLowStock).toBe(true);
            expect(low.statusLabel).toBe("SẮP HẾT HÀNG");

            // Safe stock
            const safe = evaluateStockStatus({ availableQuantity: 100, minimumThreshold: 20 });
            expect(safe.isStockKnown).toBe(true);
            expect(safe.isLowStock).toBe(false);
            expect(safe.statusLabel).toBe("AN TOÀN");

            // Expiring soon overrides low stock
            const exp = evaluateStockStatus({ availableQuantity: 10, minimumThreshold: 20, daysUntilExpiry: 30 });
            expect(exp.isExpiringSoon).toBe(true);
            expect(exp.statusLabel).toBe("CẬN HẠN DÙNG");
        });

        it("evaluateStockStatus distinguishes expired (daysUntilExpiry <= 0) from expiring soon (0 < daysUntilExpiry <= 90)", () => {
            // Already expired (e.g. -10 days)
            const expiredNeg = evaluateStockStatus({ availableQuantity: 50, minimumThreshold: 20, daysUntilExpiry: -10 });
            expect(expiredNeg.isExpired).toBe(true);
            expect(expiredNeg.isExpiringSoon).toBe(false);
            expect(expiredNeg.statusLabel).toBe("HẾT HẠN - TIÊU HỦY");

            // Expired today (0 days)
            const expiredZero = evaluateStockStatus({ availableQuantity: 50, minimumThreshold: 20, daysUntilExpiry: 0 });
            expect(expiredZero.isExpired).toBe(true);
            expect(expiredZero.isExpiringSoon).toBe(false);
            expect(expiredZero.statusLabel).toBe("HẾT HẠN - TIÊU HỦY");

            // Expiring soon (45 days)
            const soon = evaluateStockStatus({ availableQuantity: 50, minimumThreshold: 20, daysUntilExpiry: 45 });
            expect(soon.isExpired).toBe(false);
            expect(soon.isExpiringSoon).toBe(true);
            expect(soon.statusLabel).toBe("CẬN HẠN DÙNG");

            // Far future (150 days) - safe stock
            const far = evaluateStockStatus({ availableQuantity: 50, minimumThreshold: 20, daysUntilExpiry: 150 });
            expect(far.isExpired).toBe(false);
            expect(far.isExpiringSoon).toBe(false);
            expect(far.statusLabel).toBe("AN TOÀN");
        });

        it("filterProcurementMedicines prevents falsified procurement recommendations and JS coercion bugs", () => {
            const nextMonth = new Date();
            nextMonth.setDate(nextMonth.getDate() + 30);

            const nextYear = new Date();
            nextYear.setDate(nextYear.getDate() + 365);

            const lastMonth = new Date();
            lastMonth.setDate(lastMonth.getDate() - 15);

            const candidateList = [
                // Case 1: ample stock, null expiry date -> MUST NOT be included (proves null <= 90 bug is fixed)
                { medicineId: 1, medicineName: "Med Null Expiry", stockQuantity: 100, minStock: 20, expiryDate: null, deleted: false },
                // Case 2: stock above min, missing minStock (null) -> MUST NOT assume default minStock 50
                { medicineId: 2, medicineName: "Med Null MinStock", stockQuantity: 30, minStock: null, expiryDate: nextYear.toISOString(), deleted: false },
                // Case 3: genuine low stock -> MUST be included
                { medicineId: 3, medicineName: "Med Low Stock", stockQuantity: 5, minStock: 20, expiryDate: nextYear.toISOString(), deleted: false },
                // Case 4: genuine expiring soon (30 days) -> MUST be included
                { medicineId: 4, medicineName: "Med Expiring Soon", stockQuantity: 100, minStock: 20, expiryDate: nextMonth.toISOString(), deleted: false },
                // Case 5: deleted medicine -> MUST NOT be included
                { medicineId: 5, medicineName: "Med Deleted", stockQuantity: 0, minStock: 20, expiryDate: nextMonth.toISOString(), deleted: true },
                // Case 6: expired medicine (daysLeft <= 0) -> MUST be included in procurement to order replacement
                { medicineId: 6, medicineName: "Med Expired", stockQuantity: 100, minStock: 20, expiryDate: lastMonth.toISOString(), deleted: false }
            ];

            const result = filterProcurementMedicines(candidateList);
            const resultIds = result.map(m => m.medicineId);

            expect(resultIds).toContain(3);
            expect(resultIds).toContain(4);
            expect(resultIds).toContain(6);
            expect(resultIds).not.toContain(1);
            expect(resultIds).not.toContain(2);
            expect(resultIds).not.toContain(5);
        });

        it("getDaysUntilExpiry handles null, undefined, invalid dates truthfully without defaulting to 999", () => {
            expect(getDaysUntilExpiry(null)).toBeNull();
            expect(getDaysUntilExpiry(undefined)).toBeNull();
            expect(getDaysUntilExpiry("")).toBeNull();
            expect(getDaysUntilExpiry("invalid-date-string")).toBeNull();

            // Future date returns a valid integer
            const future = new Date();
            future.setDate(future.getDate() + 30);
            const days = getDaysUntilExpiry(future.toISOString());
            expect(days).toBeGreaterThanOrEqual(29);
            expect(days).toBeLessThanOrEqual(31);
        });
    });

    describe("5. printTruthfulnessAndReceiptSafety (Area D)", () => {
        let writtenHtml = "";
        let originalWindow;

        beforeEach(() => {
            writtenHtml = "";
            originalWindow = globalThis.window;
            const mockPrintWindow = {
                document: {
                    write: vi.fn((content) => {
                        writtenHtml += content;
                    }),
                    close: vi.fn()
                },
                focus: vi.fn(),
                print: vi.fn()
            };
            globalThis.window = {
                open: vi.fn(() => mockPrintWindow),
                alert: vi.fn()
            };
        });

        afterEach(() => {
            globalThis.window = originalWindow;
        });

        it("printReceipt renders 'Chưa có dữ liệu' when paidAt is null, without synthesizing current date", () => {
            printReceipt({
                patientName: "Bệnh nhân test",
                totalAmount: null,
                paidAt: null,
                items: [{ name: "Dịch vụ khám", qty: 1, price: null }]
            });

            // Must NOT contain fake random receipt code like RC-123456
            expect(writtenHtml).not.toMatch(/Mã BL: <b>RC-\d{6}<\/b>/);
            expect(writtenHtml).toContain("Chưa có mã biên lai");
            expect(writtenHtml).toContain("Chưa có dữ liệu");
            expect(writtenHtml).toContain("Thời gian thu: Chưa có dữ liệu");
        });

        it("printDispenseSlip renders 'Chưa có dữ liệu' when dispensedAt is null, without synthesizing current date", () => {
            printDispenseSlip({
                dispensedAt: null
            });

            // Must NOT contain fake random dispense code like DISP-123456
            expect(writtenHtml).not.toMatch(/DISP-\d{6}/);
            expect(writtenHtml).toContain("Chưa có mã phiếu xuất");
            expect(writtenHtml).toContain("Thời gian xuất: Chưa có dữ liệu");
        });

        it("printShiftReconciliation renders prominent warning when hasMissingAmount is true", () => {
            printShiftReconciliation({
                totalCollected: 1000000,
                cashTotal: 1000000,
                hasMissingAmount: true,
                transactions: [
                    { receiptCode: "RC-01", totalAmount: null, patientName: "Khách test" }
                ]
            });

            expect(writtenHtml).toContain("CẢNH BÁO ĐỐI SOÁT");
            expect(writtenHtml).toContain("Tổng tiền thực thu dưới đây chỉ là tổng từng phần");
            expect(writtenHtml).toContain("Chưa có dữ liệu");
        });
    });

    describe("6. longBillAndReceiptRemainReadable", () => {
        it("ReconciliationModal and TransactionDetailModal render with structured overflow formatting", () => {
            const reconHtml = renderToStaticMarkup(
                <ReconciliationModal
                    open={true}
                    onClose={() => { }}
                    shiftFilter="ALL"
                    shiftReconData={{
                        totalCollected: 15000000,
                        transactionCount: 20,
                        cashTotal: 5000000,
                        cashCount: 10,
                        digitalTotal: 10000000,
                        digitalCount: 10,
                        posTotal: 0,
                        posCount: 0,
                        transactions: [
                            {
                                receiptCode: "RC-20261109-001",
                                billId: "BILL-20261109-001",
                                patientName: "Nguyễn Văn A Siêu Dài Tên Để Kiểm Tra Khả Năng Hiển Thị Tràn Chữ",
                                paymentMethod: "CASH",
                                totalAmount: 500000,
                                paidAt: "2026-11-09T08:30:00"
                            }
                        ]
                    }}
                    formatCurrency={(v) => `${v} ₫`}
                    formatDateTime={(d) => String(d)}
                    handlePrintShiftRecon={() => { }}
                />
            );
            expect(reconHtml).toContain("Bảng Đối Soát &amp; Bàn Giao Ca Trực Thu Ngân");
            expect(reconHtml).toContain("TỔNG THU CA TRỰC");
            expect(reconHtml).toContain("RC-20261109-001");

            // Modal renders warning alert and chip when hasMissingAmount is true
            const reconMissingHtml = renderToStaticMarkup(
                <ReconciliationModal
                    open={true}
                    onClose={() => { }}
                    shiftFilter="ALL"
                    shiftReconData={{
                        totalCollected: 500000,
                        transactionCount: 2,
                        cashTotal: 500000,
                        cashCount: 1,
                        digitalTotal: 0,
                        digitalCount: 0,
                        posTotal: 0,
                        posCount: 0,
                        hasMissingAmount: true,
                        transactions: [
                            { receiptCode: "RC-OK", totalAmount: 500000, patientName: "Khách 1" },
                            { receiptCode: "RC-MISS", totalAmount: null, patientName: "Khách 2" }
                        ]
                    }}
                    formatCurrency={(v) => `${v} ₫`}
                    formatDateTime={(d) => String(d)}
                    handlePrintShiftRecon={() => { }}
                />
            );
            expect(reconMissingHtml).toContain("CẢNH BÁO ĐỐI SOÁT");
            expect(reconMissingHtml).toContain("Số liệu từng phần");
            expect(reconMissingHtml).toContain("Chưa có dữ liệu");

            const txnDetailHtml = renderToStaticMarkup(
                <TransactionDetailModal
                    open={true}
                    onClose={() => { }}
                    selectedTxn={{
                        transactionId: "TXN-20261109-9999",
                        amount: 350000,
                        status: "SUCCESS",
                        accountName: "Trần Thị B",
                        paymentMethod: "QR",
                        description: "Nội dung thanh toán rất dài dịch vụ kỹ thuật cao chụp cộng hưởng từ MRI và thuốc kháng sinh phối hợp",
                        createdAt: "2026-11-09T09:00:00"
                    }}
                    formatCurrency={(v) => `${v} ₫`}
                    formatDateTime={(d) => String(d)}
                />
            );
            expect(txnDetailHtml).toContain("Chi Tiết Giao Dịch Tài Chính");
            expect(txnDetailHtml).toContain("TXN-20261109-9999");
            expect(txnDetailHtml).toContain("Thành Công");

            const auditHtml = renderToStaticMarkup(
                <AuditEntryModal
                    open={true}
                    onClose={() => { }}
                    shiftStats={{ cashTotal: 5000000 }}
                    auditActualCash="5000000"
                    setAuditActualCash={() => { }}
                    auditNotes=""
                    setAuditNotes={() => { }}
                    handleRecordAuditEntry={() => { }}
                    auditSubmitting={false}
                    formatCurrency={(v) => `${v} ₫`}
                />
            );
            expect(auditHtml).toContain("Biên Bản Kiểm Kê Két Tiền Mặt");
        });

        it("ReconciliationModal handles whitespace, Infinity, empty string, negative, and zero totalAmount strictly", () => {
            const html = renderToStaticMarkup(
                <ReconciliationModal
                    open={true}
                    onClose={() => { }}
                    shiftFilter="ALL"
                    shiftReconData={{
                        totalCollected: 200000,
                        transactionCount: 7,
                        cashTotal: 200000,
                        cashCount: 1,
                        digitalTotal: 0,
                        digitalCount: 0,
                        posTotal: 0,
                        posCount: 0,
                        hasMissingAmount: true,
                        transactions: [
                            { receiptCode: "RC-VALID", totalAmount: 200000, patientName: "Khách hợp lệ" },
                            { receiptCode: "RC-ZERO", totalAmount: 0, patientName: "Khách miễn phí" },
                            { receiptCode: "RC-ZERO-STR", totalAmount: "0", patientName: "Khách miễn phí chuỗi" },
                            { receiptCode: "RC-EMPTY", totalAmount: "", patientName: "Khách rỗng" },
                            { receiptCode: "RC-WHITESPACE", totalAmount: "   ", patientName: "Khách khoảng trắng" },
                            { receiptCode: "RC-INF", totalAmount: Infinity, patientName: "Khách vô cực" },
                            { receiptCode: "RC-NEG", totalAmount: -50000, patientName: "Khách số âm" }
                        ]
                    }}
                    formatCurrency={(v) => `${v} ₫`}
                    formatDateTime={(d) => String(d)}
                    handlePrintShiftRecon={() => { }}
                />
            );

            // Valid amounts are formatted
            expect(html).toContain("200000 ₫");
            expect(html).toContain("0 ₫");

            // Warning indicators present
            expect(html).toContain("CẢNH BÁO ĐỐI SOÁT");
            expect(html).toContain("Số liệu từng phần");

            // Invalid/missing amounts show "Chưa có dữ liệu"
            expect(html).toContain("Chưa có dữ liệu");
        });

        it("AuditEntryModal renders warning alert when shift has missing amount transactions", () => {
            const auditHtml = renderToStaticMarkup(
                <AuditEntryModal
                    open={true}
                    onClose={() => { }}
                    shiftStats={{ cashTotal: 5000000, hasMissingAmount: true }}
                    auditActualCash="5000000"
                    setAuditActualCash={() => { }}
                    auditNotes=""
                    setAuditNotes={() => { }}
                    handleRecordAuditEntry={() => { }}
                    auditSubmitting={false}
                    formatCurrency={(v) => `${v} ₫`}
                />
            );
            expect(auditHtml).toContain("Biên Bản Kiểm Kê Két Tiền Mặt");
            expect(auditHtml).toContain("CẢNH BÁO ĐỐI SOÁT");
            expect(auditHtml).toContain("Số tiền mặt sổ sách chỉ là tổng từng phần");
        });
    });
});
