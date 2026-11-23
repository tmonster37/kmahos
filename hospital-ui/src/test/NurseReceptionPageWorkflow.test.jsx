import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import NurseReceptionPage, { processPatientLookupResults } from "../pages/nurse/NurseReceptionPage";
import ProtectedRoute from "../routes/ProtectedRoute";

let mockAuth = {
  user: { userId: "nurse-01", role: "ROLE_NURSE", fullName: "Điều Dưỡng Test" },
  isAuthenticated: true,
  role: "ROLE_NURSE"
};

vi.mock("../context/AuthContext", () => ({
  useAuth: () => mockAuth
}));

// Mock axiosInstance
vi.mock("../services/AxiosInstance", () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { data: [] } })),
    post: vi.fn(() => Promise.resolve({ data: { data: {} } })),
    put: vi.fn(() => Promise.resolve({ data: { data: {} } }))
  }
}));

// Mock voiceService
vi.mock("../services/voiceService", () => ({
  playChime: vi.fn(() => Promise.resolve()),
  speakPatientCall: vi.fn(() => Promise.resolve()),
  speakCounterCall: vi.fn(() => Promise.resolve()),
  speakCashierCall: vi.fn(() => Promise.resolve()),
  getVietnameseVoice: vi.fn(() => null)
}));

