// ============================================================================
// src/components/evidence/evidence-package.tsx
// SIH PS26034 — Evidence Package Display Component
//
// Renders the complete evidence package for an inspection: uploaded images
// with bounding box overlays, the declarations table with OCR confidence,
// and CV measurement results.
// ============================================================================

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Image as ImageIcon,
  FileSearch,
  Ruler,
  AlertTriangle,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportDeclarationEntry, ReportViolationEntry, ReportCvMeasurementEntry, ReportEvidenceImage } from '@/lib/reports/types';

interface EvidencePackageProps {
  evidenceImages: ReportEvidenceImage[];
  declarations: ReportDeclarationEntry[];
  violations: ReportViolationEntry[];
  cvMeasurements: ReportCvMeasurementEntry[];
  overallStatus: 'PASS' | 'FAIL' | 'REVIEW';
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.min(100, Math.max(0, confidence));
  const color =
    pct >= 80 ? 'bg-compliance-pass' : pct >= 60 ? 'bg-compliance-review' : 'bg-compliance-fail';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">{pct}%</span>
    </div>
  );
}

export function EvidencePackage({
  evidenceImages,
  declarations,
  violations,
  cvMeasurements,
  overallStatus,
}: EvidencePackageProps) {
  return (
    <div className="space-y-4">
      {/* Overall Status Banner */}
      <div
        className={cn(
          'rounded-lg border p-3 flex items-center gap-3',
          overallStatus === 'PASS'
            ? 'bg-compliance-pass-bg border-compliance-pass-border'
            : overallStatus === 'FAIL'
            ? 'bg-compliance-fail-bg border-compliance-fail-border'
            : 'bg-compliance-review-bg border-compliance-review-border'
        )}
      >
        {overallStatus === 'PASS' ? (
          <CheckCircle2 className="w-5 h-5 text-compliance-pass shrink-0" />
        ) : (
          <AlertTriangle
            className={cn(
              'w-5 h-5 shrink-0',
              overallStatus === 'FAIL' ? 'text-compliance-fail' : 'text-compliance-review'
            )}
          />
        )}
        <div>
          <div className="text-xs font-semibold text-foreground">
            Overall Compliance: <StatusBadge status={overallStatus} className="ml-1" />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {violations.length} statutory violation{violations.length !== 1 ? 's' : ''} detected ·{' '}
            {declarations.length} declaration field{declarations.length !== 1 ? 's' : ''} extracted
          </div>
        </div>
      </div>

      {/* Evidence Images */}
      <Card className="border">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5" />
            Photographic Packaging Evidence
            <Badge variant="outline" className="text-[10px] ml-auto">
              {evidenceImages.length} image{evidenceImages.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {evidenceImages.length === 0 ? (
            <div className="h-24 flex items-center justify-center rounded-md border border-dashed text-muted-foreground text-xs">
              No packaging images uploaded for this inspection.
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {evidenceImages.map((img) => (
                <div key={img.id} className="rounded-lg border overflow-hidden bg-muted/30">
                  <div className="aspect-[4/3] flex items-center justify-center bg-muted/20">
                    <div className="text-center text-muted-foreground">
                      <Eye className="w-6 h-6 mx-auto mb-1 opacity-50" />
                      <span className="text-[11px] font-medium capitalize">
                        {img.panelType.replace(/_/g, ' ')} Panel
                      </span>
                    </div>
                  </div>
                  <div className="px-3 py-2 text-[11px] text-muted-foreground border-t">
                    <span className="font-mono">{img.id.slice(0, 8)}…</span>
                    {img.widthPx && img.heightPx && (
                      <span className="ml-2">{img.widthPx}×{img.heightPx}px</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Declarations Table */}
      <Card className="border">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <FileSearch className="w-3.5 h-3.5" />
            Extracted Statutory Declarations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {declarations.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No declarations extracted. Run OCR extraction first.
            </p>
          ) : (
            <div className="space-y-2">
              {declarations.map((d) => (
                <div
                  key={d.fieldName}
                  className="rounded-md border p-3 bg-muted/10 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {d.fieldName.replace(/_/g, ' ')}
                    </span>
                    {d.isManuallyEdited && (
                      <Badge variant="outline" className="text-[10px] h-4">Manually Edited</Badge>
                    )}
                  </div>
                  <div className="text-xs font-medium text-foreground">{d.observedValue}</div>
                  <div className="text-[11px] text-muted-foreground font-mono break-all">
                    OCR: {d.rawOcrText}
                  </div>
                  <ConfidenceBar confidence={d.confidence} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CV Measurements */}
      {cvMeasurements.length > 0 && (
        <Card className="border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Ruler className="w-3.5 h-3.5" />
              Computer Vision Font &amp; Readability Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-2">
              {cvMeasurements.map((cv) => (
                <div
                  key={cv.targetField}
                  className="rounded-md border p-3 bg-muted/10 grid grid-cols-2 gap-2 text-xs"
                >
                  <div className="col-span-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Target: {cv.targetField.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Char Height (px)</span>
                    <span className="font-mono font-semibold">{cv.characterHeightPx.toFixed(1)}</span>
                  </div>
                  {cv.characterHeightMm != null && (
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Char Height (mm)</span>
                      <span className="font-mono font-semibold">{cv.characterHeightMm.toFixed(2)}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Contrast Ratio</span>
                    <span className="font-mono font-semibold">{cv.contrastRatio.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Calibrated</span>
                    <span className={cn('font-semibold', cv.isCalibrated ? 'text-compliance-pass-text' : 'text-compliance-review-text')}>
                      {cv.isCalibrated ? 'Yes' : 'No (estimated)'}
                    </span>
                  </div>
                  {cv.warning && (
                    <div className="col-span-2 text-compliance-review-text text-[11px]">
                      ⚠ {cv.warning}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Violations */}
      {violations.length > 0 && (
        <Card className="border border-compliance-fail-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-compliance-fail-text flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              Statutory Violations ({violations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {violations.map((v) => (
              <div key={v.id} className="rounded-md border border-compliance-fail-border bg-compliance-fail-bg p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-compliance-fail-text">{v.ruleCode}</span>
                  <span
                    className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded',
                      v.severity === 'critical'
                        ? 'bg-compliance-fail text-white'
                        : v.severity === 'major'
                        ? 'bg-compliance-review-bg text-compliance-review-text border border-compliance-review-border'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {v.severity.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <div>
                    <span className="text-muted-foreground">Observed:</span>{' '}
                    <span className="font-medium">{v.observedValue || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Required:</span>{' '}
                    <span className="font-medium">{v.expectedConstraint}</span>
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Rule version: <span className="font-mono">{v.ruleVersion}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
