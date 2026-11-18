import React, { useState, useEffect, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    Button,
    Grid,
    Paper,
    Chip,
    CircularProgress,
    IconButton,
    Tooltip,
    Stack
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import DownloadIcon from "@mui/icons-material/Download";
import SyncIcon from "@mui/icons-material/Sync";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { QRCodeCanvas } from "qrcode.react";
import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency } from "../../utils/formatters";
import { getVerifiedPayment } from "../../services/bookingPayment";

export default function PaymentQRModal({ open, onClose, paymentData, onSuccess }) {
    const [copiedField, setCopiedField] = useState(null);
    const [status, setStatus] = useState("PENDING");
    const [syncing, setSyncing] = useState(false);
    const [imgError, setImgError] = useState(false);
    const qrCanvasRef = useRef(null);

    const txnRef = paymentData?.txnRef;
    const orderCode = paymentData?.orderCode;
    const verificationRef = useRef(null);
    const onSuccessRef = useRef(onSuccess);
    onSuccessRef.current = onSuccess;

    useEffect(() => {
        setStatus("PENDING");
        setSyncing(false);
        setImgError(false);
        if (!open || !orderCode) return;

        const session = { cancelled: false, checking: false, completed: false, notification: null };
        let interval;
        const checkLocalStatus = async () => {
            if (session.cancelled || session.checking || session.completed) return null;
            session.checking = true;
            try {
                const effectiveRef = txnRef || ("TNT" + orderCode);
                const res = await axiosInstance.get(`/api/payment/status/${effectiveRef}`);
                const data = res?.data?.data || res?.data || res;
                if (session.cancelled || !data) return null;
                if (data.status === "SUCCESS") {
                    session.completed = true;
                    setStatus("SUCCESS");
                    clearInterval(interval);
                    session.notification = setTimeout(() => {
                        if (!session.cancelled) onSuccessRef.current?.(data);
                    }, 800);
                    return data;
                }
                return null;
            } catch (e) {
                // Polling thầm lặng trạng thái local DB
                return null;
            } finally {
                session.checking = false;
            }
        };
        verificationRef.current = checkLocalStatus;
        interval = setInterval(() => { checkLocalStatus().catch(() => {}); }, 2500);

        return () => {
            session.cancelled = true;
            clearInterval(interval);
            clearTimeout(session.notification);
            if (verificationRef.current === checkLocalStatus) verificationRef.current = null;
        };
    }, [open, txnRef, orderCode]);

    const handleCopy = (text, fieldName) => {
        if (!text) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(() => {});
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand("copy");
            } catch (e) {
                // Ignore copy failure
            }
            document.body.removeChild(textArea);
        }
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleDownloadQR = () => {
        if (!hasValidQr) return;
        // Ưu tiên 1: Tải trực tiếp file ảnh PNG độ nét cao từ QRCodeCanvas
        const canvas = qrCanvasRef.current || document.getElementById("vietqr-canvas");
        if (canvas) {
            try {
                const pngUrl = canvas.toDataURL("image/png");
                const link = document.createElement("a");
                link.href = pngUrl;
                link.download = `VietQR-${txnRef || "payment"}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                return;
            } catch (e) {
                console.error("Lỗi xuất ảnh từ canvas:", e);
            }
        }

        // Ưu tiên 2: Tải từ URL nếu là link ảnh HTTP hợp lệ
        if (isImageUrl && !imgError && qrImageUrl) {
            const link = document.createElement("a");
            link.href = qrImageUrl;
            link.download = `VietQR-${txnRef || "payment"}.png`;
            link.target = "_blank";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // Bấm nút "Đồng bộ ngay": Chủ động gọi API PayOS đối soát đơn hàng
    const handleSyncPayOS = async () => {
        if (!orderCode) return;
        setSyncing(true);
        try {
            const data = await getVerifiedPayment(axiosInstance, { orderCode });
            if (data?.status === "SUCCESS") {
                setStatus("SUCCESS");
                setTimeout(() => {
                    onSuccessRef.current?.(data);
                }, 600);
            } else {
                alert("PayOS chưa xác nhận thanh toán cho đúng đơn hàng này. Vui lòng chờ ngân hàng ghi có hoặc bấm lại sau vài giây.");
            }
        } catch (err) {
            alert(err?.response?.data?.message || err.message || "Lỗi đồng bộ giao dịch từ PayOS");
        } finally {
            setSyncing(false);
        }
    };

    if (!paymentData) return null;

    const rawQrCode = paymentData?.qrCode;
    const qrImageUrl = paymentData?.qrImageUrl;

    // Kiểm tra xem qrImageUrl có phải là URL HTTP(S) trỏ đến file ảnh hay không
    const isImageUrl = Boolean(
        qrImageUrl &&
        (qrImageUrl.startsWith("http://") ||
         qrImageUrl.startsWith("https://") ||
         qrImageUrl.startsWith("data:image/"))
    );

    // Chuỗi mã hóa VietQR EMVCo (nếu backend trả về raw string trong qrCode hoặc qrImageUrl)
    const emvCoPayload = (rawQrCode && String(rawQrCode).trim()) || (!isImageUrl && qrImageUrl && String(qrImageUrl).trim() ? String(qrImageUrl).trim() : null);

    // Payment URL hợp lệ từ provider (chỉ chấp nhận http:// hoặc https://)
    const rawPaymentUrl = paymentData?.paymentUrl || paymentData?.checkoutUrl;
    const validPaymentUrl = (rawPaymentUrl && (rawPaymentUrl.startsWith("http://") || rawPaymentUrl.startsWith("https://")))
        ? rawPaymentUrl
        : null;

    // Giá trị QR code hợp lệ từ provider để hiển thị trên QRCodeCanvas (nếu có chuỗi EMVCo hoặc URL thanh toán hợp lệ)
    const effectiveQrValue = emvCoPayload || validPaymentUrl || null;

    // Kiểm tra tính hợp lệ toàn diện của mã QR từ provider: không dùng fake fallback PAY:${txnRef}:${amount}
    const hasValidQr = Boolean(
        emvCoPayload ||
        (isImageUrl && !imgError) ||
        validPaymentUrl
    );

    // Kiểm tra số tiền hợp lệ (từ chối null, undefined, rỗng, NaN, Infinity, âm; giữ số 0 hợp lệ)
    const rawAmount = paymentData?.amount;
    const hasValidAmount = Boolean(
        rawAmount != null &&
        (typeof rawAmount === "number"
            ? Number.isFinite(rawAmount) && rawAmount >= 0
            : (typeof rawAmount === "string" && rawAmount.trim() !== "" && Number.isFinite(Number(rawAmount.trim())) && Number(rawAmount.trim()) >= 0))
    );

    // Nội dung chuyển khoản hợp lệ
    const cleanTransferContent = (paymentData?.transferContent && String(paymentData.transferContent).trim()) || (txnRef && String(txnRef).trim()) || "";

    // Số tài khoản sạch không chứa dấu cách để copy chính xác vào App ngân hàng
    const displayAccountNo = paymentData?.bankAccountNo || "---";
    const cleanAccountNo = displayAccountNo !== "---" ? displayAccountNo.replace(/\s+/g, "") : "";

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4, overflow: "hidden" } }}>
            {/* Modal Header */}
            <Box
                sx={{
                    p: 2.5,
                    bgcolor: "#005BAA",
                    color: "white",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}
            >
                <Box display="flex" alignItems="center" gap={1.5}>
                    <AccountBalanceIcon sx={{ fontSize: 32 }} />
                    <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="h6" fontWeight="900" lineHeight={1.2}>
                                Cổng Thanh Toán PayOS (VietQR)
                            </Typography>
                            <Chip
                                label="Napas 247"
                                size="small"
                                sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white", fontWeight: "bold", height: 20, fontSize: "0.68rem" }}
                            />
                        </Box>
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                            Chuyển khoản liên ngân hàng 24/7 tức thời • Khớp lệnh tự động
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} sx={{ color: "white" }}>
                    <CloseIcon />
                </IconButton>
            </Box>

            <DialogContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: "#F8FAFC" }}>
                {status === "SUCCESS" ? (
                    <Box textAlign="center" py={4}>
                        <CheckCircleIcon sx={{ fontSize: 76, color: "#10B981", mb: 2 }} />
                        <Typography variant="h5" fontWeight="900" color="#0F172A" gutterBottom>
                            THANH TOÁN THÀNH CÔNG!
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={2}>
                            Hệ thống đã tự động nhận diện khoản chuyển và hoàn tất giao dịch.
                        </Typography>
                        <Chip
                            label={`Mã GD: ${txnRef} • Số tiền: ${formatCurrency(paymentData.amount)}`}
                            color="success"
                            variant="outlined"
                            sx={{ fontWeight: "bold", fontSize: "0.9rem", py: 1.5 }}
                        />
                    </Box>
                ) : (
                    <Box>
                        {/* 3 Steps Guide Bar */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 1.5,
                                mb: 2.5,
                                borderRadius: 2,
                                bgcolor: "#EFF6FF",
                                border: "1px dashed #93C5FD",
                                display: "flex",
                                justifyItems: "center",
                                justifyContent: "space-around",
                                flexWrap: "wrap",
                                gap: 1
                            }}
                        >
                            <Typography variant="caption" sx={{ color: "#1E40AF", fontWeight: 700 }}>
                                1️⃣ Mở App Ngân hàng bất kỳ
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#1E40AF", fontWeight: 700 }}>
                                2️⃣ Quét mã QR thanh toán
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#1E40AF", fontWeight: 700 }}>
                                3️⃣ Bấm chuyển (Tự khớp sau 2s)
                            </Typography>
                        </Paper>

                        <Grid container spacing={2.5} alignItems="center">
                            {/* Cột QR Code */}
                            <Grid item xs={12} sm={6} textAlign="center">
                                <Paper
                                    elevation={3}
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 3,
                                        bgcolor: "white",
                                        display: "inline-flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        border: "2px solid #005BAA",
                                        minWidth: 216,
                                        minHeight: 216
                                    }}
                                >
                                    {isImageUrl && !imgError && !emvCoPayload ? (
                                        <Box
                                            component="img"
                                            src={qrImageUrl}
                                            alt="VietQR Payment"
                                            onError={() => setImgError(true)}
                                            sx={{
                                                width: 200,
                                                height: 200,
                                                display: "block",
                                                borderRadius: 2,
                                                objectFit: "contain"
                                            }}
                                        />
                                    ) : effectiveQrValue ? (
                                        <Box display="flex" flexDirection="column" alignItems="center" p={0.5}>
                                            <QRCodeCanvas
                                                id="vietqr-canvas"
                                                ref={qrCanvasRef}
                                                value={effectiveQrValue}
                                                size={188}
                                                level="M"
                                                marginSize={2}
                                            />
                                            <Box display="flex" alignItems="center" gap={0.5} mt={0.8}>
                                                <Chip
                                                    label="VietQR • Napas 247"
                                                    size="small"
                                                    sx={{
                                                        height: 20,
                                                        fontSize: "0.68rem",
                                                        fontWeight: 800,
                                                        bgcolor: "#EFF6FF",
                                                        color: "#005BAA",
                                                        border: "1px solid #BFDBFE"
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                    ) : (
                                        <Box
                                            display="flex"
                                            flexDirection="column"
                                            alignItems="center"
                                            justifyContent="center"
                                            p={2}
                                            sx={{ minWidth: 188, minHeight: 188, color: "text.secondary" }}
                                            data-testid="qr-missing-state"
                                        >
                                            <Typography variant="body2" fontWeight="bold" color="error.main" textAlign="center">
                                                Chưa có mã QR thanh toán từ cổng thanh toán
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" textAlign="center" mt={0.5}>
                                                Nhà cung cấp chưa trả dữ liệu QR hợp lệ. Vui lòng thử đồng bộ lại hoặc chuyển khoản thủ công.
                                            </Typography>
                                        </Box>
                                    )}
                                </Paper>

                                <Box mt={1.5} display="flex" flexDirection="column" alignItems="center" gap={1}>
                                    <Chip
                                        icon={<CircularProgress size={14} color="inherit" />}
                                        label="Đang chờ nhận tiền..."
                                        color="warning"
                                        size="small"
                                        sx={{ fontWeight: "bold" }}
                                    />

                                    <Tooltip title={!hasValidQr ? "Chưa có dữ liệu QR để tải về" : ""}>
                                        <span>
                                            <Button
                                                size="small"
                                                variant="text"
                                                startIcon={<DownloadIcon />}
                                                onClick={handleDownloadQR}
                                                disabled={!hasValidQr}
                                                sx={{ fontSize: "0.75rem", textTransform: "none", fontWeight: 700 }}
                                            >
                                                Tải ảnh QR về máy
                                            </Button>
                                        </span>
                                    </Tooltip>

                                    {validPaymentUrl && (
                                        <Button
                                            variant="contained"
                                            size="small"
                                            component="a"
                                            href={validPaymentUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            startIcon={<OpenInNewIcon />}
                                            sx={{
                                                bgcolor: "#0284C7",
                                                "&:hover": { bgcolor: "#0369A1" },
                                                borderRadius: 2,
                                                fontWeight: "bold",
                                                fontSize: "0.8rem",
                                                textTransform: "none",
                                                boxShadow: "0 2px 8px rgba(2, 132, 199, 0.3)",
                                                mt: 0.5
                                            }}
                                        >
                                            Mở Cổng Thanh Toán PayOS
                                        </Button>
                                    )}
                                </Box>
                            </Grid>

                            {/* Cột Thông tin chuyển khoản */}
                            <Grid item xs={12} sm={6}>
                                <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: "white", border: "1px solid #E2E8F0" }}>
                                    <Stack spacing={1.2}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Ngân hàng thụ hưởng:</Typography>
                                            <Typography variant="body2" fontWeight="bold" color="#0F172A">
                                                {paymentData.bankName || "Chưa có dữ liệu"}
                                            </Typography>
                                        </Box>

                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Chủ tài khoản:</Typography>
                                            <Typography variant="body2" fontWeight="bold" color="#0F172A">
                                                {paymentData.accountHolder || "Chưa có dữ liệu"}
                                            </Typography>
                                        </Box>

                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Số tài khoản:</Typography>
                                                <Typography variant="body1" fontWeight="900" color="primary.main" fontFamily="monospace">
                                                    {displayAccountNo}
                                                </Typography>
                                            </Box>
                                            <Tooltip title={!cleanAccountNo ? "Chưa có dữ liệu để copy" : (copiedField === "account" ? "Đã copy!" : "Copy số TK")}>
                                                <span>
                                                    <IconButton size="small" disabled={!cleanAccountNo} onClick={() => cleanAccountNo && handleCopy(cleanAccountNo, "account")}>
                                                        {copiedField === "account" ? <CheckCircleIcon color="success" fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Box>

                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Số tiền chuyển:</Typography>
                                                <Typography variant="h6" fontWeight="900" color="error.main">
                                                    {hasValidAmount ? formatCurrency(paymentData.amount) : "Chưa có dữ liệu"}
                                                </Typography>
                                            </Box>
                                            <Tooltip title={!hasValidAmount ? "Chưa có số tiền hợp lệ để copy" : (copiedField === "amount" ? "Đã copy!" : "Copy số tiền")}>
                                                <span>
                                                    <IconButton size="small" disabled={!hasValidAmount} onClick={() => hasValidAmount && handleCopy(String(paymentData.amount), "amount")}>
                                                        {copiedField === "amount" ? <CheckCircleIcon color="success" fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Box>

                                        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ bgcolor: "#FEF3C7", p: 1, borderRadius: 2 }}>
                                            <Box>
                                                <Typography variant="caption" color="#92400E" fontWeight="bold">Nội dung chuyển khoản (Bắt buộc):</Typography>
                                                <Typography variant="body2" fontWeight="900" color="#78350F" fontFamily="monospace">
                                                    {cleanTransferContent || "Chưa có dữ liệu"}
                                                </Typography>
                                            </Box>
                                            <Tooltip title={!cleanTransferContent ? "Chưa có nội dung chuyển khoản để copy" : (copiedField === "content" ? "Đã copy!" : "Copy nội dung")}>
                                                <span>
                                                    <IconButton size="small" disabled={!cleanTransferContent} onClick={() => cleanTransferContent && handleCopy(cleanTransferContent, "content")}>
                                                        {copiedField === "content" ? <CheckCircleIcon color="success" fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Box>
                                    </Stack>
                                </Paper>
                            </Grid>
                        </Grid>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2, bgcolor: "#F1F5F9", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                {status !== "SUCCESS" && (
                    <Box display="flex" gap={1} flexWrap="wrap">
                        {paymentData?.orderCode && (
                            <Button
                                variant="outlined"
                                color="primary"
                                size="small"
                                disabled={syncing}
                                startIcon={syncing ? <CircularProgress size={14} /> : <SyncIcon />}
                                onClick={handleSyncPayOS}
                                sx={{ textTransform: "none", fontWeight: "bold" }}
                            >
                                {syncing ? "Đang đồng bộ..." : "Đồng bộ từ PayOS"}
                            </Button>
                        )}

                    </Box>
                )}
                <Button variant="contained" color="inherit" onClick={onClose} sx={{ fontWeight: "bold" }}>
                    Đóng
                </Button>
            </DialogActions>
        </Dialog>
    );
}
