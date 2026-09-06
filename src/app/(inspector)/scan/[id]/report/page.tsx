// ============================================================================
// src/app/(inspector)/scan/[id]/report/page.tsx
// SIH PS26034 — Statutory Inspection Report Page
//
// Generates (or retrieves) the compliance report for the given inspection,
// renders it via ReportView, and provides a download action.
// ============================================================================

import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { ReportView } from '@/components/reports/report-view';
import { Button } from '@/components/ui/button';
import { Download, ArrowLeft, Printer } from 'lucide-react';
import { requireInspector } from '@/lib/auth/helpers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateReportPayload } from '@/lib/reports/generator';
import type { Inspection } from '@/types/database.types';
import type { ReportPayload } from '@/lib/reports/types';

export default async function ReportViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireInspector({ redirectTo: '/login' });
  const { id } = await params;

  const supabase = await createServerSupabaseClient();

  let reportPayload: ReportPayload | null = null;
  let errorMessage: string | null = null;

  try {
    // Verify IDOR: Inspector must own this inspection
    const { data: inspection } = await (
      supabase.from('inspections') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            single: () => Promise<{ data: Pick<Inspection, 'id' | 'inspector_id'> | null }>;
          };
        };
      }
    )
      .select('id, inspector_id')
      .eq('id', id)
      .single();

    if (!inspection) {
      errorMessage = 'Inspection not found.';
    } else if (inspection.inspector_id !== profile.id && profile.role === 'inspector') {
      errorMessage = 'Access denied.';
    } else {
      reportPayload = await generateReportPayload(id, supabase, {
        id: profile.id,
        full_name: profile.full_name,
        badge_number: profile.badge_number,
        jurisdiction: profile.jurisdiction,
      });
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to generate report.';
  }

  return (
    <AppShell
      userRole={profile.role}
      userName={profile.full_name}
      stationName={profile.jurisdiction}
    >
      <PageContainer
        title="Statutory Inspection Report"
        description="Court-admissible Legal Metrology Packaged Commodities inspection summary."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </Button>
            {reportPayload && (
              <form action={`/api/inspections/${id}/report`} method="POST">
                <Button type="submit" size="sm" className="gap-1.5 font-semibold shadow-sm">
                  <Download className="w-4 h-4" />
                  <span>Generate &amp; Download</span>
                </Button>
              </form>
            )}
          </div>
        }
      >
        <Breadcrumbs
          items={[
            { label: 'Field Inspections', href: '/scan' },
            { label: 'Inspection', href: `/scan/${id}/result` },
            { label: 'Inspection Report' },
          ]}
        />

        {errorMessage ? (
          <div className="rounded-lg border border-compliance-fail-border bg-compliance-fail-bg p-4 text-sm text-compliance-fail-text">
            {errorMessage}
          </div>
        ) : reportPayload ? (
          <ReportView payload={reportPayload} />
        ) : null}

        <div className="max-w-3xl mx-auto flex items-center justify-between pt-2">
          <Link href={`/scan/${id}/result`}>
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Findings</span>
            </Button>
          </Link>
          <Link href="/scan">
            <Button size="sm" className="text-xs">
              Finish Inspection
            </Button>
          </Link>
        </div>
      </PageContainer>
    </AppShell>
  );
}
