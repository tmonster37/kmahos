import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Box,
    Alert,
    CircularProgress,
    Divider,
    Card,
    CardContent,
    Chip,
    Stack
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import HistoryEduIcon from "@mui/icons-material/HistoryEdu";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";
import { clinicalApi } from "../../services/clinicalApi";
import { formatDate } from "../../utils/formatters";

export default function AddendumModal({ open, onClose, record, onAddendumSuccess }) {
    const [reason, setReason] = useState("");
    const [updatedDiagnosis, setUpdatedDiagnosis] = useState("");
    const [updatedTreatmentPlan, setUpdatedTreatmentPlan] = useState("");
    const [clinicalNotes, setClinicalNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [addendums, setAddendums] = useState([]);
    const [loadingAddendums, setLoadingAddendums] = useState(false);

    useEffect(() => {
        if (open && record?.recordId) {
            setReason("");
            setUpdatedDiagnosis(record.finalDiagnosis || record.initialDiagnosis || "");
            setUpdatedTreatmentPlan(record.treatmentPlan || "");
            setClinicalNotes("");
            setErrorMsg("");
            loadAddendums();
        }
    }, [open, record]);

    const loadAddendums = async () => {
        if (!record?.recordId) return;
        setLoadingAddendums(true);
        try {
            const res = await clinicalApi.getAddendums(record.recordId);
            setAddendums(res.data?.data || []);
        } catch (err) {
            console.error("Lỗi tải danh sách phụ lục bệnh án:", err);
        } finally {
            setLoadingAddendums(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason.trim()) {
            setErrorMsg("Vui lòng nhập lý do bổ sung/đính chính bệnh án theo Thông tư 46/2018/TT-BYT.");
            return;
        }

        setSubmitting(true);
        setErrorMsg("");
        try {
            await clinicalApi.createAddendum(record.recordId, {
                reason: reason.trim(),
                updatedDiagnosis: updatedDiagnosis.trim(),
                updatedTreatmentPlan: updatedTreatmentPlan.trim(),
                clinicalNotes: clinicalNotes.trim()
            });

            if (onAddendumSuccess) {
                onAddendumSuccess();
            }
            onClose();
        } catch (err) {
            console.error("Lỗi lập phụ lục bệnh án:", err);
            setErrorMsg(err.response?.data?.message || "Không thể lập phụ lục bệnh án. Vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3.5, overflow: "hidden" } }}>
            <DialogTitle sx={{ bgcolor: "#b91c1c", color: "#fff", display: "flex", alignItems: "center", gap: 1.2, py: 1.5, px: 2.5 }}>
                <LockIcon />
                <Typography variant="h6" component="span" sx={{ fontWeight: 800, fontSize: "1.05rem" }}>
                    Lập Phụ Lục Bệnh Án Điện Tử (EMR Addendum)
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ pt: 3 }}>
                <Alert severity="warning" icon={<HistoryEduIcon />} sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Hồ sơ bệnh án đã bị khóa sau 24h kể từ thời điểm kết thúc khám theo quy định tại <strong>Điều 8 Thông tư 46/2018/TT-BYT</strong>.
                    </Typography>
                    <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                        Mọi đính chính, bổ sung thông tin y khoa bắt buộc phải lập Phụ lục bệnh án độc lập, lưu vết thời gian và chữ ký bác sĩ thực hiện.
                    </Typography>
                </Alert>

                {errorMsg && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {errorMsg}
                    </Alert>
                )}

                {/* Form tạo Addendum mới */}
                <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <TextField
                        label="Lý do lập phụ lục (Bắt buộc theo TT 46) *"
                        multiline
                        rows={2}
                        placeholder="Ví dụ: Bổ sung chẩn đoán phụ sau khi có kết quả sinh thiết / Điều chỉnh liều thuốc theo phản hồi của bệnh nhân..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        required
                        fullWidth
                    />

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Chẩn đoán xác định đính chính / bổ sung"
                                multiline
                                rows={3}
                                value={updatedDiagnosis}
                                onChange={(e) => setUpdatedDiagnosis(e.target.value)}
                                fullWidth
                                helperText={`Chẩn đoán trước đó: ${record?.finalDiagnosis || record?.initialDiagnosis || "Chưa có"}`}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Kế hoạch điều trị / Lời dặn đính chính"
                                multiline
                                rows={3}
                                value={updatedTreatmentPlan}
                                onChange={(e) => setUpdatedTreatmentPlan(e.target.value)}
                                fullWidth
                                helperText="Cập nhật hướng điều trị hoặc dặn dò bổ sung"
                            />
                        </Grid>
                    </Grid>

                    <TextField
                        label="Ghi chú lâm sàng bổ sung của Bác sĩ"
                        multiline
                        rows={2}
                        placeholder="Ghi chú thêm về tình trạng lâm sàng hoặc căn cứ chuyên môn..."
                        value={clinicalNotes}
                        onChange={(e) => setClinicalNotes(e.target.value)}
                        fullWidth
                    />
                </Box>

                {/* Lịch sử các Phụ lục Addendum trước đó */}
                <Box sx={{ mt: 4 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                        <AccessTimeIcon color="action" />
                        Lịch sử Phụ lục Bệnh án ({addendums.length})
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    {loadingAddendums ? (
                        <Box sx={{ textAlign: "center", py: 2 }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : addendums.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", textAlign: "center", py: 1 }}>
                            Chưa có phụ lục bệnh án nào được lập cho hồ sơ này.
                        </Typography>
                    ) : (
                        <Stack spacing={2}>
                            {addendums.map((ad, idx) => (
                                <Card key={ad.addendumId || idx} variant="outlined" sx={{ bgcolor: "#fafafa", borderColor: "#e0e0e0" }}>
                                    <CardContent sx={{ pb: "16px !important" }}>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                                            <Chip
                                                label={`Phụ lục #${idx + 1}`}
                                                color="secondary"
                                                size="small"
                                                sx={{ fontWeight: "bold" }}
                                            />
                                            <Typography variant="caption" color="text.secondary">
                                                {formatDate(ad.createdAt)}
                                            </Typography>
                                        </Box>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#d32f2f", mb: 0.5 }}>
                                            Lý do: {ad.reason}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                            Bác sĩ ký duyệt: {ad.doctorName || "Bác sĩ phụ trách"}
                                        </Typography>
                                        {ad.updatedDiagnosis && (
                                            <Typography variant="body2" sx={{ mt: 1 }}>
                                                <strong>Chẩn đoán mới:</strong> {ad.updatedDiagnosis}
                                            </Typography>
                                        )}
                                        {ad.updatedTreatmentPlan && (
                                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                                                <strong>Hướng điều trị:</strong> {ad.updatedTreatmentPlan}
                                            </Typography>
                                        )}
                                        {ad.clinicalNotes && (
                                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, fontStyle: "italic" }}>
                                                Ghi chú: {ad.clinicalNotes}
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    )}
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} disabled={submitting} color="inherit">
                    Hủy bỏ
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    color="error"
                    disabled={submitting}
                    startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <AssignmentTurnedInIcon />}
                >
                    {submitting ? "Đang ký số..." : "Ký & Lưu Phụ Lục (Addendum)"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
