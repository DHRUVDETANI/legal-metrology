// ============================================================================
// src/lib/ocr/types.ts
// SIH PS26034 — OCR Layer Data Contracts & Engine Abstraction
// ============================================================================

export interface OcrBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrWord {
  text: string;
  confidence: number; // 0.0 to 1.0
  bbox: OcrBoundingBox;
}

export interface OcrLine {
  text: string;
  confidence: number; // 0.0 to 1.0
  bbox: OcrBoundingBox;
  words: OcrWord[];
}

export interface RawOcrResult {
  fullText: string;
  lines: OcrLine[];
  engine: string;
  language: string;
  processingTimeMs: number;
  rawPayload: Record<string, unknown>;
}

export interface IOcrEngine {
  processImage(imageBuffer: Uint8Array, mimeType: string): Promise<RawOcrResult>;
  processImageUrl?(imageUrl: string): Promise<RawOcrResult>;
}

export type StatutoryFieldName =
  | 'mrp'
  | 'net_quantity'
  | 'manufacturing_date'
  | 'name_address_manufacturer'
  | 'consumer_care'
  | 'common_generic_name'
  | 'country_of_origin'
  | 'unit_sale_price';

export interface CandidateDeclaration {
  fieldName: StatutoryFieldName;
  rawOcrText: string;
  observedValue: string;
  normalizedValue: Record<string, unknown>;
  confidence: number; // 0.0 to 1.0
  bbox: OcrBoundingBox;
}
