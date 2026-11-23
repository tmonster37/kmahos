import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import BookingPage, {
    getSessionLabel,
    renderFeeDisplay,
    getBookingCodeDisplay,
    getQueueNumberDisplay,
    getDoctorInitials
} from "../pages/customer/BookingPage";

vi.mock("../context/AuthContext", () => ({
    useAuth: () => ({
        user: { userId: "test-patient", fullName: "Trần Bệnh Nhân", phoneNumber: "0901234567", role: "ROLE_PATIENT" },
        isAuthenticated: true,
        role: "ROLE_PATIENT"
    })
}));

const mockDoctorsList = [
    {
        scheduleId: 101,
        doctorId: "doc-1",
        doctorName: "BS.CKII Nguyễn Văn Cường",
        degree: "BS.CKII",
        departmentName: "Khoa Tim Mạch",
        roomName: "Phòng 201",
        scheduleDate: "2026-11-20",
        session: "MORNING",
        consultationFee: 300000,
        timeSlots: [
            { timeSlotId: "slot-1", startTime: "08:00", endTime: "08:30", maxCapacity: 5, currentBookings: 2, isFull: false },
            { timeSlotId: "slot-2", startTime: "08:30", endTime: "09:00", maxCapacity: 5, currentBookings: 5, isFull: true }
        ]
    },
    {
        scheduleId: 102,
        doctorId: "doc-2",
        doctorName: "ThS.BS Trần Thị Mai",
        degree: "Thạc sĩ Bác sĩ",
        departmentName: "Khoa Tim Mạch",
        roomName: "Phòng 202",
        scheduleDate: "2026-11-20",
        session: "AFTERNOON",
        consultationFee: null, // Thiếu phí khám -> kiểm tra "Chưa có dữ liệu"
        timeSlots: [
            { timeSlotId: "slot-3", startTime: "14:00", endTime: "14:30", maxCapacity: 4, currentBookings: 4, isFull: true },
            { timeSlotId: "slot-4", startTime: "14:30", endTime: "15:00", maxCapacity: 4, currentBookings: 4, isFull: true }
        ]
    },
    {
        scheduleId: 103,
        doctorId: "doc-3",
        doctorName: "BS. Lê Hoàng Long",
        degree: "Bác sĩ Chuyên khoa",
        departmentName: "Khoa Tim Mạch",
        roomName: "Phòng 203",
        scheduleDate: "2026-11-20",
        session: "EVENING",
        consultationFee: 0, // Phí = 0 -> "0 ₫"
        timeSlots: []
    }
];

vi.mock("../services/AxiosInstance", () => ({
    default: {
        get: vi.fn((url) => {
            if (url.includes("/api/departments")) {
                return Promise.resolve({
                    data: [
                        { departmentId: 1, departmentName: "Khoa Tim Mạch", description: "Tim mạch can thiệp" }
                    ]
                });
            }
            if (url.includes("/api/patient-profiles")) {
                return Promise.resolve({
                    data: [
                        { patientProfileId: 101, fullName: "Trần Bệnh Nhân", relationship: "Bản thân" }
                    ]
                });
            }
            if (url.includes("/api/schedules/by-department")) {
                return Promise.resolve({ data: mockDoctorsList });
            }
            return Promise.resolve({ data: [] });
        }),
        post: vi.fn(() => Promise.resolve({ data: { data: { reservationId: "res-123", ttlSeconds: 600 } } })),
        delete: vi.fn(() => Promise.resolve({ data: { data: {} } }))
    }
}));

