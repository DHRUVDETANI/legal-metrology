import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, FileText } from 'lucide-react';
import { requireReviewer } from '@/lib/auth/helpers';

export default async function ReviewerAuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireReviewer({ redirectTo: '/login' });
  const { id } = await params;

  return (
    <AppShell
      userRole={profile.role}
      userName={profile.full_name}
      stationName={profile.jurisdiction}
    >
      <PageContainer
        title="Inspection Audit & Adjudication"
        description={`Audit case file: ${id}. Reconstruct evidence, verify OCR findings, and log official verdict.`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-compliance-pass-text border-compliance-pass-border">
              <CheckCircle2 className="w-4 h-4" />
              <span>Adjudicate: PASS</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-compliance-fail-text border-compliance-fail-border">
              <XCircle className="w-4 h-4" />
              <span>Adjudicate: FAIL</span>
            </Button>
          </div>
        }
      >
        <Breadcrumbs
          items={[
            { label: 'Reviewer Portal', href: '/reviewer' },
            { label: 'Review Queue', href: '/reviewer/queue' },
            { label: `Audit Case: ${id}` },
          ]}
        />

        {/* Case Banner */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-muted-foreground">INSP-2026-0889</span>
                <StatusBadge status="REVIEW" />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                Himalayan Harvest — Organic Green Tea (100g)
              </h2>
            </div>
            <div className="text-xs text-muted-foreground">
              Flag: Low OCR confidence on Consumer Care Contact
            </div>
          </div>
        </div>

        {/* Side-by-side Evidence vs OCR Review */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
          <Card className="lg:col-span-6 border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Photographic Packaging Evidence</span>
                <Badge variant="outline" className="text-[10px]">High-Res Bounding Box</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="aspect-[4/3] rounded-lg bg-muted/30 border border-dashed flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                <FileText className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-xs font-semibold">Image Viewport (Pinch-to-Zoom Ready)</span>
                <span className="text-[11px] text-muted-foreground mt-1">
                  Box: [x: 120, y: 450, w: 600, h: 80]
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-6 border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Statutory Declaration Details</span>
                <Badge variant="review" className="text-[10px]">Confidence: 58%</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3 text-xs">
              <div className="rounded-md border p-3 bg-muted/20 space-y-1">
                <span className="text-muted-foreground block text-[11px]">Extracted Text (OCR Raw):</span>
                <span className="font-mono font-semibold text-foreground">
                  customercare@himaIayan-harvest.in
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Reviewer Correction / Annotation:
                </label>
                <input
                  type="text"
                  defaultValue="customercare@himalayan-harvest.in"
                  className="w-full px-3 py-2 text-xs rounded-md border bg-background"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Official Adjudication Remarks:
                </label>
                <textarea
                  rows={3}
                  placeholder="Record reason for verdict confirmation or override..."
                  className="w-full px-3 py-2 text-xs rounded-md border bg-background"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button size="sm" className="flex-1 font-semibold">
                  Save & Confirm Adjudication
                </Button>
                <Link href="/reviewer/queue">
                  <Button variant="ghost" size="sm">
                    Back
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </AppShell>
  );
}
