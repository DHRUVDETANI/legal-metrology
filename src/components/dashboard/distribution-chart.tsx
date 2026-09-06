// ============================================================================
// src/components/dashboard/distribution-chart.tsx
// SIH PS26034 — Accessible Operational Distribution Chart
//
// Zero-dependency, lightweight, semantic CSS/SVG horizontal distribution bar.
// Displays breakdown of inspection statuses or violation severities.
// ============================================================================

import React from 'react';

export interface DistributionSegment {
  label: string;
  count: number;
  colorClass: string;
}

interface DistributionChartProps {
  title: string;
  description?: string;
  segments: DistributionSegment[];
  total: number;
  emptyMessage?: string;
}

export function DistributionChart({
  title,
  description,
  segments,
  total,
  emptyMessage = 'No data recorded for distribution analysis.',
}: DistributionChartProps) {
  if (total === 0) {
    return (
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h4>
        <p className="text-xs text-muted-foreground py-4 text-center">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </h4>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <span className="text-xs font-bold font-mono text-foreground">Total: {total}</span>
      </div>

      {/* Stacked Percentage Bar */}
      <div
        className="h-3 w-full rounded-full bg-muted overflow-hidden flex"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={total}
        aria-label={title}
      >
        {segments.map((seg, idx) => {
          const pct = Math.round((seg.count / total) * 100);
          if (pct === 0 && seg.count === 0) return null;
          return (
            <div
              key={idx}
              style={{ width: `${(seg.count / total) * 100}%` }}
              className={`h-full transition-all ${seg.colorClass}`}
              title={`${seg.label}: ${seg.count} (${pct}%)`}
            />
          );
        })}
      </div>

      {/* Legend & Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
        {segments.map((seg, idx) => {
          const pct = Math.round((seg.count / total) * 100);
          return (
            <div key={idx} className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${seg.colorClass}`} />
              <span className="text-muted-foreground">{seg.label}:</span>
              <span className="font-semibold text-foreground font-mono">
                {seg.count} <span className="text-[10px] text-muted-foreground">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
