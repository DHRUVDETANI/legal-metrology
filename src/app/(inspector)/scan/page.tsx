import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { MobileInspectionCard } from '@/components/shell/mobile-inspection-card';
import { Button } from '@/components/ui/button';
import { Camera, PlusCircle } from 'lucide-react';
import { requireInspector } from '@/lib/auth/helpers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Inspection } from '@/types/database.types';

export default async function ScanPage() {
  const profile = await requireInspector({ redirectTo: '/login' });
  const supabase = await createServerSupabaseClient();

  // Fetch real inspections from the database for this inspector
  const { data: realInspections } = (await (supabase.from('inspections') as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        order: (col: string, opts: { ascending: boolean }) => {
          limit: (n: number) => Promise<{
            data:
              | (Inspection & {
                  products?: { brand_name: string; product_name: string } | null;
                })[]
              | null;
          }>;
        };
      };
    };
  })
    .select('*, products(brand_name, product_name)')
    .eq('inspector_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(10));

  // Formatted inspection cards list
  const recentInspections =
    realInspections && realInspections.length > 0
      ? realInspections.map((insp) => ({
          id: insp.id,
          inspectionNumber: insp.inspection_number,
          brandName: insp.products?.brand_name || 'Standard Commodity',
          productName: insp.products?.product_name || 'Packaged Commodity',
          status: insp.status as 'PASS' | 'FAIL' | 'REVIEW',
          locationName: insp.location_name,
          date: new Date(insp.created_at).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          violationsCount: insp.total_violations,
          href: `/scan/${insp.id}/extract`,
        }))
      : [
          {
            id: 'demo-insp-001',
            inspectionNumber: 'INSP-2026-0891',
            brandName: 'Sunrise Brand',
            productName: 'Whole Wheat Biscuits (200g)',
            status: 'PASS' as const,
            locationName: 'APMC Market, Yard 4',
            date: 'Today, 14:30',
            violationsCount: 0,
            href: '/scan/demo-insp-001/result',
          },
          {
            id: 'demo-insp-002',
            inspectionNumber: 'INSP-2026-0890',
            brandName: 'Kaveri Pure',
            productName: 'Mustard Oil (1L Pet Bottle)',
            status: 'FAIL' as const,
            locationName: 'Retail Bazaar, Stall 12',
            date: 'Today, 11:15',
            violationsCount: 2,
            href: '/scan/demo-insp-002/result',
          },
          {
            id: 'demo-insp-003',
            inspectionNumber: 'INSP-2026-0889',
            brandName: 'Himalayan Harvest',
            productName: 'Organic Green Tea (100g)',
            status: 'REVIEW' as const,
            locationName: 'Supermarket Central, Pune',
            date: 'Yesterday, 16:45',
            violationsCount: 1,
            href: '/scan/demo-insp-003/result',
          },
        ];

  return (
    <AppShell
      userRole={profile.role}
      userName={profile.full_name}
      stationName={profile.jurisdiction}
    >
      <PageContainer
        title="Field Inspection Terminal"
        description="Inspect packaged commodities, capture label evidence, and verify statutory declarations."
        actions={
          <Link href="/scan/new">
            <Button size="default" className="gap-2 font-semibold shadow-sm w-full sm:w-auto">
              <PlusCircle className="w-4 h-4" />
              <span>New Inspection</span>
            </Button>
          </Link>
        }
      >
        <Breadcrumbs items={[{ label: 'Field Inspections' }]} />

        {/* Primary Field Capture Banner (Mobile-Optimized) */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Active Field Terminal
              </span>
              <h2 className="text-lg font-bold text-foreground">
                Commodity Label Inspection
              </h2>
              <p className="text-xs text-muted-foreground max-w-lg">
                Position commodity package in the viewfinder to verify mandatory Legal Metrology declarations: MRP, Net Quantity, Mfg Date, and Manufacturer details.
              </p>
            </div>
          </div>

          <Link href="/scan/new" className="block">
            <Button size="lg" className="w-full gap-2 text-base font-bold shadow-md">
              <Camera className="w-5 h-5" />
              <span>Start Label Scan (Camera)</span>
            </Button>
          </Link>
        </div>

        {/* Recent Inspections List */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Field Inspections
            </h3>
            <span className="text-xs text-muted-foreground font-mono">
              Station: {profile.jurisdiction}
            </span>
          </div>

          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {recentInspections.map((insp) => (
              <MobileInspectionCard key={insp.id} {...insp} />
            ))}
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
