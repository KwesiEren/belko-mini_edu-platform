# Principal Guide

## Dashboard Overview
- **School Summary**: Students, attendance %, fees collected, pending approvals
- **Today's Attendance**: Donut chart + legend across all classes
- **Fee Collection**: Progress bar, outstanding, today's collection
- **Needs Attention**: Grade approvals, voided payments, backup tests
- **Recent Activity**: Live feed of staff actions

## Daily Tasks
1. **Morning**: Check attendance completion (24/28 classes target)
2. **Review Pending**: Grade approvals, voided payments, backup status
3. **Approve Grades**: Submitted → Reviewed → Approved → Published
4. **End of Day**: Verify backup completed

## Grade Workflow
```
Teacher submits → Homeroom reviews → Principal approves → Published
```
- **Cannot skip steps**
- **Published = locked** (unlock requires reason + audit log)
- **Missing grades** show as "not entered" (never zero)

## Report Cards
1. Settings → Reports → "Generate Report Cards"
2. Select: Class, Term, Template
3. Batch: 60 cards < 2 min, full school < 10 min
4. Spot-check 10 cards against grade sheets
5. Print/PDF for distribution

## Staff Management
- Create Secretary/Teacher accounts
- Reset passwords
- Disable accounts when staff leave
- Audit log: all actions traceable

## Backup Oversight
- Weekly: Verify backup completed
- Monthly: Test restore (read-only)
- Before term close: Manual backup
- Before app update: Pre-migration backup

## LAN Mode
- Enable in Settings → System
- Monitor connected devices
- Verify sync: attendance updates within 2 seconds

## Term Management
- Close term: Locks data, requires override reason
- Year-end promotion: Students move up, history preserved
- Can undo promotion within window

## Security
- Disk encryption (BitLocker) on school PC
- OS account: standard user for staff, admin for you
- Auto-lock: 15 min idle (configurable)
- 5 failed logins = 15 min lockout

## End-of-Term Checklist
- [ ] All attendance submitted
- [ ] All grades approved & published
- [ ] Report cards generated & printed
- [ ] Fee bills generated for next term
- [ ] Backup verified
- [ ] Term closed with reason logged