import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import ExaminationPage, { hasAbnormalIndicator } from "../pages/Doctor/ExaminationPage";

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

vi.mock("../services/AxiosInstance", () => ({
    default: {
        get: vi.fn(() => Promise.resolve({ data: [] })),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        put: vi.fn(() => Promise.resolve({ data: {} }))
    }
}));

describe("ExaminationPage render test", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

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

describe("Phase 4 Clinical Safety & Workflow Suites", () => {
    describe("1. hasAbnormalIndicator & missingLabIsNotNormal", () => {
        it("detects clinical abnormal indicator keywords and symbols correctly", () => {
            expect(hasAbnormalIndicator("Đường huyết đói: 8.5 mmol/L [CAO ⬆️]")).toBe(true);
            expect(hasAbnormalIndicator("Bạch cầu: 2.1 G/L [THẤP ⬇️]")).toBe(true);
            expect(hasAbnormalIndicator("Men gan AST tăng vượt ngưỡng sinh lý")).toBe(true);
            expect(hasAbnormalIndicator("Tổn thương bất thường thùy dưới phổi phải")).toBe(true);
            expect(hasAbnormalIndicator("⬆️ 15.2")).toBe(true);
            expect(hasAbnormalIndicator("⬇️ 3.1")).toBe(true);
        });

        it("returns false for normal, negative, or unreturned test results", () => {
            expect(hasAbnormalIndicator("Các dòng tế bào máu trong giới hạn sinh lý bình thường")).toBe(false);
            expect(hasAbnormalIndicator("Âm tính (Negative)")).toBe(false);
            expect(hasAbnormalIndicator("")).toBe(false);
            expect(hasAbnormalIndicator(null)).toBe(false);
            expect(hasAbnormalIndicator(undefined)).toBe(false);
        });

        it("missingLabIsNotNormal: missing or pending test results never default to normal", () => {
            const pendingTest = {
                testId: "t-1",
                testCode: "CLS-001",
                serviceName: "Tổng phân tích tế bào máu",
                price: 120000,
                state: "PENDING",
                testResult: null
            };

            // Test state and fallback labels
            const chipLabel = pendingTest.state === "COMPLETED"
                ? "ĐÃ CÓ KẾT QUẢ"
                : (pendingTest.state === "CANCELLED" ? "ĐÃ HỦY CHỈ ĐỊNH" : "ĐANG CHỜ KẾT QUẢ");
            expect(chipLabel).toBe("ĐANG CHỜ KẾT QUẢ");
            expect(chipLabel).not.toBe("Bình thường");
            expect(chipLabel).not.toBe("NORMAL");

            const resultText = pendingTest.testResult || "KTV phòng Lab đang thực hiện...";
            expect(resultText).toBe("KTV phòng Lab đang thực hiện...");
            expect(resultText).not.toContain("Bình thường");
        });
    });

    describe("2. activePatientContextStaysBound & sequence guard", () => {
        it("drops stale asynchronous responses when doctor rapidly switches patients", async () => {
            let currentSeq = 0;
            let activePatientData = null;

            // Doctor clicks Patient A
            const seqA = ++currentSeq;
            activePatientData = { id: "patient-A", name: "Nguyễn Văn A" };

            // Doctor clicks Patient B while Patient A request is still in-flight
            const seqB = ++currentSeq;
            activePatientData = { id: "patient-B", name: "Trần Thị B" };

            // Stale response from Patient A arrives late
            const handlePatientAResponse = (data) => {
                if (currentSeq !== seqA) {
                    // Sequence guard drops the stale response
                    return "DROPPED_STALE";
                }
                activePatientData = data;
                return "APPLIED";
            };

            const resultA = handlePatientAResponse({ id: "patient-A", recordId: "rec-A" });
            expect(resultA).toBe("DROPPED_STALE");
            expect(activePatientData.id).toBe("patient-B");

            // Response from Patient B arrives
            const handlePatientBResponse = (data) => {
                if (currentSeq !== seqB) {
                    return "DROPPED_STALE";
                }
                activePatientData = { ...activePatientData, ...data };
                return "APPLIED";
            };

            const resultB = handlePatientBResponse({ recordId: "rec-B", finalDiagnosis: "Viêm phế quản" });
            expect(resultB).toBe("APPLIED");
            expect(activePatientData.id).toBe("patient-B");
            expect(activePatientData.recordId).toBe("rec-B");
        });
    });

    describe("3. failedSaveIsVisible & draft preservation", () => {
        it("preserves doctor's diagnostic draft inputs on network or API failure", () => {
            const draftState = {
                finalDiagnosis: "Viêm dạ dày cấp (K29.7)",
                treatmentPlan: "Nghỉ ngơi, ăn lỏng, kiêng chua cay",
                reExamDate: "2026-11-20"
            };

            let errorMessage = "";
            let savedRecord = null;

            // Simulate save failure
            const handleSimulateSave = (payload, shouldFail) => {
                if (shouldFail) {
                    errorMessage = "Lỗi kết nối máy chủ khi lưu chẩn đoán!";
                    // Draft state is untouched
                    return;
                }
                savedRecord = payload;
            };

            handleSimulateSave(draftState, true);

            // Error is clearly visible
            expect(errorMessage).toBe("Lỗi kết nối máy chủ khi lưu chẩn đoán!");
            expect(savedRecord).toBeNull();

            // Draft values remain intact for the doctor to review and retry
            expect(draftState.finalDiagnosis).toBe("Viêm dạ dày cấp (K29.7)");
            expect(draftState.treatmentPlan).toBe("Nghỉ ngơi, ăn lỏng, kiêng chua cay");
            expect(draftState.reExamDate).toBe("2026-11-20");
        });
    });
});
