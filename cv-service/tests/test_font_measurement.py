"""
Pytest unit tests for Phase 6 Computer Vision & Font Measurement.
"""

import sys
import os
import base64
import numpy as np
import cv2
from fastapi.testclient import TestClient

# Add app directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'app')))

from main import app
from engine import compute_weber_contrast, measure_character_height_from_roi

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "cv-service"
    assert "phase-6" in data["phase"]


def test_measure_font_synthetic_headless():
    """Tests default synthetic headless measurement without image upload."""
    response = client.post("/cv/measure-font", json={"target_field": "net_quantity"})
    assert response.status_code == 200
    data = response.json()
    assert data["target_field"] == "net_quantity"
    assert data["character_height_px"] > 0
    assert data["is_calibrated"] is False
    assert data["character_height_mm"] is None
    assert data["contrast_ratio"] >= 1.0
    assert data["confidence"] >= 0.50


def test_measure_font_with_calibration():
    """Verifies physical mm calculation only occurs when calibration_factor is passed."""
    # 10 pixels per mm
    response = client.post(
        "/cv/measure-font",
        json={"target_field": "net_quantity", "calibration_factor": 10.0},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_calibrated"] is True
    assert data["character_height_mm"] is not None
    # If px height is ~20, mm height is ~2.0
    assert data["character_height_mm"] == round(data["character_height_px"] / 10.0, 2)


def test_measure_font_with_rendered_image():
    """Tests measurement on an actual base64 encoded synthetic text image."""
    # Create 100x400 white image with black text
    img = np.ones((100, 400, 3), dtype=np.uint8) * 255
    # Render 30px height text
    cv2.putText(img, "NET QTY 500 g", (20, 65), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 2)
    
    _, buffer = cv2.imencode(".jpg", img)
    b64_str = base64.b64encode(buffer).decode("utf-8")

    response = client.post(
        "/cv/measure-font",
        json={
            "image_base64": b64_str,
            "target_field": "net_quantity",
            "bbox": {"x": 10, "y": 10, "width": 380, "height": 80},
            "calibration_factor": 8.0,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["character_height_px"] >= 15.0
    assert data["is_calibrated"] is True
    assert data["character_height_mm"] > 1.0
    assert data["glyph_count"] >= 3
    assert data["contrast_ratio"] > 1.0


def test_contrast_ratio_pure_black_on_white():
    img = np.ones((50, 50), dtype=np.uint8) * 255
    img[15:35, 15:35] = 0
    contrast = compute_weber_contrast(img)
    assert contrast > 5.0
