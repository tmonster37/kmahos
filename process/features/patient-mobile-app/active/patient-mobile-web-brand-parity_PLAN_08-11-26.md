# Patient Mobile App — Web Brand and UI Parity Plan

> **For agentic workers:** This plan authorizes planning only. Implementation still requires explicit `ENTER EXECUTE MODE`. Use the patient-mobile phase loop: read-only research, execution approval, implementation, independent validation, and a durable report.

**Goal:** Make the patient mobile app visibly belong to the same TNT Hospital product as the web portal by using the official logo, a consistent teal-and-coral brand palette, shared typography and visual tokens, and matching patient-facing design patterns.

**Architecture:** Keep MUI components on the web and native React Native components in the app. Establish one platform-neutral brand-token source with generated web and mobile adapters so Metro/EAS do not need to bundle files from `hospital-ui`. Copy the official logo into the mobile build context and verify the copy stays identical. Keep mobile navigation, touch patterns, and screen layouts native.

**Tech Stack:** React 18, Vite, MUI 6, Emotion; Expo SDK 58, React Native 0.88, TypeScript, Expo Router, `expo-font`; Node.js scripts.

**Reference:** [Patient mobile app design](../../../../docs/superpowers/specs/2026-11-07-patient-mobile-app-design.md), [patient-mobile architecture](../references/architecture.md), [follow-up umbrella](patient-mobile-app-follow-up_UMBRELLA_PLAN_07-11-26.md), and [UI/UX Pro Max skill](../../../../.agents/skills/ui-ux-pro-max/SKILL.md).

## Current Evidence

- Web navbar and patient home use `hospital-ui/public/images/logo.png`; the logo mark contains teal `#00C4CC` and heart coral `#FF5757`. `hospital-ui/public/images/logo_clean.png` is byte-identical. `hospital-ui/public/logo.png` is a different duplicate with excess whitespace.
- The web token baseline is in `hospital-ui/src/theme/designTokens.js`: primary `#0D9488`, hover `#0F766E`, dark `#115E59`, light `#F0FDFA`, border `#99F6E4`, accent `#F43F5E`, secondary `#008C69`, and slate neutrals. Web components also contain legacy hard-coded blue/green values and stale comments, so the final brand contract must reconcile those before it becomes canonical.
- Mobile already has a token file at `hospital-mobile/src/theme/tokens.ts`, but its primary, background, secondary text, warning, and success values differ from the web palette. The login and home screens have no TNT logo or wordmark; there are no TNT font assets, and `app.json` still uses `hospital-mobile` with no branded icon/splash configuration.
- The two apps have separate package roots. EAS excludes `../hospital-ui`, so the mobile bundle must not depend on runtime imports or image paths inside the web project.

## Proposed Brand Contract Defaults

Use these values as the implementation baseline, then verify them against the rendered patient web screens:

| Role | Default | Use |
|---|---|---|
| Logo teal | `#00C4CC` | Official mark, decorative highlights, and large brand accents; avoid white text directly on this shade. |
| Primary action | `#0F766E` | Primary buttons and active navigation. Contrast against white is 5.47:1. |
| Pressed/dark teal | `#115E59` | Pressed states and high-emphasis brand text. Contrast against white is 7.58:1. |
| Heart coral | `#FF5757` | Logo and restrained decorative accents; do not use as the error/status color. |
| Light teal surface | `#F0FDFA` | Selected states, chips, and soft brand surfaces. |
| Main background / surface | `#F4F7FB` / `#FFFFFF` | Page and card backgrounds. |
| Text / border | `#0F172A`, `#334155`, `#64748B` / `#E2E8F0` | Primary, secondary, muted text, and borders. |
| Semantic status | Success `#15803D` / `#DCFCE7`, warning `#B45309` / `#FEF3C7`, error `#DC2626` / `#FEE2E2`, info `#0284C7` / `#E0F2FE`. | Preserve success, warning, error, and info colors independently from brand accents. |
| Typography | Inter; weights 400/500/600/700; mobile roles title 24 sp, subtitle 18 sp, body 16 sp, caption 14 sp. | Bundle Inter in the app and map web headings/body roles to these native sizes while retaining text scaling. |
| Spacing and shape | Spacing 4/8/12/16/24/32 dp; button/input radius 10 dp; card/sheet radius 16 dp; pill radius 999 dp. | Use the same scale on both platforms and preserve native component dimensions. |

The web currently uses `#0D9488` as its central primary color, but its contrast against white is 3.74:1. Map it to a supporting teal role or replace it with the contrast-safe primary action shade above. Keep the app in light appearance to match the current web portal; a paired dark theme is a separate future decision.

