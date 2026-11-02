import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import NurseReceptionPage from "../pages/nurse/NurseReceptionPage";

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
});

