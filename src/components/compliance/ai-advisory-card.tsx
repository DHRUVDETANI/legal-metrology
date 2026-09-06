// ============================================================================
// src/components/compliance/ai-advisory-card.tsx
// SIH PS26034 — Bounded AI Advisory Guidance Card Component
//
// Displays statutory citations, anomaly explanations, and reviewer suggestions.
// Explicitly demarcates non-authoritative AI advisory status.
// ============================================================================

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, ShieldAlert, Sparkles, AlertCircle, BookOpen } from 'lucide-react';
import type { InspectionAdvisoryReport } from '@/lib/advisory/types';

interface AiAdvisoryCardProps {
  advisory: InspectionAdvisoryReport;
}

export function AiAdvisoryCard({ advisory }: AiAdvisoryCardProps) {
  return (
    <Card className="border border-primary/20 bg-gradient-to-b from-primary/[0.03] to-transparent shadow-sm space-y-2">
      <CardHeader className="p-4 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>AI Rule Auditor Advisory (Non-Authoritative)</span>
          </CardTitle>
          <Badge
            variant="outline"
            className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5 w-fit"
          >
            Advisory Assistance Only
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-3 text-xs">
        {/* Executive Summary */}
        <div className="rounded-md border bg-card p-3 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
            <Bot className="w-3.5 h-3.5 text-primary" />
            <span>Executive Synthesis</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">{advisory.executiveSummary}</p>
        </div>

        {/* Discrepancy Alert if any low confidence tokens were detected */}
        {advisory.discrepancyCount > 0 && (
          <div className="rounded-md border border-amber-300/40 bg-amber-50/60 dark:bg-amber-950/20 p-2.5 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>OCR Uncertainty Flag:</strong> {advisory.discrepancyCount} extracted field(s) have confidence below 70%. Field officers are advised to visually cross-check packaging photos.
            </span>
          </div>
        )}

        {/* Advisory List for Violations & Reviews */}
        <div className="space-y-2 pt-1">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Statutory Rule Citations & Explanations
          </h4>

          <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
            {advisory.advisories.map((adv) => (
              <div
                key={adv.id}
                className="rounded-lg border bg-card p-3 space-y-1.5 text-xs shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-foreground">
                    {adv.ruleCode}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      adv.deterministicVerdict === 'PASS'
                        ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40'
                        : adv.deterministicVerdict === 'FAIL'
                          ? 'text-rose-700 bg-rose-50 dark:bg-rose-950/40'
                          : 'text-amber-700 bg-amber-50 dark:bg-amber-950/40'
                    }`}
                  >
                    Verdict: {adv.deterministicVerdict}
                  </span>
                </div>

                <div className="font-medium text-foreground">{adv.ruleTitle}</div>
                <p className="text-[11px] text-muted-foreground">{adv.explanation}</p>

                <div className="flex items-center gap-1.5 pt-1 text-[10px] text-muted-foreground border-t">
                  <BookOpen className="w-3 h-3 text-primary shrink-0" />
                  <span className="truncate">{adv.statutoryReference}</span>
                </div>

                {adv.suggestedAction && (
                  <div className="rounded bg-muted/40 p-1.5 text-[10px] text-muted-foreground">
                    <strong className="text-foreground">Suggested Protocol:</strong> {adv.suggestedAction}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Legal Demarcation Footer */}
        <div className="rounded border bg-muted/20 p-2.5 text-[10px] text-muted-foreground flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span>{advisory.authoritativeNotice}</span>
        </div>
      </CardContent>
    </Card>
  );
}
