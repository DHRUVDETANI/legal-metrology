import { NextResponse } from 'next/server';
import { getUserProfile, getCurrentUser } from '@/lib/auth/helpers';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const profile = await getUserProfile();

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: profile?.role || 'inspector',
        fullName: profile?.full_name || '',
        badgeNumber: profile?.badge_number || '',
        jurisdiction: profile?.jurisdiction || '',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
