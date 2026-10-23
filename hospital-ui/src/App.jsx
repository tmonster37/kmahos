import React from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import tntTheme from "./theme/tntTheme";
import AppRoutes from "./routes/AppRoutes";
import ErrorBoundary from "./components/common/ErrorBoundary";

export default function App() {
    return (
        <ThemeProvider theme={tntTheme}>
            <CssBaseline />
            <ErrorBoundary>
                <AuthProvider>
                    <BrowserRouter>
                        <AppRoutes />
                    </BrowserRouter>
                </AuthProvider>
            </ErrorBoundary>
        </ThemeProvider>
    );
}
