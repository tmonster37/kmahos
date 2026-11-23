import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import PatientProfilesPage from "../pages/patient/PatientProfilesPage";

vi.mock("../context/AuthContext", () => ({
    useAuth: () => ({
        user: { userId: "patient-1", fullName: "Nguyễn Văn A", phoneNumber: "0987654321", role: "ROLE_PATIENT" },
        isAuthenticated: true,
        role: "ROLE_PATIENT"
    })
}));

vi.mock("../services/AxiosInstance", () => ({
    default: {
        get: vi.fn(() => Promise.resolve({ data: [] })),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        put: vi.fn(() => Promise.resolve({ data: {} })),
        delete: vi.fn(() => Promise.resolve({ data: {} }))
    }
}));

vi.mock("../services/bookingApi", () => ({
    bookingApi: {
        getMyProfiles: vi.fn(() => Promise.resolve({ data: [] })),
        getMyBookings: vi.fn(() => Promise.resolve({ data: [] }))
    }
}));

vi.mock("../services/clinicalApi", () => ({
    clinicalApi: {
        getRecordByBookingCode: vi.fn(() => Promise.resolve({ data: null }))
    }
}));

describe("PatientProfilesPage — Follow-up date in history detail", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const baseHistoryDetail = {
        bookingId: "b-001",
        bookingCode: "BK-20261115-01",
        patientName: "Nguyễn Văn A",
        doctorName: "BS. Trần Văn B",
        departmentName: "Khoa Nội Tổng Quát",
        bookingDate: "2026-11-15",
        status: "COMPLETED",
        medicines: []
    };

    it("displaysClinicalReExaminationDateWhenRecordIsDone: displays real re-examination date in history detail", () => {
        const historyWithDate = {
            ...baseHistoryDetail,
            reExaminationDate: "2026-11-20"
        };

        const html = renderToStaticMarkup(
            <MemoryRouter initialEntries={["/profiles?tab=history"]}>
                <PatientProfilesPage
                    initialActiveTab={2}
                    initialSelectedHistoryDetail={historyWithDate}
                />
            </MemoryRouter>
        );

        expect(html).toContain("Tái khám ngày: 20/11/2026");
        expect(html).not.toContain("27/12/2023");
    });

    it("showsExplicitNoDateStateWhenReExaminationDateIsNull: displays 'Chưa có ngày hẹn tái khám' when no date exists", () => {
        const historyNoDate = {
            ...baseHistoryDetail,
            reExaminationDate: null,
            doctorNotes: "Bệnh nhân uống nhiều nước, nghỉ ngơi"
        };

        const html = renderToStaticMarkup(
            <MemoryRouter initialEntries={["/profiles?tab=history"]}>
                <PatientProfilesPage
                    initialActiveTab={2}
                    initialSelectedHistoryDetail={historyNoDate}
                />
            </MemoryRouter>
        );

        expect(html).toContain("Chưa có ngày hẹn tái khám");
        expect(html).not.toContain("27/12/2023");
    });

    it("neverDisplaysFabricatedDate27122023: even with date patterns in doctorNotes, never fabricates 27/12/2023", () => {
        const historyWithNoteDate = {
            ...baseHistoryDetail,
            reExaminationDate: null,
            doctorNotes: "Khám lại sau đợt uống thuốc ngày 01/01/2025"
        };

        const html = renderToStaticMarkup(
            <MemoryRouter initialEntries={["/profiles?tab=history"]}>
                <PatientProfilesPage
                    initialActiveTab={2}
                    initialSelectedHistoryDetail={historyWithNoteDate}
                />
            </MemoryRouter>
        );

        expect(html).not.toContain("27/12/2023");
        expect(html).toContain("Chưa có ngày hẹn tái khám");
    });

    it("guardianNoteRemainsUnchanged: preserves exact guardian note wording", () => {
        const historyWithDate = {
            ...baseHistoryDetail,
            reExaminationDate: "2026-11-20"
        };

        const html = renderToStaticMarkup(
            <MemoryRouter initialEntries={["/profiles?tab=history"]}>
                <PatientProfilesPage
                    initialActiveTab={2}
                    initialSelectedHistoryDetail={historyWithDate}
                />
            </MemoryRouter>
        );

        expect(html).toContain("Lưu ý: Trẻ em cần có bố mẹ đi tái khám chung");
    });

    it("networkErrorDisplaysRetryWarning: displays retryable warning when clinical record lookup fails", () => {
        const historyWithError = {
            ...baseHistoryDetail,
            reExaminationDate: null,
            clinicalRecordError: "Không thể tải thông tin bệnh án từ máy chủ. Vui lòng thử lại sau."
        };

        const html = renderToStaticMarkup(
            <MemoryRouter initialEntries={["/profiles?tab=history"]}>
                <PatientProfilesPage
                    initialActiveTab={2}
                    initialSelectedHistoryDetail={historyWithError}
                />
            </MemoryRouter>
        );

        expect(html).toContain("Không thể tải thông tin bệnh án từ máy chủ. Vui lòng thử lại sau.");
        expect(html).not.toContain("Chưa có ngày hẹn tái khám");
        expect(html).not.toContain("27/12/2023");
    });

    it("loadingClinicalRecordDisplaysLoadingIndicatorRatherThanEmptyState: does not render 'Chưa có ngày hẹn tái khám' while loading", () => {
        const historyLoading = {
            ...baseHistoryDetail,
            loadingClinicalRecord: true,
            reExaminationDate: null
        };

        const html = renderToStaticMarkup(
            <MemoryRouter initialEntries={["/profiles?tab=history"]}>
                <PatientProfilesPage
                    initialActiveTab={2}
                    initialSelectedHistoryDetail={historyLoading}
                />
            </MemoryRouter>
        );

        expect(html).toContain("Đang tải thông tin tái khám...");
        expect(html).not.toContain("Chưa có ngày hẹn tái khám");
        expect(html).not.toContain("27/12/2023");
    });
});

