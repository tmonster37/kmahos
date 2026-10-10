import { formatCurrency, formatDateTime } from "./formatters";
import { generateBarcodeSvg } from "./barcodeGenerator";

/**
 * In Biên Lai Thu Viện Phí / Hóa Đơn Khám Chữa Bệnh (Khổ A5 Chuẩn)
 */
export function printReceipt(data) {
    if (!data) return;

    const receiptCode = data.receiptCode || data.billId || "RC-" + Math.floor(100000 + Math.random() * 900000);
    const patientName = data.patientName || "Khách hàng";
    const phoneNumber = data.phoneNumber || "---";
    const identityNumber = data.identityNumber || "---";
    const departmentName = data.departmentName || "Khoa Khám Bệnh";
    const doctorName = data.doctorName || "Bác sĩ phụ trách";
    const paymentMethodText = data.paymentMethod === "CASH" ? "Tiền mặt" :
                              data.paymentMethod === "POS" ? "Quẹt thẻ POS" :
                              data.paymentMethod === "VIETQR" ? "Chuyển khoản VietQR" :
                              data.paymentMethod === "MOMO" ? "Ví điện tử MoMo" :
                              data.paymentMethod === "VNPAY" ? "Cổng VNPay" : "Chuyển khoản";
    const cashierName = data.cashierName || "Thu ngân viện phí";
    const paidAt = data.paidAt ? formatDateTime(data.paidAt) : formatDateTime(new Date().toISOString());
    const totalAmount = Number(data.totalAmount || data.amount || 0);
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
                .item-table th, .item-table td { border: 1px solid #333; padding: 5px 6px; font-size: 10pt; }
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
                        <div style="font-size: 9pt;">Địa chỉ: 141 Chiến Thắng, Thanh Liệt, Hà Nội</div>
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
                    ${items.map((it, idx) => `
                        <tr>
                            <td style="text-align: center;">${idx + 1}</td>
                            <td>${it.name || it.description}</td>
                            <td style="text-align: center;">${it.qty || 1}</td>
                            <td style="text-align: right;">${formatCurrency(it.price || it.amount)}</td>
                            <td style="text-align: right; font-weight: bold;">${formatCurrency((it.price || it.amount) * (it.qty || 1))}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>

            <div class="total-box">
                TỔNG SỐ TIỀN THU: <span style="color: #000; font-size: 13pt;">${formatCurrency(totalAmount)}</span>
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
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

/**
 * In Phiếu Xác Nhận Đặt Lịch Khám (Khổ A5 Chuẩn)
 */
export function printAppointmentTicket(data) {
    if (!data) return;

    const bookingCode = data.bookingCode || "BK-2026-XXXX";
    const patientName = data.patientName || "Khách hàng";
    const phoneNumber = data.phoneNumber || "---";
    const departmentName = data.departmentName || "Khoa Khám Bệnh";
    const doctorName = data.doctorName || "Bác sĩ chuyên khoa";
    const bookingDate = data.bookingDate || "---";
    const timeSlot = data.timeSlot || "Trong giờ hành chính";
    const queueNumber = data.queueNumber ? `#${data.queueNumber}` : "Đang cấp";
    const price = Number(data.price || 0);

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
                .title { text-align: center; font-size: 16pt; font-weight: bold; margin: 10px 0 2px 0; text-transform: uppercase; color: #002D5A; }
                .queue-box {
                    text-align: center;
                    border: 2px dashed #002D5A;
                    padding: 10px;
                    margin: 12px 0;
                    border-radius: 6px;
                    background-color: #f8fafc;
                }
                .queue-number { font-size: 26pt; font-weight: bold; color: #0284c7; }
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
                        <div style="font-size: 9pt;">141 Chiến Thắng, Thanh Liệt, Hà Nội • Hotline: 1900 8888</div>
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
                    <td style="font-weight: bold; color: #059669;">${formatCurrency(price)}</td>
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
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
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
            <div class="hospital-sub">141 Chiến Thắng, Thanh Liệt, Hà Nội • 1900 8888</div>
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
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
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
                        <div style="font-size: 10pt;">SỞ Y TẾ TP. HÀ NỘI</div>
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
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
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
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

