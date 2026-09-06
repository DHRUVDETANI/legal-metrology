// ============================================================================
// src/app/admin/audit-logs/page.tsx
// SIH PS26034 — Admin System-Wide Audit Ledger
//
// Fetches real audit_logs from the database via server-side Supabase call.
// Admin-only: enforced by requireAdmin().
// ============================================================================

import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { DataTable, type Column } from '@/components/ui/data-table';
import { RoleBadge } from '@/components/ui/role-badge';
import { Button } from '@/components/ui/button';
import { Download, Lock } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/helpers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { AuditLog, UserRole } from '@/types/database.types';

interface AuditTableRow {
  id: string;
  timestamp: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
}

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

  // Fetch latest audit logs (up to PAGE_SIZE, ordered by most recent first)
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

  const columns: Column<AuditTableRow>[] = [
    {
      header: 'Timestamp (IST)',
      accessorKey: 'timestamp',
      className: 'font-mono text-xs text-muted-foreground whitespace-nowrap',
    },
    {
      header: 'Actor Role',
      cell: (item) => <RoleBadge role={item.actorRole} />,
    },
    {
      header: 'Event Action',
      cell: (item) => (
        <span className="font-mono text-xs font-semibold text-foreground">{item.action}</span>
      ),
    },
    {
      header: 'Target Entity',
      cell: (item) => (
        <span className="text-xs text-muted-foreground">
          {item.entityType}
          {item.entityId ? ` (${item.entityId.slice(0, 8)}…)` : ''}
        </span>
      ),
    },
    {
      header: 'Origin IP',
      cell: (item) => (
        <span className="font-mono text-xs text-muted-foreground">
          {item.ipAddress || '—'}
        </span>
      ),
    },
  ];

  return (
    <AppShell
      userRole={profile.role}
      userName={profile.full_name}
      stationName={profile.jurisdiction}
    >
      <PageContainer
        title="Security & System Audit Ledger"
        description="Immutable event trail for court admissibility. All actions are cryptographically sealed."
        actions={
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" />
            <span>Export Signed Log</span>
          </Button>
        }
      >
        <Breadcrumbs
          items={[
            { label: 'Administrative Console', href: '/admin' },
            { label: 'Audit Ledger' },
          ]}
        />

        <div className="rounded-lg border bg-card p-3.5 flex items-center gap-3 text-xs text-muted-foreground">
          <Lock className="w-5 h-5 text-primary shrink-0" />
          <div>
            <strong className="text-foreground">Append-Only Immutability Guaranteed:</strong> UPDATE
            and DELETE operations are disabled at the database RLS layer. Records cannot be altered
            or purged by any officer role. Showing latest {PAGE_SIZE} entries.
          </div>
        </div>

        {tableRows.length === 0 ? (
          <div className="rounded-lg border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            No audit log entries found. Actions will be recorded here as the system is used.
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={tableRows}
            keyExtractor={(item) => item.id}
          />
        )}
      </PageContainer>
    </AppShell>
  );
}
