import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import ExaminationPage from "../pages/Doctor/ExaminationPage";

let mockUser = { userId: "doc-1", role: "ROLE_DOCTOR", fullName: "Bác Sĩ Test" };

vi.mock("../context/AuthContext", () => ({
    useAuth: () => ({
        user: mockUser,
        isAuthenticated: true,
        role: mockUser.role,
        isDoctor: mockUser.role === "ROLE_DOCTOR",
        isHeadOfDepartment: mockUser.role === "ROLE_HEAD_OF_DEPARTMENT" || mockUser.role === "ROLE_ADMIN"
    })
}));

describe("ExaminationPage render test", () => {
    it("renders without crashing for regular doctor", () => {
        mockUser = { userId: "doc-1", role: "ROLE_DOCTOR", fullName: "Bác Sĩ Test" };
        const html = renderToStaticMarkup(
            <MemoryRouter>
                <ExaminationPage />
            </MemoryRouter>
        );
        expect(html).toBeDefined();
        expect(html).toContain("Bàn Khám Bác Sĩ");
    });

    it("renders without crashing for head of department (with AdminPanelSettingsIcon)", () => {
        mockUser = { userId: "hod-1", role: "ROLE_HEAD_OF_DEPARTMENT", fullName: "Trưởng Khoa Test" };
        const html = renderToStaticMarkup(
            <MemoryRouter>
                <ExaminationPage />
            </MemoryRouter>
        );
        expect(html).toBeDefined();
        expect(html).toContain("Bàn Khám Bác Sĩ");
        expect(html).toContain("Lịch Trực");
    });

    it("renders without crashing for admin role", () => {
        mockUser = { userId: "admin-1", role: "ROLE_ADMIN", fullName: "Admin Test" };
        const html = renderToStaticMarkup(
            <MemoryRouter>
                <ExaminationPage />
            </MemoryRouter>
        );
        expect(html).toBeDefined();
        expect(html).toContain("Bàn Khám Bác Sĩ");
    });
});
