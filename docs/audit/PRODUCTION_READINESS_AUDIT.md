# Belko Edu-Platform — Production Readiness Audit

- **Date:** 2026-10-26
- **Scope:** Full codebase review of the Electron main process, preload bridge, database layer, services, repositories, renderer, animation system, packaging config, and CI pipeline.
- **Method:** Source reading with file/line evidence, local build runs (`build:main`, `build:preload`, `build:renderer`, `db:migrate`), `tsc --noEmit`, bundle/sourcemap inspection, dependency usage grep, and lottie-react API verification against the installed package.
- **Verdict:** ❌ **Not production-ready.** The project currently consists of a compiled-but-unreachable backend and a static UI mock. Several backend defects (FK violations, inert backup scheduler, sync-layer SQL injection) would fail even with the UI wired up. The current CI pipeline cannot produce a working installer for at least two independent reasons.

Use this document as the remediation tracker. Checkbox items should be ticked off as fixes land.

---

## Legend

| Tag | Meaning |
|-----|---------|
| 🔴 P0 | Blocks QA / release; app broken, data-dangerous, or CI cannot build |
| 🟠 P1 | MVP acceptance-checklist gap (feature missing) |
| 🟡 P2 | Real bug or risk; must fix before release |
| ⚪ P3 | Polish |

---

## 1. 🔴 P0 — Blockers

### P0-1. The UI is not connected to the backend at all
- `window.electronAPI` is **never referenced by any renderer code** (only `src/preload/index.ts` mentions it).
- `src/App.tsx` is a demo: hardcoded stats (1,284 students, ₦18.4m), fake activity feed, empty-state actions that only `console.log` (`App.tsx:244,255,266`), Settings nav item points to a generic placeholder (`App.tsx:107`, `:236-277`).
- Setup wizard "Finish" writes only `localStorage.schoolSettings` (`App.tsx:610-623`). It never creates the `schools` row, academic year, terms, or the principal user in SQLite.
- Sidebar "System ready / Network mode on / Backup: Today, 6:00 AM" is hardcoded (`App.tsx:112-116`) and will mislead QA.
- No login screen, no lock screen, no network QR screen, no Settings page exist.

- [ ] Wire renderer to backend (Phase 1)

### P0-2. No IPC layer for domain data
`src/main/index.ts` registers handlers only for auth / backup / network / export-import / settings / audit. There are **zero** IPC handlers for students, staff, classes, subjects, attendance, grades, or fees; the preload exposes none. The complete repository layer is unreachable from any UI. `UserRepository.getStaffForLogin()` (required for the login name-list) has no IPC exposure.

- [ ] Add domain IPC handlers + preload surface (Phase 1)

### P0-3. Backups always fail at the audit step (FK violation)
`audit_logs.user_id TEXT NOT NULL REFERENCES users(id)` with `PRAGMA foreign_keys = ON` (`src/db/migrations.ts:583`, `src/db/connection.ts:48`). `BackupService.createBackup` writes `user_id: 'system'` (`src/services/backup.ts:86`) → FOREIGN KEY constraint failed → caught → `markFailed` → `success:false`. Same for restore/export/import audit writes and `AuditLogService.log({ user_id: 'import' })` (`export-import.ts:250`). **Every backup/restore/import fails in production.**

- [ ] Fix audit FK (real user IDs; make `system` a nullable or allowed value)

### P0-4. `users` ↔ `staff` are disconnected
`fee_payments.received_by`, `grade_entries.entered_by`, `attendance_sessions.teacher_id`, `attendance_records.recorded_by`, `fee_bills.generated_by`, `report_cards.generated_by` all FK → `staff(id)`, but authentication only creates `users` rows. No code links a user to a staff record; recording a payment or grade with a real user ID throws FK violations. QA requirement "records who did what" is structurally broken.

- [ ] Create linked staff record per user (or add `user_id` to staff)

### P0-5. Scheduled backups can never run; retention never cleans up
- Nothing creates a `backup_schedules` row on first run.
- `next_run_at` is never initialized; `runScheduledBackups()` requires it (`backup.ts:244-246`) → scheduler is inert.
- `recordRun()` sets `next_run_at = now` instead of the next occurrence (`system.ts:90`).
- `cleanupOldBackups()` has **no call site anywhere** — retention is dead code.

