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
        <Container maxWidth="xl" sx={{ py: 2 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight={800} sx={{ color: "#0088D6", display: "flex", alignItems: "center", gap: 1 }}>
                        <MedicationIcon sx={{ fontSize: 28, color: "#0088D6" }} /> Quản Lý Kho Dược & Cảnh Báo FEFO
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#64748B", mt: 0.5 }}>
                        Giám sát tồn kho an toàn, cảnh báo thuốc cận hạn & xuất kho theo chuẩn First Expired, First Out
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1.5}>
                    <Button
                        variant="contained"
                        sx={{ bgcolor: "#F59E0B", color: "white", fontWeight: 700, borderRadius: 2, "&:hover": { bgcolor: "#D97706" } }}
                        startIcon={<FileDownloadIcon />}
                        onClick={handleExportProcurementList}
                    >
                        Xuất Dự Trù Dược Phẩm (CSV)
                    </Button>
                    <Button
                        variant="outlined"
                        sx={{ borderRadius: 2 }}
                        startIcon={<RefreshIcon />}
                        onClick={loadMedicines}
                        disabled={loading}
                    >
                        Làm mới
                    </Button>
                </Stack>
            </Box>

            {/* Error Banner */}
            {error && (
                <Alert
                    severity="warning"
                    sx={{ mb: 3, borderRadius: 2.5 }}
                    action={
                        <Button color="inherit" size="small" onClick={loadMedicines}>
                            Thử lại
                        </Button>
                    }
                >
                    {error}
                </Alert>
            )}

            {/* FEFO Warning Cards */}
            <Grid container spacing={2.5} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={0} sx={{ border: "1px solid #E2E8F0", borderRadius: 3, bgcolor: "#FFFFFF" }}>
                        <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, letterSpacing: 0.5 }}>TỔNG DANH MỤC THUỐC</Typography>
                            <Typography variant="h4" fontWeight={800} sx={{ color: "#0088D6", my: 0.5 }}>{medicines.length}</Typography>
                            <Typography variant="caption" color="text.secondary">Đang lưu hành tại bệnh viện</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={0} sx={{ border: "1px solid #FECACA", borderRadius: 3, bgcolor: lowStockList.length > 0 ? "#FEF2F2" : "#FFFFFF" }}>
                        <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                            <Typography variant="caption" sx={{ color: "#DC2626", fontWeight: 700, letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 0.5 }}>
                                <WarningAmberIcon fontSize="small" /> DƯỚI MỨC AN TOÀN
                            </Typography>
                            <Typography variant="h4" fontWeight={800} sx={{ color: "#DC2626", my: 0.5 }}>{lowStockList.length}</Typography>
                            <Typography variant="caption" sx={{ color: "#B91C1C" }}>Cần lập đơn nhập kho gấp</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={0} sx={{ border: "1px solid #FDE68A", borderRadius: 3, bgcolor: expiringSoonList.length > 0 ? "#FFFBEB" : "#FFFFFF" }}>
                        <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                            <Typography variant="caption" sx={{ color: "#D97706", fontWeight: 700, letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 0.5 }}>
                                <EventBusyIcon fontSize="small" /> CẬN HẠN DÙNG (&lt; 90 NGÀY)
                            </Typography>
                            <Typography variant="h4" fontWeight={800} sx={{ color: "#D97706", my: 0.5 }}>{expiringSoonList.length}</Typography>
                            <Typography variant="caption" sx={{ color: "#B45309" }}>Ưu tiên xuất kho trước (FEFO)</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={0} sx={{ border: "1px solid #BBF7D0", borderRadius: 3, bgcolor: "#F0FDF4" }}>
                        <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                            <Typography variant="caption" sx={{ color: "#16A34A", fontWeight: 700, letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 0.5 }}>
                                <CheckCircleIcon fontSize="small" /> TỒN KHO ỔN ĐỊNH
                            </Typography>
                            <Typography variant="h4" fontWeight={800} sx={{ color: "#16A34A", my: 0.5 }}>
                                {medicines.length - lowStockList.length - expiringSoonList.length}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#15803D" }}>Đủ cung ứng trên 90 ngày</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {feedback.message && (
                <Alert severity={feedback.type || "info"} sx={{ mb: 3, borderRadius: 2 }} onClose={() => setFeedback({ type: "", message: "" })}>
                    {feedback.message}
                </Alert>
            )}

            {/* FEFO Banner Alert */}
            {(lowStockList.length > 0 || expiringSoonList.length > 0) && (
                <Alert
                    severity="warning"
                    icon={<WarningAmberIcon fontSize="inherit" />}
                    sx={{ mb: 3, borderRadius: 2 }}
                >
                    <b>CẢNH BÁO DƯỢC VỤ & NGUYÊN TẮC FEFO:</b> Đang có <b>{lowStockList.length}</b> mặt hàng thuốc dưới mức tồn an toàn (&lt; 50 đơn vị) và <b>{expiringSoonList.length}</b> mặt hàng sắp hết hạn trong vòng 90 ngày tới. Vui lòng ưu tiên cấp phát các lô có hạn dùng gần nhất trước khi nhập đợt thuốc mới!
                </Alert>
            )}

            {/* Tabs & Search */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FFFFFF" }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2.5}>
                    <Tabs value={tabFilter} onChange={(_, v) => setTabFilter(v)}>
                        <Tab label={`Tất cả (${medicines.length})`} value="ALL" sx={{ fontWeight: 700 }} />
                        <Tab label={`Sắp hết hàng (${lowStockList.length})`} value="LOW_STOCK" sx={{ fontWeight: 700, color: lowStockList.length > 0 ? "error.main" : "inherit" }} />
                        <Tab label={`Cận hạn FEFO (${expiringSoonList.length})`} value="EXPIRING_SOON" sx={{ fontWeight: 700, color: expiringSoonList.length > 0 ? "warning.main" : "inherit" }} />
                        <Tab label="Tồn kho an toàn" value="SAFE" sx={{ fontWeight: 700 }} />
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
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                            sx: { borderRadius: 2 }
                        }}
                    />
                </Box>

                <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2.5, border: "1px solid #E2E8F0" }}>
                    <Table>
                        <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, color: "#334155", py: 1.5, fontSize: "0.85rem", borderBottom: "1px solid #E2E8F0" }}>Mã thuốc</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#334155", py: 1.5, fontSize: "0.85rem", borderBottom: "1px solid #E2E8F0" }}>Tên thuốc thương mại</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#334155", py: 1.5, fontSize: "0.85rem", borderBottom: "1px solid #E2E8F0" }}>Hoạt chất chính</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#334155", py: 1.5, fontSize: "0.85rem", borderBottom: "1px solid #E2E8F0" }}>Số lô SX (Batch)</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#334155", py: 1.5, fontSize: "0.85rem", borderBottom: "1px solid #E2E8F0" }}>Hạn sử dụng (FEFO)</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: "#334155", py: 1.5, fontSize: "0.85rem", borderBottom: "1px solid #E2E8F0" }}>Đơn giá</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, color: "#334155", py: 1.5, fontSize: "0.85rem", borderBottom: "1px solid #E2E8F0" }}>Tồn kho</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, color: "#334155", py: 1.5, fontSize: "0.85rem", borderBottom: "1px solid #E2E8F0" }}>Trạng thái FEFO</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, color: "#334155", py: 1.5, fontSize: "0.85rem", borderBottom: "1px solid #E2E8F0" }}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                                        <CircularProgress size={32} />
                                        <Typography variant="body2" color="textSecondary" mt={1}>Đang tải danh mục kho thuốc...</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : filteredMedicines.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 6, color: "text.secondary" }}>
                                        <MedicationIcon sx={{ fontSize: 44, color: "#94A3B8", mb: 1 }} />
                                        <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#334155" }}>
                                            Không tìm thấy thuốc nào
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
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
                                                sx={{ borderRadius: 2 }}
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
                                        <TableRow key={m.medicineId} hover sx={{ bgcolor: isExpired ? "#FEF2F2" : (isExpiringSoon ? "#FFFBEB" : "inherit") }}>
                                            <TableCell><b>#MED-{m.medicineId}</b></TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="bold" color="primary">
                                                    {m.medicineName}
                                                </Typography>
                                            </TableCell>
                                            <TableCell><i>{m.activeIngredient || "Theo chỉ định"}</i></TableCell>
                                            <TableCell>
                                                <Chip label={m.batchNumber || "LOT-STD"} size="small" variant="outlined" />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="bold" color={isExpired ? "error.main" : (isExpiringSoon ? "warning.main" : "text.primary")}>
                                                    {m.expiryDate ? formatDate(m.expiryDate) : "31/12/2027"}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {isExpired ? "Đã hết hạn" : `(Còn ${daysUntilExp} ngày)`}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <b>{formatCurrency(m.price)}</b>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={`${stock} ${unitLabel}`}
                                                    color={isLow ? "error" : "success"}
                                                    size="small"
                                                    sx={{ fontWeight: 700 }}
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                {isExpired ? (
                                                    <Chip label="HẾT HẠN - TIÊU HỦY" color="error" size="small" sx={{ fontWeight: 800 }} />
                                                ) : isExpiringSoon ? (
                                                    <Chip label="ƯU TIÊN XUẤT (FEFO)" color="warning" size="small" sx={{ fontWeight: 800 }} />
                                                ) : isLow ? (
                                                    <Chip label="SẮP HẾT TỒN KHO" color="error" size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                                                ) : (
                                                    <Chip label="AN TOÀN" color="success" size="small" variant="outlined" />
                                                )}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="primary"
                                                    startIcon={<AddShoppingCartIcon />}
                                                    onClick={() => handleOpenRestockModal(m)}
                                                    sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
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
                <Dialog open={openRestock} onClose={() => setOpenRestock(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                    <DialogTitle sx={{ fontWeight: "bold", color: "primary.main", borderBottom: "1px solid #E2E8F0" }}>
                        Nhập Thêm Lô Thuốc: {selectedMed.medicineName}
                    </DialogTitle>
                    <DialogContent sx={{ pt: 2.5 }}>
                        <Box sx={{ mb: 2.5, p: 2, bgcolor: "#F8FAFC", borderRadius: 2, border: "1px solid #E2E8F0" }}>
                            <Grid container spacing={1}>
                                <Grid item xs={6}><Typography variant="body2">Mã thuốc: <b>#MED-{selectedMed.medicineId}</b></Typography></Grid>
                                <Grid item xs={6}><Typography variant="body2">Hoạt chất: <b>{selectedMed.activeIngredient}</b></Typography></Grid>
                                <Grid item xs={6}>
                                    <Typography variant="body2">
                                        Tồn kho hiện tại: <b style={{ color: selectedMed.stockQuantity < 50 ? "#EF4444" : "#10B981" }}>
                                            {selectedMed.stockQuantity} {getUnitLabel(selectedMed.unit)}
                                        </b>
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}><Typography variant="body2">Lô hiện hành: <b>{selectedMed.batchNumber}</b></Typography></Grid>
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
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 2.5, borderTop: "1px solid #E2E8F0" }}>
                        <Button onClick={() => setOpenRestock(false)} variant="outlined" color="inherit">Hủy</Button>
                        <Button variant="contained" color="success" onClick={handleRestock} sx={{ fontWeight: 700, px: 3 }}>
                            Xác Nhận Nhập Kho (FEFO)
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </Container>
    );
}
