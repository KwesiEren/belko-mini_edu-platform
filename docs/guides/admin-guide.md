# Belko Edu-Platform Admin Guide

## Overview
This guide covers system administration tasks for the Principal/IT administrator.

## Backup & Restore

### Automatic Backups
- **Daily**: Runs at 2:00 AM (configurable)
- **On App Close**: Automatic backup before shutdown
- **Pre-Migration**: Before app updates
- **Pre-Import**: Before data imports

### Manual Backup
1. Settings → Backup → "Create Backup Now"
2. Wait for completion notification
3. Backup saved to configured folder with timestamp

### Backup Retention
- **Daily**: 30 days (configurable)
- **Monthly**: 12 months (configurable)
- Old backups auto-deleted

### Restore Procedure
#### Same PC Restore
1. Settings → Backup → "Restore"
2. Select backup file from list
3. Confirm - app creates pre-restore snapshot
4. App restarts with restored data

#### New PC Restore (Disaster Recovery)
1. Install Belko on new PC (same version)
2. Run setup wizard until "Restore Backup" option
3. Select backup file from external drive
4. Complete restore (< 30 minutes for 3000 students)
5. Verify all data: students, grades, fees, receipts
6. Confirm next receipt number continues correctly

### Backup Verification
- Monthly: Settings → Backup → "Verify Backup"
- Select backup → "Test Restore" (read-only)
- Checks: SHA256 checksum, SQLite integrity

## Moving to a New PC

### Preparation (Old PC)
1. Create manual backup: Settings → Backup → "Create Backup Now"
2. Copy backup file to USB/external drive
3. Note: Backup folder path, receipt counter

### Setup (New PC)
1. Install Belko Edu-Platform
2. Run setup wizard
3. At "Backup Folder" step: select same folder path if using network share
4. At "Restore" step: select backup from USB
4. Complete setup

### Verification
- [ ] All students present
- [ ] Grades and report cards intact
- [ ] Fee bills and payments match
- [ ] Receipt counter continues correctly
- [ ] Settings preserved (branding, grading, terms)

## LAN Mode Setup

### Prerequisites
- School Wi-Fi router (no internet required)
- PC and phones on same network
- Windows Firewall: Allow Belko through (installer does this)

### Enable LAN Mode
1. Settings → System → Network Mode: "Enabled"
2. App shows: `http://192.168.x.x:PORT` and QR code
3. Share QR code with staff

### Phone Access
1. Staff open camera/QR scanner on phone
2. Scan QR code → opens Belko in browser
3. Log in with staff credentials
4. Works offline after initial load (service worker)

### Security
- **Never** port forward to internet
- LAN only: bind to `0.0.0.0` on local network
- Rate limiting: 100 req/15min per IP
- Session timeout: 30 days inactivity

### Testing
1. Connect phone to school Wi-Fi
2. Scan QR → login
3. Mark attendance on phone
4. Verify Principal's PC updates within 2 seconds
5. Disconnect router → phone shows "Connection lost" message

## Shared Computer Mode

### Login Screen
- Shows staff list by default
- Toggle "Type username" to hide list
- Principal can disable list in Settings → Security

### Switch User
- Top bar → "Switch user" button
- Returns to login in < 10 seconds
- Previous user's drafts auto-saved
- No data visible to next user (Back button, dialogs cleared)

### Draft Persistence
- Teacher typing grades → auto-saved to IndexedDB
- Switch user → draft restored on re-login
- Lock screen → draft restored on unlock
- Power loss → draft recovered on restart

### Idle Auto-Lock
- Default: 15 minutes inactivity
- Configurable: Settings → Security → Idle timeout
- Screen clears completely on lock
- PIN/password required to unlock

## User Management

### Create Accounts
1. Settings → Users → "Add User"
2. Fill: Name, Email, Role (Principal/Secretary/Teacher)
3. Temporary password generated
4. User must change password on first login

### Roles & Permissions
| Action | Principal | Secretary | Teacher |
|--------|-----------|-----------|---------|
| School settings, branding | ✓ | ✗ | ✗ |
| User management | ✓ | ✗ | ✗ |
| Students (add, edit, import) | ✓ | ✓ | ✗ |
| Attendance (all classes) | ✓ | ✓ | Own only |
| Grades (manage, approve, publish) | ✓ | ✗ | Own subjects |
| Fees (collect, receipts) | ✓ | ✓ | ✗ |
| Reports (view all, export) | ✓ | ✓ | Own classes |
| Backup/Restore | ✓ | ✗ | ✗ |
| Audit log | ✓ | ✗ | ✗ |

### Password Reset
1. Settings → Users → select user → "Reset Password"
2. New temporary password shown
3. User must change on next login

### Disable/Enable User
- Settings → Users → toggle "Active"
- Disabled users cannot log in
- History preserved

### Lockout Policy
- 5 failed attempts → 15 min lockout
- Applies to LAN clients too
- Admin can unlock: Settings → Users → "Unlock"

## Audit Log

### What's Logged
- Logins (success/failed)
- Grade edits after publishing
- Payment voids
- Deletions (soft delete)
- Restores
- Settings changes
- Exports/Imports (with file checksum)
- Backup create/verify/restore

### Viewing
- Settings → Audit Log
- Filter by: user, action, entity, date range
- Export to Excel/CSV
- Immutable - cannot be edited/deleted

## Export & Import

### Export
- Every list/report has "Export" button
- Formats: Excel (.xlsx), CSV, PDF (where printable)
- Respects current filters and user role
- Teacher sees only own classes

### Import
1. Download template from any list screen
2. Fill data in Excel
3. List screen → "Import" → select file
4. Preview: shows Add/Update/Skip counts
5. Confirm → imports with audit log entry

### Import Modes
- **Add Only**: Skip existing records
- **Update Only**: Update matching records only
- **Add & Update**: Both (default)

### Supported Imports
- Students, Guardians
- Staff
- Classes, Subjects
- Teaching assignments
- Attendance
- Grades (as drafts)
- Fee structures
- Opening balances & past payments

### Rollback
- Every import creates pre-import snapshot
- Settings → Audit → "Undo Import"
- Restores exact pre-import state

## Disk Encryption (BitLocker)

### Recommended Setup
1. Windows Settings → Privacy & Security → BitLocker
2. Turn on for system drive (C:)
3. Save recovery key to Microsoft account or USB
4. For shared PC: require PIN at startup

### Data Folder Protection
- Belko data: `%APPDATA%\Belko Edu-Platform\`
- Includes: SQLite DB, backups, uploads, exports
- BitLocker protects entire drive

## OS Account Setup (Shared Computer)

### Recommended
1. Create standard (non-admin) Windows account for "School Staff"
2. Set Belko to auto-start for this user
3. Disable other accounts or use parental controls
4. Principal keeps admin account for maintenance

### Auto-Start
- Settings → System → "Start on boot" (enabled by default)
- Tray icon shows status
- Right-click tray → "Open Belko" / "Backup Now" / "Exit"

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Backup fails | Check folder permissions, disk space |
| Restore fails | Verify backup checksum first |
| LAN not accessible | Check firewall, same Wi-Fi, correct IP |
| Slow performance | Run backup verification, check disk space |
| Forgot Principal password | Requires database access (contact support) |
| Receipt gaps | Check voided payments, audit log |

## Maintenance Schedule

| Frequency | Task |
|-----------|------|
| Daily | Automatic backup (verify weekly) |
| Weekly | Check backup status, disk space |
| Monthly | Test restore (read-only), check audit log |
| Termly | Export fee register, backup before term close |
| Yearly | Full disaster recovery test, OS updates |