- [ ] Seed a default schedule, compute `next_run_at` correctly, call retention

### P0-6. Sync/network layer: SQL injection + dead QR destination
- `NetworkService.applyOperation` interpolates `entity_type` and payload keys directly into SQL (`network.ts:246-255`). Any authenticated device (any role) can execute arbitrary SQL. No table whitelist, no column validation.
- The QR encodes `http://<ip>:<port>` (`network.ts:72-73`) but the HTTP server serves **nothing** — no client page exists. Scanning the QR leads to a dead URL.
- CORS is `origin: '*'` (`network.ts:40`).

- [ ] Whitelist tables/columns, validate payloads; decide QR story (serve a client page or drop the URL)

### P0-7. Animations cannot render (lottie-react v3 API mismatch)
`LottieAnimation.tsx` uses the v2 API (`animationData=`, `onComplete=`), but `package.json` installs **lottie-react ^3.1.2**, which requires `src` and uses `subscriptions` (verified against `node_modules/lottie-react/build/animation/*.d.ts`). `speed`, `loop`, `autoplay`, `seek`, `lottieRef` happen to be valid. With the installed version, every animated component is dead in the built app.

- [ ] Migrate `LottieAnimation` to the v3 API

### P0-8. CI cannot produce a working installer
1. `npm ci` runs with `NODE_ENV: production` (`build-installer.yml:43-46`). npm omits devDependencies when `NODE_ENV=production` → **vite, electron, electron-builder, typescript are all devDependencies** → the next build step fails. This is the *next* failure after the VS Build Tools fix.
2. `electron-builder` `win.icon` points to `src/assets/icon.ico` — the file does not exist (verified: `src/assets/` contains only `animations/`). No `.icns`/`.png` either. Window/tray icon paths in `src/main/index.ts:76,145` (`../assets/…` relative to `dist/main/`) also point at files that aren't packaged there.
3. The `security-check` job calls `node -e "require('./dist/main/index.cjs').runSecurityTests()"` — the bundle exports no such function and executes `app.whenReady()` at import time, crashing in plain Node. Guaranteed failure on every PR (`package.json:20-21`).

- [x] Remove `NODE_ENV=production` from `npm ci`
- [x] Add real icon assets; fix builder + runtime icon paths
- [x] Replace `test:security` / `test:csp` with standalone runner scripts

### P0-9. `BaseRepository.create()` can silently corrupt data
`create()` inserts `[id, ...Object.values(entity), now, now]` against `[this.primaryKey, ...this.columns, created_at, updated_at]` (`src/repositories/base.ts:139-154`). Column order is taken from **object key insertion order**, not the declared `columns` array. Any caller whose key order differs writes values into wrong columns — no error, corrupted records. Affects every `create({...})` using spreads (e.g., `grades.ts:108,208,328`, `fees.ts:219`, `system.ts:186,223`). (`update()` pairs keys with values from the same object, so it is safe.)

- [ ] Map columns explicitly in `create()` / `createBatch()`

### P0-10. TypeScript checking is broken project-wide
`tsc --noEmit` fails immediately: `tsconfig.json(9,5): error TS5102: Option 'baseUrl' has been removed` (TypeScript 7 / tsgo). Combined with esbuild-only builds, **no type errors are ever surfaced**. This is exactly how `src/services/export-import.ts:15` ships `import { AuditLogService } from './audit'` when `src/services/audit.ts` **does not exist** — the build survives only because esbuild elides the shadowed import (the duplicate class in the same file wins). A typecheck would flag it instantly.

- [x] Fix tsconfig (`baseUrl` removed); add a `typecheck` script — `tsc --noEmit` now runs (78 informational errors remain in renderer components/hooks; 2 fixed in main/test runner)
- [ ] Resolve the `'./audit'` phantom import

---

## 2. 🟠 P1 — Missing MVP functionality (acceptance checklist)

