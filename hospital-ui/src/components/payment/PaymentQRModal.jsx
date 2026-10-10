import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
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
    Alert,
    Tooltip,
    Divider,
    Stack
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import CloseIcon from "@mui/icons-material/Close";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DownloadIcon from "@mui/icons-material/Download";
import SecurityIcon from "@mui/icons-material/Security";
import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency } from "../../utils/formatters";

export default function PaymentQRModal({ open, onClose, paymentData, onSuccess }) {
    const [copiedField, setCopiedField] = useState(null);
    const [status, setStatus] = useState("PENDING");
    const [confirming, setConfirming] = useState(false);

    const txnRef = paymentData?.txnRef;
    const isVietQR = paymentData?.paymentMethod === "VIETQR" || !paymentData?.paymentMethod;
    const isMoMo = paymentData?.paymentMethod === "MOMO";

    useEffect(() => {
        if (!open || !txnRef) return;
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
    }, [open, txnRef]);

    const handleCopy = (text, fieldName) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleDownloadQR = () => {
        if (!paymentData?.qrImageUrl) return;
        const link = document.createElement("a");
        link.href = paymentData.qrImageUrl;
        link.download = `VietQR-${txnRef}.png`;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Nút xác nhận thanh toán đã hoàn tất
    const handleConfirmSimulated = async () => {
        if (!txnRef) return;
        setConfirming(true);
        try {
            const method = isMoMo ? "MOMO" : "VIETQR";
            const res = await axiosInstance.post(`/api/payment/confirm/${txnRef}?method=${method}`);
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

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4, overflow: "hidden" } }}>
            {/* Modal Header */}
            <Box
                sx={{
                    p: 2.5,
                    bgcolor: isMoMo ? "#A50064" : "#005BAA",
                    color: "white",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}
            >
                <Box display="flex" alignItems="center" gap={1.5}>
                    {isMoMo ? <PhoneAndroidIcon sx={{ fontSize: 30 }} /> : <AccountBalanceIcon sx={{ fontSize: 30 }} />}
                    <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="h6" fontWeight="900" lineHeight={1.2}>
                                {isMoMo ? "Thanh Toán Ví MoMo" : "Thanh Toán VietQR / PayOS"}
                            </Typography>
                            <Chip
                                label="Napas 247"
                                size="small"
                                sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white", fontWeight: "bold", height: 20, fontSize: "0.68rem" }}
                            />
                        </Box>
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                            {isMoMo ? "Quét mã MoMo QR hoặc Mở App MoMo" : "Chuyển khoản liên ngân hàng 24/7 tức thời (Miễn phí 100%)"}
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
                                        display: "inline-block",
                                        border: isMoMo ? "2px solid #A50064" : "2px solid #005BAA"
                                    }}
                                >
                                    <Box
                                        component="img"
                                        src={paymentData.qrImageUrl}
                                        alt="VietQR Payment"
                                        sx={{
                                            width: 200,
                                            height: 200,
                                            display: "block",
                                            borderRadius: 2
                                        }}
                                    />
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
                                        sx={{ fontSize: "0.75rem", textTransform: "none" }}
                                    >
                                        Tải ảnh QR về máy
                                    </Button>

                                    {isMoMo && (
                                        <Button
                                            variant="contained"
                                            size="small"
                                            component="a"
                                            href={paymentData.deeplink || "https://me.momo.vn"}
                                            target="_blank"
                                            sx={{ bgcolor: "#A50064", "&:hover": { bgcolor: "#80004d" }, borderRadius: 2, fontWeight: "bold" }}
                                        >
                                            Mở App MoMo
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
                                                    {paymentData.bankAccountNo || "0987654321"}
                                                </Typography>
                                            </Box>
                                            <Tooltip title={copiedField === "account" ? "Đã copy!" : "Copy số TK"}>
                                                <IconButton size="small" onClick={() => handleCopy(paymentData.bankAccountNo || "0987654321", "account")}>
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

            <DialogActions sx={{ p: 2, bgcolor: "#F1F5F9", justifyContent: "space-between" }}>
                {status !== "SUCCESS" && (
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
                )}
                <Button variant="contained" color="inherit" onClick={onClose} sx={{ fontWeight: "bold" }}>
                    Đóng
                </Button>
            </DialogActions>
        </Dialog>
    );
}
