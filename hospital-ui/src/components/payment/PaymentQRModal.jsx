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
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DownloadIcon from "@mui/icons-material/Download";
import SyncIcon from "@mui/icons-material/Sync";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { QRCodeCanvas } from "qrcode.react";
import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency } from "../../utils/formatters";

export default function PaymentQRModal({ open, onClose, paymentData, onSuccess }) {
    const [copiedField, setCopiedField] = useState(null);
    const [status, setStatus] = useState("PENDING");
    const [confirming, setConfirming] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [imgError, setImgError] = useState(false);
    const qrCanvasRef = useRef(null);

    const txnRef = paymentData?.txnRef;

    useEffect(() => {
        if (!open) return;
        setImgError(false);
        if (!txnRef) return;
        setStatus("PENDING");

        // Polling check transaction status every 2.5s
        const interval = setInterval(async () => {
            try {
                const res = await axiosInstance.get(`/api/payment/status/${txnRef}`);
                const data = res?.data?.data || res?.data || res;
                if (data && data.status === "SUCCESS") {
                    setStatus("SUCCESS");
                    clearInterval(interval);
                    if (onSuccess) {
                        setTimeout(() => onSuccess(data), 1200);
                    }
                }
            } catch (e) {
                // Keep polling
            }
        }, 2500);

        return () => clearInterval(interval);
    }, [open, txnRef, paymentData]);

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
        if (isImageUrl && !imgError) {
            const link = document.createElement("a");
            link.href = qrImageUrl;
            link.download = `VietQR-${txnRef || "payment"}.png`;
            link.target = "_blank";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // Đồng bộ trực tiếp từ cổng PayOS
    const handleSyncPayOS = async () => {
        if (!paymentData?.orderCode) return;
        setSyncing(true);
        try {
            const res = await axiosInstance.post(`/api/payment/payos/sync/${paymentData.orderCode}`);
            const data = res?.data?.data || res?.data || res;
            if (data && data.status === "SUCCESS") {
                setStatus("SUCCESS");
                if (onSuccess) {
                    setTimeout(() => onSuccess(data), 800);
                }
            } else {
                alert("PayOS báo giao dịch chưa hoàn tất hoặc đang chờ ngân hàng ghi có.");
            }
        } catch (err) {
            alert(err.message || "Lỗi đồng bộ giao dịch từ PayOS");
        } finally {
            setSyncing(false);
        }
    };

    // Nút xác nhận thanh toán đã hoàn tất
    const handleConfirmSimulated = async () => {
        if (!txnRef) return;
        setConfirming(true);
        try {
            const res = await axiosInstance.post(`/api/payment/confirm/${txnRef}?method=VIETQR`);
            const data = res?.data?.data || res?.data || res;
            setStatus("SUCCESS");
            if (onSuccess) {
                setTimeout(() => onSuccess(data), 800);
            }
        } catch (err) {
            alert(err.message || "Xác nhận thanh toán thất bại");
        } finally {
            setConfirming(false);
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
    const emvCoPayload = rawQrCode || (!isImageUrl ? qrImageUrl : null);

    // Giá trị QR code hợp lệ để hiển thị
    const effectiveQrValue = emvCoPayload || (isImageUrl ? qrImageUrl : (paymentData.paymentUrl || `PAY:${txnRef}:${paymentData.amount}`));

    // Số tài khoản sạch không chứa dấu cách để copy chính xác vào App ngân hàng
    const displayAccountNo = paymentData.bankAccountNo || "0987654321";
    const cleanAccountNo = displayAccountNo.replace(/\s+/g, "");

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
                                    ) : (
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

                                    <Button
                                        size="small"
                                        variant="text"
                                        startIcon={<DownloadIcon />}
                                        onClick={handleDownloadQR}
                                        sx={{ fontSize: "0.75rem", textTransform: "none", fontWeight: 700 }}
                                    >
                                        Tải ảnh QR về máy
                                    </Button>

                                    {paymentData?.paymentUrl && (
                                        <Button
                                            variant="contained"
                                            size="small"
                                            component="a"
                                            href={paymentData.paymentUrl}
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
                                                {paymentData.bankName || "MBBank - Ngân hàng TMCP Quân Đội"}
                                            </Typography>
                                        </Box>

                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Chủ tài khoản:</Typography>
                                            <Typography variant="body2" fontWeight="bold" color="#0F172A">
                                                {paymentData.accountHolder || "BENH VIEN DA KHOA QUOC TE TNT"}
                                            </Typography>
                                        </Box>

                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Số tài khoản:</Typography>
                                                <Typography variant="body1" fontWeight="900" color="primary.main" fontFamily="monospace">
                                                    {displayAccountNo}
                                                </Typography>
                                            </Box>
                                            <Tooltip title={copiedField === "account" ? "Đã copy!" : "Copy số TK"}>
                                                <IconButton size="small" onClick={() => handleCopy(cleanAccountNo, "account")}>
                                                    {copiedField === "account" ? <CheckCircleIcon color="success" fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                                                </IconButton>
                                            </Tooltip>
                                        </Box>

                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Số tiền chuyển:</Typography>
                                                <Typography variant="h6" fontWeight="900" color="error.main">
                                                    {formatCurrency(paymentData.amount)}
                                                </Typography>
                                            </Box>
                                            <Tooltip title={copiedField === "amount" ? "Đã copy!" : "Copy số tiền"}>
                                                <IconButton size="small" onClick={() => handleCopy(String(paymentData.amount), "amount")}>
                                                    {copiedField === "amount" ? <CheckCircleIcon color="success" fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                                                </IconButton>
                                            </Tooltip>
                                        </Box>

                                        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ bgcolor: "#FEF3C7", p: 1, borderRadius: 2 }}>
                                            <Box>
                                                <Typography variant="caption" color="#92400E" fontWeight="bold">Nội dung chuyển khoản (Bắt buộc):</Typography>
                                                <Typography variant="body2" fontWeight="900" color="#78350F" fontFamily="monospace">
                                                    {paymentData.transferContent || txnRef}
                                                </Typography>
                                            </Box>
                                            <Tooltip title={copiedField === "content" ? "Đã copy!" : "Copy nội dung"}>
                                                <IconButton size="small" onClick={() => handleCopy(paymentData.transferContent || txnRef, "content")}>
                                                    {copiedField === "content" ? <CheckCircleIcon color="success" fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                                                </IconButton>
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
                        <Button
                            variant="outlined"
                            color="success"
                            size="small"
                            disabled={confirming}
                            startIcon={<DoneAllIcon />}
                            onClick={handleConfirmSimulated}
                            sx={{ textTransform: "none", fontWeight: "bold" }}
                        >
                            {confirming ? "Đang kiểm tra..." : "Tôi đã chuyển khoản xong"}
                        </Button>
                    </Box>
                )}
                <Button variant="contained" color="inherit" onClick={onClose} sx={{ fontWeight: "bold" }}>
                    Đóng
                </Button>
            </DialogActions>
        </Dialog>
    );
}
