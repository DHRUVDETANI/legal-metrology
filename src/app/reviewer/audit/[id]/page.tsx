// ============================================================================
// src/app/reviewer/audit/[id]/page.tsx
// SIH PS26034 — Reviewer Audit Page (Server Component wrapper)
//
// Fetches real inspection, declarations, violations, and audit trail from DB.
// Delegates interactive adjudication to AuditPageClient.
// ============================================================================

import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { AuditPageClient } from './audit-client';
import { requireReviewer } from '@/lib/auth/helpers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Inspection, Declaration, Violation, AuditLog } from '@/types/database.types';

export default async function ReviewerAuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireReviewer({ redirectTo: '/login' });
  const { id } = await params;

  const supabase = await createServerSupabaseClient();

  // Fetch inspection
  const { data: inspection } = await (
    supabase.from('inspections') as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          single: () => Promise<{ data: Inspection | null }>;
        };
      };
    }
  )
    .select('*')
    .eq('id', id)
    .single();

  if (!inspection) {
    return (
      <AppShell userRole={profile.role} userName={profile.full_name} stationName={profile.jurisdiction}>
        <PageContainer title="Inspection Audit" description="Audit case not found.">
          <div className="rounded-lg border border-compliance-fail-border bg-compliance-fail-bg p-4 text-sm text-compliance-fail-text">
            Inspection not found or you do not have access to this record.
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  // Fetch declarations
  const { data: declarations } = await (
    supabase.from('declarations') as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          order: (col: string, opts: { ascending: boolean }) => Promise<{ data: Declaration[] | null }>;
        };
      };
    }
  )
    .select('*')
    .eq('inspection_id', id)
    .order('created_at', { ascending: true });

  // Fetch violations
  const { data: violations } = await (
    supabase.from('violations') as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          order: (col: string, opts: { ascending: boolean }) => Promise<{ data: Violation[] | null }>;
        };
      };
    }
  )
    .select('*')
    .eq('inspection_id', id)
    .order('created_at', { ascending: true });

  // Fetch audit trail (reviewer/admin only — already enforced by requireReviewer above)
  const { data: auditLogs } = await (
    supabase.from('audit_logs') as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          order: (col: string, opts: { ascending: boolean }) => Promise<{ data: AuditLog[] | null }>;
        };
      };
    }
  )
    .select('*')
    .eq('entity_id', id)
    .order('created_at', { ascending: true });

  return (
    <AppShell
      userRole={profile.role}
      userName={profile.full_name}
      stationName={profile.jurisdiction}
    >
      <PageContainer
        title="Inspection Audit & Adjudication"
        description={`Audit case file: ${inspection.inspection_number}. Reconstruct evidence, verify OCR findings, and log official verdict.`}
      >
        <Breadcrumbs
          items={[
            { label: 'Reviewer Portal', href: '/reviewer' },
            { label: 'Review Queue', href: '/reviewer/queue' },
            { label: `Audit: ${inspection.inspection_number}` },
          ]}
        />

        <AuditPageClient
          inspectionId={id}
          inspection={inspection}
          declarations={declarations || []}
          violations={violations || []}
          auditLogs={auditLogs || []}
          reviewerName={profile.full_name}
        />
      </PageContainer>
    </AppShell>
  );
}
