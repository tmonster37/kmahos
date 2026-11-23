import { describe, it, expect } from "vitest";
import { getUpcomingFollowUps, formatFollowUpDate, isValidDateOnly, isLeapYear } from "../utils/followUpSchedule";

describe("followUpSchedule helper tests", () => {
    const today = "2026-11-15";

    it("includes recommendations on future date and today", () => {
        const profiles = [
            {
                patientProfileId: "prof-1",
                fullName: "Nguyễn Văn A",
                records: [
                    {
                        recordId: "rec-today",
                        patientProfileId: "prof-1",
                        patientName: "Nguyễn Văn A",
                        doctorName: "BS. Trần B",
                        treatmentPlan: "Tái khám kiểm tra huyết áp",
                        reExaminationDate: "2026-11-15",
                        state: "DONE"
                    },
                    {
                        recordId: "rec-future",
                        patientProfileId: "prof-1",
                        patientName: "Nguyễn Văn A",
                        doctorName: "BS. Trần B",
                        treatmentPlan: "Nội soi dạ dày tái khám",
                        reExaminationDate: "2026-11-20",
                        state: "DONE"
                    }
                ]
            }
        ];

        const result = getUpcomingFollowUps(profiles, today);
        expect(result).toHaveLength(2);
        expect(result[0].recordId).toBe("rec-today");
        expect(result[1].recordId).toBe("rec-future");
    });

    it("excludes past dates", () => {
        const profiles = [
            {
                patientProfileId: "prof-1",
                fullName: "Nguyễn Văn A",
                records: [
                    {
                        recordId: "rec-past",
                        reExaminationDate: "2026-11-14",
                        state: "DONE"
                    }
                ]
            }
        ];

        const result = getUpcomingFollowUps(profiles, today);
        expect(result).toHaveLength(0);
    });

    it("excludes null, undefined, or empty dates without fabricating dates", () => {
        const profiles = [
            {
                patientProfileId: "prof-1",
                fullName: "Nguyễn Văn A",
                records: [
                    { recordId: "rec-null", reExaminationDate: null, state: "DONE" },
                    { recordId: "rec-undef", reExaminationDate: undefined, state: "DONE" },
                    { recordId: "rec-empty", reExaminationDate: "", state: "DONE" }
                ]
            }
        ];

        const result = getUpcomingFollowUps(profiles, today);
        expect(result).toHaveLength(0);
    });

    it("excludes malformed dates", () => {
        const profiles = [
            {
                patientProfileId: "prof-1",
                fullName: "Nguyễn Văn A",
                records: [
                    { recordId: "rec-bad1", reExaminationDate: "2026/11/20", state: "DONE" },
                    { recordId: "rec-bad2", reExaminationDate: "invalid-date", state: "DONE" },
                    { recordId: "rec-bad3", reExaminationDate: "2026-13-40", state: "DONE" },
                    { recordId: "rec-bad4", reExaminationDate: "2026-11", state: "DONE" }
                ]
            }
        ];

        const result = getUpcomingFollowUps(profiles, today);
        expect(result).toHaveLength(0);
    });

    it("strictly rejects non-existent calendar dates like 2026-02-30 and 2025-02-29 while accepting valid leap years like 2024-02-29", () => {
        // Direct validation function tests
        expect(isValidDateOnly("2026-02-30")).toBe(false);
        expect(isValidDateOnly("2025-02-29")).toBe(false);
        expect(isValidDateOnly("2026-04-31")).toBe(false);
        expect(isValidDateOnly("2026-06-31")).toBe(false);
        expect(isValidDateOnly("2026-09-31")).toBe(false);
        expect(isValidDateOnly("2026-11-31")).toBe(false);
        expect(isValidDateOnly("1900-02-29")).toBe(false);

        // Valid dates
        expect(isValidDateOnly("2024-02-29")).toBe(true);
        expect(isValidDateOnly("2000-02-29")).toBe(true);
        expect(isValidDateOnly("2026-02-28")).toBe(true);
        expect(isValidDateOnly("2026-01-31")).toBe(true);
        expect(isValidDateOnly("2026-04-30")).toBe(true);

        // Leap year utility
        expect(isLeapYear(2024)).toBe(true);
        expect(isLeapYear(2025)).toBe(false);
        expect(isLeapYear(2026)).toBe(false);
        expect(isLeapYear(2000)).toBe(true);
        expect(isLeapYear(1900)).toBe(false);

        // getUpcomingFollowUps ignores non-existent calendar dates
        const profiles = [
            {
                patientProfileId: "prof-1",
                fullName: "Nguyễn Văn A",
                records: [
                    { recordId: "rec-fake-feb30", reExaminationDate: "2027-02-30", state: "DONE" },
                    { recordId: "rec-fake-feb29", reExaminationDate: "2027-02-29", state: "DONE" },
                    { recordId: "rec-fake-apr31", reExaminationDate: "2027-04-31", state: "DONE" },
                    { recordId: "rec-valid-leap", reExaminationDate: "2028-02-29", state: "DONE" }
                ]
            }
        ];

        const result = getUpcomingFollowUps(profiles, today);
        expect(result).toHaveLength(1);
        expect(result[0].recordId).toBe("rec-valid-leap");
    });

    it("excludes incomplete examination states (only DONE is included)", () => {
        const profiles = [
            {
                patientProfileId: "prof-1",
                fullName: "Nguyễn Văn A",
                records: [
                    { recordId: "rec-prog", reExaminationDate: "2026-11-20", state: "IN_PROGRESS" },
                    { recordId: "rec-exam", reExaminationDate: "2026-11-20", state: "EXAMINING" },
                    { recordId: "rec-canc", reExaminationDate: "2026-11-20", state: "CANCELLED" },
                    { recordId: "rec-done", reExaminationDate: "2026-11-20", state: "DONE" }
                ]
            }
        ];

        const result = getUpcomingFollowUps(profiles, today);
        expect(result).toHaveLength(1);
        expect(result[0].recordId).toBe("rec-done");
    });

    it("aggregates multiple profiles and handles missing record patient name with profile fullName fallback", () => {
        const profiles = [
            {
                patientProfileId: "prof-1",
                fullName: "Nguyễn Văn A",
                records: [
                    {
                        recordId: "rec-1",
                        patientProfileId: "prof-1",
                        patientName: "Nguyễn Văn A",
                        doctorName: "BS. B",
                        treatmentPlan: "Kế hoạch 1",
                        reExaminationDate: "2026-11-18",
                        state: "DONE"
                    }
                ]
            },
            {
                patientProfileId: "prof-2",
                fullName: "Nguyễn Thị Con",
                records: [
                    {
                        recordId: "rec-2",
                        patientProfileId: "prof-2",
                        patientName: null,
                        doctorName: "BS. C",
                        treatmentPlan: "Kế hoạch 2",
                        reExaminationDate: "2026-11-19",
                        state: "DONE"
                    }
                ]
            }
        ];

        const result = getUpcomingFollowUps(profiles, today);
        expect(result).toHaveLength(2);
        expect(result[0].patientName).toBe("Nguyễn Văn A");
        expect(result[1].patientName).toBe("Nguyễn Thị Con");
    });

    it("deduplicates identical recordId", () => {
        const profiles = [
            {
                patientProfileId: "prof-1",
                fullName: "Nguyễn Văn A",
                records: [
                    { recordId: "rec-dup", reExaminationDate: "2026-11-20", state: "DONE" },
                    { recordId: "rec-dup", reExaminationDate: "2026-11-20", state: "DONE" }
                ]
            }
        ];

        const result = getUpcomingFollowUps(profiles, today);
        expect(result).toHaveLength(1);
    });

    it("maintains stable ascending sort by reExaminationDate", () => {
        const profiles = [
            {
                patientProfileId: "prof-1",
                fullName: "Nguyễn Văn A",
                records: [
                    { recordId: "rec-3", reExaminationDate: "2026-12-01", state: "DONE" },
                    { recordId: "rec-1", reExaminationDate: "2026-11-16", state: "DONE" },
                    { recordId: "rec-2", reExaminationDate: "2026-11-25", state: "DONE" }
                ]
            }
        ];

        const result = getUpcomingFollowUps(profiles, today);
        expect(result.map(r => r.recordId)).toEqual(["rec-1", "rec-2", "rec-3"]);
    });

    it("formatFollowUpDate correctly formats YYYY-MM-DD into dd/MM/yyyy without timezone shift", () => {
        expect(formatFollowUpDate("2026-11-15")).toBe("15/11/2026");
        expect(formatFollowUpDate("2026-01-05")).toBe("05/01/2026");
        expect(formatFollowUpDate("2026-12-31")).toBe("31/12/2026");
        expect(formatFollowUpDate("2024-02-29")).toBe("29/02/2024");
        expect(formatFollowUpDate("2026-02-30")).toBe("");
        expect(formatFollowUpDate("2025-02-29")).toBe("");
        expect(formatFollowUpDate("invalid")).toBe("");
        expect(formatFollowUpDate(null)).toBe("");
        expect(formatFollowUpDate("")).toBe("");
    });
});
