# Security & Governance Policy: SIH PS26034

> **Legal Metrology Compliance System for Packaged Commodities**  
> **Core Invariant**: **The deterministic compliance engine is the final authority for compliance decisions. LLMs cannot override compliance results.**

---

## 1. Security Architecture Principles

### Zero Client Trust
- **Never trust client-provided role fields**: User roles (`inspector`, `reviewer`, `admin`) are determined strictly server-side from signed JWT sessions or the `users_profile` table.
- **Never trust client compliance status**: The client cannot submit `status: "PASS"`. Verdicts are computed strictly server-side by the deterministic compliance engine.

### Service Role Key Confinement
- `SUPABASE_SERVICE_ROLE_KEY` bypasses all Row Level Security.
- It must NEVER be prefixed with `NEXT_PUBLIC_`.
- It must NEVER be imported into client-side components or browser scripts.

### Storage Isolation & Signed URLs
- Raw packaging images (`raw-images/`), evidence snippets (`evidence-crops/`), and generated PDF reports (`reports/`) reside in **private Supabase storage buckets**.
- Direct public access is disabled.
- Access is granted exclusively via short-lived, authenticated signed URLs (15-minute validity).

### Input Validation & Sanitization
- All API route handlers must validate input payloads using **Zod** schemas.
- Uploaded files must be validated for allowed MIME types (`image/jpeg`, `image/png`, `image/webp`) and maximum file size (15MB).

---

## 2. Insecure Direct Object Reference (IDOR) Prevention

- All mutating database queries (`UPDATE`, `DELETE`) on inspection records must assert ownership:
  `inspector_id === session.user.id` unless the authenticated actor holds a `reviewer` or `admin` role.
- RLS policies enforce this constraint automatically at the database level.

---

## 3. Tamper-Evident Audit Logging

- All compliance evaluations, manual field edits, and reviewer overrides produce immutable rows in the `audit_logs` table.
- Generated PDF reports record an official SHA-256 hash of report contents and raw evidence, verified via dynamic QR code.
