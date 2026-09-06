---
name: sih-demo-judge-readiness
description: >-
  Smart India Hackathon demonstration playbook, golden demo execution script,
  judge evaluation readiness, technical presentation narrative, and fail-safe demo fixtures for PS26034.
  Use when preparing live demonstrations, rehearsing presentations, setting up test fixtures,
  or structuring judge pitches.
---

# SIH Demo and Judge Readiness Playbook

This skill prepares the project for flawless, high-impact demonstrations before Smart India Hackathon (SIH) evaluators, ministry officials, and technical jury panels.

---

## 1. Golden Demo Principles

1. **End-to-End Functionality**: Every step of the demo must actually execute live in the browser. Avoid static mockups or video placeholders.
2. **Speed & Smoothness**: Key interactions (photo upload, OCR, compliance result, PDF generation) must feel snappy and responsive ($< 5\text{s}$).
3. **High Visual Evidence**: Show clear bounding boxes on real packaged commodity photos, highlighting exact violation regions.
4. **Resilience & Fallbacks**: If hotel/venue Wi-Fi drops or external OCR services experience throttling, maintain pre-loaded, clearly labeled demo fixtures that can be activated instantly (`DEMO_MODE=true`).
5. **No Fake Compliance**: Never silently fake a legal result. If demo fixtures are active, display a clean UI badge: `[DEMO FIXTURE / SIMULATED OCR]`.

---

## 2. The 19-Step Golden Demo Script

Rehearse this exact 19-step script for live presentations:

| Step | Action | What Judges See / Narrative Point |
|---|---|---|
| **1** | Login as Inspector | Mobile-first authentication, station selection (e.g. New Delhi Central). |
| **2** | Capture / Upload Label | Upload realistic packaged commodity photo (e.g., Biscuit packet with missing tax clause). |
| **3** | Show Preprocessing | Real-time visual feedback: image sharpness, contrast enhancement, deskewing. |
| **4** | Show OCR Execution | Token bounding boxes appearing over the packaging image. |
| **5** | Show Declaration Extraction | Raw OCR text tokens grouped into declaration blocks. |
| **6** | Show Declaration Mapping | Automatic mapping to standard fields: MRP, Net Qty, Mfg Date, Manufacturer. |
| **7** | Show Font / Readability Analysis | Python/OpenCV character height measurement (e.g. `24px / 2.1mm`) and contrast ratio. |
| **8** | Run Compliance Engine | Single tap: "Evaluate Compliance". Deterministic engine runs in milliseconds. |
| **9** | Show Overall Status | High-contrast status banner changes to **`FAIL`** (or `PASS` / `REVIEW`). |
| **10** | Show Violation Card | Violation card highlights statutory breach: `Missing 'inclusive of all taxes'`. |
| **11** | Show Rule Code | Explicit rule reference: `LM-R6-MRP-INCL-TAX` under Legal Metrology Rules, 2011. |
| **12** | Show Visual Evidence | Tapping violation zooms packaging image to red highlighted bounding box crop. |
| **13** | Generate PDF Report | Generate official inspection report with emblem, QR code, and evidence photos. |
| **14** | Open Inspection History | Show the newly created inspection securely committed to persistent history. |
| **15** | Open Analytical Dashboard | Switch to desktop dashboard: live compliance charts, violation distributions. |
| **16** | Switch to Reviewer Persona | Log in as Senior Reviewer: access the flagged `REVIEW` queue. |
| **17** | Audit Ambiguous Inspection | Reviewer audits low-confidence scan, inspects crop, adds audit note, verifies status. |
| **18** | Switch to Administrator Persona | Log in as Directorate Admin: navigate to Rule Configuration panel. |
| **19** | Configure a Regulatory Rule | Adjust a font threshold or enable a new rule, showing instant rule engine re-versioning. |

---

## 3. Judge Presentation Narrative Arc

Structure the 5-minute hackathon pitch following this narrative:

1. **The Problem**: Over 10 million packaged commodities are sold daily across India. Field officers cannot manually measure font heights, verify multi-line tax declarations, and cross-check manufacturer addresses for every package. Violations go undetected, harming consumers and causing revenue loss.
2. **The Solution**: An automated, mobile-first, evidence-backed inspection system powered by OCR, computer vision, and a deterministic compliance engine.
3. **The Workflow**: Mobile scan $\to$ OCR $\to$ OpenCV font geometry $\to$ Deterministic rules $\to$ Court-admissible PDF report.
4. **Technical Architecture**: Next.js mobile web client + Supabase PostgreSQL/Storage + FastAPI OpenCV microservice.
5. **Key Innovation (Deterministic vs LLM)**:
   > *"We made a deliberate architectural choice: The LLM is NEVER the legal authority. The LLM helps with noisy OCR and summaries, but 100% of our compliance verdicts come from auditable, versioned, deterministic legal rules that can stand up in a court of law."*
6. **Auditability & Evidence**: Every failure links to pixel coordinates and raw image crops. Nothing is fabricated.
7. **Scalability & Impact**: Cloud-native architecture deployable across all state Legal Metrology controllerates, scaling to millions of inspections annually.
