'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Camera,
  History,
  FileCheck2,
  Settings,
  ShieldAlert,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  primary?: boolean;
}

interface NavigationProps {
  userRole?: 'inspector' | 'reviewer' | 'admin';
}

export function Navigation({ userRole = 'inspector' }: NavigationProps) {
  const pathname = usePathname();

  const inspectorLinks: NavItem[] = [
    { href: '/', label: 'Overview', icon: BarChart3 },
    { href: '/scan', label: 'Scan Product', icon: Camera, primary: true },
    { href: '/history', label: 'History', icon: History },
  ];

  const reviewerLinks: NavItem[] = [
    { href: '/reviewer', label: 'Review Queue', icon: FileCheck2 },
    { href: '/reviewer/audits', label: 'Violations', icon: ShieldAlert },
    { href: '/history', label: 'Archive', icon: History },
  ];

  const adminLinks: NavItem[] = [
    { href: '/admin', label: 'Dashboard', icon: BarChart3 },
    { href: '/admin/rules', label: 'Rules Config', icon: Settings },
    { href: '/history', label: 'Audits', icon: History },
  ];

  const links =
    userRole === 'admin'
      ? adminLinks
      : userRole === 'reviewer'
      ? reviewerLinks
      : inspectorLinks;

  return (
    <>
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-muted/20 p-4 space-y-1">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Navigation
        </div>
        {links.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t bg-background/95 backdrop-blur px-2 shadow-lg safe-area-inset-bottom">
        {links.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-1 text-xs transition-colors select-none',
                item.primary
                  ? '-top-3 relative'
                  : '',
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.primary ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform">
                  <Icon className="h-6 w-6" />
                </div>
              ) : (
                <Icon className="h-5 w-5 mb-1" />
              )}
              <span className={item.primary ? 'mt-1 text-[11px] font-bold' : 'text-[11px]'}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
