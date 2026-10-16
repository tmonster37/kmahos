import React from "react";
import { Paper, BottomNavigation, BottomNavigationAction } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import HistoryIcon from "@mui/icons-material/History";
import PersonIcon from "@mui/icons-material/Person";
import { useAuth } from "../../context/AuthContext";
import designTokens from "../../theme/designTokens";

export default function PatientBottomNav() {
    const location = useLocation();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    // Map path hiện tại sang index của BottomNav
    const getNavValue = () => {
        const path = location.pathname;
        if (path === "/") return 0;
        if (path === "/booking") return 1;
        if (path === "/my-history" || path === "/my-bills" || path === "/reminders") return 2;
        if (path === "/profiles" || path === "/login" || path === "/register") return 3;
        return -1;
    };

    const handleChange = (_, newValue) => {
        switch (newValue) {
            case 0:
                navigate("/");
                break;
            case 1:
                navigate("/booking");
                break;
            case 2:
                navigate(isAuthenticated ? "/my-history" : "/login");
                break;
            case 3:
                navigate(isAuthenticated ? "/profiles" : "/login");
                break;
            default:
                break;
        }
    };

    return (
        <Paper
            elevation={8}
            sx={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 1200,
                display: { xs: "block", md: "none" },
                borderTop: `1px solid ${designTokens.neutral.border}`,
                bgcolor: "#FFFFFF"
            }}
        >
            <BottomNavigation
                showLabels
                value={getNavValue()}
                onChange={handleChange}
                sx={{
                    height: 60,
                    "& .MuiBottomNavigationAction-root": {
                        minWidth: "auto",
                        padding: "6px 0",
                        color: designTokens.neutral.textMuted,
                        "&.Mui-selected": {
                            color: designTokens.brand.primary,
                            "& .MuiBottomNavigationAction-label": {
                                fontWeight: 700,
                                fontSize: "0.72rem"
                            }
                        }
                    },
                    "& .MuiBottomNavigationAction-label": {
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        mt: 0.2
                    }
                }}
            >
                <BottomNavigationAction label="Trang chủ" icon={<HomeIcon sx={{ fontSize: 22 }} />} />
                <BottomNavigationAction label="Đặt khám" icon={<EventAvailableIcon sx={{ fontSize: 22 }} />} />
                <BottomNavigationAction label="Sổ khám" icon={<HistoryIcon sx={{ fontSize: 22 }} />} />
                <BottomNavigationAction label={isAuthenticated ? "Hồ sơ" : "Tài khoản"} icon={<PersonIcon sx={{ fontSize: 22 }} />} />
            </BottomNavigation>
        </Paper>
    );
}
