import React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Chip,
    CircularProgress,
    TableContainer,
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Button
} from "@mui/material";
import designTokens from "../../theme/designTokens";

export default function DoctorScheduleModal({
    open,
    onClose,
    loadingSchedules,
    mySchedules = [],
    formatDate
}) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 800, color: designTokens.brand.primary, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>📅 Lịch Trực Phân Công Của Bác Sĩ (14 Ngày Tới)</span>
                <Chip label="Ca Khám Tiêu Chuẩn" color="primary" size="small" sx={{ fontWeight: 700 }} />
            </DialogTitle>
            <DialogContent dividers sx={{ p: 2 }}>
                {loadingSchedules ? (
                    <Box textAlign="center" py={4}><CircularProgress /></Box>
                ) : (
                    <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${designTokens.neutral.border}`, borderRadius: 2 }}>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: designTokens.neutral.borderLight }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 800 }}>NGÀY TRỰC</TableCell>
                                    <TableCell sx={{ fontWeight: 800 }}>CA TRỰC</TableCell>
                                    <TableCell sx={{ fontWeight: 800 }}>KHUNG GIỜ</TableCell>
                                    <TableCell sx={{ fontWeight: 800 }}>PHÒNG KHÁM</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 800 }}>SỐ LƯỢNG CHỜ</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {mySchedules.length > 0 ? (
                                    mySchedules.slice(0, 15).map((sch, idx) => (
                                        <TableRow key={idx} hover>
                                            <TableCell sx={{ fontWeight: 700 }}>{sch.date || sch.workDate || (formatDate ? formatDate(new Date()) : "")}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={sch.shiftType === "MORNING" ? "Ca Sáng" : sch.shiftType === "AFTERNOON" ? "Ca Chiều" : "Ca Tối"}
                                                    size="small"
                                                    color={sch.shiftType === "MORNING" ? "info" : sch.shiftType === "AFTERNOON" ? "warning" : "secondary"}
                                                    sx={{ fontWeight: 700 }}
                                                />
                                            </TableCell>
                                            <TableCell>{sch.startTime || "07:30"} - {sch.endTime || "11:30"}</TableCell>
                                            <TableCell>{sch.roomName || "Phòng Khám Lâm Sàng"}</TableCell>
                                            <TableCell align="center">
                                                <Chip label={`${sch.bookedCount || 0} bệnh nhân`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 3, color: designTokens.neutral.textMuted }}>
                                            Hiện chưa có ca trực nào được phân bổ trong tuần này.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button variant="contained" onClick={onClose} sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none", bgcolor: designTokens.brand.primary }}>
                    Đóng Lại
                </Button>
            </DialogActions>
        </Dialog>
    );
}

