import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { History } from 'lucide-react';
import { requireUser, getUserProfile } from '@/lib/auth/helpers';

export default async function HistoryPage() {
  await requireUser({ redirectTo: '/login' });
  const profile = await getUserProfile();

  return (
    <AppShell
      userRole={profile?.role || 'inspector'}
      userName={profile?.full_name || 'Officer'}
      stationName={profile?.jurisdiction || 'Field Station'}
    >
      <PageContainer
        title="Inspection History & Records"
        description="Searchable log of field inspections and court-admissible evidence reports."
      >
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
              <History className="h-6 w-6" />
            </div>
            <CardTitle>Inspection History</CardTitle>
            <CardDescription>
              Authenticated session active. Inspection logs will be displayed here according to RLS permissions.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-xs text-muted-foreground pb-6">
            Connected as: {profile?.full_name || 'Authenticated User'} ({profile?.role})
          </CardContent>
        </Card>
      </PageContainer>
    </AppShell>
  );
}
