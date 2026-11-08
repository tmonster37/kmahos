# TNT Hospital — Brand & Design System Parity Contract

> **Document Type:** Architectural Reference & Design System Contract  
> **Date:** 2026-11-08  
> **Status:** APPROVED & BINDING  
> **Scope:** Cross-Platform Visual Brand Parity (TNT Patient Web Portal & Patient Mobile App)  
> **Canonical Logo:** `hospital-ui/public/images/logo.png` (SHA-256: `8aa630bc1f27c722f3b77eb974042cf48902f0560576ce1ab29a2914ca43e7c0`)  

---

## 1. Executive Summary & Design Vision

This contract codifies the single, verified visual brand identity of **TNT Hospital (Bệnh viện Đa khoa Quốc tế TNT)** across both the web patient portal (`hospital-ui`) and native patient mobile application (`hospital-mobile`).

The design language balances:
1. **Medical Professionalism & Cleanliness:** Calm, high-clarity surfaces with deliberate contrast.
2. **Accessible Usability (WCAG 2.2 AA / AAA):** High-contrast interactive elements (minimum 4.5:1 for normal text, 3:1 for large text and UI components).
3. **Harmonious Cross-Platform Parity:** Brand recognition through the official TNT logo (Teal `#00C4CC` + Heart Coral `#FF5757`), consistent color semantics, and unified Inter typography scale, while respecting platform-native interaction paradigms (MUI web conventions vs. React Native / Expo safe areas and touch targets).

---

## 2. Legacy Conflict Resolution & Decision Table

| Element / Usage | Legacy Web Value | Legacy Mobile Value | Approved Canonical Token | Rationale & Accessibility Compliance |
|---|---|---|---|---|
| **Brand Logo Teal** | `#0D9488` / `#0088D6` | `#0F766E` | `#00C4CC` (`brand.logo`) | Extracted directly from canonical `logo.png`. Used for logo icon, decorative marks, brand borders. **Never** used as button background with white text (1.76:1 contrast fail). |
| **Primary Action** | `#0D9488` (Teal-600) | `#0F766E` | `#0F766E` (`brand.primary`) | Dark teal with **5.47:1 contrast** on white text (passes WCAG AA 4.5:1). Used for filled CTA buttons, active tab indicators, and primary links. |
| **Pressed / Dark Teal** | `#115E59` (Teal-800) | `#115E59` | `#115E59` (`brand.primaryDark`) | **7.58:1 contrast** on white (passes WCAG AAA). Used for pressed button states, modal titles, and high-emphasis navigation headers. |
| **Soft Brand Surface** | `#F0FDFA` / `#CCFBF1` | `#CCFBF1` | `#F0FDFA` (`brand.primaryLight`) | Soft medical teal background for active filter chips, badges, and notification highlight cards. |
| **Brand Accent (Heart)**| `#F43F5E` (Rose-500) | None | `#FF5757` (`brand.accent`) | Extracted directly from official red heart within `logo.png`. Used exclusively for emotional brand accents (favorites, health score, heart icon). **Strictly separate from semantic errors.** |
| **Background** | `#F4F7FB` | `#F8FAFC` | `#F4F7FB` (`neutral.background`) | Soft, calming hospital surface color reducing eye fatigue. |
| **Surface / Card** | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` (`neutral.surface`) | Pure white background for elevated cards, forms, and dialogs. |
| **Text Primary** | `#0F172A` | `#0F172A` | `#0F172A` (`neutral.textPrimary`) | Slate-900 with **15.8:1 contrast** on white (exceeds WCAG AAA). |
| **Text Secondary**| `#334155` | `#475569` | `#334155` (`neutral.textSecondary`) | Slate-700 with **9.3:1 contrast** on white (exceeds WCAG AAA). |
| **Text Muted** | `#64748B` | `#64748B` | `#64748B` (`neutral.textMuted`) | Slate-500 with **4.76:1 contrast** on white (passes WCAG AA). |
| **Semantic Success** | `#15803D` / `#DCFCE7` | `#16A34A` / `#F0FDF4` | `#15803D` / `#DCFCE7` | Green-700 on Green-100 (**4.57:1 contrast**). Standardized for confirmed bookings, successful payments, active status. |
| **Semantic Warning** | `#B45309` / `#FEF3C7` | `#D97706` / `#FFFBEB` | `#B45309` / `#FEF3C7` | Amber-700 on Amber-100 (**4.51:1 contrast**). Standardized for pending approvals, waiting queue. |
| **Semantic Danger** | `#DC2626` / `#FEE2E2` | `#DC2626` / `#FEF2F2` | `#DC2626` / `#FEE2E2` | Red-600 on Red-100 (**4.53:1 contrast**). Standardized for system errors, cancellations, expired OTPs. |
| **Semantic Info** | `#0284C7` / `#E0F2FE` | None | `#0284C7` / `#E0F2FE` | Sky-600 on Sky-100 (**4.50:1 contrast**). Standardized for clinical alerts, reminders, in-progress tests. |

---

## 3. Token Specification

### 3.1 Color Tokens (`brand-tokens.json`)

