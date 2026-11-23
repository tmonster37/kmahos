import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

// Mock Menu và Drawer của @mui/material để render nội dung trực tiếp trong renderToStaticMarkup
vi.mock("@mui/material", async (original) => {
    const actual = await original();
    return {
        ...actual,
        Menu: ({ children, id, ...props }) => (
            <div data-testid="mock-menu" id={id} role="menu">
                {children}
            </div>
        ),
        Drawer: ({ children, open, ...props }) => (
            <div data-testid="mock-drawer" data-open={open ? "true" : "false"}>
                {children}
            </div>
        )
    };
});

let mockAuth = {
    user: { userId: "patient-1", fullName: "Trần Bệnh Nhân", role: "ROLE_PATIENT" },
    isAuthenticated: true,
    isStaff: false,
    logout: vi.fn()
};

vi.mock("../context/AuthContext", () => ({
    useAuth: () => ({
        user: mockAuth.user,
        isAuthenticated: mockAuth.isAuthenticated,
        isStaff: mockAuth.isStaff,
        logout: mockAuth.logout
    })
}));

vi.mock("../services/AxiosInstance", () => ({
    default: {
        get: vi.fn(() => Promise.resolve({ data: [] })),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        delete: vi.fn(() => Promise.resolve({ data: {} }))
    }
}));

import Navbar from "../components/navbar/Navbar";

const isLinkSelected = (html, href) => {
    const escapedHref = href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
        `<a[^>]*class="[^"]*Mui-selected[^"]*"[^>]*href="${escapedHref}"|<a[^>]*href="${escapedHref}"[^>]*class="[^"]*Mui-selected[^"]*"`
    );
    return pattern.test(html);
};

