/**
 * Hàm lọc và mã hóa ký tự HTML phòng chống DOM-based XSS khi in ấn
 */
export function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

import { formatCurrency, formatDateTime } from "./formatters";
import { generateBarcodeSvg } from "./barcodeGenerator";

/**
 * In Biên Lai Thu Viện Phí / Hóa Đơn Khám Chữa Bệnh (Khổ A5 Chuẩn)
 */
export function printReceipt(data) {
    if (!data) return;

    const receiptCode = escapeHtml(data.receiptCode || data.billId || "Chưa có mã biên lai");
    const patientName = escapeHtml(data.patientName || "Chưa có dữ liệu");
    const phoneNumber = escapeHtml(data.phoneNumber || "---");
    const identityNumber = data.identityNumber || "---";
    const departmentName = escapeHtml(data.departmentName || "Chưa có dữ liệu");
    const doctorName = escapeHtml(data.doctorName || "Chưa phân công");
    const paymentMethodText = data.paymentMethod === "CASH" ? "Tiền mặt tại quầy" :
                              data.paymentMethod === "VIETQR" ? "Cổng PayOS (VietQR Napas 247)" :
                              data.paymentMethod === "WALLET" ? "Ví Viện Phí Điện Tử" : "Cổng PayOS (Chuyển khoản)";
    const cashierName = escapeHtml(data.cashierName || "Thu ngân viên");
    const paidAt = data.paidAt ? formatDateTime(data.paidAt) : "Chưa có dữ liệu";
    const totalAmount = data.totalAmount != null ? data.totalAmount : (data.amount != null ? data.amount : null);
    const items = data.items && data.items.length > 0 ? data.items : [
        { name: data.description || "Thanh toán viện phí / Khám bệnh", qty: 1, price: totalAmount }
    ];

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
        alert("Vui lòng cho phép mở cửa sổ popup để in biên lai!");
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Biên Lai Thu Viện Phí - ${receiptCode}</title>
            <style>
                @page { size: A5 portrait; margin: 10mm; }
                body {
                    font-family: 'Times New Roman', Times, serif;
                    color: #000;
                    background: #fff;
                    margin: 0;
                    padding: 0;
                    font-size: 11pt;
                    line-height: 1.35;
                }
                .header-table { width: 100%; margin-bottom: 12px; border-collapse: collapse; }
                .header-left { width: 55%; vertical-align: top; }
                .header-right { width: 45%; text-align: center; vertical-align: top; }
                .title { text-align: center; font-size: 16pt; font-weight: bold; margin: 10px 0 2px 0; text-transform: uppercase; }
                .subtitle { text-align: center; font-style: italic; font-size: 9pt; margin-bottom: 15px; }
                .info-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
                .info-table td { padding: 3px 0; vertical-align: top; }
                .item-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                .item-table th, .item-table td { border: 1px solid #333; padding: 5px 6px; font-size: 10pt; word-break: break-word; }
                .item-table th { background-color: #f2f2f2; text-align: center; font-weight: bold; }
                .total-box { margin-top: 8px; font-weight: bold; font-size: 11.5pt; text-align: right; }
                .footer-table { width: 100%; margin-top: 20px; border-collapse: collapse; }
                .footer-cell { text-align: center; vertical-align: top; width: 50%; font-size: 10.5pt; }
                .signature-space { height: 50px; }
                @media print {
                    .no-print { display: none !important; }
                }
            </style>
        </head>
        <body>
            <table class="header-table">
                <tr>
                    <td class="header-left">
                        <div style="font-weight: bold; font-size: 11pt;">BỆNH VIỆN ĐA KHOA QUỐC TẾ TNT</div>
                        <div style="font-size: 9pt;">Địa chỉ: Lô đất CC2, Khu đô thị mới Văn Quán, số 114 Nguyễn Khuyến, phường Văn Quán, quận Hà Đông, Hà Nội</div>
                        <div style="font-size: 9pt;">Hotline: 1900 8888 • MST: 0109988776</div>
                    </td>
                    <td class="header-right">
                        <div style="font-weight: bold; font-size: 9.5pt;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                        <div style="font-size: 8.5pt; font-style: italic;">Độc lập - Tự do - Hạnh phúc</div>
                        <div style="font-size: 8.5pt; margin-top: 4px;">Mã BL: <b>${receiptCode}</b></div>
                    </td>
                </tr>
            </table>

            <div class="title">BIÊN LAI THU TIỀN VIỆN PHÍ</div>
            <div class="subtitle">(Liên giao cho người nộp tiền)</div>

            <table class="info-table">
                <tr>
                    <td style="width: 60%;">Họ và tên bệnh nhân: <b>${patientName}</b></td>
                    <td style="width: 40%;">Điện thoại: <b>${phoneNumber}</b></td>
                </tr>
                <tr>
                    <td>Khoa/Phòng: ${departmentName}</td>
                    <td>Bác sĩ: ${doctorName}</td>
                </tr>
                <tr>
                    <td>Hình thức thanh toán: <b>${paymentMethodText}</b></td>
                    <td>Thời gian thu: ${paidAt}</td>
                </tr>
            </table>

            <table class="item-table">
                <thead>
                    <tr>
                        <th style="width: 40px;">STT</th>
                        <th>Nội dung khoản thu / Dịch vụ y tế</th>
                        <th style="width: 50px;">SL</th>
                        <th style="width: 90px;">Đơn giá</th>
                        <th style="width: 100px;">Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map((it, idx) => {
                        const itemPrice = it.price != null ? it.price : (it.amount != null ? it.amount : null);
                        const itemQty = it.qty || it.quantity || 1;
                        return `
                        <tr>
                            <td style="text-align: center;">${idx + 1}</td>
                            <td>${escapeHtml(it.name || it.description || "Dịch vụ y tế")}</td>
                            <td style="text-align: center;">${itemQty}</td>
                            <td style="text-align: right;">${itemPrice != null ? formatCurrency(itemPrice) : "Chưa có dữ liệu"}</td>
                            <td style="text-align: right; font-weight: bold;">${itemPrice != null ? formatCurrency(itemPrice * itemQty) : "Chưa có dữ liệu"}</td>
                        </tr>
                    `;}).join("")}
                </tbody>
            </table>

            <div class="total-box">
                TỔNG SỐ TIỀN THU: <span style="color: #000; font-size: 13pt;">${totalAmount != null ? formatCurrency(totalAmount) : "Chưa có dữ liệu"}</span>
            </div>

            <table class="footer-table">
                <tr>
                    <td class="footer-cell">
                        <b>NGƯỜI NỘP TIỀN</b><br>
                        <i style="font-size: 8.5pt;">(Ký, ghi rõ họ tên)</i>
                        <div class="signature-space"></div>
                        <div>${patientName}</div>
                    </td>
                    <td class="footer-cell">
                        <b>NGƯỜI THU TIỀN</b><br>
                        <i style="font-size: 8.5pt;">(Ký, đóng dấu)</i>
                        <div class="signature-space"></div>
                        <div><b>${cashierName}</b></div>
                    </td>
                </tr>
            </table>

            <script>
                window.onload = function() {
                    window.print();
                    window.onafterprint = function() { window.close(); };
                };
                setTimeout(function() {
                    try { window.print(); } catch (e) {}
                }, 500);
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        try { printWindow.print(); } catch (e) {}
    }, 300);
}

/**
 * In Phiếu Xác Nhận Đặt Lịch Khám (Khổ A5 Chuẩn)
 */
