import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { MobileInspectionCard } from '@/components/shell/mobile-inspection-card';
import { Button } from '@/components/ui/button';
import { Search, Filter, Download, Calendar } from 'lucide-react';
import { requireUser, getUserProfile } from '@/lib/auth/helpers';

export default async function HistoryPage() {
  await requireUser({ redirectTo: '/login' });
  const profile = await getUserProfile();

  // Demonstration historical items for shell display
  const demoHistory = [
    {
      id: 'demo-insp-001',
      inspectionNumber: 'INSP-2026-0891',
      brandName: 'Sunrise Brand',
      productName: 'Whole Wheat Biscuits (200g)',
      status: 'PASS' as const,
      locationName: 'APMC Market, Yard 4',
      date: '06 Sep 2026, 14:30',
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
      date: '06 Sep 2026, 11:15',
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
      date: '05 Sep 2026, 16:45',
      violationsCount: 1,
      href: '/scan/demo-insp-003/result',
    },
    {
      id: 'demo-insp-004',
      inspectionNumber: 'INSP-2026-0888',
      brandName: 'Golden Valley',
      productName: 'Refined Sunflower Oil (5L)',
      status: 'PASS' as const,
      locationName: 'Wholesale Depot 9',
      date: '05 Sep 2026, 10:20',
      violationsCount: 0,
      href: '/scan/demo-insp-001/result',
    },
  ];

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

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search by commodity name, inspection number, or barcode..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-md border bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter Status</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5" />
              <span>Date Range</span>
            </Button>
          </div>
        </div>

        {/* History Cards Grid */}
        <div className="space-y-3 pt-1">
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {demoHistory.map((item) => (
              <MobileInspectionCard key={item.id} {...item} />
            ))}
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