| # | Gap | Evidence / note |
|---|-----|-----------------|
| 1 | Login screen (staff name list, Switch user <10s, draft restore) | No UI; `getStaffForLogin` unused; no IPC |
| 2 | Lock screen + idle auto-lock | No `powerMonitor`, no lock UI, no idle timer |
| 3 | Settings page (profile, branding, appearance, backup folder & schedule, users) | Settings → placeholder; `useReducedMotionSetter` exists but **nothing calls it** |
| 4 | "Reduce animations": machine-wide, Principal-only | Currently localStorage per Windows profile; no role gate; no UI |
| 5 | Network QR screen with real connection status | Service exists; no UI |
| 6 | Students CRUD / search / import | Empty state only; handlers are `console.log` |
| 7 | Attendance roll-call (open / mark / close) | Repos exist; no UI/IPC |
| 8 | Grades entry → submit → review → approve → publish | Repos exist; no UI/IPC |
| 9 | Fees: bills, record payment, receipt printing, debtors | Repos exist; **no PDF/receipt generation code at all** (`pdf-lib` never imported) |
| 10 | Report card generation | Table + repository exist; no generation logic, no PDF, no template rendering |
| 11 | Backup / restore / import / export UI | Handlers exist; no screens |
| 12 | First-run data seeding | No `academic_years` / `terms` / `schools` row creation → classes/fees/grades FK to rows that cannot exist |
| 13 | Practice/sample data | Wizard checkbox does nothing (`App.tsx:573`) |
| 14 | Wizard backup folder | "Browse" has no onClick (`App.tsx:557`); `backup_folder` never written |
| 15 | Real dashboard | All Overview numbers hardcoded |

---

## 3. 🟡 P2 — Real bugs & risks

### Data layer
- `FeeBillRepository.findByTerm` assigns `classId` to `where.student_id` (`fees.ts:80-81`) — class filtering returns wrong/empty results.
- `getDebtorsList` includes `voided` bills; bills generated after their due date start as `pending`, never `overdue` (`fees.ts:150-163`).
- `recordPayment` accepts overpayment (negative balance → status "paid") and skips the Zod schemas (`fees.ts:198-227`).
- Receipt numbering is not transactional (`fees.ts:184-196`) — read-then-increment can violate the unique index under concurrency.
- `unlockSheet` ignores its `reason`/`userId` params — unlocking leaves **no audit trail** (`grades.ts:158-171`).
- `grade_entries` has no unique index on (sheet, student, component); `upsertEntry` is check-then-insert outside a transaction (`grades.ts:187-209`).
- `BaseRepository.findById(id, includeDeleted=true)` emits invalid SQL (`SELECT * FROM t  AND t.id = ?` — missing WHERE) (`base.ts:87-94`). Dormant but a landmine.
- `buildWhereClause` / `findAll` interpolate `where` **keys** and `orderBy` into SQL (`base.ts:48-63,100-102`) — once IPC is wired, renderer-controlled filters become injectable identifiers.
- `importFullBackup`: `PRAGMA table_info(${sheetName})` / `INSERT ... INTO ${sheetName}` use the **uploaded file's sheet names in SQL**; no transaction; the `pre_import` backup type is never taken (`export-import.ts:356-394`).
- Restore flow: migrations are not re-run after restore; no refresh event reaches the UI (`backup.ts:148-158`).
- Mixed timestamp formats in the same columns: `datetime('now')` defaults vs. JS `toISOString()`.
- `attendance closeSession` slices UTC time into `end_time` (`attendance.ts:52`) — off-by-timezone display for UTC+1 schools.

### Auth / security
- Hard-coded shared JWT secret fallback (`auth.ts:9`) — every install ships the same signing key. For a single-desktop app, JWT is overkill; a per-install random secret persisted in the DB (or opaque session IDs) is safer and simpler.
- Lockout counter is in-memory only — restart defeats it (`auth.ts:186-196`).
- `auth:reset-password` IPC: **no role check, no password policy** — empty password accepted (`main/index.ts:278-281`, `auth.ts:178-180`).
- No permission gating on any IPC (`settings:set`, `db:restore`, `import:*`, `audit:*` all callable). `AuthService.hasPermission` duplicates `ROLE_PERMISSIONS` (`types/database.ts:498`) — two sources of truth.
- `settings:get/set` open a **second SQLite connection per call**, bypassing the repo layer and its pragmas (`main/index.ts:414-438`).
- `shell:openExternal` accepts any URL from the renderer (`main/index.ts:404-407`).

