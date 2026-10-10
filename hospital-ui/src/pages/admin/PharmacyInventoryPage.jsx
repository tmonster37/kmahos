import React, { useState, useEffect, useMemo } from "react";
import {
    Container,
    Paper,
    Typography,
    Box,
    Grid,
    Card,
    CardContent,
    Button,
    Chip,
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
    TextField,
    CircularProgress,
    Divider,
    IconButton,
    Alert,
    Tooltip,
    Tabs,
    Tab,
    Stack,
    MenuItem,
    InputAdornment,
    LinearProgress
} from "@mui/material";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import MedicationIcon from "@mui/icons-material/Medication";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import PrintIcon from "@mui/icons-material/Print";
import SendIcon from "@mui/icons-material/Send";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import StorefrontIcon from "@mui/icons-material/Storefront";
import EmergencyIcon from "@mui/icons-material/LocalHospital";
import FilterListIcon from "@mui/icons-material/FilterList";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";

import pharmacyApi from "../../services/pharmacyApi";
import { formatCurrency, formatDate, formatDateTime } from "../../utils/formatters";

// Định nghĩa nhãn loại kho
const WAREHOUSE_TYPE_MAP = {
    CENTRAL_WAREHOUSE: { label: "Kho Chẵn (Kho Tổng)", color: "primary", icon: <Inventory2Icon /> },
    OUTPATIENT_PHARMACY: { label: "Kho Ngoại Trú", color: "info", icon: <StorefrontIcon /> },
    INPATIENT_PHARMACY: { label: "Kho Nội Trú", color: "secondary", icon: <MedicationIcon /> },
    DEPARTMENT_CABINET: { label: "Tủ Trực Cấp Cứu", color: "error", icon: <EmergencyIcon /> }
};

const TRANSFER_STATUS_MAP = {
    DRAFT: { label: "Bản nháp", color: "default" },
    IN_TRANSIT: { label: "Đang vận chuyển", color: "warning" },
    COMPLETED: { label: "Đã hoàn thành", color: "success" },
    CANCELLED: { label: "Đã hủy", color: "error" }
};

