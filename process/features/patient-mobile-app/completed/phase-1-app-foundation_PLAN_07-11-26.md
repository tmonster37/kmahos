# Patient Mobile App — Phase 1 App Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this phase task-by-task.

**Goal:** Create a runnable Expo patient app foundation with a secure native session, a typed API client, and patient-only navigation.

**Architecture:** Use Expo Router for file-based navigation and one Axios client for the Spring API envelope. Store the Bearer token using `expo-secure-store`; verify current user with `/api/auth/me`; clear local credentials on logout or 401.

**Tech Stack:** Current stable Expo SDK and default TypeScript template selected at Phase 1 start, React Native, Expo Router, Axios, Expo SecureStore, Jest/React Native Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-07-patient-mobile-app-design.md`

## Global Constraints

- App root: `hospital-mobile/`; do not modify `hospital-ui/` or shared backend auth transport.
- Expo public environment contains only API URL; never embed server credentials or payment secrets.
- Native auth uses `Authorization: Bearer <accessToken>`; keep token out of AsyncStorage, Realm, logs, test snapshots, and error output.
- Accept only `ROLE_PATIENT`; handle expired token with secure-store deletion and login redirect.
- No phase may expose a payable balance or start checkout for a category marked `UNRECONCILED` by Phase 0; retain the fail-closed behavior through the app foundation.
- Use the Expo SDK supported by current Expo docs at execution time; regenerate lockfile only inside `hospital-mobile/`.

## Review Focus

- A non-patient account must not enter patient routes; pin with `rejectsNonPatientRole`.
- Missing/unreachable API URL must fail with an actionable configuration error, not call localhost implicitly; pin with `requiresConfiguredApiUrl`.
- Invalid, expired, or malformed session must clear SecureStore and show login; pin with `clearsSessionOn401` and `clearsCorruptStoredToken`.

---

### Task 1: Scaffold Expo TypeScript app and local quality commands

**Files:**
- Create: `hospital-mobile/package.json`
- Create: `hospital-mobile/app.json`
- Create: `hospital-mobile/tsconfig.json`
- Create: `hospital-mobile/src/app/_layout.tsx`
- Create: `hospital-mobile/src/app/index.tsx`
- Create: `hospital-mobile/src/app/(auth)/login.tsx`
- Create: `hospital-mobile/src/app/(patient)/_layout.tsx`
- Create: `hospital-mobile/src/theme/tokens.ts`
- Create: `hospital-mobile/jest.config.js`
- Create: `hospital-mobile/.env.example`
- Create: `hospital-mobile/.gitignore`

**Interfaces:**
- Routes: `/login`, `/(patient)` and patient home placeholder; Expo Router owns route mapping.
- Env: `EXPO_PUBLIC_API_URL` is the base URL only; physical devices must use a reachable LAN/staging URL, not phone-local `localhost`.

- [x] **Step 1: Verify the current Expo CLI template command against official Expo documentation, then scaffold** with `npx create-expo-app@latest hospital-mobile --template default` (record the resolved Expo SDK version in `hospital-mobile/package.json`).
- [x] **Step 2: Add `src/app/` route groups** for public auth and protected patient screens; keep the initial patient home as an empty-state shell, not mock clinical content.
- [x] **Step 3: Add `EXPO_PUBLIC_API_URL` sample and scripts** for `start`, `android`, `ios`, `lint`, `typecheck`, and `test`; add Jest Expo/Testing Library only if the scaffold does not already provide them.
- [x] **Step 4: Install foundation packages** with `npm install axios` and `npx expo install expo-secure-store`; add payment-link packages in Phase 3 where they are first used.
- [x] **Step 5: Add a failing smoke test `rendersPatientAppShell`** and the minimum app shell/theme to pass it.
- [x] **Step 6: Run `npx expo-doctor`, `npx tsc --noEmit`, and `npm test -- --runInBand`** from `hospital-mobile/`; expected clean app scaffold and one passing smoke test.

### Task 2: Add typed API client and secure session repository

**Files:**
- Create: `hospital-mobile/src/config/env.ts`
- Create: `hospital-mobile/src/lib/api/types.ts`
- Create: `hospital-mobile/src/lib/api/client.ts`
- Create: `hospital-mobile/src/features/auth/auth.types.ts`
- Create: `hospital-mobile/src/features/auth/auth.api.ts`
- Create: `hospital-mobile/src/features/auth/session.storage.ts`
- Create: `hospital-mobile/src/features/auth/auth.repository.ts`
- Create: `hospital-mobile/src/features/auth/__tests__/auth.repository.test.ts`
- Modify: `hospital-mobile/package.json`

**Interfaces:**
- `ApiResponse<T> = { code: number; message: string; data: T }`.
- `AuthResponse = { accessToken: string; tokenType: "Bearer"; userId: string; fullName: string; phoneNumber: string; role: string }`.
- `login(credentials: { phoneNumber: string; password: string }): Promise<AuthResponse>` calls `POST /api/auth/login`.
- `getCurrentUser(): Promise<AccountInfoResponse>` calls `GET /api/auth/me`.
- `sessionStorage.read(): Promise<string | null>`, `write(token: string): Promise<void>`, `clear(): Promise<void>` wrap SecureStore.
- API client adds Authorization only when a token exists; unwraps `data` once and exposes safe error message/status without response secrets.

- [x] **Step 1: Write tests `storesBearerTokenInSecureStore`, `rejectsNonPatientRole`, `clearsSessionOn401`, `clearsCorruptStoredToken`, and `requiresConfiguredApiUrl`** using mocked SecureStore and Axios adapter.
- [x] **Step 2: Run the focused Jest test file and confirm each test fails before implementation.**
- [x] **Step 3: Implement environment validation and `ApiResponse<T>` unwrapping** in the listed API files; do not default to a production URL or phone-local localhost.
- [x] **Step 4: Implement SecureStore session methods** and auth repository; save a token only after response role is `ROLE_PATIENT`.
- [x] **Step 5: On HTTP 401, clear SecureStore and emit the auth-expired state**; do not attempt refresh because no refresh-token API exists.
- [x] **Step 6: Re-run focused tests, then `npx tsc --noEmit` and `npx eslint src`**; expected all session tests pass and no token appears in snapshots/logs.

### Task 3: Complete login/logout and protected patient shell

**Files:**
- Create: `hospital-mobile/src/features/auth/auth.context.tsx`
- Create: `hospital-mobile/src/features/auth/use-auth.ts`
- Create: `hospital-mobile/src/features/auth/__tests__/login-screen.test.tsx`
- Modify: `hospital-mobile/src/app/_layout.tsx`
- Modify: `hospital-mobile/src/app/index.tsx`
- Modify: `hospital-mobile/src/app/(auth)/login.tsx`
- Modify: `hospital-mobile/src/app/(patient)/_layout.tsx`
- Create: `hospital-mobile/src/app/(patient)/index.tsx`

**Interfaces:**
- `AuthContextValue` exposes `status: "loading" | "signedOut" | "signedIn"`, `user`, `login`, and `logout`.
- On startup, read SecureStore then verify via `/api/auth/me`; 401 clears session.
- Logout calls `POST /api/auth/logout` best-effort, then always clears the native token locally.

- [x] **Step 1: Write `showsValidationErrors`, `routesPatientAfterLogin`, `rejectsStaffAccount`, and `logoutClearsLocalSession` tests** for the login flow and protected root.
- [x] **Step 2: Run the focused screen tests and confirm the auth shell is absent.**
- [x] **Step 3: Implement login with phone/email + password fields** matching the current `LoginRequest` contract and display backend `ApiResponse.message` safely.
- [x] **Step 4: Implement startup restore, patient route guard, and logout behavior** using the auth repository from Task 2.
- [x] **Step 5: Re-run focused tests and test manually on Android emulator** with a test account; expected patient routes block signed-out and staff accounts.

### Phase 1 Gate

- [x] Expo app runs on Android and iOS development builds without changing existing web/backend auth behavior.
- [x] Patient login, restore, logout, and 401 expiry behavior are verified; token resides only in SecureStore.
- [x] API URL is environment-configurable; no API credential or clinical fixture is bundled.
