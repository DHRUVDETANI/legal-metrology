'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Camera,
  History,
  FileCheck2,
  Settings,
  BarChart3,
  Users,
  FileText,
  PlusCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/database.types';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  primary?: boolean;
}

interface NavigationProps {
  userRole?: UserRole;
}

export function Navigation({ userRole = 'inspector' }: NavigationProps) {
  const pathname = usePathname();

  // Role-specific navigation specifications
  const inspectorLinks: NavItem[] = [
    { href: '/scan', label: 'Inspections', icon: Camera },
    { href: '/scan/new', label: 'New Inspection', icon: PlusCircle, primary: true },
    { href: '/history', label: 'History', icon: History },
  ];

  const reviewerLinks: NavItem[] = [
    { href: '/reviewer', label: 'Overview', icon: BarChart3 },
    { href: '/reviewer/queue', label: 'Review Queue', icon: FileCheck2 },
    { href: '/history', label: 'All Inspections', icon: History },
  ];

  const adminLinks: NavItem[] = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/admin/rules', label: 'Rules Config', icon: Settings },
    { href: '/admin/users', label: 'User Directory', icon: Users },
    { href: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
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
      <aside
        aria-label="Sidebar Navigation"
        className="hidden md:flex w-64 flex-col border-r bg-muted/20 p-4 space-y-2 shrink-0"
      >
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span>{userRole.toUpperCase()} PORTAL</span>
          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">v1.0</span>
        </div>

        <nav className="space-y-1" aria-label="Main Navigation">
          {links.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {userRole === 'inspector' && (
          <div className="pt-4 mt-auto border-t">
            <Link href="/scan/new">
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-3 px-4 text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Camera className="w-4 h-4" />
                <span>Scan Product</span>
              </button>
            </Link>
          </div>
        )}
      </aside>

      {/* Mobile Bottom Navigation Bar (<48px touch targets, sticky, safe area aware) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t bg-background/95 backdrop-blur px-2 shadow-lg safe-area-inset-bottom"
      >
        {links.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-1 text-xs transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md min-h-[48px]',
                item.primary ? '-top-3 relative' : '',
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
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