### Electron shell
- `session.fromPartition('persist:main')` header injection is attached to a partition **the window never uses** (`webPreferences` has no `partition`) → **CSP/X-Frame headers never apply**; no meta CSP in `index.html` either. The policy itself still allows `unsafe-eval`/`unsafe-inline` and Google Fonts hosts despite fonts being bundled via @fontsource (`security.ts:148-160`).
- The Express scaffold is dead code that **never listens**, contains a latent `sanitizeObject is not defined` ReferenceError (`main/index.ts:64` — not imported), and pulls helmet/express into the bundle.
- `dompurify` imported in the main process (`security.ts`) throws without a DOM if called from main-side code; the Zod schemas are not wired to any IPC input.
- Closing the window hides to tray, but the tray icon path is wrong → no tray icon → app looks "crashed" while running invisible (`main/index.ts:124-131,145-148`).
- No `requestSingleInstanceLock` — two instances can hold the same SQLite DB simultaneously.
- `uncaughtException` / `unhandledRejection` only log; the app continues in an undefined state (`main/index.ts:489-495`).

### Renderer / animations
- `useReducedMotion` does `JSON.parse(stored)` without try/catch — corrupted localStorage white-screens the app (`useReducedMotion.ts:9-11`).
- `recolorLottie` only recolors `c/sc/fc/kc` **array** keys — standard Lottie colors live under `k` inside property objects, so school-color recoloring is mostly a no-op with real files (`recolorLottie.ts:32-38`).
- Branding reads/writes localStorage only — violates PRD §6.12 (school settings in DB); restore/backup or profile reset desyncs branding from data.
- No React error boundaries anywhere.
- Animation JSONs are still hand-written placeholders; the approved MD Abdur Rahim files are not downloaded yet (registry + credits structure is ready).

### Dependencies / packaging
- Production deps never imported anywhere → installer bloat: **sharp** (large native libvips), `pdf-lib`, `ws`, `multer`, `compression`, `cors`, `archiver`, `unzipper`, `socket.io-client`, plus `@types/*` packages in `dependencies`. (`pdf-lib` should be **kept** if report-card/receipt PDF work starts; the rest should go until needed.)
- `xlsx@0.18.5` has known prototype-pollution advisories (the "1 high severity" npm audit). Either take the official SheetJS CDN build or accept and document the risk.
- `files` packaging includes `src/assets/**` and `public/**` (source duplication alongside `extraResources`); production sourcemaps (~6 MB) ship in the asar.

### CI / dev tooling
- `db:migrate` / `db:migrate:status` work via tsx (fixed 2026-10-26); `test:security` / `test:csp` are still broken (see P0-8).
- No unit/integration/E2E tests exist at all; lint is format-only (`oxfmt --check`).
- Migration checksum hard-fails with fatal log + `app.quit()` on any amended v1.0 migration — no graceful upgrade path.
- Vite 8 config warnings (`__dirname` → `import.meta.dirname`) — noise.

---

## 4. ⚪ P3 — Polish

- App/window/tray/NSIS icon assets (also required for CI — see P0-8).
- Code signing absent → SmartScreen warnings; provide install-guide instructions or purchase a cert.
- Windows Firewall first-run prompt for LAN mode — add to install guide.
- Decorative UI: ⌘K search hint (Mac symbol on Windows), notifications bell, offline badge, "All changes saved" footer — all static.
- Error/loading/skeleton states; localized date/currency formatting (Intl) instead of hardcoded "DD/MM/YYYY" text.
- `CREDITS.md` exists twice (src + public); consider generating one from `animationRegistry`.
- Unused imports (`useReducedMotion` in `main.tsx`); vite config `__dirname` warnings.

---

## 5. Remediation plan

### Phase 0 — Make the installer buildable
1. [x] Audit document written (this file)
2. [x] Workflow: remove `NODE_ENV=production` from `npm ci`
3. [x] Add `src/assets/icon.png` (512×512); point `win`/`mac`/`linux` icon config at it; fix runtime icon paths (`../../src/assets/…`)
4. [x] Standalone `test:security` / `test:csp` runner (tsx + node-safe sanitizer fallback) — 20/20 XSS + 15/15 SQLi pass, CSP check passes
5. [x] Fix `tsconfig.json` (remove `baseUrl`), add `typecheck` script
6. [ ] Bump version → tag → verify CI produces the installer → run QA A1–A10 (v1.0.1 tagged, CI pending)

