// ============================================================================
// src/components/reports/report-view.tsx
// SIH PS26034 — On-Screen Compliance Report Preview Component
//
// Renders the official inspection report structure for on-screen preview.
// Mirrors the PDF layout: metadata, product, declarations, CV, violations,
// tamper-evident hash, and reviewer sign-off.
// ============================================================================

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ShieldCheck, FileCheck, AlertTriangle, CheckCircle2, Ruler, FileSearch } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportPayload } from '@/lib/reports/types';

interface ReportViewProps {
  payload: ReportPayload;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1 mb-3">
      {children}
    </h4>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-1 text-xs py-1 border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right">{value || '—'}</span>
    </div>
  );
}

export function ReportView({ payload }: ReportViewProps) {
  const formattedDate = new Date(payload.generatedAt).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card className="max-w-3xl mx-auto border shadow-sm bg-card">
      {/* Report Header */}
      <CardHeader className="border-b p-6 text-center space-y-2">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-1">
          <FileCheck className="w-6 h-6" />
        </div>
        <CardTitle className="text-lg sm:text-xl font-bold uppercase tracking-tight">
          Certificate of Legal Metrology Inspection
        </CardTitle>
        <p className="text-xs text-muted-foreground font-mono">
          {payload.reportNumber} · Inspection: {payload.inspectionNumber}
        </p>
        <div className="flex items-center justify-center gap-2 pt-1">
          <StatusBadge status={payload.overallStatus} />
          {payload.totalViolations > 0 && (
            <span className="text-[11px] text-compliance-fail-text font-semibold">
              {payload.totalViolations} Violation{payload.totalViolations !== 1 ? 's' : ''} Found
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6 text-xs sm:text-sm">
        {/* 1. Inspection Metadata */}
        <section>
          <SectionHeader>Inspection Metadata</SectionHeader>
          <div className="rounded-lg border p-3 bg-muted/20 space-y-0">
            <MetaRow label="Report Reference" value={payload.reportNumber} />
            <MetaRow label="Inspection Number" value={payload.inspectionNumber} />
            <MetaRow label="Generated (IST)" value={formattedDate} />
            <MetaRow label="Ruleset Version" value={payload.rulesetVersion} />
            <MetaRow label="System Version" value={payload.appVersion} />
          </div>
        </section>

        {/* 2. Inspector & Location */}
        <section>
          <SectionHeader>Inspecting Officer &amp; Location</SectionHeader>
          <div className="rounded-lg border p-3 bg-muted/20 space-y-0">
            <MetaRow label="Officer Name" value={payload.inspectorName} />
            <MetaRow label="Badge Number" value={payload.inspectorBadge} />
            <MetaRow label="Jurisdiction / Station" value={payload.jurisdiction} />
            <MetaRow label="Inspection Location" value={payload.locationName} />
            {(payload.gpsLat != null && payload.gpsLng != null) && (
              <MetaRow
                label="GPS Coordinates"
                value={`${payload.gpsLat.toFixed(5)}, ${payload.gpsLng.toFixed(5)}`}
              />
            )}
          </div>
        </section>

        {/* 3. Product Information */}
        {(payload.brandName || payload.productName) && (
          <section>
            <SectionHeader>Commodity Particulars</SectionHeader>
            <div className="rounded-lg border p-3 bg-muted/20 space-y-0">
              <MetaRow label="Brand / Trade Name" value={payload.brandName} />
              <MetaRow label="Product / Commodity" value={payload.productName} />
              <MetaRow label="Category" value={payload.category} />
              <MetaRow label="SKU / Barcode" value={payload.skuBarcode} />
            </div>
          </section>
        )}

        {/* 4. Extracted Declarations */}
        {payload.declarations.length > 0 && (
          <section>
            <SectionHeader>
              <span className="flex items-center gap-1.5">
                <FileSearch className="w-3 h-3" />
                Extracted Statutory Declarations
              </span>
            </SectionHeader>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Field</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Observed Value</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.declarations.map((d, i) => (
                    <tr key={d.fieldName} className={cn('border-b last:border-0', i % 2 === 0 ? '' : 'bg-muted/10')}>
                      <td className="px-3 py-2 font-medium capitalize">
                        {d.fieldName.replace(/_/g, ' ')}
                      </td>
                      <td className="px-3 py-2 text-foreground">{d.observedValue}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded text-[10px] font-bold',
                            d.confidence >= 80
                              ? 'text-compliance-pass-text bg-compliance-pass-bg'
                              : d.confidence >= 60
                              ? 'text-compliance-review-text bg-compliance-review-bg'
                              : 'text-compliance-fail-text bg-compliance-fail-bg'
                          )}
                        >
                          {d.confidence}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 5. CV Measurements */}
        {payload.cvMeasurements.length > 0 && (
          <section>
            <SectionHeader>
              <span className="flex items-center gap-1.5">
                <Ruler className="w-3 h-3" />
                Font &amp; Readability Analysis (Computer Vision)
              </span>
            </SectionHeader>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Target Field</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Height (px)</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Height (mm)</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Contrast</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Calibrated</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.cvMeasurements.map((cv, i) => (
                    <tr key={cv.targetField} className={cn('border-b last:border-0', i % 2 === 0 ? '' : 'bg-muted/10')}>
                      <td className="px-3 py-2 font-medium capitalize">{cv.targetField.replace(/_/g, ' ')}</td>
                      <td className="px-3 py-2 text-right font-mono">{cv.characterHeightPx.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {cv.characterHeightMm != null ? cv.characterHeightMm.toFixed(2) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{cv.contrastRatio.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={cn('font-semibold', cv.isCalibrated ? 'text-compliance-pass-text' : 'text-muted-foreground')}>
                          {cv.isCalibrated ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 6. Violations */}
        {payload.violations.length > 0 && (
          <section>
            <SectionHeader>
              <span className="flex items-center gap-1.5 text-compliance-fail-text">
                <AlertTriangle className="w-3 h-3" />
                Statutory Violations Detected
              </span>
            </SectionHeader>
            <div className="space-y-2">
              {payload.violations.map((v) => (
                <div
                  key={v.id}
                  className="rounded-md border border-compliance-fail-border bg-compliance-fail-bg p-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-compliance-fail-text text-[11px]">
                      {v.ruleCode}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-compliance-fail-text">
                      {v.severity}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <span className="text-muted-foreground">
                      Observed: <strong className="text-foreground">{v.observedValue || 'absent'}</strong>
                    </span>
                    <span className="text-muted-foreground">
                      Required: <strong className="text-foreground">{v.expectedConstraint}</strong>
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    Rule version: {v.ruleVersion}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 7. Reviewer Sign-off */}
        {(payload.reviewedBy || payload.reviewerNotes) && (
          <section>
            <SectionHeader>Reviewer Sign-off &amp; Adjudication</SectionHeader>
            <div className="rounded-lg border p-3 bg-muted/20 space-y-0">
              <MetaRow
                label="Reviewed At"
                value={
                  payload.reviewedAt
                    ? new Date(payload.reviewedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                    : null
                }
              />
              <MetaRow label="Final Verdict" value={<StatusBadge status={payload.overallStatus} />} />
            </div>
            {payload.reviewerNotes && (
              <div className="mt-2 rounded-md border p-3 bg-muted/10 text-[11px] text-muted-foreground italic">
                &ldquo;{payload.reviewerNotes}&rdquo;
              </div>
            )}
          </section>
        )}

        {/* 8. Tamper-Evident SHA-256 */}
        <section>
          <div className="rounded-md border p-3 bg-muted/40 text-[11px] text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>Tamper-Evident SHA-256 Verification</span>
            </div>
            <p className="font-mono break-all text-[10px]">{payload.sha256Hash}</p>
            <p className="text-[10px]">
              Any modification to this report will produce a different hash, invalidating its authenticity.
            </p>
          </div>
        </section>

        {/* 9. No-violation confirmation */}
        {payload.violations.length === 0 && payload.overallStatus === 'PASS' && (
          <div className="rounded-md border border-compliance-pass-border bg-compliance-pass-bg p-3 flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-compliance-pass shrink-0" />
            <span className="text-compliance-pass-text font-medium">
              All mandatory Legal Metrology declarations are present and compliant. No statutory violations detected.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
