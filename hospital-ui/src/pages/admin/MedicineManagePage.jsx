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
    Stack,
    MenuItem
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
import EditIcon from "@mui/icons-material/Edit";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import BlockIcon from "@mui/icons-material/Block";
import AddIcon from "@mui/icons-material/Add";
import { useAuth } from "../../context/AuthContext";
import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency, formatDate } from "../../utils/formatters";

export function getDaysUntilExpiry(expDateStr) {
    if (!expDateStr) return null;
    const exp = new Date(expDateStr);
    if (isNaN(exp.getTime())) return null;
    const now = new Date();
    const diffTime = exp - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function filterProcurementMedicines(medicines = []) {
    return medicines.filter(m => {
        if (m.deleted) return false;
        const hasStock = m.stockQuantity != null && !isNaN(Number(m.stockQuantity));
        const hasMinStock = m.minStock != null && !isNaN(Number(m.minStock));
        const isLowStock = hasStock && hasMinStock && Number(m.stockQuantity) < Number(m.minStock);
        const daysLeft = getDaysUntilExpiry(m.expiryDate);
        const isExpiredOrExpiring = daysLeft != null && daysLeft <= 90;
        return isLowStock || isExpiredOrExpiring;
    });
}

export default function MedicineManagePage() {
    const { user } = useAuth();
    const canManageCatalog = user?.role === "ROLE_ADMIN" || user?.role === "ROLE_PHARMACIST";
    const isHeadOfDept = user?.role === "ROLE_HEAD_OF_DEPARTMENT";
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [searchKeyword, setSearchKeyword] = useState("");
    const [tabFilter, setTabFilter] = useState("ALL"); // ALL, ACTIVE, LOCKED, LOW_STOCK, EXPIRING_SOON, SAFE
    const [openRestock, setOpenRestock] = useState(false);
    const [selectedMed, setSelectedMed] = useState(null);
    const [importQty, setImportQty] = useState("");
    const [importBatch, setImportBatch] = useState("");
    const [importExpiry, setImportExpiry] = useState("");
    const [feedback, setFeedback] = useState({ type: "", message: "" });

    // State cho Modal Sửa thuốc (2.2.46)
    const [openEdit, setOpenEdit] = useState(false);
    const [editMed, setEditMed] = useState(null);
    const [editFormData, setEditFormData] = useState({
        medicineName: "",
        activeIngredient: "",
        unit: "TABLET",
        price: "",
        stockQuantity: ""
    });

    // State cho Dialog Khóa / Mở khóa thuốc (2.2.47 & 2.2.48)
    const [lockConfirm, setLockConfirm] = useState({ open: false, medicine: null, isLocking: true });

    const loadMedicines = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await axiosInstance.get("/api/clinical/medicines?includeDeleted=true");
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

    const handleOpenRestockModal = (m) => {
        setSelectedMed(m);
        setImportQty("");
        setImportBatch("");
        setImportExpiry("");
        setOpenRestock(true);
    };

    const handleRestock = () => {
        if (!selectedMed) return;
        const qtyNum = Number(importQty);
        if (isNaN(qtyNum) || qtyNum <= 0) {
            alert("Vui lòng nhập số lượng hợp lệ!");
            return;
        }
        if (!importBatch || !importBatch.trim()) {
            alert("Vui lòng nhập số lô sản xuất!");
            return;
        }
        if (!importExpiry) {
            alert("Vui lòng chọn hạn sử dụng!");
            return;
        }

        setOpenRestock(false);
        setFeedback({
            type: "warning",
            message: `Chưa thể xác nhận nhập kho: Danh mục thuốc không hỗ trợ cập nhật tồn kho trực tiếp khi chưa có chứng từ backend. Vui lòng chuyển sang phân hệ Kho Dược (/admin/pharmacy-inventory) để lập phiếu nhập kho FEFO chính thức.`
        });
    };

    // 2.2.45: Thêm thuốc mới vào danh mục
    const handleOpenAddModal = () => {
        setEditMed(null);
        setEditFormData({
            medicineName: "",
            activeIngredient: "",
            unit: "TABLET",
            price: "",
            stockQuantity: ""
        });
        setOpenEdit(true);
    };

    // 2.2.46: Chỉnh sửa thông tin thuốc
    const handleOpenEditModal = (m) => {
        setEditMed(m);
        setEditFormData({
            medicineName: m.medicineName || "",
            activeIngredient: m.activeIngredient || "",
            unit: m.unit || "TABLET",
            price: m.price != null ? m.price : "",
            stockQuantity: m.stockQuantity != null ? m.stockQuantity : ""
        });
        setOpenEdit(true);
    };

    // Lưu thuốc (Thêm mới 2.2.45 hoặc Sửa 2.2.46)
    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editFormData.medicineName.trim()) {
            setFeedback({ type: "warning", message: "Vui lòng nhập tên thuốc!" });
            return;
        }
        const priceNum = editFormData.price === "" ? null : Number(editFormData.price);
        if (priceNum === null || isNaN(priceNum) || priceNum < 0) {
            setFeedback({ type: "warning", message: "Vui lòng nhập đơn giá hợp lệ!" });
            return;
        }
        const stockNum = editFormData.stockQuantity === "" ? 0 : Number(editFormData.stockQuantity);
        if (isNaN(stockNum) || stockNum < 0) {
            setFeedback({ type: "warning", message: "Vui lòng nhập số lượng tồn kho hợp lệ!" });
            return;
        }

        setSubmitting(true);
        try {
            if (editMed) {
                // 2.2.46: Chỉnh sửa
                await axiosInstance.put(`/api/clinical/medicines/${editMed.medicineId}`, {
                    medicineName: editFormData.medicineName.trim(),
                    activeIngredient: editFormData.activeIngredient?.trim(),
                    unit: editFormData.unit,
                    price: priceNum,
                    stockQuantity: stockNum
                });
                setFeedback({
                    type: "success",
                    message: `Đã cập nhật thông tin thuốc [${editFormData.medicineName}] thành công vào CSDL!`
                });
            } else {
                // 2.2.45: Thêm mới
                await axiosInstance.post("/api/clinical/medicines", {
                    medicineName: editFormData.medicineName.trim(),
                    activeIngredient: editFormData.activeIngredient?.trim(),
                    unit: editFormData.unit,
                    price: priceNum,
                    stockQuantity: stockNum
                });
                setFeedback({
                    type: "success",
                    message: `Đã thêm thuốc mới [${editFormData.medicineName}] vào danh mục CSDL thành công!`
                });
            }
            setOpenEdit(false);
            await loadMedicines();
        } catch (err) {
            console.error("Lỗi lưu thuốc:", err);
            setFeedback({
                type: "error",
                message: err.response?.data?.message || err.message || "Lỗi khi lưu thông tin thuốc."
            });
        } finally {
            setSubmitting(false);
        }
    };

    // 2.2.47 & 2.2.48: Khóa / Mở khóa thuốc
    const handleOpenToggleStatus = (m) => {
        const isLocking = !m.deleted;
        setLockConfirm({ open: true, medicine: m, isLocking });
    };

    const handleConfirmToggleStatus = async () => {
        const item = lockConfirm.medicine;
        if (!item) return;

        setSubmitting(true);
        try {
            await axiosInstance.put(`/api/clinical/medicines/${item.medicineId}/toggle-status`);
            setFeedback({
                type: "success",
                message: lockConfirm.isLocking
                    ? `Đã khóa (ngừng sử dụng) thuốc [${item.medicineName}] thành công!`
                    : `Đã mở khóa và kích hoạt lại thuốc [${item.medicineName}] thành công!`
            });
            setLockConfirm({ open: false, medicine: null, isLocking: true });
            await loadMedicines();
        } catch (err) {
            console.error("Lỗi đổi trạng thái thuốc:", err);
            setFeedback({
                type: "error",
                message: err.response?.data?.message || err.message || "Lỗi khi thay đổi trạng thái thuốc."
            });
        } finally {
            setSubmitting(false);
        }
    };

    // Phân loại
    const activeList = medicines.filter(m => !m.deleted);
    const lockedList = medicines.filter(m => Boolean(m.deleted));
    const lowStockList = medicines.filter(m => {
        if (m.deleted) return false;
        const hasStock = m.stockQuantity != null && !isNaN(Number(m.stockQuantity));
        const hasMinStock = m.minStock != null && !isNaN(Number(m.minStock));
        return hasStock && hasMinStock && Number(m.stockQuantity) < Number(m.minStock);
    });
    const expiringSoonList = medicines.filter(m => {
        if (m.deleted) return false;
        const days = getDaysUntilExpiry(m.expiryDate);
        return days != null && days <= 90 && days >= 0;
    });

    const filteredMedicines = medicines.filter(m => {
        const matchSearch =
            m.medicineName?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            m.activeIngredient?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            m.batchNumber?.toLowerCase().includes(searchKeyword.toLowerCase());

        const hasStock = m.stockQuantity != null && !isNaN(Number(m.stockQuantity));
        const hasMinStock = m.minStock != null && !isNaN(Number(m.minStock));
        const stock = hasStock ? Number(m.stockQuantity) : null;
        const minStock = hasMinStock ? Number(m.minStock) : null;
        const days = getDaysUntilExpiry(m.expiryDate);

        if (!matchSearch) return false;

        if (tabFilter === "ACTIVE") return !m.deleted;
        if (tabFilter === "LOCKED") return Boolean(m.deleted);
        if (tabFilter === "LOW_STOCK") return !m.deleted && hasStock && hasMinStock && stock < minStock;
        if (tabFilter === "EXPIRING_SOON") return !m.deleted && days != null && days <= 90 && days >= 0;
        if (tabFilter === "SAFE") return !m.deleted && hasStock && hasMinStock && stock >= minStock && (days == null || days > 90);
        return true;
    });

    const getUnitLabel = (unit) => {
        switch (unit) {
            case "TABLET":
            case "VIEN": return "Viên";
            case "BOTTLE":
            case "CHAI": return "Chai/Lọ";
            case "TUBE":
            case "TUYP": return "Tuýp";
            case "PACKET":
            case "GOI": return "Gói";
            case "AMPULE":
            case "ONG": return "Ống";
            case "HOP": return "Hộp";
            default: return unit || "Đơn vị";
        }
    };

    const handleExportProcurementList = () => {
        const needed = filterProcurementMedicines(medicines);
        let csvContent = "data:text/csv;charset=utf-8,Mã thuốc,Tên thuốc,Hoạt chất,Tồn kho,Ngưỡng an toàn,Hạn sử dụng,Lô sản xuất,Đề xuất nhập thêm\n";
        needed.forEach(n => {
            const stockStr = n.stockQuantity != null ? n.stockQuantity : "Chưa có dữ liệu";
            const minStockStr = n.minStock != null ? n.minStock : "Chưa có dữ liệu";
            const expStr = n.expiryDate || "Chưa có dữ liệu";
            const batchStr = n.batchNumber || "Chưa có số lô";
            const recommendedOrder = n.minStock != null && !isNaN(Number(n.minStock)) ? Number(n.minStock) * 3 : "Chưa xác định";
            csvContent += `${n.medicineId},"${n.medicineName}","${n.activeIngredient || ''}",${stockStr},${minStockStr},${expStr},${batchStr},${recommendedOrder}\n`;
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
            {isHeadOfDept && (
                <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2.5, fontWeight: 600 }}>
                    Chế độ Trưởng khoa: Bạn đang xem danh mục thuốc toàn viện ở chế độ chỉ đọc để hỗ trợ kê đơn điều trị.
                </Alert>
            )}
            {/* 1. Header Banner */}
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
                            Giám sát định mức an toàn, cấu hình thông tin thuốc, cảnh báo cận hạn & thuật toán cấp phát xuất kho First-Expiry First-Out
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
                    {canManageCatalog && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleOpenAddModal}
                            sx={{
                                borderRadius: 2.5,
                                fontWeight: 700,
                                textTransform: "none",
                                fontSize: "0.85rem",
                                bgcolor: "#0088D6",
                                boxShadow: "0 4px 14px rgba(0, 136, 214, 0.25)",
                                "&:hover": { bgcolor: "#0073B7" }
                            }}
                        >
                            Thêm Thuốc Mới
                        </Button>
                    )}
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

            {/* 2. Thống kê KPI Cards */}
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
                                <Typography variant="caption" sx={{ color: "#64748B" }}>
                                    <b style={{ color: "#10B981" }}>{activeList.length}</b> lưu hành • <b style={{ color: "#EF4444" }}>{lockedList.length}</b> đã khóa
                                </Typography>
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
                                    color: "#F59E0B",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                <EventBusyIcon />
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: "#D97706", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                    CẬN HẠN DÙNG (≤ 90 NGÀY)
                                </Typography>
                                <Typography variant="h4" fontWeight={800} color="#D97706" sx={{ letterSpacing: "-0.03em" }}>
                                    {expiringSoonList.length}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "#D97706" }}>Ưu tiên xuất theo FEFO</Typography>
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
                                    KHO ĐẠT CHUẨN GSP
                                </Typography>
                                <Typography variant="h4" fontWeight={800} color="#10B981" sx={{ letterSpacing: "-0.03em" }}>
                                    100%
                                </Typography>
                                <Typography variant="caption" sx={{ color: "#059669" }}>Bảo quản nhiệt độ 20-25°C</Typography>
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
                        <Tab label={`Đang lưu hành (${activeList.length})`} value="ACTIVE" />
                        <Tab label={`Đã khóa (${lockedList.length})`} value="LOCKED" sx={{ color: lockedList.length > 0 ? "#DC2626 !important" : "inherit" }} />
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
                                <TableCell align="center" sx={{ fontWeight: 800, color: "#475569", py: 1.8, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>Trạng Thái / FEFO</TableCell>
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
                                    const isLocked = Boolean(m.deleted);
                                    const hasStock = m.stockQuantity != null && !isNaN(Number(m.stockQuantity));
                                    const hasMinStock = m.minStock != null && !isNaN(Number(m.minStock));
                                    const stock = hasStock ? Number(m.stockQuantity) : null;
                                    const minStock = hasMinStock ? Number(m.minStock) : null;
                                    const isLow = (hasStock && hasMinStock) ? stock < minStock : false;
                                    const daysUntilExp = getDaysUntilExpiry(m.expiryDate);
                                    const isExpired = daysUntilExp != null && daysUntilExp <= 0;
                                    const isExpiringSoon = daysUntilExp != null && daysUntilExp > 0 && daysUntilExp <= 90;
                                    const unitLabel = getUnitLabel(m.unit);

                                    return (
                                        <TableRow
                                            key={m.medicineId}
                                            hover
                                            sx={{
                                                bgcolor: isLocked ? "rgba(241, 245, 249, 0.6)" : (isExpired ? "rgba(254, 242, 242, 0.6)" : (isExpiringSoon ? "rgba(255, 251, 235, 0.6)" : "inherit")),
                                                "&:hover": { bgcolor: isLocked ? "rgba(241, 245, 249, 0.9)" : "rgba(248, 250, 252, 0.8)" },
                                                transition: "background-color 0.15s ease",
                                                opacity: isLocked ? 0.75 : 1
                                            }}
                                        >
                                            <TableCell sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
                                                <Typography variant="body2" fontWeight={700} sx={{ fontFamily: "monospace", color: "#64748B" }}>
                                                    #MED-{m.medicineId}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
                                                <Typography variant="body2" fontWeight={800} sx={{ color: isLocked ? "#64748B" : "#0F172A", fontSize: "0.85rem", textDecoration: isLocked ? "line-through" : "none" }}>
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
                                                    label={m.batchNumber || "Chưa có số lô"}
                                                    size="small"
                                                    sx={{
                                                        fontFamily: "monospace",
                                                        fontWeight: 700,
                                                        fontSize: "0.72rem",
                                                        bgcolor: "rgba(100, 116, 139, 0.08)",
                                                        color: "#475569",
                                                        border: "1px solid rgba(100, 116, 139, 0.2)",
                                                        borderRadius: 1.5,
                                                        fontStyle: m.batchNumber ? "normal" : "italic"
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
                                                <Typography variant="body2" fontWeight={700} color={isExpired ? "#EF4444" : (isExpiringSoon ? "#D97706" : "#0F172A")} sx={{ fontFamily: "monospace" }}>
                                                    {m.expiryDate ? formatDate(m.expiryDate) : "Chưa có dữ liệu"}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: isExpired ? "#EF4444" : (isExpiringSoon ? "#D97706" : "#94A3B8") }}>
                                                    {m.expiryDate ? (isExpired ? "Đã hết hạn" : `(Còn ${daysUntilExp} ngày)`) : "Chưa có hạn dùng"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
                                                <Typography variant="body2" fontWeight={800} color="#0F172A" sx={{ fontFamily: "monospace" }}>
                                                    {m.price != null && !isNaN(Number(m.price)) ? formatCurrency(m.price) : "Chưa có dữ liệu"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)", whiteSpace: "nowrap" }}>
                                                <Typography variant="body2" fontWeight={700} sx={{ fontFamily: "monospace", color: isLow ? "#DC2626" : "#0F172A" }}>
                                                    {hasStock ? `${stock.toLocaleString()} ` : "Chưa có dữ liệu "}
                                                    {hasStock && (
                                                        <Typography component="span" variant="caption" sx={{ color: "#64748B", fontWeight: 700, fontSize: "0.72rem" }}>{unitLabel}</Typography>
                                                    )}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
                                                {isLocked ? (
                                                    <Chip icon={<LockIcon style={{ fontSize: 13 }} />} label="ĐÃ KHÓA" size="small" sx={{ fontWeight: 800, fontSize: "0.68rem", bgcolor: "rgba(239, 68, 68, 0.12)", color: "#DC2626", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 1.5 }} />
                                                ) : isExpired ? (
                                                    <Chip label="HẾT HẠN - TIÊU HỦY" size="small" sx={{ fontWeight: 800, fontSize: "0.7rem", bgcolor: "rgba(239, 68, 68, 0.12)", color: "#DC2626", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 1.5 }} />
                                                ) : isExpiringSoon ? (
                                                    <Chip label="ƯU TIÊN XUẤT (FEFO)" size="small" sx={{ fontWeight: 800, fontSize: "0.7rem", bgcolor: "rgba(245, 158, 11, 0.12)", color: "#D97706", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 1.5 }} />
                                                ) : (!hasStock || !hasMinStock) ? (
                                                    <Chip label="CHƯA XÁC ĐỊNH TỒN KHO" size="small" sx={{ fontWeight: 700, fontSize: "0.7rem", bgcolor: "rgba(100, 116, 139, 0.08)", color: "#64748B", border: "1px solid rgba(100, 116, 139, 0.2)", borderRadius: 1.5 }} />
                                                ) : isLow ? (
                                                    <Chip label="SẮP HẾT TỒN KHO" size="small" sx={{ fontWeight: 700, fontSize: "0.7rem", bgcolor: "rgba(239, 68, 68, 0.08)", color: "#EF4444", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 1.5 }} />
                                                ) : (
                                                    <Chip label="LƯU HÀNH AN TOÀN" size="small" sx={{ fontWeight: 700, fontSize: "0.7rem", bgcolor: "rgba(16, 185, 129, 0.08)", color: "#059669", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 1.5 }} />
                                                )}
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)", minWidth: 190, whiteSpace: "nowrap" }}>
                                                {canManageCatalog ? (
                                                    <Stack direction="row" spacing={0.8} justifyContent="center" alignItems="center">
                                                        {/* Nút Chỉnh sửa thông tin thuốc (2.2.46) */}
                                                        <Tooltip title="Chỉnh sửa thông tin thuốc (2.2.46)">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleOpenEditModal(m)}
                                                                sx={{
                                                                    bgcolor: "rgba(0, 136, 214, 0.08)",
                                                                    color: "#0088D6",
                                                                    borderRadius: 2,
                                                                    "&:hover": { bgcolor: "rgba(0, 136, 214, 0.16)" }
                                                                }}
                                                            >
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>

                                                        {/* Nút Khóa (2.2.47) / Mở khóa (2.2.48) */}
                                                        {isLocked ? (
                                                            <Tooltip title="Mở khóa thuốc (2.2.48)">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleOpenToggleStatus(m)}
                                                                    sx={{
                                                                        bgcolor: "rgba(16, 185, 129, 0.08)",
                                                                        color: "#10B981",
                                                                        borderRadius: 2,
                                                                        "&:hover": { bgcolor: "rgba(16, 185, 129, 0.18)" }
                                                                    }}
                                                                >
                                                                    <LockOpenIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        ) : (
                                                            <Tooltip title="Khóa thuốc ngừng sử dụng (2.2.47)">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleOpenToggleStatus(m)}
                                                                    sx={{
                                                                        bgcolor: "rgba(239, 68, 68, 0.08)",
                                                                        color: "#EF4444",
                                                                        borderRadius: 2,
                                                                        "&:hover": { bgcolor: "rgba(239, 68, 68, 0.16)" }
                                                                    }}
                                                                >
                                                                    <BlockIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}

                                                        {/* Nút Nhập thêm */}
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            startIcon={<AddShoppingCartIcon sx={{ fontSize: 15 }} />}
                                                            onClick={() => handleOpenRestockModal(m)}
                                                            disabled={isLocked}
                                                            sx={{
                                                                borderRadius: 2,
                                                                textTransform: "none",
                                                                fontWeight: 700,
                                                                fontSize: "0.76rem",
                                                                whiteSpace: "nowrap",
                                                                px: 1.4,
                                                                py: 0.5,
                                                                bgcolor: "#0088D6",
                                                                boxShadow: "0 2px 8px rgba(0, 136, 214, 0.2)",
                                                                "&:hover": { bgcolor: "#0073B7" }
                                                            }}
                                                        >
                                                            Nhập thêm
                                                        </Button>
                                                    </Stack>
                                                ) : (
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                                                        Chế độ xem
                                                    </Typography>
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

            {/* Modal Chỉnh sửa thông tin thuốc (2.2.46) */}
            <Dialog
                disablePortal
                open={openEdit}
                onClose={() => !submitting && setOpenEdit(false)}
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
                        <EditIcon sx={{ fontSize: 20 }} />
                    </Box>
                    {editMed ? "Chỉnh Sửa Thông Tin Thuốc (2.2.46)" : "Thêm Thuốc Mới Vào Danh Mục (2.2.45)"}
                </DialogTitle>
                <Box component="form" onSubmit={handleSaveEdit}>
                    <DialogContent dividers sx={{ borderColor: "rgba(15, 23, 42, 0.08)", pt: 2.5 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Tên thương mại của thuốc"
                                    value={editFormData.medicineName}
                                    onChange={(e) => setEditFormData({ ...editFormData, medicineName: e.target.value })}
                                    required
                                    placeholder="VD: Paracetamol 500mg, Amoxicillin 500mg"
                                    InputProps={{ sx: { borderRadius: 2.5 } }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Hoạt chất chính (Active Ingredient)"
                                    value={editFormData.activeIngredient}
                                    onChange={(e) => setEditFormData({ ...editFormData, activeIngredient: e.target.value })}
                                    placeholder="VD: Paracetamol, Amoxicillin trihydrate"
                                    InputProps={{ sx: { borderRadius: 2.5 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Đơn vị tính (Quy cách)"
                                    value={editFormData.unit}
                                    onChange={(e) => setEditFormData({ ...editFormData, unit: e.target.value })}
                                    required
                                    InputProps={{ sx: { borderRadius: 2.5 } }}
                                >
                                    <MenuItem value="TABLET">Viên (TABLET)</MenuItem>
                                    <MenuItem value="BOTTLE">Chai / Lọ (BOTTLE)</MenuItem>
                                    <MenuItem value="TUBE">Tuýp (TUBE)</MenuItem>
                                    <MenuItem value="PACKET">Gói (PACKET)</MenuItem>
                                    <MenuItem value="AMPULE">Ống tiêm (AMPULE)</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Đơn giá niêm yết (VNĐ)"
                                    value={editFormData.price}
                                    onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                                    required
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">đ</InputAdornment>,
                                        sx: { borderRadius: 2.5 }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Số lượng tồn kho"
                                    value={editFormData.stockQuantity}
                                    onChange={(e) => setEditFormData({ ...editFormData, stockQuantity: e.target.value })}
                                    InputProps={{ sx: { borderRadius: 2.5 } }}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 2.5 }}>
                        <Button onClick={() => setOpenEdit(false)} disabled={submitting} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}>
                            Hủy Bỏ
                        </Button>
                        <Button
                            type="submit"
                            disabled={submitting}
                            variant="contained"
                            sx={{
                                borderRadius: 2.2,
                                fontWeight: 700,
                                textTransform: "none",
                                bgcolor: "#0088D6",
                                "&:hover": { bgcolor: "#0073B7" }
                            }}
                        >
                            {submitting ? "Đang lưu CSDL..." : (editMed ? "Lưu Thay Đổi (CSDL)" : "Thêm Thuốc Vào CSDL")}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>

            {/* Dialog Khóa / Mở khóa thuốc (2.2.47 & 2.2.48) */}
            <Dialog
                disablePortal
                open={lockConfirm.open}
                onClose={() => !submitting && setLockConfirm({ open: false, medicine: null, isLocking: true })}
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        boxShadow: "0 20px 40px rgba(15, 23, 42, 0.15)"
                    }
                }}
            >
                <DialogTitle
                    sx={{
                        fontWeight: 800,
                        color: lockConfirm.isLocking ? "#DC2626" : "#059669",
                        display: "flex",
                        alignItems: "center",
                        gap: 1.2,
                        pb: 1
                    }}
                >
                    <Box
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 2,
                            bgcolor: lockConfirm.isLocking ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
                            color: lockConfirm.isLocking ? "#EF4444" : "#10B981",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                    >
                        {lockConfirm.isLocking ? <BlockIcon sx={{ fontSize: 20 }} /> : <LockOpenIcon sx={{ fontSize: 20 }} />}
                    </Box>
                    {lockConfirm.isLocking ? "Xác Nhận Khóa Thuốc (2.2.47)" : "Xác Nhận Mở Khóa Thuốc (2.2.48)"}
                </DialogTitle>
                <DialogContent dividers sx={{ borderColor: "rgba(15, 23, 42, 0.08)" }}>
                    <Typography variant="body2" color="#0F172A">
                        {lockConfirm.isLocking ? (
                            <>
                                Bạn có chắc chắn muốn khóa thuốc <b>[{lockConfirm.medicine?.medicineName}]</b> không? Thuốc bị khóa sẽ ngừng sử dụng và Bác sĩ không thể kê đơn trong đơn thuốc.
                            </>
                        ) : (
                            <>
                                Bạn có chắc chắn muốn mở khóa và kích hoạt lại thuốc <b>[{lockConfirm.medicine?.medicineName}]</b> không? Thuốc sẽ trở lại trạng thái lưu hành trong bệnh viện.
                            </>
                        )}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={() => setLockConfirm({ open: false, medicine: null, isLocking: true })} disabled={submitting} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}>
                        Hủy Bỏ
                    </Button>
                    <Button
                        onClick={handleConfirmToggleStatus}
                        disabled={submitting}
                        variant="contained"
                        color={lockConfirm.isLocking ? "error" : "success"}
                        sx={{
                            textTransform: "none",
                            borderRadius: 2.2,
                            fontWeight: 700,
                            ...(lockConfirm.isLocking ? {} : { bgcolor: "#10B981", "&:hover": { bgcolor: "#059669" } })
                        }}
                    >
                        {submitting ? "Đang xử lý..." : (lockConfirm.isLocking ? "Khóa Thuốc" : "Mở Khóa Thuốc")}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal Nhập thêm thuốc theo Lô & HSD (FEFO) */}
            {selectedMed && (
                <Dialog
                    disablePortal
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
                        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2.5, fontWeight: 600 }}>
                            Quy định quản lý kho: Phân hệ Danh mục thuốc không hỗ trợ cập nhật tồn kho trực tiếp không qua chứng từ backend. Mọi nghiệp vụ nhập kho, quản lý lô sản xuất và cập nhật số lượng tồn kho thực tế phải có chứng từ nhập kho chính thức tại phân hệ <b>Kho Dược (/admin/pharmacy-inventory)</b>.
                        </Alert>
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
                                    <Typography variant="body2" fontWeight={800} sx={{ color: selectedMed.stockQuantity != null && Number(selectedMed.stockQuantity) < 50 ? "#EF4444" : "#10B981" }}>
                                        {selectedMed.stockQuantity != null ? selectedMed.stockQuantity : "Chưa có dữ liệu"} {getUnitLabel(selectedMed.unit)}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="body2" sx={{ color: "#64748B" }}>Lô hiện hành:</Typography>
                                    <Typography variant="body2" fontWeight={800} color="#0F172A" sx={{ fontFamily: "monospace" }}>{selectedMed.batchNumber || "Chưa có số lô"}</Typography>
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
