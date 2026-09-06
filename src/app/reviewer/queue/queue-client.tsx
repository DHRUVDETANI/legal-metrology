'use client';

// ============================================================================
// src/app/reviewer/queue/queue-client.tsx
// SIH PS26034 — Interactive Reviewer Queue Client Component
//
// Supports searching, status filtering, violation presence filtering,
// and sorting by date or violation count.
// ============================================================================

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { DataTable, type Column } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Search, ArrowRight, ArrowUpDown } from 'lucide-react';
import type { InspectionStatus } from '@/types/database.types';

export interface QueueRow {
  id: string;
  inspectionNumber: string;
  locationName: string;
  inspectorId: string;
  status: InspectionStatus;
  totalViolations: number;
  rulesetVersion: string;
  createdAt: string;
  reviewerNotes: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ReviewerQueueClientProps {
  initialRows: QueueRow[];
}

export function ReviewerQueueClient({ initialRows }: ReviewerQueueClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'REVIEW' | 'FAIL' | 'PASS'>('ALL');
  const [violationOnly, setViolationOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'violations_desc'>('date_desc');

  const filteredRows = useMemo(() => {
    return initialRows
      .filter((row) => {
        // 1. Search term match
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchNumber = row.inspectionNumber.toLowerCase().includes(q);
          const matchLocation = row.locationName.toLowerCase().includes(q);
          if (!matchNumber && !matchLocation) return false;
        }

        // 2. Status filter
        if (statusFilter !== 'ALL' && row.status !== statusFilter) {
          return false;
        }

        // 3. Violation presence filter
        if (violationOnly && row.totalViolations === 0) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'date_asc') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === 'violations_desc') {
          return b.totalViolations - a.totalViolations;
        }
        return 0;
      });
  }, [initialRows, searchTerm, statusFilter, violationOnly, sortBy]);

  const columns: Column<QueueRow>[] = [
    {
      header: 'Inspection Ref',
      accessorKey: 'inspectionNumber',
      className: 'font-mono text-xs font-semibold',
    },
    {
      header: 'Location / Market',
      accessorKey: 'locationName',
      className: 'text-xs',
    },
    {
      header: 'Violations',
      cell: (item) => (
        <span
          className={
            item.totalViolations > 0
              ? 'text-xs font-bold text-compliance-fail-text'
              : 'text-xs text-muted-foreground'
          }
        >
          {item.totalViolations}
        </span>
      ),
    },
    {
      header: 'Submitted',
      cell: (item) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDate(item.createdAt)}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (item) => <StatusBadge status={item.status} />,
    },
    {
      header: 'Action',
      cell: (item) => (
        <Link href={`/reviewer/audit/${item.id}`}>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
            <span>Audit</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Control Bar: Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ref number or location..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-md border bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter Buttons */}
          <div className="inline-flex rounded-md border bg-muted/40 p-0.5 text-xs">
            {(['ALL', 'REVIEW', 'FAIL', 'PASS'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-background text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {st === 'ALL' ? 'All' : st}
              </button>
            ))}
          </div>

          {/* Toggle: Violations Only */}
          <button
            onClick={() => setViolationOnly(!violationOnly)}
            className={`px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors ${
              violationOnly
                ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                : 'bg-background text-muted-foreground hover:bg-muted/40'
            }`}
          >
            Has Violations
          </button>

          {/* Sort selector */}
          <div className="flex items-center gap-1 border rounded-md px-2 py-1 bg-background text-xs text-muted-foreground">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              aria-label="Sort queue by"
              className="bg-transparent text-xs focus:outline-none text-foreground"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="violations_desc">Highest Violations</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Table */}
      {filteredRows.length === 0 ? (
        <div className="rounded-lg border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          {initialRows.length === 0
            ? 'No inspections in the review queue. All cases have been adjudicated.'
            : 'No inspections match the selected search and filter criteria.'}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredRows}
          keyExtractor={(item) => item.id}
        />
      )}
    </div>
  );
}
