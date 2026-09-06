import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { ScanWizard } from '@/components/scanner/scan-wizard';
import { requireInspector } from '@/lib/auth/helpers';

export default async function NewScanPage() {
  const profile = await requireInspector({ redirectTo: '/login' });

  return (
    <AppShell
      userRole={profile.role}
      userName={profile.full_name}
      stationName={profile.jurisdiction}
    >
      <PageContainer
        title="Capture Commodity Label"
        description="Capture or upload high-resolution packaging photo for legal metrology inspection."
      >
        <Breadcrumbs
          items={[
            { label: 'Field Inspections', href: '/scan' },
            { label: 'New Inspection' },
          ]}
        />

        <ScanWizard
          inspectorName={profile.full_name}
          inspectorJurisdiction={profile.jurisdiction}
        />
      </PageContainer>
    </AppShell>
  );
}
