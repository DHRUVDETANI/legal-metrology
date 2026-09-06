// ============================================================================
// src/components/compliance/evaluation-result-view.tsx
// SIH PS26034 — Interactive Compliance Evaluation Result View
// ============================================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import type { ComplianceSummary } from '@/lib/compliance';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  FileText,
  ArrowRight,
  ShieldCheck,
  AlertOctagon,
  Scale,
  ListChecks,
} from 'lucide-react';

interface EvaluationResultViewProps {
  inspectionId: string;
  inspectionNumber: string;
  productName: string;
  initialSummary: ComplianceSummary;
  inspectorName: string;
  badgeNumber: string;
  jurisdiction: string;
}

export function EvaluationResultView({
  inspectionId,
  inspectionNumber,
  productName,
  initialSummary,
  inspectorName,
  badgeNumber,
  jurisdiction,
}: EvaluationResultViewProps) {
  const [summary, setSummary] = useState<ComplianceSummary>(initialSummary);
  const [reEvaluating, setReEvaluating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleReEvaluate = async () => {
    setReEvaluating(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/inspections/${inspectionId}/evaluate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to re-evaluate inspection');
      }
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Re-evaluation failed');
    } finally {
      setReEvaluating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Error alert if re-eval failed */}
      {errorMsg && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Primary Verdict Banner */}
      <div className="rounded-xl border bg-card p-5 sm:p-6 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-muted-foreground">
                {inspectionNumber}
              </span>
              <StatusBadge status={summary.overallStatus} />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">
              {productName}
            </h2>
            <p className="text-xs text-muted-foreground">
              Evaluated under Legal Metrology (Packaged Commodities) Ruleset {summary.rulesetVersion}
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1">
            <span className="text-xs text-muted-foreground">Statutory Violations</span>
            <span
              className={`text-2xl font-black ${
                summary.totalViolations > 0
                  ? 'text-destructive'
                  : summary.reviewCount > 0
                    ? 'text-amber-500'
                    : 'text-compliance-pass-text'
              }`}
            >
              {summary.totalViolations} {summary.totalViolations === 1 ? 'Violation' : 'Violations'}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReEvaluate}
              disabled={reEvaluating}
              className="h-7 text-xs gap-1 mt-1"
            >
              <RotateCw className={`w-3 h-3 ${reEvaluating ? 'animate-spin' : ''}`} />
              <span>{reEvaluating ? 'Evaluating...' : 'Re-run Evaluation'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Numerical Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border">
          <CardContent className="p-3 text-center">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Rules Checked</span>
            <div className="text-xl font-bold text-foreground mt-0.5">{summary.totalRulesEvaluated}</div>
          </CardContent>
        </Card>
        <Card className="border bg-emerald-50/30 dark:bg-emerald-950/10">
          <CardContent className="p-3 text-center">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase">Satisfied</span>
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{summary.passedCount}</div>
          </CardContent>
        </Card>
        <Card className="border bg-rose-50/30 dark:bg-rose-950/10">
          <CardContent className="p-3 text-center">
            <span className="text-[11px] font-semibold text-destructive uppercase">Violations</span>
            <div className="text-xl font-bold text-destructive mt-0.5">{summary.failedCount}</div>
          </CardContent>
        </Card>
        <Card className="border bg-amber-50/30 dark:bg-amber-950/10">
          <CardContent className="p-3 text-center">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase">Review Required</span>
            <div className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-0.5">{summary.reviewCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Detected Violations Section */}
      {summary.violations.length > 0 && (
        <Card className="border border-destructive/40 bg-destructive/5 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-destructive flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4" />
              <span>Detected Statutory Violations ({summary.violations.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            {summary.violations.map((v, idx) => (
              <div
                key={idx}
                className="rounded-lg border bg-background p-3.5 space-y-2 text-xs shadow-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-destructive text-[11px]">{v.ruleCode}</span>
                  <Badge variant={v.severity === 'CRITICAL' ? 'destructive' : 'default'} className="text-[10px]">
                    {v.severity}
                  </Badge>
                </div>
                <p className="text-foreground font-medium">{v.explanation}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-muted/40 rounded p-2 text-[11px]">
                  <div>
                    <span className="text-muted-foreground block">Observed Value:</span>
                    <span className="font-mono font-semibold text-foreground">{v.observedValue}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Statutory Requirement:</span>
                    <span className="text-foreground">{v.expectedConstraint}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Rule-by-Rule Audit Breakdown */}
      <Card className="border shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ListChecks className="w-4 h-4 text-primary" />
            <span>Statutory Rules Evaluation Ledger</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 divide-y">
          {summary.checkResults.map((check, idx) => (
            <div key={idx} className="py-3 first:pt-1 last:pb-1 space-y-1.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground">{check.ruleCode}</span>
                    <span className="font-semibold text-foreground text-xs sm:text-sm">{check.title}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{check.explanation}</p>
                </div>

                <div className="shrink-0">
                  {check.verdict === 'PASS' && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-compliance-pass-text bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Pass
                    </span>
                  )}
                  {check.verdict === 'FAIL' && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                      <XCircle className="w-3.5 h-3.5" /> Fail
                    </span>
                  )}
                  {check.verdict === 'REVIEW' && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="w-3.5 h-3.5" /> Review
                    </span>
                  )}
                  {check.verdict === 'NOT_APPLICABLE' && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded border">
                      N/A
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-muted/20 px-2.5 py-1.5 rounded">
                <span>Observed: <strong className="text-foreground font-mono">{check.observedValue}</strong></span>
                <span>Rule Version: <strong className="text-foreground font-mono">{check.ruleVersion}</strong></span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Chain of Custody & Traceability Info */}
      <Card className="border">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-primary" />
            <span>Inspection Chain of Custody & Audit Provenance</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2 text-xs">
          <div className="flex items-center justify-between py-1.5 border-b">
            <span className="text-muted-foreground">Field Inspector</span>
            <span className="font-semibold text-foreground">{inspectorName}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b">
            <span className="text-muted-foreground">Badge Number</span>
            <span className="font-mono font-medium text-foreground">{badgeNumber}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b">
            <span className="text-muted-foreground">Jurisdiction / Station</span>
            <span className="font-medium text-foreground">{jurisdiction}</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-muted-foreground">Audit Trail Record</span>
            <span className="font-medium text-foreground flex items-center gap-1 text-compliance-pass-text">
              <ShieldCheck className="w-3.5 h-3.5" /> Immutable Log Registered
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Link href={`/scan/${inspectionId}/extract`} className="sm:w-auto">
          <Button variant="outline" size="lg" className="w-full gap-2 font-medium">
            <span>Back to Declarations</span>
          </Button>
        </Link>
        <Link href={`/scan/${inspectionId}/report`} className="flex-1">
          <Button size="lg" className="w-full gap-2 text-base font-bold shadow-md">
            <FileText className="w-5 h-5" />
            <span>Generate Legal Inspection Report (PDF)</span>
            <ArrowRight className="w-4 h-4 ml-auto" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
