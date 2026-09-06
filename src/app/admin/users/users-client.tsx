'use client';

// ============================================================================
// src/app/admin/users/users-client.tsx
// SIH PS26034 — Interactive Admin User Directory Client Component
// ============================================================================

import React, { useState, useMemo } from 'react';
import { DataTable, type Column } from '@/components/ui/data-table';
import { RoleBadge } from '@/components/ui/role-badge';
import { Search } from 'lucide-react';
import type { UserRole } from '@/types/database.types';

export interface DirectoryUser {
  id: string;
  fullName: string;
  role: UserRole;
  badgeNumber: string;
  jurisdiction: string;
  createdAt: string;
}

interface AdminUsersClientProps {
  initialUsers: DirectoryUser[];
}

export function AdminUsersClient({ initialUsers }: AdminUsersClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');

  const filteredUsers = useMemo(() => {
    return initialUsers.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          u.fullName.toLowerCase().includes(q) ||
          u.badgeNumber.toLowerCase().includes(q) ||
          u.jurisdiction.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [initialUsers, searchTerm, roleFilter]);

  const columns: Column<DirectoryUser>[] = [
    {
      header: 'Officer / User',
      cell: (item) => (
        <div>
          <div className="font-semibold text-foreground text-sm">{item.fullName}</div>
          <div className="text-[11px] font-mono text-muted-foreground">{item.badgeNumber}</div>
        </div>
      ),
    },
    {
      header: 'Assigned Role',
      cell: (item) => <RoleBadge role={item.role} />,
    },
    {
      header: 'Station Jurisdiction',
      accessorKey: 'jurisdiction',
      className: 'text-xs text-muted-foreground',
    },
    {
      header: 'Registered',
      cell: (item) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(item.createdAt).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: () => (
        <span className="text-xs font-semibold text-compliance-pass-text bg-compliance-pass-bg/50 px-2 py-0.5 rounded">
          ACTIVE
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Search and Role Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search officers by name, badge, or jurisdiction..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-md border bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="inline-flex rounded-md border bg-muted/40 p-0.5 text-xs">
          {(['ALL', 'inspector', 'reviewer', 'admin'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                roleFilter === r
                  ? 'bg-background text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r === 'ALL' ? 'All Roles' : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Table */}
      {filteredUsers.length === 0 ? (
        <div className="rounded-lg border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          No officers match the specified search or filter criteria.
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredUsers}
          keyExtractor={(item) => item.id}
        />
      )}
    </div>
  );
}
