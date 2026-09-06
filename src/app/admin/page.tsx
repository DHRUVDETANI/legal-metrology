import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/helpers';

export default async function AdminPage() {
  const profile = await requireAdmin({ redirectTo: '/login' });

  return (
    <AppShell
      userRole={profile.role}
      userName={profile.full_name}
      stationName={profile.jurisdiction}
    >
      <PageContainer
        title="Directorate Administrative Console"
        description="Statewide Legal Metrology compliance metrics and regulatory ruleset configuration."
      >
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle>Administration Console</CardTitle>
            <CardDescription>
              Authenticated administrator session verified. Access granted to master system configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-xs text-muted-foreground pb-6">
            Administrator: {profile.full_name} — {profile.jurisdiction}
          </CardContent>
        </Card>
      </PageContainer>
    </AppShell>
  );
}
