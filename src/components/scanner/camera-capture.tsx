'use client';

// ============================================================================
// src/components/scanner/camera-capture.tsx
// SIH PS26034 — Mobile-First Camera & Image Selection Component
//
// Features:
//   - Touch targets >= 48px
//   - Dedicated "Take Photo" button using capture="environment"
//   - Dedicated "Gallery / File Picker" fallback button
//   - Live camera viewfinder stream option via getUserMedia
//   - Client-side instant image dimension & size pre-validation
//   - Packaging panel type selector
// ============================================================================

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, Image as ImageIcon, Video, VideoOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  IMAGE_VALIDATION_RULES,
  type AllowedImageMimeType,
  type ImageDimensions,
} from '@/lib/validation/image';
import type { Database } from '@/types/database.types';

type PanelType = Database['public']['Enums']['panel_type'];

interface CameraCaptureProps {
  onImageSelected: (payload: {
    file: File;
    previewUrl: string;
    dimensions: ImageDimensions;
    panelType: PanelType;
  }) => void;
  disabled?: boolean;
}

export function CameraCapture({ onImageSelected, disabled }: CameraCaptureProps) {
  const [panelType, setPanelType] = useState<PanelType>('primary_display');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLiveCameraActive, setIsLiveCameraActive] = useState(false);
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop video stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Pre-validate file and extract dimensions via Image element
  const processSelectedFile = useCallback(
    async (file: File) => {
      setValidationError(null);

      // Check size
      if (file.size > IMAGE_VALIDATION_RULES.maxSizeBytes) {
        setValidationError(
          `Image is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 10MB.`
        );
        return;
      }

      // Check MIME type
      if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as AllowedImageMimeType)) {
        setValidationError(
          `Unsupported file type '${file.type || 'unknown'}'. Please choose a JPEG, PNG, or WebP photo.`
        );
        return;
      }

      // Create preview object URL and verify dimensions
      const previewUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;

        if (
          width < IMAGE_VALIDATION_RULES.minWidthPx ||
          height < IMAGE_VALIDATION_RULES.minHeightPx
        ) {
          URL.revokeObjectURL(previewUrl);
          setValidationError(
            `Image resolution (${width}×${height}px) is too low for metrology verification. Minimum required is ${IMAGE_VALIDATION_RULES.minWidthPx}×${IMAGE_VALIDATION_RULES.minHeightPx}px.`
          );
          return;
        }

        if (
          width > IMAGE_VALIDATION_RULES.maxWidthPx ||
          height > IMAGE_VALIDATION_RULES.maxHeightPx
        ) {
          URL.revokeObjectURL(previewUrl);
          setValidationError(
            `Image dimensions (${width}×${height}px) exceed maximum limit (${IMAGE_VALIDATION_RULES.maxWidthPx}×${IMAGE_VALIDATION_RULES.maxHeightPx}px).`
          );
          return;
        }

        // Image passed client-side checks
        onImageSelected({
          file,
          previewUrl,
          dimensions: { width, height },
          panelType,
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(previewUrl);
        setValidationError('Failed to read image file. It may be corrupted.');
      };

      img.src = previewUrl;
    },
    [onImageSelected, panelType]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
    // Reset input value so same file can be re-selected if needed
    e.target.value = '';
  };

  // Live camera stream toggle
  const startLiveCamera = async () => {
    setValidationError(null);
    setCameraPermissionDenied(false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setValidationError('Direct camera stream is not supported in this browser. Use photo capture button below.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsLiveCameraActive(true);
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraPermissionDenied(true);
        setValidationError('Camera permission was denied. Please allow camera access in browser settings, or use the file picker.');
      } else {
        setValidationError('Unable to access device camera. Please use standard photo capture.');
      }
      setIsLiveCameraActive(false);
    }
  };

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsLiveCameraActive(false);
  };

  const captureFrameFromLiveCamera = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setValidationError('Failed to capture photo frame.');
          return;
        }
        stopLiveCamera();
        const file = new File([blob], `label-capture-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        processSelectedFile(file);
      },
      'image/jpeg',
      0.95
    );
  };

  return (
    <div className="space-y-4">
      {/* Hidden file inputs with capture fallback */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        aria-label="Capture photo with camera"
        onChange={handleFileInputChange}
        disabled={disabled}
      />

      <input
        type="file"
        ref={galleryInputRef}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        aria-label="Upload photo from gallery"
        onChange={handleFileInputChange}
        disabled={disabled}
      />

      {/* Packaging Panel Selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
          Packaging Panel Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(
            [
              { id: 'primary_display' as const, label: 'Primary Display' },
              { id: 'info_panel' as const, label: 'Info Panel' },
              { id: 'back' as const, label: 'Back Panel' },
              { id: 'side' as const, label: 'Side Panel' },
              { id: 'top_bottom' as const, label: 'Top / Bottom' },
            ]
          ).map((panel) => (
            <button
              key={panel.id}
              type="button"
              onClick={() => setPanelType(panel.id)}
              className={`min-h-[48px] px-2.5 py-2 text-xs font-medium rounded-lg border transition-colors flex items-center justify-center text-center ${
                panelType === panel.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm font-semibold'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {panel.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Viewfinder / Camera Feed */}
      {isLiveCameraActive ? (
        <Card className="relative overflow-hidden border-2 border-primary rounded-2xl bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full aspect-[4/3] object-cover"
          />

          {/* Alignment guideline overlay */}
          <div className="absolute inset-6 border-2 border-dashed border-white/60 rounded-xl pointer-events-none flex flex-col justify-between p-3">
            <div className="text-[10px] text-white/80 bg-black/50 px-2 py-0.5 rounded self-start font-mono">
              Align mandatory declarations inside box
            </div>
            <div className="text-[10px] text-white/80 bg-black/50 px-2 py-0.5 rounded self-end font-mono">
              Ensure adequate lighting
            </div>
          </div>

          {/* Controls overlay */}
          <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 px-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={stopLiveCamera}
              className="min-h-[48px] px-4 font-semibold shadow"
            >
              <VideoOff className="w-4 h-4 mr-1.5" />
              Cancel
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={captureFrameFromLiveCamera}
              className="min-h-[52px] px-6 font-bold shadow-lg gap-2 bg-primary text-primary-foreground"
            >
              <Camera className="w-5 h-5" />
              Capture Frame
            </Button>
          </div>
        </Card>
      ) : (
        /* Static Viewfinder Guide */
        <div className="relative aspect-[4/3] w-full max-w-xl mx-auto rounded-2xl border-2 border-dashed border-primary/50 bg-muted/30 overflow-hidden flex flex-col items-center justify-center p-6 text-center shadow-inner">
          <div className="absolute inset-4 border border-primary/30 rounded-xl pointer-events-none" />

          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-3 shadow-sm">
            <Camera className="w-8 h-8" />
          </div>

          <h3 className="text-base font-semibold text-foreground">
            Camera & Image Capture Ready
          </h3>
          <p className="text-xs text-muted-foreground max-w-xs mt-1">
            Capture or select a clear, high-resolution photo of the commodity label.
          </p>

          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            <span className="text-[11px] bg-background/80 border px-2.5 py-1 rounded-full font-medium text-muted-foreground">
              JPEG, PNG, WebP
            </span>
            <span className="text-[11px] bg-background/80 border px-2.5 py-1 rounded-full font-medium text-muted-foreground">
              Max 10 MB
            </span>
            <span className="text-[11px] bg-background/80 border px-2.5 py-1 rounded-full font-medium text-muted-foreground">
              Min 400×400 px
            </span>
          </div>
        </div>
      )}

      {/* Validation Error Alert */}
      {validationError && (
        <div
          role="alert"
          className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-start gap-2.5 shadow-sm"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Image Validation Error</p>
            <p className="mt-0.5">{validationError}</p>
          </div>
        </div>
      )}

      {/* Action Buttons (>= 48px touch targets for mobile field use) */}
      <div className="space-y-2.5 pt-1">
        {/* Button 1: Device Native Camera Capture */}
        <Button
          type="button"
          size="lg"
          disabled={disabled}
          onClick={() => cameraInputRef.current?.click()}
          className="w-full min-h-[52px] gap-2.5 text-base font-bold shadow-md touch-manipulation"
        >
          <Camera className="w-5 h-5" />
          <span>Take Photo (Camera)</span>
        </Button>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Button 2: Device File / Gallery Picker */}
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => galleryInputRef.current?.click()}
            className="min-h-[48px] gap-2 text-sm font-semibold touch-manipulation"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Choose from Gallery</span>
          </Button>

          {/* Button 3: Live Viewfinder Mode Toggle */}
          <Button
            type="button"
            variant="outline"
            disabled={disabled || cameraPermissionDenied}
            onClick={startLiveCamera}
            className="min-h-[48px] gap-2 text-sm font-semibold touch-manipulation"
          >
            <Video className="w-4 h-4" />
            <span>Live Viewfinder</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
