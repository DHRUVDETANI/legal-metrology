import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle2 } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/helpers';
import type { SeverityLevel } from '@/types/database.types';

interface RuleItem {
  ruleCode: string;
  title: string;
  targetField: string;
  severity: SeverityLevel;
  enabled: boolean;
  version: string;
}

export default async function AdminRulesPage() {
  const profile = await requireAdmin({ redirectTo: '/login' });

  // Actual 6 master rules preserved from Supabase DB schema
  const preservedRules: RuleItem[] = [
    {
      ruleCode: 'DEMO-LM-CONSUMER-CARE-001',
      title: '[DEMO] Consumer Care Contact Required',
      targetField: 'consumer_care',
      severity: 'MAJOR',
      enabled: true,
      version: 'v2024.1',
    },
    {
      ruleCode: 'DEMO-LM-FONT-HEIGHT-001',
      title: '[DEMO] Minimum Font Height Requirement',
      targetField: 'font_height',
      severity: 'MAJOR',
      enabled: true,
      version: 'v2024.1',
    },
    {
      ruleCode: 'DEMO-LM-MANUFACTURER-001',
      title: '[DEMO] Manufacturer Information Required',
      targetField: 'manufacturer',
      severity: 'CRITICAL',
      enabled: true,
      version: 'v2024.1',
    },
    {
      ruleCode: 'DEMO-LM-MFG-DATE-001',
      title: '[DEMO] Manufacturing Date Required',
      targetField: 'mfg_date',
      severity: 'MAJOR',
      enabled: true,
      version: 'v2024.1',
    },
    {
      ruleCode: 'DEMO-LM-MRP-001',
      title: '[DEMO] MRP Mandatory Declaration',
      targetField: 'mrp',
      severity: 'CRITICAL',
      enabled: true,
      version: 'v2024.1',
    },
    {
      ruleCode: 'DEMO-LM-NET-QTY-001',
      title: '[DEMO] Net Quantity with SI Unit',
      targetField: 'net_quantity',
      severity: 'CRITICAL',
      enabled: true,
      version: 'v2024.1',
    },
  ];

  const columns: Column<RuleItem>[] = [
    {
      header: 'Rule Code',
      accessorKey: 'ruleCode',
      className: 'font-mono text-xs font-bold text-foreground',
    },
    {
      header: 'Title / Description',
      cell: (item) => (
        <div>
          <div className="font-semibold text-foreground text-xs sm:text-sm">{item.title}</div>
          <div className="text-[11px] text-muted-foreground font-mono">Target: {item.targetField}</div>
        </div>
      ),
    },
    {
      header: 'Severity',
      cell: (item) => (
        <Badge
          variant={item.severity === 'CRITICAL' ? 'destructive' : 'default'}
          className="text-[10px]"
        >
          {item.severity}
        </Badge>
      ),
    },
    {
      header: 'Version',
      accessorKey: 'version',
      className: 'font-mono text-xs text-muted-foreground',
    },
    {
      header: 'Status',
      cell: () => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-compliance-pass-text">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Active
        </span>
      ),
    },
    {
      header: 'Action',
      cell: () => (
        <Button size="sm" variant="ghost" className="h-8 text-xs">
          Edit Rule
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
        title="Regulatory Rules Configuration"
        description="Master Legal Metrology statutory rulesets. Versioned and enforced by the deterministic compliance engine."
        actions={
          <Button size="sm" className="gap-1.5 font-semibold shadow-sm">
            <Plus className="w-4 h-4" />
            <span>Create New Rule</span>
          </Button>
        }
      >
        <Breadcrumbs
          items={[
            { label: 'Administrative Console', href: '/admin' },
            { label: 'Rules Configuration' },
          ]}
        />

        <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
          <strong>Deterministic Compliance Authority:</strong> Rule configurations govern automated PASS/FAIL decisions directly. All modifications are logged to the immutable audit trail.
        </div>

        <DataTable
          columns={columns}
          data={preservedRules}
          keyExtractor={(item) => item.ruleCode}
        />
      </PageContainer>
    </AppShell>
  );
}
