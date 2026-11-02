import { createTheme } from "@mui/material/styles";
import designTokens from "./designTokens";

const tntTheme = createTheme({
    palette: {
        primary: {
            main: designTokens.brand.primary,      // YouMed medical blue (#0088D6)
            light: designTokens.brand.primaryLight, // #EBF6FE
            dark: designTokens.brand.primaryDark,   // #CFFBF1
            contrastText: "#FFFFFF",
        },
        secondary: {
            main: designTokens.secondary.main,      // Emerald health green (#008C69) - WCAG AA compliant
            light: designTokens.secondary.light,    // #E6FAF4
            dark: designTokens.secondary.hover,     // #007356
            contrastText: "#FFFFFF",
        },
        info: {
            main: designTokens.status.info.main,    // #02adc7ff
            light: designTokens.status.info.bg,     // #E0F2FE
            dark: "#0369A1",
            contrastText: "#FFFFFF",
        },
        warning: {
            main: designTokens.status.warning.main, // #B45309 - WCAG AA compliant (4.51:1)
            light: designTokens.status.warning.bg,  // #FEF3C7
            dark: "#92400E",
            contrastText: "#FFFFFF",
        },
        error: {
            main: designTokens.status.danger.main,  // #DC2626
            light: designTokens.status.danger.bg,   // #FEE2E2
            dark: designTokens.status.danger.dark,  // #B91C1C
            contrastText: "#FFFFFF",
        },
        success: {
            main: designTokens.status.success.main, // #15803D - WCAG AA compliant (4.57:1)
            light: designTokens.status.success.bg,  // #DCFCE7
            dark: "#166534",
            contrastText: "#FFFFFF",
        },
        background: {
            default: designTokens.neutral.bg,       // Calm medical background (#F4F7FB)
            paper: designTokens.neutral.surface,    // #FFFFFF
        },
        text: {
            primary: designTokens.neutral.textPrimary,   // Deep slate #0F172A (15.8:1 AAA)
            secondary: designTokens.neutral.textSecondary, // Slate gray #334155 (9.3:1 AAA)
            disabled: designTokens.interaction.disabledText, // #94A3B8
        },
        divider: designTokens.neutral.border,       // #E2E8F0
    },
    typography: {
        fontFamily: "'Inter', 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        h1: { fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.25, color: designTokens.neutral.textPrimary },
        h2: { fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.3, color: designTokens.neutral.textPrimary },
        h3: { fontSize: "1.3rem", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.35, color: designTokens.neutral.textPrimary },
        h4: { fontSize: "1.15rem", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.4, color: designTokens.neutral.textPrimary },
        h5: { fontSize: "1.05rem", fontWeight: 700, lineHeight: 1.4, color: designTokens.neutral.textPrimary },
        h6: { fontSize: "0.95rem", fontWeight: 700, lineHeight: 1.45, color: designTokens.neutral.textPrimary },
        subtitle1: { fontSize: "0.9rem", fontWeight: 600, lineHeight: 1.5, color: designTokens.neutral.textSecondary },
        subtitle2: { fontSize: "0.825rem", fontWeight: 600, lineHeight: 1.5, color: designTokens.neutral.textSecondary },
        body1: { fontSize: "0.875rem", lineHeight: 1.55, color: designTokens.neutral.textPrimary },
        body2: { fontSize: "0.8rem", lineHeight: 1.5, color: designTokens.neutral.textSecondary },
        caption: { fontSize: "0.725rem", lineHeight: 1.4, color: designTokens.neutral.textMuted },
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
                    backgroundColor: designTokens.brand.primary,
                    backgroundImage: `linear-gradient(135deg, ${designTokens.brand.primary} 0%, ${designTokens.brand.primaryHover} 100%)`,
                    color: "#FFFFFF",
                    "&:hover": {
                        backgroundColor: designTokens.brand.primaryHover,
                    },
                },
                containedSecondary: {
                    backgroundColor: designTokens.secondary.main,
                    backgroundImage: `linear-gradient(135deg, ${designTokens.secondary.main} 0%, ${designTokens.secondary.hover} 100%)`,
                    color: "#FFFFFF",
                    "&:hover": {
                        backgroundColor: designTokens.secondary.hover,
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    border: `1px solid ${designTokens.neutral.border}`,
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
                ":root": {
                    "--color-primary": designTokens.brand.primary,
                    "--color-primary-hover": designTokens.brand.primaryHover,
                    "--color-primary-dark": designTokens.brand.primaryDark,
                    "--color-primary-light": designTokens.brand.primaryLight,
                    "--color-secondary": designTokens.secondary.main,
                    "--color-success": designTokens.status.success.main,
                    "--color-success-bg": designTokens.status.success.bg,
                    "--color-warning": designTokens.status.warning.main,
                    "--color-warning-bg": designTokens.status.warning.bg,
                    "--color-danger": designTokens.status.danger.main,
                    "--color-danger-bg": designTokens.status.danger.bg,
                    "--color-info": designTokens.status.info.main,
                    "--color-info-bg": designTokens.status.info.bg,
                    "--color-text-primary": designTokens.neutral.textPrimary,
                    "--color-text-secondary": designTokens.neutral.textSecondary,
                    "--color-text-muted": designTokens.neutral.textMuted,
                    "--color-border": designTokens.neutral.border,
                    "--color-bg": designTokens.neutral.bg,
                    "--color-surface": designTokens.neutral.surface,
                },
                body: {
                    wordBreak: "break-word",
                    textRendering: "optimizeLegibility",
                    WebkitFontSmoothing: "antialiased",
                    backgroundColor: designTokens.neutral.bg,
                    color: designTokens.neutral.textPrimary,
                },
                "button, .MuiChip-root": {
                    whiteSpace: "nowrap",
                },
                "@media print": {
                    ".no-print, .MuiDrawer-root, .MuiAppBar-root, header, nav, footer, button, .MuiButton-root, .MuiButtonGroup-root, .MuiToggleButtonGroup-root": {
                        display: "none !important",
                    },
                    "body, #root": {
                        backgroundColor: "#FFFFFF !important",
                        color: "#000000 !important",
                        margin: "0 !important",
                        padding: "0 !important",
                    },
                    "main, [role='main']": {
                        margin: "0 !important",
                        padding: "0 !important",
                        width: "100% !important",
                        maxWidth: "100% !important",
                    },
                    ".MuiContainer-root": {
                        maxWidth: "100% !important",
                        padding: "0 !important",
                        margin: "0 !important",
                    },
                    ".MuiPaper-root": {
                        boxShadow: "none !important",
                    },
                },
            },
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
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    padding: "8px 12px",
                    fontSize: "0.825rem",
                    borderColor: designTokens.neutral.border,
                },
                head: {
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    whiteSpace: "nowrap",
                    color: designTokens.neutral.textSecondary,
                    backgroundColor: designTokens.neutral.hoverBg,
                },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    minHeight: 44,
                    padding: "8px 16px",
                    whiteSpace: "nowrap",
                    fontSize: "0.85rem",
                    textTransform: "none",
                },
            },
        },
    },
});

export default tntTheme;

