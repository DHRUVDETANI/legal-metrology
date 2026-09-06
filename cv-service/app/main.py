"""
FastAPI Computer Vision & Geometry Microservice for SIH PS26034.
Phase 0 Foundation - Minimal Health Check Endpoint.

STRICT BOUNDARY:
- Do NOT implement OpenCV measurement logic in Phase 0.
- Full text-region segmentation, character height in pixels,
  and contrast analysis will be implemented in Phase 5.
"""

import base64
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timezone
import numpy as np
import cv2

try:
    from app.engine import (
        FontMeasurementRequest,
        FontMeasurementResponse,
        measure_character_height_from_roi,
        BoundingBox,
    )
except ImportError:
    from engine import (
        FontMeasurementRequest,
        FontMeasurementResponse,
        measure_character_height_from_roi,
        BoundingBox,
    )

app = FastAPI(
    title="PS26034 Computer Vision Service",
    description="Python/OpenCV microservice for packaging label text geometry and readability analysis",
    version="0.2.0",
)

# Allow requests from local Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    phase: str
    timestamp: str


@app.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    """Minimal health check endpoint to verify microservice availability."""
    return HealthResponse(
        status="ok",
        service="cv-service",
        version="0.2.0",
        phase="phase-6-cv-font-measurement",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.post("/cv/measure-font", response_model=FontMeasurementResponse)
def measure_font(payload: FontMeasurementRequest) -> FontMeasurementResponse:
    """
    Measures character height and contrast ratio on packaging image ROI.
    
    INVARIANTS:
    - Pure measurement: NEVER outputs legal pass/fail verdicts.
    - Physical mm only emitted if valid calibration_factor provided.
    """
    gray_roi: np.ndarray

    if payload.image_base64:
        try:
            image_bytes = base64.b64decode(payload.image_base64)
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                raise ValueError("Could not decode image")
            
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            if payload.bbox:
                bx = max(0, payload.bbox.x)
                by = max(0, payload.bbox.y)
                bw = min(payload.bbox.width, gray.shape[1] - bx)
                bh = min(payload.bbox.height, gray.shape[0] - by)
                if bw > 5 and bh > 5:
                    gray_roi = gray[by : by + bh, bx : bx + bw]
                else:
                    gray_roi = gray
            else:
                gray_roi = gray
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")
    else:
        # Generate synthetic text ROI for testing / headless invocation
        roi_h = payload.bbox.height if payload.bbox and payload.bbox.height > 10 else 36
        roi_w = payload.bbox.width if payload.bbox and payload.bbox.width > 20 else 200
        
        # Create white background canvas
        synthetic = np.ones((roi_h, roi_w), dtype=np.uint8) * 255
        # Draw sample synthetic numerals/text with known pixel height
        font_scale = max(0.5, (roi_h * 0.6) / 30.0)
        cv2.putText(
            synthetic,
            "200 g",
            (10, int(roi_h * 0.75)),
            cv2.FONT_HERSHEY_SIMPLEX,
            font_scale,
            0,
            2,
            cv2.LINE_AA,
        )
        gray_roi = synthetic

    (
        char_height_px,
        char_height_mm,
        is_calibrated,
        contrast_ratio,
        glyph_count,
        confidence,
        warning,
    ) = measure_character_height_from_roi(
        gray_roi,
        calibration_factor=payload.calibration_factor,
    )

    return FontMeasurementResponse(
        target_field=payload.target_field,
        character_height_px=char_height_px,
        character_height_mm=char_height_mm,
        is_calibrated=is_calibrated,
        contrast_ratio=contrast_ratio,
        confidence=confidence,
        glyph_count=glyph_count,
        method_version="opencv-contour-v1.0",
        bbox=payload.bbox,
        warning=warning,
        details={
            "roi_height": gray_roi.shape[0],
            "roi_width": gray_roi.shape[1],
            "reference_id": payload.reference_id,
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