### Phase 1 — Bridge UI ↔ backend (critical path)
1. [ ] Domain IPC handlers (students/staff/classes/subjects/attendance/grades/fees/users/settings) with Zod validation + role checks from a single `ROLE_PERMISSIONS` source
2. [ ] First-run completion writes the DB: schools row, academic year/terms, principal user **+ linked staff record** (fixes P0-4)
3. [ ] Fix audit `user_id` FK (P0-3)
4. [ ] Renderer data layer: typed `window.electronAPI` (global.d.ts), AuthProvider (login → lock → switch user), error boundaries
5. [ ] Screens: Login, Lock, Students, Attendance, Grades, Fees (+ receipt/report PDF), Backup/Restore, Import/Export, Network QR (real status), Settings (incl. Reduce animations — Principal-only, machine-wide via DB setting)

### Phase 2 — Data-layer correctness
1. [ ] `BaseRepository` explicit column mapping (P0-9)
2. [ ] Backup scheduler: `next_run_at` computation, retention call, default schedule seeding (P0-5)
3. [ ] Fees fixes: `findByTerm` join, voided debtors, overpayment validation, transactional receipt counter
4. [ ] Network: table/column whitelist + payload validation; QR story decision (P0-6)
5. [ ] `importFullBackup`: transaction + table whitelist + `pre_import` backup
6. [ ] Per-install JWT secret (or opaque sessions); single-instance lock; close-to-tray decision; wire CSP correctly; remove dead Express scaffold + unused deps
7. [ ] tsconfig/typecheck clean; resolve `'./audit'` phantom import (P0-10)

### Phase 3 — Animations & branding finalization
1. [ ] Fix `LottieAnimation` to installed v3 API (`src`, `subscriptions`) (P0-7)
2. [ ] Fix `recolorLottie` for `k` color arrays
3. [ ] Download the 12 approved LottieFiles (≤50 KB each, local only), update CREDITS
4. [ ] Branding from DB settings → CSS vars + recolor (PRD §6.12)

### Phase 4 — QA & release
1. [ ] Full acceptance checklist (all Blockers + ≥95% Majors)
2. [ ] Update developer test report and guides to match reality
3. [ ] Tag release

---

## Appendix A — Verification evidence

| Check | Result |
|-------|--------|
| `npm run build:main` / `build:preload` / `build:renderer` | ✅ pass (`.cjs` outputs correct) |
| `npm run db:migrate` / `db:migrate:status` | ✅ pass (tsx CLI; DB at `data/database/belko.db` in dev) |
| `npx tsc --noEmit` | ❌ TS5102 `baseUrl` removed in TS7 — config error, zero checks run |
| Grep `electronAPI` in `src/` | 1 match (preload only) — renderer never calls the bridge |
| Grep `src/services/audit*` | does not exist; import in `export-import.ts:15` silently elided |
| `src/assets` icons (`icon.ico/.icns/.png`) | do not exist |
| lottie-react installed version API | v3: `src` required, `subscriptions` for events — v2 props in use are invalid |
| `next_run_at` initialization sites | none (only mis-set in `recordRun`) |
| `cleanupOldBackups` call sites | none |
| `requestSingleInstanceLock` / `powerMonitor` | absent |
| Domain IPC handlers (students/attendance/grades/fees) | absent |
| Bundle sources containing `'./audit'` | absent (import elided; duplicate local class used) |

## Appendix B — Assumptions & not-yet-audited areas
- Docs (`docs/guides/*`, `docs/release-notes/*`) were not re-read line-by-line; expect drift — guides likely describe flows that do not exist yet. Re-sync in Phase 4.
- The GitHub Actions run triggered on 2026-10-13 (Node 22 + VS Build Tools fix) had an unverified outcome at audit time; the P0-8 findings predict its next failure regardless.
- QA acceptance checklist (A1–A10 … M1–M9) remains the release gate; this audit maps onto it but does not replace it.
