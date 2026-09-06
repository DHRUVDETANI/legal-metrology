"""
Computer Vision Geometry & Font Measurement Engine for SIH PS26034.

INVARIANTS:
1. Pure measurement probe: Computes character height and contrast ratio.
   Never determines legal compliance or emits PASS/FAIL verdicts.
2. Calibration discipline: Only outputs physical mm when an explicit
   calibration factor is provided.
3. Traceability: Retains ROI coordinates, glyph count, and confidence.
"""

from typing import Optional, Dict, Any, List, Tuple
from pydantic import BaseModel, Field
import numpy as np
import cv2


class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int


class FontMeasurementRequest(BaseModel):
    image_base64: Optional[str] = None
    bbox: Optional[BoundingBox] = None
    target_field: str = "font_measurement"
    calibration_factor: Optional[float] = Field(
        default=None,
        description="Optional calibration scale factor (e.g., pixels per mm). None if uncalibrated.",
    )
    reference_id: Optional[str] = None


class FontMeasurementResponse(BaseModel):
    target_field: str
    character_height_px: float
    character_height_mm: Optional[float] = None
    is_calibrated: bool
    contrast_ratio: float
    confidence: float
    glyph_count: int
    method_version: str = "opencv-contour-v1.0"
    bbox: Optional[BoundingBox] = None
    warning: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)


def compute_weber_contrast(gray_roi: np.ndarray) -> float:
    """Computes contrast ratio between estimated text and background."""
    if gray_roi.size == 0:
        return 1.0
    # Otsu threshold to separate foreground text from background
    _, thresh = cv2.threshold(gray_roi, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Assume the smaller area is text foreground
    white_pixels = np.sum(thresh == 255)
    total_pixels = thresh.size
    
    if white_pixels > total_pixels / 2:
        # Background is white, text is dark
        bg_mean = float(np.mean(gray_roi[thresh == 255])) if white_pixels > 0 else 255.0
        fg_mean = float(np.mean(gray_roi[thresh == 0])) if white_pixels < total_pixels else 0.0
    else:
        # Background is dark, text is light
        fg_mean = float(np.mean(gray_roi[thresh == 255])) if white_pixels > 0 else 255.0
        bg_mean = float(np.mean(gray_roi[thresh == 0])) if white_pixels < total_pixels else 0.0

    denominator = max(bg_mean, 1.0)
    contrast = abs(fg_mean - bg_mean) / denominator
    # Scale to standard readability contrast index (1.0 to 21.0 range)
    return round(float(1.0 + (contrast * 10.0)), 2)


def measure_character_height_from_roi(
    gray_roi: np.ndarray,
    calibration_factor: Optional[float] = None,
) -> Tuple[float, Optional[float], bool, float, int, float, Optional[str]]:
    """
    Extracts individual character glyphs via adaptive thresholding and contour analysis.
    Returns:
        (height_px, height_mm, is_calibrated, contrast_ratio, glyph_count, confidence, warning)
    """
    contrast_ratio = compute_weber_contrast(gray_roi)
    h, w = gray_roi.shape[:2]

    if h < 5 or w < 5:
        return 0.0, None, False, contrast_ratio, 0, 0.0, "ROI dimensions too small for CV measurement"

    # Preprocessing: bilateral filter to preserve edges while smoothing texture
    blurred = cv2.bilateralFilter(gray_roi, 5, 75, 75)

    # Adaptive binarization
    thresh = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 15, 4
    )

    # Connected component / contour analysis
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    glyph_heights: List[float] = []
    min_glyph_height = max(4.0, h * 0.15)
    max_glyph_height = h * 0.95

    for cnt in contours:
        x, y, cw, ch = cv2.boundingRect(cnt)
        aspect_ratio = float(cw) / float(ch) if ch > 0 else 0.0
        area = cv2.contourArea(cnt)
        bounding_area = cw * ch

        # Filter out noise, borders, large graphic blobs, and tiny flecks
        if ch < min_glyph_height or ch > max_glyph_height:
            continue
        if aspect_ratio < 0.1 or aspect_ratio > 2.5:
            continue
        if bounding_area > 0 and (area / bounding_area) < 0.15:
            continue

        glyph_heights.append(float(ch))

    # If contours yielded insufficient characters, fallback to ROI bounding height
    warning = None
    if len(glyph_heights) >= 2:
        # Use median character height for robustness against descenders/ascenders
        char_height_px = round(float(np.median(glyph_heights)), 2)
        confidence = min(0.95, round(0.70 + (min(len(glyph_heights), 10) * 0.025), 2))
    elif len(glyph_heights) == 1:
        char_height_px = round(glyph_heights[0], 2)
        confidence = 0.75
    else:
        # Fallback estimation based on ROI bounding box height
        char_height_px = round(float(h * 0.75), 2)
        confidence = 0.55
        warning = "Low segmentation confidence; character height estimated from ROI baseline."

    # Physical calibration handling
    is_calibrated = False
    char_height_mm = None

    if calibration_factor and calibration_factor > 0:
        char_height_mm = round(char_height_px / calibration_factor, 2)
        is_calibrated = True

    return (
        char_height_px,
        char_height_mm,
        is_calibrated,
        contrast_ratio,
        len(glyph_heights),
        confidence,
        warning,
    )
