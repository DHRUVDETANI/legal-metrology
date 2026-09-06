'use client';

// ============================================================================
// src/components/scanner/scan-wizard.tsx
// SIH PS26034 — Master Mobile Inspection Capture & Upload Wizard
//
// End-to-end inspector workflow:
//   1. Location & metadata review
//   2. Camera capture / Gallery image selection
//   3. Preview & client validation
//   4. Secure upload to Supabase Storage + DB registration
//   5. Display signed URL preview and proceed to extraction review
// ============================================================================

import React, { useState } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  CheckCircle2,
  ArrowRight,
  MapPin,
  ShieldCheck,
  PlusCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CameraCapture } from '@/components/scanner/camera-capture';
import { ImagePreview } from '@/components/scanner/image-preview';
import { UploadProgress, type UploadStep } from '@/components/scanner/upload-progress';
import type { ImageDimensions } from '@/lib/validation/image';
import type { Database } from '@/types/database.types';

type PanelType = Database['public']['Enums']['panel_type'];

interface ScanWizardProps {
  inspectorName: string;
  inspectorJurisdiction?: string | null;
}

interface UploadedImageRecord {
  id: string;
  inspection_id: string;
  storage_path: string;
  panel_type: PanelType;
  width_px: number;
  height_px: number;
  signed_url?: string | null;
}

