'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, User, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  userRole?: 'inspector' | 'reviewer' | 'admin';
  userName?: string;
  stationName?: string;
}

export function Header({
  userRole = 'inspector',
  userName = 'Field Officer',
  stationName = 'Station 1 - Delhi Central',
}: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-foreground">
              Legal Metrology
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              PS26034 Compliance
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Badge
            variant={
              userRole === 'admin'
                ? 'destructive'
                : userRole === 'reviewer'
                ? 'review'
                : 'default'
            }
            className="capitalize"
          >
            {userRole}
          </Badge>

          <div className="flex items-center gap-2 rounded-full border bg-muted/50 py-1 pl-2 pr-3 text-xs text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span className="hidden sm:inline font-medium text-foreground">
              {userName}
            </span>
            <span className="hidden md:inline">({stationName})</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Sign Out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
