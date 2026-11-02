import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CounterManagementPanel from "../components/nurse/CounterManagementPanel";

describe("CounterManagementPanel Billing & Queue Dispatch Suite", () => {
  it("renders Quầy Thu Viện Phí & Điều Phối Khám Bệnh cleanly", () => {
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
});