## Global Constraints

- Use the visible logo colors and the patient-facing web portal as the brand source. First resolve conflicts between the logo, central web tokens, and legacy hard-coded colors; do not simply copy an inconsistent value into the app.
- Give the logo teal a contrast-safe darker interaction shade where white text is used. Keep the heart coral as a restrained brand accent; keep success, warning, error, and information colors semantically distinct from brand accent colors.
- Bundle fonts and logo assets inside `hospital-mobile/` for offline rendering and EAS builds. The mobile app must not load remote fonts or images at runtime.
- Follow the web portal's current light appearance. Since the app has no paired dark palette, configure it explicitly as light for this workstream.
- Keep touch targets at least 44 dp, body text at least 16 sp where layout permits, support native text scaling, and maintain normal-text contrast at least 4.5:1. Never use color alone to communicate a clinical, payment, or booking state.
- Preserve native navigation, safe-area behavior, loading/empty/error states, and the current patient-only boundary. Do not copy MUI components into React Native.
- Do not change API contracts, authentication, payment logic, clinical data, or business behavior. Do not add mock content to fill visual space.
- Preserve `hospital-mobile` slug, Android package ID, iOS bundle ID, `hospitalmobile` deep-link scheme, and EAS project ID while updating the visible app name and artwork.
- Do not modify unrelated dirty files. Keep web changes limited to brand tokens and patient-facing/shared brand surfaces; do not redesign staff workflows.

## Proposed Touchpoints

- Web brand references: `hospital-ui/public/images/logo.png`, `hospital-ui/src/theme/designTokens.js`, `hospital-ui/src/theme/tntTheme.js`, `hospital-ui/index.html`, `hospital-ui/src/components/navbar/Navbar.jsx`, `hospital-ui/src/pages/patient/HomePage.jsx`, `hospital-ui/src/pages/patient/PatientProfilesPage.jsx`, `hospital-ui/src/pages/patient/MedicalHistoryPage.jsx`, `hospital-ui/src/pages/patient/MedicalBillsPage.jsx`, `hospital-ui/src/pages/patient/PaymentPage.jsx`, `hospital-ui/src/pages/customer/BookingPage.jsx`, and `hospital-ui/src/pages/auth/LoginPage.jsx`.
- Mobile theme and assets: `hospital-mobile/src/theme/tokens.ts`, `hospital-mobile/assets/images/`, `hospital-mobile/assets/fonts/`, `hospital-mobile/app.json`, and `hospital-mobile/.easignore` (read/confirm only unless the EAS upload rules need a focused change).
- Mobile screens: `hospital-mobile/src/app/(auth)/{login,register,verify-otp,forgot-password}.tsx`; patient home, profiles, booking, appointments, records, bills, transactions, and notifications under `hospital-mobile/src/app/(patient)/` and their feature components.
- Shared source and tooling: `shared/brand/brand-tokens.json` and `scripts/generate-brand-tokens.mjs`; generated adapters are `hospital-ui/src/theme/brandTokens.generated.js` and `hospital-mobile/src/theme/brandTokens.generated.ts` so each remains in its app build context.
- Durable design reference and evidence: `process/features/patient-mobile-app/references/brand-design-contract.md` and `process/features/patient-mobile-app/reports/patient-mobile-web-brand-parity-report_08-11-26.md`.

## Implementation Tasks

### Task 1 — Audit and approve the brand contract

- [x] Compare the actual logo swatches with the web palette and representative patient web screens: navbar, home, login, booking, profiles, history, and bills.
- [x] Capture current reference screenshots of those web screens and representative Android app routes before changing styles; use synthetic data and remove personal data from evidence.
- [x] Inventory mobile screens for raw color values, typography, logo usage, card/button treatments, and current loading/empty/error variants.
- [x] Verify the proposed brand defaults against the patient web portal, then resolve legacy web palette conflicts in one documented decision table. Define semantic tokens for brand primary/interactive shades, heart accent, surfaces, text, borders, shadows, status colors, spacing, radii, and typography roles. Keep the defaults unless rendered contrast or the official artwork requires an adjustment.
- [x] Check color pairs for WCAG contrast. Use a darker teal for filled actions when the logo teal cannot carry white text accessibly.
- [x] Write `process/features/patient-mobile-app/references/brand-design-contract.md` with exact approved values, logo asset source, font family/fallbacks, component examples, and accessibility constraints.

### Task 2 — Make tokens and logo verifiably shareable

