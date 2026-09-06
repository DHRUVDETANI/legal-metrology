// ============================================================================
// src/lib/reports/types.ts
// SIH PS26034 — Compliance Report Payload Types
//
// Defines the canonical ReportPayload structure used for both on-screen
// rendering and PDF generation. Every field is evidence-backed and
// traceable to source inspection data.
// ============================================================================

export interface ReportDeclarationEntry {
  fieldName: string;
  observedValue: string;
  rawOcrText: string;
  normalizedValue: Record<string, unknown>;
  confidence: number; // 0–100
  isManuallyEdited: boolean;
  editedBy?: string | null;
  bbox?: { x: number; y: number; width: number; height: number } | null;
}

export interface ReportViolationEntry {
  id: string;
  ruleCode: string;
  severity: string;
  observedValue: string;
  expectedConstraint: string;
  ruleVersion: string;
  confidence: number;
  evidenceBbox: Record<string, unknown>;
  evidenceCropPath: string | null;
}

export interface ReportCvMeasurementEntry {
  targetField: string;
  characterHeightPx: number;
  characterHeightMm?: number | null;
  contrastRatio: number;
  isCalibrated: boolean;
  confidence?: number | null;
  glyphCount?: number | null;
  methodVersion?: string | null;
  warning?: string | null;
}

export interface ReportEvidenceImage {
  id: string;
  storagePath: string;
  panelType: string;
  widthPx: number | null;
  heightPx: number | null;
  capturedAt: string;
}

export interface ReportPayload {
  // 1. Inspection Metadata
  inspectionId: string;
  inspectionNumber: string;
  reportNumber: string;
  generatedAt: string; // ISO 8601 UTC
  rulesetVersion: string;

  // 2. Inspector Info
  inspectorId: string;
  inspectorName: string;
  inspectorBadge: string | null;
  jurisdiction: string;
  locationName: string;
  gpsLat: number | null;
  gpsLng: number | null;

  // 3. Reviewer Info (if adjudicated)
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewerNotes: string | null;

  // 4. Product Info
  productId: string | null;
  brandName: string | null;
  productName: string | null;
  category: string | null;
  skuBarcode: string | null;

  // 5. Evidence Images
  evidenceImages: ReportEvidenceImage[];

  // 6. Extracted Declarations
  declarations: ReportDeclarationEntry[];

  // 7. CV Measurements
  cvMeasurements: ReportCvMeasurementEntry[];

  // 8. Overall Verdict
  overallStatus: 'PASS' | 'FAIL' | 'REVIEW';
  totalViolations: number;

  // 9. Violations (if any)
  violations: ReportViolationEntry[];

  // 10. System Provenance
  appVersion: string;
  sha256Hash: string; // Computed after payload assembly, populated post-generation
}
