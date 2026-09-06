---
name: ocr-label-extraction
description: >-
  Robust product-label OCR pipeline, image quality assessment, raw text preservation,
  and structured declaration field mapping.
  Use when building or modifying label preprocessing, OCR invocation, token extraction,
  or field parsing logic.
---

# OCR Label Extraction

This skill outlines the architecture, pipeline stages, data preservation rules, and text parsing mechanisms for extracting legal declarations from packaging labels in **SIH PS26034**.

---

## 1. Pipeline Overview

The label extraction pipeline converts raw packaging photographs into structured, evidence-linked declaration records across 15 distinct stages:

```
[Input Image]
     │
     ▼
 1. Validate Image Type (PNG, JPEG, WebP)
 2. Validate Image Size (Min: 600x600px, Max: 15MB)
 3. Check Orientation & EXIF Rotation
 4. Assess Image Quality (Laplacian blur variance, glare, illumination)
 5. Deskew (Hough transform / contour orientation)
 6. Denoise (Bilateral filtering / Non-local means)
 7. Enhance Contrast (CLAHE - Contrast Limited Adaptive Histogram Equalization)
     │
     ▼
 8. Perform OCR (Hosted OCR API with word/line bounding boxes)
 9. Preserve Raw OCR Output (Immutable JSON payload)
10. Preserve Bounding Boxes & Polygons
11. Normalize Text Separately (Unicode cleaning, currency symbol standardizing)
12. Map Text into Structured Declaration Fields (Regex + semantic heuristic)
13. Attach Evidence Coordinates (Bounding box polygons linked to field)
14. Store Field-Level Confidence Scores
15. Route Low-Confidence / Ambiguous Results to `REVIEW`
```

---

## 2. Extraction Data Contract

Each extracted declaration must conform to this schema:

```typescript
export interface ExtractedField {
  field_name:
    | 'name_address_manufacturer'
    | 'common_generic_name'
    | 'net_quantity'
    | 'mrp'
    | 'manufacturing_date'
    | 'consumer_care'
    | 'unit_sale_price'
    | 'country_of_origin';
  observed_text: string;           // Exact characters from OCR
  normalized_value: unknown;        // Parsed numeric/structured representation
  confidence: number;              // Aggregate score 0.0 - 1.0
  bbox: {
    x: number;                     // Relative or pixel coordinate
    y: number;
    width: number;
    height: number;
  };
  source_image_id: string;
  extraction_method: 'ocr_direct' | 'regex' | 'ai_normalized' | 'manual_edit';
}
```

---

## 3. Strict Evidence & OCR Preservation Rules

1. **Never Overwrite Raw OCR**:
   Always store the complete, unedited OCR engine response (including word coordinates, character alternatives, and confidence values) in `raw_ocr_payload`. Never modify or truncate this payload.
2. **Never Destroy Source Evidence**:
   Store the original uploaded image in an immutable private bucket (`raw-images/`). Downstream crops or deskewed variants must reference the original image ID.
3. **Decouple Normalization from Extraction**:
   Keep `observed_text` (what the camera actually saw) strictly separate from `normalized_value` (how the system parsed it). If normalized parsing is wrong, the evidence remains uncorrupted.
4. **Lighting & Camera Quality Variations**:
   Packaging photos in Indian retail environments often exhibit glare from glossy plastic packaging, cylindrical distortion on bottles, or low lighting in kirana shops. Apply CLAHE and adaptive binarization to mitigate reflections.
5. **Multilingual & Indic Packaging Support**:
   Many packaged commodities in India carry bilingual or multilingual text (Hindi, regional languages alongside English). Ensure the OCR layer specifies multi-language support (e.g. `eng+hin`).
6. **OCR is Not Legally Authoritative**:
   OCR is a sensory ingestion channel, not an official legal certifier. An OCR failure or misread is **never** proof of a regulatory violation.
7. **The Conservative Quality Gate**:
   If image quality assessment reveals high blur (`variance < 100`) or OCR confidence falls below `0.70`, the system **must** set the inspection state to `REVIEW` and prompt the inspector for re-capture or manual confirmation. Never assert a legal `FAIL` on an illegible label scan.