export function ScanWizard({ inspectorName, inspectorJurisdiction }: ScanWizardProps) {
  // Field metadata state
  const [locationName, setLocationName] = useState(
    inspectorJurisdiction || 'Central Market Inspection'
  );

  // Selected image state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null);
  const [panelType, setPanelType] = useState<PanelType>('primary_display');

  // Pipeline execution state
  const [uploadStep, setUploadStep] = useState<UploadStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Success result state
  const [createdInspectionId, setCreatedInspectionId] = useState<string | null>(null);
  const [inspectionNumber, setInspectionNumber] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<UploadedImageRecord | null>(null);

  const handleImageSelected = (payload: {
    file: File;
    previewUrl: string;
    dimensions: ImageDimensions;
    panelType: PanelType;
  }) => {
    setSelectedFile(payload.file);
    setPreviewUrl(payload.previewUrl);
    setDimensions(payload.dimensions);
    setPanelType(payload.panelType);
    setUploadStep('idle');
    setErrorMessage(null);
  };

  const handleRemoveImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setDimensions(null);
    setUploadStep('idle');
    setErrorMessage(null);
  };

  const executeUploadPipeline = async () => {
    if (!selectedFile || !dimensions) return;

    setUploadStep('validating');
    setErrorMessage(null);

    try {
      // 1. Create or retrieve inspection record
      let inspectionId = createdInspectionId;
      let inspNum = inspectionNumber;

      if (!inspectionId) {
        setUploadStep('validating');
        const inspRes = await fetch('/api/inspections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location_name: locationName,
          }),
        });

        const inspData = await inspRes.json();
        if (!inspRes.ok || !inspData.inspection) {
          throw new Error(inspData.error || 'Failed to initialize inspection record.');
        }

        inspectionId = inspData.inspection.id;
        inspNum = inspData.inspection.inspection_number;
        setCreatedInspectionId(inspectionId);
        setInspectionNumber(inspNum);
      }

      // 2. Upload file to Supabase Storage and register packaging_images
      setUploadStep('uploading');

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('panel_type', panelType);

      setUploadStep('persisting');
      const uploadRes = await fetch(`/api/inspections/${inspectionId}/images`, {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.image) {
        throw new Error(uploadData.error || 'Failed to upload packaging image.');
      }

      setUploadedImage(uploadData.image);
      setUploadStep('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setErrorMessage(msg);
      setUploadStep('error');
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Inspection Context Card */}
      <Card className="border bg-card/60">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider">Field Inspector</span>
            <span className="font-medium text-foreground">{inspectorName}</span>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="locationInput"
              className="text-xs font-semibold text-muted-foreground flex items-center gap-1"
            >
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span>Inspection Location / Market</span>
            </label>
            <input
              id="locationInput"
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              disabled={uploadStep !== 'idle' && uploadStep !== 'error'}
              className="w-full h-10 px-3 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="e.g. APMC Market Yard, Pune"
            />
          </div>
        </CardContent>
      </Card>

      {/* State A: Uploaded Image Success View */}
      {uploadStep === 'success' && uploadedImage && createdInspectionId ? (
        <Card className="border-2 border-compliance-pass-border bg-compliance-pass-bg/20 overflow-hidden shadow-md">
          <CardHeader className="p-4 pb-2 bg-compliance-pass-bg/40 border-b border-compliance-pass-border/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-compliance-pass-text" />
                <CardTitle className="text-base font-bold text-foreground">
                  Image Uploaded & Verified
                </CardTitle>
              </div>
              <span className="text-xs font-mono font-semibold text-primary px-2 py-0.5 bg-background/80 rounded border">
                {inspectionNumber}
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            {/* Signed URL Preview */}
            <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-black flex items-center justify-center border shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={uploadedImage.signed_url || previewUrl || ''}
                alt="Persisted packaging image"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Persistence Confirmation */}
            <div className="p-3 rounded-lg bg-background/80 border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Storage Bucket:</span>
                <span className="font-mono font-semibold text-foreground">inspection-images (Private)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Persisted Dimensions:</span>
                <span className="font-medium text-foreground">
                  {uploadedImage.width_px} × {uploadedImage.height_px} px
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Panel Type:</span>
                <span className="font-medium text-foreground capitalize">
                  {uploadedImage.panel_type.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Primary Action Button: Proceed to Extraction Review */}
            <div className="pt-2 space-y-2.5">
              <Link href={`/scan/${createdInspectionId}/extract`} className="block">
                <Button
                  size="lg"
                  className="w-full min-h-[52px] gap-2 text-base font-bold shadow-lg touch-manipulation"
                >
                  <span>Continue to Extraction Review</span>
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  handleRemoveImage();
                  setUploadedImage(null);
                }}
                className="w-full min-h-[48px] gap-2 text-sm font-semibold touch-manipulation"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Upload Another Panel for this Inspection</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* State B: Capture or Preview View */
        <div className="space-y-4">
          {!previewUrl || !selectedFile || !dimensions ? (
            <CameraCapture
              onImageSelected={handleImageSelected}
              disabled={uploadStep !== 'idle' && uploadStep !== 'error'}
            />
          ) : (
            <div className="space-y-3">
              <ImagePreview
                previewUrl={previewUrl}
                file={selectedFile}
                dimensions={dimensions}
                panelType={panelType}
                onRemove={handleRemoveImage}
                onReplace={handleRemoveImage}
                isUploading={uploadStep !== 'idle' && uploadStep !== 'error'}
              />

              {/* Upload CTA Button */}
              {uploadStep !== 'validating' &&
                uploadStep !== 'uploading' &&
                uploadStep !== 'persisting' && (
                  <Button
                    type="button"
                    size="lg"
                    onClick={executeUploadPipeline}
                    className="w-full min-h-[52px] gap-2 text-base font-bold shadow-md touch-manipulation"
                  >
                    <UploadCloud className="w-5 h-5" />
                    <span>Upload Image & Start Inspection</span>
                  </Button>
                )}
            </div>
          )}

          {/* Progress & Error Status */}
          <UploadProgress
            step={uploadStep}
            errorMessage={errorMessage}
            onRetry={executeUploadPipeline}
          />
        </div>
      )}

      {/* Field Inspection Standard Instructions */}
      <Card className="border bg-card/60">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Packaging Capture Quality Protocol
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 text-xs text-muted-foreground space-y-1.5">
          <p>• Avoid sharp glare from cellophane or fluorescent light over declaration texts.</p>
          <p>• Ensure minimum 400×400 px resolution (recommended 1080p+ for character height verification).</p>
          <p>• Images are stored encrypted in the private Legal Metrology inspection repository.</p>
        </CardContent>
      </Card>
    </div>
  );
}
