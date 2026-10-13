# Export & Import Data Dictionary

## Overview
This document describes the structure of all exportable/importable data entities in Belko Edu-Platform.

## Format Specifications
- **Excel (.xlsx)**: Multiple sheets, one per entity
- **CSV**: One file per entity, UTF-8 encoded
- **JSON**: Single file with entity keys
- **Date Format**: ISO 8601 (YYYY-MM-DD for dates, YYYY-MM-DDTHH:mm:ss for datetime)
- **Money**: Stored as integer (smallest unit, e.g., kobo/cents), exported as decimal with 2 places
- **Boolean**: 1/0 in CSV/Excel, true/false in JSON

---

## Entity: students

| Column | Type | Required | Unique | Description |
|--------|------|----------|--------|-------------|
| admission_number | string(50) | Yes | Yes | School-assigned ID |
| first_name | string(100) | Yes | | |
| middle_name | string(100) | No | | |
| last_name | string(100) | Yes | | |
| date_of_birth | date | No | | YYYY-MM-DD |
| gender | enum(M,F,O) | No | | Male/Female/Other |
| photo_url | string | No | | Base64 or path |
| address | string(500) | No | | |
| phone | string(20) | No | | |
| email | string(255) | No | | |
| enrollment_date | date | Yes | | YYYY-MM-DD |
| status | enum | Yes | | active,graduated,transferred,suspended,withdrawn |
| class_id | uuid | No | | FK to classes |
| stream_id | uuid | No | | FK to streams |

---

## Entity: guardians

| Column | Type | Required | Unique | Description |
|--------|------|----------|--------|-------------|
| first_name | string(100) | Yes | | |
| middle_name | string(100) | No | | |
| last_name | string(100) | Yes | | |
| phone | string(20) | No | | |
| email | string(255) | No | | |
| address | string(500) | No | | |
| relationship | string(50) | No | | e.g., Father, Mother |
| is_primary | boolean | Yes | | 1 = primary contact |

---

## Entity: student_guardians

| Column | Type | Required | Unique | Description |
|--------|------|----------|--------|-------------|
| student_id | uuid | Yes | | FK to students |
| guardian_id | uuid | Yes | | FK to guardians |

---

## Entity: staff

| Column | Type | Required | Unique | Description |
|--------|------|----------|--------|-------------|
| employee_number | string(50) | Yes | Yes | |
| first_name | string(100) | Yes | | |
| middle_name | string(100) | No | | |
| last_name | string(100) | Yes | | |
| email | string(255) | No | | |
| phone | string(20) | No | | |
| role | enum | Yes | | principal,secretary,teacher |
| hire_date | date | Yes | | YYYY-MM-DD |
| is_active | boolean | Yes | | 1 = can log in |

---

## Entity: classes

| Column | Type | Required | Unique | Description |
|--------|------|----------|--------|-------------|
| name | string(100) | Yes | | e.g., "JSS 2A" |
| academic_year_id | uuid | Yes | | FK to academic_years |
| capacity | integer | No | | Max students |
| homeroom_teacher_id | uuid | No | | FK to staff |

---

## Entity: streams

| Column | Type | Required | Unique | Description |
|--------|------|----------|--------|-------------|
| class_id | uuid | Yes | | FK to classes |
| name | string(50) | Yes | | e.g., "A", "B" |
| capacity | integer | No | | |

---

## Entity: subjects

| Column | Type | Required | Unique | Description |
|--------|------|----------|--------|-------------|
| code | string(20) | Yes | Yes | e.g., MTH, ENG |
| name | string(100) | Yes | | e.g., Mathematics |
| is_core | boolean | Yes | | 1 = core subject |

---

## Entity: teaching_assignments

| Column | Type | Required | Unique | Description |
|--------|------|----------|--------|-------------|
| teacher_id | uuid | Yes | | FK to staff (role=teacher) |
| subject_id | uuid | Yes | | FK to subjects |
| class_id | uuid | Yes | | FK to classes |
| stream_id | uuid | No | | FK to streams |
| academic_year_id | uuid | Yes | | FK to academic_years |
| term_id | uuid | No | | FK to terms |

---

## Entity: homeroom_assignments

| Column | Type | Required | Unique | Description |
|--------|------|----------|--------|-------------|
| teacher_id | uuid | Yes | | FK to staff |
| class_id | uuid | Yes | | FK to classes |
| academic_year_id | uuid | Yes | | FK to academic_years |

---

## Entity: attendance_sessions

| Column | Type | Required | Unique | Description |
|--------|------|----------|--------|-------------|
| class_id | uuid | Yes | | FK to classes |
| stream_id | uuid | No | | FK to streams |
| subject_id | uuid | No | | FK to subjects |
| teacher_id | uuid | Yes | | FK to staff |
| session_date | date | Yes | | YYYY-MM-DD |
| start_time | time | Yes | | HH:mm |
| end_time | time | No | | HH:mm |
| status | enum | Yes | | open,closed,submitted |

