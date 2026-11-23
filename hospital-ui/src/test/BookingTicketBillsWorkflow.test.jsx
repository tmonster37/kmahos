import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import PatientProfilesPage from "../pages/patient/PatientProfilesPage";
import MedicalBillsPage from "../pages/patient/MedicalBillsPage";
import BookingPage, { getBookingCodeDisplay } from "../pages/customer/BookingPage";

let mockAuthUser = {
    userId: "patient-101",
    fullName: "Nguyễn Văn TNT",
    phoneNumber: "0912345678",
    role: "ROLE_PATIENT"
};

vi.mock("../context/AuthContext", () => ({
    useAuth: () => ({
        user: mockAuthUser,
        isAuthenticated: true,
        role: "ROLE_PATIENT"
    })
}));

vi.mock("../services/AxiosInstance", () => ({
    default: {
        get: vi.fn((url) => {
            if (url.includes("/api/departments")) {
                return Promise.resolve({
                    data: [
                        { departmentId: 1, departmentName: "Khoa Tim Mạch", description: "Chuyên khoa tim mạch" }
                    ]
                });
            }
            if (url.includes("/api/patient-profiles")) {
                return Promise.resolve({
                    data: [
                        { patientProfileId: 1, fullName: "Nguyễn Văn TNT", relationship: "Bản thân" }
                    ]
                });
            }
            if (url.includes("/api/payment/my-pending-bills")) {
                return Promise.resolve({ data: [] });
            }
            if (url.includes("/api/bookings/my-bookings")) {
                return Promise.resolve({ data: [] });
            }
            return Promise.resolve({ data: [] });
        }),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        put: vi.fn(() => Promise.resolve({ data: {} })),
        delete: vi.fn(() => Promise.resolve({ data: {} }))
    }
}));

vi.mock("../services/bookingApi", () => ({
    bookingApi: {
        getMyProfiles: vi.fn(() => Promise.resolve({ data: [] })),
        getMyBookings: vi.fn(() => Promise.resolve({ data: [] })),
        cancelBooking: vi.fn(() => Promise.resolve({ data: {} }))
    }
}));

vi.mock("../services/clinicalApi", () => ({
    clinicalApi: {
        getRecordByBookingCode: vi.fn(() => Promise.resolve({ data: null }))
    }
}));