describe("PatientProfilesPage — Interactive History Detail Workflow & Race Condition Guard", () => {
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
        if (!globalThis.navigator) {
            Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node' }, configurable: true });
        }

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

    it("callsClinicalApiWithRawBookingCodeAndExtractsDoneDate: calls API using raw booking code and extracts date only when DONE", async () => {
        const { usePatientHistoryDetailWorkflow } = await import("../pages/patient/PatientProfilesPage");
        const ReactDOMClient = (await import("react-dom/client")).default;
        const { act } = await import("react");

        const container = setupMinimalDOM();
        const root = ReactDOMClient.createRoot(container);

        const mockClinicalApi = {
            getRecordByBookingCode: vi.fn().mockResolvedValue({
                data: {
                    recordId: "rec-done-1",
                    state: "DONE",
                    reExaminationDate: "2026-11-25"
                }
            })
        };

        let workflow;
        function Harness() {
            workflow = usePatientHistoryDetailWorkflow({ clinicalApiClient: mockClinicalApi });
            return null;
        }

        act(() => {
            root.render(React.createElement(Harness));
        });

        // Trigger opening detail with raw booking code
        await act(async () => {
            await workflow.handleOpenHistoryDetail({
                bookingId: "b-1",
                rawBookingCode: "BK-RAW-999",
                bookingCode: "Chưa có mã"
            });
        });

        expect(mockClinicalApi.getRecordByBookingCode).toHaveBeenCalledWith("BK-RAW-999");
        expect(workflow.selectedHistoryDetail.reExaminationDate).toBe("2026-11-25");
        expect(workflow.selectedHistoryDetail.loadingClinicalRecord).toBe(false);
        expect(workflow.selectedHistoryDetail.clinicalRecordError).toBeNull();
    });

    it("nonDoneRecordResultsInNullReExaminationDate: state !== 'DONE' (e.g. EXAMINING) does not adopt reExaminationDate", async () => {
        const { usePatientHistoryDetailWorkflow } = await import("../pages/patient/PatientProfilesPage");
        const ReactDOMClient = (await import("react-dom/client")).default;
        const { act } = await import("react");

        const container = setupMinimalDOM();
        const root = ReactDOMClient.createRoot(container);

        const mockClinicalApi = {
            getRecordByBookingCode: vi.fn().mockResolvedValue({
                data: {
                    recordId: "rec-examining-1",
                    state: "EXAMINING",
                    reExaminationDate: "2026-11-25"
                }
            })
        };

        let workflow;
        function Harness() {
            workflow = usePatientHistoryDetailWorkflow({ clinicalApiClient: mockClinicalApi });
            return null;
        }

        act(() => {
            root.render(React.createElement(Harness));
        });

        await act(async () => {
            await workflow.handleOpenHistoryDetail({
                bookingId: "b-examining",
                bookingCode: "BK-EXAMINING-01"
            });
        });

        expect(mockClinicalApi.getRecordByBookingCode).toHaveBeenCalledWith("BK-EXAMINING-01");
        expect(workflow.selectedHistoryDetail.reExaminationDate).toBeNull();
        expect(workflow.selectedHistoryDetail.loadingClinicalRecord).toBe(false);
        expect(workflow.selectedHistoryDetail.clinicalRecordError).toBeNull();
    });

    it("notFoundSetsNullDateWithoutError: 404 response sets reExaminationDate to null without error alert", async () => {
        const { usePatientHistoryDetailWorkflow } = await import("../pages/patient/PatientProfilesPage");
        const ReactDOMClient = (await import("react-dom/client")).default;
        const { act } = await import("react");

        const container = setupMinimalDOM();
        const root = ReactDOMClient.createRoot(container);

        const notFoundError = new Error("Not Found");
        notFoundError.response = { status: 404 };

        const mockClinicalApi = {
            getRecordByBookingCode: vi.fn().mockRejectedValue(notFoundError)
        };

        let workflow;
        function Harness() {
            workflow = usePatientHistoryDetailWorkflow({ clinicalApiClient: mockClinicalApi });
            return null;
        }

        act(() => {
            root.render(React.createElement(Harness));
        });

        await act(async () => {
            await workflow.handleOpenHistoryDetail({
                bookingId: "b-404",
                bookingCode: "BK-NOT-FOUND"
            });
        });

        expect(workflow.selectedHistoryDetail.reExaminationDate).toBeNull();
        expect(workflow.selectedHistoryDetail.clinicalRecordError).toBeNull();
        expect(workflow.selectedHistoryDetail.loadingClinicalRecord).toBe(false);
    });

    it("networkErrorSetsRetryableAlert: server error sets clinicalRecordError message", async () => {
        const { usePatientHistoryDetailWorkflow } = await import("../pages/patient/PatientProfilesPage");
        const ReactDOMClient = (await import("react-dom/client")).default;
        const { act } = await import("react");

        const container = setupMinimalDOM();
        const root = ReactDOMClient.createRoot(container);

        const serverError = new Error("Internal Server Error");
        serverError.response = { status: 500 };

        const mockClinicalApi = {
            getRecordByBookingCode: vi.fn().mockRejectedValue(serverError)
        };

        let workflow;
        function Harness() {
            workflow = usePatientHistoryDetailWorkflow({ clinicalApiClient: mockClinicalApi });
            return null;
        }

        act(() => {
            root.render(React.createElement(Harness));
        });

        await act(async () => {
            await workflow.handleOpenHistoryDetail({
                bookingId: "b-500",
                bookingCode: "BK-ERR-500"
            });
        });

        expect(workflow.selectedHistoryDetail.clinicalRecordError).toBe(
            "Không thể tải thông tin bệnh án từ máy chủ. Vui lòng thử lại sau."
        );
        expect(workflow.selectedHistoryDetail.loadingClinicalRecord).toBe(false);
    });

    it("raceConditionSequenceGuardDiscardsStaleOutOfOrderResponses: rapid clicks discard superseded responses", async () => {
        const { usePatientHistoryDetailWorkflow } = await import("../pages/patient/PatientProfilesPage");
        const ReactDOMClient = (await import("react-dom/client")).default;
        const { act } = await import("react");

        const container = setupMinimalDOM();
        const root = ReactDOMClient.createRoot(container);

        const deferredA = createDeferred();
        const deferredB = createDeferred();

        const mockClinicalApi = {
            getRecordByBookingCode: vi.fn((code) => {
                if (code === "BK-FAST-B") return deferredB.promise;
                if (code === "BK-SLOW-A") return deferredA.promise;
                return Promise.resolve({ data: null });
            })
        };

        let workflow;
        function Harness() {
            workflow = usePatientHistoryDetailWorkflow({ clinicalApiClient: mockClinicalApi });
            return null;
        }

        act(() => {
            root.render(React.createElement(Harness));
        });

        // 1. User clicks Item A (slow response)
        let promiseA;
        act(() => {
            promiseA = workflow.handleOpenHistoryDetail({
                bookingId: "b-A",
                bookingCode: "BK-SLOW-A"
            });
        });

        // 2. User quickly clicks Item B (fast response)
        let promiseB;
        act(() => {
            promiseB = workflow.handleOpenHistoryDetail({
                bookingId: "b-B",
                bookingCode: "BK-FAST-B"
            });
        });

        // 3. Resolve B first
        await act(async () => {
            deferredB.resolve({
                data: {
                    recordId: "rec-B",
                    state: "DONE",
                    reExaminationDate: "2026-11-28"
                }
            });
            await promiseB;
        });

        expect(workflow.selectedHistoryDetail.bookingCode).toBe("BK-FAST-B");
        expect(workflow.selectedHistoryDetail.reExaminationDate).toBe("2026-11-28");

        // 4. Stale request A resolves late
        await act(async () => {
            deferredA.resolve({
                data: {
                    recordId: "rec-A",
                    state: "DONE",
                    reExaminationDate: "2026-11-15"
                }
            });
            await promiseA;
        });

        // MUST NOT overwrite Item B with Item A's stale data
        expect(workflow.selectedHistoryDetail.bookingCode).toBe("BK-FAST-B");
        expect(workflow.selectedHistoryDetail.reExaminationDate).toBe("2026-11-28");
    });

    it("staleErrorDoesNotOverwriteActiveRecord: late error from cancelled request is ignored", async () => {
        const { usePatientHistoryDetailWorkflow } = await import("../pages/patient/PatientProfilesPage");
        const ReactDOMClient = (await import("react-dom/client")).default;
        const { act } = await import("react");

        const container = setupMinimalDOM();
        const root = ReactDOMClient.createRoot(container);

        const deferredA = createDeferred();
        const deferredB = createDeferred();

        const mockClinicalApi = {
            getRecordByBookingCode: vi.fn((code) => {
                if (code === "BK-FAST-B") return deferredB.promise;
                if (code === "BK-SLOW-A") return deferredA.promise;
                return Promise.resolve({ data: null });
            })
        };

        let workflow;
        function Harness() {
            workflow = usePatientHistoryDetailWorkflow({ clinicalApiClient: mockClinicalApi });
            return null;
        }

        act(() => {
            root.render(React.createElement(Harness));
        });

        // 1. User clicks Item A
        let promiseA;
        act(() => {
            promiseA = workflow.handleOpenHistoryDetail({
                bookingId: "b-A",
                bookingCode: "BK-SLOW-A"
            });
        });

        // 2. User quickly clicks Item B
        let promiseB;
        act(() => {
            promiseB = workflow.handleOpenHistoryDetail({
                bookingId: "b-B",
                bookingCode: "BK-FAST-B"
            });
        });

        // 3. Resolve B
        await act(async () => {
            deferredB.resolve({
                data: {
                    recordId: "rec-B",
                    state: "DONE",
                    reExaminationDate: "2026-11-28"
                }
            });
            await promiseB;
        });

        // 4. Reject A with network error
        await act(async () => {
            const netErr = new Error("Network timeout");
            netErr.response = { status: 504 };
            deferredA.reject(netErr);
            await promiseA.catch(() => {});
        });

        // MUST keep B and NOT set clinicalRecordError
        expect(workflow.selectedHistoryDetail.bookingCode).toBe("BK-FAST-B");
        expect(workflow.selectedHistoryDetail.clinicalRecordError).toBeNull();
        expect(workflow.selectedHistoryDetail.reExaminationDate).toBe("2026-11-28");
    });

    it("closingHistoryDetailCancelsInFlightRequests: closed detail is not reopened by late response", async () => {
        const { usePatientHistoryDetailWorkflow } = await import("../pages/patient/PatientProfilesPage");
        const ReactDOMClient = (await import("react-dom/client")).default;
        const { act } = await import("react");

        const container = setupMinimalDOM();
        const root = ReactDOMClient.createRoot(container);

        const deferredA = createDeferred();
        const mockClinicalApi = {
            getRecordByBookingCode: vi.fn(() => deferredA.promise)
        };

        let workflow;
        function Harness() {
            workflow = usePatientHistoryDetailWorkflow({ clinicalApiClient: mockClinicalApi });
            return null;
        }

        act(() => {
            root.render(React.createElement(Harness));
        });

        let promiseA;
        act(() => {
            promiseA = workflow.handleOpenHistoryDetail({
                bookingId: "b-A",
                bookingCode: "BK-SLOW-A"
            });
        });

        // User closes the modal before request finishes
        act(() => {
            workflow.handleCloseHistoryDetail();
        });

        expect(workflow.selectedHistoryDetail).toBeNull();

        // Late response arrives
        await act(async () => {
            deferredA.resolve({
                data: {
                    recordId: "rec-A",
                    state: "DONE",
                    reExaminationDate: "2026-11-15"
                }
            });
            await promiseA;
        });

        // Must remain null!
        expect(workflow.selectedHistoryDetail).toBeNull();
    });
});

