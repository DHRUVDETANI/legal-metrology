// ============================================================================
// src/app/admin/audit-logs/page.tsx
// SIH PS26034 — Admin System-Wide Audit Ledger
//
// Fetches real audit_logs from the database via server-side Supabase call
// and renders the interactive AdminAuditLogsClient.
// Admin-only: enforced by requireAdmin().
// ============================================================================

import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { AdminAuditLogsClient, type AuditTableRow } from './audit-logs-client';
import { Lock } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/helpers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { AuditLog } from '@/types/database.types';

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

const PAGE_SIZE = 100;

export default async function AdminAuditLogsPage() {
  const profile = await requireAdmin({ redirectTo: '/login' });
  const supabase = await createServerSupabaseClient();

  // Fetch latest audit logs (ordered by most recent first)
  const { data: rawLogs } = await (
    supabase.from('audit_logs') as unknown as {
      select: (cols: string) => {
        order: (col: string, opts: { ascending: boolean }) => {
          limit: (n: number) => Promise<{ data: AuditLog[] | null }>;
        };
      };
    }
  )
    .select('*')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  const tableRows: AuditTableRow[] = (rawLogs || []).map((log) => ({
    id: log.id,
    timestamp: formatDate(log.created_at),
    actorRole: log.actor_role,
    action: log.action,
    entityType: log.entity_type,
    entityId: log.entity_id,
    ipAddress: log.ip_address,
  }));

  return (
    <AppShell
      userRole={profile.role}
      userName={profile.full_name}
      stationName={profile.jurisdiction}
    >
      <PageContainer
        title="Security & System Audit Ledger"
        description="Immutable chronological record of regulatory actions, user logins, and compliance verdicts."
      >
        <Breadcrumbs
          items={[
            { label: 'Administrative Console', href: '/admin' },
            { label: 'Audit Ledger' },
          ]}
        />

        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
          <Lock className="w-4 h-4 text-primary shrink-0" />
          <span>
            <strong>Append-Only Security Model:</strong> This audit trail is protected by database RLS (no UPDATE or DELETE privileges). All events are permanently recorded for judicial traceability.
          </span>
        </div>

        <AdminAuditLogsClient initialLogs={tableRows} />
      </PageContainer>
    </AppShell>
  );
}
