import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { DataTable, type Column } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Filter, Search, ArrowRight } from 'lucide-react';
import { requireReviewer } from '@/lib/auth/helpers';
import type { InspectionStatus } from '@/types/database.types';

interface QueueItem {
  id: string;
  inspectionNumber: string;
  brand: string;
  product: string;
  inspectorName: string;
  flagReason: string;
  date: string;
  status: InspectionStatus;
}

export default async function ReviewerQueuePage() {
  const profile = await requireReviewer({ redirectTo: '/login' });

  // Demonstration queue items for shell review
  const queueData: QueueItem[] = [
    {
      id: 'demo-insp-003',
      inspectionNumber: 'INSP-2026-0889',
      brand: 'Himalayan Harvest',
      product: 'Organic Green Tea (100g)',
      inspectorName: 'Demo Inspector Ravi Kumar',
      flagReason: 'Low OCR confidence on Consumer Care Contact',
      date: '06 Sep 2026, 14:15',
      status: 'REVIEW',
    },
    {
      id: 'demo-insp-005',
      inspectionNumber: 'INSP-2026-0887',
      brand: 'AgroGold',
      product: 'Basmati Rice (5kg)',
      inspectorName: 'Demo Inspector Ravi Kumar',
      flagReason: 'Character height boundary condition',
      date: '06 Sep 2026, 12:40',
      status: 'REVIEW',
    },
    {
      id: 'demo-insp-006',
      inspectionNumber: 'INSP-2026-0884',
      brand: 'Shree Dairy',
      product: 'Pure Ghee (1L Tin)',
      inspectorName: 'Officer S. Patil',
      flagReason: 'Ambiguous manufacturer address formatting',
      date: '05 Sep 2026, 17:10',
      status: 'REVIEW',
    },
  ];

  const columns: Column<QueueItem>[] = [
    {
      header: 'Inspection Ref',
      accessorKey: 'inspectionNumber',
      className: 'font-mono text-xs font-semibold',
    },
    {
      header: 'Commodity',
      cell: (item) => (
        <div>
          <div className="font-semibold text-foreground">{item.brand}</div>
          <div className="text-xs text-muted-foreground">{item.product}</div>
        </div>
      ),
    },
    {
      header: 'Flag Reason',
      cell: (item) => (
        <span className="text-xs text-compliance-review-text font-medium bg-compliance-review-bg/50 px-2 py-0.5 rounded">
          {item.flagReason}
        </span>
      ),
    },
    {
      header: 'Inspector',
      accessorKey: 'inspectorName',
      className: 'text-xs text-muted-foreground',
    },
    {
      header: 'Submitted',
      accessorKey: 'date',
      className: 'text-xs text-muted-foreground',
    },
    {
      header: 'Status',
      cell: (item) => <StatusBadge status={item.status} />,
    },
    {
      header: 'Action',
      cell: (item) => (
        <Link href={`/reviewer/audit/${item.id}`}>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
            <span>Audit</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
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
        title="Inspection Review Queue"
        description="Priority queue of field inspections requiring manual verification or statutory adjudication."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1 text-xs">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter Flags</span>
            </Button>
          </div>
        }
      >
        <Breadcrumbs
          items={[
            { label: 'Reviewer Portal', href: '/reviewer' },
            { label: 'Review Queue' },
          ]}
        />

        {/* Filter bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search queue by product, brand, flag reason, or inspection number..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-md border bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {/* Desktop Data Table & Mobile Responsive Representation */}
        <DataTable
          columns={columns}
          data={queueData}
          keyExtractor={(item) => item.id}
          emptyMessage="No pending inspections in the review queue."
        />
      </PageContainer>
    </AppShell>
  );
}
