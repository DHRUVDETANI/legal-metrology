import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldAlert, UserCheck } from 'lucide-react';
import type { UserRole } from '@/types/database.types';

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  switch (role) {
    case 'admin':
      return (
        <Badge variant="destructive" className={className}>
          <ShieldAlert className="w-3 h-3 mr-1" />
          Administrator
        </Badge>
      );
    case 'reviewer':
      return (
        <Badge variant="review" className={className}>
          <UserCheck className="w-3 h-3 mr-1" />
          Reviewer
        </Badge>
      );
    case 'inspector':
    default:
      return (
        <Badge variant="default" className={className}>
          <Shield className="w-3 h-3 mr-1" />
          Inspector
        </Badge>
      );
  }
}
