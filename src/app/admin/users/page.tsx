// ============================================================================
// src/app/admin/users/page.tsx
// SIH PS26034 — Admin User & Officer Directory
//
// Fetches real officer records from users_profile and renders the searchable
// AdminUsersClient directory component.
// ============================================================================

import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { AdminUsersClient, type DirectoryUser } from './users-client';
import { requireAdmin } from '@/lib/auth/helpers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { UserProfile } from '@/types/database.types';

export default async function AdminUsersPage() {
  const profile = await requireAdmin({ redirectTo: '/login' });
  const supabase = await createServerSupabaseClient();

  // Query users_profile (Admin RLS policy allows full select)
  const { data: dbUsers } = await (
    supabase.from('users_profile') as unknown as {
      select: (cols: string) => {
        order: (col: string, opts: { ascending: boolean }) => Promise<{
          data: UserProfile[] | null;
        }>;
      };
    }
  )
    .select('*')
    .order('created_at', { ascending: false });

  const initialUsers: DirectoryUser[] = (dbUsers || []).map((u) => ({
    id: u.id,
    fullName: u.full_name,
    role: u.role,
    badgeNumber: u.badge_number || 'N/A',
    jurisdiction: u.jurisdiction,
    createdAt: u.created_at,
  }));

  return (
    <AppShell
      userRole={profile.role}
      userName={profile.full_name}
      stationName={profile.jurisdiction}
    >
      <PageContainer
        title="User & Officer Directory"
        description="Statewide personnel roster, jurisdiction coverage, and cryptographically verified role assignments."
      >
        <Breadcrumbs
          items={[
            { label: 'Administrative Console', href: '/admin' },
            { label: 'User Directory' },
          ]}
        />

        <AdminUsersClient initialUsers={initialUsers} />
      </PageContainer>
    </AppShell>
  );
}
