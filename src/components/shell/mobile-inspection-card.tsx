import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ChevronRight, Calendar, MapPin, AlertCircle } from 'lucide-react';
import type { InspectionStatus } from '@/types/database.types';

export interface MobileInspectionCardProps {
  id: string;
  inspectionNumber: string;
  productName?: string;
  brandName?: string;
  status: InspectionStatus;
  locationName: string;
  date: string;
  violationsCount: number;
  href?: string;
}

export function MobileInspectionCard({
  inspectionNumber,
  productName = 'Commodity Package',
  brandName,
  status,
  locationName,
  date,
  violationsCount,
  href,
}: MobileInspectionCardProps) {
  const content = (
    <Card className="hover:border-primary/50 transition-colors focus-within:ring-2 focus-within:ring-ring active:scale-[0.99] transition-transform">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-muted-foreground">
                {inspectionNumber}
              </span>
              <StatusBadge status={status} />
            </div>
            <h4 className="text-sm sm:text-base font-semibold text-foreground truncate">
              {brandName ? `${brandName} — ${productName}` : productName}
            </h4>
          </div>
          {href && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground shrink-0 mt-1">
              <ChevronRight className="w-5 h-5" />
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground border-t pt-2.5">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{locationName}</span>
          </div>
          <div className="flex items-center gap-1.5 justify-end">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>{date}</span>
          </div>
        </div>

        {violationsCount > 0 && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-compliance-fail-text bg-compliance-fail-bg/50 px-2.5 py-1 rounded-md">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{violationsCount} statutory infractions detected</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block no-underline focus-visible:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