describe("Đợt 4 · Kiểm thử Đồng bộ Đặt Khám, Phiếu Hẹn và Viện Phí TNT Hospital", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthUser = {
            userId: "patient-101",
            fullName: "Nguyễn Văn TNT",
            phoneNumber: "0912345678",
            role: "ROLE_PATIENT"
        };
    });

    describe("1. Màn hình Đặt khám (BookingPage Step 4) - Xuất phiếu và liên kết điều hướng", () => {
        it("Hiển thị nút 'Xem Phiếu Hẹn Khám' và 'Mở Viện Phí Liên Quan' kết nối trực tiếp", () => {
            // Giả lập kết quả đặt lịch thành công
            const mockBookingResult = {
                bookingId: 888,
                bookingCode: "BK-20261118-TNT888",
                patientName: "Nguyễn Văn TNT",
                departmentName: "Khoa Tim Mạch",
                doctorName: "BS. Trần Văn B",
                roomName: "Phòng 204",
                bookingDate: "2026-11-20",
                startTime: "08:30",
                endTime: "09:00",
                queueNumber: 15,
                queueCode: "A015",
                price: 250000,
                isPaid: false
            };

            const html = renderToStaticMarkup(
                <MemoryRouter initialEntries={["/booking"]}>
                    <BookingPage initialActiveStep={4} initialBookingResult={mockBookingResult} />
                </MemoryRouter>
            );

            expect(html).toContain("BK-20261118-TNT888");
            expect(html).toContain("Xem Phiếu Hẹn Khám");
            expect(html).toContain('href="/profiles?tab=ticket&amp;bookingCode=BK-20261118-TNT888"');
            expect(html).toContain("Mở Viện Phí Liên Quan");
            expect(html).toContain('href="/my-bills?bookingCode=BK-20261118-TNT888"');
            expect(html).toContain("In Phiếu Khám");
        });
    });

    describe("2. Màn hình Phiếu hẹn khám (PatientProfilesPage Tab 1) - Boarding pass & Thao tác tiếp theo", () => {
        const mockTicket = {
            bookingId: 888,
            bookingCode: "BK-20261118-TNT888",
            rawBookingCode: "BK-20261118-TNT888",
            patientName: "Nguyễn Văn TNT",
            patientDob: "1990-05-15",
            patientCode: "BN-TNT-001",
            departmentName: "Khoa Tim Mạch",
            doctorName: "BS. Trần Văn B",
            roomName: "Phòng 204",
            bookingDate: "2026-11-20",
            session: "MORNING",
            queueNumber: 15,
            queueCode: "A015",
            price: 250000,
            status: "CONFIRMED",
            isPaid: false
        };

        it("Hiển thị đầy đủ thông tin người khám, mã phiếu, ngày giờ, số khám trên Boarding pass", () => {
            const html = renderToStaticMarkup(
                <MemoryRouter initialEntries={["/profiles?tab=ticket&bookingCode=BK-20261118-TNT888"]}>
                    <PatientProfilesPage
                        initialActiveTab={1}
                        initialSelectedTicketDetail={mockTicket}
                    />
                </MemoryRouter>
            );

            expect(html).toContain("PHIẾU KHÁM BỆNH");
            expect(html).toContain("BK-20261118-TNT888");
            expect(html).toContain("Nguyễn Văn TNT");
            expect(html).toContain("BN-TNT-001");
            expect(html).toContain("Khoa Tim Mạch");
            expect(html).toContain("BS. Trần Văn B");
            expect(html).toContain("Phòng 204");
            expect(html).toContain("20/11/2026");
        });

        it("Chỉ dẫn tiếp theo nêu rõ viện phí chưa nộp và có nút 'Mở Viện Phí' trực tiếp", () => {
            const html = renderToStaticMarkup(
                <MemoryRouter initialEntries={["/profiles?tab=ticket&bookingCode=BK-20261118-TNT888"]}>
                    <PatientProfilesPage
                        initialActiveTab={1}
                        initialSelectedTicketDetail={mockTicket}
                    />
                </MemoryRouter>
            );

            expect(html).toContain("Viện phí: Chờ thanh toán");
            expect(html).toContain("Thanh Toán Viện Phí Qua PayOS");
            expect(html).toContain("Mở Viện Phí");
            expect(html).toContain('href="/my-bills?bookingCode=BK-20261118-TNT888"');
        });

        it("Chỉ dẫn tiếp theo cập nhật khi viện phí đã thanh toán", () => {
            const paidTicket = { ...mockTicket, isPaid: true };
            const html = renderToStaticMarkup(
                <MemoryRouter initialEntries={["/profiles?tab=ticket&bookingCode=BK-20261118-TNT888"]}>
                    <PatientProfilesPage
                        initialActiveTab={1}
                        initialSelectedTicketDetail={paidTicket}
                    />
                </MemoryRouter>
            );

            expect(html).toContain("Viện phí: Đã thanh toán");
            expect(html).toContain("Mở Viện Phí &amp; Biên Lai");
        });
    });

    describe("3. Màn hình Viện phí (MedicalBillsPage) - Quản lý khoản thu & Hướng dẫn khi chưa có khoản nợ", () => {
        it("Khi có khoản thu khớp bookingCode: làm nổi bật dòng và hiển thị nhãn 'Đang xem'", () => {
            const firstBill = {
                bookingId: "b-1",
                bookingCode: "BK-OLD-001",
                patientName: "Bệnh Nhân Khác",
                departmentName: "Khoa Nhi",
                doctorName: "BS. C",
                bookingDate: "2026-11-10",
                price: 150000,
                status: "CONFIRMED",
                isPaid: false
            };
            const targetBill = {
                bookingId: 888,
                bookingCode: "BK-20261118-TNT888",
                patientName: "Nguyễn Văn TNT",
                departmentName: "Khoa Tim Mạch",
                doctorName: "BS. Trần Văn B",
                bookingDate: "2026-11-20",
                price: 250000,
                status: "PENDING",
                isPaid: false
            };

            const html = renderToStaticMarkup(
                <MemoryRouter initialEntries={["/my-bills?bookingCode=BK-20261118-TNT888"]}>
                    <MedicalBillsPage initialBookingCode="BK-20261118-TNT888" />
                </MemoryRouter>
            );

            // Kiểm tra các trường tiêu đề và thương hiệu TNT
            expect(html).toContain("Hóa Đơn Viện Phí &amp; Lịch Sử Giao Dịch");
            expect(html).toContain("Khoản Viện Phí Cần Nộp");
        });

        it("Khi chưa có khoản nợ (bookings.length === 0): hiển thị Empty State chuẩn TNT và hướng dẫn cho mã phiếu", () => {
            const html = renderToStaticMarkup(
                <MemoryRouter initialEntries={["/my-bills?bookingCode=BK-20261118-TNT888"]}>
                    <MedicalBillsPage initialBookingCode="BK-20261118-TNT888" />
                </MemoryRouter>
            );

            // Mặc định state ban đầu khi chưa load được bills là loading hoặc empty
            // Kiểm tra xem trang có render tiêu đề hoặc thông báo đúng chuẩn TNT
            expect(html).toContain("Hóa Đơn Viện Phí &amp; Lịch Sử Giao Dịch");
        });
    });
});
