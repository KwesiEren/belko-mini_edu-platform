# Belko Edu-Platform v1.0.0 Release Notes

**Release Date**: October 13, 2026  
**Build**: Release 1 (Part A MVP - Standalone Offline Edition)  
**Installer**: `Belko-Edu-Platform-Setup-1.0.0.exe` (~280 MB)

---

## Overview
First production release of Belko Edu-Platform - a standalone offline school management system for African schools. Runs entirely on a single school computer with optional LAN access for staff phones.

---

## Core Features (Part A MVP)

### 🏫 School Setup & Branding
- Guided first-run wizard (5 steps, ~15 minutes)
- School profile: name, motto, address, logo, country, currency
- Academic structure: terms/semesters, grading scales, templates
- Document templates: Report cards (Classic/Modern/Minimal), Receipts (Compact/Standard)
- Principal account creation with forced password change

### 👥 Student & Staff Management
- **Students**: Full CRUD, photo upload, guardian linking, sibling grouping
- **Import/Export**: Excel/CSV with template, dry-run preview, 3 modes (add/update/upsert)
- **Status tracking**: Active/Graduated/Transferred/Suspended/Withdrawn with history
- **Staff**: Role-based (Principal/Secretary/Teacher), teaching assignments, homeroom
- **Classes & Streams**: Capacity limits, homeroom teacher assignment

### 📅 Attendance
- Mark: Present/Absent/Late/Excused with remarks
- "All Present" shortcut, keyboard navigation
- Teacher restriction: own classes only (server-enforced)
- Reports by class/date range with exact counts
- Chronic absence threshold (configurable)
- Auto-included on report cards
- LAN sync: phone updates within 2 seconds

### 📝 Grades & Report Cards
- **Grade Components**: Configurable weights (must total 100)
- **Grading Scales**: WAEC Standard / Percentage / Custom with boundaries
- **Spreadsheet Entry**: Tab/Enter/Arrows, Excel paste, instant totals
- **Draft Auto-save**: Recovered on crash/restart
- **Workflow**: Draft → Submitted → Homeroom Review → Principal Approve → Published
- **Calculations**: Weighted totals, class averages, positions, ranks (tie rules)
- **Report Cards**: PDF with crest, photo, breakdown, averages, position, legend, remarks
- **Batch**: 60 cards < 2 min, full school < 10 min
- **Missing grades**: "Not entered" (never zero), publish warns incomplete

### 💰 Fees & Receipts
- **Fee Components**: Per class/term/school, mandatory/optional
- **Bill Generation**: Idempotent (re-run = no duplicates)
- **Payments**: Cash/Bank/Cheque/Mobile Money with reference
- **Receipts**: Sequential numbering (DB transaction, no gaps)
- **Void**: Reason required, marked VOID, number not reused, balance recalculates
- **Ledger**: Running balance across terms, arrears carried forward
- **Reports**: Debtors list, collection by class/term/method, daily cashier closing
- **Concurrency**: LAN mode = distinct receipt numbers

### 💾 Backup & Restore
- **Automatic**: Daily (2 AM) + on app close
- **Manual**: One-click with progress
- **Verification**: SHA256 checksum + SQLite integrity_check
- **Retention**: 30 daily + 12 monthly (configurable)
- **Restore**: Wizard with pre-restore snapshot, exact state recovery
- **Cross-PC**: Clean install + restore < 30 minutes
- **Migration**: Auto backup before app updates
- **Power-cut resilience**: WAL mode + transactions

### 📤 Export & Import
- **Every screen**: Export button (Excel/CSV/PDF)
- **Role-filtered**: Teacher sees own classes only
- **Import templates**: Match exports, column mapping saved
- **Import modes**: Add / Update / Upsert with dry-run preview
- **Atomic**: Crash mid-import = rollback on restart
- **Rollback**: Pre-import snapshot, undo via audit log
- **Mark sheet round-trip**: Export → Excel offline → Import as draft
- **Full DB export**: ZIP with per-table files + README
- **Version compatibility**: Refuse newer, upgrade older, flag damaged

### 🌐 LAN Mode (Optional)
- **Enable**: Settings toggle (Principal only)
- **Access**: QR code + URL on school Wi-Fi
- **Phone**: Browser-based, works offline after load
- **Real-time sync**: Attendance/grades < 2 seconds
- **Conflict detection**: Same record edited → warn, no silent overwrite
- **Offline queue**: Sync on reconnect
- **30 devices tested**: No errors, responsive
- **Security**: Rate limiting, no internet exposure

### 🔐 Security & Audit
- **Auth**: Argon2id hashing, JWT (15m access + 7d refresh), rate limiting
- **Session**: 30-day expiry, revoke all, device tracking
- **RBAC**: Server-side enforcement (Principal/Secretary/Teacher)
- **Audit log**: Immutable, all actions with user/time
- **XSS/SQLi**: DOMPurify + parameterized queries + Zod validation
- **CSP**: Strict headers, no inline scripts
- **No telemetry**: Zero outbound connections (verified)
- **Disk encryption guide**: BitLocker + OS account setup

### ⚡ Performance
- 3000 students + 10 years history: screens < 1s
- Save grades: < 200 ms
- 3-day soak: Stable memory, clean restart
- Disk full: Warning, no corruption
- Clock skew: Server-time receipts, sequential numbers
- Win10/Win11 8GB RAM: Parity tested

---

## Technical Stack
- **Frontend**: React 19 + Vite + Tailwind CSS v4
- **Backend**: Electron + Express (embedded) + SQLite (WAL mode)
- **Database**: better-sqlite3, UUID v7, soft deletes, versioned migrations
- **Auth**: Argon2id, jsonwebtoken, express-rate-limit
- **Real-time**: Socket.io (LAN sync)
- **PDF**: pdf-lib
- **Excel**: SheetJS (xlsx)
- **Charts**: Lottie animations (offline, recolored to school brand)
- **Logging**: Pino structured logging

---

## Known Limitations (P1/P2 - Future Releases)
- Timetable/scheduling
- Full accounting (ledger, P&L)
- Announcements/messaging
- Analytics dashboards
- Work/transfer packages
- Archives module

---

## Installation
1. Download `Belko-Edu-Platform-Setup-1.0.0.exe`
2. Run as Administrator (SmartScreen: "More info" → "Run anyway")
3. Follow installer (default: `C:\Program Files\Belko Edu-Platform`)
4. Launch → Setup Wizard (5 steps)
5. Verify: Dashboard loads, backup works

## System Requirements
- Windows 10/11 (64-bit)
- 8 GB RAM minimum (16 GB recommended)
- 2 GB install + backup space
- 1366×768 display
- Local Wi-Fi router for LAN mode

## Verification Checklist (QA)
- [ ] Install offline - no errors
- [ ] Setup wizard completes
- [ ] All 3 roles work correctly
- [ ] Attendance/Grades/Fees workflows pass
- [ ] Backup/restore on new PC < 30 min
- [ ] 60 report cards < 2 min
- [ ] Switch user < 10 seconds
- [ ] No receipt gaps
- [ ] LAN sync < 2 seconds
- [ ] 2-week pilot: no data loss

## Support
- Admin Guide: `docs/guides/admin-guide.md`
- Role Guides: `docs/guides/{principal,secretary,teacher}-guide.md`
- Data Dictionary: `docs/data-dictionary/export-import-dictionary.md`
- Email: support@belko-edu-platform.example.com

---

## License
Proprietary - Belko Edu-Platform. All rights reserved.
Built for African schools, works offline.