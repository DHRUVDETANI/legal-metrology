"""
FastAPI Computer Vision & Geometry Microservice for SIH PS26034.
Phase 0 Foundation - Minimal Health Check Endpoint.

STRICT BOUNDARY:
- Do NOT implement OpenCV measurement logic in Phase 0.
- Full text-region segmentation, character height in pixels,
  and contrast analysis will be implemented in Phase 5.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timezone

app = FastAPI(
    title="PS26034 Computer Vision Service",
    description="Python/OpenCV microservice for packaging label text geometry and readability analysis",
    version="0.1.0",
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
        version="0.1.0",
        phase="phase-0-foundation",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
