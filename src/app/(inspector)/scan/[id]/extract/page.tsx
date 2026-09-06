import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle2, FileText, Scale } from 'lucide-react';
import { requireInspector } from '@/lib/auth/helpers';

export default async function ExtractReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireInspector({ redirectTo: '/login' });
  const { id } = await params;

  // Visual demonstration declarations for UI shell review
  const demoDeclarations = [
    { field: 'MRP (Maximum Retail Price)', observed: 'Rs. 50.00 (incl. of all taxes)', confidence: '98%', status: 'CONFIRMED' },
    { field: 'Net Quantity', observed: '200 g', confidence: '96%', status: 'CONFIRMED' },
    { field: 'Date of Manufacture', observed: '08/2026', confidence: '92%', status: 'CONFIRMED' },
    { field: 'Manufacturer Address', observed: 'Sunrise Foods Pvt. Ltd., Pune', confidence: '89%', status: 'CONFIRMED' },
    { field: 'Consumer Care Contact', observed: 'customercare@sunrisefoods.in', confidence: '91%', status: 'CONFIRMED' },
  ];

  return (
    <AppShell
      userRole={profile.role}
      userName={profile.full_name}
      stationName={profile.jurisdiction}
    >
      <PageContainer
        title="Declaration Extraction Review"
        description="Verify OCR-extracted statutory declarations before invoking compliance engine."
        actions={
          <Link href={`/scan/${id}/result`}>
            <Button className="gap-2 font-bold shadow-sm">
              <span>Run Compliance Check</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        }
      >
        <Breadcrumbs
          items={[
            { label: 'Field Inspections', href: '/scan' },
            { label: 'Inspection', href: `/scan/${id}/extract` },
            { label: 'Declaration Extraction' },
          ]}
        />

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
          {/* Label Evidence Preview Placeholder */}
          <Card className="lg:col-span-5 border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Packaging Label Evidence</span>
                <Badge variant="outline" className="text-[10px]">Primary Panel</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="aspect-[4/3] rounded-lg bg-muted/40 border border-dashed flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                <FileText className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-xs font-semibold">Captured Packaging Image</span>
                <span className="text-[11px] text-muted-foreground mt-1">
                  1920 × 1080 px • Laplacian Score: 184.2 (Acceptable)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Extracted Statutory Fields List */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Extracted Declarations ({demoDeclarations.length})
              </h3>
              <span className="text-xs text-muted-foreground">
                Touch field to inspect OCR confidence
              </span>
            </div>

            <div className="space-y-2">
              {demoDeclarations.map((dec, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border bg-card p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm"
                >
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium block">
                      {dec.field}
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {dec.observed}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Badge variant="pass" className="text-[11px]">
                      {dec.confidence} OCR
                    </Badge>
                    <CheckCircle2 className="w-4 h-4 text-compliance-pass-text" />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Link href={`/scan/${id}/result`} className="block">
                <Button size="lg" className="w-full gap-2 text-base font-bold shadow-md">
                  <Scale className="w-5 h-5" />
                  <span>Evaluate Compliance Engine</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
