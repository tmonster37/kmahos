import React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Box,
    Typography,
    Stack,
    Paper,
    Alert,
    TextField,
    InputAdornment,
    Button
} from "@mui/material";
import EditNoteIcon from "@mui/icons-material/EditNote";
import CloseIcon from "@mui/icons-material/Close";
import designTokens from "../../theme/designTokens";

export default function AuditEntryModal({
    open,
    onClose,
    shiftStats,
    auditActualCash,
    setAuditActualCash,
    auditNotes,
    setAuditNotes,
    handleRecordAuditEntry,
    auditSubmitting,
    formatCurrency
}) {
    const cashTotal = shiftStats?.cashTotal || 0;
    const actualCashNum = Number(auditActualCash);
    const hasEnteredCash = auditActualCash && !isNaN(actualCashNum);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3 } }}
        >
            <DialogTitle sx={{ fontWeight: 800, borderBottom: `1px solid ${designTokens.neutral.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box display="flex" alignItems="center" gap={1}>
                    <EditNoteIcon color="primary" />
                    <span>Biên Bản Kiểm Kê Két Tiền Mặt</span>
                </Box>
                <IconButton size="small" onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 3 }}>
                <Stack spacing={2.5} mt={1}>
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                        Số liệu kiểm kê sẽ được ghi nhận vào <b>Sổ nhật ký kiểm toán bất biến</b> để làm căn cứ bàn giao và đối soát với Ngân quỹ.
                    </Alert>

                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: designTokens.neutral.borderLight }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>
                            SỐ TIỀN MẶT THEO SỔ SÁCH PHẦN MỀM HIỆN TẠI:
                        </Typography>
                        <Typography variant="h5" fontWeight={900} sx={{ fontFamily: "monospace", color: designTokens.secondary.main, mt: 0.5 }}>
                            {formatCurrency(cashTotal)}
                        </Typography>
                    </Paper>

                    <TextField
                        label="Số tiền mặt thực tế kiểm đếm được trong két (VNĐ)"
                        fullWidth
                        type="number"
                        placeholder="Nhập số tiền đếm được (VD: 5000000)"
                        value={auditActualCash}
                        onChange={(e) => setAuditActualCash(e.target.value)}
                        InputProps={{
                            endAdornment: <InputAdornment position="end">VNĐ</InputAdornment>
                        }}
                    />

                    {hasEnteredCash && (
                        <Box
                            sx={{
                                p: 1.8,
                                borderRadius: 2,
                                bgcolor: actualCashNum === cashTotal ? designTokens.status.success.bg : (actualCashNum > cashTotal ? designTokens.status.warning.bg : designTokens.status.danger.bg),
                                border: `1px solid ${actualCashNum === cashTotal ? designTokens.status.success.border : (actualCashNum > cashTotal ? designTokens.status.warning.border : designTokens.status.danger.border)}`
                            }}
                        >
                            <Typography variant="caption" fontWeight={700} color="text.secondary">
                                KẾT QUẢ ĐỐI SOÁT CHÊNH LỆCH:
                            </Typography>
                            <Typography
                                variant="subtitle1"
                                fontWeight={900}
                                sx={{
                                    color: actualCashNum === cashTotal ? designTokens.status.success.main : (actualCashNum > cashTotal ? designTokens.status.warning.main : designTokens.status.danger.main)
                                }}
                            >
                                {actualCashNum === cashTotal
                                    ? "✓ Khớp hoàn toàn với sổ sách (Chênh lệch: 0 đ)"
                                    : actualCashNum > cashTotal
                                    ? `⚠ Thừa tiền mặt trong két: +${formatCurrency(actualCashNum - cashTotal)}`
                                    : `✕ Thiếu hụt tiền mặt trong két: -${formatCurrency(cashTotal - actualCashNum)}`}
                            </Typography>
                        </Box>
                    )}

                    <TextField
                        label="Ghi chú giải trình / Nhận xét của Kiểm toán viên"
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Nhập ghi chú kiểm kê, lý do chênh lệch (nếu có), người chứng kiến..."
                        value={auditNotes}
                        onChange={(e) => setAuditNotes(e.target.value)}
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: designTokens.neutral.borderLight, borderTop: `1px solid ${designTokens.neutral.border}` }}>
                <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>
                    Hủy
                </Button>
                <Button
                    variant="contained"
                    onClick={handleRecordAuditEntry}
                    disabled={auditSubmitting || !auditActualCash}
                    sx={{ bgcolor: designTokens.brand.primary, fontWeight: 700, borderRadius: 2 }}
                >
                    {auditSubmitting ? "Đang lưu..." : "Ký & Lưu Nhật Ký Kiểm Toán"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

