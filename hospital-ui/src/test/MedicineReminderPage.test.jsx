import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import MedicineReminderPage, { loadFollowUpSchedule } from "../pages/patient/MedicineReminderPage";

describe("MedicineReminderPage — Follow-up Schedule & Doctor Recommendations", () => {
    const today = "2026-11-15";

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("clinicalRecordWithFutureDateAppears: renders doctor recommendation with real date, patient, doctor, and treatment plan", () => {
        const doctorFollowUps = [
            {
                recordId: "rec-101",
                patientProfileId: "prof-1",
                patientName: "Nguyễn Văn A",
                doctorName: "BS. Trần Văn B",
                treatmentPlan: "Tái khám sau khi uống hết thuốc 7 ngày",
                reExaminationDate: "2026-11-20"
            }
        ];

        const html = renderToStaticMarkup(
            <MemoryRouter initialEntries={["/reminders"]}>
                <MedicineReminderPage
                    initialTab={1}
                    initialDoctorFollowUps={doctorFollowUps}
                    initialConfirmedBookings={[]}
                    initialLoading={false}
                />
            </MemoryRouter>
        );

        // Tab count represents doctor recommendations
        expect(html).toContain("Lịch Tái Khám (1)");
        // Doctor recommendation card details
        expect(html).toContain("20/11/2026");
        expect(html).toContain("Nguyễn Văn A");
        expect(html).toContain("BS. Trần Văn B");
        expect(html).toContain("Tái khám sau khi uống hết thuốc 7 ngày");
        // Must not contain fake booking status or fake department/diagnosis
        expect(html).not.toContain("Sắp diễn ra");
        expect(html).not.toContain("27/12/2023");
    });

    it("confirmedBookingAppearsInSeparateSection: confirmed bookings appear only in separate section, tab count only counts recommendations", () => {
        const doctorFollowUps = [
            {
                recordId: "rec-101",
                patientProfileId: "prof-1",
                patientName: "Nguyễn Văn A",
                doctorName: "BS. B",
                treatmentPlan: "Kế hoạch điều trị",
                reExaminationDate: "2026-11-20"
            }
        ];
        const confirmedBookings = [
            {
                bookingId: "b-1",
                bookingCode: "BK-CONFIRMED-99",
                status: "CONFIRMED",
                bookingDate: "2026-11-25",
                doctorName: "BS. Hoàng Long",
                departmentName: "Khoa Tim Mạch",
                roomName: "Phòng 201"
            }
        ];

        const html = renderToStaticMarkup(
            <MemoryRouter initialEntries={["/reminders"]}>
                <MedicineReminderPage
                    initialTab={1}
                    initialDoctorFollowUps={doctorFollowUps}
                    initialConfirmedBookings={confirmedBookings}
                    initialLoading={false}
                />
            </MemoryRouter>
        );

        // Tab count represents only doctor recommendations: (1), not 2
        expect(html).toContain("Lịch Tái Khám (1)");
        // Separate group header exists
        expect(html).toContain("Lịch khám đã xác nhận");
        expect(html).toContain("BK-CONFIRMED-99");
    });

    it("cancelledAndPastBookingsNotShownAsUpcoming: loadFollowUpSchedule filters out cancelled and past bookings", async () => {
        const mockBookingApi = {
            getMyProfiles: vi.fn().mockResolvedValue({
                data: [{ patientProfileId: "prof-1", fullName: "Nguyễn Văn A" }]
            }),
            getMyBookings: vi.fn().mockResolvedValue({
                data: [
                    { bookingId: "b-past", bookingCode: "BK-PAST", status: "CONFIRMED", bookingDate: "2026-11-10" },
                    { bookingId: "b-canc", bookingCode: "BK-CANC", status: "CANCELLED", bookingDate: "2026-11-20" },
                    { bookingId: "b-future", bookingCode: "BK-FUTURE", status: "CONFIRMED", bookingDate: "2026-11-22" }
                ]
            })
        };
        const mockClinicalApi = {
            getRecordsByPatient: vi.fn().mockResolvedValue({ data: [] })
        };

        const result = await loadFollowUpSchedule({
            bookingApiClient: mockBookingApi,
            clinicalApiClient: mockClinicalApi,
            todayIso: today
        });

        expect(result.confirmedBookings).toHaveLength(1);
        expect(result.confirmedBookings[0].bookingCode).toBe("BK-FUTURE");
    });

    it("multipleProfileNamesAreCorrect: records from different profiles retain their correct patient names", async () => {
        const mockBookingApi = {
            getMyProfiles: vi.fn().mockResolvedValue({
                data: [
                    { patientProfileId: "prof-father", fullName: "Nguyễn Văn Cha" },
                    { patientProfileId: "prof-child", fullName: "Nguyễn Thị Con" }
                ]
            }),
            getMyBookings: vi.fn().mockResolvedValue({ data: [] })
        };
        const mockClinicalApi = {
            getRecordsByPatient: vi.fn().mockImplementation((profileId) => {
                if (profileId === "prof-father") {
                    return Promise.resolve({
                        data: [
                            {
                                recordId: "rec-f",
                                state: "DONE",
                                reExaminationDate: "2026-11-18",
                                patientName: "Nguyễn Văn Cha",
                                doctorName: "BS. A"
                            }
                        ]
                    });
                }
                return Promise.resolve({
                    data: [
                        {
                            recordId: "rec-c",
                            state: "DONE",
                            reExaminationDate: "2026-11-19",
                            patientName: "Nguyễn Thị Con",
                            doctorName: "BS. B"
                        }
                    ]
                });
            })
        };

        const result = await loadFollowUpSchedule({
            bookingApiClient: mockBookingApi,
            clinicalApiClient: mockClinicalApi,
            todayIso: today
        });

        expect(result.doctorFollowUps).toHaveLength(2);
        expect(result.doctorFollowUps[0].patientName).toBe("Nguyễn Văn Cha");
        expect(result.doctorFollowUps[1].patientName).toBe("Nguyễn Thị Con");
    });

    it("zeroResultsShowEmptyState: renders explicit empty state when no follow-ups exist", () => {
        const html = renderToStaticMarkup(
            <MemoryRouter initialEntries={["/reminders"]}>
                <MedicineReminderPage
                    initialTab={1}
                    initialDoctorFollowUps={[]}
                    initialConfirmedBookings={[]}
                    initialLoading={false}
                />
            </MemoryRouter>
        );

        expect(html).toContain("Lịch Tái Khám (0)");
        expect(html).toContain("Hiện tại bạn không có lịch hẹn tái khám nào theo chỉ định của bác sĩ");
    });

    it("apiFailureShowsRetryFeedbackRatherThanEmptyState: renders error alert when fetch fails", () => {
        const html = renderToStaticMarkup(
            <MemoryRouter initialEntries={["/reminders"]}>
                <MedicineReminderPage
                    initialTab={1}
                    initialDoctorFollowUps={[]}
                    initialConfirmedBookings={[]}
                    initialLoading={false}
                    initialFollowUpError="Không thể kết nối đến máy chủ để tải lịch tái khám."
                />
            </MemoryRouter>
        );

        expect(html).toContain("Không thể kết nối đến máy chủ để tải lịch tái khám.");
        expect(html).not.toContain("Hiện tại bạn không có lịch hẹn tái khám nào theo chỉ định của bác sĩ");
    });

    it("partialProfileFailurePreservesSuccessfulProfileAndShowsWarning: retains successful profile results if another profile fails", async () => {
        const mockBookingApi = {
            getMyProfiles: vi.fn().mockResolvedValue({
                data: [
                    { patientProfileId: "prof-good", fullName: "Hồ Sơ Thành Công" },
                    { patientProfileId: "prof-bad", fullName: "Hồ Sơ Thất Bại" }
                ]
            }),
            getMyBookings: vi.fn().mockResolvedValue({ data: [] })
        };
        const mockClinicalApi = {
            getRecordsByPatient: vi.fn().mockImplementation((profileId) => {
                if (profileId === "prof-good") {
                    return Promise.resolve({
                        data: [
                            {
                                recordId: "rec-good",
                                state: "DONE",
                                reExaminationDate: "2026-11-20",
                                patientName: "Hồ Sơ Thành Công"
                            }
                        ]
                    });
                }
                return Promise.reject(new Error("Lỗi mạng"));
            })
        };

        const result = await loadFollowUpSchedule({
            bookingApiClient: mockBookingApi,
            clinicalApiClient: mockClinicalApi,
            todayIso: today
        });

        expect(result.doctorFollowUps).toHaveLength(1);
        expect(result.doctorFollowUps[0].recordId).toBe("rec-good");
        expect(result.partialErrors).toHaveLength(1);
        expect(result.partialErrors[0]).toContain("Hồ Sơ Thất Bại");
    });

    it("followUpLoadingPreventsEmptyState: does not show empty recommendation state while followUpLoading is true", () => {
        const html = renderToStaticMarkup(
            <MemoryRouter initialEntries={["/reminders"]}>
                <MedicineReminderPage
                    initialTab={1}
                    initialDoctorFollowUps={[]}
                    initialConfirmedBookings={[]}
                    initialLoading={false}
                    initialFollowUpLoading={true}
                    initialBookingLoading={false}
                />
            </MemoryRouter>
        );

        expect(html).toContain("Đang tải danh sách chỉ định tái khám từ bệnh án...");
        expect(html).not.toContain("Hiện tại bạn không có lịch hẹn tái khám nào theo chỉ định của bác sĩ");
    });

    it("bookingLoadingPreventsEmptyBookingState: does not show empty booking state while bookingLoading is true", () => {
        const html = renderToStaticMarkup(
            <MemoryRouter initialEntries={["/reminders"]}>
                <MedicineReminderPage
                    initialTab={1}
                    initialDoctorFollowUps={[]}
                    initialConfirmedBookings={[]}
                    initialLoading={false}
                    initialFollowUpLoading={false}
                    initialBookingLoading={true}
                />
            </MemoryRouter>
        );

        expect(html).toContain("Đang tải danh sách lịch khám đã xác nhận...");
        expect(html).not.toContain("Chưa có lịch khám nào sắp diễn ra");
    });

    it("bookingApiFailurePreservesDoctorFollowUps: keeps doctor recommendations when booking API fails", async () => {
        const mockBookingApi = {
            getMyProfiles: vi.fn().mockResolvedValue({
                data: [{ patientProfileId: "prof-1", fullName: "Nguyễn Văn A" }]
            }),
            getMyBookings: vi.fn().mockRejectedValue(new Error("Booking service down"))
        };
        const mockClinicalApi = {
            getRecordsByPatient: vi.fn().mockResolvedValue({
                data: [
                    {
                        recordId: "rec-ok",
                        state: "DONE",
                        reExaminationDate: "2026-11-22",
                        doctorName: "BS. Nguyễn Y"
                    }
                ]
            })
        };

        const result = await loadFollowUpSchedule({
            bookingApiClient: mockBookingApi,
            clinicalApiClient: mockClinicalApi,
            todayIso: today
        });

        expect(result.doctorFollowUps).toHaveLength(1);
        expect(result.doctorFollowUps[0].recordId).toBe("rec-ok");
        expect(result.confirmedBookings).toHaveLength(0);
        expect(result.bookingError).toBe("Không thể kết nối đến máy chủ để tải danh sách lịch khám đã xác nhận.");
        expect(result.followUpError).toBeNull();

        // Check UI rendering with preserved follow-up and booking error alert
        const html = renderToStaticMarkup(
            <MemoryRouter initialEntries={["/reminders"]}>
                <MedicineReminderPage
                    initialTab={1}
                    initialDoctorFollowUps={result.doctorFollowUps}
                    initialConfirmedBookings={[]}
                    initialLoading={false}
                    initialFollowUpLoading={false}
                    initialBookingLoading={false}
                    initialBookingError={result.bookingError}
                />
            </MemoryRouter>
        );

        expect(html).toContain("22/11/2026");
        expect(html).toContain("BS. Nguyễn Y");
        expect(html).toContain("Không thể kết nối đến máy chủ để tải danh sách lịch khám đã xác nhận.");
        expect(html).not.toContain("Chưa có lịch khám nào sắp diễn ra");
    });

    it("profileApiFailurePreservesConfirmedBookings: keeps confirmed bookings when profiles API fails", async () => {
        const mockBookingApi = {
            getMyProfiles: vi.fn().mockRejectedValue(new Error("Profiles service unavailable")),
            getMyBookings: vi.fn().mockResolvedValue({
                data: [
                    {
                        bookingId: "b-future-1",
                        bookingCode: "BK-FUTURE-01",
                        status: "CONFIRMED",
                        bookingDate: "2026-11-25",
                        doctorName: "BS. Hoàng Long"
                    }
                ]
            })
        };
        const mockClinicalApi = {
            getRecordsByPatient: vi.fn()
        };

        const result = await loadFollowUpSchedule({
            bookingApiClient: mockBookingApi,
            clinicalApiClient: mockClinicalApi,
            todayIso: today
        });

        expect(result.confirmedBookings).toHaveLength(1);
        expect(result.confirmedBookings[0].bookingCode).toBe("BK-FUTURE-01");
        expect(result.doctorFollowUps).toHaveLength(0);
        expect(result.followUpError).toBe("Không thể tải danh sách hồ sơ bệnh nhân để kiểm tra lịch tái khám.");
        expect(result.bookingError).toBeNull();

        // Check UI rendering with preserved bookings and follow-up error alert
        const html = renderToStaticMarkup(
            <MemoryRouter initialEntries={["/reminders"]}>
                <MedicineReminderPage
                    initialTab={1}
                    initialDoctorFollowUps={[]}
                    initialConfirmedBookings={result.confirmedBookings}
                    initialLoading={false}
                    initialFollowUpLoading={false}
                    initialBookingLoading={false}
                    initialFollowUpError={result.followUpError}
                />
            </MemoryRouter>
        );

        expect(html).toContain("BK-FUTURE-01");
        expect(html).toContain("BS. Hoàng Long");
        expect(html).toContain("Không thể tải danh sách hồ sơ bệnh nhân để kiểm tra lịch tái khám.");
        expect(html).not.toContain("Hiện tại bạn không có lịch hẹn tái khám nào theo chỉ định của bác sĩ");
    });
});

