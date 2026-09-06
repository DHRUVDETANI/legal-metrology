// ============================================================================
// src/app/history/page.tsx
// SIH PS26034 — Inspection History & Records
//
// Fetches real inspections from the database. Inspectors see their own;
// reviewers and admins see all (enforced by Supabase RLS).
// ============================================================================

import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { MobileInspectionCard } from '@/components/shell/mobile-inspection-card';
import { Button } from '@/components/ui/button';
import { Download, Calendar } from 'lucide-react';
import { requireUser, getUserProfile } from '@/lib/auth/helpers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Inspection, InspectionStatus } from '@/types/database.types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function HistoryPage() {
  await requireUser({ redirectTo: '/login' });
  const profile = await getUserProfile();
  const supabase = await createServerSupabaseClient();

  // RLS enforces data isolation: inspectors see own, reviewer/admin sees all
  const { data: inspections } = await (
    supabase.from('inspections') as unknown as {
      select: (cols: string) => {
        order: (col: string, opts: { ascending: boolean }) => Promise<{
          data: (Inspection & { products?: { brand_name?: string; product_name?: string } | null })[] | null;
        }>;
      };
    }
  )
    .select('*, products(brand_name, product_name)')
    .order('created_at', { ascending: false });

  const historyItems = (inspections || []).map((insp) => ({
    id: insp.id,
    inspectionNumber: insp.inspection_number,
    brandName: insp.products?.brand_name || insp.location_name,
    productName: insp.products?.product_name || `Inspection at ${insp.location_name}`,
    status: insp.status as InspectionStatus,
    locationName: insp.location_name,
    date: formatDate(insp.created_at),
    violationsCount: insp.total_violations,
    href: `/scan/${insp.id}/result`,
  }));

  return (
    <AppShell
      userRole={profile?.role || 'inspector'}
      userName={profile?.full_name || 'Field Officer'}
      stationName={profile?.jurisdiction || 'Field Station'}
    >
      <PageContainer
        title="Inspection History & Records"
        description="Searchable archive of field inspections, chain-of-custody proofs, and evidence reports."
        actions={
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Download className="w-4 h-4" />
            <span>Export Archive</span>
          </Button>
        }
      >
        <Breadcrumbs items={[{ label: 'Inspection History' }]} />

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5" />
              <span>Date Range</span>
            </Button>
          </div>
        </div>

        {/* History Cards */}
        {historyItems.length === 0 ? (
          <div className="rounded-lg border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            No inspection history found.
            {profile?.role === 'inspector' && (
              <> Start by <a href="/scan/new" className="text-primary font-medium hover:underline ml-1">scanning a product</a>.</>
            )}
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {historyItems.map((item) => (
                <MobileInspectionCard key={item.id} {...item} />
              ))}
            </div>
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
}
