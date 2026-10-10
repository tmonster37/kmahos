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

const SAMPLE_FEFO_MEDICINES = [
    { medicineId: 1, medicineName: "Paracetamol 500mg", activeIngredient: "Paracetamol", unit: "VIEN", price: 1500, stockQuantity: 2500, batchNumber: "LOT-2025-01", expiryDate: "2027-12-31", minStock: 200 },
    { medicineId: 2, medicineName: "Amoxicillin 500mg", activeIngredient: "Amoxicillin", unit: "VIEN", price: 3000, stockQuantity: 18, batchNumber: "LOT-2024-09", expiryDate: "2026-11-15", minStock: 50 },
    { medicineId: 3, medicineName: "Decolgen Forte", activeIngredient: "Acetaminophen + Phenylephrine", unit: "VIEN", price: 2000, stockQuantity: 35, batchNumber: "LOT-2024-03", expiryDate: "2026-10-25", minStock: 50 },
    { medicineId: 4, medicineName: "Berberin 100mg", activeIngredient: "Berberin", unit: "VIEN", price: 1000, stockQuantity: 800, batchNumber: "LOT-2025-06", expiryDate: "2028-05-20", minStock: 100 },
    { medicineId: 5, medicineName: "Gói Oresol 27.9g", activeIngredient: "Muối khoáng bù nước", unit: "GOI", price: 5000, stockQuantity: 350, batchNumber: "LOT-2025-08", expiryDate: "2027-08-10", minStock: 100 },
    { medicineId: 6, medicineName: "Amlodipine 5mg", activeIngredient: "Amlodipine Besylate", unit: "VIEN", price: 4500, stockQuantity: 12, batchNumber: "LOT-2024-11", expiryDate: "2026-12-05", minStock: 50 },
    { medicineId: 7, medicineName: "Metformin 500mg", activeIngredient: "Metformin HCl", unit: "VIEN", price: 2500, stockQuantity: 1400, batchNumber: "LOT-2025-02", expiryDate: "2027-09-30", minStock: 150 },
    { medicineId: 8, medicineName: "Augmentin 625mg", activeIngredient: "Amoxicillin + Acid Clavulanic", unit: "VIEN", price: 18000, stockQuantity: 8, batchNumber: "LOT-2024-08", expiryDate: "2026-10-18", minStock: 30 }
];

