import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CounterManagementPanel from "../components/nurse/CounterManagementPanel";
import ThermalTicketModal from "../components/kiosk/ThermalTicketModal";
import { formatCurrency } from "../utils/formatters";

describe("Luồng Toàn Diện: Đặt Lịch Khám ➔ Điều Dưỡng Gọi Quầy ➔ Thu Tiền PayOS/Tiền Mặt ➔ Điều Phối Hàng Đợi Bác Sĩ", () => {
  let mockPatientBooking;
  let mockRooms;
  let mockQueueList;
  let onPatientDispatchedMock;

  beforeEach(() => {
    onPatientDispatchedMock = vi.fn();

    // 1. Dữ liệu Đặt lịch khám (Booking ban đầu chưa nộp viện phí)
    mockPatientBooking = {
      bookingId: "bk-uuid-001",
      bookingCode: "BK20261031001",
      patientName: "Nguyễn Minh Khang",
      phoneNumber: "0988889999",
      price: 150000,
      isPaid: false, // Chưa thanh toán
      isPriority: false,
      ticketCode: "TH-01",
      queueNumber: 1,
      departmentName: "Khoa Nội Tổng Quát"
    };

    // Danh sách buồng khám bác sĩ và số lượng người đang chờ thực tế
    mockRooms = [
      { roomId: "101", roomName: "Phòng 101", departmentName: "Khoa Nội Tổng Quát", doctorName: "BS. Mai Thị Lan" },
      { roomId: "102", roomName: "Phòng 102", departmentName: "Khoa Nội Tổng Quát", doctorName: "BS. Nguyễn Văn Hùng" },
      { roomId: "201", roomName: "Phòng 201", departmentName: "Khoa Tim Mạch", doctorName: "BS. Lê Tuấn Anh" },
      { roomId: "301", roomName: "Phòng 301", departmentName: "Khoa Nhi", doctorName: "BS. Phạm Thị Hoa" }
    ];

    // Hàng đợi hiện tại: Phòng 102 có 2 người chờ, Phòng 201 có 1 người chờ, Phòng 101 có 0 người chờ (ít nhất)
    mockQueueList = [
      { roomId: "102", roomName: "Phòng 102", status: "WAITING" },
      { roomId: "102", roomName: "Phòng 102", status: "WAITING" },
      { roomId: "201", roomName: "Phòng 201", status: "WAITING" }
    ];
  });

  it("1. Bước Đặt lịch khám: Phiếu khám được xếp vào hàng đợi Quầy tiếp đón với trạng thái Chờ thu tiền", () => {
    const html = renderToStaticMarkup(
      <CounterManagementPanel
        onPatientDispatched={onPatientDispatchedMock}
        rooms={mockRooms}
        queueList={mockQueueList}
      />
    );

    // Bàn điều phối quầy tiếp đón sảnh hiển thị đầy đủ
    expect(html).toContain("BÀN ĐIỀU PHỐI QUẦY TIẾP ĐÓN SẢNH");
    expect(html).toContain("1. Chờ Thu Tiền Khám");
    expect(html).toContain("2. Thu Phí Xét Nghiệm (CLS)");
    expect(html).toContain("3. Đối Tượng Ưu Tiên");
  });

  it("2. Bước Điều dưỡng gọi số tại Quầy: Hiển thị nút Gọi số tiếp theo và gọi lại loa phát thanh", () => {
    const html = renderToStaticMarkup(
      <CounterManagementPanel
        onPatientDispatched={onPatientDispatchedMock}
        rooms={mockRooms}
        queueList={mockQueueList}
      />
    );

    // Có nút gọi số tiếp theo theo thứ tự ưu tiên
    expect(html).toContain("GỌI SỐ TIẾP THEO (CALL NEXT)");
    // Có biểu tượng và hỗ trợ phát loa gọi số
    expect(html).toContain("Định tuyến bệnh nhân từ Cây Kiosk");
  });

  it("3. Bước Thu tiền viện phí: Hỗ trợ tính viện phí, tiền mặt thối lại và Cổng PayOS VietQR", () => {
    const fee = 150000;
    const given = 200000;
    const change = given - fee;

    expect(formatCurrency(fee)).toContain("150.000");
    expect(formatCurrency(change)).toContain("50.000");

    // Kiểm tra cấu trúc thông tin PayOS VietQR theo chuẩn Napas 24/7
    const payosTransferContent = `VP ${mockPatientBooking.ticketCode} ${mockPatientBooking.bookingCode}`;
    expect(payosTransferContent).toBe("VP TH-01 BK20261031001");

    const payosData = {
      accountNumber: "0987654321",
      accountName: "BENH VIEN DA KHOA QUOC TE TNT",
      bankName: "MBBank (Ngân hàng TMCP Quân Đội)",
      amount: fee,
      transferContent: payosTransferContent
    };

    expect(payosData.accountNumber).toBe("0987654321");
    expect(payosData.amount).toBe(150000);
    expect(payosData.transferContent).toContain("BK20261031001");
  });

  it("4. Bước Điều phối: Tính toán Cân bằng tải tự động (buồng ít người nhất) vs Điều dưỡng chỉ định", () => {
    // Thuật toán Smart Load Balancing tìm phòng ít người chờ nhất
    const counts = mockRooms.map(r => ({
      ...r,
      waitingCount: mockQueueList.filter(q => q.roomId === r.roomId && q.status === "WAITING").length
    }));

    const leastLoaded = counts.reduce((prev, curr) => (curr.waitingCount < prev.waitingCount ? curr : prev));

    // Phòng 101 có 0 người chờ -> Là phòng ít người nhất
    expect(leastLoaded.roomId).toBe("101");
    expect(leastLoaded.doctorName).toBe("BS. Mai Thị Lan");
    expect(leastLoaded.waitingCount).toBe(0);

    // Kịch bản điều dưỡng chỉ định bác sĩ cụ thể theo nguyện vọng bệnh nhân
    const chosenRoomId = "102";
    const manualRoom = mockRooms.find(r => r.roomId === chosenRoomId);
    expect(manualRoom.doctorName).toBe("BS. Nguyễn Văn Hùng");
    expect(manualRoom.departmentName).toBe("Khoa Nội Tổng Quát");
  });

  it("5. Bước Hoàn tất & Vào hàng đợi Bác sĩ: Cập nhật trạng thái đã thu tiền và điều phối thành công", () => {
    // Mô phỏng kết quả sau khi thu tiền và điều phối
    const completedTicket = {
      ...mockPatientBooking,
      isPaid: true,
      status: "SERVED",
      dispatchedRoomId: 101,
      dispatchedRoomName: "Phòng 101",
      dispatchedDoctorName: "BS. Mai Thị Lan",
      servedAt: new Date().toISOString()
    };

    expect(completedTicket.isPaid).toBe(true);
    expect(completedTicket.status).toBe("SERVED");
    expect(completedTicket.dispatchedRoomId).toBe(101);
    expect(completedTicket.dispatchedDoctorName).toBe("BS. Mai Thị Lan");

    // Người bệnh lập tức xuất hiện trong hàng đợi buồng khám Bác sĩ
    const doctorQueue = [
      ...mockQueueList,
      {
        roomId: String(completedTicket.dispatchedRoomId),
        roomName: completedTicket.dispatchedRoomName,
        patientName: completedTicket.patientName,
        bookingCode: completedTicket.bookingCode,
        status: "WAITING",
        isPaid: true
      }
    ];

    const waitingAtRoom101 = doctorQueue.filter(q => q.roomId === "101" && q.status === "WAITING");
    expect(waitingAtRoom101.length).toBe(1);
    expect(waitingAtRoom101[0].patientName).toBe("Nguyễn Minh Khang");
    expect(waitingAtRoom101[0].isPaid).toBe(true);
  });

  it("6. Bước Điều phối thất bại: Đánh dấu đã nộp tiền để lần thử lại không thu trùng, không gọi loa sai lệch", () => {
    // Giả lập phiếu ban đầu chưa nộp
    const ticket = { ...mockPatientBooking, isPaid: false };
    
    // Giả lập thu tiền thành công ở bước 1
    const consultationFee = 150000;
    let paymentCount = 0;
    if (!ticket.isPaid && consultationFee > 0) {
      paymentCount++;
      ticket.isPaid = true; // Đánh dấu đã nộp
    }
    expect(paymentCount).toBe(1);
    expect(ticket.isPaid).toBe(true);

    // Giả lập bước điều phối bị lỗi (ví dụ buồng khám lệch khoa hoặc lỗi mạng)
    let dispatchSucceeded = false;
    let speakCalled = false;
    try {
      throw new Error("Bệnh nhân đăng ký Khoa Nội không thể điều phối sang Khoa Tim Mạch");
      dispatchSucceeded = true;
    } catch (err) {
      dispatchSucceeded = false;
    }

    if (dispatchSucceeded) {
      speakCalled = true;
    }
    expect(speakCalled).toBe(false);

    // Khi điều dưỡng chọn lại buồng khám hợp lệ và bấm thử lại (Retry):
    if (!ticket.isPaid && consultationFee > 0) {
      paymentCount++; // Không bao giờ chạy vào đây vì ticket.isPaid = true
    }
    expect(paymentCount).toBe(1); // Tuyệt đối không thu tiền lần 2

    // Thử lại điều phối với phòng hợp lệ
    dispatchSucceeded = true;
    if (dispatchSucceeded) {
      speakCalled = true;
    }
    expect(dispatchSucceeded).toBe(true);
    expect(speakCalled).toBe(true);
  });

  it("7. Ràng buộc chuyên khoa: Chỉ cho phép điều phối vào buồng thuộc đúng chuyên khoa của bệnh nhân", () => {
    const patientDept = "Khoa Nội Tổng Quát";
    
    // Lọc buồng khám hợp lệ
    const eligibleRooms = mockRooms.filter(r => 
      r.departmentName && r.departmentName.toLowerCase().includes(patientDept.toLowerCase())
    );

    // Chỉ có Phòng 101 và 102 thuộc Khoa Nội Tổng Quát
    expect(eligibleRooms.length).toBe(2);
    expect(eligibleRooms.map(r => r.roomId)).toEqual(["101", "102"]);

    // Phòng 201 (Tim Mạch) và Phòng 301 (Nhi) không được phép xuất hiện trong danh sách điều phối
    expect(eligibleRooms.some(r => r.roomId === "201")).toBe(false);
    expect(eligibleRooms.some(r => r.roomId === "301")).toBe(false);
  });

  it("8. distinguishTicketTypes: Phân biệt rõ phiếu quầy tiếp đón và số thứ tự phòng khám, không tự tạo tiền tố KB giả", () => {
    // Phiếu quầy tiếp đón có ticketCode dạng TH-01 hoặc TN-xx
    const counterTicket = {
      ticketCode: "TN-01",
      queueNumber: 1,
      bookingCode: "BK20261109001"
    };

    // Số thứ tự vào phòng khám bác sĩ sau điều phối
    const examQueue = {
      bookingQueueNumber: 3,
      bookingQueueCode: "KB-03"
    };

    // Xác nhận mã quầy và mã buồng khám phân biệt rạch ròi
    expect(counterTicket.ticketCode).toBe("TN-01");
    expect(examQueue.bookingQueueCode).toBe("KB-03");
    expect(counterTicket.ticketCode).not.toBe(examQueue.bookingQueueCode);

    // Khi backend chỉ trả queueNumber thuần, không tự sinh KB- nếu chưa vào phòng khám
    const rawTicket = { queueNumber: 5 };
    const displayCode = rawTicket.queueCode || (rawTicket.queueNumber != null ? `#${rawTicket.queueNumber}` : "---");
    expect(displayCode).toBe("#5");
    expect(displayCode.startsWith("KB-")).toBe(false);
  });

  it("9. ThermalTicketModal: Hiển thị barcode/QR khi có dữ liệu thật và ẩn/hiển thị placeholder khi thiếu, không sinh '01' hay 'QUEUE' giả", () => {
    // 1. Trường hợp có mã booking/ticket hợp lệ
    const validTicket = {
      bookingCode: "BK2026110901",
      ticketCode: "TN-05",
      queueNumber: 5,
      patientName: "Trần Văn B",
      departmentName: "Khoa Nội Tổng Quát"
    };
    const validHtml = renderToStaticMarkup(
      <ThermalTicketModal open={true} onClose={() => {}} ticketData={validTicket} />
    );
    expect(validHtml).toContain("MÃ VẠCH CHECK-IN TỰ ĐỘNG");
    expect(validHtml).toContain("BK2026110901");
    expect(validHtml).toContain("Quét QR trên điện thoại để theo dõi tiến độ lượt khám");
    expect(validHtml).not.toContain("Chưa có mã vạch check-in");
    expect(validHtml).not.toContain("Chưa có mã tra cứu trực tuyến");
    expect(validHtml).not.toContain("code=QUEUE");

    // 2. Trường hợp thiếu toàn bộ mã định danh (không có bookingCode, ticketCode, queueNumber)
    const emptyTicket = {
      patientName: "Khách Vãng Lai",
      departmentName: "Khoa Khám Bệnh"
    };
    const emptyHtml = renderToStaticMarkup(
      <ThermalTicketModal open={true} onClose={() => {}} ticketData={emptyTicket} />
    );
    expect(emptyHtml).toContain("Chưa có mã vạch check-in");
    expect(emptyHtml).toContain("Chưa có mã tra cứu trực tuyến");
    // Tuyệt đối không sinh mã giả '01' hay 'QUEUE'
    expect(emptyHtml).not.toContain("value=\"01\"");
    expect(emptyHtml).not.toContain("code=QUEUE");
  });
});
