---
name: evidence-audit-reporting
description: >-
  Evidence-first inspection reconstructability, immutable audit logging, and automated
  legal compliance PDF report generation using @react-pdf/renderer or pdf-lib with Supabase Storage.
  Use when designing or generating inspection reports, PDF templates, evidence packaging,
  or audit trail schemas.
---

# Evidence, Audit Trail and Reporting

This skill governs evidence integrity, inspection reconstructability, tamper-evident audit trails, and official PDF report generation for **SIH PS26034**.

---

## 1. The Evidence-First Invariant

> [!CRITICAL]
> **EVERY INSPECTION MUST BE 100% RECONSTRUCTABLE FROM SOURCE EVIDENCE.**
> Any auditor, court of law, or reviewing officer must be able to open an inspection record years later and inspect the exact original image, the raw OCR response, the computer vision bounding boxes, the exact rule versions applied, and the chain of custody.

### Zero-Fabrication Directive
- **Never fabricate**: visual evidence, bounding boxes, pixel measurements, timestamps, or legal conclusions.
- In test environments or automated mock scenarios, explicitly tag records with `is_mock: true` and `[DEMO FIXTURE]` watermarks.

---

## 2. Complete Inspection Report Structure

An official Legal Metrology compliance report (PDF and JSON) must contain:

1. **Inspection Metadata**:
   - Unique Inspection ID (`INSP-YYYYMMDD-XXXXX`)
   - Inspection Timestamp (UTC & IST)
   - Inspecting Officer ID, Name, and Jurisdiction/Station
   - Location / Store Details (GPS coordinates if available)
2. **Product & Manufacturer Information**:
   - Product Brand, Commercial Name, Category, SKU/Barcode
   - Declared Manufacturer / Packer / Importer Name & Postal Address
3. **Captured Packaging Evidence**:
   - High-resolution packaging photographs (Primary Display Panel, Info Panel)
   - Visual bounding box overlays highlighting detected declarations
   - Image quality metrics (Resolution, Sharpness/Blur, Glare score)
4. **Extracted Declarations Table**:
   - Field name, observed text, normalized value, extraction confidence ($0-100\%$)
5. **Computer Vision & Font Readability Analysis**:
   - Character pixel height, baseline metrics, contrast ratio
   - Calibration details (if reference scale present)
6. **Detailed Rule Check Log**:
   - List of all evaluated statutory rules
   - Rule code, statutory requirement, observed value, expected constraint
   - Individual check status (`PASS` / `FAIL` / `REVIEW`)
7. **Violations Summary (if any)**:
   - Specific statutory infraction details
   - Cropped visual evidence image showing the non-compliant region
   - Recommended enforcement action under Legal Metrology Act, 2009
8. **Reviewer Annotations & Sign-off**:
   - Officer notes, audit comments, verification status
9. **System Provenance**:
   - Software application version
   - Active Legal Metrology Ruleset version
   - Cryptographic hash (SHA-256) of report content for tamper detection

---

## 3. Immutable Audit Trail Specification

Every state transition and human modification must append an immutable audit log record in PostgreSQL:

```typescript
export interface AuditLogEntry {
  id: string;
  inspection_id?: string;
  report_id?: string;
  actor_id: string;             // User ID of inspector, reviewer, or admin
  actor_role: 'inspector' | 'reviewer' | 'admin' | 'system';
  action:
    | 'INSPECTION_CREATED'
    | 'IMAGE_UPLOADED'
    | 'OCR_EXECUTED'
    | 'FIELD_EDITED'
    | 'COMPLIANCE_EVALUATED'
    | 'STATUS_OVERRIDDEN'
    | 'REPORT_GENERATED'
    | 'REPORT_DOWNLOADED'
    | 'RULESET_MODIFIED';
  changed_data: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    field_name?: string;
    rationale?: string;
  };
  rule_version: string;
  client_ip?: string;
  created_at: string;           // ISO 8601 UTC
}
```

---

## 4. PDF Generation Architecture

- **Engine**: `@react-pdf/renderer` for declarative React-based PDF styling or `pdf-lib` for high-throughput programmatic document manipulation.
- **Visual Styling**:
  - Official government / regulatory layout style: formal typography, clear tabular summaries, high-contrast status banners (`PASS`: Green `#15803d`, `FAIL`: Red `#b91c1c`, `REVIEW`: Amber `#b45309`).
  - Embedded evidence crops with red bounding box highlights directly on the PDF page.
  - Header with Ashoka Lion emblem / Legal Metrology Directorate header styling and official document verification QR code.
- **Storage & Retrieval**:
  - Rendered PDF is stored in private Supabase bucket: `reports/{inspection_id}/report.pdf`.
  - Downloads are mediated via short-lived signed URLs (15-minute expiry).
