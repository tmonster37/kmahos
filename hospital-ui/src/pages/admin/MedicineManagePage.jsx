import React, { useState, useEffect } from "react";
import {
    Container,
    Paper,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Box,
    Chip,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    InputAdornment,
    Alert,
    CircularProgress,
    Tooltip,
    IconButton,
    Tabs,
    Tab,
    Grid,
    Card,
    CardContent,
    Stack
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import MedicationIcon from "@mui/icons-material/Medication";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency, formatDate } from "../../utils/formatters";

export default function MedicineManagePage() {
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [searchKeyword, setSearchKeyword] = useState("");
    const [tabFilter, setTabFilter] = useState("ALL"); // ALL, LOW_STOCK, EXPIRING_SOON, SAFE
    const [openRestock, setOpenRestock] = useState(false);
    const [selectedMed, setSelectedMed] = useState(null);
    const [importQty, setImportQty] = useState(100);
    const [importBatch, setImportBatch] = useState("");
    const [importExpiry, setImportExpiry] = useState("");
    const [feedback, setFeedback] = useState({ type: "", message: "" });

    const loadMedicines = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await axiosInstance.get("/api/clinical/medicines");
            const list = (res && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
            setMedicines(list);
        } catch (err) {
            console.error("Lỗi tải danh mục thuốc:", err);
            setError(err.message || "Không thể đồng bộ danh mục kho dược từ máy chủ.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMedicines();
    }, []);

    const getDaysUntilExpiry = (expDateStr) => {
        if (!expDateStr) return 999;
        const exp = new Date(expDateStr);
        const now = new Date();
        const diffTime = exp - now;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const handleOpenRestockModal = (m) => {
        setSelectedMed(m);
        setImportQty(100);
        setImportBatch(`LOT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90) + 10)}`);
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 2);
        setImportExpiry(nextYear.toISOString().split("T")[0]);
        setOpenRestock(true);
    };

    const handleRestock = () => {
        if (!selectedMed) return;
        const qtyNum = Number(importQty);
        if (isNaN(qtyNum) || qtyNum <= 0) {
            alert("Vui lòng nhập số lượng hợp lệ!");
            return;
        }

        setMedicines(prev => prev.map((m) =>
            m.medicineId === selectedMed.medicineId
                ? {
                    ...m,
                    stockQuantity: (Number(m.stockQuantity) || 0) + qtyNum,
                    batchNumber: importBatch || m.batchNumber,
                    expiryDate: importExpiry || m.expiryDate
                }
                : m
        ));
        setOpenRestock(false);
        setFeedback({
            type: "success",
            message: `Đã nhập thêm +${qtyNum} ${selectedMed.unit || "đơn vị"} (Lô: ${importBatch}, HSD: ${importExpiry}) cho thuốc [${selectedMed.medicineName}] thành công!`
        });
    };

    // Phân loại FEFO
    const lowStockList = medicines.filter(m => (Number(m.stockQuantity) || 0) < (m.minStock || 50));
    const expiringSoonList = medicines.filter(m => {
        const days = getDaysUntilExpiry(m.expiryDate);
        return days <= 90 && days >= 0;
    });

    const filteredMedicines = medicines.filter(m => {
        const matchSearch =
            m.medicineName?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            m.activeIngredient?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            m.batchNumber?.toLowerCase().includes(searchKeyword.toLowerCase());

        const stock = Number(m.stockQuantity) || 0;
        const minStock = m.minStock || 50;
        const days = getDaysUntilExpiry(m.expiryDate);

        if (!matchSearch) return false;

        if (tabFilter === "LOW_STOCK") return stock < minStock;
        if (tabFilter === "EXPIRING_SOON") return days <= 90;
        if (tabFilter === "SAFE") return stock >= minStock && days > 90;
        return true;
    });

    const getUnitLabel = (unit) => {
        switch (unit) {
            case "VIEN": return "Viên";
            case "GOI": return "Gói";
            case "CHAI": return "Chai/Lọ";
            case "ONG": return "Ống";
            case "TUYP": return "Tuýp";
            case "HOP": return "Hộp";
            default: return unit || "Đơn vị";
        }
    };

    const handleExportProcurementList = () => {
        const needed = medicines.filter(m => (Number(m.stockQuantity) || 0) < (m.minStock || 50) || getDaysUntilExpiry(m.expiryDate) <= 90);
        let csvContent = "data:text/csv;charset=utf-8,Mã thuốc,Tên thuốc,Hoạt chất,Tồn kho,Ngưỡng an toàn,Hạn sử dụng,Lô sản xuất,Đề xuất nhập thêm\n";
        needed.forEach(n => {
            csvContent += `${n.medicineId},"${n.medicineName}","${n.activeIngredient || ''}",${n.stockQuantity},${n.minStock || 50},${n.expiryDate},${n.batchNumber},${(n.minStock || 50) * 3}\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Du_Tru_Duoc_Pham_FEFO_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* 1. Header Banner (Apple HIG Paper) */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2.5, md: 3 },
                    mb: 3,
                    borderRadius: 4,
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    bgcolor: "#FFFFFF",
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                    alignItems: { xs: "flex-start", md: "center" },
                    justifyContent: "space-between",
                    gap: 2.5,
                    boxShadow: "0 2px 12px rgba(15, 23, 42, 0.03)"
                }}
            >
                <Box display="flex" alignItems="center" gap={2}>
                    <Box
                        sx={{
                            width: 52,
                            height: 52,
                            borderRadius: "16px",
                            bgcolor: "rgba(0, 136, 214, 0.1)",
                            color: "#0088D6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 4px 14px rgba(0, 136, 214, 0.2)"
                        }}
                    >
                        <MedicationIcon sx={{ fontSize: 28 }} />
                    </Box>
                    <Box>
                        <Box display="flex" alignItems="center" gap={1.2} flexWrap="wrap">
                            <Typography variant="h5" fontWeight={800} color="#0F172A" letterSpacing="-0.02em">
                                Quản Lý Danh Mục Thuốc & Cảnh Báo FEFO
                            </Typography>
                            <Chip
                                label="SmartHIS Pharmacopoeia Pro"
                                size="small"
                                sx={{
                                    height: 22,
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    bgcolor: "rgba(0, 136, 214, 0.1)",
                                    color: "#0088D6",
                                    border: "1px solid rgba(0, 136, 214, 0.2)"
                                }}
                            />
                        </Box>
                        <Typography variant="body2" sx={{ color: "#64748B", mt: 0.3 }}>
                            Giám sát định mức an toàn, cảnh báo thuốc cận hạn & thuật toán cấp phát xuất kho First-Expiry First-Out
                        </Typography>
                    </Box>
                </Box>

                <Stack direction="row" spacing={1.5} flexWrap="wrap">
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadMedicines}
                        disabled={loading}
                        sx={{
                            borderRadius: 2.5,
                            fontWeight: 700,
                            textTransform: "none",
                            fontSize: "0.85rem",
                            color: "#475569",
                            borderColor: "rgba(15, 23, 42, 0.15)",
                            "&:hover": { borderColor: "#0F172A", bgcolor: "rgba(15, 23, 42, 0.04)" }
                        }}
                    >
                        Làm Mới
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<FileDownloadIcon />}
                        onClick={handleExportProcurementList}
                        sx={{
                            borderRadius: 2.5,
                            fontWeight: 700,
                            textTransform: "none",
                            fontSize: "0.85rem",
                            bgcolor: "#F59E0B",
                            boxShadow: "0 4px 14px rgba(245, 158, 11, 0.25)",
                            "&:hover": { bgcolor: "#D97706" }
                        }}
                    >
                        Xuất Dự Trù Dược Phẩm (CSV)
                    </Button>
                </Stack>
            </Paper>

            {/* Error Banner */}
            {error && (
                <Alert
                    severity="warning"
                    sx={{ mb: 3, borderRadius: 3, border: "1px solid rgba(245, 158, 11, 0.2)" }}
                    action={
                        <Button color="inherit" size="small" onClick={loadMedicines} sx={{ fontWeight: 700 }}>
                            Thử lại
                        </Button>
                    }
                >
                    {error}
                </Alert>
            )}

            {/* 2. Micro-KPI Cards (FEFO & Stock Health) */}
            <Grid container spacing={2.5} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        elevation={0}
                        sx={{
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            borderRadius: 3.5,
                            bgcolor: "#FFFFFF",
                            position: "relative",
                            overflow: "hidden",
                            transition: "all 0.2s ease",
                            "&:hover": { transform: "translateY(-2px)", boxShadow: "0 8px 24px rgba(0, 136, 214, 0.08)" },
                            "&::before": {
                                content: '""',
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                height: "3.5px",
                                bgcolor: "#0088D6"
                            }
                        }}
                    >
                        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: 2.5 }}>
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 2.5,
                                    bgcolor: "rgba(0, 136, 214, 0.1)",
                                    color: "#0088D6",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                <Inventory2Icon />
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                    TỔNG DANH MỤC THUỐC
                                </Typography>
                                <Typography variant="h4" fontWeight={800} color="#0F172A" sx={{ letterSpacing: "-0.03em" }}>
                                    {medicines.length}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "#94A3B8" }}>Đang lưu hành viện</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        elevation={0}
                        sx={{
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            borderRadius: 3.5,
                            bgcolor: "#FFFFFF",
                            position: "relative",
                            overflow: "hidden",
                            transition: "all 0.2s ease",
                            "&:hover": { transform: "translateY(-2px)", boxShadow: "0 8px 24px rgba(239, 68, 68, 0.08)" },
                            "&::before": {
                                content: '""',
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                height: "3.5px",
                                bgcolor: "#EF4444"
                            }
                        }}
                    >
                        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: 2.5 }}>
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 2.5,
                                    bgcolor: "rgba(239, 68, 68, 0.1)",
                                    color: "#EF4444",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                <WarningAmberIcon />
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: "#DC2626", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                    DƯỚI MỨC AN TOÀN
                                </Typography>
                                <Typography variant="h4" fontWeight={800} color="#DC2626" sx={{ letterSpacing: "-0.03em" }}>
                                    {lowStockList.length}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "#EF4444" }}>Cần dự trù nhập kho</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        elevation={0}
                        sx={{
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            borderRadius: 3.5,
                            bgcolor: "#FFFFFF",
                            position: "relative",
                            overflow: "hidden",
                            transition: "all 0.2s ease",
                            "&:hover": { transform: "translateY(-2px)", boxShadow: "0 8px 24px rgba(245, 158, 11, 0.08)" },
                            "&::before": {
                                content: '""',
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                height: "3.5px",
                                bgcolor: "#F59E0B"
                            }
                        }}
                    >
                        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: 2.5 }}>
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 2.5,
                                    bgcolor: "rgba(245, 158, 11, 0.1)",
                                    color: "#D97706",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                <EventBusyIcon />
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: "#D97706", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                    CẬN HẠN DÙNG (&lt;90D)
                                </Typography>
                                <Typography variant="h4" fontWeight={800} color="#D97706" sx={{ letterSpacing: "-0.03em" }}>
                                    {expiringSoonList.length}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "#B45309" }}>Ưu tiên cấp phát FEFO</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        elevation={0}
                        sx={{
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            borderRadius: 3.5,
                            bgcolor: "#FFFFFF",
                            position: "relative",
                            overflow: "hidden",
                            transition: "all 0.2s ease",
                            "&:hover": { transform: "translateY(-2px)", boxShadow: "0 8px 24px rgba(16, 185, 129, 0.08)" },
                            "&::before": {
                                content: '""',
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                height: "3.5px",
                                bgcolor: "#10B981"
                            }
                        }}
                    >
                        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: 2.5 }}>
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 2.5,
                                    bgcolor: "rgba(16, 185, 129, 0.1)",
                                    color: "#10B981",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                <CheckCircleIcon />
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: "#059669", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                    TỒN KHO ỔN ĐỊNH
                                </Typography>
                                <Typography variant="h4" fontWeight={800} color="#0F172A" sx={{ letterSpacing: "-0.03em" }}>
                                    {medicines.length - lowStockList.length - expiringSoonList.length}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "#15803D" }}>Cung ứng an toàn &gt;90d</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {feedback.message && (
                <Alert severity={feedback.type || "info"} sx={{ mb: 3, borderRadius: 3 }} onClose={() => setFeedback({ type: "", message: "" })}>
                    {feedback.message}
                </Alert>
            )}

            {/* FEFO Banner Alert */}
            {(lowStockList.length > 0 || expiringSoonList.length > 0) && (
                <Alert
                    severity="warning"
                    icon={<WarningAmberIcon fontSize="inherit" />}
                    sx={{ mb: 3, borderRadius: 3, border: "1px solid rgba(245, 158, 11, 0.25)" }}
                >
                    <b>CẢNH BÁO DƯỢC VỤ & NGUYÊN TẮC FEFO:</b> Đang có <b>{lowStockList.length}</b> mặt hàng thuốc dưới mức tồn an toàn (&lt; 50 đơn vị) và <b>{expiringSoonList.length}</b> mặt hàng sắp hết hạn trong vòng 90 ngày tới. Vui lòng ưu tiên cấp phát các lô có hạn dùng gần nhất trước khi nhập đợt thuốc mới!
                </Alert>
            )}

            {/* 3. Tabs & Search */}
            <Paper
                elevation={0}
                sx={{
                    p: 2.5,
                    borderRadius: 3.5,
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    bgcolor: "#FFFFFF",
                    boxShadow: "0 2px 12px rgba(15, 23, 42, 0.02)"
                }}
            >
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2.5}>
                    <Tabs
                        value={tabFilter}
                        onChange={(_, v) => setTabFilter(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            "& .MuiTab-root": {
                                textTransform: "none",
                                fontWeight: 700,
                                fontSize: "0.85rem",
                                minHeight: 40,
                                borderRadius: 2,
                                px: 2,
                                mr: 0.5,
                                color: "#64748B",
                                "&.Mui-selected": {
                                    color: "#0088D6",
                                    bgcolor: "rgba(0, 136, 214, 0.08)"
                                }
                            },
                            "& .MuiTabs-indicator": {
                                bgcolor: "#0088D6",
                                height: 3,
                                borderRadius: 1.5
                            }
                        }}
                    >
                        <Tab label={`Tất cả (${medicines.length})`} value="ALL" />
                        <Tab label={`Sắp hết hàng (${lowStockList.length})`} value="LOW_STOCK" sx={{ color: lowStockList.length > 0 ? "#DC2626 !important" : "inherit" }} />
                        <Tab label={`Cận hạn FEFO (${expiringSoonList.length})`} value="EXPIRING_SOON" sx={{ color: expiringSoonList.length > 0 ? "#D97706 !important" : "inherit" }} />
                        <Tab label="Tồn kho an toàn" value="SAFE" />
                    </Tabs>

                    <TextField
                        size="small"
                        placeholder="Tìm theo tên thuốc, hoạt chất, số lô..."
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        sx={{ minWidth: 320 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: "#94A3B8" }} />
                                </InputAdornment>
                            ),
                            sx: {
                                borderRadius: 2.5,
                                bgcolor: "#F8FAFC",
                                "& fieldset": { borderColor: "rgba(15, 23, 42, 0.1)" },
                                "&:hover fieldset": { borderColor: "#0088D6" },
                                "&.Mui-focused fieldset": { borderColor: "#0088D6" }
                            }
                        }}
                    />
                </Box>

                <TableContainer
                    component={Paper}
                    elevation={0}
                    sx={{
                        borderRadius: 3,
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        overflow: "hidden"
                    }}
                >
                    <Table>
                        <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 800, color: "#475569", py: 1.8, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>Mã Thuốc</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: "#475569", py: 1.8, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>Tên Thuốc Thương Mại</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: "#475569", py: 1.8, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>Hoạt Chất Chính</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: "#475569", py: 1.8, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>Số Lô SX (Batch)</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: "#475569", py: 1.8, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>Hạn Dùng (FEFO)</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, color: "#475569", py: 1.8, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>Đơn Giá</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, color: "#475569", py: 1.8, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>Tồn Kho</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, color: "#475569", py: 1.8, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>Trạng Thái FEFO</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, color: "#475569", py: 1.8, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>Thao Tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                                        <CircularProgress size={34} sx={{ color: "#0088D6" }} />
                                        <Typography variant="body2" sx={{ color: "#64748B", mt: 1.5, fontWeight: 600 }}>Đang tải danh mục kho thuốc...</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : filteredMedicines.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                                        <Box
                                            sx={{
                                                width: 56,
                                                height: 56,
                                                borderRadius: "16px",
                                                bgcolor: "rgba(100, 116, 139, 0.08)",
                                                color: "#94A3B8",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                mx: "auto",
                                                mb: 1.5
                                            }}
                                        >
                                            <MedicationIcon sx={{ fontSize: 30 }} />
                                        </Box>
                                        <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#334155" }}>
                                            Không tìm thấy thuốc nào
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: "#64748B", mb: 2 }}>
                                            {searchKeyword || tabFilter !== "ALL"
                                                ? "Không có mặt hàng thuốc nào phù hợp với bộ lọc tìm kiếm hiện tại."
                                                : "Hệ thống chưa có danh mục thuốc lưu hành."}
                                        </Typography>
                                        {(searchKeyword || tabFilter !== "ALL") && (
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={() => {
                                                    setSearchKeyword("");
                                                    setTabFilter("ALL");
                                                }}
                                                sx={{ borderRadius: 2.2, textTransform: "none", fontWeight: 700 }}
                                            >
                                                Xóa bộ lọc tìm kiếm
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredMedicines.map((m) => {
                                    const stock = Number(m.stockQuantity) || 0;
                                    const minStock = m.minStock || 50;
                                    const isLow = stock < minStock;
                                    const daysUntilExp = getDaysUntilExpiry(m.expiryDate);
                                    const isExpiringSoon = daysUntilExp <= 90 && daysUntilExp >= 0;
                                    const isExpired = daysUntilExp < 0;
                                    const unitLabel = getUnitLabel(m.unit);

                                    return (
                                        <TableRow
                                            key={m.medicineId}
                                            hover
                                            sx={{
                                                bgcolor: isExpired ? "rgba(254, 242, 242, 0.6)" : (isExpiringSoon ? "rgba(255, 251, 235, 0.6)" : "inherit"),
                                                "&:hover": { bgcolor: "rgba(248, 250, 252, 0.8)" },
                                                transition: "background-color 0.15s ease"
                                            }}
                                        >
                                            <TableCell sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
                                                <Typography variant="body2" fontWeight={700} sx={{ fontFamily: "monospace", color: "#64748B" }}>
                                                    #MED-{m.medicineId}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
                                                <Typography variant="body2" fontWeight={800} sx={{ color: "#0F172A", fontSize: "0.85rem" }}>
                                                    {m.medicineName}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
                                                <Typography variant="body2" color="#475569">
                                                    {m.activeIngredient || <i>Theo chỉ định</i>}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
                                                <Chip
                                                    label={m.batchNumber || "LOT-STD"}
                                                    size="small"
                                                    sx={{
                                                        fontFamily: "monospace",
                                                        fontWeight: 700,
                                                        fontSize: "0.72rem",
                                                        bgcolor: "rgba(100, 116, 139, 0.08)",
                                                        color: "#475569",
                                                        border: "1px solid rgba(100, 116, 139, 0.2)",
                                                        borderRadius: 1.5
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
                                                <Typography variant="body2" fontWeight={700} color={isExpired ? "#EF4444" : (isExpiringSoon ? "#D97706" : "#0F172A")} sx={{ fontFamily: "monospace" }}>
                                                    {m.expiryDate ? formatDate(m.expiryDate) : "31/12/2027"}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: isExpired ? "#EF4444" : (isExpiringSoon ? "#D97706" : "#94A3B8") }}>
                                                    {isExpired ? "Đã hết hạn" : `(Còn ${daysUntilExp} ngày)`}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
                                                <Typography variant="body2" fontWeight={800} color="#0F172A" sx={{ fontFamily: "monospace" }}>
                                                    {formatCurrency(m.price)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)", whiteSpace: "nowrap" }}>
                                                <Typography variant="body2" fontWeight={700} sx={{ fontFamily: "monospace", color: isLow ? "#DC2626" : "#0F172A" }}>
                                                    {stock.toLocaleString()} <Typography component="span" variant="caption" sx={{ color: "#64748B", fontWeight: 700, fontSize: "0.72rem" }}>{unitLabel}</Typography>
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
                                                {isExpired ? (
                                                    <Chip label="HẾT HẠN - TIÊU HỦY" size="small" sx={{ fontWeight: 800, fontSize: "0.7rem", bgcolor: "rgba(239, 68, 68, 0.12)", color: "#DC2626", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 1.5 }} />
                                                ) : isExpiringSoon ? (
                                                    <Chip label="ƯU TIÊN XUẤT (FEFO)" size="small" sx={{ fontWeight: 800, fontSize: "0.7rem", bgcolor: "rgba(245, 158, 11, 0.12)", color: "#D97706", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 1.5 }} />
                                                ) : isLow ? (
                                                    <Chip label="SẮP HẾT TỒN KHO" size="small" sx={{ fontWeight: 700, fontSize: "0.7rem", bgcolor: "rgba(239, 68, 68, 0.08)", color: "#EF4444", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 1.5 }} />
                                                ) : (
                                                    <Chip label="AN TOÀN" size="small" sx={{ fontWeight: 700, fontSize: "0.7rem", bgcolor: "rgba(16, 185, 129, 0.08)", color: "#059669", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 1.5 }} />
                                                )}
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)", minWidth: 130, whiteSpace: "nowrap" }}>
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    startIcon={<AddShoppingCartIcon sx={{ fontSize: 16 }} />}
                                                    onClick={() => handleOpenRestockModal(m)}
                                                    sx={{
                                                        borderRadius: 2,
                                                        textTransform: "none",
                                                        fontWeight: 700,
                                                        fontSize: "0.78rem",
                                                        whiteSpace: "nowrap",
                                                        minWidth: "105px",
                                                        px: 1.8,
                                                        py: 0.6,
                                                        bgcolor: "#0088D6",
                                                        boxShadow: "0 2px 8px rgba(0, 136, 214, 0.2)",
                                                        "&:hover": { bgcolor: "#0073B7" }
                                                    }}
                                                >
                                                    Nhập thêm
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Modal Nhập thêm thuốc theo Lô & HSD (FEFO) */}
            {selectedMed && (
                <Dialog
                    open={openRestock}
                    onClose={() => setOpenRestock(false)}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{
                        sx: {
                            borderRadius: 4,
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            boxShadow: "0 20px 40px rgba(15, 23, 42, 0.15)"
                        }
                    }}
                >
                    <DialogTitle sx={{ fontWeight: 800, color: "#0F172A", display: "flex", alignItems: "center", gap: 1.2, pb: 1 }}>
                        <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: "rgba(0, 136, 214, 0.1)", color: "#0088D6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <AddShoppingCartIcon sx={{ fontSize: 20 }} />
                        </Box>
                        Nhập Thêm Lô Thuốc: {selectedMed.medicineName}
                    </DialogTitle>
                    <DialogContent dividers sx={{ borderColor: "rgba(15, 23, 42, 0.08)" }}>
                        <Box sx={{ mb: 2.5, p: 2, bgcolor: "#F8FAFC", borderRadius: 3, border: "1px solid rgba(15, 23, 42, 0.08)" }}>
                            <Grid container spacing={1.5}>
                                <Grid item xs={6}>
                                    <Typography variant="body2" sx={{ color: "#64748B" }}>Mã thuốc:</Typography>
                                    <Typography variant="body2" fontWeight={800} color="#0F172A" sx={{ fontFamily: "monospace" }}>#MED-{selectedMed.medicineId}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="body2" sx={{ color: "#64748B" }}>Hoạt chất:</Typography>
                                    <Typography variant="body2" fontWeight={800} color="#0F172A">{selectedMed.activeIngredient || "Theo chỉ định"}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="body2" sx={{ color: "#64748B" }}>Tồn kho hiện tại:</Typography>
                                    <Typography variant="body2" fontWeight={800} sx={{ color: selectedMed.stockQuantity < 50 ? "#EF4444" : "#10B981" }}>
                                        {selectedMed.stockQuantity} {getUnitLabel(selectedMed.unit)}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="body2" sx={{ color: "#64748B" }}>Lô hiện hành:</Typography>
                                    <Typography variant="body2" fontWeight={800} color="#0F172A" sx={{ fontFamily: "monospace" }}>{selectedMed.batchNumber || "LOT-STD"}</Typography>
                                </Grid>
                            </Grid>
                        </Box>

                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label={`Số lượng nhập kho (${getUnitLabel(selectedMed.unit)})`}
                                    value={importQty}
                                    onChange={(e) => setImportQty(e.target.value)}
                                    inputProps={{ min: 1 }}
                                    autoFocus
                                    required
                                    InputProps={{ sx: { borderRadius: 2.5 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Số Lô Sản Xuất (Batch No.)"
                                    value={importBatch}
                                    onChange={(e) => setImportBatch(e.target.value)}
                                    placeholder="LOT-2026-XX"
                                    required
                                    InputProps={{ sx: { borderRadius: 2.5 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="date"
                                    label="Hạn Sử Dụng (Expiry Date)"
                                    InputLabelProps={{ shrink: true }}
                                    value={importExpiry}
                                    onChange={(e) => setImportExpiry(e.target.value)}
                                    required
                                    InputProps={{ sx: { borderRadius: 2.5 } }}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 2.5 }}>
                        <Button onClick={() => setOpenRestock(false)} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}>Hủy</Button>
                        <Button
                            variant="contained"
                            onClick={handleRestock}
                            sx={{
                                borderRadius: 2.2,
                                fontWeight: 700,
                                textTransform: "none",
                                bgcolor: "#10B981",
                                boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)",
                                "&:hover": { bgcolor: "#059669" }
                            }}
                        >
                            Xác Nhận Nhập Kho (FEFO)
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </Container>
    );
}
