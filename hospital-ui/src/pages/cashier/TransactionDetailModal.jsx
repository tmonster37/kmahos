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
    Grid,
    Chip,
    Button
} from "@mui/material";
import PriceCheckIcon from "@mui/icons-material/PriceCheck";
import CloseIcon from "@mui/icons-material/Close";
import designTokens from "../../theme/designTokens";
import { isBillTotalAmountValid } from "./CashierPage";

export default function TransactionDetailModal({
    open,
    onClose,
    selectedTxn,
    formatCurrency,
    formatDateTime
}) {
    if (!selectedTxn) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            disablePortal
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3 } }}
        >
            <DialogTitle sx={{ fontWeight: 800, borderBottom: `1px solid ${designTokens.neutral.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box display="flex" alignItems="center" gap={1}>
                    <PriceCheckIcon color="primary" />
                    <span>Chi Tiết Giao Dịch Tài Chính</span>
                </Box>
                <IconButton size="small" onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 3 }}>
                <Stack spacing={2} mt={1}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: designTokens.neutral.borderLight }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>MÃ GIAO DỊCH HỆ THỐNG</Typography>
                        <Typography variant="h6" fontWeight={900} sx={{ fontFamily: "monospace", color: designTokens.brand.primary }}>
                            {selectedTxn.transactionId}
                        </Typography>
                        {(selectedTxn.vnpayTxnRef || selectedTxn.bankTxnNo) && (
                            <Typography variant="body2" sx={{ fontFamily: "monospace", color: designTokens.neutral.textMuted, mt: 0.5 }}>
                                Mã đối soát ngân hàng: <b>{selectedTxn.vnpayTxnRef || selectedTxn.bankTxnNo}</b>
                            </Typography>
                        )}
                    </Paper>

                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">SỐ TIỀN GIAO DỊCH</Typography>
                            <Typography variant="h6" fontWeight={900} color={selectedTxn.status === "SUCCESS" ? designTokens.status.success.main : designTokens.status.danger.main}>
                                {isBillTotalAmountValid(selectedTxn) ? formatCurrency(selectedTxn.amount) : "Chưa có dữ liệu"}
                            </Typography>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">TRẠNG THÁI</Typography>
                            <Box mt={0.5}>
                                <Chip
                                    label={selectedTxn.status === "SUCCESS" ? "Thành Công" : (selectedTxn.status === "REFUNDED" ? "Hoàn Tiền" : "Thất Bại")}
                                    color={selectedTxn.status === "SUCCESS" ? "success" : (selectedTxn.status === "REFUNDED" ? "secondary" : "error")}
                                    size="small"
                                    sx={{ fontWeight: 800 }}
                                />
                            </Box>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">NGƯỜI NỘP TIỀN</Typography>
                            <Typography variant="body2" fontWeight={700}>
                                {selectedTxn.accountName || selectedTxn.fullName || "Khách hàng"}
                            </Typography>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">KÊNH THANH TOÁN</Typography>
                            <Typography variant="body2" fontWeight={700}>
                                {selectedTxn.paymentMethod === "CASH" ? "Tiền mặt tại quầy" : (selectedTxn.paymentMethod === "POS" ? "Thẻ POS" : "Cổng PayOS / VietQR")}
                            </Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="caption" color="text.secondary">NỘI DUNG CHUYỂN KHOẢN / MÔ TẢ</Typography>
                            <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                                {selectedTxn.description || "Thanh toán viện phí bệnh viện"}
                            </Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="caption" color="text.secondary">THỜI GIAN KHỞI TẠO</Typography>
                            <Typography variant="body2">
                                {selectedTxn.createdAt ? formatDateTime(selectedTxn.createdAt) : "---"}
                            </Typography>
                        </Grid>
                    </Grid>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: designTokens.neutral.borderLight, borderTop: `1px solid ${designTokens.neutral.border}` }}>
                <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>
                    Đóng
                </Button>
            </DialogActions>
        </Dialog>
    );
}

