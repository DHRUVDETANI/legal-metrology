import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { DataTable, type Column } from '@/components/ui/data-table';
import { RoleBadge } from '@/components/ui/role-badge';
import { Button } from '@/components/ui/button';
import { UserPlus, Search } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/helpers';
import type { UserRole } from '@/types/database.types';

interface DirectoryUser {
  id: string;
  fullName: string;
  role: UserRole;
  badgeNumber: string;
  jurisdiction: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export default async function AdminUsersPage() {
  const profile = await requireAdmin({ redirectTo: '/login' });

  // Standard demo users matching seed.sql
  const demoUsers: DirectoryUser[] = [
    {
      id: '00000001-demo-demo-demo-000000000001',
      fullName: 'Demo Inspector Ravi Kumar',
      role: 'inspector',
      badgeNumber: 'MH-INS-2024-001',
      jurisdiction: 'Maharashtra — Pune District',
      status: 'ACTIVE',
    },
    {
      id: '00000002-demo-demo-demo-000000000002',
      fullName: 'Demo Reviewer Priya Sharma',
      role: 'reviewer',
      badgeNumber: 'MH-REV-2024-001',
      jurisdiction: 'Maharashtra — State Level',
      status: 'ACTIVE',
    },
    {
      id: '00000003-demo-demo-demo-000000000003',
      fullName: 'Demo Admin Ajay Patel',
      role: 'admin',
      badgeNumber: 'NAT-ADM-2024-001',
      jurisdiction: 'National — Central Authority',
      status: 'ACTIVE',
    },
  ];

  const columns: Column<DirectoryUser>[] = [
    {
      header: 'Officer Name',
      cell: (item) => (
        <div>
          <div className="font-semibold text-foreground text-sm">{item.fullName}</div>
          <div className="text-[11px] font-mono text-muted-foreground">{item.badgeNumber}</div>
        </div>
      ),
    },
    {
      header: 'Role',
      cell: (item) => <RoleBadge role={item.role} />,
    },
    {
      header: 'Jurisdiction',
      accessorKey: 'jurisdiction',
      className: 'text-xs text-muted-foreground',
    },
    {
      header: 'Status',
      cell: (item) => (
        <span className="text-xs font-semibold text-compliance-pass-text bg-compliance-pass-bg/50 px-2 py-0.5 rounded">
          {item.status}
        </span>
      ),
    },
    {
      header: 'Action',
      cell: () => (
        <Button size="sm" variant="ghost" className="h-8 text-xs">
          Manage
        </Button>
      ),
      className: 'text-right',
    },
  ];

  return (
    <AppShell
      userRole={profile.role}
      userName={profile.full_name}
      stationName={profile.jurisdiction}
    >
      <PageContainer
        title="User & Officer Directory"
        description="Manage officer accounts, station jurisdictions, and cryptographic role assignments."
        actions={
          <Button size="sm" className="gap-1.5 font-semibold shadow-sm">
            <UserPlus className="w-4 h-4" />
            <span>Add Field Officer</span>
          </Button>
        }
      >
        <Breadcrumbs
          items={[
            { label: 'Administrative Console', href: '/admin' },
            { label: 'User Directory' },
          ]}
        />

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search officers by name, badge number, or district..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-md border bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <DataTable
          columns={columns}
          data={demoUsers}
          keyExtractor={(item) => item.id}
        />
      </PageContainer>
    </AppShell>
  );
}
