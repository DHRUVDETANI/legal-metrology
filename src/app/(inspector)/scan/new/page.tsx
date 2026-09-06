import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Upload, ShieldCheck } from 'lucide-react';
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
        description="Align commodity label inside viewfinder under adequate lighting."
      >
        <Breadcrumbs
          items={[
            { label: 'Field Inspections', href: '/scan' },
            { label: 'New Inspection' },
          ]}
        />

        {/* Viewfinder Guidance Box (Touch-Optimized) */}
        <div className="relative aspect-[4/3] w-full max-w-xl mx-auto rounded-2xl border-2 border-dashed border-primary/50 bg-muted/30 overflow-hidden flex flex-col items-center justify-center p-6 text-center shadow-inner">
          <div className="absolute inset-4 border border-primary/30 rounded-xl pointer-events-none" />

          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-3 shadow-sm">
            <Camera className="w-8 h-8" />
          </div>

          <h3 className="text-base font-semibold text-foreground">
            Camera Viewfinder Ready
          </h3>
          <p className="text-xs text-muted-foreground max-w-xs mt-1">
            Ensure MRP, Net Quantity, and Mfg Date are clearly visible without reflective glare.
          </p>

          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            <span className="text-[11px] bg-background/80 border px-2.5 py-1 rounded-full font-medium text-muted-foreground">
              Primary Display Panel
            </span>
            <span className="text-[11px] bg-background/80 border px-2.5 py-1 rounded-full font-medium text-muted-foreground">
              Min 1080p Target
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="max-w-xl mx-auto space-y-3 pt-2">
          {/* Link leads to simulated extraction flow step for demonstration */}
          <Link href="/scan/demo-insp-001/extract" className="block">
            <Button size="lg" className="w-full gap-2 text-base font-bold shadow-md">
              <Camera className="w-5 h-5" />
              <span>Capture Label Photo</span>
            </Button>
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="gap-2 h-11">
              <Upload className="w-4 h-4" />
              <span>Upload Gallery Image</span>
            </Button>

            <Link href="/scan">
              <Button variant="ghost" className="w-full h-11">
                Cancel
              </Button>
            </Link>
          </div>
        </div>

        {/* Field Instructions */}
        <Card className="max-w-xl mx-auto border bg-card/60">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Field Inspection Standards
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground space-y-1.5">
            <p>• Avoid sharp shadows or cellophane reflection over mandatory declaration texts.</p>
            <p>• Image will be routed to the OpenCV character height estimator and OCR pipeline.</p>
          </CardContent>
        </Card>
      </PageContainer>
    </AppShell>
  );
}