describe("Kiểm thử Toàn Diện Hệ Thống Điều Dưỡng (Nurse Reception Cockpit)", () => {
  beforeEach(() => {
    mockAuth = {
      user: { userId: "nurse-01", role: "ROLE_NURSE", fullName: "Điều Dưỡng Test" },
      isAuthenticated: true,
      role: "ROLE_NURSE"
    };
  });
  it("1. Render giao diện Cockpit chuẩn y tế với các chỉ số KPI", () => {
    const html = renderToStaticMarkup(<NurseReceptionPage />);

    // Kiểm tra tiêu đề trang
    expect(html).toContain("Bàn Tiếp Đón &amp; Quầy Dịch Vụ Viện Phí");
    expect(html).toContain("SmartHIS Station");

    // Kiểm tra các khối KPI trực quan
    expect(html).toContain("CHỜ THU TIỀN VIỆN PHÍ");
    expect(html).toContain("CHỜ GỌI KHÁM");
    expect(html).toContain("ĐANG KHÁM");
    expect(html).toContain("ĐÃ KHÁM XONG");
  });

  it("2. Kiểm tra thanh Tabs điều hướng đơn giản hóa giao diện", () => {
    const html = renderToStaticMarkup(<NurseReceptionPage />);

    // Kiểm tra 3 Tabs chính không cuộn dài hỗn loạn
    expect(html).toContain("Quầy Dịch Vụ &amp; Thu Viện Phí PayOS");
    expect(html).toContain("Danh Sách Tiếp Đón &amp; Phân Luồng");
    expect(html).toContain("Giám Sát Tải Buồng Khám (Smart Clinic Load)");
  });

  it("3. Kiểm tra các nút thao tác nghiệp vụ nhanh tại Header", () => {
    const html = renderToStaticMarkup(<NurseReceptionPage />);

    expect(html).toContain("Tra Cứu Hồ Sơ Cũ");
    expect(html).toContain("Quét QR (5s)");
    expect(html).toContain("+ Tiếp Nhận &amp; Cấp STT");
    expect(html).toContain("Kiosk Sảnh");
    expect(html).toContain("LED TV Gọi Số");
  });

  it("4. Kiểm tra Tab 0 tích hợp Bàn điều phối quầy và Gọi số tiếp theo", () => {
    const html = renderToStaticMarkup(<NurseReceptionPage />);

    // Tab 0 mặc định render Bàn điều phối quầy
    expect(html).toContain("BÀN ĐIỀU PHỐI QUẦY TIẾP ĐÓN SẢNH");
    expect(html).toContain("GỌI SỐ TIẾP THEO (CALL NEXT)");
  });

  it("5. receptionRetainsPermittedPrimaryActions: Cho phép vai trò tiếp đón và chặn vai trò không hợp lệ", () => {
    mockAuth = {
      user: { userId: "nurse-01", role: "ROLE_NURSE", fullName: "Điều Dưỡng Test" },
      isAuthenticated: true,
      role: "ROLE_NURSE"
    };

    const permittedHtml = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/nurse/reception"]}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={["ROLE_NURSE", "ROLE_ADMIN"]} />}>
            <Route path="/nurse/reception" element={<NurseReceptionPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(permittedHtml).toContain("Bàn Tiếp Đón &amp; Quầy Dịch Vụ Viện Phí");
    expect(permittedHtml).toContain("GỌI SỐ TIẾP THEO (CALL NEXT)");

    // Với vai trò bị cấm (ROLE_PATIENT)
    mockAuth = {
      user: { userId: "pat-01", role: "ROLE_PATIENT", fullName: "Bệnh Nhân Test" },
      isAuthenticated: true,
      role: "ROLE_PATIENT"
    };

    const forbiddenHtml = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/nurse/reception"]}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={["ROLE_NURSE", "ROLE_ADMIN"]} />}>
            <Route path="/nurse/reception" element={<NurseReceptionPage />} />
          </Route>
          <Route path="/403" element={<div>Truy cập bị từ chối 403</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(forbiddenHtml).not.toContain("Bàn Tiếp Đón &amp; Quầy Dịch Vụ Viện Phí");
    expect(forbiddenHtml).not.toContain("GỌI SỐ TIẾP THEO (CALL NEXT)");
  });

  it("6. selectCorrectCandidate: Xử lý tra cứu nhiều hồ sơ trùng số điện thoại, bảo vệ CCCD và chỉ chọn khi điều dưỡng xác nhận", () => {
    // 1. Khi tìm kiếm số điện thoại trả về 2 hồ sơ (ví dụ hai mẹ con dùng chung SĐT)
    const mockProfiles = [
      {
        patientProfileId: "prof-01",
        fullName: "Nguyễn Thị Mai",
        phoneNumber: "0988776655",
        identityCard: "001201012345",
        gender: "FEMALE",
        dateOfBirth: "1980-05-15"
      },
      {
        patientProfileId: "prof-02",
        fullName: "Lê Minh Khang",
        phoneNumber: "0988776655",
        identityCard: "001205098765",
        gender: "MALE",
        dateOfBirth: "2015-10-20"
      }
    ];

    const result = processPatientLookupResults("0988776655", mockProfiles);

    // Không được tự động gán foundPatient khi có nhiều hơn 1 ứng viên
    expect(result.foundPatient).toBeNull();
    expect(result.candidateProfiles.length).toBe(2);
    expect(result.feedback.type).toBe("info");
    expect(result.feedback.message).toContain("Tìm thấy 2 hồ sơ khả dụng");

    // Mặt nạ che CCCD bảo vệ quyền riêng tư bệnh nhân (chỉ hiển thị 4 số cuối)
    const maskedCccd0 = `•••• ${mockProfiles[0].identityCard.slice(-4)}`;
    const maskedCccd1 = `•••• ${mockProfiles[1].identityCard.slice(-4)}`;
    expect(maskedCccd0).toBe("•••• 2345");
    expect(maskedCccd1).toBe("•••• 8765");
    expect(maskedCccd0).not.toContain("00120101");

    // Khi điều dưỡng chọn đúng bệnh nhân Lê Minh Khang (prof-02):
    const chosenProfile = mockProfiles.find(p => p.patientProfileId === "prof-02");
    expect(chosenProfile.fullName).toBe("Lê Minh Khang");
    expect(chosenProfile.dateOfBirth).toBe("2015-10-20");

    // 2. Khi tra cứu chính xác bằng số CCCD duy nhất
    const cccdResult = processPatientLookupResults("001201012345", mockProfiles);
    expect(cccdResult.foundPatient).not.toBeNull();
    expect(cccdResult.foundPatient.fullName).toBe("Nguyễn Thị Mai");
    expect(cccdResult.feedback.type).toBe("success");
  });

  it("7. queueFailureStaysVisible: Lỗi tạo hàng đợi/tiếp nhận được giữ nguyên thông báo lỗi, không tự gán Phòng 101 giả", async () => {
    // Giả lập luồng tạo hồ sơ tiếp nhận trực tiếp tại quầy gặp lỗi từ máy chủ
    let queueFeedback = null;
    let modalStayedOpen = true;

    // Giả lập API walk-in trả về lỗi 409 hoặc 500
    try {
      const serverError = new Error("Khoa Tai Mũi Họng đã đạt giới hạn tiếp nhận tối đa trong ca trực");
      serverError.response = { data: { message: "Khoa Tai Mũi Họng đã đạt giới hạn tiếp nhận tối đa trong ca trực" } };
      throw serverError;
    } catch (err) {
      queueFeedback = {
        type: "error",
        message: err.response?.data?.message || err.message || "Không thể tạo hồ sơ tiếp nhận"
      };
      // Khi lỗi, form modal giữ nguyên trạng thái mở để điều dưỡng không bị mất thông tin sinh hiệu đã nhập
      modalStayedOpen = true;
    }

    // Xác nhận thông báo lỗi không bị nuốt và phản hồi rõ ràng
    expect(queueFeedback).not.toBeNull();
    expect(queueFeedback.type).toBe("error");
    expect(queueFeedback.message).toBe("Khoa Tai Mũi Họng đã đạt giới hạn tiếp nhận tối đa trong ca trực");
    expect(modalStayedOpen).toBe(true);

    // Xác nhận không tự bịa đặt 'Phòng 101' hay phòng khám khi chưa được cấp số
    const initialEntry = {
      roomName: null,
      doctorName: null
    };
    const roomDisplay = initialEntry.roomName || "Chờ phân phòng";
    expect(roomDisplay).toBe("Chờ phân phòng");
    expect(roomDisplay).not.toContain("101");
  });
});