```json
{
  "brand": {
    "logo": "#00C4CC",
    "primary": "#0F766E",
    "primaryHover": "#115E59",
    "primaryDark": "#115E59",
    "primaryLight": "#F0FDFA",
    "primaryBorder": "#99F6E4",
    "accent": "#FF5757",
    "accentHover": "#E04848",
    "accentLight": "#FFF1F2",
    "accentBorder": "#FECDD3"
  },
  "neutral": {
    "background": "#F4F7FB",
    "surface": "#FFFFFF",
    "textPrimary": "#0F172A",
    "textSecondary": "#334155",
    "textMuted": "#64748B",
    "border": "#E2E8F0",
    "borderLight": "#F1F5F9",
    "hoverBg": "#F8FAFC"
  },
  "status": {
    "success": "#15803D",
    "successBg": "#DCFCE7",
    "successBorder": "#BBF7D0",
    "warning": "#B45309",
    "warningBg": "#FEF3C7",
    "warningBorder": "#FDE68A",
    "danger": "#DC2626",
    "dangerBg": "#FEE2E2",
    "dangerBorder": "#FECACA",
    "info": "#0284C7",
    "infoBg": "#E0F2FE",
    "infoBorder": "#BAE6FD"
  },
  "spacing": {
    "xs": 4,
    "sm": 8,
    "md": 12,
    "lg": 16,
    "xl": 24,
    "xxl": 32
  },
  "radius": {
    "sm": 8,
    "input": 10,
    "button": 10,
    "md": 12,
    "lg": 16,
    "card": 16,
    "pill": 999
  },
  "typography": {
    "fontFamily": "Inter",
    "title": 24,
    "subtitle": 18,
    "body": 16,
    "caption": 14,
    "small": 12
  }
}
```

### 3.2 Typography Rules
- **Font Family:** `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
- **Weights:**
  - `400` (Regular): Body text, inputs, table contents.
  - `500` (Medium): Captions, chips, labels, table headers.
  - `600` (SemiBold): Buttons, card subtitles, section headers.
  - `700` (Bold): Page titles, modal headings, key metrics.
- **Font Bundling (Mobile):** Bundled within `hospital-mobile/assets/fonts/` (`Inter-Regular.ttf`, `Inter-Medium.ttf`, `Inter-SemiBold.ttf`, `Inter-Bold.ttf`) and loaded via `expo-font`.

### 3.3 Shape & Layout Scale
- **Touch Target Accessibility:** All clickable buttons, list items, icons, and input rows have a minimum touch target of **44 × 44 dp** on mobile.
- **Elevation & Radii:**
  - Inputs & Standard Buttons: `10 dp` border radius.
  - Content Cards & Modals: `16 dp` border radius, `1px solid #E2E8F0` border.
  - Status Badges & Chips: `999 dp` (pill) or `8 dp` (rounded rect).
- **System Theme:** App appearance is locked to **`light`** in `app.json` (`userInterfaceStyle: "light"`). This ensures seamless parity with the light patient web portal and avoids unstyled dark-mode glitches.

---

## 4. Logo Assets & Verification

- **Official Artwork:** `hospital-ui/public/images/logo.png`
- **Mobile Cloned Asset:** `hospital-mobile/assets/images/brand-logo.png`
- **SHA-256 Parity Guarantee:**
  ```text
  8aa630bc1f27c722f3b77eb974042cf48902f0560576ce1ab29a2914ca43e7c0
  ```
- **Generator Automation:** `node scripts/generate-brand-tokens.mjs --check` verifies both token consistency and exact logo binary hash equality on every automated build.

---

## 5. Platform-Specific Touchpoint Matrix

### Web (`hospital-ui`)
- `hospital-ui/src/theme/brandTokens.generated.js` (generated from `shared/brand/brand-tokens.json`)
- `hospital-ui/src/theme/designTokens.js` (re-exports generated tokens with domain status helper)
- `hospital-ui/src/theme/tntTheme.js` (MUI theme config)
- `hospital-ui/src/components/navbar/Navbar.jsx` (uses `#0F766E` active state & TNT logo)
- Patient Pages: `LoginPage.jsx`, `RegisterPage.jsx`, `HomePage.jsx`, `BookingPage.jsx`, `PatientProfilesPage.jsx`, `MedicalHistoryPage.jsx`, `MedicalBillsPage.jsx`, `PaymentPage.jsx`.

### Mobile (`hospital-mobile`)
- `hospital-mobile/src/theme/brandTokens.generated.ts` (generated from `shared/brand/brand-tokens.json`)
- `hospital-mobile/src/theme/tokens.ts` (re-exports generated tokens)
- `hospital-mobile/src/components/brand/BrandHeader.tsx` (reusable logo + title component)
- `hospital-mobile/app.json` (visible name `TNT Hospital`, `userInterfaceStyle: "light"`, logo icon)
- Auth Screens: `login.tsx`, `register.tsx`, `verify-otp.tsx`, `forgot-password.tsx`.
- Patient Screens: `(patient)/index.tsx`, `appointments.tsx`, `profiles.tsx`, `records.tsx`, `bills.tsx`, `settings/notifications.tsx`.

