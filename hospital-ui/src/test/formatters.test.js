import { describe, it, expect } from "vitest";
import {
    formatCurrency,
    formatDate,
    formatDateTime,
    formatISODate,
    isValidPhoneNumber,
    isValidIdentityNumber,
    isValidHealthInsurance
} from "../utils/formatters";

describe("Utility Formatters (formatters.js)", () => {
    describe("formatCurrency", () => {
        it("formats standard amounts in VND format", () => {
            const formatted = formatCurrency(150000);
            expect(formatted).toContain("150");
            expect(formatted).toContain("đ");
        });

        it("handles zero, null, undefined, and non-numeric values safely", () => {
            expect(formatCurrency(0)).toBe("0 đ");
            expect(formatCurrency(null)).toBe("0 đ");
            expect(formatCurrency(undefined)).toBe("0 đ");
            expect(formatCurrency("invalid")).toBe("0 đ");
        });
    });

    describe("formatDate and formatDateTime", () => {
        it("formats ISO date string to Vietnamese date format", () => {
            const formatted = formatDate("2026-10-30T10:00:00Z");
            expect(formatted).toContain("30");
            expect(formatted).toContain("10");
            expect(formatted).toContain("2026");
        });

        it("handles empty or invalid dates gracefully", () => {
            expect(formatDate("")).toBe("");
            expect(formatDate(null)).toBe("");
            expect(formatDateTime("")).toBe("");
            expect(formatDateTime(null)).toBe("");
        });
    });

    describe("formatISODate", () => {
        it("converts Date object to YYYY-MM-DD", () => {
            const d = new Date(2026, 9, 30); // Month is 0-indexed: 9 = Oct
            expect(formatISODate(d)).toBe("2026-10-30");
        });

        it("returns empty string on falsy input", () => {
            expect(formatISODate(null)).toBe("");
            expect(formatISODate("")).toBe("");
        });
    });

    describe("Validation Regex Helpers", () => {
        it("validates Vietnamese phone numbers correctly", () => {
            expect(isValidPhoneNumber("0912345678")).toBe(true);
            expect(isValidPhoneNumber("0389998877")).toBe(true);
            expect(isValidPhoneNumber("0856781234")).toBe(true);
            expect(isValidPhoneNumber("0123456789")).toBe(false); // Invalid prefix 01
            expect(isValidPhoneNumber("1234567890")).toBe(false); // No leading 0
            expect(isValidPhoneNumber("091234567")).toBe(false);  // 9 digits
            expect(isValidPhoneNumber("")).toBe(false);
        });

        it("validates Citizen ID (CCCD/CMND) correctly", () => {
            expect(isValidIdentityNumber("001197008899")).toBe(true); // 12 digits CCCD
            expect(isValidIdentityNumber("012345678")).toBe(true);    // 9 digits CMND
            expect(isValidIdentityNumber("")).toBe(true);             // Optional empty
            expect(isValidIdentityNumber("12345")).toBe(false);       // Invalid length
            expect(isValidIdentityNumber("00119700889A")).toBe(false); // Non-digit
        });

        it("validates Health Insurance card number (BHYT) correctly", () => {
            expect(isValidHealthInsurance("DN4010900123456")).toBe(true);
            expect(isValidHealthInsurance("GD4797931400001")).toBe(true);
            expect(isValidHealthInsurance("")).toBe(true);            // Optional empty
            expect(isValidHealthInsurance("123")).toBe(false);         // Too short
        });
    });
});

