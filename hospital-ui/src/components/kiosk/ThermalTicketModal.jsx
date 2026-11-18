import React, { useRef, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Chip
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarsIcon from '@mui/icons-material/Stars';
import CloseIcon from '@mui/icons-material/Close';
import { QRCodeSVG } from 'qrcode.react';
import { BarcodeView } from '../../utils/barcodeGenerator';

export default function ThermalTicketModal({ open, onClose, ticketData, autoResetSeconds = 6 }) {
  const [countdown, setCountdown] = useState(autoResetSeconds);
  const printRef = useRef();

  useEffect(() => {
    let timer;
    if (open) {
      setCountdown(autoResetSeconds);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [open, onClose, autoResetSeconds]);

  if (!ticketData) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=380,height=600');
    if (!printWindow) {
      alert("Vui lòng cho phép mở cửa sổ popup để in phiếu!");
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>In Phiếu Khám - ${ticketData.bookingCode || 'TICKET'}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              width: 78mm;
              margin: 0 auto;
              padding: 10px 6px;
              color: #000;
              font-size: 13px;
              text-align: center;
              line-height: 1.35;
            }
            .hospital-title {
              font-size: 14px;
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            .hospital-sub {
              font-size: 11px;
              color: #333;
              margin-bottom: 8px;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 8px 0;
            }
            .ticket-title {
              font-size: 13px;
              font-weight: bold;
              margin-bottom: 4px;
              text-transform: uppercase;
            }
            .priority-banner {
              background-color: #000;
              color: #fff;
              font-weight: bold;
              padding: 4px 6px;
              font-size: 13px;
              border-radius: 4px;
              margin: 6px 0;
              text-transform: uppercase;
            }
            .stt-label {
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .stt-number {
              font-size: 42px;
              font-weight: 900;
              line-height: 1.1;
              margin: 4px 0;
            }
            .info-table {
              width: 100%;
              text-align: left;
              font-size: 12px;
              margin: 8px 0;
            }
            .info-table td {
              padding: 2px 0;
              vertical-align: top;
            }
            .info-label {
              width: 38%;
              color: #333;
            }
            .info-value {
              font-weight: 600;
              width: 62%;
            }
            .qr-wrapper {
              margin: 10px 0 4px;
            }
            .footer-note {
              font-size: 10.5px;
              font-style: italic;
              margin-top: 6px;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
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
  };

  const isPriority = ticketData.isPriority || ticketData.priority;
  const queueCode = ticketData.ticketCode || ticketData.formattedQueueNumber || ticketData.queueCode || (ticketData.queueNumber != null ? `#${ticketData.queueNumber}` : (ticketData.bookingCode || '---'));
  const rawTrackingCode = ticketData.bookingCode || ticketData.ticketCode || (ticketData.queueNumber != null ? String(ticketData.queueNumber) : null);
  const trackingUrl = rawTrackingCode
    ? `${typeof window !== 'undefined' && window.location?.origin ? window.location.origin : ''}/queue-display?code=${encodeURIComponent(rawTrackingCode)}`
    : null;
  const rawBarcodeValue = ticketData.bookingCode || ticketData.ticketCode || (ticketData.queueNumber != null ? String(ticketData.queueNumber) : null);

  return (
    <Dialog open={open} onClose={onClose} disablePortal maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
      <DialogContent sx={{ p: { xs: 1.5, sm: 2 } }}>
        {/* Box chứa phiếu nhiệt 80mm mô phỏng */}
        <Box
          ref={printRef}
          sx={{
            bgcolor: '#ffffff',
            border: '2px solid #e0e0e0',
            borderRadius: 2,
            p: 2.5,
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            color: '#1a1a1a'
          }}
        >
          {/* Header Bệnh Viện */}
          <Typography className="hospital-title" sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#0d47a1', textTransform: 'uppercase' }}>
            TNT HOSPITAL
          </Typography>
          <Typography className="hospital-sub" sx={{ fontSize: '0.75rem', color: '#666', mb: 1 }}>
            Đ/c: số 114 Nguyễn Khuyến, phường Văn Quán, quận Hà Đông, Hà Nội | Hotline: 1900 8888
          </Typography>

          <Box className="divider" sx={{ borderTop: '1px dashed #bbb', my: 1 }} />

          <Typography className="ticket-title" sx={{ fontWeight: 700, fontSize: '0.9rem', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            PHIẾU KHÁM BỆNH TỰ ĐỘNG
          </Typography>

          {/* Banner Đã Thanh Toán hoặc Ưu Tiên */}
          {ticketData.isPaid && (
            <Box
              className="paid-banner"
              sx={{
                bgcolor: '#059669',
                color: '#fff',
                fontWeight: 800,
                py: 0.6,
                px: 1.2,
                borderRadius: 1,
                my: 0.8,
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.6
              }}
            >
              <CheckCircleIcon fontSize="small" />
              ĐÃ NỘP VIỆN PHÍ - VÀO THẲNG BUỒNG KHÁM
            </Box>
          )}

          {/* Banner Ưu Tiên nếu có */}
          {isPriority && (
            <Box
              className="priority-banner"
              sx={{
                bgcolor: '#d32f2f',
                color: '#fff',
                fontWeight: 800,
                py: 0.6,
                px: 1,
                borderRadius: 1,
                my: 0.8,
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              <StarsIcon fontSize="small" />
              ĐỐI TƯỢNG ƯU TIÊN {ticketData.priorityReason ? `(${ticketData.priorityReason})` : ''}
            </Box>
          )}

          {/* Số Thứ Tự Lớn */}
          <Box sx={{ my: 1.5 }}>
            <Typography className="stt-label" sx={{ fontSize: '0.8rem', color: '#555', fontWeight: 600 }}>
              {ticketData.isPaid ? 'SỐ THỨ TỰ KHÁM' : (ticketData.counterName ? 'SỐ THỨ TỰ TẠI QUẦY' : 'SỐ THỨ TỰ')}
            </Typography>
            <Typography
              className="stt-number"
              sx={{
                fontSize: '3rem',
                fontWeight: 900,
                color: isPriority ? '#d32f2f' : '#1976d2',
                letterSpacing: 2,
                lineHeight: 1.1
              }}
            >
              {queueCode}
            </Typography>
          </Box>

          <Box className="divider" sx={{ borderTop: '1px dashed #bbb', my: 1 }} />

          {/* Bảng Chi Tiết Thông Tin */}
          <Box component="table" className="info-table" sx={{ width: '100%', textAlign: 'left', fontSize: '0.85rem', my: 1 }}>
            <tbody>
              <tr>
                <td className="info-label" style={{ color: '#666', padding: '3px 0', width: '38%' }}>Bệnh nhân:</td>
                <td className="info-value" style={{ fontWeight: 700, textTransform: 'uppercase' }}>
                  {ticketData.patientName || ticketData.patientProfileName || 'Bệnh nhân'}
                </td>
              </tr>
              <tr>
                <td className="info-label" style={{ color: '#666', padding: '3px 0' }}>Số điện thoại:</td>
                <td className="info-value" style={{ fontWeight: 600 }}>
                  {ticketData.patientPhone || ticketData.phoneNumber || '---'}
                </td>
              </tr>
              {ticketData.isPaid ? (
                <tr style={{ backgroundColor: '#ecfdf5' }}>
                  <td className="info-label" style={{ color: '#065f46', padding: '4px 2px', fontWeight: 700, width: '38%' }}>Trạng thái:</td>
                  <td className="info-value" style={{ fontWeight: 800, color: '#047857', padding: '4px 2px', fontSize: '0.92rem' }}>
                    ĐÃ THANH TOÁN - VÀO THẲNG PHÒNG
                  </td>
                </tr>
              ) : ticketData.counterName ? (
                <tr style={{ backgroundColor: '#f0f7ff' }}>
                  <td className="info-label" style={{ color: '#0d47a1', padding: '4px 2px', fontWeight: 700, width: '38%' }}>Quầy tiếp đón:</td>
                  <td className="info-value" style={{ fontWeight: 800, color: '#0d47a1', padding: '4px 2px', fontSize: '0.92rem' }}>
                    {ticketData.counterName} {ticketData.counterLocation ? `(${ticketData.counterLocation})` : ''}
                  </td>
                </tr>
              ) : null}
              {(!ticketData.isPaid && ticketData.waitingBefore !== undefined && ticketData.waitingBefore !== null) && (
                <tr>
                  <td className="info-label" style={{ color: '#666', padding: '3px 0' }}>Đang chờ trước:</td>
                  <td className="info-value" style={{ fontWeight: 700, color: '#e65100' }}>
                    {ticketData.waitingBefore === 0 ? 'Mời vào quầy làm thủ tục ngay' : `${ticketData.waitingBefore} người`}
                  </td>
                </tr>
              )}
              <tr>
                <td className="info-label" style={{ color: '#666', padding: '3px 0' }}>Chuyên khoa:</td>
                <td className="info-value" style={{ fontWeight: 700, color: '#0d47a1' }}>
                  {ticketData.departmentName || 'Chưa có thông tin khoa'}
                </td>
              </tr>
              {ticketData.doctorName && (
                <tr>
                  <td className="info-label" style={{ color: '#666', padding: '3px 0' }}>Bác sĩ phụ trách:</td>
                  <td className="info-value" style={{ fontWeight: 600 }}>
                    {ticketData.doctorName}
                  </td>
                </tr>
              )}
              {(ticketData.roomNumber || ticketData.roomName) && (
                <tr>
                  <td className="info-label" style={{ color: '#666', padding: '3px 0' }}>Phòng khám:</td>
                  <td className="info-value" style={{ fontWeight: 800, color: '#d32f2f' }}>
                    {ticketData.roomNumber ? `P.${ticketData.roomNumber} ` : ''}{ticketData.roomName ? `(${ticketData.roomName})` : ''}
                  </td>
                </tr>
              )}
              <tr>
                <td className="info-label" style={{ color: '#666', padding: '3px 0' }}>Mã phiếu:</td>
                <td className="info-value" style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.9rem' }}>
                  {ticketData.bookingCode || ticketData.ticketCode || '---'}
                </td>
              </tr>
              <tr>
                <td className="info-label" style={{ color: '#666', padding: '3px 0' }}>Giờ in phiếu:</td>
                <td className="info-value" style={{ fontWeight: 500, fontSize: '0.8rem', color: '#555' }}>
                  {new Date().toLocaleTimeString('vi-VN')} - {new Date().toLocaleDateString('vi-VN')}
                </td>
              </tr>
            </tbody>
          </Box>

          <Box className="divider" sx={{ borderTop: '1px dashed #bbb', my: 1 }} />

          {/* Mã vạch Barcode Check-in tự động trước cửa phòng Bác sĩ / Xét nghiệm */}
          <Box className="barcode-wrapper" sx={{ my: 1, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#111', mb: 0.5, letterSpacing: 0.5 }}>
              MÃ VẠCH CHECK-IN TỰ ĐỘNG
            </Typography>
            {rawBarcodeValue ? (
              <>
                <BarcodeView value={rawBarcodeValue} height={42} moduleWidth={1.8} showText={true} />
                <Typography sx={{ fontSize: '0.7rem', color: '#555', mt: 0.5, fontStyle: 'italic' }}>
                  Quét mã vạch tại đầu đọc trước cửa phòng để check-in có mặt
                </Typography>
              </>
            ) : (
              <Typography sx={{ fontSize: '0.75rem', color: '#888', my: 1, fontStyle: 'italic' }}>
                (Chưa có mã vạch check-in)
              </Typography>
            )}
          </Box>

          <Box className="divider" sx={{ borderTop: '1px dashed #bbb', my: 1 }} />

          {/* QR Code tra cứu trên điện thoại */}
          <Box className="qr-wrapper" sx={{ my: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {trackingUrl ? (
              <>
                <QRCodeSVG value={trackingUrl} size={80} level="M" includeMargin={false} />
                <Typography sx={{ fontSize: '0.7rem', color: '#666', mt: 0.5 }}>
                  Quét QR trên điện thoại để theo dõi tiến độ lượt khám
                </Typography>
              </>
            ) : (
              <Typography sx={{ fontSize: '0.75rem', color: '#888', my: 1, fontStyle: 'italic' }}>
                (Chưa có mã tra cứu trực tuyến)
              </Typography>
            )}
          </Box>

          <Box className="divider" sx={{ borderTop: '1px dashed #bbb', my: 1 }} />

          {/* Lời dặn */}
          <Typography className="footer-note" sx={{ fontSize: '0.72rem', fontStyle: 'italic', color: '#555' }}>
            Quý khách vui lòng ngồi chờ tại sảnh và chú ý theo dõi màn hình hiển thị hoặc âm thanh gọi số. Xin cảm ơn!
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 2, justifyContent: 'space-between' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          Tự động đóng sau <strong style={{ color: '#d32f2f' }}>{countdown}s</strong>
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" color="inherit" onClick={onClose} startIcon={<CloseIcon />}>
            Đóng
          </Button>
          <Button variant="contained" color="primary" onClick={handlePrint} startIcon={<PrintIcon />} sx={{ px: 3, fontWeight: 700 }}>
            In Phiếu
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