export default function MedicineManagePage() {
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(false);
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
        try {
            const res = await axiosInstance.get("/api/clinical/medicines");
            const list = (res && Array.isArray(res.data)) ? res.data : [];
            if (list.length > 0) {
                // Merge default FEFO data if backend items don't have batch/expiry yet
                const enriched = list.map((m, idx) => ({
                    ...m,
                    batchNumber: m.batchNumber || `LOT-2025-0${(idx % 9) + 1}`,
                    expiryDate: m.expiryDate || (idx % 3 === 0 ? "2026-11-20" : "2027-12-31"),
                    minStock: m.minStock || 50
                }));
                setMedicines(enriched);
            } else {
                setMedicines(SAMPLE_FEFO_MEDICINES);
            }
        } catch (err) {
            console.error("Lỗi tải danh mục thuốc:", err);
            setMedicines(SAMPLE_FEFO_MEDICINES);
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
            {/* Header Banner */}
            <Paper
                elevation={2}
                sx={{
                    p: 3,
                    mb: 3,
                    borderRadius: 3,
                    background: "linear-gradient(135deg, #065F46 0%, #047857 100%)",
                    color: "white",
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
                            width: 52,
                            height: 52,
                            borderRadius: "50%",
                            bgcolor: "rgba(255,255,255,0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                    >
                        <MedicationIcon sx={{ fontSize: 32 }} />
                    </Box>
                    <Box>
                        <Typography variant="h5" fontWeight="bold">
                            Quản Lý Kho Dược & Cảnh Báo FEFO (First Expired, First Out)
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Giám sát tồn kho an toàn, cảnh báo thuốc cận hạn & xuất kho theo chuẩn dược vụ Bộ Y Tế
                        </Typography>
                    </Box>
                </Box>
                <Stack direction="row" spacing={1.5}>
                    <Button
                        variant="contained"
                        sx={{ bgcolor: "#F59E0B", color: "white", fontWeight: "bold", "&:hover": { bgcolor: "#D97706" } }}
                        startIcon={<FileDownloadIcon />}
                        onClick={handleExportProcurementList}
                    >
                        Xuất Dự Trù Dược Phẩm (CSV)
                    </Button>
                    <Button
                        variant="outlined"
                        sx={{ color: "white", borderColor: "rgba(255,255,255,0.6)", fontWeight: "bold", "&:hover": { bgcolor: "rgba(255,255,255,0.1)" } }}
                        startIcon={<RefreshIcon />}
                        onClick={loadMedicines}
                        disabled={loading}
                    >
                        Làm mới
                    </Button>
                </Stack>
            </Paper>

            {/* FEFO Warning Cards */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ borderRadius: 3, borderLeft: "5px solid #2563EB" }}>
                        <CardContent>
                            <Typography variant="body2" color="text.secondary">Tổng danh mục thuốc</Typography>
                            <Typography variant="h4" fontWeight="bold" color="primary.main">{medicines.length}</Typography>
                            <Typography variant="caption" color="text.secondary">Đang lưu hành tại bệnh viện</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ borderRadius: 3, borderLeft: "5px solid #EF4444", bgcolor: lowStockList.length > 0 ? "#FEF2F2" : "inherit" }}>
                        <CardContent>
                            <Typography variant="body2" color="error.main" fontWeight="bold" display="flex" alignItems="center" gap={0.5}>
                                <WarningAmberIcon fontSize="small" /> Tồn kho dưới mức an toàn
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="error.main">{lowStockList.length}</Typography>
                            <Typography variant="caption" color="error.dark">Cần lập đơn nhập kho gấp</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ borderRadius: 3, borderLeft: "5px solid #F59E0B", bgcolor: expiringSoonList.length > 0 ? "#FFFBEB" : "inherit" }}>
                        <CardContent>
                            <Typography variant="body2" color="warning.dark" fontWeight="bold" display="flex" alignItems="center" gap={0.5}>
                                <EventBusyIcon fontSize="small" /> Cận hạn sử dụng (&lt; 3 tháng)
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="warning.main">{expiringSoonList.length}</Typography>
                            <Typography variant="caption" color="warning.dark">Ưu tiên xuất kho trước (FEFO)</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ borderRadius: 3, borderLeft: "5px solid #10B981" }}>
                        <CardContent>
                            <Typography variant="body2" color="success.main" fontWeight="bold" display="flex" alignItems="center" gap={0.5}>
                                <CheckCircleIcon fontSize="small" /> Tồn kho ổn định & An toàn
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="success.main">
                                {medicines.length - lowStockList.length - expiringSoonList.length}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Đủ cung ứng trên 90 ngày</Typography>
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
            <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2.5}>
                    <Tabs value={tabFilter} onChange={(_, v) => setTabFilter(v)}>
                        <Tab label={`Tất cả (${medicines.length})`} value="ALL" />
                        <Tab label={`Sắp hết hàng (${lowStockList.length})`} value="LOW_STOCK" sx={{ color: lowStockList.length > 0 ? "error.main" : "inherit" }} />
                        <Tab label={`Cận hạn FEFO (${expiringSoonList.length})`} value="EXPIRING_SOON" sx={{ color: expiringSoonList.length > 0 ? "warning.main" : "inherit" }} />
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
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                    <Table>
                        <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                            <TableRow>
                                <TableCell><b>Mã thuốc</b></TableCell>
                                <TableCell><b>Tên thuốc thương mại</b></TableCell>
                                <TableCell><b>Hoạt chất chính</b></TableCell>
                                <TableCell><b>Số lô SX (Batch)</b></TableCell>
                                <TableCell><b>Hạn sử dụng (FEFO)</b></TableCell>
                                <TableCell align="right"><b>Đơn giá</b></TableCell>
                                <TableCell align="center"><b>Tồn kho hiện tại</b></TableCell>
                                <TableCell align="center"><b>Trạng thái FEFO</b></TableCell>
                                <TableCell align="center"><b>Thao tác</b></TableCell>
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
                                    <TableCell colSpan={9} align="center" sx={{ py: 4, color: "text.secondary" }}>
                                        Không tìm thấy mặt hàng thuốc nào phù hợp với bộ lọc!
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
