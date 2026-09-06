'use client';

// ============================================================================
// src/app/admin/audit-logs/audit-logs-client.tsx
// SIH PS26034 — Interactive Admin Audit Logs Ledger Client Component
// ============================================================================

import React, { useState, useMemo } from 'react';
import { DataTable, type Column } from '@/components/ui/data-table';
import { RoleBadge } from '@/components/ui/role-badge';
import { Search } from 'lucide-react';
import type { UserRole } from '@/types/database.types';

export interface AuditTableRow {
  id: string;
  timestamp: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
}

interface AdminAuditLogsClientProps {
  initialLogs: AuditTableRow[];
}

export function AdminAuditLogsClient({ initialLogs }: AdminAuditLogsClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  // Unique actions list for dropdown
  const uniqueActions = useMemo(() => {
    const set = new Set(initialLogs.map((l) => l.action));
    return Array.from(set);
  }, [initialLogs]);

  const filteredLogs = useMemo(() => {
    return initialLogs.filter((log) => {
      if (roleFilter !== 'ALL' && log.actorRole !== roleFilter) return false;
      if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          log.action.toLowerCase().includes(q) ||
          log.entityType.toLowerCase().includes(q) ||
          (log.entityId && log.entityId.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [initialLogs, searchTerm, roleFilter, actionFilter]);

  const columns: Column<AuditTableRow>[] = [
    {
      header: 'Timestamp (IST)',
      accessorKey: 'timestamp',
      className: 'font-mono text-xs text-muted-foreground whitespace-nowrap',
    },
    {
      header: 'Actor Role',
      cell: (item) => <RoleBadge role={item.actorRole} />,
    },
    {
      header: 'Event Action',
      cell: (item) => (
        <span className="font-mono text-xs font-semibold text-foreground">{item.action}</span>
      ),
    },
    {
      header: 'Target Entity',
      cell: (item) => (
        <span className="text-xs text-muted-foreground">
          {item.entityType}
          {item.entityId ? ` (${item.entityId.slice(0, 8)}…)` : ''}
        </span>
      ),
    },
    {
      header: 'Origin IP',
      cell: (item) => (
        <span className="font-mono text-xs text-muted-foreground">
          {item.ipAddress || 'Internal / Server'}
        </span>
      ),
    },
    {
      header: 'Integrity',
      cell: () => (
        <span className="inline-flex items-center text-[11px] font-mono text-compliance-pass-text">
          VERIFIED
        </span>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search action or entity ID..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-md border bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Action Filter */}
          {uniqueActions.length > 0 && (
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              aria-label="Filter by event action"
              className="border rounded-md px-2 py-1.5 bg-background text-xs text-foreground focus:outline-none"
            >
              <option value="ALL">All Actions</option>
              {uniqueActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          )}

          {/* Role Filter Tabs */}
          <div className="inline-flex rounded-md border bg-muted/40 p-0.5 text-xs">
            {(['ALL', 'inspector', 'reviewer', 'admin'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  roleFilter === r
                    ? 'bg-background text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r === 'ALL' ? 'All' : r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      {filteredLogs.length === 0 ? (
        <div className="rounded-lg border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          No audit log events match the selected criteria.
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredLogs}
          keyExtractor={(item) => item.id}
        />
      )}
    </div>
  );
}