export function printAppointmentTicket(data) {
    if (!data) return;
    if (typeof window === "undefined") return;

    const bookingCode = escapeHtml(data.bookingCode && String(data.bookingCode).trim() ? String(data.bookingCode).trim() : "Chưa có mã");
    const patientName = escapeHtml(data.patientName && String(data.patientName).trim() ? String(data.patientName).trim() : "Chưa có dữ liệu");
    const phoneNumber = escapeHtml((data.phoneNumber || data.patientPhone) && String(data.phoneNumber || data.patientPhone).trim() ? String(data.phoneNumber || data.patientPhone).trim() : "Chưa có dữ liệu");
    const departmentName = escapeHtml(data.departmentName && String(data.departmentName).trim() ? String(data.departmentName).trim() : "Chưa có dữ liệu");
    const roomName = escapeHtml(data.roomName && String(data.roomName).trim() ? String(data.roomName).trim() : "Chưa xếp phòng");
    const doctorName = escapeHtml(data.doctorName && String(data.doctorName).trim() ? String(data.doctorName).trim() : "Chưa phân công");
    const bookingDate = escapeHtml(data.bookingDate && String(data.bookingDate).trim() ? String(data.bookingDate).trim() : "Chưa có dữ liệu");
    const timeSlot = escapeHtml(data.timeSlot && String(data.timeSlot).trim() ? String(data.timeSlot).trim() : (data.startTime && data.endTime ? `${data.startTime} - ${data.endTime}` : "Chưa có dữ liệu"));

    let queueNumber = "Chờ cấp số tại quầy";
    if (data.queueNumber !== null && data.queueNumber !== undefined && data.queueNumber !== "") {
        queueNumber = `#${data.queueNumber}`;
    } else if (data.queueCode && String(data.queueCode).trim()) {
        queueNumber = escapeHtml(String(data.queueCode).trim());
    }

    let rawPrice = undefined;
    if (data.price !== null && data.price !== undefined) {
        rawPrice = data.price;
    } else if (data.totalAmount !== null && data.totalAmount !== undefined) {
        rawPrice = data.totalAmount;
    }

    let priceDisplay = "Chưa có dữ liệu";
    if (rawPrice === 0 || rawPrice === "0") {
        priceDisplay = "0 ₫";
    } else if (rawPrice != null && rawPrice !== "" && !isNaN(Number(rawPrice))) {
        priceDisplay = formatCurrency(Number(rawPrice));
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
        alert("Vui lòng cho phép mở cửa sổ popup để in phiếu khám!");
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Phiếu Khám Bệnh - ${bookingCode}</title>
            <style>
                @page { size: A5 portrait; margin: 10mm; }
                body {
                    font-family: 'Times New Roman', Times, serif;
                    color: #000;
                    background: #fff;
                    margin: 0;
                    padding: 0;
                    font-size: 11pt;
                    line-height: 1.4;
                }
                .header-table { width: 100%; margin-bottom: 10px; border-collapse: collapse; }
                .title { text-align: center; font-size: 16pt; font-weight: bold; margin: 10px 0 2px 0; text-transform: uppercase; color: #0F766E; }
                .queue-box {
                    text-align: center;
                    border: 2px dashed #0F766E;
                    padding: 10px;
                    margin: 12px 0;
                    border-radius: 6px;
                    background-color: #f8fafc;
                }
                .queue-number { font-size: 26pt; font-weight: bold; color: #0F766E; }
                .info-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                .info-table td { padding: 5px 0; border-bottom: 1px dotted #ccc; }
                .guide-box { border: 1px solid #000; padding: 10px; margin-top: 15px; font-size: 9.5pt; border-radius: 4px; }
            </style>
        </head>
        <body>
            <table class="header-table">
                <tr>
                    <td style="width: 60%; vertical-align: top;">
                        <div style="font-weight: bold; font-size: 11.5pt;">BỆNH VIỆN ĐA KHOA QUỐC TẾ TNT</div>
                        <div style="font-size: 9pt;">Địa chỉ: Lô đất CC2, Khu đô thị mới Văn Quán, số 114 Nguyễn Khuyến, phường Văn Quán, quận Hà Đông, Hà Nội • Hotline: 1900 8888</div>
                    </td>
                    <td style="width: 40%; text-align: right; vertical-align: top;">
                        <div style="font-size: 10pt;">Mã khám: <b>${bookingCode}</b></div>
                    </td>
                </tr>
            </table>

            <div class="title">PHIẾU ĐĂNG KÝ KHÁM BỆNH</div>

            <div class="queue-box">
                <div style="font-size: 10pt; font-weight: bold;">SỐ THỨ TỰ KHÁM DỰ KIẾN</div>
                <div class="queue-number">${queueNumber}</div>
                <div style="font-size: 9pt; color: #555;">(Vui lòng theo dõi màn hình gọi số tại phòng khám)</div>
            </div>

            <table class="info-table">
                <tr>
                    <td style="width: 40%;">Họ và tên bệnh nhân:</td>
                    <td style="font-weight: bold; font-size: 12pt;">${patientName}</td>
                </tr>
                <tr>
                    <td>Số điện thoại:</td>
                    <td><b>${phoneNumber}</b></td>
                </tr>
                <tr>
                    <td>Chuyên khoa khám:</td>
                    <td><b>${departmentName}</b></td>
                </tr>
                <tr>
                    <td>Phòng khám:</td>
                    <td><b style="color: #0F766E;">${roomName}</b></td>
                </tr>
                <tr>
                    <td>Bác sĩ phụ trách:</td>
                    <td><b>${doctorName}</b></td>
                </tr>
                <tr>
                    <td>Ngày khám:</td>
                    <td><b>${bookingDate}</b></td>
                </tr>
                <tr>
                    <td>Khung giờ khám:</td>
                    <td><b>${timeSlot}</b></td>
                </tr>
                <tr>
                    <td>Tiền khám bệnh:</td>
                    <td style="font-weight: bold; color: #0F766E;">${priceDisplay}</td>
                </tr>
            </table>

            <div class="guide-box">
                <b>📌 HƯỚNG DẪN DÀNH CHO BỆNH NHÂN:</b>
                <ol style="margin: 5px 0 0 18px; padding: 0;">
                    <li>Quý khách vui lòng có mặt tại <b>Quầy Tiếp Đón</b> trước giờ hẹn 15 phút để làm thủ tục.</li>
                    <li>Xuất trình mã đặt khám <b>${bookingCode}</b> hoặc CCCD/BHYT tại quầy tiếp nhận.</li>
                    <li>Mọi thắc mắc xin liên hệ Tổng đài chăm sóc khách hàng: <b>1900 8888</b>.</li>
                </ol>
            </div>

            <script>
                window.onload = function() {
                    window.print();
                    window.onafterprint = function() { window.close(); };
                };
                setTimeout(function() {
                    try { window.print(); } catch (e) {}
                }, 500);
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        try { printWindow.print(); } catch (e) {}
    }, 300);
}

/**
 * In Phiếu Số Thứ Tự Tiếp Nhận / Khám Bệnh (Chuẩn Máy In Nhiệt K80 - 80mm)
 */
export function printThermalTicket(data) {
    if (!data) return;

    const queueNumber = data.queueNumber || "---";
    const patientName = data.patientName || "Bệnh nhân";
    const phone = data.phone || data.phoneNumber || "---";
    const departmentName = data.departmentName || "Khoa Khám Bệnh";
    const roomName = data.roomName || "Phòng khám";
    const checkInTime = data.checkInTime || data.time || formatDateTime(new Date().toISOString());
    const bookingId = data.bookingId || data.bookingCode || "BK-" + Math.floor(1000 + Math.random() * 9000);

    // Tạo Barcode SVG Code 128 sắc nét cho phiếu in nhiệt
    const barcodeText = String(bookingId || "TICKET").toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    const barcodeSvgHtml = generateBarcodeSvg(barcodeText, { height: 44, moduleWidth: 1.8, showText: true });

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
        alert("Vui lòng cho phép mở cửa sổ popup để in phiếu STT!");
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Phiếu Số Thứ Tự - ${queueNumber}</title>
            <style>
                @page { size: 80mm auto; margin: 3mm; }
                body {
                    font-family: 'Arial', sans-serif;
                    color: #000;
                    background: #fff;
                    margin: 0;
                    padding: 5px;
                    width: 74mm;
                    text-align: center;
                    font-size: 10pt;
                    line-height: 1.3;
                }
                .hospital-name { font-size: 10.5pt; font-weight: bold; text-transform: uppercase; }
                .hospital-sub { font-size: 8pt; margin-bottom: 6px; }
                .divider { border-top: 1px dashed #000; margin: 6px 0; }
                .title { font-size: 11pt; font-weight: bold; margin: 4px 0; text-transform: uppercase; }
                .queue-box { margin: 8px 0; padding: 4px; border: 2px solid #000; border-radius: 6px; }
                .queue-num { font-size: 32pt; font-weight: 900; line-height: 1.1; }
                .info-left { text-align: left; font-size: 9.5pt; margin: 6px 0; }
                .info-row { margin: 3px 0; }
                .barcode-section { margin: 8px 0 4px; text-align: center; }
                .barcode-title { font-size: 8pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
                .barcode-note { font-size: 7.5pt; font-style: italic; color: #222; margin-top: 4px; }
                .footer-note { font-size: 8pt; font-style: italic; margin-top: 6px; }
            </style>
        </head>
        <body>
            <div class="hospital-name">BỆNH VIỆN ĐA KHOA QUỐC TẾ TNT</div>
            <div class="hospital-sub">Địa chỉ: Lô đất CC2, Khu đô thị mới Văn Quán, số 114 Nguyễn Khuyến, phường Văn Quán, quận Hà Đông, Hà Nội • Hotline: 1900 8888</div>
            <div class="divider"></div>

            <div class="title">PHIẾU TIẾP NHẬN KHÁM</div>
            
            <div class="queue-box">
                <div style="font-size: 8.5pt; font-weight: bold;">SỐ THỨ TỰ CỦA BẠN</div>
                <div class="queue-num">${queueNumber}</div>
            </div>

            <div class="info-left">
                <div class="info-row">Họ tên: <b>${patientName}</b></div>
                <div class="info-row">SĐT: <b>${phone}</b></div>
                <div class="info-row">Khoa: <b>${departmentName}</b></div>
                <div class="info-row">Phòng: <b>${roomName}</b></div>
                <div class="info-row">Mã hồ sơ: <b>${bookingId}</b></div>
                <div class="info-row">Thời gian: ${checkInTime}</div>
            </div>

            <div class="divider"></div>

            <!-- Mã vạch Barcode Code 128 quét tại cửa phòng khám / xét nghiệm -->
            <div class="barcode-section">
                <div class="barcode-title">MÃ VẠCH CHECK-IN TỰ ĐỘNG</div>
                <div style="background: #ffffff; padding: 2px 0;">
                    ${barcodeSvgHtml}
                </div>
                <div class="barcode-note">
                    Quét mã vạch tại đầu đọc trước cửa phòng để ghi nhận có mặt
                </div>
            </div>

            <div class="divider"></div>
            <div class="footer-note">
                Quý khách vui lòng ngồi tại sảnh chờ và theo dõi số thứ tự hiển thị trên màn hình LCD. Xin cảm ơn!
            </div>

            <script>
                window.onload = function() {
                    window.print();
                    window.onafterprint = function() { window.close(); };
                };
                setTimeout(function() {
                    try { window.print(); } catch (e) {}
                }, 500);
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        try { printWindow.print(); } catch (e) {}
    }, 300);
}

/**
 * In Phiếu Điều Trị Nội Trú Hàng Ngày (Tờ Bệnh Trình chuẩn Mẫu 01/BV-01 Bộ Y Tế)
 */
export function printTreatmentSheet(data) {
    if (!data) return;

    const admissionCode = data.admissionCode || "SBA-2026-XXXX";
    const patientName = data.patientName || "Khách hàng";
    const age = data.age || "---";
    const gender = data.gender === "MALE" ? "Nam" : data.gender === "FEMALE" ? "Nữ" : "---";
    const departmentName = data.departmentName || "Khoa Điều Trị Nội Trú";
    const roomNumber = data.roomNumber || "---";
    const bedNumber = data.bedNumber || "---";
    const diagnosis = data.diagnosis || "---";
    const sheetNumber = data.sheetNumber || "01";
    const doctorName = data.doctorName || "Bác sĩ điều trị";
    const careLevel = data.careLevel || "Cấp II";
    const diet = data.diet || "Cơm mềm bệnh lý";
    const allergies = data.allergies || "Không ghi nhận";
    const records = data.records || [];

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
        alert("Vui lòng cho phép mở cửa sổ popup để in tờ bệnh trình!");
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Phiếu Điều Trị Nội Trú - ${patientName}</title>
            <style>
                @page { size: A4 portrait; margin: 12mm 15mm; }
                body {
                    font-family: 'Times New Roman', Times, serif;
                    color: #000;
                    background: #fff;
                    margin: 0;
                    padding: 0;
                    font-size: 11pt;
                    line-height: 1.35;
                }
                .header-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
                .title-block { text-align: center; margin: 10px 0 12px 0; }
                .title-main { font-size: 16pt; font-weight: bold; text-transform: uppercase; margin: 0; }
                .sheet-no { font-size: 11pt; font-style: italic; }
                .patient-info { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10.5pt; }
                .patient-info td { padding: 3px 0; vertical-align: top; }
                .treatment-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
                .treatment-table th, .treatment-table td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
                .treatment-table th { background: #f2f2f2; text-align: center; font-weight: bold; font-size: 10.5pt; }
                .vitals-box { margin-bottom: 6px; padding: 4px; background: #fafafa; border: 1px dashed #999; font-size: 9.5pt; }
                .doc-sign { margin-top: 15px; text-align: right; font-style: italic; font-size: 10pt; }
                @media print {
                    .no-print { display: none !important; }
                }
            </style>
        </head>
        <body>
            <table class="header-table">
                <tr>
                    <td style="width: 55%; vertical-align: top;">
                        <div style="font-size: 10pt;">SỞ Y TẾ THÀNH PHỐ HÀ NỘI</div>
                        <div style="font-weight: bold; font-size: 11pt;">BỆNH VIỆN ĐA KHOA QUỐC TẾ TNT</div>
                        <div style="font-size: 10pt;">Khoa: <b>${departmentName}</b></div>
                        <div style="font-size: 10pt;">Buồng: <b>${roomNumber}</b> &nbsp;&nbsp;|&nbsp;&nbsp; Giường: <b>${bedNumber}</b></div>
                    </td>
                    <td style="width: 45%; text-align: center; vertical-align: top;">
                        <div style="font-weight: bold; font-size: 10pt;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                        <div style="font-size: 9pt; font-style: italic;">Độc lập - Tự do - Hạnh phúc</div>
                        <div style="margin-top: 8px; font-size: 9.5pt; text-align: right;">
                            MS: <b>01/BV-01</b><br>
                            Số vào viện: <b>${admissionCode}</b>
                        </div>
                    </td>
                </tr>
            </table>

            <div class="title-block">
                <h1 class="title-main">PHIẾU ĐIỀU TRỊ</h1>
                <div class="sheet-no">(Tờ bệnh trình số: ${sheetNumber})</div>
            </div>

            <table class="patient-info">
                <tr>
                    <td style="width: 50%;">Họ và tên người bệnh: <b style="text-transform: uppercase; font-size: 11.5pt;">${patientName}</b></td>
                    <td style="width: 25%;">Tuổi: <b>${age}</b></td>
                    <td style="width: 25%;">Giới tính: <b>${gender}</b></td>
                </tr>
                <tr>
                    <td colspan="3">Chẩn đoán: <b>${diagnosis}</b></td>
                </tr>
                <tr>
                    <td>Chăm sóc: <b>${careLevel}</b></td>
                    <td>Chế độ ăn: <b>${diet}</b></td>
                    <td>Dị ứng: <b style="color: ${allergies !== 'Không' && allergies !== 'Không ghi nhận' ? '#b91c1c' : '#000'}">${allergies}</b></td>
                </tr>
            </table>

            <table class="treatment-table">
                <thead>
                    <tr>
                        <th style="width: 15%;">NGÀY GIỜ</th>
                        <th style="width: 40%;">DIỄN BIẾN BỆNH CỦA NGƯỜI BỆNH</th>
                        <th style="width: 45%;">Y LỆNH ĐIỀU TRỊ VÀ CHĂM SÓC</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.length > 0 ? records.map((rec) => `
                        <tr>
                            <td style="text-align: center; font-size: 10pt;">
                                <b>${rec.date || rec.logDate || "---"}</b><br>
                                <span style="font-size: 9pt; color: #555;">${rec.time || "08:00"}</span>
                            </td>
                            <td>
                                <div class="vitals-box">
                                    Mạch: <b>${rec.heartRate || "--"}</b> ck/p &nbsp;|&nbsp; 
                                    Nhiệt độ: <b>${rec.temperature || "--"}</b> °C<br>
                                    Huyết áp: <b>${rec.bloodPressure || "--"}</b> mmHg &nbsp;|&nbsp;
                                    SpO2: <b>${rec.spO2 || rec.spo2 || "98"}%</b>
                                </div>
                                <div style="font-size: 10.5pt; white-space: pre-wrap;">${rec.diseaseProgression || rec.progressNotes || "Bệnh nhân ổn định, tiếp xúc tốt."}</div>
                            </td>
                            <td>
                                <div style="font-size: 10.5pt; white-space: pre-wrap; margin-bottom: 12px;">${rec.doctorInstruction || rec.doctorOrders || "Duy trì phác đồ điều trị."}</div>
                                <div class="doc-sign">
                                    Bác sĩ ra y lệnh<br>
                                    <div style="height: 35px;"></div>
                                    <b>${rec.doctorName || doctorName}</b>
                                </div>
                            </td>
                        </tr>
                    `).join("") : `
                        <tr>
                            <td style="text-align: center;"><b>${formatDateTime(new Date().toISOString())}</b></td>
                            <td>
                                <div class="vitals-box">Mạch: 78 ck/p | Nhiệt độ: 36.8°C | Huyết áp: 120/80 mmHg | SpO2: 98%</div>
                                <div>Bệnh nhân tỉnh táo, tiếp xúc tốt, da niêm mạc hồng, tim đều T1 T2 rõ, phổi thông khí đều.</div>
                            </td>
                            <td>
                                <div>- Ringer Lactat 500ml x 01 chai, TTM 40 giọt/phút.<br>- Paracetamol 500mg x 02 viên, uống khi sốt ≥ 38.5°C.<br>- Theo dõi DHST mỗi 4h. Chế độ ăn cháo loãng.</div>
                                <div class="doc-sign">
                                    Bác sĩ ra y lệnh<br>
                                    <div style="height: 35px;"></div>
                                    <b>${doctorName}</b>
                                </div>
                            </td>
                        </tr>
                    `}
                </tbody>
            </table>

            <table style="width: 100%; margin-top: 25px; border-collapse: collapse;">
                <tr>
                    <td style="width: 50%; text-align: center; vertical-align: top;">
                        <b>ĐIỀU DƯỠNG THỰC HIỆN Y LỆNH</b><br>
                        <i style="font-size: 9pt;">(Ký và ghi rõ họ tên)</i>
                        <div style="height: 50px;"></div>
                    </td>
                    <td style="width: 50%; text-align: center; vertical-align: top;">
                        <b>BÁC SĨ ĐIỀU TRỊ CHÍNH</b><br>
                        <i style="font-size: 9pt;">(Ký và ghi rõ họ tên)</i>
                        <div style="height: 50px;"></div>
                        <b>${doctorName}</b>
                    </td>
                </tr>
            </table>

            <script>
                window.onload = function() {
                    window.print();
                    window.onafterprint = function() { window.close(); };
                };
                setTimeout(function() {
                    try { window.print(); } catch (e) {}
                }, 500);
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        try { printWindow.print(); } catch (e) {}
    }, 300);
}

/**
 * In Thẻ Đầu Giường Bệnh Nhân (Bedside Card)
 */
export function printBedsideCard(data) {
    if (!data) return;

    const patientName = data.patientName || "Khách hàng";
    const age = data.age || "---";
    const gender = data.gender === "MALE" ? "Nam" : data.gender === "FEMALE" ? "Nữ" : "---";
    const admissionCode = data.admissionCode || "SBA-2026-XXXX";
    const roomNumber = data.roomNumber || "---";
    const bedNumber = data.bedNumber || "---";
    const departmentName = data.departmentName || "Khoa Điều Trị Nội Trú";
    const doctorName = data.doctorName || "Bác sĩ phụ trách";
    const careLevel = data.careLevel || "Cấp II";
    const bloodType = data.bloodType || "O+";
    const diet = data.diet || "Cơm thường";
    const allergies = data.allergies || "Không";
    const admissionDate = data.admissionDate || formatDateTime(new Date().toISOString());

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
        alert("Vui lòng cho phép mở cửa sổ popup để in thẻ đầu giường!");
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Thẻ Đầu Giường - ${patientName}</title>
            <style>
                @page { size: A5 landscape; margin: 10mm; }
                body {
                    font-family: 'Arial', sans-serif;
                    color: #000;
                    background: #fff;
                    margin: 0;
                    padding: 8px;
                    border: 4px solid #0284c7;
                    border-radius: 8px;
                    font-size: 12pt;
                }
                .head-bar { display: flex; justify-content: space-between; border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 12px; }
                .hosp-title { font-size: 13pt; font-weight: bold; color: #002D5A; }
                .bed-badge { background: #0284c7; color: white; padding: 6px 14px; border-radius: 6px; font-weight: bold; font-size: 16pt; text-align: center; }
                .patient-name { font-size: 20pt; font-weight: 900; text-transform: uppercase; color: #0f172a; margin-bottom: 8px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
                .info-item { font-size: 11.5pt; }
                .allergy-box {
                    background: #fef2f2;
                    border: 2px solid #ef4444;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-weight: bold;
                    color: #b91c1c;
                    font-size: 13pt;
                    margin-top: 6px;
                }
            </style>
        </head>
        <body>
            <div class="head-bar">
                <div>
                    <div class="hosp-title">BỆNH VIỆN ĐA KHOA QUỐC TẾ TNT</div>
                    <div style="font-size: 10pt; color: #555;">KHOA: <b>${departmentName.toUpperCase()}</b></div>
                </div>
                <div class="bed-badge">
                    PHÒNG ${roomNumber} - GIƯỜNG ${bedNumber}
                </div>
            </div>

            <div class="patient-name">${patientName}</div>

            <div class="info-grid">
                <div class="info-item">Năm sinh / Tuổi: <b>${age}</b> &nbsp;|&nbsp; Giới tính: <b>${gender}</b></div>
                <div class="info-item">Mã hồ sơ nội trú: <b>${admissionCode}</b></div>
                <div class="info-item">Bác sĩ điều trị: <b>${doctorName}</b></div>
                <div class="info-item">Ngày vào khoa: <b>${admissionDate}</b></div>
                <div class="info-item">Mức chăm sóc: <b>${careLevel}</b></div>
                <div class="info-item">Nhóm máu: <b style="font-size: 13pt; color: #dc2626;">${bloodType}</b> &nbsp;|&nbsp; Chế độ ăn: <b>${diet}</b></div>
            </div>

            <div class="allergy-box">
                ⚠️ DỊ ỨNG & CẢNH BÁO ĐẶC BIỆT: ${allergies.toUpperCase()}
            </div>

            <script>
                window.onload = function() {
                    window.print();
                    window.onafterprint = function() { window.close(); };
                };
                setTimeout(function() {
                    try { window.print(); } catch (e) {}
                }, 500);
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        try { printWindow.print(); } catch (e) {}
    }, 300);
}

/**
 * In Biên Bản Bàn Giao & Đối Soát Viện Phí Ca Trực (Khổ A4 Chuẩn)
 */
export function printShiftReconciliation(data) {
    if (!data) return;

    const cashierName = data.cashierName || "Thu ngân ca trực";
    const shiftName = data.shiftName || "Toàn bộ ca";
    const printedAt = formatDateTime(new Date().toISOString());
    const totalCollected = Number(data.totalCollected || 0);
    const cashTotal = Number(data.cashTotal || 0);
    const cashCount = Number(data.cashCount || 0);
    const digitalTotal = Number(data.digitalTotal || 0);
    const digitalCount = Number(data.digitalCount || 0);
    const posTotal = Number(data.posTotal || 0);
    const posCount = Number(data.posCount || 0);
    const totalTransactions = Number(data.transactionCount || 0);
    const transactions = Array.isArray(data.transactions) ? data.transactions : [];

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
        alert("Vui lòng cho phép mở popup để in biên bản đối soát!");
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Biên Bản Đối Soát Viện Phí - ${shiftName}</title>
            <style>
                @page { size: A4 portrait; margin: 15mm; }
                body {
                    font-family: 'Times New Roman', Times, serif;
                    color: #000;
                    margin: 0;
                    padding: 0;
                    font-size: 11pt;
                    line-height: 1.4;
                }
                .header-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                .title { text-align: center; font-size: 16pt; font-weight: bold; margin: 12px 0 4px 0; text-transform: uppercase; }
                .subtitle { text-align: center; font-style: italic; font-size: 10pt; margin-bottom: 15px; }
                .summary-table, .detail-table { width: 100%; border-collapse: collapse; margin: 12px 0; }
                .summary-table th, .summary-table td, .detail-table th, .detail-table td {
                    border: 1px solid #333;
                    padding: 6px 8px;
                    font-size: 10pt;
                }
                .summary-table th, .detail-table th { background: #f2f2f2; text-align: center; font-weight: bold; }
                .sign-table { width: 100%; margin-top: 30px; border-collapse: collapse; }
                .sign-cell { text-align: center; vertical-align: top; width: 33.3%; }
                .sign-space { height: 60px; }
            </style>
        </head>
        <body>
            <table class="header-table">
                <tr>
                    <td style="width: 55%; vertical-align: top;">
                        <div style="font-weight: bold; font-size: 11pt;">BỆNH VIỆN ĐA KHOA QUỐC TẾ TNT</div>
                        <div style="font-size: 9.5pt;">PHÒNG TÀI CHÍNH - KẾ TOÁN VIỆN PHÍ</div>
                    </td>
                    <td style="width: 45%; text-align: center; vertical-align: top;">
                        <div style="font-weight: bold; font-size: 10pt;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                        <div style="font-size: 9pt; font-style: italic;">Độc lập - Tự do - Hạnh phúc</div>
                    </td>
                </tr>
            </table>

            <div class="title">BIÊN BẢN ĐỐI SOÁT & KẾT CA THU VIỆN PHÍ</div>
            <div class="subtitle">(Áp dụng đối chiếu tiền mặt két và giao dịch chuyển khoản VietQR/POS)</div>

            ${data.hasMissingAmount ? `
                <div style="border: 2px solid #b91c1c; background: #fef2f2; color: #991b1b; padding: 10px; margin: 12px 0; font-weight: bold; border-radius: 4px; font-size: 10pt;">
                    ⚠️ CẢNH BÁO ĐỐI SOÁT: Ca trực ghi nhận có giao dịch chưa xác định được số tiền từ máy chủ. Tổng tiền thực thu dưới đây chỉ là tổng từng phần của các giao dịch hợp lệ, chưa phản ánh đầy đủ doanh thu ca trực.
                </div>
            ` : ''}

            <p style="margin: 6px 0;">
                - <b>Thu ngân phụ trách:</b> ${cashierName}<br>
                - <b>Ca làm việc:</b> ${shiftName}<br>
                - <b>Thời gian kết sổ:</b> ${printedAt}
            </p>

            <div style="font-weight: bold; margin-top: 10px;">I. BẢNG TỔNG HỢP NGUỒN TIỀN THU ĐƯỢC:</div>
            <table class="summary-table">
                <thead>
                    <tr>
                        <th style="width: 8%;">STT</th>
                        <th style="width: 42%;">Phương thức thanh toán</th>
                        <th style="width: 20%;">Số lượng giao dịch</th>
                        <th style="width: 30%;">Tổng số tiền (VNĐ)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td align="center">1</td>
                        <td><b>Tiền mặt tại két (CASH)</b></td>
                        <td align="center">${cashCount} lượt</td>
                        <td align="right"><b>${formatCurrency(cashTotal)}</b></td>
                    </tr>
                    <tr>
                        <td align="center">2</td>
                        <td><b>Cổng PayOS (VietQR Napas 247)</b></td>
                        <td align="center">${digitalCount} lượt</td>
                        <td align="right"><b>${formatCurrency(digitalTotal)}</b></td>
                    </tr>
                    <tr>
                        <td align="center">3</td>
                        <td><b>Quẹt thẻ qua máy POS</b></td>
                        <td align="center">${posCount} lượt</td>
                        <td align="right"><b>${formatCurrency(posTotal)}</b></td>
                    </tr>
                    <tr style="background: #fafafa;">
                        <td colspan="2" align="right"><b>TỔNG CỘNG THỰC THU TRONG CA:</b></td>
                        <td align="center"><b>${totalTransactions} lượt</b></td>
                        <td align="right"><b style="font-size: 11pt; color: #b91c1c;">${formatCurrency(totalCollected)}</b></td>
                    </tr>
                </tbody>
            </table>

            <div style="font-weight: bold; margin-top: 15px;">II. DANH SÁCH BẢNG KÊ BIÊN LAI (RÚT GỌN):</div>
            <table class="detail-table">
                <thead>
                    <tr>
                        <th style="width: 6%;">STT</th>
                        <th style="width: 22%;">Mã biên lai</th>
                        <th style="width: 26%;">Bệnh nhân</th>
                        <th style="width: 20%;">Phương thức</th>
                        <th style="width: 26%;">Số tiền (VNĐ)</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactions.slice(0, 25).map((t, i) => {
                        const rawVal = t.totalAmount !== undefined ? t.totalAmount : t.amount;
                        const isValValid = rawVal != null && (typeof rawVal === "number" ? Number.isFinite(rawVal) && rawVal >= 0 : (typeof rawVal === "string" && rawVal.trim() !== "" && Number.isFinite(Number(rawVal.trim())) && Number(rawVal.trim()) >= 0));
                        return `
                        <tr>
                            <td align="center">${i + 1}</td>
                            <td>${t.receiptCode || t.billId || '---'}</td>
                            <td>${t.patientName || 'Khách hàng'}</td>
                            <td align="center">${t.paymentMethod === 'CASH' ? 'Tiền mặt' : (t.paymentMethod === 'POS' ? 'Thẻ POS' : 'VietQR')}</td>
                            <td align="right">${isValValid ? formatCurrency(Number(rawVal)) : '<span style="color: #b91c1c; font-style: italic;">Chưa có dữ liệu</span>'}</td>
                        </tr>
                        `;
                    }).join('')}
                    ${transactions.length > 25 ? `
                        <tr>
                            <td colspan="5" align="center" style="font-style: italic; color: #555;">
                                ... Và còn ${transactions.length - 25} giao dịch khác được lưu trong hệ thống HIS.
                            </td>
                        </tr>
                    ` : ''}
                </tbody>
            </table>

            <table class="sign-table">
                <tr>
                    <td class="sign-cell">
                        <b>NGƯỜI NỘP TIỀN (THU NGÂN)</b><br>
                        <i>(Ký và ghi rõ họ tên)</i>
                        <div class="sign-space"></div>
                        <b>${cashierName}</b>
                    </td>
                    <td class="sign-cell">
                        <b>KẾ TOÁN VIỆN PHÍ</b><br>
                        <i>(Ký và ghi rõ họ tên)</i>
                        <div class="sign-space"></div>
                        ..........................................
                    </td>
                    <td class="sign-cell">
                        <b>TRƯỞNG PHÒNG TÀI CHÍNH</b><br>
                        <i>(Ký và ghi rõ họ tên)</i>
                        <div class="sign-space"></div>
                        ..........................................
                    </td>
                </tr>
            </table>

            <script>
                window.onload = function() {
                    window.print();
                    window.onafterprint = function() { window.close(); };
                };
                setTimeout(function() {
                    try { window.print(); } catch (e) {}
                }, 500);
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        try { printWindow.print(); } catch (e) {}
    }, 300);
}

/**
 * In Phiếu Cấp Phát Thuốc / Hướng Dẫn Sử Dụng Thuốc (Khổ A5 Chuẩn BHYT / Bộ Y Tế)
 */
export function printDispenseSlip(data) {
    if (!data) return;

    const dispenseCode = escapeHtml(data.dispenseCode || "Chưa có mã phiếu xuất");
    const prescriptionCode = escapeHtml(data.prescriptionCode || "---");
    const patientName = escapeHtml(data.patientName || "Chưa có dữ liệu");
    const patientPhone = escapeHtml(data.patientPhone || "---");
    const bookingCode = escapeHtml(data.bookingCode || "---");
    const warehouseName = escapeHtml(data.warehouseName || "Chưa có dữ liệu");
    const dispensedByName = escapeHtml(data.dispensedByName || "Dược sĩ phụ trách");
    const dispensedAt = data.dispensedAt ? formatDateTime(data.dispensedAt) : "Chưa có dữ liệu";
    const totalAmount = data.totalAmount != null ? data.totalAmount : (data.amount != null ? data.amount : null);
    const notes = escapeHtml(data.notes || "Uống thuốc đúng theo hướng dẫn, bảo quản nơi khô ráo thoáng mát.");
    const items = data.items || [];

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
        alert("Vui lòng cho phép mở cửa sổ popup để in phiếu cấp phát thuốc!");
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Phiếu Xuất Thuốc - ${dispenseCode}</title>
            <style>
                @page { size: A5 portrait; margin: 8mm; }
                body {
                    font-family: 'Times New Roman', Times, serif;
                    color: #000;
                    background: #fff;
                    margin: 0;
                    padding: 0;
                    font-size: 10.5pt;
                    line-height: 1.35;
                }
                .header-table { width: 100%; margin-bottom: 8px; border-collapse: collapse; }
                .header-left { width: 60%; vertical-align: top; }
                .header-right { width: 40%; text-align: center; vertical-align: top; }
                .title { text-align: center; font-size: 14pt; font-weight: bold; margin: 8px 0 2px 0; text-transform: uppercase; }
                .subtitle { text-align: center; font-style: italic; font-size: 8.5pt; margin-bottom: 10px; }
                .info-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
                .info-table td { padding: 2px 0; vertical-align: top; font-size: 10pt; }
                .item-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
                .item-table th, .item-table td { border: 1px solid #333; padding: 4px 5px; font-size: 9.5pt; word-break: break-word; }
                .item-table th { background-color: #f2f2f2; text-align: center; font-weight: bold; }
                .total-box { margin-top: 6px; font-weight: bold; font-size: 10.5pt; text-align: right; }
                .sign-table { width: 100%; margin-top: 15px; border-collapse: collapse; }
                .sign-cell { text-align: center; vertical-align: top; width: 50%; font-size: 10pt; }
                .sign-space { height: 45px; }
                .note-box { border: 1px dashed #666; padding: 6px; margin-top: 8px; font-size: 9pt; border-radius: 4px; }
                @media print {
                    .no-print { display: none !important; }
                }
            </style>
        </head>
        <body>
            <table class="header-table">
                <tr>
                    <td class="header-left">
                        <div style="font-weight: bold; font-size: 10.5pt;">BỆNH VIỆN ĐA KHOA QUỐC TẾ TNT</div>
                        <div style="font-size: 8.5pt;">Khoa Dược - ${warehouseName}</div>
                        <div style="font-size: 8.5pt;">Địa chỉ: Lô đất CC2, Khu đô thị mới Văn Quán, số 114 Nguyễn Khuyến, phường Văn Quán, quận Hà Đông, Hà Nội</div>
                        <div style="font-size: 8.5pt;">Hotline Dược Lâm Sàng: 1900 8888</div>
                    </td>
                    <td class="header-right">
                        <div style="font-size: 8.5pt;">Mã phiếu: <b>${dispenseCode}</b></div>
                        <div style="font-size: 8.5pt;">Đơn thuốc: <b>${prescriptionCode}</b></div>
                        <div style="font-size: 8pt; color: #555;">Mã khám: ${bookingCode}</div>
                    </td>
                </tr>
            </table>

            <div class="title">PHIẾU XUẤT THUỐC BỆNH NHÂN (FEFO)</div>
            <div class="subtitle">(Kiểm nghiệm dược lâm sàng & Bàn giao thuốc ngoại trú)</div>

            <table class="info-table">
                <tr>
                    <td style="width: 60%;">Họ và tên người bệnh: <b>${patientName}</b></td>
                    <td style="width: 40%;">Điện thoại: <b>${patientPhone}</b></td>
                </tr>
                <tr>
                    <td>Kho cấp phát: <b>${warehouseName}</b></td>
                    <td>Thời gian xuất: ${dispensedAt}</td>
                </tr>
            </table>

            <table class="item-table">
                <thead>
                    <tr>
                        <th style="width: 6%;">STT</th>
                        <th style="width: 32%;">Tên thuốc & Hoạt chất</th>
                        <th style="width: 16%;">Số lô xuất</th>
                        <th style="width: 14%;">Hạn dùng</th>
                        <th style="width: 10%;">SL</th>
                        <th style="width: 22%;">Hướng dẫn dùng</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map((it, idx) => `
                        <tr>
                            <td align="center">${idx + 1}</td>
                            <td><b>${escapeHtml(it.medicineName || '---')}</b></td>
                            <td align="center"><code>${escapeHtml(it.batchNumber || '---')}</code></td>
                            <td align="center">${escapeHtml(it.expiryDate ? it.expiryDate : '---')}</td>
                            <td align="center"><b>${escapeHtml(it.quantityDispensed || it.quantity || 1)}</b></td>
                            <td style="font-size: 8.5pt;">${escapeHtml(it.dosageInstruction || 'Uống theo đơn')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            ${totalAmount > 0 ? `
                <div class="total-box">
                    Tổng giá trị tiền thuốc: ${formatCurrency(totalAmount)}
                </div>
            ` : ''}

            <div class="note-box">
                <b>Lời dặn của Bác sĩ / Dược sĩ:</b> ${notes}<br>
                <i>* Lưu ý: Kiểm tra kỹ tên thuốc, số lượng trước khi rời quầy. Bảo quản nơi thoáng mát (&lt; 30°C). Tái khám ngay nếu có dấu hiệu dị ứng bất thường.</i>
            </div>

            <table class="sign-table">
                <tr>
                    <td class="sign-cell">
                        <b>NGƯỜI NHẬN THUỐC</b><br>
                        <i>(Ký và ghi rõ họ tên)</i>
                        <div class="sign-space"></div>
                        <b>${patientName}</b>
                    </td>
                    <td class="sign-cell">
                        <b>DƯỢC SĨ CẤP PHÁT</b><br>
                        <i>(Ký và ghi rõ họ tên)</i>
                        <div class="sign-space"></div>
                        <b>${dispensedByName}</b>
                    </td>
                </tr>
            </table>

            <script>
                window.onload = function() {
                    window.print();
                    window.onafterprint = function() { window.close(); };
                };
                setTimeout(function() {
                    try { window.print(); } catch (e) {}
                }, 500);
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        try { printWindow.print(); } catch (e) {}
    }, 300);
}

/**
 * In Phiếu Khám Bệnh & Đơn Thuốc Ngoại Trú (Khổ A4/A5 Chuẩn EMR)
 */
export function printMedicalRecordSheet(data) {
    if (!data) return;

    const bookingCode = data.bookingCode || "BK-2026-XXXX";
    const patientName = data.patientName || "Khách hàng";
    const patientDob = data.patientDob || "---";
    const patientPhone = data.patientPhone || data.phoneNumber || "---";
    const patientAddress = data.patientAddress || data.address || "Lô đất CC2, Khu đô thị mới Văn Quán, số 114 Nguyễn Khuyến, phường Văn Quán, quận Hà Đông, Hà Nội";
    const patientCode = data.patientCode || "BN-2026";
    const departmentName = data.departmentName || "Khoa Khám Bệnh";
    const doctorName = data.doctorName || "Bác sĩ điều trị";
    const bookingDate = data.bookingDate || formatDateTime(new Date().toISOString());
    const diagnosis = data.diagnosis || data.finalDiagnosis || data.initialDiagnosis || "Khám nội tổng quát";
    const treatmentPlan = data.treatmentPlan || "Uống thuốc đúng liều lượng theo đơn, tái khám đúng hẹn.";
    const reExaminationDate = data.reExaminationDate || data.reExamDate || "Không có";
    const totalAmount = Number(data.totalAmount || data.prescription?.totalAmount || 0);

    const prescriptionItems = Array.isArray(data.prescriptionItems) && data.prescriptionItems.length > 0
        ? data.prescriptionItems
        : (data.prescription?.items || data.items || []);

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
        alert("Vui lòng cho phép mở cửa sổ popup để in phiếu khám!");
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Phiếu Khám Bệnh & Đơn Thuốc - ${bookingCode}</title>
            <style>
                @page { size: A4 portrait; margin: 12mm; }
                body {
                    font-family: 'Times New Roman', Times, serif;
                    color: #000;
                    background: #fff;
                    margin: 0;
                    padding: 0;
                    font-size: 11pt;
                    line-height: 1.4;
                }
                .header-table { width: 100%; margin-bottom: 12px; border-collapse: collapse; }
                .title { text-align: center; font-size: 17pt; font-weight: bold; margin: 12px 0 2px 0; text-transform: uppercase; color: #002D5A; }
                .subtitle { text-align: center; font-style: italic; font-size: 9.5pt; margin-bottom: 12px; color: #444; }
                .section-title { font-weight: bold; font-size: 11pt; margin-top: 10px; margin-bottom: 4px; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 2px; }
                .info-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
                .info-table td { padding: 4px 0; vertical-align: top; font-size: 10.5pt; }
                .med-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
                .med-table th, .med-table td { border: 1px solid #333; padding: 5px 6px; font-size: 10pt; }
                .med-table th { background-color: #f2f2f2; text-align: center; font-weight: bold; }
                .footer-table { width: 100%; margin-top: 25px; border-collapse: collapse; }
                .footer-cell { text-align: center; vertical-align: top; width: 50%; font-size: 10.5pt; }
                .stamp-box {
                    display: inline-block;
                    margin-top: 6px;
                    padding: 3px 12px;
                    border: 1.5px solid #0284c7;
                    color: #0284c7;
                    border-radius: 12px;
                    font-weight: bold;
                    font-size: 9pt;
                    text-transform: uppercase;
                }
                @media print {
                    .no-print { display: none !important; }
                }
            </style>
        </head>
        <body>
            <table class="header-table">
                <tr>
                    <td style="width: 58%; vertical-align: top;">
                        <div style="font-weight: bold; font-size: 12pt; color: #002D5A;">BỆNH VIỆN ĐA KHOA QUỐC TẾ TNT</div>
                        <div style="font-size: 9pt;">Địa chỉ: Lô đất CC2, Khu đô thị mới Văn Quán, số 114 Nguyễn Khuyến, phường Văn Quán, quận Hà Đông, Hà Nội</div>
                        <div style="font-size: 9pt;">Hotline: 1900 8888 • Email: hotro@tnthospital.vn</div>
                    </td>
                    <td style="width: 42%; text-align: right; vertical-align: top;">
                        <div style="font-size: 9.5pt;">Mã khám: <b>${bookingCode}</b></div>
                        <div style="font-size: 9.5pt;">Mã BN: <b>${patientCode}</b></div>
                        <div style="font-size: 8.5pt; color: #555;">Ngày in: ${formatDateTime(new Date().toISOString())}</div>
                    </td>
                </tr>
            </table>

            <div class="title">PHIẾU KHÁM BỆNH & ĐƠN THUỐC</div>
            <div class="subtitle">(Trích lục Hồ sơ Bệnh án Ngoại trú - Bản thể hiện điện tử EMR)</div>

            <div class="section-title">I. THÔNG TIN BỆNH NHÂN</div>
            <table class="info-table">
                <tr>
                    <td style="width: 50%;">Họ và tên: <b style="text-transform: uppercase; font-size: 11pt;">${patientName}</b></td>
                    <td style="width: 25%;">Ngày sinh: <b>${patientDob}</b></td>
                    <td style="width: 25%;">SĐT: <b>${patientPhone}</b></td>
                </tr>
                <tr>
                    <td colspan="3">Địa chỉ: <b>${patientAddress}</b></td>
                </tr>
            </table>

            <div class="section-title">II. KẾT QUẢ KHÁM LÂM SÀNG & CHẨN ĐOÁN</div>
            <table class="info-table">
                <tr>
                    <td style="width: 50%;">Chuyên khoa: <b>${departmentName}</b></td>
                    <td style="width: 50%;">Bác sĩ khám: <b>${doctorName}</b></td>
                </tr>
                <tr>
                    <td>Thời gian khám: <b>${bookingDate}</b></td>
                    <td>Ngày hẹn tái khám: <b style="color: #0284c7;">${reExaminationDate}</b></td>
                </tr>
                <tr>
                    <td colspan="2">Chẩn đoán xác định: <b style="font-size: 11pt;">${diagnosis}</b></td>
                </tr>
                <tr>
                    <td colspan="2">Hướng điều trị / Lời dặn: <i>${treatmentPlan}</i></td>
                </tr>
            </table>

            <div class="section-title">III. ĐƠN THUỐC ĐIỀU TRỊ</div>
            <table class="med-table">
                <thead>
                    <tr>
                        <th style="width: 35px;">STT</th>
                        <th style="text-align: left;">Tên thuốc & Hàm lượng</th>
                        <th style="width: 60px;">SL</th>
                        <th style="width: 50px;">ĐVT</th>
                        <th style="text-align: left;">Hướng dẫn liều dùng</th>
                        ${totalAmount > 0 ? '<th style="width: 80px; text-align: right;">Đơn giá</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${prescriptionItems.length > 0 ? prescriptionItems.map((item, idx) => `
                        <tr>
                            <td style="text-align: center;">${idx + 1}</td>
                            <td><b>${item.medicineName || item.name || '---'}</b></td>
                            <td style="text-align: center; font-weight: bold;">${item.quantity || item.qty || 1}</td>
                            <td style="text-align: center;">${item.unit || 'Viên'}</td>
                            <td>${item.dosageInstruction || item.usage || item.dosage || 'Theo chỉ định bác sĩ'}</td>
                            ${totalAmount > 0 ? `<td style="text-align: right;">${formatCurrency(item.price || item.unitPrice || 0)}</td>` : ''}
                        </tr>
                    `).join('') : `
                        <tr>
                            <td colspan="${totalAmount > 0 ? 6 : 5}" style="text-align: center; padding: 8px; font-style: italic;">
                                Không có chỉ định kê đơn thuốc trong buổi khám này.
                            </td>
                        </tr>
                    `}
                </tbody>
            </table>

            ${totalAmount > 0 ? `
                <div style="text-align: right; font-weight: bold; font-size: 11pt; margin-top: 6px;">
                    Tổng tiền thuốc: <span>${formatCurrency(totalAmount)}</span>
                </div>
            ` : ''}

            <table class="footer-table">
                <tr>
                    <td class="footer-cell">
                        <b>BỆNH NHÂN / NGƯỜI NHÀ</b><br>
                        <i style="font-size: 8.5pt;">(Ký, ghi rõ họ tên)</i>
                        <div style="height: 50px;"></div>
                        <div>${patientName}</div>
                    </td>
                    <td class="footer-cell">
                        <i style="font-size: 9pt;">Hà Nội, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}</i><br>
                        <b>BÁC SĨ ĐIỀU TRỊ</b><br>
                        <i style="font-size: 8.5pt;">(Ký và xác nhận điện tử)</i>
                        <div style="height: 10px;"></div>
                        <div class="stamp-box">ĐÃ KÝ ĐIỆN TỬ - TNT HOSPITAL</div>
                        <div style="height: 15px;"></div>
                        <div><b>${doctorName}</b></div>
                    </td>
                </tr>
            </table>

            <script>
                window.onload = function() {
                    window.print();
                    window.onafterprint = function() { window.close(); };
                };
                setTimeout(function() {
                    try { window.print(); } catch (e) {}
                }, 500);
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        try { printWindow.print(); } catch (e) {}
    }, 300);
}

/**
 * In Giấy Hẹn Tái Khám / Phiếu Hẹn Tái Khám A5 Chuẩn Bộ Y Tế
 */
export function printReExamAppointmentSlip(data) {
    if (!data) return;

    const patientName = data.patientName || "Bệnh nhân";
    const patientDob = data.patientDob || data.dateOfBirth || "---";
    const patientPhone = data.patientPhone || data.phoneNumber || data.phone || "---";
    const patientAddress = data.patientAddress || data.address || "---";
    const bookingCode = data.bookingCode || "BK-2026";
    const departmentName = data.departmentName || "Khoa Khám Bệnh";
    const roomName = data.roomName || "Phòng khám chuyên khoa";
    const doctorName = data.doctorName || "Bác sĩ điều trị";
    const finalDiagnosis = data.finalDiagnosis || data.diagnosis || "Chưa có chẩn đoán";
    const treatmentPlan = data.treatmentPlan || "Tuân thủ uống thuốc và hướng dẫn điều trị của bác sĩ.";
    const reExaminationDate = data.reExaminationDate || data.reExamDate || "Theo hẹn bác sĩ";
    const appointmentCode = "TK-" + (bookingCode.replace(/[^0-9]/g, "").slice(-6) || Math.floor(100000 + Math.random() * 900000));

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
        alert("Vui lòng cho phép mở cửa sổ popup để in giấy hẹn tái khám!");
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Giấy Hẹn Tái Khám - ${patientName}</title>
            <style>
                @page { size: A5 portrait; margin: 10mm; }
                body {
                    font-family: 'Times New Roman', Times, serif;
                    color: #000;
                    background: #fff;
                    margin: 0;
                    padding: 0;
                    font-size: 11pt;
                    line-height: 1.4;
                }
                .header-table { width: 100%; margin-bottom: 12px; border-collapse: collapse; }
                .title { text-align: center; font-size: 16pt; font-weight: bold; margin: 10px 0 2px 0; text-transform: uppercase; color: #0284c7; }
                .subtitle { text-align: center; font-style: italic; font-size: 9.5pt; margin-bottom: 12px; color: #444; }
                .info-box {
                    border: 1.5px solid #0284c7;
                    border-radius: 8px;
                    padding: 10px 14px;
                    margin: 12px 0;
                    background-color: #f0f9ff;
                }
                .highlight-date {
                    font-size: 14pt;
                    font-weight: bold;
                    color: #0369a1;
                    text-align: center;
                    padding: 8px 0;
                    background: #e0f2fe;
                    border-radius: 6px;
                    margin: 8px 0;
                    border: 1px dashed #0284c7;
                }
                .info-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
                .info-table td { padding: 4px 2px; vertical-align: top; font-size: 10.5pt; }
                .footer-table { width: 100%; margin-top: 20px; border-collapse: collapse; }
                .footer-cell { text-align: center; vertical-align: top; width: 50%; font-size: 10.5pt; }
                .note-box {
                    font-size: 9pt;
                    font-style: italic;
                    color: #475569;
                    margin-top: 10px;
                    padding: 6px 10px;
                    background: #f8fafc;
                    border-left: 3px solid #0284c7;
                }
                @media print {
                    .no-print { display: none !important; }
                }
            </style>
        </head>
        <body>
            <table class="header-table">
                <tr>
                    <td style="width: 60%; vertical-align: top;">
                        <div style="font-weight: bold; font-size: 11pt; color: #002D5A;">BỆNH VIỆN ĐA KHOA QUỐC TẾ TNT</div>
                        <div style="font-size: 8.5pt;">Địa chỉ: Lô CC2, KĐT Văn Quán, Q. Hà Đông, Hà Nội</div>
                        <div style="font-size: 8.5pt;">Hotline: 1900 8888 • Cấp cứu: 024 3888 9999</div>
                    </td>
                    <td style="width: 40%; text-align: right; vertical-align: top;">
                        <div style="font-size: 9pt;">Mã hẹn: <b style="color: #0284c7;">${appointmentCode}</b></div>
                        <div style="font-size: 8.5pt;">Mã khám cũ: <b>${bookingCode}</b></div>
                        <div style="font-size: 8pt; color: #666;">Ngày lập: ${new Date().toLocaleDateString('vi-VN')}</div>
                    </td>
                </tr>
            </table>

            <div class="title">GIẤY HẸN TÁI KHÁM</div>
            <div class="subtitle">(Dành cho bệnh nhân điều trị ngoại trú tái khám định kỳ)</div>

            <table class="info-table">
                <tr>
                    <td style="width: 60%;">Họ và tên người bệnh: <b style="font-size: 11.5pt; text-transform: uppercase;">${patientName}</b></td>
                    <td style="width: 40%;">Năm sinh/Ngày sinh: <b>${patientDob}</b></td>
                </tr>
                <tr>
                    <td>Số điện thoại: <b>${patientPhone}</b></td>
                    <td>Khoa khám: <b>${departmentName}</b></td>
                </tr>
                <tr>
                    <td colspan="2">Địa chỉ: ${patientAddress}</td>
                </tr>
                <tr>
                    <td colspan="2">Chẩn đoán xuất viện / ra về: <b style="color: #0f172a;">${finalDiagnosis}</b></td>
                </tr>
            </table>

            <div class="info-box">
                <div style="font-weight: bold; font-size: 10.5pt; color: #0369a1; text-transform: uppercase; margin-bottom: 4px;">
                    📅 THÔNG TIN LỊCH HẸN TÁI KHÁM:
                </div>
                <div class="highlight-date">
                    NGÀY HẸN TÁI KHÁM: ${reExaminationDate}
                </div>
                <div style="font-size: 10pt; margin-top: 4px;">
                    • <b>Địa điểm khám:</b> ${roomName} - ${departmentName} (Tầng 2 - Khu Khám Bệnh Chuyên Khoa)<br/>
                    • <b>Bác sĩ hẹn khám:</b> ${doctorName}<br/>
                    • <b>Lời dặn chuyên môn:</b> ${treatmentPlan}
                </div>
            </div>

            <div class="note-box">
                <b>* Hướng dẫn dành cho người bệnh khi đi tái khám:</b><br/>
                1. Mang theo Giấy hẹn tái khám này kèm CCCD/BHYT và đơn thuốc / phim chụp cũ.<br/>
                2. Quét mã QR trên phiếu tại Kiosk tiếp đón tự động hoặc Quầy tiếp đón để được cấp số ưu tiên khám.<br/>
                3. Nếu cần làm xét nghiệm máu vào ngày tái khám, vui lòng nhịn ăn sáng trước khi đến viện.
            </div>

            <table class="footer-table">
                <tr>
                    <td class="footer-cell">
                        <b>NGƯỜI BỆNH / THÂN NHÂN</b><br/>
                        <i style="font-size: 9pt;">(Ký và ghi rõ họ tên)</i>
                    </td>
                    <td class="footer-cell">
                        <b>BÁC SĨ ĐIỀU TRỊ HẸN KHÁM</b><br/>
                        <i style="font-size: 9pt;">(Ký, ghi rõ họ tên và đóng dấu)</i>
                        <div style="margin-top: 50px; font-weight: bold; font-size: 11pt;">${doctorName}</div>
                    </td>
                </tr>
            </table>

            <script>
                window.onload = function() {
                    window.print();
                    window.onafterprint = function() { window.close(); };
                };
                setTimeout(function() {
                    try { window.print(); } catch (e) {}
                }, 500);
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        try { printWindow.print(); } catch (e) {}
    }, 300);
}


