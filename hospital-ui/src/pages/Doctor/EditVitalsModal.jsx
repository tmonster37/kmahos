import React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    Paper,
    Chip,
    Grid,
    TextField,
    InputAdornment,
    Divider,
    Button
} from "@mui/material";
import MonitorWeightIcon from "@mui/icons-material/MonitorWeight";
import designTokens from "../../theme/designTokens";

export default function EditVitalsModal({
    open,
    onClose,
    editingVitals,
    setEditingVitals,
    onSave,
    calculateBMI
}) {
    if (!editingVitals) return null;

    const previewBMI = calculateBMI(editingVitals.weight, editingVitals.height);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3 } }}
        >
            <DialogTitle sx={{ pb: 1, borderBottom: `1px solid ${designTokens.neutral.border}` }}>
                <Box display="flex" alignItems="center" gap={1.5}>
                    <Box
                        sx={{
                            width: 42,
                            height: 42,
                            borderRadius: 2.5,
                            bgcolor: "primary.light",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "primary.dark",
                        }}
                    >
                        <MonitorWeightIcon />
                    </Box>
                    <Box>
                        <Typography variant="h6" fontWeight="bold" color="primary.dark">
                            Cập Nhật Sinh Hiệu, Chỉ Số BMI & Tiền Sử Dị Ứng
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Hệ thống tự động tính BMI và phân loại thể trạng theo chuẩn WHO Tây Thái Bình Dương (WPRO)
                        </Typography>
                    </Box>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ pt: 2.5 }}>
                {/* Real-time BMI Display Box */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 2,
                        mb: 2.5,
                        borderRadius: 2.5,
                        bgcolor: previewBMI.badgeBg,
                        border: `1.5px solid ${previewBMI.badgeColor}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 2
                    }}
                >
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <Box
                            sx={{
                                width: 50,
                                height: 50,
                                borderRadius: "50%",
                                bgcolor: "#ffffff",
                                color: previewBMI.badgeColor,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "1.3rem",
                                fontWeight: 900,
                                boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
                            }}
                        >
                            {previewBMI.bmi}
                        </Box>
                        <Box>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="subtitle1" fontWeight={900} sx={{ color: previewBMI.badgeColor }}>
                                    Thể trạng: {previewBMI.classification}
                                </Typography>
                                <Chip
                                    label={`BMI: ${previewBMI.bmi} kg/m²`}
                                    size="small"
                                    sx={{ bgcolor: "#ffffff", color: previewBMI.badgeColor, fontWeight: 800, height: 22 }}
                                />
                            </Box>
                            <Typography variant="caption" sx={{ color: previewBMI.badgeColor, fontWeight: 600, display: "block", mt: 0.3 }}>
                                💡 Lời khuyên lâm sàng: {previewBMI.advice}
                            </Typography>
                        </Box>
                    </Box>
                    <Box textAlign="right">
                        <Typography variant="caption" sx={{ color: designTokens.neutral.textMuted, display: "block" }}>
                            Tiêu chuẩn: <b>WHO WPRO (Châu Á)</b>
                        </Typography>
                        <Typography variant="caption" sx={{ color: designTokens.neutral.textMuted, display: "block" }}>
                            Cân đối: 18.5 - 22.9 | Thừa cân: 23 - 24.9 | Béo phì: ≥ 25
                        </Typography>
                    </Box>
                </Paper>

                {/* Quick Presets for Demo / Testing */}
                <Box mb={2.5}>
                    <Typography variant="caption" fontWeight={700} sx={{ color: designTokens.neutral.textSecondary, display: "block", mb: 0.8 }}>
                        ⚡ Gán Nhanh Dữ Liệu Mẫu (Quick Presets):
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={0.8}>
                        {[
                            { label: "Chuẩn (62kg / 168cm)", data: { weight: 62, height: 168, bloodPressure: "120/80", heartRate: 75, temperature: 36.8, spO2: 98 } },
                            { label: "Gầy thiếu cân (44kg / 165cm)", data: { weight: 44, height: 165, bloodPressure: "105/70", heartRate: 80, temperature: 36.6, spO2: 99 } },
                            { label: "Thừa cân (72kg / 165cm)", data: { weight: 72, height: 165, bloodPressure: "135/85", heartRate: 82, temperature: 37.0, spO2: 97 } },
                            { label: "Béo phì Độ I (82kg / 165cm)", data: { weight: 82, height: 165, bloodPressure: "140/90", heartRate: 86, temperature: 36.9, spO2: 96 } },
                            { label: "Béo phì Độ II (95kg / 165cm)", data: { weight: 95, height: 165, bloodPressure: "155/95", heartRate: 90, temperature: 37.1, spO2: 95 } },
                            { label: "Tăng huyết áp (160/100 mmHg)", data: { bloodPressure: "160/100", heartRate: 95, medicalHistory: "Tăng huyết áp nguyên phát độ 2 (5 năm), Rối loạn mỡ máu" } },
                            { label: "Sốt cao (39.2°C)", data: { temperature: 39.2, heartRate: 104, spO2: 97 } },
                            { label: "Dị ứng Penicillin & Amoxicillin", data: { allergies: "Dị ứng Penicillin, Amoxicillin (Sốc phản vệ độ 1, mề đay)" } },
                            { label: "Dị ứng Aspirin & NSAID", data: { allergies: "Dị ứng Aspirin, Ibuprofen, NSAID (Khó thở dạng hen)" } }
                        ].map((preset, idx) => (
                            <Chip
                                key={idx}
                                label={preset.label}
                                size="small"
                                clickable
                                onClick={() => setEditingVitals(prev => ({ ...prev, ...preset.data }))}
                                sx={{
                                    fontWeight: 600,
                                    fontSize: "0.72rem",
                                    borderRadius: 1.5,
                                    bgcolor: designTokens.neutral.borderLight,
                                    "&:hover": { bgcolor: designTokens.neutral.border }
                                }}
                            />
                        ))}
                    </Box>
                </Box>

                {/* Inputs Grid */}
                <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                        <TextField
                            label="Chiều cao (cm)"
                            type="number"
                            size="small"
                            fullWidth
                            value={editingVitals.height}
                            onChange={(e) => setEditingVitals({ ...editingVitals, height: e.target.value })}
                            InputProps={{ endAdornment: <InputAdornment position="end">cm</InputAdornment> }}
                        />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <TextField
                            label="Cân nặng (kg)"
                            type="number"
                            size="small"
                            fullWidth
                            value={editingVitals.weight}
                            onChange={(e) => setEditingVitals({ ...editingVitals, weight: e.target.value })}
                            InputProps={{ endAdornment: <InputAdornment position="end">kg</InputAdornment> }}
                        />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <TextField
                            label="Huyết áp (mmHg)"
                            size="small"
                            fullWidth
                            placeholder="120/80"
                            value={editingVitals.bloodPressure}
                            onChange={(e) => setEditingVitals({ ...editingVitals, bloodPressure: e.target.value })}
                        />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <TextField
                            label="Nhịp tim (bpm)"
                            type="number"
                            size="small"
                            fullWidth
                            value={editingVitals.heartRate}
                            onChange={(e) => setEditingVitals({ ...editingVitals, heartRate: e.target.value })}
                            InputProps={{ endAdornment: <InputAdornment position="end">bpm</InputAdornment> }}
                        />
                    </Grid>

                    <Grid item xs={6} sm={3}>
                        <TextField
                            label="Thân nhiệt (°C)"
                            type="number"
                            size="small"
                            fullWidth
                            value={editingVitals.temperature}
                            onChange={(e) => setEditingVitals({ ...editingVitals, temperature: e.target.value })}
                            InputProps={{ endAdornment: <InputAdornment position="end">°C</InputAdornment> }}
                        />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <TextField
                            label="SpO2 (%)"
                            type="number"
                            size="small"
                            fullWidth
                            value={editingVitals.spO2}
                            onChange={(e) => setEditingVitals({ ...editingVitals, spO2: e.target.value })}
                            InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Nhóm máu"
                            size="small"
                            fullWidth
                            value={editingVitals.bloodType || "O+"}
                            onChange={(e) => setEditingVitals({ ...editingVitals, bloodType: e.target.value })}
                            placeholder="O+, A+, B+, AB+..."
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                    </Grid>

                    {/* Tiền sử Dị ứng */}
                    <Grid item xs={12}>
                        <Box mb={0.8} display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2" fontWeight={800} color={designTokens.status.danger.dark}>
                                🚨 Tiền Sử Dị Ứng Thuốc / Thức Ăn:
                            </Typography>
                            <Box display="flex" gap={0.5}>
                                <Chip
                                    label="Dị ứng Penicillin"
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                    onClick={() => setEditingVitals(p => ({ ...p, allergies: "Dị ứng Penicillin, Amoxicillin (Sốc phản vệ)" }))}
                                    sx={{ fontSize: "0.68rem", height: 20 }}
                                />
                                <Chip
                                    label="Dị ứng Aspirin/NSAID"
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                    onClick={() => setEditingVitals(p => ({ ...p, allergies: "Dị ứng Aspirin, NSAID, Ibuprofen" }))}
                                    sx={{ fontSize: "0.68rem", height: 20 }}
                                />
                                <Chip
                                    label="Chưa ghi nhận"
                                    size="small"
                                    onClick={() => setEditingVitals(p => ({ ...p, allergies: "Chưa ghi nhận dị ứng thuốc" }))}
                                    sx={{ fontSize: "0.68rem", height: 20 }}
                                />
                            </Box>
                        </Box>
                        <TextField
                            fullWidth
                            size="small"
                            value={editingVitals.allergies}
                            onChange={(e) => setEditingVitals({ ...editingVitals, allergies: e.target.value })}
                            placeholder="VD: Dị ứng Penicillin, Amoxicillin, Paracetamol, Hải sản..."
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    bgcolor: editingVitals.allergies && !editingVitals.allergies.includes("Chưa ghi nhận") ? designTokens.status.danger.bg : "#ffffff",
                                    borderColor: editingVitals.allergies && !editingVitals.allergies.includes("Chưa ghi nhận") ? designTokens.status.danger.main : undefined
                                }
                            }}
                        />
                    </Grid>

                    {/* Tiền sử Bệnh mạn tính */}
                    <Grid item xs={12}>
                        <Box mb={0.8} display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2" fontWeight={800} color={designTokens.status.info.main}>
                                🩺 Tiền Sử Bệnh Lý Mạn Tính & Bệnh Kèm Theo:
                            </Typography>
                            <Box display="flex" gap={0.5} flexWrap="wrap">
                                {["Tăng huyết áp", "Đái tháo đường T2", "Hen phế quản", "Viêm loét dạ dày"].map((cond, i) => (
                                    <Chip
                                        key={i}
                                        label={cond}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                        onClick={() => {
                                            const current = editingVitals.medicalHistory.includes("Chưa ghi nhận") ? "" : editingVitals.medicalHistory;
                                            const updated = current ? `${current}, ${cond}` : cond;
                                            setEditingVitals(p => ({ ...p, medicalHistory: updated }));
                                        }}
                                        sx={{ fontSize: "0.68rem", height: 20 }}
                                    />
                                ))}
                            </Box>
                        </Box>
                        <TextField
                            fullWidth
                            size="small"
                            value={editingVitals.medicalHistory}
                            onChange={(e) => setEditingVitals({ ...editingVitals, medicalHistory: e.target.value })}
                            placeholder="VD: Tăng huyết áp 5 năm, Đái tháo đường Tuýp 2, Hen phế quản..."
                        />
                    </Grid>
                </Grid>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${designTokens.neutral.border}` }}>
                <Button onClick={onClose} variant="outlined" color="inherit" sx={{ borderRadius: 2 }}>
                    Hủy Bỏ
                </Button>
                <Button
                    onClick={() => {
                        if (onSave) onSave(editingVitals);
                        onClose();
                    }}
                    variant="contained"
                    color="primary"
                    sx={{ borderRadius: 2, fontWeight: "bold", bgcolor: designTokens.brand.primary }}
                >
                    Lưu Thông Tin Sinh Hiệu
                </Button>
            </DialogActions>
        </Dialog>
    );
}

