import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Camera, ShieldCheck, Scale, Cpu, FileSpreadsheet, Lock } from 'lucide-react';
import { getUserProfile } from '@/lib/auth/helpers';

export default async function HomePage() {
  const profile = await getUserProfile();

  return (
    <AppShell
      userRole={profile?.role || 'inspector'}
      userName={profile?.full_name || (profile ? 'Authenticated Officer' : 'Guest Officer')}
      stationName={profile?.jurisdiction || 'Field Station'}
    >
      <PageContainer
        title="Legal Metrology Compliance System"
        description="Smart India Hackathon 2024 — Problem Statement 26034 (Packaged Commodities)"
      >
        {/* Core Mobile-First Hero Action */}
        <div className="rounded-xl border bg-gradient-to-br from-primary/10 via-background to-accent/20 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="pass">Phase 1 Database & Auth Active</Badge>
                <Badge variant="outline">Rule Version 2024.1</Badge>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">
                Mobile Field Inspector Terminal
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
                Inspect packaged commodities for Legal Metrology compliance. Scan product labels,
                measure font heights, evaluate mandatory declarations, and generate evidence-backed reports.
              </p>
            </div>
            <Link href="/scan" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto gap-2 text-base font-semibold shadow-md">
                <Camera className="h-5 w-5" />
                <span>Scan Product</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Subsystem Readiness Indicators */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 pt-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deterministic Engine</CardTitle>
              <Scale className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-foreground">Authoritative</div>
              <p className="text-xs text-muted-foreground mt-1">
                Zero LLM hallucination in final verdicts. Pure, versioned, auditable ruleset.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Supabase Backend</CardTitle>
              <Lock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-foreground">Active & Protected</div>
              <p className="text-xs text-muted-foreground mt-1">
                PostgreSQL + Storage + Auth foundation configured with RLS enforcement.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CV Service (FastAPI)</CardTitle>
              <Cpu className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-foreground">Health Ready</div>
              <p className="text-xs text-muted-foreground mt-1">
                Python + OpenCV text geometry & character pixel measurement microservice.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Portal Entry Navigation */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider text-muted-foreground">
            System Portals
          </h3>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            <Link href="/scan" className="group">
              <div className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-foreground">Field Inspector</div>
                  <div className="text-xs text-muted-foreground">Capture label, review OCR, evaluate</div>
                </div>
              </div>
            </Link>

            <Link href="/reviewer" className="group">
              <div className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-compliance-review/10 text-compliance-review">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-foreground">Reviewer Portal</div>
                  <div className="text-xs text-muted-foreground">Audit flagged inspections & evidence</div>
                </div>
              </div>
            </Link>

            <Link href="/admin" className="group">
              <div className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-foreground">Admin Directorate</div>
                  <div className="text-xs text-muted-foreground">Rules configuration & analytics</div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
