---
name: font-readability-opencv
description: >-
  Computer vision analysis for declaration text regions, character pixel height estimation,
  geometric rectification, and readability measurements using Python, OpenCV, and FastAPI.
  Use when designing or modifying the OpenCV microservice, text height estimation,
  contour analysis, or calibration pipelines.
---

# Font and Readability Analysis (OpenCV & FastAPI)

This skill governs the computer vision subsystem responsible for measuring text geometry, estimating character height, assessing label contrast, and generating visual evidence for **SIH PS26034**.

---

## 1. Subsystem Scope & Purpose

Under Rule 7 and the First Schedule of the Legal Metrology (Packaged Commodities) Rules, 2011, declarations must adhere to strict minimum font/letter heights based on the packaging net quantity or principal display panel area (e.g., minimum 1.0mm, 2.0mm, 4.0mm).

The OpenCV microservice:
- Measures physical character height in pixels.
- Identifies text baseline, x-height, and bounding polygons.
- Evaluates contrast ratio between text characters and packaging background.
- Emits raw geometry and measurement confidence.
- **Delegates legal interpretation to the deterministic compliance engine**.

---

## 2. Computer Vision Pipeline

```
[Target Image & Bounding Box ROI]
                │
                ▼
1. Extract ROI (Region of Interest)
2. Perspective & Orientation Correction (Four-point transform / deskew)
3. Morphological Gradient & Binarization (Otsu / Sauvola adaptive thresholding)
4. Connected Component Analysis / Contour Detection (Character segmentation)
5. Filter Contours (Aspect ratio, area, stroke width consistency)
6. Measure Character Metrics:
   - Median bounding box height (pixels)
   - Capital letter / numeral height (pixels)
   - Baseline to cap-height distance (x-height)
7. Image Resolution Analysis (DPI / pixel pitch inspection)
8. Calibration Resolution (Reference object or known panel dimension, if provided)
9. Calculate Measurement Confidence Score
10. Package Measurement Record & Annotated Evidence Crop
```

---

## 3. Microservice Output Schema

The FastAPI endpoint (`POST /cv/measure-font`) returns the following structured payload:

```json
{
  "measurement_id": "meas_98f7e2a1",
  "field_name": "net_quantity",
  "pixel_height": 28.5,
  "estimated_size_if_calibrated": 3.2,
  "calibration_unit": "mm",
  "calibration_factor": 0.11228,
  "confidence": 0.88,
  "contrast_ratio": 7.4,
  "bbox": {
    "x": 340,
    "y": 812,
    "width": 180,
    "height": 45
  },
  "image_id": "img_b9a2c3d4",
  "method_version": "opencv-charheight-v1.4",
  "warning": null
}
```

---

## 4. Critical Engineering Invariants

> [!CAUTION]
> **NO PHYSICAL SIZES WITHOUT CALIBRATION**:
> - Never claim physical font dimensions (such as mm or pt) directly from pixel counts without an explicit calibration reference (e.g., DPI metadata, known package height, reference ruler, or fixed focal camera calibration).
> - If calibration is absent, set `estimated_size_if_calibrated: null` and return `pixel_height` alone.

> [!IMPORTANT]
> **KEEP LEGAL THRESHOLDS OUT OF OPENCV CODE**:
> - The OpenCV/Python service is a pure **measurement probe**, NOT a legal adjudicator.
> - Do not embed statutory thresholds (e.g., `if height < 2.0: return FAIL`) inside the Python/OpenCV codebase.
> - The OpenCV service outputs measurements; the **Deterministic Compliance Engine** evaluates them against the regulatory database.

> [!WARNING]
> **LOW-CONFIDENCE MEASUREMENTS PRODUCE REVIEW**:
> - If character segmentation is ambiguous, strokes are broken, or lighting gradient prevents clean thresholding (`confidence < 0.70`), the service must flag the measurement.
> - Low-confidence measurements must result in a `REVIEW` state rather than a false legal violation.