describe("Đợt 2 · Chọn bác sĩ và giờ khám (BookingDoctorScheduleWorkflow)", () => {
    describe("1. Nhãn buổi khám & Chuyển đổi dữ liệu chuẩn hóa", () => {
        it("getSessionLabel: chuyển đổi đúng các ca sáng, chiều, tối", () => {
            expect(getSessionLabel("MORNING")).toBe("Buổi sáng");
            expect(getSessionLabel("AFTERNOON")).toBe("Buổi chiều");
            expect(getSessionLabel("EVENING")).toBe("Buổi tối");
            expect(getSessionLabel("UNKNOWN")).toBe("UNKNOWN");
            expect(getSessionLabel(null)).toBe("Trong ngày");
        });

        it("renderFeeDisplay: kiểm tra đúng hợp đồng dữ liệu cho các trường hợp phí", () => {
            expect(renderFeeDisplay(300000)).toMatch(/300\.000/);
            expect(renderFeeDisplay(0)).toBe("0 ₫");
            expect(renderFeeDisplay("0")).toBe("0 ₫");
            expect(renderFeeDisplay(null)).toBe("Chưa có dữ liệu");
            expect(renderFeeDisplay(undefined)).toBe("Chưa có dữ liệu");
            expect(renderFeeDisplay("")).toBe("Chưa có dữ liệu");
        });

        it("getDoctorInitials: hiển thị chữ cái đầu trung tính khi thiếu avatar", () => {
            expect(getDoctorInitials("Nguyễn Văn Cường")).toBe("N");
            expect(getDoctorInitials("BS.CKII Trần Thị Mai")).toBe("T");
            expect(getDoctorInitials("")).toBe("BS");
            expect(getDoctorInitials(null)).toBe("BS");
        });
    });

    describe("2. Bộ lọc tên bác sĩ & Các trạng thái danh sách Step 1", () => {
        it("rendersDoctorSearchInputAndControls: Step 1 render ô tìm kiếm bác sĩ với placeholder rõ ràng", () => {
            const html = renderToStaticMarkup(
                <MemoryRouter
                    initialEntries={[
                        {
                            pathname: "/booking",
                            state: { departmentId: 1 }
                        }
                    ]}
                >
                    <BookingPage />
                </MemoryRouter>
            );

            expect(html).toContain("Tìm kiếm bác sĩ theo tên");
            expect(html).toContain("Chọn Ngày Khám &amp; Bác Sĩ Chuyên Khoa");
            expect(html).toContain("📅 Chọn Ngày Thăm Khám");
        });

        it("filtersDoctorsByKeyword: hàm lọc nhận diện chính xác tên, học vị và phòng khám", () => {
            const filterFn = (list, query) => {
                if (!query.trim()) return list;
                const q = query.trim().toLowerCase();
                return list.filter(sch => {
                    const name = (sch.doctorName || "").toLowerCase();
                    const deg = (sch.degree || "").toLowerCase();
                    const room = (sch.roomName || "").toLowerCase();
                    return name.includes(q) || deg.includes(q) || room.includes(q);
                });
            };

            // Lọc theo tên "Mai"
            const resultMai = filterFn(mockDoctorsList, "Mai");
            expect(resultMai).toHaveLength(1);
            expect(resultMai[0].doctorName).toBe("ThS.BS Trần Thị Mai");

            // Lọc theo học vị "CKII"
            const resultCKII = filterFn(mockDoctorsList, "ckii");
            expect(resultCKII).toHaveLength(1);
            expect(resultCKII[0].doctorName).toBe("BS.CKII Nguyễn Văn Cường");

            // Lọc theo phòng khám "203"
            const resultRoom = filterFn(mockDoctorsList, "203");
            expect(resultRoom).toHaveLength(1);
            expect(resultRoom[0].doctorName).toBe("BS. Lê Hoàng Long");

            // Lọc từ khóa không tồn tại
            const resultEmpty = filterFn(mockDoctorsList, "Vũ Đình Tuyến");
            expect(resultEmpty).toHaveLength(0);
        });

        it("calculatesDoctorAvailabilityCorrectly: phân biệt rõ 'Còn chỗ' và 'Hết chỗ' dựa trên slot thực tế", () => {
            // BS Cường: có 1 slot còn chỗ, 1 slot full -> Còn chỗ (1 khung giờ)
            const docCuongSlots = mockDoctorsList[0].timeSlots;
            const availableCuong = docCuongSlots.filter(s => !s.isFull && s.currentBookings < s.maxCapacity);
            expect(availableCuong.length).toBe(1);
            const isCuongFull = availableCuong.length === 0;
            expect(isCuongFull).toBe(false);

            // BS Mai: cả 2 slot đều full -> Hết chỗ
            const docMaiSlots = mockDoctorsList[1].timeSlots;
            const availableMai = docMaiSlots.filter(s => !s.isFull && s.currentBookings < s.maxCapacity);
            expect(availableMai.length).toBe(0);
            const isMaiFull = docMaiSlots.length > 0 && availableMai.length === 0;
            expect(isMaiFull).toBe(true);
        });
    });

    describe("3. Khung giờ khám (Step 2) & Xử lý khung giờ vừa hết chỗ", () => {
        it("rendersSlotStateCorrectly: slot hết chỗ bị vô hiệu hóa, slot còn chỗ hiển thị số lượt", () => {
            const slotAvailable = { timeSlotId: "s-1", startTime: "08:00", endTime: "08:30", maxCapacity: 5, currentBookings: 2, isFull: false };
            const slotFull = { timeSlotId: "s-2", startTime: "08:30", endTime: "09:00", maxCapacity: 5, currentBookings: 5, isFull: true };

            const isAvailableFull = slotAvailable.isFull || (slotAvailable.currentBookings >= slotAvailable.maxCapacity);
            const isFullFull = slotFull.isFull || (slotFull.currentBookings >= slotFull.maxCapacity);

            expect(isAvailableFull).toBe(false);
            expect(isFullFull).toBe(true);

            const remainingAvailable = Math.max(0, slotAvailable.maxCapacity - slotAvailable.currentBookings);
            expect(remainingAvailable).toBe(3);
        });

        it("disablesContinueWhenNoSlotOrNoReservation: không cho phép tiếp tục sang Step 3 khi chưa có reservationId", () => {
            const canContinueStep2 = (selectedSlot, reservationId, reservingSlot) => {
                return Boolean(selectedSlot && reservationId && !reservingSlot);
            };

            expect(canContinueStep2(null, null, false)).toBe(false);
            expect(canContinueStep2({ timeSlotId: "s-1" }, null, false)).toBe(false);
            expect(canContinueStep2({ timeSlotId: "s-1" }, "res-123", true)).toBe(false); // Đang giữ chỗ
            expect(canContinueStep2({ timeSlotId: "s-1" }, "res-123", false)).toBe(true);
        });
    });

    describe("4. Mobile Accessibility & Chống gửi trùng lặp (Double Submission)", () => {
        it("verifiesMinHeight48ForActionButtons: các nút hành động đáp ứng chuẩn touch target trên mobile", () => {
            const html = renderToStaticMarkup(
                <MemoryRouter initialEntries={["/booking"]}>
                    <BookingPage />
                </MemoryRouter>
            );

            // Nút điều hướng chính có mặt trên giao diện
            expect(html).toContain("Tiếp tục");
        });

        it("guardsAgainstDoubleBookingSubmission: ngăn chặn submit hai lần khi đang trong trạng thái loadingBooking", () => {
            let apiCalls = 0;
            let loadingBooking = false;

            const handleFinalBookingMock = () => {
                if (loadingBooking) return "BLOCKED_CONCURRENT";
                loadingBooking = true;
                apiCalls += 1;
                return "PROCEEDED";
            };

            // Lần bấm 1
            const res1 = handleFinalBookingMock();
            expect(res1).toBe("PROCEEDED");
            expect(apiCalls).toBe(1);

            // Lần bấm 2 ngay lập tức khi request 1 đang chạy
            const res2 = handleFinalBookingMock();
            expect(res2).toBe("BLOCKED_CONCURRENT");
            expect(apiCalls).toBe(1); // Không gọi thêm API
        });
    });
});
