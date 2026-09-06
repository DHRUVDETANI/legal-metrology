import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumbs"
      className={cn('flex items-center space-x-1 text-xs text-muted-foreground', className)}
    >
      <Link
        href="/"
        className="flex items-center hover:text-foreground transition-colors p-1 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        title="Home"
      >
        <Home className="w-3.5 h-3.5" />
        <span className="sr-only">Home</span>
      </Link>

      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;

        return (
          <React.Fragment key={`${item.label}-${idx}`}>
            <ChevronRight className="w-3 h-3 text-muted-foreground/60 shrink-0" aria-hidden="true" />
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors p-1 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn('font-medium p-1', isLast ? 'text-foreground font-semibold' : '')}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