---

## Entity: attendance_records

| Column | Type | Required | Unique | Description |
|--------|------|----------|--------|-------------|
| session_id | uuid | Yes | | FK to attendance_sessions |
| student_id | uuid | Yes | | FK to students |
| status | enum | Yes | | present,absent,late,excused |
| remarks | string(500) | No | | |
| recorded_by | uuid | Yes | | FK to staff |

---

## Entity: grade_components

| Column | Type | Required | Unique | Description |
|--------|------|----------|--------|-------------|
| name | string(100) | Yes | | e.g., Classwork, Exam |
| weight | integer | Yes | | Percentage weight (1-100) |
| max_score | integer | Yes | | Max points for component |
| subject_id | uuid | No | | FK to subjects |
| academic_year_id | uuid | Yes | | FK to academic_years |
| term_id | uuid | No | | FK to terms |

---

## Entity: grade_scales

| Column | Type | Required | Unique | Description |
|--------|------|----------|--------|-------------|
| name | string(100) | Yes | | e.g., WAEC Standard |
| academic_year_id | uuid | Yes | | FK to academic_years |
| is_default | boolean | Yes | | 1 = default for year |

---

## Entity: grade_boundaries

| Column | Type | Required | Unique | Description |
|--------|------|----------|--------|-------------|
| grade_scale_id | uuid | Yes | | FK to grade_scales |
| letter | string(10) | Yes | | e.g., A1, B2, C3 |
| min_score | integer | Yes | | Inclusive minimum |
| max_score | integer | Yes | | Inclusive maximum |
| remark | string(100) | Yes | | e.g., Excellent, Pass |

---

## Entity: grade_sheets

| Column | Type | Required | Unique | Description |
|--------|------|----------|--------|-------------|
| class_id | uuid | Yes | | FK to classes |
| stream_id | uuid | No | | FK to streams |
| subject_id | uuid | Yes | | FK to subjects |
| teacher_id | uuid | Yes | | FK to staff |
| academic_year_id | uuid | Yes | | FK to academic_years |
| term_id | uuid | Yes | | FK to terms |
| status | enum | Yes | | draft,submitted,reviewed,approved,published |

---

## Entity: grade_entries

| Column | Type | Required | Unique | Description |
|--------|------|----------|--------|-------------|
| grade_sheet_id | uuid | Yes | | FK to grade_sheets |
| student_id | uuid | Yes | | FK to students |
| component_id | uuid | Yes | | FK to grade_components |
| score | integer | No | | Actual score (null = not entered) |
| is_draft | boolean | Yes | | 1 = draft, 0 = finalized |
| entered_by | uuid | Yes | | FK to staff |

---

## Entity: fee_components

| Column | Type | Required | Unique | Description |
|--------|------|----------|--------|-------------|
| name | string(100) | Yes | | e.g., Tuition, Uniform |
| amount | integer | Yes | | In smallest currency unit |
| frequency | enum | Yes | | once,term,monthly,annual |
| is_mandatory | boolean | Yes | | 1 = required |
| academic_year_id | uuid | Yes | | FK to academic_years |
| term_id | uuid | No | | FK to terms |
| class_id | uuid | No | | FK to classes |

---

## Entity: fee_structures

| Column | Type | Required | Unique | Description |
|--------|------|----------|--------|-------------|
| name | string(100) | Yes | | e.g., JSS 2 Term 1 |
| academic_year_id | uuid | Yes | | FK to academic_years |
| term_id | uuid | No | | FK to terms |
| class_id | uuid | No | | FK to classes |

---

## Entity: fee_bills

| Column | Type | Required | Unique | Description |
|--------|------|----------|--------|-------------|
| student_id | uuid | Yes | | FK to students |
| fee_structure_id | uuid | Yes | | FK to fee_structures |
| academic_year_id | uuid | Yes | | FK to academic_years |
| term_id | uuid | Yes | | FK to terms |
| total_amount | integer | Yes | | Sum of components |
| paid_amount | integer | Yes | | Running total paid |
| balance | integer | Yes | | total - paid |
| status | enum | Yes | | pending,partial,paid,overdue,voided |
| due_date | date | Yes | | YYYY-MM-DD |
| generated_by | uuid | Yes | | FK to staff |

---

## Entity: fee_payments

