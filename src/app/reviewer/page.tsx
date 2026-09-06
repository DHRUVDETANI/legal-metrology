import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileCheck2 } from 'lucide-react';
import { requireReviewer } from '@/lib/auth/helpers';

export default async function ReviewerPage() {
  const profile = await requireReviewer({ redirectTo: '/login' });

  return (
    <AppShell
      userRole={profile.role}
      userName={profile.full_name}
      stationName={profile.jurisdiction}
    >
      <PageContainer
        title="Reviewer Audit Queue"
        description="Audit flagged inspections and ambiguous OCR/CV evidence."
      >
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-compliance-review/10 text-compliance-review mb-2">
              <FileCheck2 className="h-6 w-6" />
            </div>
            <CardTitle>Review Queue Initialized</CardTitle>
            <CardDescription>
              Authenticated reviewer session verified. Access granted to flagged inspection backlog.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-xs text-muted-foreground pb-6">
            Reviewer: {profile.full_name} — {profile.jurisdiction}
          </CardContent>
        </Card>
      </PageContainer>
    </AppShell>
  );
}
