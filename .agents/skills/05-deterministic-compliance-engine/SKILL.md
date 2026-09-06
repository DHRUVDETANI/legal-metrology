---
name: deterministic-compliance-engine
description: >-
  Core deterministic, versioned, configurable, and auditable rule engine for evaluating
  Legal Metrology packaging declarations and emitting PASS, FAIL, or REVIEW verdicts.
  Use when defining rule models, implementing compliance verification logic, authoring
  regulatory rule definitions, or designing boundary unit tests.
---

# Deterministic Compliance Engine

> [!CRITICAL]
> **THE COMPLIANCE ENGINE IS THE FINAL LEGAL AUTHORITY IN THE SOFTWARE SYSTEM.**
> **THE LLM MUST NOT MAKE THE FINAL COMPLIANCE VERDICT.**
> All compliance verdicts (**PASS / FAIL / REVIEW**) must be computed by deterministic, versioned, auditable TypeScript functions. LLMs can explain a result but cannot change or override it.

---

## 1. Architectural Philosophy & Engine Invariants

1. **Deterministic Execution**: Given the identical set of extracted declaration fields, CV measurements, and active ruleset version, the engine must always produce the identical output verdict and violation list.
2. **Config-Driven & Versioned**: Rules are data/config-driven (stored in database/JSON configurations). When the Department of Consumer Affairs issues a gazette notification or amendment, new rules or modified thresholds are introduced via rule versioning without rewriting application code.
3. **Auditable & Traceable**: Every evaluated rule attaches the rule code, statutory requirement, observed value, expected constraint, confidence score, and timestamp to the inspection record.
4. **Conservative Safety Gate**: If evidence is low-confidence or missing essential parameters, the engine emits `REVIEW` rather than false-positive `FAIL` or false-negative `PASS`.

---

## 2. Rule Definition Schema

Every rule is structured according to the following schema:

```typescript
export interface ComplianceRule {
  rule_code: string;               // Unique regulatory identifier, e.g. "LM-2011-R6-1-MRP"
  title: string;                   // "MRP Mandatory Declaration & Tax Inclusion"
  description: string;             // Detailed statutory explanation
  target_field: string;            // e.g. "mrp", "net_quantity", "manufacturer"
  target_measurement?: string;     // e.g. "pixel_height", "char_height_mm", "contrast"
  condition: {
    operator:
      | 'EXISTS'
      | 'REGEX_MATCH'
      | 'NUMERIC_GTE'
      | 'NUMERIC_LTE'
      | 'NUMERIC_BETWEEN'
      | 'ALLOWED_UNIT'
      | 'CONTAINS_ALL'
      | 'CUSTOM_PREDICATE';
    parameters: Record<string, unknown>;
  };
  expected_constraint: string;     // Human-readable requirement
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  effective_from: string;          // ISO 8601 Date
  effective_to?: string | null;    // ISO 8601 Date (null if currently active)
  enabled: boolean;
  version: string;                 // e.g. "v2024.1"
  evidence_requirements: {
    require_bbox: boolean;
    require_image_snippet: boolean;
    min_confidence: number;        // e.g. 0.75
  };
}
```

---

## 3. Engine Input & Output Contracts

### Input Payload
```typescript
export interface ComplianceEngineInput {
  inspection_id: string;
  product_metadata: {
    product_name?: string;
    category?: string;
    packaging_type?: string;
  };
  declarations: Record<string, ExtractedDeclaration>;
  cv_measurements: Record<string, FontMeasurement>;
  ruleset_version?: string;        // Defaults to latest active
}
```

### Output Evaluation
```typescript
export interface ComplianceEngineOutput {
  inspection_id: string;
  overall_status: 'PASS' | 'FAIL' | 'REVIEW';
  ruleset_version: string;
  evaluated_at: string;
  total_rules_evaluated: number;
  passed_rules: number;
  failed_rules: number;
  review_rules: number;
  violations: RuleViolation[];
  check_results: ComplianceCheckResult[];
}

export interface RuleViolation {
  rule_code: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  target_field: string;
  observed_value: string;
  expected_value: string;
  explanation: string;
  evidence: {
    image_id: string;
    bbox?: { x: number; y: number; width: number; height: number };
    raw_ocr_snippet?: string;
  };
  confidence: number;
  rule_version: string;
}
```

---

## 4. Standard Legal Metrology Rule Registry (Examples)

| Rule Code | Target Field | Constraint Summary |
|---|---|---|
| `LM-R6-MRP-INCL-TAX` | `mrp` | Must include standard abbreviation `MRP` / `Maximum Retail Price` AND state `inclusive of all taxes` / `incl. of all taxes`. |
| `LM-R6-NET-QTY-UNIT` | `net_quantity` | Net quantity number must be accompanied by valid standard SI unit symbol (`g`, `kg`, `ml`, `l`, `m`, `N`). No non-standard symbols like `gms`, `kilos`, `ltrs`. |
| `LM-R6-MFG-DATE-FMT` | `manufacturing_date` | Date of manufacture/packing must specify month and year (e.g. `MM/YYYY`, `MMM YYYY`). Cannot be expired or future-dated. |
| `LM-R6-CONSUMER-CARE`| `consumer_care` | Must specify contact details: telephone/phone number, email address, and physical postal address of grievance officer. |
| `LM-R7-FONT-MIN-HEIGHT`| `font_measurement` | Minimum font height based on net quantity range (e.g., Net weight $\le 50\text{g} \implies \ge 1.0\text{mm}$; $50\text{g} < W \le 200\text{g} \implies \ge 2.0\text{mm}$; $W > 200\text{g} \implies \ge 4.0\text{mm}$). |

---

## 5. Required Test Suites

The deterministic compliance engine must maintain complete automated test coverage for:
1. **Pass Cases**: Products with perfectly compliant declarations, valid syntax, and adequate font sizes.
2. **Fail Cases**: Common violations (omitted taxes wording, invalid units like `gms`, missing consumer email, undersized font).
3. **Missing Declarations**: Detection of missing mandatory fields triggering statutory violation notices.
4. **Malformed Values**: OCR misreads or corrupted values handled gracefully.
5. **Boundary Values**: Packaging weights right at threshold transitions (e.g., exactly 50g, 200g, 1kg) evaluating correct font rules.
6. **Low-Confidence Inputs**: Low OCR or CV confidence ($C < 0.70$) routing correctly to `REVIEW`.
7. **Disabled / Expired Rules**: Inactive rules excluded from active evaluation.
8. **Rule Version Migrations**: Historic inspections re-evaluated against their original rule version reproducing identical results.
