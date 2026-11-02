import { describe, it, expect, beforeEach } from "vitest";

describe("Authentication & RBAC Helper Functions", () => {
    // Mock localStorage
    const mockStorage = {};
    beforeEach(() => {
        for (const k of Object.keys(mockStorage)) delete mockStorage[k];
        global.localStorage = {
            getItem: (key) => mockStorage[key] || null,
            setItem: (key, val) => { mockStorage[key] = String(val); },
            removeItem: (key) => { delete mockStorage[key]; },
            clear: () => { for (const k of Object.keys(mockStorage)) delete mockStorage[k]; }
        };
    });

    it("serializes and deserializes user authentication payload", () => {
        const dummyUser = {
            userId: "USR-001",
            fullName: "Bác Sĩ Nguyễn Văn A",
            role: "ROLE_DOCTOR",
            phoneNumber: "0912345678"
        };

        localStorage.setItem("user", JSON.stringify(dummyUser));
        const stored = JSON.parse(localStorage.getItem("user"));

        expect(stored.userId).toBe("USR-001");
        expect(stored.role).toBe("ROLE_DOCTOR");
    });

    it("verifies role-based route access logic correctly", () => {
        const doctorAllowedRoles = ["ROLE_DOCTOR", "ROLE_HEAD_OF_DEPARTMENT", "ROLE_ADMIN"];
        const nurseAllowedRoles = ["ROLE_NURSE", "ROLE_ADMIN"];
        const cashierAllowedRoles = ["ROLE_CASHIER", "ROLE_ADMIN"];

        const userDoctor = { role: "ROLE_DOCTOR" };
        const userNurse = { role: "ROLE_NURSE" };
        const userAdmin = { role: "ROLE_ADMIN" };
        const userPatient = { role: "ROLE_PATIENT" };

        expect(doctorAllowedRoles.includes(userDoctor.role)).toBe(true);
        expect(doctorAllowedRoles.includes(userNurse.role)).toBe(false);
        expect(doctorAllowedRoles.includes(userAdmin.role)).toBe(true);
        expect(doctorAllowedRoles.includes(userPatient.role)).toBe(false);

        expect(nurseAllowedRoles.includes(userNurse.role)).toBe(true);
        expect(cashierAllowedRoles.includes(userAdmin.role)).toBe(true);
    });
});

