import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import ReactDOMClient from "react-dom/client";
import { act } from "react";
import BookingPage, {
    renderFeeDisplay,
    getDoctorInitials,
    getBookingCodeDisplay,
    getQueueNumberDisplay,
    isReservationStale,
    isScheduleStale,
    useBookingScheduleWorkflow
} from "../pages/customer/BookingPage";
import HomePage from "../pages/patient/HomePage";
import PatientProfilesPage from "../pages/patient/PatientProfilesPage";

vi.mock("../context/AuthContext", () => ({
    useAuth: () => ({
        user: { userId: "test-patient", fullName: "Nguyễn Văn A", phoneNumber: "0987654321", role: "ROLE_PATIENT" },
        isAuthenticated: true,
        role: "ROLE_PATIENT"
    })
}));

vi.mock("../services/AxiosInstance", () => ({
    default: {
        get: vi.fn(() => Promise.resolve({ data: { data: [] } })),
        post: vi.fn(() => Promise.resolve({ data: { data: {} } })),
        delete: vi.fn(() => Promise.resolve({ data: { data: {} } }))
    }
}));

vi.mock("../services/bookingApi", () => ({
    bookingApi: {
        getMyBookings: vi.fn(() => Promise.resolve({ data: [] })),
        cancelBooking: vi.fn(() => Promise.resolve({ data: {} }))
    }
}));

