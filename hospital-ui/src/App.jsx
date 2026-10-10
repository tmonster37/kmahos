import React from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import tntTheme from "./theme/tntTheme";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
    return (
        <ThemeProvider theme={tntTheme}>
            <CssBaseline />
            <AuthProvider>
                <BrowserRouter>
                    <AppRoutes />
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    );
}
