'use client';

// ============================================================================
// src/components/declarations/declaration-card.tsx
// SIH PS26034 — Statutory Declaration Candidate Card Component
//
// Features:
//   - Confidence badge (Green >= 80%, Amber 60-80%, Red < 60%)
//   - Unambiguous provenance badge (OCR Extracted vs Inspector Corrected)
//   - Inline correction form (>= 48px touch targets for mobile field use)
//   - Preserves raw OCR snippet for evidence inspection
// ============================================================================

import React, { useState } from 'react';
import { Edit2, Check, X, AlertTriangle, UserCheck, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Declaration } from '@/types/database.types';

const FIELD_LABELS: Record<string, string> = {
  mrp: 'MRP (Maximum Retail Price)',
  net_quantity: 'Net Quantity',
  manufacturing_date: 'Date of Manufacture / Packing',
  name_address_manufacturer: 'Manufacturer / Packer Details',
  consumer_care: 'Consumer Care Contact',
  common_generic_name: 'Common / Generic Commodity Name',
  country_of_origin: 'Country of Origin',
  unit_sale_price: 'Unit Sale Price (USP)',
};

interface DeclarationCardProps {
  declaration: Declaration;
  inspectionId: string;
  onUpdate: (updated: Declaration) => void;
}

export function DeclarationCard({ declaration, inspectionId, onUpdate }: DeclarationCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(declaration.observed_value);
  const [isSaving, setIsSaving] = useState(false);
  const [showRawOcr, setShowRawOcr] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const confidencePct = Math.round(declaration.confidence * 100);
  const isHighConfidence = declaration.confidence >= 0.8;
  const isMediumConfidence = declaration.confidence >= 0.6 && declaration.confidence < 0.8;

  const handleSave = async () => {
    if (!editValue.trim()) return;

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/inspections/${inspectionId}/declarations/${declaration.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          observed_value: editValue.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.declaration) {
        throw new Error(data.error || 'Failed to update declaration.');
      }

      onUpdate(data.declaration);
      setIsEditing(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3 transition-colors hover:border-primary/40">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {FIELD_LABELS[declaration.field_name] || declaration.field_name}
        </span>

        <div className="flex items-center gap-2">
          {/* Provenance Badge */}
          {declaration.is_manually_edited ? (
            <Badge variant="outline" className="text-[10px] gap-1 border-primary/40 bg-primary/10 text-primary font-semibold">
              <UserCheck className="w-3 h-3" />
              <span>Inspector Corrected</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              OCR Candidate
            </Badge>
          )}

          {/* Confidence Indicator Badge */}
          <Badge
            variant={isHighConfidence ? 'pass' : isMediumConfidence ? 'review' : 'fail'}
            className="text-[11px] font-bold"
          >
            {confidencePct}% OCR
          </Badge>
        </div>
      </div>

      {/* Value Content or Inline Editor */}
      {isEditing ? (
        <div className="space-y-2 pt-1">
          <label className="text-[11px] font-medium text-muted-foreground block">
            Corrected Statutory Declaration Value
          </label>
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            disabled={isSaving}
            className="w-full min-h-[48px] px-3 text-sm rounded-lg border bg-background text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
          />

          {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !editValue.trim()}
              className="min-h-[48px] px-4 gap-1.5 font-bold shadow"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Correction'}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSaving}
              onClick={() => {
                setEditValue(declaration.observed_value);
                setIsEditing(false);
              }}
              className="min-h-[48px] px-4 gap-1.5"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1">
            <p className="text-base font-bold text-foreground break-words">
              {declaration.observed_value}
            </p>

            {/* Evidence coordinates snippet */}
            {showRawOcr && (
              <div className="mt-2 p-2.5 rounded-lg bg-muted/60 border text-[11px] font-mono text-muted-foreground space-y-1">
                <div>
                  <span className="font-semibold text-foreground">Raw OCR:</span> {declaration.raw_ocr_text}
                </div>
                <div>
                  <span className="font-semibold text-foreground">Bounding Box:</span>{' '}
                  {JSON.stringify(declaration.bbox)}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowRawOcr(!showRawOcr)}
              className="min-h-[48px] px-2.5 text-xs text-muted-foreground hover:text-foreground"
              title="Inspect raw OCR evidence"
            >
              <Eye className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="min-h-[48px] px-3 gap-1.5 text-xs font-semibold"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </Button>
          </div>
        </div>
      )}

      {/* Uncertainty Notice for Low Confidence */}
      {!isHighConfidence && !declaration.is_manually_edited && !isEditing && (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1.5 rounded-md border border-amber-500/20">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>OCR confidence below threshold. Please verify against packaging evidence.</span>
        </div>
      )}
    </div>
  );
}