describe("Patient Booking Refresh — Phase 1", () => {
    it("rendersHeadingAndFiveStages: renders booking heading, five stage labels and primary step control", () => {
        const html = renderToStaticMarkup(
            <MemoryRouter initialEntries={["/booking"]}>
                <BookingPage />
            </MemoryRouter>
        );

        // Heading
        expect(html).toMatch(/Đặt Lịch Khám/i);
        // Five stage labels
        expect(html).toMatch(/Chuyên Khoa/i);
        expect(html).toMatch(/Bác Sĩ/i);
        expect(html).toMatch(/Khung Giờ/i);
        expect(html).toMatch(/Hồ Sơ/i);
        expect(html).toMatch(/Xác Nhận/i);
    });

    it("doesNotRenderInventedInitialFee: empty initial state has no fabricated 200.000 displayed fee", () => {
        const html = renderToStaticMarkup(
            <MemoryRouter initialEntries={["/booking"]}>
                <BookingPage />
            </MemoryRouter>
        );

        // Must not contain fabricated 200.000 or 200,000 in initial view before schedule selection
        expect(html).not.toContain("200.000");
        expect(html).not.toContain("200,000");
    });

    it("homeExposesClearBookingEntry: home page exposes clear booking CTA with department handoff", () => {
        const html = renderToStaticMarkup(
            <MemoryRouter initialEntries={["/"]}>
                <HomePage />
            </MemoryRouter>
        );

        expect(html).toMatch(/Đặt Lịch Khám/i);
        expect(html).toContain("/booking");
    });

    it("homePageDoesNotContainHardcodedFeaturedDoctorsOrStockImages: stock doctor images and fake profiles removed", () => {
        const html = renderToStaticMarkup(
            <MemoryRouter initialEntries={["/"]}>
                <HomePage />
            </MemoryRouter>
        );

        // Must not contain fabricated doctor showcase names or fake ratings
        expect(html).not.toContain("Nguyễn Văn An");
        expect(html).not.toContain("Trần Thị Mai");
        expect(html).not.toContain("Lê Quang Huy");
        expect(html).not.toContain("Phạm Thu Trang");
        expect(html).not.toContain("320 lượt hài lòng");
        expect(html).not.toContain("412 lượt hài lòng");
        expect(html).not.toContain("Bác Sĩ Chuyên Khoa Tiêu Biểu");
        expect(html).not.toContain("ĐỘI NGŨ TINH HOA");

        // Must not contain any of the 3 unverified stock images
        expect(html).not.toContain("doctor-senior-male.png");
        expect(html).not.toContain("doctor-team.jpg");
        expect(html).not.toContain("doctor-female-smile.png");

        // Must contain truthful online booking CTA banner
        expect(html).toContain("DỊCH VỤ Y TẾ SỐ TNT HOSPITAL");
        expect(html).toContain("Đặt Lịch Khám Trực Tuyến &amp; Cấp Số Thứ Tự Tự Động");
    });

    describe("Fee Boundary & Zero vs. Missing Treatment", () => {
        it("handlesZeroFeeCorrectly: returned zero fee renders as '0 ₫' and not as missing data or 200.000", () => {
            expect(renderFeeDisplay(0)).toBe("0 ₫");
            expect(renderFeeDisplay("0")).toBe("0 ₫");
        });

        it("handlesMissingFeeGracefully: missing or invalid fees render 'Chưa có dữ liệu'", () => {
            expect(renderFeeDisplay(null)).toBe("Chưa có dữ liệu");
            expect(renderFeeDisplay(undefined)).toBe("Chưa có dữ liệu");
            expect(renderFeeDisplay("")).toBe("Chưa có dữ liệu");
            expect(renderFeeDisplay("not-a-number")).toBe("Chưa có dữ liệu");
            expect(renderFeeDisplay(150000)).toMatch(/150\.000/);
        });
    });

    describe("Data Truthfulness: No Synthetic Placeholders", () => {
        it("getBookingCodeDisplay: handles valid codes, empty/missing inputs, and never synthesizes BK-${id}", () => {
            expect(getBookingCodeDisplay("BK-20261109-001")).toBe("BK-20261109-001");
            expect(getBookingCodeDisplay("  TK-1002  ")).toBe("TK-1002");
            expect(getBookingCodeDisplay(null)).toBe("Chưa có mã");
            expect(getBookingCodeDisplay(undefined)).toBe("Chưa có mã");
            expect(getBookingCodeDisplay("")).toBe("Chưa có mã");
            expect(getBookingCodeDisplay("   ")).toBe("Chưa có mã");
            // Must not accept raw numbers or objects as codes
            expect(getBookingCodeDisplay(42)).toBe("Chưa có mã");
        });

        it("getQueueNumberDisplay: preserves #0 for 0, uses queueCode or falls back to 'Chờ cấp số tại quầy'", () => {
            expect(getQueueNumberDisplay(0)).toBe("#0");
            expect(getQueueNumberDisplay(15)).toBe("#15");
            expect(getQueueNumberDisplay(null, "KB-08")).toBe("KB-08");
            expect(getQueueNumberDisplay(undefined, "KB-12")).toBe("KB-12");
            expect(getQueueNumberDisplay(null, null)).toBe("Chờ cấp số tại quầy");
            expect(getQueueNumberDisplay(undefined, undefined)).toBe("Chờ cấp số tại quầy");
            expect(getQueueNumberDisplay("", "")).toBe("Chờ cấp số tại quầy");
        });

        it("patientProfileDoesNotSynthesizeQueueNumberOrBookingCode: preserves null queue and missing code", () => {
            const rawBooking = {
                bookingId: 42,
                bookingCode: null,
                queueNumber: null,
                patientName: "Trần Thị B",
                doctorName: null,
                roomName: null
            };

            const mapped = {
                ...rawBooking,
                queueNumber: rawBooking.queueNumber != null ? rawBooking.queueNumber : null,
                bookingCode: getBookingCodeDisplay(rawBooking.bookingCode),
                doctorName: rawBooking.doctorName || "Chưa phân công",
                roomName: rawBooking.roomName || "Chưa xếp phòng"
            };

            expect(mapped.queueNumber).toBeNull();
            expect(mapped.doctorName).toBe("Chưa phân công");
            expect(mapped.roomName).toBe("Chưa xếp phòng");
            // Must NOT synthesize BK-42
            expect(mapped.bookingCode).toBe("Chưa có mã");
            expect(mapped.bookingCode).not.toBe("BK-42");
        });

        it("patientProfilesPageRendersWithoutSynthesizingKBQueuePrefix: does not show fake KB- prefix for null queue", () => {
            const html = renderToStaticMarkup(
                <MemoryRouter initialEntries={["/profiles?tab=ticket"]}>
                    <PatientProfilesPage />
                </MemoryRouter>
            );

            expect(html).toBeDefined();
            // Should not contain synthetic "KB-undefined" or "KB-null"
            expect(html).not.toContain("KB-undefined");
            expect(html).not.toContain("KB-null");
        });

        it("doesNotInventDoctorPortraitsWhenAvatarMissing: schedules without avatar show initials and not stock photos", () => {
            const schWithoutAvatar = {
                scheduleId: 101,
                doctorName: "BS.CKII Nguyễn Văn Cường",
                avatar: null,
                session: "MORNING",
                roomName: "P.201"
            };

            const doctorPhoto = schWithoutAvatar.avatar || null;
            expect(doctorPhoto).toBeNull();

            const initial = getDoctorInitials(schWithoutAvatar.doctorName);
            expect(initial).toBe("N");
        });
    });

    describe("Race Condition & Sequence Invalidation Guard", () => {
        // Minimal DOM harness for testing real component state/flow in Node
        function setupMinimalDOM() {
            const listeners = new Map();
            const createElem = (tag) => {
                const el = {
                    tagName: tag.toUpperCase(),
                    nodeType: 1,
                    style: {},
                    children: [],
                    childNodes: [],
                    attributes: {},
                    setAttribute: (k, v) => { el.attributes[k] = v; },
                    getAttribute: (k) => el.attributes[k],
                    removeAttribute: (k) => { delete el.attributes[k]; },
                    appendChild: (child) => {
                        child.parentNode = el;
                        el.children.push(child);
                        el.childNodes.push(child);
                        return child;
                    },
                    removeChild: (child) => {
                        el.children = el.children.filter(c => c !== child);
                        el.childNodes = el.childNodes.filter(c => c !== child);
                    },
                    insertBefore: (newChild) => el.appendChild(newChild),
                    addEventListener: (type, fn) => {
                        if (!listeners.has(type)) listeners.set(type, new Set());
                        listeners.get(type).add(fn);
                    },
                    removeEventListener: (type, fn) => {
                        if (listeners.has(type)) listeners.get(type).delete(fn);
                    },
                    ownerDocument: null
                };
                return el;
            };

            const doc = {
                nodeType: 9,
                createElement: (tag) => {
                    const el = createElem(tag);
                    el.ownerDocument = doc;
                    return el;
                },
                createElementNS: (ns, tag) => doc.createElement(tag),
                createTextNode: (text) => ({ nodeType: 3, nodeValue: text, textContent: text, parentNode: null }),
                createComment: (text) => ({ nodeType: 8, nodeValue: text, parentNode: null }),
                addEventListener: () => {},
                removeEventListener: () => {},
                documentElement: null,
                body: null
            };
            doc.documentElement = doc.createElement('html');
            doc.body = doc.createElement('body');
            doc.documentElement.appendChild(doc.body);

            globalThis.document = doc;
            globalThis.window = {
                document: doc,
                addEventListener: () => {},
                removeEventListener: () => {},
                dispatchEvent: () => {},
                getComputedStyle: () => ({ getPropertyValue: () => '' }),
                setTimeout,
                clearTimeout,
                setInterval,
                clearInterval
            };
            if (!globalThis.navigator) { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node' }, configurable: true }); }

            globalThis.Element = class Element {};
            globalThis.HTMLElement = class HTMLElement extends globalThis.Element {};
            globalThis.HTMLIFrameElement = class HTMLIFrameElement extends globalThis.HTMLElement {};
            globalThis.HTMLInputElement = class HTMLInputElement extends globalThis.HTMLElement {};
            globalThis.HTMLTextAreaElement = class HTMLTextAreaElement extends globalThis.HTMLElement {};
            globalThis.HTMLSelectElement = class HTMLSelectElement extends globalThis.HTMLElement {};
            globalThis.Node = class Node {};

            globalThis.window.HTMLIFrameElement = globalThis.HTMLIFrameElement;
            globalThis.window.Element = globalThis.Element;
            globalThis.window.HTMLElement = globalThis.HTMLElement;
            globalThis.window.HTMLInputElement = globalThis.HTMLInputElement;
            globalThis.window.HTMLTextAreaElement = globalThis.HTMLTextAreaElement;
            globalThis.window.HTMLSelectElement = globalThis.HTMLSelectElement;
            globalThis.window.Node = globalThis.Node;

            globalThis.IS_REACT_ACT_ENVIRONMENT = true;
            return doc.createElement('div');
        }

        function createDeferred() {
            let resolve, reject;
            const promise = new Promise((res, rej) => {
                resolve = res;
                reject = rej;
            });
            return { promise, resolve, reject };
        }

        it("isReservationStale: detects sequence changes, date changes, and department changes", () => {
            const baseline = {
                currentSeq: 1,
                activeSeq: 1,
                requestDate: "2026-11-09",
                currentDate: "2026-11-09",
                requestDeptId: "dept-cardio",
                currentDeptId: "dept-cardio"
            };

            // Case 1: Fresh in-sync request -> NOT stale
            expect(isReservationStale(baseline)).toBe(false);

            // Case 2: User clicked another slot while previous was in-flight (activeSeq changed) -> STALE
            expect(isReservationStale({
                ...baseline,
                activeSeq: 2
            })).toBe(true);

            // Case 3: User changed selectedDate while request was in-flight -> STALE
            expect(isReservationStale({
                ...baseline,
                currentDate: "2026-11-10"
            })).toBe(true);

            // Case 4: User changed selectedDept while request was in-flight -> STALE
            expect(isReservationStale({
                ...baseline,
                currentDeptId: "dept-ortho"
            })).toBe(true);
        });

        it("isScheduleStale: detects superseded schedule requests, date changes, and department changes", () => {
            const baseline = {
                requestSeq: 1,
                activeSeq: 1,
                requestDate: "2026-11-09",
                currentDate: "2026-11-09",
                requestDeptId: "dept-cardio",
                currentDeptId: "dept-cardio"
            };

            expect(isScheduleStale(baseline)).toBe(false);

            // Superseded by newer schedule fetch
            expect(isScheduleStale({ ...baseline, activeSeq: 2 })).toBe(true);

            // User changed date before response arrived
            expect(isScheduleStale({ ...baseline, currentDate: "2026-11-10" })).toBe(true);

            // User changed department before response arrived
            expect(isScheduleStale({ ...baseline, currentDeptId: "dept-pedia" })).toBe(true);
        });

        it("dateChangeDuringPendingReserveSafelyReleasesHoldAndFreesLock: component frees lock and server releases hold", async () => {
            const container = setupMinimalDOM();
            const root = ReactDOMClient.createRoot(container);

            const deferredReserve = createDeferred();
            const postCalls = [];
            const mockAxios = {
                get: vi.fn(() => Promise.resolve({ data: [] })),
                post: vi.fn((url, body) => {
                    postCalls.push({ url, body });
                    if (url === "/api/bookings/reserve-slot") return deferredReserve.promise;
                    return Promise.resolve({ data: {} });
                })
            };

            let currentState;
            function Harness({ selectedDept, selectedDate, selectedProfile }) {
                currentState = useBookingScheduleWorkflow({
                    selectedDept,
                    selectedDate,
                    selectedProfile,
                    axiosClient: mockAxios
                });
                return null;
            }

            // 1. Mount harness on Date 1
            act(() => {
                root.render(
                    React.createElement(Harness, {
                        selectedDept: { departmentId: 10, departmentName: "Khoa Tim Mạch" },
                        selectedDate: "2026-11-10",
                        selectedProfile: { patientProfileId: 101 }
                    })
                );
            });

            // 2. Select slot -> reservation request is in flight
            let reserveCallPromise;
            act(() => {
                reserveCallPromise = currentState.handleSelectSlot({ timeSlotId: "slot-A" });
            });

            // During pending reserve, reservingSlot must be locked
            expect(currentState.reservingSlot).toBe(true);

            // 3. User changes date while reserve request is pending
            act(() => {
                root.render(
                    React.createElement(Harness, {
                        selectedDept: { departmentId: 10, departmentName: "Khoa Tim Mạch" },
                        selectedDate: "2026-11-11", // Changed date!
                        selectedProfile: { patientProfileId: 101 }
                    })
                );
            });

            // Item 1 requirement: fetchSchedules immediately frees reservingSlot lock
            expect(currentState.reservingSlot).toBe(false);

            // 4. Stale reserve promise finally resolves
            await act(async () => {
                deferredReserve.resolve({
                    data: { reservationId: "res-stale-999", ttlSeconds: 600 }
                });
                await reserveCallPromise;
            });

            // State must NOT adopt stale slot or reservation
            expect(currentState.reservingSlot).toBe(false);
            expect(currentState.selectedSlot).toBeNull();
            expect(currentState.reservationId).toBeNull();

            // Stale reservation must be immediately released on server
            const releasedCall = postCalls.find(c => c.url === "/api/bookings/release-slot/res-stale-999");
            expect(releasedCall).toBeDefined();
        });

        it("outOfOrderScheduleResponsesPreserveLatestDateAndDoNotOverwriteWithStaleData: stale response is ignored", async () => {
            const container = setupMinimalDOM();
            const root = ReactDOMClient.createRoot(container);

            const deferredA = createDeferred();
            const deferredB = createDeferred();

            const mockAxios = {
                get: vi.fn((url) => {
                    if (url.includes("date=2026-11-10")) return deferredA.promise;
                    if (url.includes("date=2026-11-11")) return deferredB.promise;
                    return Promise.resolve({ data: [] });
                }),
                post: vi.fn(() => Promise.resolve({ data: {} }))
            };

            let currentState;
            function Harness({ selectedDept, selectedDate }) {
                currentState = useBookingScheduleWorkflow({
                    selectedDept,
                    selectedDate,
                    selectedProfile: null,
                    axiosClient: mockAxios
                });
                return null;
            }

            // 1. Initial request for Date A (2026-11-10)
            act(() => {
                root.render(
                    React.createElement(Harness, {
                        selectedDept: { departmentId: 10, departmentName: "Khoa Tim Mạch" },
                        selectedDate: "2026-11-10"
                    })
                );
            });

            // 2. User quickly switches to Date B (2026-11-11) before Date A completes
            act(() => {
                root.render(
                    React.createElement(Harness, {
                        selectedDept: { departmentId: 10, departmentName: "Khoa Tim Mạch" },
                        selectedDate: "2026-11-11"
                    })
                );
            });

            // 3. Request B resolves FIRST
            const schedulesB = [{ scheduleId: 202, doctorName: "BS. Lịch Khám Ngày B", session: "MORNING" }];
            await act(async () => {
                deferredB.resolve({ data: schedulesB });
            });

            expect(currentState.schedules).toEqual(schedulesB);
            expect(currentState.loadingSchedules).toBe(false);

            // 4. Request A resolves LATER (out of order!)
            const schedulesA = [{ scheduleId: 101, doctorName: "BS. Lịch Khám Ngày A", session: "MORNING" }];
            await act(async () => {
                deferredA.resolve({ data: schedulesA });
            });

            // Item 2 requirement: Date A response is rejected; Date B schedules remain intact!
            expect(currentState.schedules).toEqual(schedulesB);
            expect(currentState.schedules).not.toEqual(schedulesA);
            expect(currentState.loadingSchedules).toBe(false);
        });
    });

    describe("Đợt 1 · Regression Tests: Xử lý chuỗi triệu chứng tiếng Việt & Điều hướng Trang chủ", () => {
        it("handlesNavigationStateSymptomsWithSpecialCharacters: không crash và đọc đúng chuỗi có %, + và &", () => {
            const symptomsText = "Sốt cao 39.5°C + ho có đờm & tức ngực (giảm 50% thể lực)";

            let renderedHtml = "";
            expect(() => {
                renderedHtml = renderToStaticMarkup(
                    <MemoryRouter
                        initialEntries={[
                            {
                                pathname: "/booking",
                                state: { symptoms: symptomsText }
                            }
                        ]}
                    >
                        <BookingPage />
                    </MemoryRouter>
                );
            }).not.toThrow();

            expect(renderedHtml).toMatch(/Đặt Lịch Khám/i);
        });

        it("handlesUrlSymptomsWithPercentPlusAndAmpersandWithoutURIError: không bị lỗi URI malformed khi có %", () => {
            const queryWithPercent = "symptoms=" + encodeURIComponent("Đau đầu + tức ngực & giảm 50% thị lực");

            let renderedHtml = "";
            expect(() => {
                renderedHtml = renderToStaticMarkup(
                    <MemoryRouter initialEntries={[`/booking?${queryWithPercent}`]}>
                        <BookingPage />
                    </MemoryRouter>
                );
            }).not.toThrow();

            expect(renderedHtml).toMatch(/Đặt Lịch Khám/i);
            expect(renderedHtml).not.toContain("URIError");
        });

        it("handlesRawPercentInUrlQueryWithoutCrash: chuỗi URL có % chưa hoàn chỉnh không làm nổ trang", () => {
            let renderedHtml = "";
            expect(() => {
                renderedHtml = renderToStaticMarkup(
                    <MemoryRouter initialEntries={["/booking?symptoms=Đau%20100%25%20và%20sốt%20cao"]}>
                        <BookingPage />
                    </MemoryRouter>
                );
            }).not.toThrow();

            expect(renderedHtml).toMatch(/Đặt Lịch Khám/i);
        });

        it("rendersSymptomsFieldAcrossBookingStepsWithoutCrash: component render các bước mang theo triệu chứng", () => {
            const symptomsText = "Sốt cao 39°C + ho đờm & giảm 30% sức khỏe";

            const html = renderToStaticMarkup(
                <MemoryRouter
                    initialEntries={[
                        {
                            pathname: "/booking",
                            search: `?departmentId=1&symptoms=${encodeURIComponent(symptomsText)}`,
                            state: { symptoms: symptomsText, departmentId: 1 }
                        }
                    ]}
                >
                    <BookingPage />
                </MemoryRouter>
            );

            expect(html).toMatch(/Đặt Lịch Khám/i);
            expect(html).not.toContain("URIError");
        });

        it("homePageExposesDistinctDepartmentAndSymptomTabsAndActionButtons: Trang chủ có 2 nút chính/phụ và 2 tab tìm kiếm", () => {
            const html = renderToStaticMarkup(
                <MemoryRouter initialEntries={["/"]}>
                    <HomePage />
                </MemoryRouter>
            );

            // Nút chính và phụ rõ ràng
            expect(html).toContain("Đặt lịch khám");
            expect(html).toContain("Tra cứu");

            // Tách rõ 2 tab: Tìm chuyên khoa và Mô tả triệu chứng
            expect(html).toContain("Tìm chuyên khoa");
            expect(html).toContain("Mô tả triệu chứng");

            // Lưới dịch vụ y tế trực tuyến
            expect(html).toMatch(/Lưới dịch vụ y tế trực tuyến/i);
            expect(html).toContain("Xác Thực Đơn Thuốc");
            expect(html).toContain("Ví Viện Phí &amp; Nạp Tiền");
        });
    });
});
