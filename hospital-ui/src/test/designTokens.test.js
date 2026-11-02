import { describe, it, expect } from "vitest";
import designTokens, { getStatusConfig } from "../theme/designTokens";

describe("Design Tokens & WCAG Palette (designTokens.js)", () => {
    it("defines essential brand colors according to healthcare standards", () => {
        expect(designTokens.brand.primary).toBeDefined();
        expect(designTokens.brand.primaryDark).toBeDefined();
        expect(designTokens.secondary.main).toBeDefined();
    });

    it("defines business status colors with background and border pairs", () => {
        expect(designTokens.status.success.main).toBeDefined();
        expect(designTokens.status.success.bg).toBeDefined();
        expect(designTokens.status.warning.main).toBeDefined();
        expect(designTokens.status.danger.main).toBeDefined();
        expect(designTokens.status.info.main).toBeDefined();
    });

    describe("getStatusConfig helper", () => {
        it("returns proper configuration for BOOKING domain status", () => {
            const confirmedConfig = getStatusConfig("BOOKING", "CONFIRMED");
            expect(confirmedConfig.label).toContain("Đã xác nhận");
            expect(confirmedConfig.chipColor).toBe("info");

            const pendingConfig = getStatusConfig("BOOKING", "PENDING");
            expect(pendingConfig.label).toContain("Chờ xác nhận");
            expect(pendingConfig.chipColor).toBe("warning");

            const cancelledConfig = getStatusConfig("BOOKING", "CANCELLED");
            expect(cancelledConfig.label).toContain("Đã hủy");
            expect(cancelledConfig.chipColor).toBe("error");
        });

        it("returns proper configuration for INPATIENT status", () => {
            const admittedConfig = getStatusConfig("INPATIENT", "ADMITTED");
            expect(admittedConfig.label).toContain("Đang điều trị");

            const dischargedConfig = getStatusConfig("INPATIENT", "DISCHARGED");
            expect(dischargedConfig.label).toContain("Đã xuất viện");
        });

        it("returns proper configuration for ACCOUNT status", () => {
            const activeConfig = getStatusConfig("ACCOUNT", "ACTIVE");
            expect(activeConfig.label).toBe("Hoạt động");
            expect(activeConfig.chipColor).toBe("success");

            const lockedConfig = getStatusConfig("ACCOUNT", "LOCKED");
            expect(lockedConfig.label).toBe("Đã khóa");
            expect(lockedConfig.chipColor).toBe("error");
        });

        it("handles unknown status with neutral fallback", () => {
            const fallback = getStatusConfig("UNKNOWN_DOMAIN", "UNKNOWN_STATUS");
            expect(fallback.chipColor).toBe("default");
            expect(fallback.label).toBe("UNKNOWN_STATUS");
        });
    });
});
