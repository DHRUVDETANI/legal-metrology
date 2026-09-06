---
name: mobile-inspector-ui
description: >-
  Mobile-first user interface for field legal metrology inspectors and role-based analytical dashboards
  built with Next.js App Router, Tailwind CSS, and shadcn/ui.
  Use when designing inspector screens, camera capture interfaces, declaration review forms,
  evidence viewers, or compliance dashboards.
---

# Mobile Inspector UI & Compliance Dashboards

This skill guides the design, component patterns, user flows, and state management for the mobile-first field inspection client and analytical dashboards in **SIH PS26034**.

---

## 1. Design Principles

- **Mobile-First for the Field**: Inspectors work on mobile phones in crowded markets, factory floors, and warehouse bays. UI must feature large touch targets ($\ge 48\text{px}$), high contrast, fast loading, and clear visual hierarchy.
- **Evidence & Usability First**: Avoid decorative clutter. Prioritize clear photographs, highlighted bounding boxes, readable declaration tables, and unambiguous compliance badges.
- **Accessible & Semantic**: Implement standard ARIA attributes, semantic HTML elements, keyboard navigation, and colorblind-safe status indicators (e.g., icons accompanying colors).

---

## 2. Inspector Inspection Workflow

Field inspectors progress through a seamless 12-step flow:

```
[1. Login / Select Station]
             │
             ▼
[2. Large "Scan Product" CTA]
             │
             ▼
[3. Camera Capture / Upload Panel] ────► Live Viewfinder with Guidance Overlay
             │
             ▼
[4. Instant Quality Feedback] ─────────► Warning if blurred, dark, or glare detected
             │
             ▼
[5. Processing Indicator] ─────────────► Step-by-step progress: Preprocessing -> OCR -> CV
             │
             ▼
[6. OCR Declaration Review] ───────────► Side-by-side view: cropped label vs extracted fields
             │
             ▼
[7. Font & Readability Metrics] ───────► Character height in px & estimated mm
             │
             ▼
[8. Real-Time Compliance Verdict] ─────► High-contrast PASS / FAIL / REVIEW badge
             │
             ▼
[9. Violation Evidence Cards] ─────────► Bounding box overlay, observed vs expected, rule code
             │
             ▼
[10. Generate PDF Inspection Report] ──► Instant preview & download button
             │
             ▼
[11. Local / Cloud Save] ──────────────► Sync to Supabase with offline resilience
             │
             ▼
[12. Inspection History] ──────────────► Searchable, filterable list of past scans
```

---

## 3. Essential UI Components & Patterns

### 1. "Scan Product" Primary Action Button
Prominent floating or bottom-docked action button allowing immediate access to camera capture.

### 2. Camera Viewfinder & Quality Guide
- Viewfinder box guiding the inspector to align the product label.
- Real-time client-side blur and glare estimation before final upload.

### 3. Declaration Review & Editing Drawer / Modal
- Lists all extracted mandatory fields (MRP, Net Qty, Mfg Date, Manufacturer, Consumer Care).
- Displays individual OCR confidence percentage badge ($>80\%$ green, $60-80\%$ amber, $<60\%$ red).
- Allows inspector to tap and correct OCR errors before triggering the compliance engine.

### 4. Interactive Evidence Image Viewer
- Pinch-to-zoom and pan capability for packaging photos.
- SVG/Canvas overlay rendering color-coded bounding boxes for each declaration.
- Tapping a violation highlights the corresponding box on the packaging image.

### 5. Violation Card Component
- **Rule Code Badge**: e.g., `LM-R6-MRP-01`
- **Severity Indicator**: Critical / Major / Minor
- **Observed Value**: e.g., `"MRP Rs. 150.00"`
- **Statutory Constraint**: `"Must state 'inclusive of all taxes'"`
- **Actionable Advice**: Cites relevant section under Legal Metrology Act.

---

## 4. Analytical & Reviewer Dashboard Structure

Desktop / tablet view for Reviewers and Administrators:

### Overview Metric Cards
- **Total Inspections Processed** (Day, Week, Month)
- **Compliance Rate (%)** (Passed vs. Total)
- **Violation Count** (Active statutory non-compliances)
- **Pending Review Queue** (Inspections marked `REVIEW`)

### Charts & Aggregations
- **Violation Trends Over Time**: Area/Line chart of infractions.
- **Top Violations by Rule Code**: Bar chart (e.g. Missing tax declaration, non-standard units).
- **Category Breakdown**: Food & Beverages, Cosmetics, Electronics, Textiles.

### Granular Inspection Table & Filters
- Comprehensive data grid with faceted filtering:
  - Date range picker
  - Compliance status (`PASS`, `FAIL`, `REVIEW`)
  - Inspecting officer / station
  - Product brand / manufacturer
  - Rule code violated
- Quick-action drawer: Inspect evidence, review crops, override review status, and download PDF.
