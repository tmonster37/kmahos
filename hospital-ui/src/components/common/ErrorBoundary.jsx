import React from "react";
import { Container, Paper, Typography, Box, Button, Stack, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import HomeIcon from "@mui/icons-material/Home";
import LogoutIcon from "@mui/icons-material/Logout";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an unhandled rendering error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = "/";
    };

    handleResetSession = () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/login";
    };

    render() {
        if (this.state.hasError) {
            return (
                <Box
                    sx={{
                        minHeight: "100vh",
                        bgcolor: "#F8FAFC",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        p: 3
                    }}
                >
                    <Container maxWidth="md">
                        <Paper
                            elevation={0}
                            sx={{
                                p: { xs: 4, md: 5 },
                                borderRadius: 4,
                                textAlign: "center",
                                border: "1px solid rgba(239, 68, 68, 0.2)",
                                bgcolor: "#FFFFFF",
                                boxShadow: "0 20px 40px -15px rgba(15, 23, 42, 0.08)"
                            }}
                        >
                            <Box
                                sx={{
                                    width: 76,
                                    height: 76,
                                    borderRadius: "20px",
                                    bgcolor: "rgba(239, 68, 68, 0.1)",
                                    color: "#EF4444",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    mx: "auto",
                                    mb: 2.5
                                }}
                            >
                                <ErrorOutlineIcon sx={{ fontSize: 44 }} />
                            </Box>

                            <Typography variant="overline" sx={{ color: "#EF4444", fontWeight: 800, fontSize: "0.85rem", letterSpacing: "1px" }}>
                                HỆ THỐNG GẶP SỰ CỐ HIỂN THỊ
                            </Typography>

                            <Typography variant="h4" fontWeight={800} sx={{ color: "#0F172A", mt: 0.5, mb: 1.5, fontSize: { xs: "1.4rem", sm: "1.75rem" } }}>
                                Đã xảy ra lỗi không mong muốn trên giao diện
                            </Typography>

                            <Typography variant="body1" sx={{ color: "#64748B", maxWidth: 540, mx: "auto", mb: 3.5, fontSize: "0.95rem" }}>
                                Dữ liệu hoặc thành phần giao diện không thể tải hoàn chỉnh. Dữ liệu bệnh án và các giao dịch của bạn vẫn được bảo toàn an toàn trên máy chủ bệnh viện.
                            </Typography>

                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center" mb={3}>
                                <Button
                                    variant="contained"
                                    startIcon={<RefreshIcon />}
                                    onClick={this.handleReload}
                                    sx={{
                                        bgcolor: "#0088D6",
                                        "&:hover": { bgcolor: "#0070B3" },
                                        fontWeight: 700,
                                        borderRadius: 2.5,
                                        px: 3,
                                        py: 1.2
                                    }}
                                >
                                    Tải lại trang (Reload)
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<HomeIcon />}
                                    onClick={this.handleGoHome}
                                    sx={{
                                        color: "#334155",
                                        borderColor: "rgba(15, 23, 42, 0.15)",
                                        fontWeight: 700,
                                        borderRadius: 2.5,
                                        px: 3,
                                        py: 1.2
                                    }}
                                >
                                    Về Cổng Bệnh Viện
                                </Button>
                                <Button
                                    variant="text"
                                    startIcon={<LogoutIcon />}
                                    onClick={this.handleResetSession}
                                    sx={{
                                        color: "#64748B",
                                        fontWeight: 600,
                                        borderRadius: 2.5,
                                        px: 2
                                    }}
                                >
                                    Xóa phiên & Đăng nhập lại
                                </Button>
                            </Stack>

                            {this.state.error && (
                                <Accordion
                                    elevation={0}
                                    sx={{
                                        bgcolor: "#F8FAFC",
                                        border: "1px solid rgba(15, 23, 42, 0.08)",
                                        borderRadius: "10px !important",
                                        textAlign: "left",
                                        "&:before": { display: "none" }
                                    }}
                                >
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>
                                            Chi tiết kỹ thuật dành cho Quản trị viên (Dev Diagnostic)
                                        </Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Box
                                            component="pre"
                                            sx={{
                                                fontSize: "0.75rem",
                                                fontFamily: "monospace",
                                                color: "#DC2626",
                                                overflowX: "auto",
                                                p: 1.5,
                                                bgcolor: "#FFFFFF",
                                                borderRadius: 1,
                                                border: "1px solid rgba(239, 68, 68, 0.15)",
                                                whiteSpace: "pre-wrap",
                                                wordBreak: "break-word"
                                            }}
                                        >
                                            {this.state.error?.toString()}
                                            {"\n\nComponent Stack Trace:\n"}
                                            {this.state.errorInfo?.componentStack}
                                        </Box>
                                    </AccordionDetails>
                                </Accordion>
                            )}
                        </Paper>
                    </Container>
                </Box>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
