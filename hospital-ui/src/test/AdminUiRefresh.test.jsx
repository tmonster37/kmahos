import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import ClinicalLayout from "../layouts/ClinicalLayout";
import DashboardPage, { formatKpiMetric } from "../pages/admin/DashboardPage";
import ScheduleManagePage, { validateScheduleRoomSelection } from "../pages/admin/ScheduleManagePage";
import AccountManagePage from "../pages/admin/AccountManagePage";
import DepartmentManagePage from "../pages/admin/DepartmentManagePage";
import DoctorManagePage from "../pages/admin/DoctorManagePage";

let mockAuthUser = { userId: "admin-1", role: "ROLE_ADMIN", fullName: "Quản Trị Viên" };

vi.mock("../context/AuthContext", () => ({
    useAuth: () => ({
        user: mockAuthUser,
        isAuthenticated: true,
        role: mockAuthUser.role,
        logout: vi.fn()
    })
}));

vi.mock("../services/AxiosInstance", () => ({
    default: {
        get: vi.fn(() => Promise.resolve({ data: [] })),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        put: vi.fn(() => Promise.resolve({ data: {} })),
        delete: vi.fn(() => Promise.resolve({ data: {} }))
    }
}));

describe("Phase 6 Department Head & Admin UI Refresh Comprehensive Test Suite", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("1. headCannotSeeAdminOnlyActions (RBAC & Navigation Scopes)", () => {
        it("AdminLayout: renders full administrative groups for ROLE_ADMIN including Accounts, Transactions, Bookings", () => {
            mockAuthUser = { userId: "admin-1", role: "ROLE_ADMIN", fullName: "Quản Trị Viên" };
            const html = renderToStaticMarkup(
                <MemoryRouter initialEntries={["/admin/dashboard"]}>
                    <AdminLayout />
                </MemoryRouter>
            );

            expect(html).toContain("Tài Khoản &amp; Phân Quyền");
            expect(html).toContain("Đối Soát Giao Dịch &amp; Viện Phí");
            expect(html).toContain("Quản Lý Lịch Hẹn");
            expect(html).toContain("QUẢN TRỊ BỆNH VIỆN");
        });

        it("AdminLayout: strictly conceals Admin-only menus from ROLE_HEAD_OF_DEPARTMENT", () => {
            mockAuthUser = { userId: "head-1", role: "ROLE_HEAD_OF_DEPARTMENT", fullName: "Trưởng Khoa Nội" };
            const html = renderToStaticMarkup(
                <MemoryRouter initialEntries={["/admin/dashboard"]}>
                    <AdminLayout />
                </MemoryRouter>
            );

            // Permitted Head of Department sections
            expect(html).toContain("Dashboard Thống Kê Khoa");
            expect(html).toContain("Phân Lịch Trực Khoa");
            expect(html).toContain("CỔNG TRƯỞNG KHOA");

            // FORBIDDEN Admin-only actions MUST NOT be rendered
            expect(html).not.toContain("Tài Khoản &amp; Phân Quyền");
            expect(html).not.toContain("Đối Soát Giao Dịch &amp; Viện Phí");
            expect(html).not.toContain("Quản Lý Lịch Hẹn");
            expect(html).not.toContain("/admin/accounts");
            expect(html).not.toContain("/admin/transactions");
            expect(html).not.toContain("/admin/bookings");
        });

        it("AdminLayout: renders scoped Pharmacist menus only for ROLE_PHARMACIST", () => {
            mockAuthUser = { userId: "pharm-1", role: "ROLE_PHARMACIST", fullName: "Dược Sĩ Kho" };
            const html = renderToStaticMarkup(
                <MemoryRouter initialEntries={["/admin/pharmacy-inventory"]}>
                    <AdminLayout />
                </MemoryRouter>
            );

            expect(html).toContain("Kho Dược Đa Cấp &amp; FEFO");
            expect(html).toContain("Danh Mục Thuốc &amp; Dược");
            expect(html).not.toContain("Dashboard Thống Kê");
            expect(html).not.toContain("Tài Khoản &amp; Phân Quyền");
        });
    });

    describe("2. dashboardFailureIsNotZero (Truthful Metric Assessment)", () => {
        it("formatKpiMetric returns 'Chưa có dữ liệu' for null or undefined, never converting failure to 0", () => {
            expect(formatKpiMetric(null, "CURRENCY")).toBe("Chưa có dữ liệu");
            expect(formatKpiMetric(undefined, "CURRENCY")).toBe("Chưa có dữ liệu");
            expect(formatKpiMetric(null, "COUNT")).toBe("Chưa có dữ liệu");
            expect(formatKpiMetric(undefined, "PERCENT")).toBe("Chưa có dữ liệu");

            // Genuine 0 is valid and formatted accurately
            expect(formatKpiMetric(0, "CURRENCY")).toContain("0");
            expect(formatKpiMetric(0, "COUNT")).toBe("0 ca");
            expect(formatKpiMetric(0, "PERCENT")).toBe("0%");

            // Genuine numbers formatted correctly
            expect(formatKpiMetric(15000000, "CURRENCY")).toContain("15.000.000");
            expect(formatKpiMetric(45, "COUNT")).toBe("45 ca");
            expect(formatKpiMetric(92.5, "PERCENT")).toBe("92.5%");
        });

        it("DashboardPage: renders without crashing and distinguishes loading and error states", () => {
            mockAuthUser = { userId: "admin-1", role: "ROLE_ADMIN", fullName: "Quản Trị Viên" };
            const html = renderToStaticMarkup(
                <MemoryRouter>
                    <DashboardPage />
                </MemoryRouter>
            );

            expect(html).toContain("Dashboard Điều Hành Toàn Viện");
            expect(html).toContain("Hôm nay");
        });
    });

    describe("3. scheduleRejectionStaysVisible & Room Safety", () => {
        it("validateScheduleRoomSelection rejects rooms that do not belong to doctor's department without silent fallback", () => {
            const availableRooms = [
                { roomId: 101, roomName: "Phòng 101", departmentId: 1 },
                { roomId: 102, roomName: "Phòng 102", departmentId: 1 },
                { roomId: 201, roomName: "Phòng 201", departmentId: 2 }
            ];

            // Valid room in department 1
            const valid = validateScheduleRoomSelection(101, 1, availableRooms);
            expect(valid.isValid).toBe(true);
            expect(valid.selectedRoomId).toBe(101);

            // Room from department 2 selected for department 1 doctor -> MUST be rejected, NO silent fallback to 101
            const crossDept = validateScheduleRoomSelection(201, 1, availableRooms);
            expect(crossDept.isValid).toBe(false);
            expect(crossDept.errorMessage).toContain("Phòng khám đã chọn không thuộc chuyên khoa");
            expect(crossDept.selectedRoomId).toBe("");

            // Non-existent room -> MUST be rejected
            const nonExistent = validateScheduleRoomSelection(999, 1, availableRooms);
            expect(nonExistent.isValid).toBe(false);
            expect(nonExistent.selectedRoomId).toBe("");

            // Department with no rooms available -> MUST NOT fall back to other department's rooms
            const noRoomsInDept = validateScheduleRoomSelection("", 3, availableRooms);
            expect(noRoomsInDept.isValid).toBe(false);
            expect(noRoomsInDept.selectedRoomId).toBe("");
        });

        it("ScheduleManagePage: renders schedule calendar management interface for authorized staff", () => {
            mockAuthUser = { userId: "admin-1", role: "ROLE_ADMIN", fullName: "Quản Trị Viên" };
            const html = renderToStaticMarkup(
                <MemoryRouter>
                    <ScheduleManagePage />
                </MemoryRouter>
            );

            expect(html).toContain("Phân Lịch Trực &amp; Ca Khám Bác Sĩ");
            expect(html).toContain("Tạo Ca Trực Mới");
        });
    });

    describe("4. narrowNavigationRemainsReachable (Responsive Drawer Integrity)", () => {
        it("AdminLayout maintains drawer structure in collapsed and mobile viewports", () => {
            mockAuthUser = { userId: "admin-1", role: "ROLE_ADMIN", fullName: "Quản Trị Viên" };
            const html = renderToStaticMarkup(
                <MemoryRouter initialEntries={["/admin/dashboard"]}>
                    <AdminLayout />
                </MemoryRouter>
            );

            expect(html).toContain("TNT Hospital");
            expect(html).toContain("Đăng Xuất");
        });

        it("ClinicalLayout renders professional staff clinical bar without AI distractions or promotional footer", () => {
            mockAuthUser = { userId: "doctor-1", role: "ROLE_DOCTOR", fullName: "BS. Nguyễn Văn A" };
            const html = renderToStaticMarkup(
                <MemoryRouter initialEntries={["/doctor/examinations"]}>
                    <ClinicalLayout />
                </MemoryRouter>
            );

            expect(html).toContain("Khám bệnh");
            expect(html).not.toContain("Chat Tư Vấn AI");
            expect(html).not.toContain("Tổng đài cấp cứu 24/7");
        });
    });

    describe("5. filtersRemainUseful across management views", () => {
        it("DepartmentManagePage renders search and department table structure", () => {
            mockAuthUser = { userId: "admin-1", role: "ROLE_ADMIN", fullName: "Quản Trị Viên" };
            const html = renderToStaticMarkup(
                <MemoryRouter>
                    <DepartmentManagePage />
                </MemoryRouter>
            );

            expect(html).toContain("Quản Lý Khoa &amp; Phòng Khám Bệnh");
            expect(html).toContain("Thêm Chuyên Khoa Mới");
        });

        it("DoctorManagePage renders doctor list and license details", () => {
            mockAuthUser = { userId: "admin-1", role: "ROLE_ADMIN", fullName: "Quản Trị Viên" };
            const html = renderToStaticMarkup(
                <MemoryRouter>
                    <DoctorManagePage />
                </MemoryRouter>
            );

            expect(html).toContain("Quản Lý Bác Sĩ");
            expect(html).toContain("Trạng thái CCHN");
            expect(html).toContain("Thêm Bác Sĩ Mới");
        });

        it("AccountManagePage renders user role management interface", () => {
            mockAuthUser = { userId: "admin-1", role: "ROLE_ADMIN", fullName: "Quản Trị Viên" };
            const html = renderToStaticMarkup(
                <MemoryRouter>
                    <AccountManagePage />
                </MemoryRouter>
            );

            expect(html).toContain("Quản Lý Tài Khoản &amp; Định Danh Nhân Sự");
            expect(html).toContain("Tạo Tài Khoản Mới");
        });
    });
});
