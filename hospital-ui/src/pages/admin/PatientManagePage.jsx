import React, { useState, useEffect } from "react";
import {
    Container,
    Paper,
    Typography,
    Box,
    Grid,
    Button,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Chip,
    Alert,
    Tooltip,
    InputAdornment,
    Avatar,
    Divider,
    CircularProgress
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import RefreshIcon from "@mui/icons-material/Refresh";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import PhoneIcon from "@mui/icons-material/Phone";
import BadgeIcon from "@mui/icons-material/Badge";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import HistoryIcon from "@mui/icons-material/History";
import ReceiptIcon from "@mui/icons-material/Receipt";
import EmailIcon from "@mui/icons-material/Email";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import axiosInstance from "../../services/AxiosInstance";
import { formatDate, formatDateTime, formatCurrency } from "../../utils/formatters";

export default function PatientManagePage() {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [patientError, setPatientError] = useState("");
    const [searchKeyword, setSearchKeyword] = useState("");
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [openDetailModal, setOpenDetailModal] = useState(false);

    useEffect(() => {
        loadPatients();
    }, []);

    const loadPatients = async () => {
        setLoading(true);
        setPatientError("");
        try {
            const [accRes, profRes] = await Promise.all([
                axiosInstance.get("/api/admin/accounts?role=ROLE_PATIENT"),
                axiosInstance.get("/api/patient-profiles")
            ]);

            const accounts = (accRes && Array.isArray(accRes.data)) ? accRes.data : (Array.isArray(accRes) ? accRes : []);
            const profiles = (profRes && Array.isArray(profRes.data)) ? profRes.data : (Array.isArray(profRes) ? profRes : []);

            const mergedList = [];

            // Thêm từ tài khoản thật
            accounts.forEach((acc, idx) => {
                const matchedProfile = profiles.find(p => p.phoneNumber === acc.phoneNumber);
                mergedList.push({
                    patientId: `BN-${1000 + idx + 1}`,
                    userId: acc.userId,
                    fullName: acc.fullName || matchedProfile?.fullName || "Bệnh nhân",
                    phoneNumber: acc.phoneNumber || "---",
                    email: acc.email || "---",
                    identityCard: matchedProfile?.identityNumber || "Chưa cập nhật",
                    dateOfBirth: matchedProfile?.dateOfBirth || "1990-01-01",
                    gender: matchedProfile?.gender || "MALE",
                    address: matchedProfile?.address || "Hồ sơ đăng ký điện tử",
                    insuranceCode: matchedProfile?.insuranceCode || "Chưa đăng ký BHYT",
                    totalVisits: 0,
                    totalSpent: 0,
                    balance: acc.balance || 0,
                    lastVisit: acc.updatedAt || acc.createdAt || new Date().toISOString(),
                    history: []
                });
            });

            // Thêm các profile chưa có trong account
            profiles.forEach((p, idx) => {
                if (!mergedList.some(m => m.phoneNumber === p.phoneNumber)) {
                    mergedList.push({
                        patientId: `BN-${1050 + idx + 1}`,
                        fullName: p.fullName,
                        phoneNumber: p.phoneNumber || "---",
                        email: "---",
                        identityCard: p.identityNumber || "Chưa cập nhật",
                        dateOfBirth: p.dateOfBirth || "1992-05-10",
                        gender: p.gender || "MALE",
                        address: p.address || "Việt Nam",
                        insuranceCode: p.insuranceCode || "Chưa đăng ký",
                        totalVisits: 0,
                        totalSpent: 0,
                        balance: 0,
                        lastVisit: p.createdAt || new Date().toISOString(),
                        history: []
                    });
                }
            });

            setPatients(mergedList);
        } catch (err) {
            console.error("Lỗi tải danh sách bệnh nhân:", err);
            setPatientError(err.message || "Không thể đồng bộ danh sách bệnh nhân từ máy chủ.");
        } finally {
            setLoading(false);
        }
    };

    const filteredPatients = patients.filter(p =>
        p.fullName?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        p.phoneNumber?.includes(searchKeyword) ||
        p.identityCard?.includes(searchKeyword) ||
        p.patientId?.toLowerCase().includes(searchKeyword.toLowerCase())
    );

    return (
        <Container maxWidth="xl" sx={{ py: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
                <Box>
                    <Typography variant="h5" fontWeight="900" color="#0F172A" sx={{ letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 1 }}>
                        <PeopleAltIcon sx={{ color: "#0088D6", fontSize: 32 }} />
                        Quản Lý Danh Sách & Hồ Sơ Bệnh Nhân
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Dữ liệu bệnh nhân đồng bộ trực tiếp từ hệ thống tài khoản và sổ khám bệnh điện tử
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={loadPatients}
                    disabled={loading}
                    sx={{ borderRadius: 2.5, fontWeight: 700 }}
                >
                    {loading ? "Đang tải..." : "Làm mới"}
                </Button>
            </Box>

            {/* Error Banner */}
            {patientError && (
                <Alert
                    severity="warning"
                    sx={{ mb: 3, borderRadius: 2.5 }}
                    action={
                        <Button color="inherit" size="small" onClick={loadPatients}>
                            Thử lại
                        </Button>
                    }
                >
                    {patientError}
                </Alert>
            )}

            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FFFFFF" }}>
                <Box mb={2.5} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <TextField
                        size="small"
                        placeholder="Tìm kiếm theo Tên, SĐT, CCCD/CMND, Mã bệnh nhân..."
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        sx={{ minWidth: { xs: "100%", sm: 380 } }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: "#94A3B8" }} />
                                </InputAdornment>
                            ),
                            sx: { borderRadius: 2 }
                        }}
                    />
                    <Typography variant="body2" color="text.secondary">
                        Tổng cộng: <b>{filteredPatients.length} bệnh nhân</b>
                    </Typography>
                </Box>

                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: "bold" }}>Mã BN</TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>Họ Và Tên</TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>Số Điện Thoại</TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>CCCD / BHYT</TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>Ngày Sinh / Giới Tính</TableCell>
                                <TableCell sx={{ fontWeight: "bold", textAlign: "center" }}>Số Dư Ví</TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>Tổng Viện Phí</TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>Cập Nhật Gần Nhất</TableCell>
                                <TableCell sx={{ fontWeight: "bold", textAlign: "center" }}>Hành Động</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                                        <CircularProgress size={32} />
                                        <Typography variant="body2" color="textSecondary" mt={1}>Đang tải hồ sơ bệnh nhân...</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : filteredPatients.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 4, color: "text.secondary" }}>
                                        Không tìm thấy hồ sơ bệnh nhân nào phù hợp!
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredPatients.map((patient) => (
                                    <TableRow key={patient.patientId} hover>
                                        <TableCell sx={{ fontWeight: 700, color: "#0088D6" }}>
                                            {patient.patientId}
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>
                                            {patient.fullName}
                                        </TableCell>
                                        <TableCell>{patient.phoneNumber}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontSize="0.85rem">{patient.identityCard}</Typography>
                                            <Typography variant="caption" color="textSecondary">{patient.insuranceCode}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(patient.dateOfBirth)} ({patient.gender === "MALE" ? "Nam" : "Nữ"})
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={formatCurrency(patient.balance || 0)}
                                                size="small"
                                                color={(patient.balance || 0) > 0 ? "success" : "default"}
                                                variant="outlined"
                                                sx={{ fontWeight: 700 }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: "#00C292" }}>
                                            {formatCurrency(patient.totalSpent || 0)}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: "0.85rem", color: "#64748B" }}>
                                            {formatDateTime(patient.lastVisit)}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="Xem chi tiết hồ sơ & lịch sử">
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => {
                                                        setSelectedPatient(patient);
                                                        setOpenDetailModal(true);
                                                    }}
                                                    sx={{ bgcolor: "#EBF6FE", borderRadius: 1.5 }}
                                                >
                                                    <VisibilityIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Modal Chi Tiết Hồ Sơ Bệnh Nhân */}
            <Dialog open={openDetailModal} onClose={() => setOpenDetailModal(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: "bold", borderBottom: "1px solid #E2E8F0", color: "#0088D6" }}>
                    👤 Chi Tiết Hồ Sơ Bệnh Nhân: {selectedPatient?.fullName}
                </DialogTitle>
                <DialogContent sx={{ pt: 2.5 }}>
                    {selectedPatient && (
                        <Grid container spacing={3}>
                            {/* Cột trái: Thông tin cá nhân */}
                            <Grid item xs={12} md={5}>
                                <Paper elevation={0} sx={{ p: 2.5, bgcolor: "#F8FAFC", borderRadius: 3, border: "1px solid #E2E8F0" }}>
                                    <Box textAlign="center" mb={2}>
                                        <Avatar sx={{ width: 64, height: 64, mx: "auto", bgcolor: "#0088D6", fontSize: "1.5rem", fontWeight: "bold" }}>
                                            {selectedPatient.fullName?.charAt(0) || "B"}
                                        </Avatar>
                                        <Typography variant="h6" fontWeight="bold" mt={1}>{selectedPatient.fullName}</Typography>
                                        <Chip label={selectedPatient.patientId} size="small" color="primary" sx={{ fontWeight: "bold", mt: 0.5 }} />
                                    </Box>
                                    <Divider sx={{ my: 1.5 }} />
                                    <Typography variant="body2" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                                        <PhoneIcon fontSize="small" sx={{ color: "#64748B" }} /> <b>SĐT:</b> {selectedPatient.phoneNumber}
                                    </Typography>
                                    {selectedPatient.email && selectedPatient.email !== "---" && (
                                        <Typography variant="body2" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                                            <EmailIcon fontSize="small" sx={{ color: "#64748B" }} /> <b>Email:</b> {selectedPatient.email}
                                        </Typography>
                                    )}
                                    <Typography variant="body2" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                                        <BadgeIcon fontSize="small" sx={{ color: "#64748B" }} /> <b>CCCD:</b> {selectedPatient.identityCard}
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                                        <ReceiptIcon fontSize="small" sx={{ color: "#64748B" }} /> <b>BHYT:</b> {selectedPatient.insuranceCode}
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                                        <AccountBalanceWalletIcon fontSize="small" sx={{ color: "#F59E0B" }} /> <b>Ví viện phí:</b> {formatCurrency(selectedPatient.balance || 0)}
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                                        <LocationOnIcon fontSize="small" sx={{ color: "#64748B" }} /> <b>Địa chỉ:</b> {selectedPatient.address}
                                    </Typography>
                                </Paper>
                            </Grid>

                            {/* Cột phải: Lịch sử khám bệnh */}
                            <Grid item xs={12} md={7}>
                                <Typography variant="subtitle1" fontWeight="bold" color="#0F172A" sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                                    <HistoryIcon sx={{ color: "#00C292" }} />
                                    Lịch Sử Khám & Phiếu Chẩn Đoán
                                </Typography>
                                <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #E2E8F0", borderRadius: 2 }}>
                                    <Table size="small">
                                        <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: "bold" }}>Ngày</TableCell>
                                                <TableCell sx={{ fontWeight: "bold" }}>Khoa & Bác Sĩ</TableCell>
                                                <TableCell sx={{ fontWeight: "bold" }}>Chẩn Đoán</TableCell>
                                                <TableCell sx={{ fontWeight: "bold", textAlign: "right" }}>Viện Phí</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {selectedPatient.history?.map((h, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell sx={{ fontWeight: 600 }}>{h.visitDate}</TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight="600">{h.department}</Typography>
                                                        <Typography variant="caption" color="textSecondary">{h.doctor}</Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ color: "#0088D6", fontWeight: 500 }}>{h.diagnosis}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700, color: "#00C292" }}>
                                                        {formatCurrency(h.cost)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: "1px solid #E2E8F0" }}>
                    <Button onClick={() => setOpenDetailModal(false)} variant="contained" sx={{ borderRadius: 2 }}>
                        Đóng
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
