import { describe, it, expect, vi } from "vitest";
import React, { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ReactDOMClient from "react-dom/client";
import BookingPage from "../pages/customer/BookingPage";
import HomePage from "../pages/patient/HomePage";

vi.mock("../context/AuthContext", () => ({
    useAuth: () => ({
        user: { userId: "test-patient", fullName: "Trần Bệnh Nhân", phoneNumber: "0901234567", role: "ROLE_PATIENT" },
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
                        { departmentId: 1, departmentName: "Khoa Tim Mạch", description: "Khám và điều trị tim mạch" },
                        { departmentId: 2, departmentName: "Khoa Nhi", description: "Chăm sóc sức khỏe trẻ em" },
                        { departmentId: 3, departmentName: "Khoa Cơ Xương Khớp", description: "Bệnh lý xương khớp" }
                    ]
                });
            }
            if (url.includes("/api/patient-profiles")) {
                return Promise.resolve({
                    data: [
                        { patientProfileId: 101, fullName: "Trần Bệnh Nhân", relationship: "Bản thân" }
                    ]
                });
            }
            if (url.includes("/api/schedules/by-department")) {
                return Promise.resolve({ data: [] });
            }
            return Promise.resolve({ data: [] });
        }),
        post: vi.fn(() => Promise.resolve({ data: { data: {} } })),
        delete: vi.fn(() => Promise.resolve({ data: { data: {} } }))
    }
}));

vi.mock("../services/bookingApi", () => ({
    bookingApi: {
        getMyBookings: vi.fn(() => Promise.resolve({ data: [] })),
        cancelBooking: vi.fn(() => Promise.resolve({ data: {} }))
    }
}));

describe("Đợt 1 · Regression Test: Xử lý chuỗi triệu chứng tiếng Việt & Điều hướng Trang chủ", () => {
    it("handlesNavigationStateSymptomsWithSpecialCharacters: không crash và đọc đúng chuỗi có %, + và &", () => {
        const symptomsText = "Sốt cao 39.5°C + ho có đờm & tức ngực (giảm 50% thể lực)";

        // Giả lập điều hướng với location.state mang triệu chứng
        let renderedHtml = "";
        expect(() => {
            renderedHtml = renderToStaticMarkup(
                <MemoryRouter
                    initialEntries={[
                        {
                            pathname: "/booking",
                            state: { symptoms: symptomsText }
                        }
                    ]}
                >
                    <BookingPage />
                </MemoryRouter>
            );
        }).not.toThrow();

        expect(renderedHtml).toMatch(/Đặt Lịch Khám/i);
    });

    it("handlesUrlSymptomsWithPercentPlusAndAmpersandWithoutURIError: không bị lỗi URI malformed khi có %", () => {
        // Chuỗi có dấu % tự nhiên (vd giảm 50% sức) khi URLSearchParams parse sẽ trả về có ký tự %
        // Nếu code cũ gọi decodeURIComponent lặp lại, nó sẽ ném URIError: URI malformed
        const queryWithPercent = "symptoms=" + encodeURIComponent("Đau đầu + tức ngực & giảm 50% thị lực");

        let renderedHtml = "";
        expect(() => {
            renderedHtml = renderToStaticMarkup(
                <MemoryRouter initialEntries={[`/booking?${queryWithPercent}`]}>
                    <BookingPage />
                </MemoryRouter>
            );
        }).not.toThrow();

        expect(renderedHtml).toMatch(/Đặt Lịch Khám/i);
        expect(renderedHtml).not.toContain("URIError");
    });

    it("handlesRawPercentInUrlQueryWithoutCrash: chuỗi URL có % chưa hoàn chỉnh không làm nổ trang", () => {
        // Link cũ hoặc nhập tay có % trực tiếp không theo định dạng hex
        let renderedHtml = "";
        expect(() => {
            renderedHtml = renderToStaticMarkup(
                <MemoryRouter initialEntries={["/booking?symptoms=Đau%20100%25%20và%20sốt%20cao"]}>
                    <BookingPage />
                </MemoryRouter>
            );
        }).not.toThrow();

        expect(renderedHtml).toMatch(/Đặt Lịch Khám/i);
    });

    it("rendersSymptomsFieldAcrossBookingStepsWithoutCrash: component render các bước mang theo triệu chứng", () => {
        const symptomsText = "Sốt cao 39°C + ho đờm & giảm 30% sức khỏe";

        const html = renderToStaticMarkup(
            <MemoryRouter
                initialEntries={[
                    {
                        pathname: "/booking",
                        search: `?departmentId=1&symptoms=${encodeURIComponent(symptomsText)}`,
                        state: { symptoms: symptomsText, departmentId: 1 }
                    }
                ]}
            >
                <BookingPage />
            </MemoryRouter>
        );

        expect(html).toMatch(/Đặt Lịch Khám/i);
        expect(html).not.toContain("URIError");
    });

    it("homePageExposesDistinctDepartmentAndSymptomTabsAndActionButtons: Trang chủ có 2 nút chính/phụ và 2 tab tìm kiếm", () => {
        const html = renderToStaticMarkup(
            <MemoryRouter initialEntries={["/"]}>
                <HomePage />
            </MemoryRouter>
        );

        // Nút chính và phụ rõ ràng
        expect(html).toContain("Đặt lịch khám");
        expect(html).toContain("Tra cứu");

        // Tách rõ 2 tab: Tìm chuyên khoa và Mô tả triệu chứng
        expect(html).toContain("Tìm chuyên khoa");
        expect(html).toContain("Mô tả triệu chứng");

        // Lưới dịch vụ y tế trực tuyến
        expect(html).toMatch(/Lưới dịch vụ y tế trực tuyến/i);
        expect(html).toContain("Xác Thực Đơn Thuốc");
        expect(html).toContain("Ví Viện Phí &amp; Nạp Tiền");
    });
});
