'use client';

// ============================================================================
// src/components/scanner/image-preview.tsx
// SIH PS26034 — Packaging Image Preview & Verification Component
//
// Features:
//   - High-fidelity preview with aspect ratio preservation
//   - Live dimension and size telemetry
//   - Touch-optimized Replace and Remove buttons (>= 48px)
//   - Panel type badge
// ============================================================================

import React from 'react';
import { Trash2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { ImageDimensions } from '@/lib/validation/image';
import type { Database } from '@/types/database.types';

type PanelType = Database['public']['Enums']['panel_type'];

interface ImagePreviewProps {
  previewUrl: string;
  file: File;
  dimensions: ImageDimensions;
  panelType: PanelType;
  onRemove: () => void;
  onReplace: () => void;
  isUploading?: boolean;
}

const PANEL_LABELS: Record<PanelType, string> = {
  primary_display: 'Primary Display Panel',
  info_panel: 'Information Panel',
  back: 'Back Panel',
  side: 'Side Panel',
  top_bottom: 'Top / Bottom Panel',
};

export function ImagePreview({
  previewUrl,
  file,
  dimensions,
  panelType,
  onRemove,
  onReplace,
  isUploading = false,
}: ImagePreviewProps) {
  const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
  const sizeKb = (file.size / 1024).toFixed(0);
  const displaySize = file.size >= 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;

  const isHighRes = dimensions.width >= 1080 && dimensions.height >= 1080;

  return (
    <Card className="overflow-hidden border shadow-sm">
      <CardHeader className="p-4 pb-2 border-b bg-muted/20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-compliance-pass-text" />
            <CardTitle className="text-sm font-semibold">Image Ready for Upload</CardTitle>
          </div>
          <Badge variant="outline" className="text-[11px] font-medium">
            {PANEL_LABELS[panelType] || panelType}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {/* Preview Frame */}
        <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-black/90 flex items-center justify-center shadow-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Packaging label preview"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Readout Metrics */}
        <div className="grid grid-cols-3 gap-2 text-center py-1">
          <div className="p-2 rounded-lg bg-muted/40 border">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Resolution
            </span>
            <span className="text-xs font-semibold text-foreground">
              {dimensions.width} × {dimensions.height}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-muted/40 border">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              File Size
            </span>
            <span className="text-xs font-semibold text-foreground">{displaySize}</span>
          </div>

          <div className="p-2 rounded-lg bg-muted/40 border">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Readiness
            </span>
            <span
              className={`text-xs font-semibold ${
                isHighRes ? 'text-compliance-pass-text' : 'text-compliance-review-text'
              }`}
            >
              {isHighRes ? 'Optimal (HD)' : 'Acceptable'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <Button
            type="button"
            variant="outline"
            disabled={isUploading}
            onClick={onReplace}
            className="min-h-[48px] gap-2 text-sm font-medium touch-manipulation"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retake / Replace</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            disabled={isUploading}
            onClick={onRemove}
            className="min-h-[48px] gap-2 text-sm font-medium text-destructive hover:text-destructive hover:bg-destructive/10 touch-manipulation"
          >
            <Trash2 className="w-4 h-4" />
            <span>Remove</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
