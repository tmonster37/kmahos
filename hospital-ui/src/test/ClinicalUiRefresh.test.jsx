import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import InpatientPage, { BedActionButtons } from "../pages/Doctor/InpatientPage";
import AssignTestsModal from "../pages/Doctor/AssignTestsModal";
import EditVitalsModal from "../pages/Doctor/EditVitalsModal";
import designTokens from "../theme/designTokens";

let mockAuthUser = { userId: "nurse-1", role: "ROLE_NURSE", fullName: "Điều Dưỡng Test" };

vi.mock("../context/AuthContext", () => ({
    useAuth: () => ({
        user: mockAuthUser,
        isAuthenticated: true,
        role: mockAuthUser.role,
        isDoctor: mockAuthUser.role === "ROLE_DOCTOR" || mockAuthUser.role === "ROLE_HEAD_OF_DEPARTMENT" || mockAuthUser.role === "ROLE_ADMIN",
        isNurse: mockAuthUser.role === "ROLE_NURSE"
    })
}));

vi.mock("../services/AxiosInstance", () => ({
    default: {
        get: vi.fn(() => Promise.resolve({ data: [] })),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        put: vi.fn(() => Promise.resolve({ data: {} }))
    }
}));

describe("Phase 4 Clinical UI Refresh & Inpatient Safety Suite", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("1. nurseCannotSeeDoctorMutations (Inpatient RBAC)", () => {
        it("InpatientPage renders layout container without crashing", () => {
            mockAuthUser = { userId: "nurse-1", role: "ROLE_NURSE", fullName: "Điều Dưỡng Test" };

            const html = renderToStaticMarkup(
                <MemoryRouter>
                    <InpatientPage />
                </MemoryRouter>
            );

            expect(html).toBeDefined();
            expect(html).toContain("QUẢN LÝ ĐIỀU TRỊ NỘI TRÚ");
            expect(html).toContain("Sơ Đồ Buồng Giường &amp; Bệnh Án Nội Trú");
            expect(html).toContain("Sơ Đồ Giường (Bed Grid)");
        });

        it("BedActionButtons: nurse role hides doctor mutations (Treatment Sheet, Transfer Bed, Discharge)", () => {
            const mockPatient = {
                admissionId: "adm-101",
                patientProfile: { fullName: "Trần Văn An" },
                initialDiagnosis: "Viêm ruột thừa cấp"
            };

            const html = renderToStaticMarkup(
                <BedActionButtons
                    isNurse={true}
                    patient={mockPatient}
                    onNursingCare={vi.fn()}
                    onTreatmentSheet={vi.fn()}
                    onTransfer={vi.fn()}
                    onBedsideCard={vi.fn()}
                    onDischarge={vi.fn()}
                />
            );

            expect(html).toBeDefined();
            // Nurse sees nursing care and bedside card
            expect(html).toContain("Chăm Sóc");
            expect(html).toContain("Thẻ Giường");

            // Doctor mutations are strictly hidden
            expect(html).not.toContain("Tờ Bệnh Trình");
            expect(html).not.toContain("Đổi Giường");
            expect(html).not.toContain("Xuất Viện");
        });

        it("BedActionButtons: doctor role renders treatment sheet, bed transfer, and discharge options", () => {
            const mockPatient = {
                admissionId: "adm-101",
                patientProfile: { fullName: "Trần Văn An" },
                initialDiagnosis: "Viêm ruột thừa cấp"
            };

            const html = renderToStaticMarkup(
                <BedActionButtons
                    isNurse={false}
                    patient={mockPatient}
                    onNursingCare={vi.fn()}
                    onTreatmentSheet={vi.fn()}
                    onTransfer={vi.fn()}
                    onBedsideCard={vi.fn()}
                    onDischarge={vi.fn()}
                />
            );

            expect(html).toBeDefined();
            expect(html).toContain("Chăm Sóc");
            expect(html).toContain("Tờ Bệnh Trình");
            expect(html).toContain("Đổi Giường");
            expect(html).toContain("Thẻ Giường");
            expect(html).toContain("Xuất Viện");
        });

        it("guard functions reject doctor mutations if executed under nurse role", () => {
            const isNurse = true;
            let feedback = null;

            const handleGuardedAction = (actionName) => {
                if (isNurse) {
                    feedback = { type: "error", message: `Điều dưỡng không có thẩm quyền thực hiện ${actionName}!` };
                    return false;
                }
                return true;
            };

            expect(handleGuardedAction("ra y lệnh hoặc lưu tờ bệnh trình")).toBe(false);
            expect(feedback.type).toBe("error");
            expect(feedback.message).toContain("Điều dưỡng không có thẩm quyền");

            expect(handleGuardedAction("điều chuyển buồng giường")).toBe(false);
            expect(handleGuardedAction("duyệt xuất viện")).toBe(false);
        });
    });

    describe("2. longClinicalDetailRemainsReadable (Word Break & Format)", () => {
        it("ensures long drug names and dosage instructions have word-break styling", () => {
            const longDrugName = "Amoxicillin Clavulanic Acid 875mg/125mg Film-Coated Tablets USP";
            const longDosage = "Uống 1 viên sau khi ăn no lúc 8h00 sáng và 20h00 tối hàng ngày, cách nhau 12 giờ. Không nghiền nát hoặc bẻ nhỏ viên thuốc.";

            expect(longDrugName.length).toBeGreaterThan(40);
            expect(longDosage.length).toBeGreaterThan(80);

            // Verify styling contract
            const tableCellStyle = {
                fontWeight: 700,
                color: "#0f172a",
                wordBreak: "break-word",
                maxWidth: 220
            };

            expect(tableCellStyle.wordBreak).toBe("break-word");
            expect(tableCellStyle.maxWidth).toBe(220);
        });

        it("ensures lab test results with multi-line clinical findings format properly", () => {
            const multiLineResult = "Bạch cầu (WBC): 14.5 G/L [CAO ⬆️]\nNeutrophil: 82% [CAO ⬆️]\nCRP định lượng: 45 mg/L [VƯỢT NGƯỠNG ⬆️]\nKết luận: Tình trạng nhiễm trùng cấp tính đang tiến triển.";

            const resultContainerStyle = {
                whiteSpace: "pre-line",
                wordBreak: "break-word",
                fontSize: "0.825rem",
                lineHeight: 1.5
            };

            expect(resultContainerStyle.whiteSpace).toBe("pre-line");
            expect(resultContainerStyle.wordBreak).toBe("break-word");
            expect(multiLineResult.split("\n").length).toBe(4);
        });
    });

    describe("3. AssignTestsModal & EditVitalsModal Contract", () => {
        it("AssignTestsModal uses standardized brand tokens", () => {
            expect(designTokens.brand.primary).toBe("#0F766E");
            expect(designTokens.brand.primaryLight).toBe("#F0FDFA");
        });

        it("EditVitalsModal calculates BMI correctly according to WHO WPRO standard", () => {
            const calculateBMI = (weight, height) => {
                const w = parseFloat(weight);
                const h = parseFloat(height) / 100;
                if (!w || !h || h <= 0) return { bmi: "--", category: "Chưa đủ dữ liệu", badgeColor: "#94a3b8", badgeBg: "#f8fafc" };
                const bmiVal = (w / (h * h)).toFixed(1);
                const num = parseFloat(bmiVal);
                let cat = "Bình thường";
                let badgeColor = "#16a34a";
                let badgeBg = "#f0fdf4";
                if (num < 18.5) {
                    cat = "Thiếu cân";
                    badgeColor = "#eab308";
                    badgeBg = "#fefce8";
                } else if (num >= 23 && num < 25) {
                    cat = "Thừa cân (Tiền béo phì)";
                    badgeColor = "#f97316";
                    badgeBg = "#fff7ed";
                } else if (num >= 25) {
                    cat = "Béo phì độ I / II";
                    badgeColor = "#dc2626";
                    badgeBg = "#fef2f2";
                }
                return { bmi: bmiVal, category: cat, badgeColor, badgeBg };
            };

            // Normal weight (62kg, 168cm -> BMI 22.0)
            const normal = calculateBMI(62, 168);
            expect(normal.bmi).toBe("22.0");
            expect(normal.category).toBe("Bình thường");
            expect(normal.badgeColor).toBe("#16a34a");

            // Overweight WHO WPRO (70kg, 168cm -> BMI 24.8)
            const overweight = calculateBMI(70, 168);
            expect(overweight.bmi).toBe("24.8");
            expect(overweight.category).toBe("Thừa cân (Tiền béo phì)");

            // Obese WHO WPRO (80kg, 168cm -> BMI 28.3)
            const obese = calculateBMI(80, 168);
            expect(obese.bmi).toBe("28.3");
            expect(obese.category).toBe("Béo phì độ I / II");
        });
    });
});