| Column | Type | Required | Unique | Description |
|--------|------|----------|--------|-------------|
| bill_id | uuid | Yes | | FK to fee_bills |
| student_id | uuid | Yes | | FK to students |
| amount | integer | Yes | | In smallest currency unit |
| method | enum | Yes | | cash,bank_transfer,cheque,mobile_money,card,other |
| reference_number | string(100) | No | | External ref |
| payment_date | date | Yes | | YYYY-MM-DD |
| received_by | uuid | Yes | | FK to staff |
| receipt_number | string(50) | Yes* | Yes* | Sequential, *when not void |
| is_void | boolean | Yes | | 1 = voided |
| void_reason | string(500) | No | | Required if void |

---

## Entity: receipt_counters

| Column | Type | Required | Unique | Description |
|--------|------|----------|--------|-------------|
| prefix | string(20) | Yes | | e.g., RCPT-2026-2027- |
| current_number | integer | Yes | | Next number to use |
| academic_year_id | uuid | Yes | | FK to academic_years |

---

## Entity: report_cards

| Column | Type | Required | Unique | Description |
|--------|------|----------|--------|-------------|
| student_id | uuid | Yes | | FK to students |
| academic_year_id | uuid | Yes | | FK to academic_years |
| term_id | uuid | Yes | | FK to terms |
| class_id | uuid | Yes | | FK to classes |
| stream_id | uuid | No | | FK to streams |
| pdf_path | string | No | | Generated PDF location |
| generated_at | datetime | No | | |
| generated_by | uuid | No | | FK to staff |
| is_final | boolean | Yes | | 1 = published version |

---

## Entity: conduct_remarks

| Column | Type | Required | Unique | Description |
|--------|------|----------|--------|-------------|
| report_card_id | uuid | Yes | | FK to report_cards |
| conduct | string(500) | Yes | | Behavior |
| attitude | string(500) | Yes | | |
| attendance_summary | string(500) | Yes | | Auto from attendance |
| teacher_remark | string(1000) | Yes | | Homeroom teacher |
| principal_remark | string(1000) | No | | Principal |
| principal_signature_url | string | No | | Signature image |

---

## Entity: academic_years

| Column | Type | Required | Unique | Description |
|--------|------|----------|--------|-------------|
| name | string(50) | Yes | Yes | e.g., 2026/2027 |
| start_date | date | Yes | | |
| end_date | date | Yes | | |
| is_current | boolean | Yes | | 1 = active year |

---

## Entity: terms

| Column | Type | Required | Unique | Description |
|--------|------|----------|--------|-------------|
| academic_year_id | uuid | Yes | | FK to academic_years |
| name | string(50) | Yes | | Term 1, Term 2, etc. |
| ordinal | integer | Yes | | 1, 2, 3, 4 |
| start_date | date | Yes | | |
| end_date | date | Yes | | |
| is_current | boolean | Yes | | 1 = active term |
| is_closed | boolean | Yes | | 1 = locked |

---

## Entity: settings (school)

| Key | Type | Description |
|-----|------|-------------|
| school_name | string | |
| school_motto | string | |
| school_address | string | |
| school_logo_url | string | Base64 or path |
| primary_color | string | Hex color |
| secondary_color | string | Hex color |
| country | string | |
| currency | string | ISO 4217 code |
| academic_year | string | Current year name |
| terms_per_year | integer | 2, 3, or 4 |
| grading_scale | string | Name of scale |
| report_template | string | Classic/Modern/Minimal |
| receipt_template | string | Compact/Standard |
| usage_mode | enum | shared/network |
| backup_folder | string | Path |

---

## Entity: schools

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | uuid | Yes | Single row |
| name | string | Yes | |
| motto | string | No | |
| address | string | No | |
| logo_url | string | No | |
| primary_color | string | Yes | Hex |
| secondary_color | string | No | Hex |
| country | string | Yes | |
| currency | string | Yes | ISO 4217 |
| academic_year | string | Yes | |
| terms_per_year | integer | Yes | |
| grading_scale | string | Yes | |
| report_template | string | Yes | |
| receipt_template | string | Yes | |
| usage_mode | enum | Yes | shared/network |
| backup_folder | string | No | |

---

## Import Notes

### Column Mapping
- Case-insensitive header matching
- Extra columns ignored
- Missing required columns → error
- Unknown columns → warning, skipped

### Validation Rules
- **Required fields**: Must be present and non-empty
- **Unique fields**: Must not exist in database (per mode)
- **Foreign keys**: Must exist (or create via separate import)
- **Enums**: Must match exactly (case-insensitive)
- **Dates**: ISO 8601 format
- **Money**: Decimal with 2 places, converted to integer internally

### Import Modes
| Mode | Behavior |
|-------|----------|
| add | Skip if unique field exists |
| update | Error if unique field not found |
| upsert | Update if exists, create if not |

### Dry Run
- Preview shows: Add count, Update count, Skip count, Error count
- No data written
- Error report downloadable as Excel

### Rollback
- Pre-import snapshot created automatically
- Settings → Audit → "Undo Import" restores exact state
- Audit log entry with file checksum