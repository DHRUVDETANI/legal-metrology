---
name: legal-metrology-compliance-domain
description: >-
  Legal Metrology regulatory domain models, mandatory declaration rules, entity definitions,
  verdict schemas, and role responsibilities for packaged commodities inspection.
  Use when modeling compliance rules, defining mandatory fields, establishing audit entities,
  or structuring verification results.
---

# Legal Metrology Compliance Domain

This skill establishes the regulatory domain concepts, legal declaration requirements, data contracts, and role boundaries for **SIH PS26034: Software System for Legal Metrology Compliance of Packaged Commodities**.

---

## 1. Domain Philosophy

PS26034 is fundamentally an **official compliance inspection and regulatory enforcement platform**. It models the requirements laid down under the **Legal Metrology Act, 2009** and the **Legal Metrology (Packaged Commodities) Rules, 2011** (along with official amendments).

> [!IMPORTANT]
> **REGULATORY INTEGRITY RULE**:
> - Never invent legal requirements, arbitrary rules, or fictional penalty thresholds.
> - Only evaluate rules present in the project's configured, versioned, and authoritative ruleset.
> - Every compliance failure must cite a formal legal rule code and specific statutory clause.

---

## 2. Mandatory Declaration Fields

Under Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011, pre-packaged commodities sold in India must carry mandatory declarations on the principal display panel or information panel:

| Field Identifier | Regulatory Declaration Name | Description & Statutory Constraints |
|---|---|---|
| `name_address_manufacturer` | Manufacturer / Packer / Importer Info | Complete legal name and physical postal address of the manufacturer, packer, or importer. |
| `common_generic_name` | Common or Generic Name | Generic product identity (e.g., "Biscuits", "Refined Sunflower Oil", "Wheat Flour"). |
| `net_quantity` | Net Quantity | Net quantity in terms of standard units of weight (g, kg), volume (ml, L), or measure/number. Must use standard SI unit symbols. |
| `mrp` | Maximum Retail Price (MRP) | Retail sale price clearly stated as `MRP ₹ ... (inclusive of all taxes)` or `Maximum Retail Price Rs ... incl. of all taxes`. |
| `manufacturing_date` | Date of Manufacture / Packing / Import | Month and year in which the commodity is manufactured, packed, or imported (e.g., `09/2026` or `SEP 2026`). |
| `consumer_care` | Consumer Care Information | Contact details for consumer complaints: Name, address, telephone number, and email ID of designated consumer care representative. |
| `unit_sale_price` | Unit Sale Price (USP) | For packages containing more than 1 unit, net price per g/kg/ml/L (required under recent amendments). |
| `country_of_origin` | Country of Origin | Country of origin if the commodity is imported. |

---

## 3. Core Domain Entities

```typescript
// Core domain interfaces

export type InspectionStatus = 'PASS' | 'FAIL' | 'REVIEW';

export type UserRole = 'inspector' | 'reviewer' | 'admin';

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  barcode?: string;
  manufacturer_id?: string;
  created_at: string;
}

export interface Manufacturer {
  id: string;
  legal_name: string;
  address: string;
  country: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface PackagingImage {
  id: string;
  inspection_id: string;
  storage_path: string;
  panel_type: 'primary_display' | 'information_panel' | 'top_bottom' | 'side';
  width_px: number;
  height_px: number;
  quality_score: number; // 0 - 1.0
  is_blurred: boolean;
  uploaded_at: string;
}

export interface DeclarationField {
  id: string;
  inspection_id: string;
  field_name: string; // e.g. "mrp", "net_quantity"
  observed_text: string;
  normalized_value: Record<string, unknown> | string | number;
  confidence: number; // 0.0 - 1.0
  bbox: { x: number; y: number; width: number; height: number };
  source_image_id: string;
  extraction_method: 'ocr_direct' | 'regex' | 'ai_normalized' | 'manual_edit';
}

export interface FontMeasurement {
  id: string;
  field_name: string;
  pixel_height: number;
  estimated_size_if_calibrated?: number;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
  image_id: string;
  method_version: string;
}
```

---

## 4. Compliance Check Record Schema

Every rule evaluation executed by the compliance engine produces an immutable check record:

```typescript
export interface ComplianceCheckResult {
  rule_code: string;            // e.g. "LM-MRP-001"
  requirement: string;          // Statutory requirement title
  observed_value: string;       // Value found on package or "NOT_FOUND"
  expected_constraint: string;  // Regulatory expectation
  status: InspectionStatus;     // PASS | FAIL | REVIEW
  confidence: number;           // 0.0 - 1.0
  evidence_reference: {
    image_id: string;
    bbox?: { x: number; y: number; width: number; height: number };
    snippet_url?: string;
    raw_text?: string;
  };
  explanation: string;          // Human-readable rationale
  timestamp: string;            // ISO 8601 UTC
  rule_version: string;         // e.g. "2024.1"
}
```

---

## 5. Status Semantics

- **`PASS`**: The declaration satisfies all statutory criteria with high confidence ($C \ge 0.85$). Evidence clearly corroborates the finding.
- **`FAIL`**: A definitive, evidence-backed violation was detected (e.g., MRP missing `inclusive of all taxes`, net quantity missing units, missing consumer care contact, font size below mandatory threshold).
- **`REVIEW`**: The system **cannot definitively confirm** compliance or violation due to:
  - OCR confidence below acceptable threshold ($C < 0.70$).
  - Blurry, skewed, or glare-affected label image.
  - Ambiguous regex pattern match.
  - Partial or obscured declaration text.
  - Absence of metric calibration for font measurement.

---

## 6. Role Responsibilities

### Inspector (Field Officer)
- Captures packaging photos in retail/warehouse locations.
- Reviews extracted declarations and corrects OCR errors if necessary.
- Initiates automated compliance evaluation.
- Generates on-the-spot inspection reports and inspection certificates.

### Reviewer (Senior Legal Metrology Officer / Auditor)
- Audits flagged inspections in the `REVIEW` queue.
- Re-verifies evidence crops against contested violation notices.
- Overrides or confirms ambiguous extractions with audit note annotations.
- Approves formal notice generation for statutory non-compliance.

### Administrator (System / Directorate Admin)
- Manages user accounts and role privileges.
- Configures regulatory rulesets, thresholds, and statutory amendments.
- Monitors nationwide/statewide compliance metrics, violation trends, and inspector activity.