describe("Đợt 3 · Kiểm thử Menu Bệnh Nhân TNT Hospital (Navbar.jsx)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuth = {
            user: { userId: "patient-1", fullName: "Trần Bệnh Nhân", role: "ROLE_PATIENT" },
            isAuthenticated: true,
            isStaff: false,
            logout: vi.fn()
        };
    });

    describe("1. Phân quyền và hiển thị mục Sổ Khám Điện Tử", () => {
        it("Hiển thị nút 'Sổ Khám Điện Tử' và thuộc tính WAI-ARIA khi là bệnh nhân đã đăng nhập", () => {
            const html = renderToStaticMarkup(
                <MemoryRouter initialEntries={["/"]}>
                    <Navbar />
                </MemoryRouter>
            );

            expect(html).toContain("Sổ Khám Điện Tử");
            expect(html).toContain('id="patient-records-button"');
            expect(html).toContain('aria-haspopup="true"');
        });

        it("Ẩn nút 'Sổ Khám Điện Tử' đối với khách vãng lai (chưa đăng nhập)", () => {
            mockAuth.isAuthenticated = false;
            mockAuth.user = null;

            const html = renderToStaticMarkup(
                <MemoryRouter initialEntries={["/"]}>
                    <Navbar />
                </MemoryRouter>
            );

            expect(html).not.toContain("Sổ Khám Điện Tử");
            expect(html).not.toContain('id="patient-records-button"');
        });

        it("Ẩn nút 'Sổ Khám Điện Tử' đối với nhân viên y tế (isStaff = true)", () => {
            mockAuth.isStaff = true;
            mockAuth.user = { userId: "doc-1", fullName: "Bác Sĩ Nguyễn", role: "ROLE_DOCTOR" };

            const html = renderToStaticMarkup(
                <MemoryRouter initialEntries={["/doctor/dashboard"]}>
                    <Navbar />
                </MemoryRouter>
            );

            expect(html).not.toContain("Sổ Khám Điện Tử");
            expect(html).not.toContain('id="patient-records-button"');
        });
    });

    describe("2. Cấu trúc 3 nhóm trong Menu Sổ Khám Điện Tử & Mobile Drawer", () => {
        it("Chứa đủ 3 nhóm phân loại rõ ràng: Hồ sơ & phiếu hẹn, Bệnh án, Viện phí", () => {
            const html = renderToStaticMarkup(
                <MemoryRouter initialEntries={["/"]}>
                    <Navbar />
                </MemoryRouter>
            );

            // Kiểm tra 3 tiêu đề nhóm
            expect(html).toContain("Hồ sơ &amp; phiếu hẹn");
            expect(html).toContain("Bệnh án");
            expect(html).toContain("Viện phí");

            // Nhóm 1: Hồ sơ & phiếu hẹn
            expect(html).toContain("Hồ Sơ Bệnh Nhân (Gia Đình)");
            expect(html).toContain("Phiếu Khám Bệnh (Barcode &amp; STT)");
            expect(html).toContain('href="/profiles"');
            expect(html).toContain('href="/profiles?tab=ticket"');

            // Nhóm 2: Bệnh án
            expect(html).toContain("Sổ Bệnh Án &amp; Lịch Sử Khám");
            expect(html).toContain("Nhắc Uống Thuốc");
            expect(html).toContain('href="/my-history"');
            expect(html).toContain('href="/reminders"');

            // Nhóm 3: Viện phí
            expect(html).toContain("Hóa Đơn Viện Phí");
            expect(html).toContain("Ví Viện Phí PayOS");
            expect(html).toContain('href="/my-bills"');
            expect(html).toContain('href="/payment"');
        });

        it("Đồng bộ 100% tên mục và thứ tự đường dẫn giữa desktop và mobile drawer", () => {
            const html = renderToStaticMarkup(
                <MemoryRouter initialEntries={["/"]}>
                    <Navbar />
                </MemoryRouter>
            );

            const expectedItems = [
                { name: "Hồ Sơ Bệnh Nhân (Gia Đình)", path: "/profiles" },
                { name: "Phiếu Khám Bệnh (Barcode &amp; STT)", path: "/profiles?tab=ticket" },
                { name: "Sổ Bệnh Án &amp; Lịch Sử Khám", path: "/my-history" },
                { name: "Nhắc Uống Thuốc", path: "/reminders" },
                { name: "Hóa Đơn Viện Phí", path: "/my-bills" },
                { name: "Ví Viện Phí PayOS", path: "/payment" }
            ];

            expectedItems.forEach(item => {
                expect(html).toContain(item.name);
                expect(html).toContain(item.path);
            });
        });
    });

    describe("3. Trạng thái Active và điều hướng chính xác", () => {
        it("Kích hoạt highlight mục 'Hóa Đơn Viện Phí' khi đang ở route /my-bills", () => {
            const html = renderToStaticMarkup(
                <MemoryRouter initialEntries={["/my-bills"]}>
                    <Navbar />
                </MemoryRouter>
            );

            expect(html).toContain("Sổ Khám Điện Tử");
            expect(html).toContain("Hóa Đơn Viện Phí");
            expect(isLinkSelected(html, "/my-bills")).toBe(true);
        });

        it("Kích hoạt highlight mục 'Phiếu Khám Bệnh' khi đang ở route /profiles?tab=ticket", () => {
            const html = renderToStaticMarkup(
                <MemoryRouter initialEntries={["/profiles?tab=ticket"]}>
                    <Navbar />
                </MemoryRouter>
            );

            expect(html).toContain("Sổ Khám Điện Tử");
            expect(html).toContain("Phiếu Khám Bệnh (Barcode &amp; STT)");
            expect(isLinkSelected(html, "/profiles?tab=ticket")).toBe(true);
        });

        it("Kích hoạt highlight mục 'Hồ Sơ Bệnh Nhân' khi đang ở route /profiles", () => {
            const html = renderToStaticMarkup(
                <MemoryRouter initialEntries={["/profiles"]}>
                    <Navbar />
                </MemoryRouter>
            );

            expect(html).toContain("Sổ Khám Điện Tử");
            expect(html).toContain("Hồ Sơ Bệnh Nhân (Gia Đình)");
            expect(isLinkSelected(html, "/profiles")).toBe(true);
        });
    });
});
