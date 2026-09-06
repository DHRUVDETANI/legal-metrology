# System Architecture: SIH PS26034

> **Legal Metrology Compliance System for Packaged Commodities**  
> **Core Invariant**: **The deterministic compliance engine is the final authority for compliance decisions. LLMs cannot override compliance results.**

---

## 1. High-Level Subsystems

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js Web Application                         │
│            (TypeScript, Tailwind CSS, Mobile-First Layout)             │
├────────────────────────────────┬───────────────────────────────────────┤
│    Field Inspector Client      │     Analytical Reviewer/Admin Portal   │
│    - Mobile Camera & Upload    │     - Statewide Compliance Trends      │
│    - Declaration Review Drawer │     - Flagged "REVIEW" Queue           │
│    - Verdict & Evidence Zoom   │     - Regulatory Rule Configurator     │
├────────────────────────────────┴───────────────────────────────────────┤
│                   Next.js Route Handlers (App Router)                  │
│       /api/inspections  /api/declarations  /api/evaluate  /api/reports │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│        Supabase Cloud Backend        │  │     FastAPI CV Service       │
│  - PostgreSQL + Row Level Security   │  │       (Python + OpenCV)      │
│  - Supabase Auth (JWT & Roles)       │  │  - Character height in px    │
│  - Supabase Storage (Private):       │  │  - Contrast ratio            │
│    raw-images/ evidence/ reports/    │  │  - Perspective correction    │
└──────────────────┬───────────────────┘  └──────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│          Hosted OCR Engine           │
│  - Multi-engine OCR (Raw + Polygons) │
│  - Fallback Tesseract / Fixtures     │
└──────────────────────────────────────┘
```

---

## 2. Component Roles

1. **Next.js Web Application**:
   - Mobile-first web application designed for handheld mobile inspection devices.
   - Hosts the field inspector workflow, desktop reviewer queue, and administrative compliance dashboards.
   - Provides server-side API routes (`/api/*`) for data persistence and orchestration.

2. **Supabase PostgreSQL & Storage**:
   - Manages relational entities: users, products, scans, declarations, measurements, rules, violations, reports, and audit logs.
   - Enforces strict data access security via **Row Level Security (RLS)**.
   - Stores raw packaging images, evidence crops, and generated PDF reports in private buckets.

3. **Python / OpenCV / FastAPI Microservice**:
   - Strictly isolated image geometry and computer vision processing.
   - Measures character height in pixels, text contrast ratio, and quality metrics (Laplacian blur).
   - **Does NOT make legal compliance decisions.** Measurements are passed to the deterministic engine.

4. **Hosted OCR Pipeline**:
   - Ingests preprocessed label images and produces raw OCR token stream with polygon bounding boxes.
   - Raw output is preserved immutably to prevent evidence tampering.

5. **Deterministic Compliance Engine**:
   - **The deterministic compliance engine is the final authority for compliance decisions. LLMs cannot override compliance results.**
   - Evaluates normalized declarations against configured, versioned Legal Metrology rules.
   - Produces definitive verdicts: `PASS`, `FAIL`, or `REVIEW`.

---

## 3. Communication Protocols

- **Frontend to Next.js API**: Standard HTTPS JSON requests with Supabase JWT Bearer tokens.
- **Next.js API to FastAPI CV Service**: Internal HTTP POST requests (`CV_SERVICE_URL`) transferring image crops / coordinates and receiving structured measurement payloads.
- **Next.js API to Supabase**: Supabase JS Client over TLS; RLS automatically enforced via user session token.
