'use client';

// ============================================================================
// src/components/declarations/declaration-list.tsx
// SIH PS26034 — Statutory Declarations Management & Extraction Client View
//
// Features:
//   - Trigger server-side OCR extraction pipeline with live progress
//   - Displays candidate statutory declarations with confidence metrics
//   - Allows real-time inspector edits with provenance tracking
//   - Seamless CTA handoff to compliance engine verification
// ============================================================================

import React, { useState } from 'react';
import Link from 'next/link';
import { Loader2, ScanText, Scale, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DeclarationCard } from '@/components/declarations/declaration-card';
import type { Declaration } from '@/types/database.types';

interface DeclarationListProps {
  inspectionId: string;
  initialDeclarations: Declaration[];
}

export function DeclarationList({ inspectionId, initialDeclarations }: DeclarationListProps) {
  const [declarations, setDeclarations] = useState<Declaration[]>(initialDeclarations);
  const [isExtracting, setIsExtracting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleExtract = async () => {
    setIsExtracting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/inspections/${inspectionId}/extract`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok || !data.declarations) {
        throw new Error(data.error || 'Failed to extract declarations.');
      }

      setDeclarations(data.declarations);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Extraction pipeline failed.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDeclarationUpdate = (updated: Declaration) => {
    setDeclarations((prev) =>
      prev.map((d) => (d.id === updated.id ? updated : d))
    );
  };

  const highConfidenceCount = declarations.filter((d) => d.confidence >= 0.8).length;
  const editedCount = declarations.filter((d) => d.is_manually_edited).length;

  return (
    <div className="space-y-4">
      {/* Action Header & Statistics Bar */}
      <Card className="border bg-card/60">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Mandatory Declarations ({declarations.length})
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Rule 6 Legal Metrology (Packaged Commodities) statutory candidate values.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleExtract}
              disabled={isExtracting}
              className="min-h-[48px] px-4 gap-2 font-bold shadow-sm self-stretch sm:self-auto touch-manipulation"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing OCR...</span>
                </>
              ) : declarations.length > 0 ? (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Re-run OCR Extraction</span>
                </>
              ) : (
                <>
                  <ScanText className="w-4 h-4" />
                  <span>Extract Statutory Declarations</span>
                </>
              )}
            </Button>
          </div>

          {/* Extraction Metrics Overview */}
          {declarations.length > 0 && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center">
              <div className="p-2 rounded-lg bg-muted/40 border">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Total Fields
                </span>
                <span className="text-xs font-bold text-foreground">{declarations.length}</span>
              </div>

              <div className="p-2 rounded-lg bg-muted/40 border">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  High Confidence
                </span>
                <span className="text-xs font-bold text-compliance-pass-text">
                  {highConfidenceCount} / {declarations.length}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-muted/40 border">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Inspector Edits
                </span>
                <span className="text-xs font-bold text-primary">{editedCount}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Alert */}
      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2.5 shadow-sm"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Declarations Cards List */}
      {declarations.length > 0 ? (
        <div className="space-y-3">
          {declarations.map((declaration) => (
            <DeclarationCard
              key={declaration.id}
              declaration={declaration}
              inspectionId={inspectionId}
              onUpdate={handleDeclarationUpdate}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <Card className="border border-dashed p-8 text-center bg-muted/20">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto mb-3">
            <ScanText className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-foreground">No Declarations Extracted Yet</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            Tap the extract button above to process the captured packaging evidence and detect mandatory legal declarations.
          </p>
          <Button
            type="button"
            onClick={handleExtract}
            disabled={isExtracting}
            className="min-h-[48px] px-5 gap-2 font-bold shadow-md"
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running Pipeline...</span>
              </>
            ) : (
              <>
                <ScanText className="w-4 h-4" />
                <span>Run Declaration Extraction</span>
              </>
            )}
          </Button>
        </Card>
      )}

      {/* Handoff CTA Button to Compliance Result Page */}
      {declarations.length > 0 && (
        <div className="pt-2">
          <Link href={`/scan/${inspectionId}/result`} className="block">
            <Button
              size="lg"
              className="w-full min-h-[52px] gap-2 text-base font-bold shadow-lg touch-manipulation"
            >
              <Scale className="w-5 h-5" />
              <span>Evaluate Compliance Engine</span>
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
