import { createTheme } from "@mui/material/styles";

const tntTheme = createTheme({
    palette: {
        primary: {
            main: "#0088D6",      // YouMed signature medical blue
            light: "#EBF6FE",
            dark: "#0062A3",
            contrastText: "#FFFFFF",
        },
        secondary: {
            main: "#00C292",      // YouMed health emerald green
            light: "#E6FAF4",
            dark: "#008C69",
            contrastText: "#FFFFFF",
        },
        info: {
            main: "#0284C7",
            light: "#E0F2FE",
            dark: "#0369A1",
        },
        warning: {
            main: "#F59E0B",
            light: "#FEF3C7",
            dark: "#D97706",
        },
        error: {
            main: "#EF4444",
            light: "#FEE2E2",
            dark: "#DC2626",
        },
        success: {
            main: "#10B981",
            light: "#D1FAE5",
            dark: "#047857",
        },
        background: {
            default: "#F4F7FB",   // Light calm medical background
            paper: "#FFFFFF",
        },
        text: {
            primary: "#1E293B",   // Deep slate
            secondary: "#64748B", // Slate gray
        },
    },
    typography: {
        fontFamily: "'Inter', 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        h1: { fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.25 },
        h2: { fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.3 },
        h3: { fontSize: "1.3rem", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.35 },
        h4: { fontSize: "1.15rem", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.4 },
        h5: { fontSize: "1.05rem", fontWeight: 700, lineHeight: 1.4 },
        h6: { fontSize: "0.95rem", fontWeight: 700, lineHeight: 1.45 },
        subtitle1: { fontSize: "0.9rem", fontWeight: 600, lineHeight: 1.5 },
        subtitle2: { fontSize: "0.825rem", fontWeight: 600, lineHeight: 1.5 },
        body1: { fontSize: "0.875rem", lineHeight: 1.55 },
        body2: { fontSize: "0.8rem", lineHeight: 1.5 },
        caption: { fontSize: "0.725rem", lineHeight: 1.4 },
        button: {
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.85rem",
        },
    },
    shape: {
        borderRadius: 14,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    boxShadow: "none",
                    "&:hover": {
                        boxShadow: "0 4px 12px rgba(0, 136, 214, 0.2)",
                    },
                },
                containedPrimary: {
                    background: "linear-gradient(135deg, #0088D6 0%, #0070BA 100%)",
                },
                containedSecondary: {
                    background: "linear-gradient(135deg, #00C292 0%, #00A37A 100%)",
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.04)",
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: "none",
                },
                elevation1: {
                    boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
                },
            },
        },
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    wordBreak: "break-word",
                    textRendering: "optimizeLegibility",
                    WebkitFontSmoothing: "antialiased",
                },
                "button, .MuiChip-root": {
                    whiteSpace: "nowrap",
                }
            }
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    fontWeight: 600,
                    borderRadius: 8,
                    fontSize: "0.75rem",
                },
                sizeSmall: {
                    fontSize: "0.7rem",
                    height: 22,
                }
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    padding: "8px 12px",
                    fontSize: "0.825rem",
                },
                head: {
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    whiteSpace: "nowrap",
                }
            }
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    minHeight: 44,
                    padding: "8px 16px",
                    whiteSpace: "nowrap",
                    fontSize: "0.85rem",
                    textTransform: "none",
                }
            }
        },
    },
});

export default tntTheme;

