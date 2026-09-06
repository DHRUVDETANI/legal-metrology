// ============================================================================
// src/app/(inspector)/scan/[id]/result/page.tsx
// SIH PS26034 — Deterministic Compliance Verdict & Findings Page
// ============================================================================

import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { requireInspector } from '@/lib/auth/helpers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getActiveRules, evaluateCompliance, type ComplianceSummary } from '@/lib/compliance';
import { EvaluationResultView } from '@/components/compliance/evaluation-result-view';
import type {
  Inspection,
  Product,
  Declaration,
  CvMeasurement,
} from '@/types/database.types';

export default async function ResultViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireInspector({ redirectTo: '/login' });
  const { id } = await params;

  const supabase = await createServerSupabaseClient();

  let inspectionNumber = id;
  let productName = 'Sunrise Brand — Whole Wheat Biscuits (200g)';
  let summary: ComplianceSummary;

  if (id && id !== 'demo-insp-001') {
    // 1. Fetch real inspection details
    const { data: inspection } = await (
      supabase.from('inspections') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            single: () => Promise<{
              data: (Inspection & { products?: Product | null }) | null;
            }>;
          };
        };
      }
    )
      .select('*, products(*)')
      .eq('id', id)
      .single();

    if (inspection) {
      inspectionNumber = inspection.inspection_number;
      if (inspection.products) {
        productName = `${inspection.products.brand_name} — ${inspection.products.product_name}`;
      }
    }

    // 2. Fetch declarations
    const { data: declarationsData } = await (
      supabase.from('declarations') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => Promise<{
            data: Declaration[] | null;
          }>;
        };
      }
    )
      .select('*')
      .eq('inspection_id', id);

    const declarationsMap: Record<
      string,
      {
        id?: string;
        fieldName: string;
        rawOcrText: string;
        observedValue: string;
        normalizedValue: Record<string, unknown>;
        confidence: number;
        bbox?: { x: number; y: number; width: number; height: number };
      }
    > = {};

    if (declarationsData) {
      for (const d of declarationsData) {
        declarationsMap[d.field_name] = {
          id: d.id,
          fieldName: d.field_name,
          rawOcrText: d.raw_ocr_text,
          observedValue: d.observed_value,
          normalizedValue: (d.normalized_value as Record<string, unknown>) || {},
          confidence: d.confidence,
          bbox: d.bbox as { x: number; y: number; width: number; height: number } | undefined,
        };
      }
    }

    // 3. Fetch CV measurements
    const { data: cvData } = await (
      supabase.from('cv_measurements') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => Promise<{
            data: CvMeasurement[] | null;
          }>;
        };
      }
    )
      .select('*')
      .eq('inspection_id', id);

    const cvMap: Record<
      string,
      {
        id?: string;
        targetField: string;
        characterHeightPx: number;
        contrastRatio: number;
        isCalibrated: boolean;
        measurementMetadata?: Record<string, unknown>;
      }
    > = {};

    if (cvData) {
      for (const c of cvData) {
        cvMap[c.target_field] = {
          id: c.id,
          targetField: c.target_field,
          characterHeightPx: c.character_height_px,
          contrastRatio: c.contrast_ratio,
          isCalibrated: c.is_calibrated,
          measurementMetadata: c.measurement_metadata as Record<string, unknown> | undefined,
        };
      }
    }

    // 4. Load rules and evaluate
    const rulesetVersion = inspection?.ruleset_version || 'v2024.1';
    const activeRules = await getActiveRules(supabase, rulesetVersion);

    summary = evaluateCompliance(
      {
        inspectionId: id,
        rulesetVersion,
        declarations: declarationsMap,
        cvMeasurements: cvMap,
      },
      activeRules
    );
  } else {
    // Canonical fallback for demo inspection
    const activeRules = await getActiveRules(undefined, 'v2024.1');
    summary = evaluateCompliance(
      {
        inspectionId: id,
        rulesetVersion: 'v2024.1',
        declarations: {
          mrp: {
            fieldName: 'mrp',
            rawOcrText: 'MRP Rs. 50.00 (inclusive of all taxes)',
            observedValue: 'Rs. 50.00 (incl. of all taxes)',
            normalizedValue: { amount: 50, currency: 'INR', taxes_included: true },
            confidence: 0.98,
          },
          net_quantity: {
            fieldName: 'net_quantity',
            rawOcrText: 'Net Qty: 200 g',
            observedValue: '200 g',
            normalizedValue: { quantity: 200, unit: 'g' },
            confidence: 0.97,
          },
          manufacturing_date: {
            fieldName: 'manufacturing_date',
            rawOcrText: 'Mfg Date: 08/2026',
            observedValue: '08/2026',
            normalizedValue: { month: 8, year: 2026 },
            confidence: 0.95,
          },
          name_address_manufacturer: {
            fieldName: 'name_address_manufacturer',
            rawOcrText: 'Manufactured by: Sunrise Foods Pvt. Ltd., Plot 45, Pune 411028',
            observedValue: 'Sunrise Foods Pvt. Ltd., Plot 45, Pune 411028',
            normalizedValue: { name_and_address: 'Sunrise Foods Pvt. Ltd., Plot 45, Pune 411028' },
            confidence: 0.92,
          },
          consumer_care: {
            fieldName: 'consumer_care',
            rawOcrText: 'Consumer Care: 1800 209 4455 / customercare@sunrisefoods.in',
            observedValue: '1800 209 4455 / customercare@sunrisefoods.in',
            normalizedValue: { email: 'customercare@sunrisefoods.in', phone: '1800 209 4455' },
            confidence: 0.93,
          },
        },
      },
      activeRules
    );
  }

  return (
    <AppShell
      userRole={profile.role}
      userName={profile.full_name}
      stationName={profile.jurisdiction}
    >
      <PageContainer
        title="Compliance Verdict & Findings"
        description="Deterministic Legal Metrology compliance evaluation record."
      >
        <Breadcrumbs
          items={[
            { label: 'Field Inspections', href: '/scan' },
            { label: 'Inspection', href: `/scan/${id}/extract` },
            { label: 'Evaluation Result' },
          ]}
        />

        <EvaluationResultView
          inspectionId={id}
          inspectionNumber={inspectionNumber}
          productName={productName}
          initialSummary={summary}
          inspectorName={profile.full_name}
          badgeNumber={profile.badge_number || 'MH-INS-2024-001'}
          jurisdiction={profile.jurisdiction}
        />
      </PageContainer>
    </AppShell>
  );
}
