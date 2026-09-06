import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Download, ArrowLeft, ShieldCheck, FileCheck, Printer } from 'lucide-react';
import { requireInspector } from '@/lib/auth/helpers';

export default async function ReportViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireInspector({ redirectTo: '/login' });
  const { id } = await params;

  return (
    <AppShell
      userRole={profile.role}
      userName={profile.full_name}
      stationName={profile.jurisdiction}
    >
      <PageContainer
        title="Statutory Inspection Report"
        description="Court-admissible Legal Metrology Packaged Commodities inspection summary."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </Button>
            <Button size="sm" className="gap-1.5 font-semibold shadow-sm">
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </Button>
          </div>
        }
      >
        <Breadcrumbs
          items={[
            { label: 'Field Inspections', href: '/scan' },
            { label: 'Inspection', href: `/scan/${id}/result` },
            { label: 'Inspection Report' },
          ]}
        />

        {/* PDF Document Preview Representation */}
        <Card className="max-w-3xl mx-auto border shadow-sm bg-card">
          <CardHeader className="border-b p-6 text-center space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-1">
              <FileCheck className="w-6 h-6" />
            </div>
            <CardTitle className="text-lg sm:text-xl font-bold uppercase tracking-tight">
              Certificate of Legal Metrology Inspection
            </CardTitle>
            <p className="text-xs text-muted-foreground font-mono">
              Report Reference No: REP-2026-0891 • Inspection ID: {id}
            </p>
          </CardHeader>

          <CardContent className="p-6 space-y-6 text-xs sm:text-sm">
            {/* Meta Table */}
            <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-muted/20 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px] uppercase">Officer Name</span>
                <span className="font-semibold text-foreground">{profile.full_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] uppercase">Jurisdiction</span>
                <span className="font-semibold text-foreground">{profile.jurisdiction}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] uppercase">Inspection Date</span>
                <span className="font-semibold text-foreground">06 September 2026</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] uppercase">Overall Compliance</span>
                <span className="inline-block mt-0.5">
                  <StatusBadge status="PASS" />
                </span>
              </div>
            </div>

            {/* Product Summary */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
                Commodity Particulars
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div><strong>Brand Name:</strong> Sunrise Brand</div>
                <div><strong>Product:</strong> Whole Wheat Biscuits</div>
                <div><strong>Declared Net Quantity:</strong> 200 g</div>
                <div><strong>Declared MRP:</strong> Rs. 50.00 (incl. of all taxes)</div>
              </div>
            </div>

            {/* Cryptographic Proof Notice */}
            <div className="rounded-md border p-3 bg-muted/40 text-[11px] text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>Tamper-Evident SHA-256 Verification</span>
              </div>
              <p className="font-mono break-all text-[10px]">
                e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="max-w-3xl mx-auto flex items-center justify-between pt-2">
          <Link href={`/scan/${id}/result`}>
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Findings</span>
            </Button>
          </Link>
          <Link href="/scan">
            <Button size="sm" className="text-xs">
              Finish Inspection
            </Button>
          </Link>
        </div>
      </PageContainer>
    </AppShell>
  );
}