export default function PharmacyInventoryPage() {
    const [currentTab, setCurrentTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ type: "", message: "" });

    // Dữ liệu nghiệp vụ
    const [warehouses, setWarehouses] = useState([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
    const [stocks, setStocks] = useState([]);
    const [batches, setBatches] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [dispenses, setDispenses] = useState([]);
    const [expiringAlerts, setExpiringAlerts] = useState([]);
    const [lowStockAlerts, setLowStockAlerts] = useState([]);

    // Tìm kiếm & bộ lọc
    const [searchKeyword, setSearchKeyword] = useState("");

    // Dialog: Tạo kho mới
    const [openAddWarehouse, setOpenAddWarehouse] = useState(false);
    const [newWarehouse, setNewWarehouse] = useState({
        warehouseCode: "",
        warehouseName: "",
        warehouseType: "OUTPATIENT_PHARMACY",
        locationDescription: ""
    });

    // Dialog: Nhập lô thuốc mới
    const [openReceiveBatch, setOpenReceiveBatch] = useState(false);
    const [receiveData, setReceiveData] = useState({
        warehouseId: "",
        medicineId: 1,
        batchNumber: "",
        expiryDate: "",
        manufactureDate: "",
        quantityReceived: 500,
        unitImportPrice: 2000,
        unitSellingPrice: 3000,
        manufacturer: "Dược Hậu Giang (DHG Pharma)"
    });

    // Dialog: Lập phiếu điều chuyển kho
    const [openTransferDialog, setOpenTransferDialog] = useState(false);
    const [transferData, setTransferData] = useState({
        sourceWarehouseId: "",
        destinationWarehouseId: "",
        notes: "Điều chuyển định kỳ theo kế hoạch tuần",
        items: [
            { medicineId: 1, batchId: 1, requestedQuantity: 100 }
        ]
    });

    // Dialog: Cấp phát thuốc theo đơn (FEFO)
    const [openDispenseDialog, setOpenDispenseDialog] = useState(false);
    const [dispenseData, setDispenseData] = useState({
        prescriptionId: 1,
        warehouseId: "",
        notes: "Cấp phát thuốc cho người bệnh ngoại trú"
    });
    const [dispenseResult, setDispenseResult] = useState(null);

    // ==========================================
    // 1. TẢI DỮ LIỆU BAN ĐẦU
    // ==========================================
    const loadAllData = async () => {
        setLoading(true);
        try {
            // 1. Lấy danh sách kho
            const whRes = await pharmacyApi.getWarehouses();
            const whList = whRes?.data || whRes || [];
            setWarehouses(whList);

            const defaultWhId = whList.length > 0 ? whList[0].warehouseId : "";
            setSelectedWarehouseId(defaultWhId);

            // 2. Lấy tồn kho của kho đầu tiên
            if (defaultWhId) {
                const stockRes = await pharmacyApi.getWarehouseStock(defaultWhId);
                setStocks(stockRes?.data || stockRes || []);
            }

            // 3. Lấy danh sách Lô thuốc
            const batchRes = await pharmacyApi.getBatches();
            setBatches(batchRes?.data || batchRes || []);

            // 4. Lấy danh sách Phiếu điều chuyển
            const transRes = await pharmacyApi.getTransfers();
            setTransfers(transRes?.data || transRes || []);

            // 5. Lấy danh sách Lịch sử cấp phát
            const dispRes = await pharmacyApi.getDispenses();
            setDispenses(dispRes?.data || dispRes || []);

            // 6. Lấy cảnh báo
            const expRes = await pharmacyApi.getExpiringAlerts(90);
            setExpiringAlerts(expRes?.data || expRes || []);

            const lowRes = await pharmacyApi.getLowStockAlerts();
            setLowStockAlerts(lowRes?.data || lowRes || []);

        } catch (err) {
            console.error("Lỗi tải dữ liệu kho dược:", err);
            setFeedback({ type: "error", message: err.message || "Không thể tải dữ liệu kho dược từ máy chủ." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllData();
    }, []);

    // Khi chọn kho khác ở Tab 0
    const handleSelectWarehouse = async (whId) => {
        setSelectedWarehouseId(whId);
        setLoading(true);
        try {
            const stockRes = await pharmacyApi.getWarehouseStock(whId);
            setStocks(stockRes?.data || stockRes || []);
        } catch (err) {
            console.error("Lỗi tải tồn kho:", err);
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // 2. XỬ LÝ NGHIỆP VỤ: THÊM KHO
    // ==========================================
    const handleCreateWarehouse = async () => {
        if (!newWarehouse.warehouseCode || !newWarehouse.warehouseName) {
            setFeedback({ type: "warning", message: "Vui lòng nhập đầy đủ Mã kho và Tên kho." });
            return;
        }
        try {
            await pharmacyApi.createWarehouse(newWarehouse);
            setFeedback({ type: "success", message: "Thêm kho dược mới thành công!" });
            setOpenAddWarehouse(false);
            setNewWarehouse({ warehouseCode: "", warehouseName: "", warehouseType: "OUTPATIENT_PHARMACY", locationDescription: "" });
            loadAllData();
        } catch (err) {
            setFeedback({ type: "error", message: err.message || "Không thể tạo kho mới." });
        }
    };

    // ==========================================
    // 3. XỬ LÝ NGHIỆP VỤ: NHẬP LÔ THUỐC MỚI
    // ==========================================
    const handleReceiveBatch = async () => {
        if (!receiveData.warehouseId || !receiveData.batchNumber || !receiveData.expiryDate) {
            setFeedback({ type: "warning", message: "Vui lòng chọn Kho, nhập Số lô và Hạn dùng." });
            return;
        }
        try {
            await pharmacyApi.receiveGoodsBatch(receiveData);
            setFeedback({ type: "success", message: `Đã nhập thành công Lô ${receiveData.batchNumber} vào kho!` });
            setOpenReceiveBatch(false);
            loadAllData();
        } catch (err) {
            setFeedback({ type: "error", message: err.message || "Lỗi khi nhập hàng theo lô." });
        }
    };

    // ==========================================
    // 4. XỬ LÝ NGHIỆP VỤ: ĐIỀU CHUYỂN KHO NỘI BỘ
    // ==========================================
    const handleCreateTransfer = async () => {
        if (!transferData.sourceWarehouseId || !transferData.destinationWarehouseId) {
            setFeedback({ type: "warning", message: "Vui lòng chọn Kho xuất và Kho đích." });
            return;
        }
        if (transferData.sourceWarehouseId === transferData.destinationWarehouseId) {
            setFeedback({ type: "warning", message: "Kho xuất và Kho nhận không được trùng nhau." });
            return;
        }

        let batchId = transferData.items[0]?.batchId;
        const medId = transferData.items[0]?.medicineId || 1;
        if (!batchId || typeof batchId === "number") {
            const foundBatch = batches.find(b => b.medicineId === medId);
            batchId = foundBatch ? foundBatch.batchId : (batches[0]?.batchId);
        }

        const payload = {
            fromWarehouseId: transferData.sourceWarehouseId,
            toWarehouseId: transferData.destinationWarehouseId,
            reason: transferData.notes || "Điều chuyển kho nội bộ",
            items: [
                {
                    medicineId: medId,
                    batchId: batchId,
                    quantity: Number(transferData.items[0]?.requestedQuantity || 100),
                    notes: "Điều chuyển kho"
                }
            ]
        };

        try {
            await pharmacyApi.createTransfer(payload);
            setFeedback({ type: "success", message: "Đã lập phiếu điều chuyển kho nội bộ thành công!" });
            setOpenTransferDialog(false);
            loadAllData();
        } catch (err) {
            setFeedback({ type: "error", message: err.message || "Lỗi khi lập phiếu điều chuyển." });
        }
    };

    const handleSendTransfer = async (id) => {
        try {
            await pharmacyApi.sendTransfer(id);
            setFeedback({ type: "success", message: "Đã xuất kho và chuyển sang trạng thái Đang vận chuyển." });
            loadAllData();
        } catch (err) {
            setFeedback({ type: "error", message: err.message || "Lỗi khi xuất kho vận chuyển." });
        }
    };

    const handleApproveTransfer = async (id) => {
        try {
            await pharmacyApi.approveTransfer(id);
            setFeedback({ type: "success", message: "Kho đích đã duyệt nhập kho thành công!" });
            loadAllData();
        } catch (err) {
            setFeedback({ type: "error", message: err.message || "Lỗi khi duyệt nhập kho." });
        }
    };

    // ==========================================
    // 5. XỬ LÝ NGHIỆP VỤ: CẤP PHÁT THUỐC FEFO
    // ==========================================
    const handleDispenseFefo = async () => {
        if (!dispenseData.warehouseId || !dispenseData.prescriptionId) {
            setFeedback({ type: "warning", message: "Vui lòng chọn Kho cấp phát và nhập Mã đơn thuốc." });
            return;
        }
        try {
            const res = await pharmacyApi.dispensePrescription(dispenseData);
            setDispenseResult(res?.data || res);
            setFeedback({ type: "success", message: "Đã tự động trích xuất thuốc theo chuẩn FEFO thành công!" });
            loadAllData();
        } catch (err) {
            setFeedback({ type: "error", message: err.message || "Không thể cấp phát đơn thuốc." });
        }
    };

    // Lọc tồn kho theo từ khóa
    const filteredStocks = useMemo(() => {
        if (!searchKeyword.trim()) return stocks;
        const kw = searchKeyword.toLowerCase();
        return stocks.filter(s =>
            (s.medicineName && s.medicineName.toLowerCase().includes(kw)) ||
            (s.batchNumber && s.batchNumber.toLowerCase().includes(kw)) ||
            (s.activeIngredient && s.activeIngredient.toLowerCase().includes(kw))
        );
    }, [stocks, searchKeyword]);

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* Header Tiêu Đề */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: "12px",
                                background: "linear-gradient(135deg, #0088D6 0%, #00C292 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                boxShadow: "0 6px 16px rgba(0, 136, 214, 0.3)"
                            }}
                        >
                            <Inventory2Icon sx={{ fontSize: 26 }} />
                        </Box>
                        <Box>
                            <Typography variant="h5" fontWeight="800" color="#1E293B">
                                Quản Lý Kho Dược Đa Cấp & FEFO
                            </Typography>
                            <Typography variant="body2" color="#64748B">
                                Kiến trúc Kho chẵn $\rightarrow$ Kho lẻ $\rightarrow$ Tủ trực cấp cứu & Thuật toán xuất kho FEFO (Bahmni + Odoo ERP)
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                <Stack direction="row" spacing={1.5}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadAllData}
                        sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                    >
                        Làm Mới
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddCircleIcon />}
                        onClick={() => {
                            setReceiveData(prev => ({ ...prev, warehouseId: selectedWarehouseId || (warehouses[0]?.warehouseId || "") }));
                            setOpenReceiveBatch(true);
                        }}
                        sx={{
                            borderRadius: 2,
                            fontWeight: 700,
                            textTransform: "none",
                            background: "linear-gradient(135deg, #0088D6 0%, #00C292 100%)",
                            boxShadow: "0 4px 12px rgba(0, 136, 214, 0.25)"
                        }}
                    >
                        Nhập Lô Mới
                    </Button>
                    <Button
                        variant="outlined"
                        color="secondary"
                        startIcon={<SwapHorizIcon />}
                        onClick={() => {
                            setTransferData(prev => ({
                                ...prev,
                                sourceWarehouseId: warehouses[0]?.warehouseId || "",
                                destinationWarehouseId: warehouses[1]?.warehouseId || ""
                            }));
                            setOpenTransferDialog(true);
                        }}
                        sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                    >
                        Điều Chuyển Kho
                    </Button>
                    <Button
                        variant="contained"
                        color="success"
                        startIcon={<AssignmentTurnedInIcon />}
                        onClick={() => {
                            setDispenseData(prev => ({
                                ...prev,
                                warehouseId: warehouses.find(w => w.warehouseType === "OUTPATIENT_PHARMACY")?.warehouseId || selectedWarehouseId
                            }));
                            setDispenseResult(null);
                            setOpenDispenseDialog(true);
                        }}
                        sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                    >
                        Cấp Phát FEFO
                    </Button>
                </Stack>
            </Box>

            {/* Thông báo Feedback */}
            {feedback.message && (
                <Alert
                    severity={feedback.type || "info"}
                    onClose={() => setFeedback({ type: "", message: "" })}
                    sx={{ mb: 2.5, borderRadius: 2 }}
                >
                    {feedback.message}
                </Alert>
            )}

            {/* Thanh điều hướng Tabs */}
            <Paper elevation={0} sx={{ borderRadius: 3, mb: 3, border: "1px solid #E2E8F0" }}>
                <Tabs
                    value={currentTab}
                    onChange={(e, val) => setCurrentTab(val)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        px: 2,
                        "& .MuiTab-root": { fontWeight: 700, fontSize: "0.9rem", py: 2, textTransform: "none" },
                        "& .Mui-selected": { color: "#0088D6" }
                    }}
                >
                    <Tab icon={<Inventory2Icon />} iconPosition="start" label="1. Sơ Đồ Kho & Tồn Kho Từng Cấp" />
                    <Tab icon={<MedicationIcon />} iconPosition="start" label={`2. Quản Lý Lô Thuốc (${batches.length})`} />
                    <Tab icon={<LocalShippingIcon />} iconPosition="start" label={`3. Điều Chuyển Kho (${transfers.length})`} />
                    <Tab icon={<AssignmentTurnedInIcon />} iconPosition="start" label={`4. Lịch Sử Cấp Phát (${dispenses.length})`} />
                    <Tab
                        icon={<WarningAmberIcon />}
                        iconPosition="start"
                        label={`5. Cảnh Báo Dược (${expiringAlerts.length + lowStockAlerts.length})`}
                        sx={{ color: (expiringAlerts.length + lowStockAlerts.length) > 0 ? "#E11D48 !important" : "inherit" }}
                    />
                </Tabs>
            </Paper>

            {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

            {/* ============================================================== */}
            {/* TAB 0: SƠ ĐỒ KHO & TỒN KHO TỪNG CẤP                           */}
            {/* ============================================================== */}
            {currentTab === 0 && (
                <Box>
                    {/* Thẻ 4 cấp độ kho */}
                    <Typography variant="subtitle1" fontWeight="800" color="#1E293B" mb={1.5}>
                        HỆ THỐNG KHO DƯỢC ĐA CẤP (CHỌN KHO ĐỂ XEM TỒN THEO LÔ):
                    </Typography>
                    <Grid container spacing={2} mb={3}>
                        {warehouses.map((wh) => {
                            const isSelected = wh.warehouseId === selectedWarehouseId;
                            const meta = WAREHOUSE_TYPE_MAP[wh.warehouseType] || { label: wh.warehouseType, color: "default", icon: <StorefrontIcon /> };
                            return (
                                <Grid item xs={12} sm={6} md={3} key={wh.warehouseId}>
                                    <Card
                                        onClick={() => handleSelectWarehouse(wh.warehouseId)}
                                        sx={{
                                            cursor: "pointer",
                                            borderRadius: 3,
                                            border: isSelected ? "2px solid #0088D6" : "1px solid #E2E8F0",
                                            bgcolor: isSelected ? "#F0F9FF" : "#FFFFFF",
                                            transition: "all 0.2s ease-in-out",
                                            transform: isSelected ? "translateY(-2px)" : "none",
                                            boxShadow: isSelected ? "0 8px 20px rgba(0, 136, 214, 0.15)" : "none",
                                            "&:hover": { borderColor: "#0088D6", transform: "translateY(-2px)" }
                                        }}
                                    >
                                        <CardContent sx={{ p: 2.2 }}>
                                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                                <Chip
                                                    label={meta.label}
                                                    color={meta.color}
                                                    size="small"
                                                    icon={meta.icon}
                                                    sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                                                />
                                                <Chip label={wh.warehouseCode} size="small" variant="outlined" sx={{ fontWeight: 800 }} />
                                            </Box>
                                            <Typography variant="h6" fontWeight="800" color="#0F172A" noWrap>
                                                {wh.warehouseName}
                                            </Typography>
                                            <Typography variant="caption" color="#64748B" display="block" mt={0.5}>
                                                {wh.locationDescription || "Khu vực kho chuyên dụng"}
                                            </Typography>
                                            <Typography variant="caption" color="#0088D6" fontWeight="700" display="block" mt={1}>
                                                Dược sĩ quản lý: {wh.pharmacistName || "DS. Nguyễn Văn Minh"}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}

                        {/* Nút thêm kho mới */}
                        <Grid item xs={12} sm={6} md={3}>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={() => setOpenAddWarehouse(true)}
                                sx={{
                                    height: "100%",
                                    minHeight: 120,
                                    borderRadius: 3,
                                    borderStyle: "dashed",
                                    borderWidth: 2,
                                    color: "#64748B",
                                    borderColor: "#CBD5E1",
                                    "&:hover": { borderColor: "#0088D6", color: "#0088D6", bgcolor: "#F0F9FF" }
                                }}
                                startIcon={<AddCircleIcon />}
                            >
                                Thêm Kho Mới
                            </Button>
                        </Grid>
                    </Grid>

                    {/* Bảng tồn kho chi tiết theo lô của Kho đang chọn */}
                    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #E2E8F0" }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1.5}>
                            <Box>
                                <Typography variant="h6" fontWeight="800" color="#1E293B">
                                    Danh Sách Thuốc & Tồn Kho Theo Lô - FEFO
                                </Typography>
                                <Typography variant="caption" color="#64748B">
                                    Kho hiện tại: <strong>{warehouses.find(w => w.warehouseId === selectedWarehouseId)?.warehouseName || "Chưa chọn"}</strong>
                                </Typography>
                            </Box>

                            <TextField
                                size="small"
                                placeholder="Tìm theo tên thuốc, số lô, hoạt chất..."
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                sx={{ width: { xs: "100%", sm: 320 } }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" sx={{ color: "#94A3B8" }} />
                                        </InputAdornment>
                                    )
                                }}
                            />
                        </Box>

                        <TableContainer sx={{ maxHeight: 520 }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow sx={{ "& th": { bgcolor: "#F8FAFC", fontWeight: 800, color: "#334155" } }}>
                                        <TableCell>STT</TableCell>
                                        <TableCell>Thuốc / Dược Phẩm</TableCell>
                                        <TableCell>Hoạt Chất</TableCell>
                                        <TableCell>ĐVT</TableCell>
                                        <TableCell>Số Lô (Lot/Batch)</TableCell>
                                        <TableCell>Hạn Dùng (Expiry)</TableCell>
                                        <TableCell align="right">Tồn Thực Tế</TableCell>
                                        <TableCell align="right">Đã Giữ</TableCell>
                                        <TableCell align="right">Khả Dụng</TableCell>
                                        <TableCell align="right">Ngưỡng Tối Thiểu</TableCell>
                                        <TableCell align="center">Trạng Thái FEFO</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredStocks.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={11} align="center" sx={{ py: 4, color: "#64748B" }}>
                                                {loading ? "Đang tải dữ liệu tồn kho..." : "Không có thuốc nào trong kho này."}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredStocks.map((s, idx) => {
                                            const isExpiringSoon = s.daysUntilExpiry != null && s.daysUntilExpiry <= 90;
                                            const isLowStock = s.availableQuantity <= s.minimumThreshold;

                                            return (
                                                <TableRow key={s.stockId || idx} hover>
                                                    <TableCell>{idx + 1}</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: "#0F172A" }}>
                                                        {s.medicineName}
                                                    </TableCell>
                                                    <TableCell>{s.activeIngredient || "-"}</TableCell>
                                                    <TableCell>{s.unit || "Viên"}</TableCell>
                                                    <TableCell>
                                                        <Chip label={s.batchNumber} size="small" sx={{ fontWeight: 800, bgcolor: "#E2E8F0" }} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontWeight: isExpiringSoon ? 800 : 500,
                                                                color: isExpiringSoon ? "#E11D48" : "inherit"
                                                            }}
                                                        >
                                                            {formatDate(s.expiryDate)}
                                                            {isExpiringSoon && (
                                                                <Typography variant="caption" display="block" color="#E11D48">
                                                                    (Còn {s.daysUntilExpiry} ngày)
                                                                </Typography>
                                                            )}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                                                        {s.quantityOnHand?.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ color: "#64748B" }}>
                                                        {s.quantityReserved?.toLocaleString() || 0}
                                                    </TableCell>
                                                    <TableCell
                                                        align="right"
                                                        sx={{
                                                            fontWeight: 800,
                                                            color: isLowStock ? "#D97706" : "#059669"
                                                        }}
                                                    >
                                                        {s.availableQuantity?.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ color: "#64748B" }}>
                                                        {s.minimumThreshold?.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        {isExpiringSoon ? (
                                                            <Chip label="CẬN HẠN DÙNG" size="small" color="error" sx={{ fontWeight: 800 }} />
                                                        ) : isLowStock ? (
                                                            <Chip label="SẮP HẾT HÀNG" size="small" color="warning" sx={{ fontWeight: 800 }} />
                                                        ) : (
                                                            <Chip label="AN TOÀN" size="small" color="success" sx={{ fontWeight: 800 }} />
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Box>
            )}

            {/* ============================================================== */}
            {/* TAB 1: QUẢN LÝ LÔ THUỐC & NHẬP HÀNG MỚI                        */}
            {/* ============================================================== */}
            {currentTab === 1 && (
                <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #E2E8F0" }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Box>
                            <Typography variant="h6" fontWeight="800" color="#1E293B">
                                Danh Sách Lô Thuốc Toàn Bệnh Viện (Medicine Batches)
                            </Typography>
                            <Typography variant="caption" color="#64748B">
                                Mỗi lô thuốc quản lý độc lập ngày sản xuất, hạn sử dụng và giá vốn
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            startIcon={<AddCircleIcon />}
                            onClick={() => {
                                setReceiveData(prev => ({ ...prev, warehouseId: selectedWarehouseId || warehouses[0]?.warehouseId }));
                                setOpenReceiveBatch(true);
                            }}
                            sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                        >
                            Nhập Lô Thuốc Mới
                        </Button>
                    </Box>

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ "& th": { bgcolor: "#F8FAFC", fontWeight: 800, color: "#334155" } }}>
                                    <TableCell>STT</TableCell>
                                    <TableCell>Số Lô (Lot Number)</TableCell>
                                    <TableCell>Tên Thuốc</TableCell>
                                    <TableCell>Nhà Sản Xuất</TableCell>
                                    <TableCell>Ngày Sản Xuất</TableCell>
                                    <TableCell>Hạn Dùng</TableCell>
                                    <TableCell align="right">Giá Nhập</TableCell>
                                    <TableCell align="right">Giá Bán</TableCell>
                                    <TableCell align="right">Tồn Tổng Hiện Tại</TableCell>
                                    <TableCell align="center">Trạng Thái Lô</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {batches.map((b, idx) => (
                                    <TableRow key={b.batchId || idx} hover>
                                        <TableCell>{idx + 1}</TableCell>
                                        <TableCell sx={{ fontWeight: 800, color: "#0088D6" }}>
                                            {b.batchNumber}
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>{b.medicineName}</TableCell>
                                        <TableCell>{b.manufacturer || "DHG Pharma"}</TableCell>
                                        <TableCell>{formatDate(b.manufactureDate) || "-"}</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: "#D97706" }}>
                                            {formatDate(b.expiryDate)}
                                        </TableCell>
                                        <TableCell align="right">{formatCurrency(b.unitImportPrice)}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: "#059669" }}>
                                            {formatCurrency(b.unitSellingPrice)}
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                                            {b.currentQuantity?.toLocaleString()}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={b.status === "ACTIVE" ? "ĐANG SỬ DỤNG" : "NGỪNG DÙNG"}
                                                size="small"
                                                color={b.status === "ACTIVE" ? "success" : "default"}
                                                sx={{ fontWeight: 800 }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* ============================================================== */}
            {/* TAB 2: ĐIỀU CHUYỂN KHO NỘI BỘ (STOCK TRANSFERS)                */}
            {/* ============================================================== */}
            {currentTab === 2 && (
                <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #E2E8F0" }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Box>
                            <Typography variant="h6" fontWeight="800" color="#1E293B">
                                Phiếu Điều Chuyển Kho Dược Nội Bộ
                            </Typography>
                            <Typography variant="caption" color="#64748B">
                                Tuyến luân chuyển: Kho tổng $\rightarrow$ Kho lẻ ngoại trú / nội trú $\rightarrow$ Tủ trực cấp cứu
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            color="secondary"
                            startIcon={<SwapHorizIcon />}
                            onClick={() => setOpenTransferDialog(true)}
                            sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                        >
                            Lập Phiếu Điều Chuyển Mới
                        </Button>
                    </Box>

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ "& th": { bgcolor: "#F8FAFC", fontWeight: 800, color: "#334155" } }}>
                                    <TableCell>Mã Phiếu</TableCell>
                                    <TableCell>Kho Xuất (Nguồn)</TableCell>
                                    <TableCell>Kho Nhận (Đích)</TableCell>
                                    <TableCell>Ngày Lập</TableCell>
                                    <TableCell>Người Lập Phiếu</TableCell>
                                    <TableCell>Số Mục Thuốc</TableCell>
                                    <TableCell align="center">Trạng Thái</TableCell>
                                    <TableCell align="center">Hành Động Nghiệp Vụ</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {transfers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 3, color: "#64748B" }}>
                                            Chưa có phiếu điều chuyển nào.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    transfers.map((t) => {
                                        const statusMeta = TRANSFER_STATUS_MAP[t.status] || { label: t.status, color: "default" };
                                        return (
                                            <TableRow key={t.transferId} hover>
                                                <TableCell sx={{ fontWeight: 800, color: "#0088D6" }}>
                                                    {t.transferCode}
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>{t.sourceWarehouseName}</TableCell>
                                                <TableCell sx={{ fontWeight: 700, color: "#059669" }}>
                                                    {t.destinationWarehouseName}
                                                </TableCell>
                                                <TableCell>{formatDateTime(t.createdAt)}</TableCell>
                                                <TableCell>{t.createdByName || "Dược sĩ"}</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>
                                                    {t.items?.length || 1} loại thuốc
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={statusMeta.label}
                                                        size="small"
                                                        color={statusMeta.color}
                                                        sx={{ fontWeight: 800 }}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={1} justifyContent="center">
                                                        {t.status === "DRAFT" && (
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                color="warning"
                                                                startIcon={<SendIcon />}
                                                                onClick={() => handleSendTransfer(t.transferId)}
                                                                sx={{ textTransform: "none", fontWeight: 700 }}
                                                            >
                                                                Xuất Kho
                                                            </Button>
                                                        )}
                                                        {t.status === "IN_TRANSIT" && (
                                                            <Button
                                                                size="small"
                                                                variant="contained"
                                                                color="success"
                                                                startIcon={<DoneAllIcon />}
                                                                onClick={() => handleApproveTransfer(t.transferId)}
                                                                sx={{ textTransform: "none", fontWeight: 700 }}
                                                            >
                                                                Duyệt Nhập Kho
                                                            </Button>
                                                        )}
                                                        {t.status === "COMPLETED" && (
                                                            <Chip
                                                                icon={<CheckCircleIcon />}
                                                                label="Đã Nhận Hàng"
                                                                size="small"
                                                                color="success"
                                                                variant="outlined"
                                                            />
                                                        )}
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* ============================================================== */}
            {/* TAB 3: LỊCH SỬ CẤP PHÁT THUỐC FEFO                             */}
            {/* ============================================================== */}
            {currentTab === 3 && (
                <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #E2E8F0" }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Box>
                            <Typography variant="h6" fontWeight="800" color="#1E293B">
                                Nhật Ký Cấp Phát Thuốc Theo Đơn - Thuật Toán FEFO
                            </Typography>
                            <Typography variant="caption" color="#64748B">
                                Mọi viên thuốc cấp phát cho bệnh nhân đều được lưu vết xuất từ Số lô nào và Hạn dùng nào
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<AssignmentTurnedInIcon />}
                            onClick={() => {
                                setDispenseData(prev => ({
                                    ...prev,
                                    warehouseId: warehouses.find(w => w.warehouseType === "OUTPATIENT_PHARMACY")?.warehouseId || selectedWarehouseId
                                }));
                                setDispenseResult(null);
                                setOpenDispenseDialog(true);
                            }}
                            sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                        >
                            Cấp Phát Đơn Mới (FEFO)
                        </Button>
                    </Box>

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ "& th": { bgcolor: "#F8FAFC", fontWeight: 800, color: "#334155" } }}>
                                    <TableCell>Mã Cấp Phát</TableCell>
                                    <TableCell>Mã Đơn</TableCell>
                                    <TableCell>Bệnh Nhân</TableCell>
                                    <TableCell>Kho Xuất</TableCell>
                                    <TableCell>Thời Gian</TableCell>
                                    <TableCell>Dược Sĩ Cấp</TableCell>
                                    <TableCell align="right">Tổng Tiền</TableCell>
                                    <TableCell align="center">Trạng Thái</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {dispenses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 3, color: "#64748B" }}>
                                            Chưa có phiếu cấp phát nào.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    dispenses.map((d) => (
                                        <TableRow key={d.dispenseId} hover>
                                            <TableCell sx={{ fontWeight: 800, color: "#0088D6" }}>
                                                {d.dispenseCode}
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>
                                                #{d.prescriptionId}
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>{d.patientName}</TableCell>
                                            <TableCell>{d.warehouseName}</TableCell>
                                            <TableCell>{formatDateTime(d.dispensedAt)}</TableCell>
                                            <TableCell>{d.dispensedByName || "Dược sĩ"}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800, color: "#059669" }}>
                                                {formatCurrency(d.totalAmount)}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label="ĐÃ CẤP PHÁT (FEFO)"
                                                    size="small"
                                                    color="success"
                                                    sx={{ fontWeight: 800 }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* ============================================================== */}
            {/* TAB 4: TRUNG TÂM CẢNH BÁO DƯỢC                                  */}
            {/* ============================================================== */}
            {currentTab === 4 && (
                <Grid container spacing={3}>
                    {/* Cảnh báo thuốc cận date */}
                    <Grid item xs={12} md={6}>
                        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #FECDD3", bgcolor: "#FFF1F2" }}>
                            <Box display="flex" alignItems="center" gap={1.2} mb={2}>
                                <EventBusyIcon sx={{ color: "#E11D48", fontSize: 26 }} />
                                <Box>
                                    <Typography variant="h6" fontWeight="800" color="#9F1239">
                                        Cảnh Báo Thuốc Sắp Hết Hạn (&lt; 90 Ngày)
                                    </Typography>
                                    <Typography variant="caption" color="#BE123C">
                                        Ưu tiên xuất theo FEFO hoặc lập biên bản thanh lý/đổi trả nhà cung ứng
                                    </Typography>
                                </Box>
                            </Box>

                            <TableContainer sx={{ bgcolor: "#FFFFFF", borderRadius: 2 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ "& th": { bgcolor: "#FFE4E6", fontWeight: 800, color: "#9F1239" } }}>
                                            <TableCell>Thuốc</TableCell>
                                            <TableCell>Kho</TableCell>
                                            <TableCell>Số Lô</TableCell>
                                            <TableCell>Hạn Dùng</TableCell>
                                            <TableCell align="right">Tồn Còn</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {expiringAlerts.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center" sx={{ py: 3, color: "#64748B" }}>
                                                    Không có thuốc nào cận hạn sử dụng. Rất an toàn!
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            expiringAlerts.map((a, idx) => (
                                                <TableRow key={idx} hover>
                                                    <TableCell sx={{ fontWeight: 700 }}>{a.medicineName}</TableCell>
                                                    <TableCell>{a.warehouseName}</TableCell>
                                                    <TableCell>
                                                        <Chip label={a.batchNumber} size="small" color="error" variant="outlined" sx={{ fontWeight: 800 }} />
                                                    </TableCell>
                                                    <TableCell sx={{ fontWeight: 800, color: "#E11D48" }}>
                                                        {formatDate(a.expiryDate)}
                                                        <Typography variant="caption" display="block">
                                                            (Còn {a.daysUntilExpiry} ngày)
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                                                        {a.quantityOnHand?.toLocaleString()}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>

                    {/* Cảnh báo thuốc dưới mức tồn tối thiểu */}
                    <Grid item xs={12} md={6}>
                        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #FED7AA", bgcolor: "#FFFBEB" }}>
                            <Box display="flex" alignItems="center" gap={1.2} mb={2}>
                                <WarningAmberIcon sx={{ color: "#D97706", fontSize: 26 }} />
                                <Box>
                                    <Typography variant="h6" fontWeight="800" color="#92400E">
                                        Cảnh Báo Tồn Kho Dưới Ngưỡng An Toàn
                                    </Typography>
                                    <Typography variant="caption" color="#B45309">
                                        Cần điều chuyển bổ sung từ Kho tổng hoặc lập phiếu nhập hàng gấp
                                    </Typography>
                                </Box>
                            </Box>

                            <TableContainer sx={{ bgcolor: "#FFFFFF", borderRadius: 2 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ "& th": { bgcolor: "#FEF3C7", fontWeight: 800, color: "#92400E" } }}>
                                            <TableCell>Thuốc</TableCell>
                                            <TableCell>Kho Cần Bổ Sung</TableCell>
                                            <TableCell align="right">Khả Dụng</TableCell>
                                            <TableCell align="right">Ngưỡng An Toàn</TableCell>
                                            <TableCell align="center">Hành Động</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {lowStockAlerts.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center" sx={{ py: 3, color: "#64748B" }}>
                                                    Mọi loại thuốc đều đạt trên mức tồn tối thiểu.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            lowStockAlerts.map((l, idx) => (
                                                <TableRow key={idx} hover>
                                                    <TableCell sx={{ fontWeight: 700 }}>{l.medicineName}</TableCell>
                                                    <TableCell>{l.warehouseName}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 800, color: "#DC2626" }}>
                                                        {l.availableQuantity?.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ color: "#64748B" }}>
                                                        {l.minimumThreshold?.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            color="warning"
                                                            startIcon={<SwapHorizIcon />}
                                                            onClick={() => {
                                                                setCurrentTab(2);
                                                                setOpenTransferDialog(true);
                                                            }}
                                                            sx={{ textTransform: "none", fontWeight: 700 }}
                                                        >
                                                            Điều Chuyển Ngay
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* ============================================================== */}
            {/* MODAL 1: THÊM KHO MỚI                                          */}
            {/* ============================================================== */}
            <Dialog open={openAddWarehouse} onClose={() => setOpenAddWarehouse(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>Thêm Kho Dược Mới Vào Hệ Thống</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ pt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Mã Kho (Ví dụ: WH_ER_02)"
                                value={newWarehouse.warehouseCode}
                                onChange={(e) => setNewWarehouse({ ...newWarehouse, warehouseCode: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                fullWidth
                                label="Loại Cấp Độ Kho"
                                value={newWarehouse.warehouseType}
                                onChange={(e) => setNewWarehouse({ ...newWarehouse, warehouseType: e.target.value })}
                            >
                                <MenuItem value="CENTRAL_WAREHOUSE">Kho Chẵn (Kho Tổng)</MenuItem>
                                <MenuItem value="OUTPATIENT_PHARMACY">Kho Lẻ Ngoại Trú</MenuItem>
                                <MenuItem value="INPATIENT_PHARMACY">Kho Lẻ Nội Trú</MenuItem>
                                <MenuItem value="DEPARTMENT_CABINET">Tủ Trực Cấp Cứu</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Tên Kho Dược"
                                value={newWarehouse.warehouseName}
                                onChange={(e) => setNewWarehouse({ ...newWarehouse, warehouseName: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label="Vị Trí & Mô Tả"
                                value={newWarehouse.locationDescription}
                                onChange={(e) => setNewWarehouse({ ...newWarehouse, locationDescription: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenAddWarehouse(false)} sx={{ fontWeight: 700 }}>Hủy Bỏ</Button>
                    <Button variant="contained" onClick={handleCreateWarehouse} sx={{ fontWeight: 700 }}>Lưu Kho Mới</Button>
                </DialogActions>
            </Dialog>

            {/* ============================================================== */}
            {/* MODAL 2: NHẬP LÔ THUỐC MỚI                                     */}
            {/* ============================================================== */}
            <Dialog open={openReceiveBatch} onClose={() => setOpenReceiveBatch(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>Nhập Lô Thuốc Mới Vào Kho (Goods Receipt)</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ pt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                fullWidth
                                label="Kho Nhập Hàng"
                                value={receiveData.warehouseId}
                                onChange={(e) => setReceiveData({ ...receiveData, warehouseId: e.target.value })}
                            >
                                {warehouses.map(w => (
                                    <MenuItem key={w.warehouseId} value={w.warehouseId}>
                                        {w.warehouseName} ({w.warehouseCode})
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                fullWidth
                                label="Thuốc Cần Nhập"
                                value={receiveData.medicineId}
                                onChange={(e) => setReceiveData({ ...receiveData, medicineId: Number(e.target.value) })}
                            >
                                <MenuItem value={1}>Paracetamol 500mg (Viên)</MenuItem>
                                <MenuItem value={2}>Amoxicillin 500mg (Viên)</MenuItem>
                                <MenuItem value={3}>Decolgen Forte (Viên)</MenuItem>
                                <MenuItem value={4}>Berberin 100mg (Viên)</MenuItem>
                                <MenuItem value={5}>Gói Oresol 27.9g (Gói)</MenuItem>
                                <MenuItem value={6}>Amlodipine 5mg (Viên)</MenuItem>
                                <MenuItem value={7}>Metformin 500mg (Viên)</MenuItem>
                                <MenuItem value={8}>Augmentin 625mg (Viên)</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Số Lô (Lot/Batch Number)"
                                placeholder="Ví dụ: LOT-2026-DHG-01"
                                value={receiveData.batchNumber}
                                onChange={(e) => setReceiveData({ ...receiveData, batchNumber: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="Hạn Dùng (Expiry Date - Bắt Buộc Cho FEFO)"
                                InputLabelProps={{ shrink: true }}
                                value={receiveData.expiryDate}
                                onChange={(e) => setReceiveData({ ...receiveData, expiryDate: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                type="date"
                                label="Ngày Sản Xuất"
                                InputLabelProps={{ shrink: true }}
                                value={receiveData.manufactureDate}
                                onChange={(e) => setReceiveData({ ...receiveData, manufactureDate: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Số Lượng Nhập"
                                value={receiveData.quantityReceived}
                                onChange={(e) => setReceiveData({ ...receiveData, quantityReceived: Number(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                label="Nhà Sản Xuất"
                                value={receiveData.manufacturer}
                                onChange={(e) => setReceiveData({ ...receiveData, manufacturer: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Giá Nhập Đơn Vị (VNĐ)"
                                value={receiveData.unitImportPrice}
                                onChange={(e) => setReceiveData({ ...receiveData, unitImportPrice: Number(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Giá Xuất Bán Đơn Vị (VNĐ)"
                                value={receiveData.unitSellingPrice}
                                onChange={(e) => setReceiveData({ ...receiveData, unitSellingPrice: Number(e.target.value) })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenReceiveBatch(false)} sx={{ fontWeight: 700 }}>Hủy Bỏ</Button>
                    <Button variant="contained" onClick={handleReceiveBatch} sx={{ fontWeight: 700 }}>Nhập Kho Theo Lô</Button>
                </DialogActions>
            </Dialog>

            {/* ============================================================== */}
            {/* MODAL 3: LẬP PHIẾU ĐIỀU CHUYỂN KHO NỘI BỘ                      */}
            {/* ============================================================== */}
            <Dialog open={openTransferDialog} onClose={() => setOpenTransferDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>Lập Phiếu Điều Chuyển Kho Nội Bộ</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ pt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                fullWidth
                                label="Kho Xuất (Kho Nguồn)"
                                value={transferData.sourceWarehouseId}
                                onChange={(e) => setTransferData({ ...transferData, sourceWarehouseId: e.target.value })}
                            >
                                {warehouses.map(w => (
                                    <MenuItem key={w.warehouseId} value={w.warehouseId}>
                                        {w.warehouseName}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                fullWidth
                                label="Kho Nhận (Kho Đích)"
                                value={transferData.destinationWarehouseId}
                                onChange={(e) => setTransferData({ ...transferData, destinationWarehouseId: e.target.value })}
                            >
                                {warehouses.map(w => (
                                    <MenuItem key={w.warehouseId} value={w.warehouseId}>
                                        {w.warehouseName}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                select
                                fullWidth
                                label="Thuốc Cần Chuyển"
                                value={transferData.items[0]?.medicineId || 1}
                                onChange={(e) => {
                                    const medId = Number(e.target.value);
                                    const matchedBatch = batches.find(b => b.medicineId === medId);
                                    setTransferData({
                                        ...transferData,
                                        items: [{
                                            ...transferData.items[0],
                                            medicineId: medId,
                                            batchId: matchedBatch ? matchedBatch.batchId : ""
                                        }]
                                    });
                                }}
                            >
                                <MenuItem value={1}>Paracetamol 500mg</MenuItem>
                                <MenuItem value={2}>Amoxicillin 500mg</MenuItem>
                                <MenuItem value={4}>Berberin 100mg</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                select
                                fullWidth
                                label="Lô Thuốc Xuất"
                                value={transferData.items[0]?.batchId || (batches.find(b => b.medicineId === (transferData.items[0]?.medicineId || 1))?.batchId || "")}
                                onChange={(e) => {
                                    setTransferData({
                                        ...transferData,
                                        items: [{ ...transferData.items[0], batchId: e.target.value }]
                                    });
                                }}
                            >
                                {batches.filter(b => !transferData.items[0]?.medicineId || b.medicineId === transferData.items[0]?.medicineId).map(b => (
                                    <MenuItem key={b.batchId} value={b.batchId}>
                                        {b.batchNumber} (HSD: {formatDate(b.expiryDate)})
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Số Lượng Chuyển"
                                value={transferData.items[0]?.requestedQuantity || 100}
                                onChange={(e) => {
                                    const qty = Number(e.target.value);
                                    setTransferData({
                                        ...transferData,
                                        items: [{ ...transferData.items[0], requestedQuantity: qty }]
                                    });
                                }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label="Ghi Chú Lý Do Điều Chuyển"
                                value={transferData.notes}
                                onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenTransferDialog(false)} sx={{ fontWeight: 700 }}>Hủy</Button>
                    <Button variant="contained" color="secondary" onClick={handleCreateTransfer} sx={{ fontWeight: 700 }}>
                        Lập Phiếu Điều Chuyển
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ============================================================== */}
            {/* MODAL 4: CẤP PHÁT THUỐC FEFO TỰ ĐỘNG                           */}
            {/* ============================================================== */}
            <Dialog open={openDispenseDialog} onClose={() => setOpenDispenseDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>
                    Cấp Phát Đơn Thuốc Tự Động Theo Thuật Toán FEFO
                </DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ pt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                fullWidth
                                label="Kho Cấp Phát (Kho Lẻ)"
                                value={dispenseData.warehouseId}
                                onChange={(e) => setDispenseData({ ...dispenseData, warehouseId: e.target.value })}
                            >
                                {warehouses.filter(w => w.warehouseType !== "CENTRAL_WAREHOUSE").map(w => (
                                    <MenuItem key={w.warehouseId} value={w.warehouseId}>
                                        {w.warehouseName} ({w.warehouseCode})
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Mã Đơn Thuốc Cần Cấp (Prescription ID)"
                                value={dispenseData.prescriptionId}
                                onChange={(e) => setDispenseData({ ...dispenseData, prescriptionId: Number(e.target.value) })}
                                helperText="Hệ thống sẽ tự động quét danh sách thuốc trong đơn và trích xuất từ lô có date gần nhất còn hạn"
                            />
                        </Grid>
                    </Grid>

                    {/* Kết quả cấp phát FEFO nếu có */}
                    {dispenseResult && (
                        <Box mt={3} p={2.5} sx={{ bgcolor: "#F0FDF4", borderRadius: 2, border: "1px solid #BBF7D0" }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                                <Typography variant="subtitle1" fontWeight="800" color="#166534">
                                    KẾT QUẢ PHÂN BỔ LÔ THUỐC THEO FEFO THÀNH CÔNG:
                                </Typography>
                                <Chip label={`Mã phiếu: ${dispenseResult.dispenseCode}`} color="success" sx={{ fontWeight: 800 }} />
                            </Box>
                            <Typography variant="body2" color="#15803D" mb={1.5}>
                                Bệnh nhân: <strong>{dispenseResult.patientName}</strong> | Kho xuất: <strong>{dispenseResult.warehouseName}</strong>
                            </Typography>

                            <TableContainer sx={{ bgcolor: "#FFFFFF", borderRadius: 1.5 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ "& th": { bgcolor: "#DCFCE7", fontWeight: 800, color: "#166534" } }}>
                                            <TableCell>Thuốc</TableCell>
                                            <TableCell>Số Lô Xuất</TableCell>
                                            <TableCell>Hạn Dùng Lô</TableCell>
                                            <TableCell align="right">Số Lượng</TableCell>
                                            <TableCell align="right">Đơn Giá</TableCell>
                                            <TableCell align="right">Thành Tiền</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {dispenseResult.items?.map((item, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell sx={{ fontWeight: 700 }}>{item.medicineName}</TableCell>
                                                <TableCell>
                                                    <Chip label={item.batchNumber} size="small" color="primary" sx={{ fontWeight: 800 }} />
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 800, color: "#D97706" }}>
                                                    {formatDate(item.expiryDate)}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800 }}>
                                                    {item.quantityDispensed}
                                                </TableCell>
                                                <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800, color: "#059669" }}>
                                                    {formatCurrency(item.totalPrice)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <Box display="flex" justifyContent="flex-end" mt={2}>
                                <Button
                                    variant="outlined"
                                    color="success"
                                    startIcon={<PrintIcon />}
                                    onClick={() => window.print()}
                                    sx={{ fontWeight: 700, textTransform: "none" }}
                                >
                                    In Phiếu Cấp Phát Thuốc
                                </Button>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenDispenseDialog(false)} sx={{ fontWeight: 700 }}>Đóng</Button>
                    <Button variant="contained" color="success" onClick={handleDispenseFefo} sx={{ fontWeight: 700 }}>
                        Thực Hiện Xuất Thuốc (FEFO)
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
