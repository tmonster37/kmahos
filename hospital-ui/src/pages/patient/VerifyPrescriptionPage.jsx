import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
    Box,
    Container,
    Paper,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Chip,
    Divider,
    Stack,
    Grid,
    Card,
    CardContent
} from "@mui/material";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import GppBadIcon from "@mui/icons-material/GppBad";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import SearchIcon from "@mui/icons-material/Search";
import SecurityIcon from "@mui/icons-material/Security";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import BadgeIcon from "@mui/icons-material/Badge";
import axiosInstance, { API_BASE_URL } from "../../services/AxiosInstance";

export default function VerifyPrescriptionPage() {
    const [searchParams] = useSearchParams();
    const urlCode = searchParams.get("code") || "";
    const urlHash = searchParams.get("hash") || "";

    const [prescriptionCode, setPrescriptionCode] = useState(urlCode);
    const [signatureHash, setSignatureHash] = useState(urlHash);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");

    const handleVerify = async (codeToVerify, hashToVerify) => {
        const c = codeToVerify || prescriptionCode;
        const h = hashToVerify || signatureHash;

        if (!c.trim()) {
            setErrorMsg("Vui lòng nhập mã đơn thuốc để xác thực");
            return;
        }

        setLoading(true);
        setErrorMsg("");
        setResult(null);

        try {
            const res = await axiosInstance.get(`/api/prescriptions/verify`, {
                params: { code: c.trim(), hash: h ? h.trim() : "" }
            });
            const payload = res?.data?.data || res?.data || res;
            if (payload && (payload.valid !== undefined || payload.prescriptionCode)) {
                setResult(payload);
            } else {
                setErrorMsg("Không tìm thấy thông tin đơn thuốc hoặc mã xác thực không hợp lệ");
            }
        } catch (err) {
            console.error("Lỗi xác thực đơn thuốc:", err);
            setErrorMsg(err.response?.data?.message || "Lỗi kết nối tới hệ thống xác thực bệnh viện");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (urlCode) {
            handleVerify(urlCode, urlHash);
        }
    }, [urlCode, urlHash]);

    return (
        <Box sx={{ bgcolor: "#F8FAFC", minHeight: "85vh", py: 4 }}>
            <Container maxWidth="md">
                {/* Header Banner - Apple HIG + Linear Elevated Header */}
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 2.5, md: 3 },
                        mb: 3,
                        borderRadius: 3.5,
                        bgcolor: "#FFFFFF",
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 2
                    }}
                >
                    <Box display="flex" alignItems="center" gap={2}>
                        <Box
                            sx={{
                                width: 54,
                                height: 54,
                                borderRadius: 3,
                                bgcolor: "rgba(0, 136, 214, 0.1)",
                                color: "#0088D6",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "1px solid rgba(0, 136, 214, 0.2)"
                            }}
                        >
                            <SecurityIcon sx={{ fontSize: 30 }} />
                        </Box>
                        <Box>
                            <Box display="flex" alignItems="center" gap={1.2} mb={0.5} flexWrap="wrap">
                                <Chip
                                    label="CỔNG XÁC THỰC CHỮ KÝ SỐ Y TẾ • INTEGRITY PRO"
                                    size="small"
                                    sx={{
                                        height: 22,
                                        fontSize: "0.68rem",
                                        fontWeight: 700,
                                        letterSpacing: "0.06em",
                                        bgcolor: "#EBF5FF",
                                        color: "#0088D6",
                                        borderRadius: 1.5,
                                        border: "1px solid rgba(0, 136, 214, 0.2)"
                                    }}
                                />
                                <Chip
                                    label="SHA-256 DIGITAL SIGNATURE"
                                    size="small"
                                    sx={{
                                        height: 22,
                                        fontSize: "0.68rem",
                                        fontWeight: 700,
                                        bgcolor: "rgba(16, 185, 129, 0.1)",
                                        color: "#059669",
                                        borderRadius: 1.5
                                    }}
                                />
                            </Box>
                            <Typography variant="h5" fontWeight={800} color="#0F172A" sx={{ letterSpacing: "-0.02em" }}>
                                Tra Cứu & Xác Thực Đơn Thuốc Điện Tử
                            </Typography>
                            <Typography variant="body2" color="#64748B" sx={{ mt: 0.25 }}>
                                Xác minh tính nguyên vẹn, chống làm giả đơn thuốc bằng thuật toán mật mã SHA-256 theo chuẩn Bộ Y tế.
                            </Typography>
                        </Box>
                    </Box>
                </Paper>

                {/* Form tra cứu */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 3,
                        mb: 4,
                        borderRadius: 3.5,
                        bgcolor: "#FFFFFF",
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.03)"
                    }}
                >
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={5}>
                            <TextField
                                fullWidth
                                label="Mã Đơn Thuốc (Prescription Code)"
                                placeholder="VD: RX20261015ABCD"
                                value={prescriptionCode}
                                onChange={(e) => setPrescriptionCode(e.target.value)}
                                size="small"
                                InputProps={{ sx: { borderRadius: 2 } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={5}>
                            <TextField
                                fullWidth
                                label="Mã Băm Chữ Ký Số SHA-256 (Tùy chọn nếu quét QR)"
                                placeholder="Chuỗi hash 64 ký tự hex"
                                value={signatureHash}
                                onChange={(e) => setSignatureHash(e.target.value)}
                                size="small"
                                InputProps={{ sx: { borderRadius: 2 } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={2}>
                            <Button
                                fullWidth
                                variant="contained"
                                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
                                onClick={() => handleVerify()}
                                disabled={loading}
                                sx={{
                                    height: 40,
                                    fontWeight: 700,
                                    borderRadius: 2,
                                    textTransform: "none",
                                    bgcolor: "#0088D6",
                                    "&:hover": { bgcolor: "#0077BE" }
                                }}
                            >
                                Xác Thực
                            </Button>
                        </Grid>
                    </Grid>
                    {errorMsg && (
                        <Alert severity="error" sx={{ mt: 2, borderRadius: 2.5 }}>
                            {errorMsg}
                        </Alert>
                    )}
                </Paper>

                {/* Kết quả xác thực */}
                {result && (
                    <Card
                        elevation={4}
                        sx={{
                            borderRadius: 3,
                            border: result.valid ? "2px solid #2e7d32" : "2px solid #d32f2f",
                            overflow: "hidden"
                        }}
                    >
                        <Box
                            sx={{
                                bgcolor: result.valid ? "#e8f5e9" : "#ffebee",
                                p: 3,
                                display: "flex",
                                alignItems: "center",
                                gap: 2
                            }}
                        >
                            {result.valid ? (
                                <VerifiedUserIcon sx={{ fontSize: 50, color: "#2e7d32" }} />
                            ) : (
                                <GppBadIcon sx={{ fontSize: 50, color: "#d32f2f" }} />
                            )}
                            <Box flexGrow={1}>
                                <Chip
                                    label={result.valid ? "CHỮ KÝ SỐ HỢP LỆ & NGUYÊN VẸN" : "KHÔNG THỂ XÁC THỰC HOẶC ĐÃ BỊ SỬA ĐỔI"}
                                    color={result.valid ? "success" : "error"}
                                    sx={{ fontWeight: 800, mb: 0.5 }}
                                />
                                <Typography variant="h6" fontWeight={700} color={result.valid ? "success.dark" : "error.dark"}>
                                    {result.message}
                                </Typography>
                            </Box>
                        </Box>

                        <Divider />

                        <CardContent sx={{ p: 4 }}>
                            {result.valid ? (
                                <Stack spacing={2.5}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <LocalHospitalIcon color="primary" />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">Cơ sở khám chữa bệnh</Typography>
                                                    <Typography variant="body1" fontWeight={700}>{result.clinicName || "BỆNH VIỆN ĐA KHOA QUỐC TẾ YOUMED TNT"}</Typography>
                                                </Box>
                                            </Stack>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <BadgeIcon color="primary" />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">Bác sĩ ký số & CCHN</Typography>
                                                    <Typography variant="body1" fontWeight={700}>{result.doctorName} ({result.doctorLicense})</Typography>
                                                </Box>
                                            </Stack>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <AccessTimeIcon color="primary" />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">Thời điểm ký số</Typography>
                                                    <Typography variant="body1" fontWeight={600}>{result.createdAt}</Typography>
                                                </Box>
                                            </Stack>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <SecurityIcon color="success" />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">Mã Đơn Thuốc</Typography>
                                                    <Typography variant="body1" fontWeight={800} color="primary.main">{result.prescriptionCode}</Typography>
                                                </Box>
                                            </Stack>
                                        </Grid>
                                    </Grid>

                                    <Box bgcolor="#f8fafc" p={2} borderRadius={2} border="1px dashed #cbd5e1">
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            Mã Băm Xác Thực SHA-256 Chống Sửa Đổi:
                                        </Typography>
                                        <Typography variant="body2" fontFamily="monospace" fontWeight={600} color="text.primary" sx={{ wordBreak: "break-all" }}>
                                            {signatureHash || "Đã xác thực trùng khớp với cơ sở dữ liệu bệnh viện"}
                                        </Typography>
                                    </Box>

                                    <Box display="flex" justifyContent="center" pt={1}>
                                        <Button
                                            variant="contained"
                                            color="error"
                                            size="large"
                                            startIcon={<PictureAsPdfIcon />}
                                            href={`${API_BASE_URL}/api/prescriptions/${result.prescriptionCode}/pdf`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            sx={{ px: 4, py: 1.2, fontWeight: 700, borderRadius: 2 }}
                                        >
                                            Tải / Xem Đơn Thuốc Bản Gốc PDF (A5)
                                        </Button>
                                    </Box>
                                </Stack>
                            ) : (
                                <Box textAlign="center" py={2}>
                                    <Typography variant="body1" color="text.secondary" paragraph>
                                        Mã băm chữ ký số không trùng khớp với hồ sơ lưu trữ gốc trên hệ thống bệnh viện, hoặc đơn thuốc này đã bị thay đổi nội dung sau khi bác sĩ ký duyệt.
                                    </Typography>
                                    <Typography variant="body2" color="error.main" fontWeight={600}>
                                        Khuyến cáo người bệnh và nhà thuốc không sử dụng đơn thuốc không rõ nguồn gốc hoặc không vượt qua bước kiểm định này.
                                    </Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                )}
            </Container>
        </Box>
    );
}