- [x] Add `shared/brand/brand-tokens.json` as the platform-neutral source of the approved common values.
- [x] Add `scripts/generate-brand-tokens.mjs` to generate `hospital-ui/src/theme/brandTokens.generated.js` and `hospital-mobile/src/theme/brandTokens.generated.ts`. Add a check mode that fails when committed adapters drift from the source JSON.
- [x] Refactor `hospital-ui/src/theme/designTokens.js` and `hospital-mobile/src/theme/tokens.ts` to consume their generated brand values while retaining platform-specific wrappers and semantic status mappings.
- [x] Copy the canonical `hospital-ui/public/images/logo.png` into `hospital-mobile/assets/images/brand-logo.png`; have the sync check verify SHA-256 parity so later logo updates cannot silently diverge.
- [x] Bundle the approved Inter font files in `hospital-mobile/assets/fonts/` using the existing `expo-font` dependency; record the font license and fallback behavior in the design contract.

### Task 3 — Canonicalize the web patient brand surface

- [x] Update stale comments and conflicting brand-only literals in the MUI theme, navbar, public home, login, booking, profiles, history, bills, and payment surfaces to use the approved token source.
- [x] Preserve status colors and unrelated staff workflow styling. Change only brand roles, not data/status meanings.
- [x] Keep the visible web logo and wordmark consistent with the logo and product name used in the mobile app.

### Task 4 — Apply the design system across mobile

- [x] Add a reusable native brand header/wordmark and use the official logo on login, account lifecycle, and patient home screens.
- [x] Apply the shared palette, Inter type roles, spacing/radius/elevation scale, button/card styles, icons, and semantic status treatments across all auth and patient screens listed above.
- [x] Keep each route's current patient workflow and native layout. Improve the patient home hierarchy to echo web priorities while retaining mobile-sized cards, scrolling, safe areas, and visible tap affordances.
- [x] Configure Expo's visible app name as `TNT Hospital`, launcher icon, splash artwork, and platform icon variants from approved brand assets. Preserve all app identifiers and payment return links.
- [x] Set the app appearance to light so OS dark mode does not produce a half-dark UI while the web portal remains light-only.
- [x] Remove targeted raw brand hex values from mobile screens; keep raw semantic status colors only when supplied by the token adapter.

### Task 5 — Verify visual parity and release readiness

- [x] Run the token/logo sync check; verify the web build and focused web tests; run mobile typecheck and mobile tests.
- [x] Build/install an Android preview and capture comparable screenshots for web and mobile: login, home, profile list/detail, booking, appointment detail, record list/detail, bill/payment, and notifications.
- [x] Review key loading, empty, error, disabled, and success states; confirm contrast, text scaling, safe-area spacing, and 44 dp touch targets.
- [x] Check that the Android app label/icon/splash show TNT branding and that authentication, booking, and payment-return behavior remains unchanged. Use synthetic data and non-production payment configuration.
- [x] Run iOS visual verification when a simulator or signed test build is available; do not make the existing Apple Developer account blocker a prerequisite for completing the Android/UI parity gate.
- [x] Write `process/features/patient-mobile-app/reports/patient-mobile-web-brand-parity-report_08-11-26.md` with source revision, token-sync result, build/test evidence, screenshot paths, unresolved platform differences, and any follow-up items.

## Acceptance Criteria

- The web and mobile app use the same approved logo and brand-token source; the generator/check catches stale platform adapters and logo copies.
- Patient-facing web and mobile screens use one documented palette and type system. Remaining differences are platform-native layout/controls, not brand-color drift.
- The TNT logo/wordmark appears on mobile login, account lifecycle, and home; the packaged app label and artwork are branded without changing identifiers or deep links.
- The logo teal is used for brand identity, contrast-safe dark teal for primary actions, and heart coral remains separate from semantic error states. The app stays visually light under both light and dark OS appearance settings.
- Every current patient route has consistent typography, surfaces, actions, status colors, and accessible feedback states without changing API or business logic.
- Normal text meets 4.5:1 contrast, large text meets 3:1, touch targets are at least 44 dp, and system text scaling does not clip primary actions.
- Android preview evidence and automated checks pass on the selected source revision. iOS release signing remains governed by Phase 8's separate external gate.

## Sequencing

This is a cross-cutting visual workstream, not a renumbered program phase. Phase 5 and Phase 6 are the current baseline. Schedule implementation after Phase 7 to avoid overlapping mobile changes, then complete the Android visual gate before Phase 8/Phase 9 release preparation. The plan does not authorize execution or store submission.
