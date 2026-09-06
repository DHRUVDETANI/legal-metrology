// ============================================================================
// src/app/admin/rules/page.tsx
// SIH PS26034 — Regulatory Rules Configuration (Safe Read-Only View)
//
// Displays the 6 canonical statutory rules preserved from the Supabase DB schema.
// Enforces that existing rules and rule_versions remain immutable.
// ============================================================================

import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/helpers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PRESERVED_DEMO_RULES } from '@/lib/compliance/registry';
import type { SeverityLevel } from '@/types/database.types';

interface RuleItem {
  ruleCode: string;
  title: string;
  description: string;
  targetField: string;
  severity: SeverityLevel;
  enabled: boolean;
  version: string;
  operator: string;
}

export default async function AdminRulesPage() {
  const profile = await requireAdmin({ redirectTo: '/login' });
  const supabase = await createServerSupabaseClient();

  // Query database for rules, falling back gracefully to canonical PRESERVED_DEMO_RULES
  const { data: dbRules } = await (
    supabase.from('rules') as unknown as {
      select: (cols: string) => {
        order: (col: string, opts: { ascending: boolean }) => Promise<{
          data:
            | {
                id: string;
                rule_code: string;
                title: string;
                description: string;
                target_field: string;
                severity: SeverityLevel;
                enabled: boolean;
                current_version: string;
                condition_operator: string;
              }[]
            | null;
        }>;
      };
    }
  )
    .select('*')
    .order('rule_code', { ascending: true });

  const rules: RuleItem[] =
    dbRules && dbRules.length > 0
      ? dbRules.map((r) => ({
          ruleCode: r.rule_code,
          title: r.title,
          description: r.description,
          targetField: r.target_field,
          severity: r.severity,
          enabled: r.enabled,
          version: r.current_version,
          operator: r.condition_operator,
        }))
      : PRESERVED_DEMO_RULES.map((r) => ({
          ruleCode: r.ruleCode,
          title: r.title,
          description: r.description,
          targetField: r.targetField,
          severity: r.severity,
          enabled: r.enabled,
          version: r.currentVersion,
          operator: r.conditionOperator,
        }));

  const columns: Column<RuleItem>[] = [
    {
      header: 'Rule Code',
      accessorKey: 'ruleCode',
      className: 'font-mono text-xs font-bold text-foreground whitespace-nowrap',
    },
    {
      header: 'Statutory Rule & Description',
      cell: (item) => (
        <div className="space-y-0.5 max-w-md">
          <div className="font-semibold text-foreground text-xs sm:text-sm">{item.title}</div>
          <div className="text-[11px] text-muted-foreground line-clamp-2">{item.description}</div>
          <div className="text-[10px] text-muted-foreground font-mono pt-0.5">
            Field: <span className="text-foreground font-medium">{item.targetField}</span> · Logic: <span className="text-foreground font-medium">{item.operator}</span>
          </div>
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
      header: 'Ruleset Version',
      accessorKey: 'version',
      className: 'font-mono text-xs text-muted-foreground whitespace-nowrap',
    },
    {
      header: 'Status',
      cell: (item) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-compliance-pass-text">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {item.enabled ? 'Active' : 'Disabled'}
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
        title="Regulatory Rules Registry"
        description="Master Legal Metrology statutory rulesets. Versioned and evaluated deterministically by the compliance engine."
      >
        <Breadcrumbs
          items={[
            { label: 'Administrative Console', href: '/admin' },
            { label: 'Rules Configuration' },
          ]}
        />

        {/* Legal Metrology Demarcation Banner */}
        <div className="rounded-lg border border-amber-300/40 bg-amber-50/50 dark:bg-amber-950/20 p-4 text-xs space-y-1.5 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Statutory Verification Notice [DEMO / TEST RULES]</span>
          </div>
          <p>
            The 6 rules below represent structural demo rules modeled on the Legal Metrology (Packaged Commodities) Rules, 2011.
            In compliance with project safety protocols, canonical rules are immutable during standard inspection sessions.
            All PASS/FAIL verdicts are evaluated deterministically without LLM discretion.
          </p>
        </div>

        <DataTable
          columns={columns}
          data={rules}
          keyExtractor={(item) => item.ruleCode}
        />
      </PageContainer>
    </AppShell>
  );
}
