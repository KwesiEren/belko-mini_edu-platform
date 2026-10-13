# Belko Edu-Platform Installation Guide

## System Requirements

- **OS**: Windows 10 (64-bit) or Windows 11
- **RAM**: Minimum 8 GB (16 GB recommended for 3000+ students)
- **Storage**: 2 GB free space for installation + backup space
- **Display**: 1366×768 minimum resolution
- **Network**: Local Wi-Fi router for LAN mode (optional)

## Installation Steps

### 1. Download & Run Installer
1. Download `Belko-Edu-Platform-Setup-1.0.0.exe` from the release page
2. Right-click the installer → "Run as administrator"
3. If Windows SmartScreen warns about unknown publisher:
   - Click "More info" → "Run anyway"
   - This is expected for unsigned installers

### 2. Installation Wizard
1. Click "Next" through welcome screen
2. Accept license agreement
3. Choose installation folder (default: `C:\Program Files\Belko Edu-Platform`)
4. Select components:
   - **Core Application** (required)
   - **Sample Data** (optional, for evaluation)
5. Click "Install"
6. Wait for completion (typically 30-60 seconds)
6. Click "Finish" - launches setup wizard automatically

### 3. First-Run Setup Wizard
On first launch, the setup wizard guides you through:

#### Step 1: School Profile
- **School Name**: Full legal name (appears on reports/receipts)
- **Motto**: Optional
- **Address**: Physical address for documents
- **Country**: Select from list (sets currency automatically)
- **Currency**: Auto-selected based on country
- **Logo**: Upload square PNG/JPG (optional)

#### Step 2: Academic Setup
- **Academic Year**: e.g., "2026/2027"
- **Term Structure**: Three terms / Two semesters / Four quarters / Custom
- **Term Dates**: Start/end dates for current term
- **Grading Scale**: West African Standard (A1-F9) / Percentage / Custom

#### Step 3: Document Templates
- **Report Card**: Classic / Modern / Minimal
- **Receipt**: Compact (half-page) / Standard (full-page)
- Templates fully customizable later in Settings

#### Step 4: Access & Backup
- **Usage Mode**: 
  - "Shared Computer" (default) - staff take turns on one PC
  - "School Network" - staff also connect from phones/laptops via Wi-Fi
- **Backup Folder**: 
  - Choose external USB drive or network share
  - Must be writable
  - **Critical**: Daily backups protect against data loss

#### Step 5: Principal Account
- **Full Name**: Principal's name
- **Email/Username**: For login
- **Password**: Minimum 8 characters
- **Confirm Password**: Must match
- **Sample Data**: Check to load practice data (removable later)

## Post-Installation

### Verify Installation
1. Log in with Principal account
2. Check dashboard loads without errors
3. Test backup: Settings → Backup → "Create Backup Now"
4. Verify backup file exists in chosen folder

### Configure Additional Settings
- **Settings → Branding**: Upload logo, set colors
- **Settings → Grading**: Fine-tune grade boundaries
- **Settings → Terms**: Add future terms
- **Settings → Users**: Create Secretary/Teacher accounts
- **Settings → LAN Mode**: Enable if using network mode

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Windows protected your PC" | Click "More info" → "Run anyway" |
| Backup folder not writable | Run as administrator; check folder permissions |
| App won't start after install | Reboot PC; check Windows Event Viewer for errors |
| LAN mode not working | Ensure PC and phones on same Wi-Fi; disable firewall temporarily for test |

## Uninstallation
1. Settings → System → Uninstall Belko Edu-Platform
2. Or: Windows Settings → Apps → Belko Edu-Platform → Uninstall
3. Data preserved in user folder: `%APPDATA%\Belko Edu-Platform\`

## Support
- Check Admin Guide for advanced configuration
- See Release Notes for known issues
- Contact: support@belko-edu-platform.example.com