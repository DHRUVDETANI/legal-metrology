---
name: ps26034-project-architect
description: >-
  Architect and evolve the complete PS26034 Legal Metrology Packaging Compliance System.
  Use when designing subsystem boundaries, API contracts, database schemas, processing pipelines,
  or making architectural decisions.
---

# PS26034 Project Architect

This skill guides the overall system architecture, component decomposition, communication protocols, and technology selections for **SIH PS26034: Software System for Legal Metrology Compliance of Packaged Commodities**.

---

## 1. Architectural Philosophy

- **Lead Software Architect Role**: Guard system cohesion, modularity, and maintainability.
- **Strict Separation of Concerns**: Maintain explicit boundaries between:
  1. Frontend (Mobile inspector client & web dashboards)
  2. Core APIs (Next.js App Router API endpoints)
  3. Computer Vision & Geometry Service (Python / OpenCV / FastAPI)
  4. OCR Pipeline (Hosted OCR service with fallback)
  5. Compliance Engine (Deterministic TypeScript rules engine)
  6. Persistence & Security (Supabase PostgreSQL, Storage, Auth & RLS)
  7. Reporting Service (PDF document synthesis)
- **Minimal, Maintainable Changes**: Always inspect existing code and dependencies before introducing new patterns or libraries. Avoid framework sprawl.
- **Traceability & Evidence First**: Every compliance outcome must trace back to concrete visual evidence, bounding boxes, raw OCR text, and formal rule codes.

---

## 2. Technology Stack & Service Boundaries

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js Web Application                         │
│   (TypeScript, Tailwind CSS, shadcn/ui, Lucide Icons, Mobile-First)   │
├────────────────────────────────┬───────────────────────────────────────┤
│  Field Inspector UI (Mobile)   │     Role Dashboards (Desktop/Tablet)   │
│  - Camera Capture / Upload     │     - Compliance Overview & Metrics    │
│  - Extraction Review & Editing │     - Audit & Verification Queue       │
│  - Instant Verdict & Evidence  │     - Regulatory Rule Manager          │
├────────────────────────────────┴───────────────────────────────────────┤
│                    Next.js API Routes (Serverless)                     │
│  - /api/inspections       - /api/declarations       - /api/rules       │
│  - /api/reports           - /api/auth/session       - /api/audit       │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│        Supabase Cloud Backend        │  │     FastAPI CV Service       │
│  - PostgreSQL + Row Level Security   │  │       (Python + OpenCV)      │
│  - Supabase Auth (JWT, RBAC)         │  │  - Character height in px    │
│  - Supabase Storage (Private)        │  │  - Label area calculation    │
│    - raw-images/                     │  │  - Contrast / blur analysis  │
│    - evidence-crops/                 │  │  - Perspective correction    │
│    - reports/                        │  └──────────────────────────────┘
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│          Hosted OCR Engine           │
│  - Multi-engine OCR integration      │
│  - Preserves raw text + bboxes       │
│  - Multi-lingual packaging support   │
└──────────────────────────────────────┘
```

---

## 3. End-to-End Inspection Lifecycle

Every inspection adheres strictly to this 12-stage sequential lifecycle:

1. **Image Capture / Upload**: Field inspector photographs packaged commodity (primary display panel, information panel, batch/MRP markings) or uploads image file.
2. **Image Preprocessing**: Validation of MIME type, file size, image dimensions, orientation detection, and image quality metrics (blur, lighting, contrast).
3. **Hosted OCR Processing**: OCR engine runs over the preprocessed image, generating raw text tokens along with polygon/bounding box coordinates.
4. **Raw OCR Preservation**: Raw OCR response is stored immutably to prevent evidence tampering or loss.
5. **Declaration Extraction & Mapping**: Text is parsed and mapped into standardized Legal Metrology fields (Manufacturer details, Common Name, Net Quantity, MRP, Manufacturing Date, Consumer Care).
6. **Font & Readability Analysis**: Text regions are analyzed via Python/OpenCV to measure character pixel height, display panel area, and contrast ratio.
7. **Deterministic Compliance Evaluation**: Normalized declarations and CV metrics pass to the deterministic rule engine. Rules are evaluated against active Legal Metrology regulations.
8. **Verdict Computation**: Overall inspection verdict is resolved to `PASS`, `FAIL`, or `REVIEW` (with individual violation entries).
9. **Evidence Association**: Every violation is linked to the exact image coordinate crop, observed value, expected constraint, and rule code.
10. **Report Synthesis**: Generate downloadable, auditable PDF inspection report via `@react-pdf/renderer` or `pdf-lib`.
11. **Persistence & Audit Trail**: Save complete inspection record, declaration mappings, violations, and actor audit trail into Supabase PostgreSQL.
12. **Dashboard Notification**: Update inspector history, reviewer review queues, and administrative compliance metrics in real-time.

---

## 4. Architectural Rules & Invariants

1. **No LLM Decision Authority**: Never allow an LLM model call to dictate `status: "PASS"` or `status: "FAIL"`. The compliance engine is purely deterministic code.
2. **FastAPI Isolation**: The FastAPI Python service is strictly an image processing and geometry measurement microservice. It must not handle auth or business rules.
3. **Client-Side Security**: Frontend code must only access public API endpoints or Supabase using anon keys with strict RLS policies. Service-role keys are strictly server-side.
4. **Data Model Immutability**: Historical inspections, violations, and audit logs are append-only. Once an inspection is committed, its raw inputs and verdicts cannot be silently modified.
5. **Continuous Verification**: Update tests (unit, integration, Playwright E2E) and architecture docs whenever subsystem interfaces evolve.
