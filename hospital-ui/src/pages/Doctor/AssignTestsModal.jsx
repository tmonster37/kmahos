import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormGroup,
    FormControlLabel,
    Checkbox,
    Typography,
    Box,
    Alert,
    TextField,
    InputAdornment,
    Chip,
    CircularProgress,
    Divider
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ScienceIcon from "@mui/icons-material/Science";
import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency } from "../../utils/formatters";
import designTokens from "../../theme/designTokens";

export default function AssignTestsModal({ open, onClose, recordId, onAssigned }) {
    const [services, setServices] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);
    const [fetchingServices, setFetchingServices] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (open) {
            fetchServices();
            setSelectedIds([]);
            setSearchTerm("");
            setError("");
        }
    }, [open]);

    const fetchServices = async () => {
        setFetchingServices(true);
        try {
            const res = await axiosInstance.get("/api/clinical/services");
            const list = res?.data;
            if (Array.isArray(list) && list.length > 0) {
                setServices(list);
            } else {
                setServices([]);
                setError("Chưa có danh mục dịch vụ cận lâm sàng khả dụng trên hệ thống.");
            }
        } catch (err) {
            console.error("Lỗi lấy danh mục dịch vụ:", err);
            setServices([]);
            setError("Không thể tải danh mục dịch vụ cận lâm sàng từ máy chủ. Vui lòng thử lại.");
        } finally {
            setFetchingServices(false);
        }
    };

    const handleToggle = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const calculateTotalFee = () => {
        return services
            .filter((s) => selectedIds.includes(s.serviceId))
            .reduce((sum, s) => sum + Number(s.price || 0), 0);
    };

    const filteredServices = services.filter((s) =>
        s.serviceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSave = async () => {
        const isValidUuid = recordId && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(recordId));
        if (!isValidUuid) {
            setError("Hồ sơ bệnh án chưa được lưu hoặc mã hồ sơ không hợp lệ trên hệ thống. Vui lòng bấm 'Lưu Chẩn Đoán' trên màn hình trước khi chỉ định cận lâm sàng!");
            return;
        }

        if (selectedIds.length === 0) {
            setError("Vui lòng chọn ít nhất 1 dịch vụ xét nghiệm cận lâm sàng!");
            return;
        }
        setLoading(true);
        setError("");
        try {
            await axiosInstance.post(`/api/clinical/records/${recordId}/tests`, {
                serviceIds: selectedIds,
            });
            if (onAssigned) onAssigned();
            onClose();
        } catch (err) {
            setError(err.message || "Lỗi chỉ định xét nghiệm!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ pb: 1, borderBottom: "1px solid #E2E8F0" }}>
                <Box display="flex" alignItems="center" gap={1.5}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            bgcolor: "primary.light",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "primary.main",
                        }}
                    >
                        <ScienceIcon />
                    </Box>
                    <Box>
                        <Typography variant="h6" fontWeight="bold" color="primary.main">
                            Chỉ Định Xét Nghiệm & Chẩn Đoán Hình Ảnh
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Chọn danh mục dịch vụ cận lâm sàng gửi đến Khoa Xét nghiệm / CĐHA
                        </Typography>
                    </Box>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ pt: 2.5 }}>
                {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

                <TextField
                    fullWidth
                    size="small"
                    placeholder="Tìm kiếm tên xét nghiệm, chẩn đoán hình ảnh..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon color="action" />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ mb: 2 }}
                />

                {fetchingServices ? (
                    <Box display="flex" justifyContent="center" py={4}>
                        <CircularProgress size={32} />
                    </Box>
                ) : (
                    <FormGroup sx={{ maxHeight: 380, overflowY: "auto", pr: 1 }}>
                        {filteredServices.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                                Không tìm thấy dịch vụ cận lâm sàng phù hợp.
                            </Typography>
                        ) : (
                            filteredServices.map((s) => {
                                const isSelected = selectedIds.includes(s.serviceId);
                                return (
                                    <Box
                                        key={s.serviceId}
                                        onClick={() => handleToggle(s.serviceId)}
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            p: 1.5,
                                            mb: 1,
                                            borderRadius: 2,
                                            border: isSelected ? `1.5px solid ${designTokens.brand.primary}` : "1px solid #E2E8F0",
                                            bgcolor: isSelected ? `${designTokens.brand.primaryLight}` : "background.paper",
                                            cursor: "pointer",
                                            transition: "all 0.15s ease",
                                            "&:hover": {
                                                bgcolor: isSelected ? `${designTokens.brand.primaryBorder}` : "#F8FAFC",
                                            },
                                        }}
                                    >
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Checkbox
                                                checked={isSelected}
                                                onChange={() => handleToggle(s.serviceId)}
                                                onClick={(e) => e.stopPropagation()}
                                                color="primary"
                                            />
                                            <Box>
                                                <Typography variant="body2" fontWeight={isSelected ? "bold" : "medium"}>
                                                    {s.serviceName}
                                                </Typography>
                                                {s.description && (
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        {s.description}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                        <Chip
                                            label={formatCurrency(s.price)}
                                            color={isSelected ? "primary" : "default"}
                                            size="small"
                                            variant={isSelected ? "filled" : "outlined"}
                                            sx={{ fontWeight: "bold" }}
                                        />
                                    </Box>
                                );
                            })
                        )}
                    </FormGroup>
                )}

                <Divider sx={{ my: 2 }} />

                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                        Đã chọn: <b style={{ color: designTokens.brand.primary }}>{selectedIds.length}</b> dịch vụ
                    </Typography>
                    <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
                        Tổng chi phí tạm tính: {formatCurrency(calculateTotalFee())}
                    </Typography>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2.5, borderTop: "1px solid #E2E8F0" }}>
                <Button onClick={onClose} variant="outlined" color="inherit">
                    Hủy bỏ
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                    disabled={loading || selectedIds.length === 0}
                    sx={{ px: 3, fontWeight: "bold" }}
                >
                    {loading ? "Đang gửi chỉ định..." : `Xác nhận gửi (${selectedIds.length})`}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
