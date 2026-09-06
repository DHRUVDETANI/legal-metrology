import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { DataTable, type Column } from '@/components/ui/data-table';
import { RoleBadge } from '@/components/ui/role-badge';
import { Button } from '@/components/ui/button';
import { Download, Lock } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/helpers';
import type { UserRole } from '@/types/database.types';

interface AuditRecord {
  id: string;
  timestamp: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress: string;
}

export default async function AdminAuditLogsPage() {
  const profile = await requireAdmin({ redirectTo: '/login' });

  // Demonstration audit ledger entries reflecting append-only security logs
  const demoAuditLogs: AuditRecord[] = [
    {
      id: 'log-001',
      timestamp: '06 Sep 2026, 18:05:32',
      actorRole: 'admin',
      action: 'LOGIN_SUCCESS',
      entityType: 'auth_session',
      entityId: 'usr-admin-001',
      ipAddress: '192.168.1.100',
    },
    {
      id: 'log-002',
      timestamp: '06 Sep 2026, 14:31:02',
      actorRole: 'inspector',
      action: 'INSPECTION_SUBMITTED',
      entityType: 'inspections',
      entityId: 'INSP-2026-0891',
      ipAddress: '10.24.8.42',
    },
    {
      id: 'log-003',
      timestamp: '06 Sep 2026, 11:16:15',
      actorRole: 'inspector',
      action: 'VIOLATION_RECORDED',
      entityType: 'violations',
      entityId: 'VIO-2026-012',
      ipAddress: '10.24.8.42',
    },
    {
      id: 'log-004',
      timestamp: '05 Sep 2026, 16:46:00',
      actorRole: 'reviewer',
      action: 'REVIEW_ANNOTATION_ADDED',
      entityType: 'declarations',
      entityId: 'DEC-0982',
      ipAddress: '172.16.0.15',
    },
  ];

  const columns: Column<AuditRecord>[] = [
    {
      header: 'Timestamp',
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
        <span className="font-mono text-xs font-semibold text-foreground">
          {item.action}
        </span>
      ),
    },
    {
      header: 'Target Entity',
      cell: (item) => (
        <span className="text-xs text-muted-foreground">
          {item.entityType} ({item.entityId})
        </span>
      ),
    },
    {
      header: 'Origin IP',
      accessorKey: 'ipAddress',
      className: 'font-mono text-xs text-muted-foreground',
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
            <strong className="text-foreground">Append-Only Immutability Guaranteed:</strong> UPDATE and DELETE operations are disabled at the database RLS layer. Records cannot be altered or purged by any officer role.
          </div>
        </div>

        <DataTable
          columns={columns}
          data={demoAuditLogs}
          keyExtractor={(item) => item.id}
        />
      </PageContainer>
    </AppShell>
  );
}
