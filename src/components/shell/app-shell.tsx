'use client';

import React from 'react';
import { Header } from './header';
import { Navigation } from './navigation';

interface AppShellProps {
  children: React.ReactNode;
  userRole?: 'inspector' | 'reviewer' | 'admin';
  userName?: string;
  stationName?: string;
}

export function AppShell({
  children,
  userRole = 'inspector',
  userName = 'Field Officer',
  stationName = 'Station 1 - Delhi Central',
}: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header
        userRole={userRole}
        userName={userName}
        stationName={stationName}
      />
      <div className="flex flex-1">
        <Navigation userRole={userRole} />
        <main className="flex-1 flex flex-col">{children}</main>
      </div>
    </div>
  );
}
