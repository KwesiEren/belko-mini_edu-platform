# Secretary Guide

## Daily Tasks
1. **Fee Collection**: Record payments, issue receipts
2. **Student Management**: Add/edit/import students
3. **Attendance Backup**: Verify teachers marking attendance
4. **Reports**: Export fee register, debtors list, daily cashier closing

## Fee Collection

### Record Payment
1. Fees & Payments → Student → "Record Payment"
2. Enter: Amount, Method (Cash/Bank/Cheque/Mobile Money), Reference
3. Auto-calculates balance
4. Receipt prints automatically (sequential numbering)

### Receipt Management
- **Sequential numbering**: No gaps, even with voids
- **Void payment**: Requires reason, receipt marked VOID, number not reused
- **Reprint**: Identical to original, logged in audit
- **Daily closing**: Cashier total = sum of day's receipts

### Overpayment
- Configurable: Block or record as credit
- Never silent - always asks for confirmation

## Student Management

### Add Student
1. Students → "Add Student"
2. Required: Admission number, First/Last name, Enrollment date
3. Optional: DOB, gender, photo, address, phone, email, guardian
4. Duplicate admission number rejected

### Import Students
1. Students → "Import" → Download template
2. Fill Excel (500 rows max per import)
3. Preview shows: Add/Update/Skip counts, 10 bad rows rejected with reasons
4. Confirm → imports valid rows

### Student Status
- Active → Graduated/Transferred/Suspended/Withdrawn
- Inactive students leave attendance/fee lists
- History preserved (grades, payments)

## Attendance Support
- View all classes' attendance
- Run reports by class/date range
- Chronic absence threshold configurable
- Attendance auto-included on report cards

## Reports
- **Fee Register**: All bills, payments, balances
- **Debtors List**: Students with outstanding balances
- **Collection Report**: By class, term, payment method
- **Daily Cashier Closing**: Matches cash count
- **Export**: Excel/CSV/PDF with filters

## Student Ledger
- Running balance across terms
- Arrears carried forward
- Debits (bills) / Credits (payments) / Balance

## Import/Export
- Every screen has Export button
- Import templates match exports
- Column mapping saved
- Dry-run preview before confirm

## Troubleshooting
| Issue | Fix |
|-------|-----|
| Receipt won't print | Check printer, try PDF export |
| Import fails | Check template columns, download fresh |
| Duplicate admission | Search first, edit existing |
| Balance wrong | Check voided payments, audit log |