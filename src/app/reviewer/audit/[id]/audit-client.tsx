'use client';

// ============================================================================
// src/app/reviewer/audit/[id]/page.tsx
// SIH PS26034 — Reviewer Audit & Adjudication Page
//
// Fetches real inspection data, declarations, violations, and audit trail.
// Provides reviewer adjudication form that calls POST /api/inspections/[id]/review.
// ============================================================================

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, ArrowLeft, Shield } from 'lucide-react';
import type { Inspection, Declaration, Violation, AuditLog } from '@/types/database.types';
import { generateInspectionAdvisory } from '@/lib/advisory/service';
import { AiAdvisoryCard } from '@/components/compliance/ai-advisory-card';

// ── Client Component (needs form interactivity) ─────────────────────────────

interface AuditPageClientProps {
  inspectionId: string;
  inspection: Inspection;
  declarations: Declaration[];
  violations: Violation[];
  auditLogs: AuditLog[];
  reviewerName: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function AuditPageClient({
  inspectionId,
  inspection,
  declarations,
  violations,
  auditLogs,
  reviewerName,
}: AuditPageClientProps) {
  const router = useRouter();
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const canAdjudicate = inspection.status === 'REVIEW';

  async function handleAdjudicate(verdict: 'PASS' | 'FAIL') {
    if (!reviewerNotes.trim()) {
      setSubmitError('Reviewer notes are required to document the adjudication rationale.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/inspections/${inspectionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verdict, reviewer_notes: reviewerNotes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'Adjudication failed.');
      } else {
        setSubmitSuccess(`Inspection successfully adjudicated as ${verdict}.`);
        router.refresh();
      }
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Case Banner */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-muted-foreground">
                {inspection.inspection_number}
              </span>
              <StatusBadge status={inspection.status} />
            </div>
            <h2 className="text-lg font-bold text-foreground">{inspection.location_name}</h2>
            <div className="text-xs text-muted-foreground">
              Submitted: {formatDate(inspection.created_at)} ·{' '}
              {inspection.total_violations} violation{inspection.total_violations !== 1 ? 's' : ''}
            </div>
          </div>
          {inspection.reviewed_by && (
            <div className="text-xs text-muted-foreground">
              <div className="font-medium text-foreground">Already Adjudicated</div>
              <div>{inspection.reviewed_at ? formatDate(inspection.reviewed_at) : '—'}</div>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
        {/* Left: Declarations & Violations */}
        <div className="lg:col-span-7 space-y-4">
          {/* Declarations */}
          <Card className="border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Extracted Declarations ({declarations.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              {declarations.length === 0 ? (
                <p className="text-xs text-muted-foreground">No declarations extracted.</p>
              ) : (
                declarations.map((d) => (
                  <div key={d.id} className="rounded-md border p-3 bg-muted/10 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold capitalize">
                        {d.field_name.replace(/_/g, ' ')}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {Math.round(d.confidence * 100)}% conf.
                      </Badge>
                    </div>
                    <div className="text-foreground">{d.observed_value}</div>
                    <div className="font-mono text-[10px] text-muted-foreground break-all">
                      {d.raw_ocr_text}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Violations */}
          {violations.length > 0 && (
            <Card className="border border-compliance-fail-border">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-compliance-fail-text">
                  Violations ({violations.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                {violations.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-md border border-compliance-fail-border bg-compliance-fail-bg p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-compliance-fail-text">{v.rule_code}</span>
                      <span className="text-[10px] font-bold uppercase">{v.severity}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      <span>
                        Observed: <strong>{v.observed_value || '—'}</strong>
                      </span>
                      <span>
                        Required: <strong>{v.expected_constraint}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* AI Rule Auditor Assistance */}
          <AiAdvisoryCard
            advisory={generateInspectionAdvisory(
              inspectionId,
              {
                inspectionId,
                overallStatus: inspection.status,
                rulesetVersion: inspection.ruleset_version,
                evaluatedAt: inspection.updated_at,
                totalRulesEvaluated: 6,
                passedCount: 6 - violations.length,
                failedCount: violations.length,
                reviewCount: inspection.status === 'REVIEW' ? 1 : 0,
                notApplicableCount: 0,
                totalViolations: violations.length,
                checkResults: violations.map((v) => ({
                  ruleCode: v.rule_code,
                  ruleId: v.rule_id || '',
                  ruleVersion: v.rule_version,
                  targetField: v.rule_code,
                  title: `Rule ${v.rule_code}`,
                  verdict: 'FAIL' as const,
                  observedValue: v.observed_value,
                  expectedConstraint: v.expected_constraint,
                  severity: v.severity,
                  confidence: v.confidence,
                  explanation: `Observed ${v.observed_value} fails requirement ${v.expected_constraint}`,
                  evaluatedAt: v.created_at,
                })),
                violations: violations.map((v) => ({
                  inspectionId,
                  ruleCode: v.rule_code,
                  ruleId: v.rule_id || '',
                  ruleVersion: v.rule_version,
                  observedValue: v.observed_value,
                  expectedConstraint: v.expected_constraint,
                  severity: v.severity,
                  evidenceBbox: v.evidence_bbox as Record<string, unknown>,
                  evidenceCropPath: v.evidence_crop_path,
                  confidence: v.confidence,
                  explanation: `Observed ${v.observed_value} fails requirement ${v.expected_constraint}`,
                })),
              },
              declarations
            )}
          />

          {/* Audit Trail */}
          <Card className="border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" />
                Immutable Audit Trail ({auditLogs.length} entries)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {auditLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground">No audit entries yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 text-[11px]">
                      <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <div>
                        <span className="font-mono font-semibold text-foreground">{log.action}</span>
                        <span className="text-muted-foreground ml-2">{formatDate(log.created_at)}</span>
                        <div className="text-muted-foreground capitalize">{log.actor_role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Adjudication Form */}
        <Card className="lg:col-span-5 border self-start">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Official Adjudication
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            {submitSuccess ? (
              <div className="rounded-md border border-compliance-pass-border bg-compliance-pass-bg p-3 text-xs text-compliance-pass-text font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {submitSuccess}
              </div>
            ) : (
              <>
                <div className="text-xs text-muted-foreground">
                  Reviewer: <strong className="text-foreground">{reviewerName}</strong>
                </div>

                {!canAdjudicate && (
                  <div className="rounded-md border p-3 bg-muted/20 text-xs text-muted-foreground">
                    This inspection has already been adjudicated (status:{' '}
                    <strong>{inspection.status}</strong>).
                    {inspection.reviewer_notes && (
                      <p className="mt-1 italic">&ldquo;{inspection.reviewer_notes}&rdquo;</p>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground block">
                    Official Adjudication Remarks <span className="text-compliance-fail-text">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={reviewerNotes}
                    onChange={(e) => setReviewerNotes(e.target.value)}
                    disabled={!canAdjudicate || isSubmitting}
                    placeholder="Record the reason for verdict confirmation or override (required)..."
                    className="w-full px-3 py-2 text-xs rounded-md border bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                  />
                </div>

                {submitError && (
                  <div className="rounded-md border border-compliance-fail-border bg-compliance-fail-bg p-2 text-xs text-compliance-fail-text">
                    {submitError}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5 text-compliance-pass-text border-compliance-pass-border hover:bg-compliance-pass-bg"
                    disabled={!canAdjudicate || isSubmitting}
                    onClick={() => handleAdjudicate('PASS')}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Adjudicate: PASS</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5 text-compliance-fail-text border-compliance-fail-border hover:bg-compliance-fail-bg"
                    disabled={!canAdjudicate || isSubmitting}
                    onClick={() => handleAdjudicate('FAIL')}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Adjudicate: FAIL</span>
                  </Button>
                </div>

                <Link href="/reviewer/queue">
                  <Button variant="ghost" size="sm" className="w-full gap-1 text-xs mt-1">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Queue
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
