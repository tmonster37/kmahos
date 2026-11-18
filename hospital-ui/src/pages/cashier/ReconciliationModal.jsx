import React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    Grid,
    Paper,
    TableContainer,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Chip,
    Button,
    Alert
} from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PrintIcon from "@mui/icons-material/Print";
import designTokens from "../../theme/designTokens";
import { isBillTotalAmountValid } from "./CashierPage";

export default function ReconciliationModal({
    open,
    onClose,
    shiftFilter,
    shiftReconData,
    formatCurrency,
    formatDateTime,
    handlePrintShiftRecon
}) {
    if (!shiftReconData) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            disablePortal
            maxWidth="md"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3 } }}
        >
            <DialogTitle sx={{ fontWeight: "bold", bgcolor: designTokens.neutral.borderLight, borderBottom: `1px solid ${designTokens.neutral.border}`, display: "flex", alignItems: "center", gap: 1 }}>
                <AssessmentIcon color="primary" /> Bảng Đối Soát & Bàn Giao Ca Trực Thu Ngân
            </DialogTitle>
            <DialogContent sx={{ pt: 2.5 }}>
                {shiftReconData.hasMissingAmount && (
                    <Alert severity="warning" sx={{ mb: 2, borderRadius: 2, fontWeight: 600 }}>
                        ⚠️ CẢNH BÁO ĐỐI SOÁT: Ca trực có giao dịch chưa xác định được số tiền từ máy chủ. Tổng tiền hiển thị dưới đây là tổng từng phần và chưa phải là số liệu tài chính hoàn chỉnh.
                    </Alert>
                )}
                <Box mb={2.5}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Phạm vi ca đối soát: <b>{
                            shiftFilter === "MORNING" ? "Ca Sáng (06:00 - 12:00)" :
                            shiftFilter === "AFTERNOON" ? "Ca Chiều (12:00 - 18:00)" :
                            shiftFilter === "EVENING" ? "Ca Tối (18:00 - 23:59)" : "Toàn bộ ca làm việc trong ngày"
                        }</b>
                    </Typography>
                </Box>

                <Grid container spacing={2} mb={3}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: designTokens.status.info.bg, borderColor: designTokens.status.info.border }}>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">TỔNG THU CA TRỰC</Typography>
                            <Typography variant="h6" fontWeight="bold" color={designTokens.status.info.main} mt={0.5}>
                                {formatCurrency(shiftReconData.totalCollected)}
                            </Typography>
                            {shiftReconData.hasMissingAmount && (
                                <Chip label="Số liệu từng phần" size="small" color="warning" sx={{ mt: 0.5, fontWeight: 700, fontSize: "0.68rem", height: 20 }} />
                            )}
                            <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>{shiftReconData.transactionCount} lượt thu</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: designTokens.status.success.bg, borderColor: designTokens.status.success.border }}>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">TIỀN MẶT (TẠI KÉT)</Typography>
                            <Typography variant="h6" fontWeight="bold" color={designTokens.status.success.main} mt={0.5}>
                                {formatCurrency(shiftReconData.cashTotal)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">{shiftReconData.cashCount} lượt tiền mặt</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "#FAF5FF", borderColor: "#E9D5FF" }}>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">CỔNG VIETQR / PAYOS</Typography>
                            <Typography variant="h6" fontWeight="bold" color="#7E22CE" mt={0.5}>
                                {formatCurrency(shiftReconData.digitalTotal)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">{shiftReconData.digitalCount} lượt chuyển khoản</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "#FFF7ED", borderColor: "#FED7AA" }}>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">QUẸT THẺ POS</Typography>
                            <Typography variant="h6" fontWeight="bold" color="#C2410C" mt={0.5}>
                                {formatCurrency(shiftReconData.posTotal)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">{shiftReconData.posCount} lượt quẹt thẻ</Typography>
                        </Paper>
                    </Grid>
                </Grid>

                <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                    Danh sách các biên lai thu tiền ({shiftReconData.transactions?.length || 0}):
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320, borderRadius: 2 }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell><b>Mã biên lai</b></TableCell>
                                <TableCell><b>Bệnh nhân</b></TableCell>
                                <TableCell><b>Phương thức</b></TableCell>
                                <TableCell align="right"><b>Số tiền</b></TableCell>
                                <TableCell><b>Thời gian</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {!shiftReconData.transactions || shiftReconData.transactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 3, color: "text.secondary" }}>
                                        Không có biên lai thu tiền nào trong ca trực này.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                shiftReconData.transactions.map((t, i) => (
                                    <TableRow key={i} hover>
                                        <TableCell sx={{ fontWeight: "bold", color: "primary.main", wordBreak: "break-word" }}>{t.receiptCode || t.billId || "Chưa có mã"}</TableCell>
                                        <TableCell sx={{ wordBreak: "break-word" }}>{t.patientName || "Chưa có dữ liệu"}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={
                                                    t.paymentMethod === "CASH" || t.paymentMethod === "COUNTER_CASH"
                                                        ? "Tiền mặt"
                                                        : t.paymentMethod === "POS"
                                                        ? "Quẹt thẻ POS"
                                                        : "VietQR (PayOS)"
                                                }
                                                size="small"
                                                color={
                                                    t.paymentMethod === "CASH" || t.paymentMethod === "COUNTER_CASH"
                                                        ? "default"
                                                        : t.paymentMethod === "POS"
                                                        ? "secondary"
                                                        : "primary"
                                                }
                                            />
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: "bold", color: isBillTotalAmountValid(t) ? "success.main" : "warning.dark" }}>
                                            {isBillTotalAmountValid(t) ? formatCurrency(t.totalAmount) : "Chưa có dữ liệu"}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                                            {formatDateTime(t.paidAt)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: designTokens.neutral.borderLight, borderTop: `1px solid ${designTokens.neutral.border}` }}>
                <Button onClick={onClose}>
                    Đóng
                </Button>
                <Button
                    variant="contained"
                    color="warning"
                    startIcon={<PrintIcon />}
                    onClick={handlePrintShiftRecon}
                    sx={{ fontWeight: "bold", borderRadius: 2 }}
                >
                    In Biên Bản Bàn Giao Ca (A4)
                </Button>
            </DialogActions>
        </Dialog>
    );
}

