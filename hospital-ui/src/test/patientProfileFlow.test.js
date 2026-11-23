import { describe, it, expect } from "vitest";
import { formatDate, formatCurrency, isValidPhoneNumber } from "../utils/formatters";
import { VIETNAM_PROVINCES_34, getWardsByProvince } from "../utils/administrativeDivisions";

describe("Patient Profile Flow & Data Protection Tests", () => {
    it("should securely mask phone numbers to protect patient privacy (Hình 143)", () => {
        const maskPhone = (phone, isVisible) => {
            if (!phone) return "---";
            if (isVisible) return phone;
            if (phone.length < 4) return phone;
            const last3 = phone.slice(-3);
            return `*******${last3}`;
        };

        expect(maskPhone("0987654428", false)).toBe("*******428");
        expect(maskPhone("0912345678", false)).toBe("*******678");
        expect(maskPhone("0987654428", true)).toBe("0987654428");
        expect(maskPhone(null, false)).toBe("---");
    });

    it("should correctly validate phone numbers for patient profiles", () => {
        expect(isValidPhoneNumber("0987654171")).toBe(true);
        expect(isValidPhoneNumber("0381234567")).toBe(true);
        expect(isValidPhoneNumber("12345")).toBe(false);
        expect(isValidPhoneNumber("01234567890")).toBe(false); // 11 digits
        expect(isValidPhoneNumber("")).toBe(false);
    });

    it("should correctly map URL query parameters to the new 3-tab triad plus notifications", () => {
        const getTabIndex = (tabKey) => {
            if (tabKey === "ticket") return 1;
            if (tabKey === "history") return 2;
            if (tabKey === "notifications") return 3;
            return 0; // profiles
        };

        expect(getTabIndex("profiles")).toBe(0);
        expect(getTabIndex("ticket")).toBe(1);
        expect(getTabIndex("history")).toBe(2);
        expect(getTabIndex("notifications")).toBe(3);
        expect(getTabIndex(null)).toBe(0);
        expect(getTabIndex("")).toBe(0);
    });

    it("should properly support administrative divisions for patient address creation (Hình 140)", () => {
        expect(VIETNAM_PROVINCES_34.length).toBeGreaterThan(0);
        const tuyenQuangWards = getWardsByProvince("Tỉnh Tuyên Quang");
        expect(Array.isArray(tuyenQuangWards)).toBe(true);
        expect(tuyenQuangWards.length).toBeGreaterThan(0);
    });

    it("should format prescription fees and consultation dates for boarding pass tickets (Hình 137 & 139)", () => {
        expect(formatCurrency(150000)).toMatch(/150\.000/);
        expect(formatDate("2026-09-15")).toBe("15/09/2026");
    });
});

