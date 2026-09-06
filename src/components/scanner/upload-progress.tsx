'use client';

// ============================================================================
// src/components/scanner/upload-progress.tsx
// SIH PS26034 — Upload Progress & Pipeline State Indicator
// ============================================================================

import React from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export type UploadStep = 'idle' | 'validating' | 'uploading' | 'persisting' | 'success' | 'error';

interface UploadProgressProps {
  step: UploadStep;
  errorMessage?: string | null;
  onRetry?: () => void;
}

const STEP_DESCRIPTIONS: Record<UploadStep, string> = {
  idle: 'Ready to upload.',
  validating: 'Verifying image resolution & magic bytes...',
  uploading: 'Uploading securely to private storage...',
  persisting: 'Registering inspection packaging record...',
  success: 'Upload and inspection registration complete!',
  error: 'Upload pipeline encountered an error.',
};

export function UploadProgress({ step, errorMessage, onRetry }: UploadProgressProps) {
  if (step === 'idle') return null;

  const isLoading = step === 'validating' || step === 'uploading' || step === 'persisting';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`p-4 rounded-xl border transition-all ${
        step === 'error'
          ? 'bg-destructive/10 border-destructive/30 text-destructive'
          : step === 'success'
          ? 'bg-compliance-pass-bg border-compliance-pass-border text-compliance-pass-text'
          : 'bg-primary/5 border-primary/20 text-foreground'
      }`}
    >
      <div className="flex items-start gap-3">
        {isLoading && <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0 mt-0.5" />}
        {step === 'success' && <CheckCircle2 className="w-5 h-5 text-compliance-pass-text shrink-0 mt-0.5" />}
        {step === 'error' && <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />}

        <div className="flex-1 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider">
            {step === 'success'
              ? 'Success'
              : step === 'error'
              ? 'Upload Failed'
              : 'Processing Inspection Image'}
          </p>
          <p className="text-sm">
            {step === 'error' && errorMessage ? errorMessage : STEP_DESCRIPTIONS[step]}
          </p>

          {/* Stepper bar during loading */}
          {isLoading && (
            <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{
                  width:
                    step === 'validating'
                      ? '33%'
                      : step === 'uploading'
                      ? '66%'
                      : '90%',
                }}
              />
            </div>
          )}
        </div>

        {step === 'error' && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
