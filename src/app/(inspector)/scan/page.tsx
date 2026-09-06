import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Camera } from 'lucide-react';
import { requireInspector } from '@/lib/auth/helpers';

export default async function ScanPage() {
  const profile = await requireInspector({ redirectTo: '/login' });

  return (
    <AppShell
      userRole={profile.role}
      userName={profile.full_name}
      stationName={profile.jurisdiction}
    >
      <PageContainer
        title="Scan Commodity Label"
        description="Mobile field capture and automated declaration compliance check."
      >
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
              <Camera className="h-6 w-6" />
            </div>
            <CardTitle>Camera Viewfinder Ready</CardTitle>
            <CardDescription>
              Authenticated inspector session active. Field capture pipeline enabled.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-xs text-muted-foreground pb-6">
            Inspector: {profile.full_name} ({profile.badge_number || 'Badge N/A'}) — {profile.jurisdiction}
          </CardContent>
        </Card>
      </PageContainer>
    </AppShell>
  );
}
