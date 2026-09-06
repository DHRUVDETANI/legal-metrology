import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import type { InspectionStatus } from '@/types/database.types';

interface StatusBadgeProps {
  status: InspectionStatus | 'PENDING';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  switch (status) {
    case 'PASS':
      return (
        <Badge variant="pass" className={className}>
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
          PASS
        </Badge>
      );
    case 'FAIL':
      return (
        <Badge variant="fail" className={className}>
          <XCircle className="w-3.5 h-3.5 mr-1" />
          FAIL
        </Badge>
      );
    case 'REVIEW':
      return (
        <Badge variant="review" className={className}>
          <AlertTriangle className="w-3.5 h-3.5 mr-1" />
          REVIEW
        </Badge>
      );
    case 'PENDING':
    default:
      return (
        <Badge variant="outline" className={className}>
          <Clock className="w-3.5 h-3.5 mr-1" />
          PENDING
        </Badge>
      );
  }
}
