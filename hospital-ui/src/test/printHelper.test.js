import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { escapeHtml, printAppointmentTicket, printReceipt, printDispenseSlip } from "../utils/printHelper";

describe("Print Helper & XSS Sanitization (printHelper.js)", () => {
    it("escapes script tags to prevent DOM-based XSS in print popups", () => {
        const payload = '<script>alert("xss")</script>';
        const escaped = escapeHtml(payload);
        expect(escaped).toBe("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");
        expect(escaped).not.toContain("<script>");
    });

    it("escapes img onerror attributes", () => {
        const payload = '<img src="x" onerror="alert(1)">';
        const escaped = escapeHtml(payload);
        expect(escaped).toBe("&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;");
        expect(escaped).not.toContain("<img");
    });

    it("escapes quotes and ampersands properly", () => {
        const payload = 'Tom & "Jerry" / O\'Reilly';
        const escaped = escapeHtml(payload);
        expect(escaped).toBe("Tom &amp; &quot;Jerry&quot; / O&#039;Reilly");
    });

    it("handles null, undefined, numbers, and plain strings gracefully", () => {
        expect(escapeHtml(null)).toBe("");
        expect(escapeHtml(undefined)).toBe("");
        expect(escapeHtml(12345)).toBe("12345");
        expect(escapeHtml("Nguyễn Văn A")).toBe("Nguyễn Văn A");
    });

    describe("printAppointmentTicket Truthfulness", () => {
        let writtenHtml = "";
        let originalWindow;

        beforeEach(() => {
            writtenHtml = "";
            originalWindow = globalThis.window;
            const mockPrintWindow = {
                document: {
                    write: vi.fn((html) => {
                        writtenHtml += html;
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

        it("renders truthful fallback labels when data fields are missing (no invented values)", () => {
            printAppointmentTicket({});

            expect(writtenHtml).toContain("Phiếu Khám Bệnh - Chưa có mã");
            expect(writtenHtml).toContain("Mã khám: <b>Chưa có mã</b>");
            expect(writtenHtml).toContain("Chờ cấp số tại quầy");
            expect(writtenHtml).toContain("Chưa xếp phòng");
            expect(writtenHtml).toContain("Chưa phân công");
            expect(writtenHtml).toContain("Chưa có dữ liệu");

            // Must NOT contain old fake placeholders
            expect(writtenHtml).not.toContain("BK-2026-XXXX");
            expect(writtenHtml).not.toContain("Khách hàng");
            expect(writtenHtml).not.toContain("Bác sĩ chuyên khoa");
            expect(writtenHtml).not.toContain("Trong giờ hành chính");
            expect(writtenHtml).not.toContain("Đang cấp");
        });

        it("handles price null and totalAmount contract correctly", () => {
            // Case 1: price is null, totalAmount is undefined -> "Chưa có dữ liệu"
            writtenHtml = "";
            printAppointmentTicket({ price: null });
            expect(writtenHtml).toContain("Tiền khám bệnh:</td>\n                    <td style=\"font-weight: bold; color: #0F766E;\">Chưa có dữ liệu</td>");

            // Case 2: price is null, totalAmount is 150000 -> uses totalAmount
            writtenHtml = "";
            printAppointmentTicket({ price: null, totalAmount: 150000 });
            expect(writtenHtml).toMatch(/150\.000/);

            // Case 3: price is 0, totalAmount is 150000 -> keeps 0 as real value, does NOT fallback
            writtenHtml = "";
            printAppointmentTicket({ price: 0, totalAmount: 150000 });
            expect(writtenHtml).toContain("0 ₫");
            expect(writtenHtml).not.toMatch(/150\.000/);

            // Case 4: price is null, totalAmount is 0 -> keeps totalAmount 0 as real value
            writtenHtml = "";
            printAppointmentTicket({ price: null, totalAmount: 0 });
            expect(writtenHtml).toContain("0 ₫");

            // Case 5: price is 200000, totalAmount is 0 -> uses price
            writtenHtml = "";
            printAppointmentTicket({ price: 200000, totalAmount: 0 });
            expect(writtenHtml).toMatch(/200\.000/);
        });

        it("preserves price 0 as '0 ₫' and queue number 0 as '#0'", () => {
            printAppointmentTicket({
                bookingCode: "BK-20261109-001",
                patientName: "Lê Văn C",
                queueNumber: 0,
                price: 0,
                roomName: "P.102",
                doctorName: "BS. Nguyễn Văn D"
            });

            expect(writtenHtml).toContain("Phiếu Khám Bệnh - BK-20261109-001");
            expect(writtenHtml).toContain("#0");
            expect(writtenHtml).toContain("0 ₫");
            expect(writtenHtml).toContain("P.102");
            expect(writtenHtml).toContain("BS. Nguyễn Văn D");
        });

        it("formats valid appointment ticket with full data and brand teal styling", () => {
            printAppointmentTicket({
                bookingCode: "BK-20261109-888",
                patientName: "Trần Thị Lan",
                phoneNumber: "0912345678",
                departmentName: "Khoa Nội Tổng Hợp",
                roomName: "P.205",
                doctorName: "BS.CKII Phạm Quang",
                bookingDate: "09/11/2026",
                timeSlot: "08:30 - 09:00",
                queueNumber: 12,
                price: 150000
            });

            expect(writtenHtml).toContain("BK-20261109-888");
            expect(writtenHtml).toContain("Trần Thị Lan");
            expect(writtenHtml).toContain("0912345678");
            expect(writtenHtml).toContain("Khoa Nội Tổng Hợp");
            expect(writtenHtml).toContain("P.205");
            expect(writtenHtml).toContain("BS.CKII Phạm Quang");
            expect(writtenHtml).toContain("09/11/2026");
            expect(writtenHtml).toContain("08:30 - 09:00");
            expect(writtenHtml).toContain("#12");
            expect(writtenHtml).toMatch(/150\.000/);
            expect(writtenHtml).toContain("#0F766E"); // Primary TNT brand teal
        });
    });

    describe("printReceipt Truthfulness & Overflow Safety", () => {
        let writtenHtml = "";
        let originalWindow;

        beforeEach(() => {
            writtenHtml = "";
            originalWindow = globalThis.window;
            const mockPrintWindow = {
                document: {
                    write: vi.fn((html) => {
                        writtenHtml += html;
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

        it("avoids synthesizing fake random receipt codes and handles null amount and date truthfully", () => {
            printReceipt({
                totalAmount: null,
                paidAt: null,
                items: [{ name: "Dịch vụ khám theo yêu cầu", qty: 1, price: null }]
            });

            expect(writtenHtml).toContain("BIÊN LAI THU TIỀN VIỆN PHÍ");
            expect(writtenHtml).toContain("Chưa có mã biên lai");
            expect(writtenHtml).toContain("Chưa có dữ liệu");
            expect(writtenHtml).toContain("Thời gian thu: Chưa có dữ liệu");
            expect(writtenHtml).not.toMatch(/RC-\d{6}/);
            expect(writtenHtml).toContain("word-break: break-word;");
        });

        it("preserves valid receipt data, payment method and item details", () => {
            printReceipt({
                receiptCode: "RC-20261109-001",
                patientName: "Phạm Hồng Minh",
                phoneNumber: "0988776655",
                paymentMethod: "CASH",
                cashierName: "Nguyễn Thu Ngân",
                totalAmount: 300000,
                items: [
                    { name: "Khám chuyên khoa Tim Mạch", qty: 1, price: 200000 },
                    { name: "Điện tâm đồ ECG", qty: 1, price: 100000 }
                ]
            });

            expect(writtenHtml).toContain("RC-20261109-001");
            expect(writtenHtml).toContain("Phạm Hồng Minh");
            expect(writtenHtml).toContain("0988776655");
            expect(writtenHtml).toContain("Tiền mặt tại quầy");
            expect(writtenHtml).toContain("Nguyễn Thu Ngân");
            expect(writtenHtml).toContain("Khám chuyên khoa Tim Mạch");
            expect(writtenHtml).toContain("Điện tâm đồ ECG");
            expect(writtenHtml).toMatch(/300\.000/);
        });
    });

    describe("printDispenseSlip Truthfulness & Overflow Safety", () => {
        let writtenHtml = "";
        let originalWindow;

        beforeEach(() => {
            writtenHtml = "";
            originalWindow = globalThis.window;
            const mockPrintWindow = {
                document: {
                    write: vi.fn((html) => {
                        writtenHtml += html;
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

        it("avoids synthesizing fake random dispense codes and formats truthful placeholders", () => {
            printDispenseSlip({});

            expect(writtenHtml).toContain("PHIẾU XUẤT THUỐC BỆNH NHÂN (FEFO)");
            expect(writtenHtml).toContain("Chưa có mã phiếu xuất");
            expect(writtenHtml).toContain("Chưa có dữ liệu");
            expect(writtenHtml).toContain("Thời gian xuất: Chưa có dữ liệu");
            expect(writtenHtml).not.toMatch(/DISP-\d{6}/);
            expect(writtenHtml).toContain("word-break: break-word;");
        });
    });
});
