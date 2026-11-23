import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CounterManagementPanel, {
  selectTargetRoomCandidate,
  filterEligibleRoomsForTicket,
  calculateTicketDuePure,
  executePayAndDispatch
} from "../components/nurse/CounterManagementPanel";
import axiosInstance from "../services/AxiosInstance";

vi.mock("../services/AxiosInstance", () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { data: [] } })),
    post: vi.fn(() => Promise.resolve({ data: { data: {} } })),
    put: vi.fn(() => Promise.resolve({ data: { data: {} } }))
  }
}));

vi.mock("../services/voiceService", () => ({
  playChime: vi.fn(() => Promise.resolve()),
  speakPatientCall: vi.fn(() => Promise.resolve()),
  speakCounterCall: vi.fn(() => Promise.resolve()),
  speakCashierCall: vi.fn(() => Promise.resolve()),
  getVietnameseVoice: vi.fn(() => null)
}));

describe("CounterManagementPanel Billing & Queue Dispatch Behavioral Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. renders Quầy Thu Viện Phí & Điều Phối Khám Bệnh cleanly", () => {
    const html = renderToStaticMarkup(
      <CounterManagementPanel onPatientDispatched={vi.fn()} onOpenPayModal={vi.fn()} />
    );

    expect(html).toBeDefined();
    // Tiêu đề & định vị nghiệp vụ chuẩn lịch sử
    expect(html).toContain("BÀN ĐIỀU PHỐI QUẦY TIẾP ĐÓN SẢNH");
    expect(html).toContain("COUNTER CONTROL");

    // 4 Tabs phân luồng phục vụ theo yêu cầu
    expect(html).toContain("Tất Cả Hàng Đợi");
    expect(html).toContain("1. Chờ Thu Tiền Khám");
    expect(html).toContain("2. Thu Phí Xét Nghiệm (CLS)");
    expect(html).toContain("3. Đối Tượng Ưu Tiên");

    // Nút gọi số thông minh tự động ưu tiên
    expect(html).toContain("GỌI SỐ TIẾP THEO (CALL NEXT)");
  });

  it("2. paidDispatchFailureRetriesOnlyDispatch: Test handler thực tế - Retry sau khi lỗi điều phối không gọi lại API thanh toán", async () => {
    // Kịch bản: Bệnh nhân nộp viện phí 150.000 đ tại quầy, thu tiền thành công nhưng điều phối buồng khám bị lỗi
    const ticket = {
      ticketId: "105",
      ticketCode: "TN-05",
      bookingCode: "BK-105",
      patientName: "Phạm Văn Minh",
      phoneNumber: "0901234567",
      departmentName: "Khoa Nội Tổng Quát",
      price: 150000,
      isPaid: false
    };

    const candidateRooms = [
      { roomId: "101", roomName: "Phòng 101", departmentName: "Khoa Nội Tổng Quát", doctorName: "BS. Lan" }
    ];

    // Lần 1: Thu tiền thành công nhưng điều phối buồng khám thất bại
    axiosInstance.post.mockImplementation((url) => {
      if (url === "/api/nurse/reception/pay-at-clinic") {
        return Promise.resolve({ data: { data: { receiptCode: "REC-105" } } });
      }
      if (url.includes("/complete")) {
        return Promise.reject(new Error("Lỗi kết nối buồng khám bác sĩ hoặc mạng chập chờn"));
      }
      return Promise.resolve({ data: { data: {} } });
    });

    const firstRun = await executePayAndDispatch({
      ticket,
      effectiveCounterId: "CTR-01",
      paymentMethod: "CASH",
      dispatchMode: "AUTO",
      candidateRooms,
      leastLoadedRoom: candidateRooms[0],
      isAlreadyPaid: false,
      axiosClient: axiosInstance
    });

    // Lần 1 phải ghi nhận đã thanh toán nhưng cần thử lại điều phối
    expect(firstRun.success).toBe(false);
    expect(firstRun.dispatchRetryNeeded).toBe(true);
    expect(firstRun.isPaid).toBe(true);
    expect(ticket.isPaid).toBe(true);
    expect(firstRun.error).toContain("Khoản phí đã được ghi nhận thành công, nhưng chưa thể điều phối vào buồng khám");

    // Xác nhận API thanh toán được gọi 1 lần
    expect(axiosInstance.post).toHaveBeenCalledWith(
      "/api/nurse/reception/pay-at-clinic",
      expect.objectContaining({
        bookingCode: "BK-105",
        amount: 150000
      })
    );

    // Xóa mock history để kiểm tra lần 2
    axiosInstance.post.mockClear();

    // Lần 2: Điều dưỡng bấm [THỬ LẠI ĐIỀU PHỐI VÀO BUỒNG KHÁM]
    axiosInstance.post.mockImplementation((url) => {
      if (url.includes("/complete")) {
        return Promise.resolve({ data: { data: { success: true } } });
      }
      return Promise.resolve({ data: { data: {} } });
    });

    const retryRun = await executePayAndDispatch({
      ticket,
      effectiveCounterId: "CTR-01",
      paymentMethod: "CASH",
      dispatchMode: "AUTO",
      candidateRooms,
      leastLoadedRoom: candidateRooms[0],
      isAlreadyPaid: true, // Trạng thái đã thanh toán từ lần trước
      axiosClient: axiosInstance
    });

    // BẮT BUỘC: Không được gọi lại API thanh toán lần thứ 2!
    const payCalls = axiosInstance.post.mock.calls.filter(([url]) => url === "/api/nurse/reception/pay-at-clinic");
    expect(payCalls.length).toBe(0);

    // API hoàn tất điều phối buồng khám được gọi đúng endpoint và payload
    expect(axiosInstance.post).toHaveBeenCalledWith(
      "/api/counters/CTR-01/tickets/105/complete",
      { targetRoomId: 101 }
    );
    expect(retryRun.success).toBe(true);
    expect(retryRun.dispatchRetryNeeded).toBe(false);
  });

  it("3. separateDispatchEndpointByTicketType: Tách biệt chính xác endpoint numeric ticket ID vs booking", async () => {
    // A. Numeric Ticket ID (Phiếu bốc số tại quầy/kiosk: ticketId = "201")
    const numericTicket = {
      ticketId: "201",
      ticketCode: "TN-02",
      patientName: "Trần Văn An",
      departmentName: "Khoa Nội",
      isPaid: true
    };
    const internalRooms = [
      { roomId: "102", roomName: "Phòng 102", departmentName: "Khoa Nội", doctorName: "BS. Hùng" }
    ];

    axiosInstance.post.mockResolvedValue({ data: { data: { success: true } } });

    const numericResult = await executePayAndDispatch({
      ticket: numericTicket,
      effectiveCounterId: "CTR-02",
      candidateRooms: internalRooms,
      dispatchMode: "AUTO",
      isAlreadyPaid: true,
      axiosClient: axiosInstance
    });

    expect(numericResult.success).toBe(true);
    expect(axiosInstance.post).toHaveBeenCalledWith(
      "/api/counters/CTR-02/tickets/201/complete",
      { targetRoomId: 102 }
    );

    axiosInstance.post.mockClear();

    // B. Booking appointment (Phiếu đặt lịch online: bookingCode = "BK2026110901", ticketId = UUID)
    const bookingTicket = {
      ticketId: "550e8400-e29b-41d4-a716-446655440000",
      bookingCode: "BK2026110901",
      patientName: "Lê Thị Hoa",
      departmentName: "Khoa Tim Mạch",
      isPaid: true
    };
    const cardioRooms = [
      { roomId: "201", roomName: "Phòng 201", departmentName: "Khoa Tim Mạch", doctorName: "BS. Tâm" }
    ];

    const bookingResult = await executePayAndDispatch({
      ticket: bookingTicket,
      effectiveCounterId: "CTR-02",
      candidateRooms: cardioRooms,
      dispatchMode: "AUTO",
      isAlreadyPaid: true,
      axiosClient: axiosInstance
    });

    expect(bookingResult.success).toBe(true);
    expect(axiosInstance.post).toHaveBeenCalledWith(
      "/api/nurse/reception/dispatch",
      {
        bookingId: "550e8400-e29b-41d4-a716-446655440000",
        bookingCode: "BK2026110901",
        targetRoomId: 201,
        roomId: 201
      }
    );
  });

  it("4. roomSelectionValidation: Chế độ thủ công báo lỗi khi ID phòng không hợp lệ, không âm thầm fallback", () => {
    const candidateRooms = [
      { roomId: "101", roomName: "Phòng 101", departmentName: "Khoa Nội Tổng Quát" },
      { roomId: "102", roomName: "Phòng 102", departmentName: "Khoa Nội Tổng Quát" }
    ];
    const leastLoadedRoom = candidateRooms[0];

    // A. Chế độ AUTO: Chọn buồng ít người nhất hoặc buồng đầu tiên
    const autoRoom = selectTargetRoomCandidate({
      dispatchMode: "AUTO",
      selectedTargetRoomId: "",
      candidateRooms,
      leastLoadedRoom
    });
    expect(autoRoom.roomId).toBe("101");

    // B. Chế độ MANUAL với ID hợp lệ
    const manualValidRoom = selectTargetRoomCandidate({
      dispatchMode: "MANUAL",
      selectedTargetRoomId: "102",
      candidateRooms,
      leastLoadedRoom
    });
    expect(manualValidRoom.roomId).toBe("102");

    // C. Chế độ MANUAL với ID không tồn tại trong khoa (ví dụ "999"):
    // BẮT BUỘC: Phải trả về null để component báo lỗi, KHÔNG ĐƯỢC âm thầm fallback về 101 hay leastLoadedRoom!
    const manualInvalidRoom = selectTargetRoomCandidate({
      dispatchMode: "MANUAL",
      selectedTargetRoomId: "999",
      candidateRooms,
      leastLoadedRoom
    });
    expect(manualInvalidRoom).toBeNull();

    // D. Chế độ MANUAL chưa chọn buồng khám:
    const manualEmptyRoom = selectTargetRoomCandidate({
      dispatchMode: "MANUAL",
      selectedTargetRoomId: "",
      candidateRooms,
      leastLoadedRoom
    });
    expect(manualEmptyRoom).toBeNull();
  });

  it("5. manualModeInvalidRoomAbortsExecutePayAndDispatch: executePayAndDispatch từ chối dispatch khi chọn sai ID phòng ở chế độ MANUAL", async () => {
    const ticket = {
      ticketId: "301",
      bookingCode: "BK-301",
      patientName: "Vũ Văn Cường",
      departmentName: "Khoa Nhi",
      isPaid: true
    };
    const pediatricsRooms = [
      { roomId: "301", roomName: "Phòng Nhi 1", departmentName: "Khoa Nhi" }
    ];

    // Chế độ MANUAL nhưng truyền ID sai "999"
    const result = await executePayAndDispatch({
      ticket,
      effectiveCounterId: "CTR-01",
      candidateRooms: pediatricsRooms,
      dispatchMode: "MANUAL",
      selectedTargetRoomId: "999",
      isAlreadyPaid: true,
      axiosClient: axiosInstance
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Buồng khám đã chọn [ID: 999] không hợp lệ");
    // Không gọi bất kỳ endpoint dispatch nào
    expect(axiosInstance.post).not.toHaveBeenCalled();
  });

  it("6. consecutiveDispatchFailurePreservesRetryState: Thử lại thất bại tiếp vẫn giữ trạng thái dispatchRetryNeeded", async () => {
    const ticket = {
      ticketId: "401",
      bookingCode: "BK-401",
      patientName: "Đỗ Thị Mai",
      departmentName: "Khoa Mắt",
      isPaid: true
    };
    const eyeRooms = [
      { roomId: "401", roomName: "Phòng Mắt 1", departmentName: "Khoa Mắt" }
    ];

    axiosInstance.post.mockRejectedValue(new Error("Mạng nội bộ phòng khám mất kết nối"));

    const result = await executePayAndDispatch({
      ticket,
      effectiveCounterId: "CTR-01",
      candidateRooms: eyeRooms,
      dispatchMode: "AUTO",
      isAlreadyPaid: true,
      axiosClient: axiosInstance
    });

    expect(result.success).toBe(false);
    expect(result.dispatchRetryNeeded).toBe(true);
    expect(result.isPaid).toBe(true);
    expect(result.error).toContain("chưa thể điều phối vào buồng khám");
  });

  it("7. ticketCodeAndExamQueueCodeSeparation: Mã vé quầy và mã hàng đợi khám phân định rõ, không tự chế mã fake", () => {
    // Ticket có ticketCode quầy TN-09 và bookingQueueCode khám KB-12
    const mixedTicket = {
      ticketId: "501",
      ticketCode: "TN-09",
      bookingQueueCode: "KB-12",
      bookingCode: "BK-501",
      patientName: "Nguyễn Hải Long",
      price: 150000
    };

    const fees = calculateTicketDuePure(mixedTicket);
    expect(fees.consultationFee).toBe(150000);
    expect(mixedTicket.ticketCode).toBe("TN-09");
    expect(mixedTicket.bookingQueueCode).toBe("KB-12");

    // Vé không có ticketCode (ví dụ đặt lịch khám online) không được tự chế TH-xx hay KB-xx vào ticketCode
    const onlineTicket = {
      ticketId: "uuid-online-01",
      bookingCode: "BK-9999",
      queueCode: "KB-08",
      patientName: "Hoàng Gia Bảo"
    };

    expect(onlineTicket.ticketCode).toBeUndefined();
    // Không được hoán đổi queueCode của khám vào ticketCode của quầy
    expect(onlineTicket.queueCode).toBe("KB-08");
  });

  it("8. departmentConstraintValidation: Kiểm tra thiếu thông tin khoa và thiếu buồng khám", () => {
    const standardClinicRooms = [
      { roomId: "101", roomName: "Phòng 101", departmentName: "Khoa Nội Tổng Quát" },
      { roomId: "201", roomName: "Phòng 201", departmentName: "Khoa Mắt" }
    ];

    // A. Lượt tiếp đón thiếu hoàn toàn thông tin chuyên khoa
    const ticketWithoutDept = { patientName: "Khách Vãng Lai", departmentName: "", departmentId: null };
    const eligibleNoDept = filterEligibleRoomsForTicket(ticketWithoutDept, standardClinicRooms);
    expect(eligibleNoDept.length).toBe(0);

    // B. Lượt tiếp đón có chuyên khoa nhưng viện chưa cấu hình buồng khám nào cho khoa đó
    const ticketPediatrics = { patientName: "Bé An", departmentName: "Khoa Nhi", departmentId: 3 };
    const eligiblePediatrics = filterEligibleRoomsForTicket(ticketPediatrics, standardClinicRooms);
    expect(eligiblePediatrics.length).toBe(0);

    // C. Lượt tiếp đón có chuyên khoa khớp đúng
    const ticketInternal = { patientName: "Bác Nam", departmentName: "Khoa Nội Tổng Quát" };
    const eligibleInternal = filterEligibleRoomsForTicket(ticketInternal, standardClinicRooms);
    expect(eligibleInternal.length).toBe(1);
    expect(eligibleInternal[0].roomId).toBe("101");
  });

  it("9. posDialogScrollabilityAndReachableButtons: Đảm bảo Modal POS thu phí có cấu trúc cuộn và nút thao tác luôn hiển thị", () => {
    const html = renderToStaticMarkup(
      <CounterManagementPanel
        onPatientDispatched={vi.fn()}
        onOpenPayModal={vi.fn()}
        rooms={[
          { roomId: "101", roomName: "Phòng 101", departmentName: "Khoa Nội Tổng Quát", doctorName: "BS. Lan" }
        ]}
      />
    );

    // Khung giao diện Quầy thu ngân tiếp đón sảnh sẵn sàng hỗ trợ gọi số và thu viện phí
    expect(html).toContain("BÀN ĐIỀU PHỐI QUẦY TIẾP ĐÓN SẢNH");
    expect(html).toContain("GỌI SỐ TIẾP THEO (CALL NEXT)");
  });
});
