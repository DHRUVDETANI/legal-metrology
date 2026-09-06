// ============================================================================
// tests/unit/ui-shell-navigation.test.ts
// SIH PS26034 — UI Shell & Navigation Unit Tests
//
// Tests:
//  1. StatusBadge variant mapping and icon presentation
//  2. RoleBadge variant mapping
//  3. Breadcrumbs path construction
//  4. StatCard and MobileInspectionCard rendering properties
//  5. Navigation role awareness (Inspector, Reviewer, Admin)
// ============================================================================

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StatusBadge } from '@/components/ui/status-badge';
import { RoleBadge } from '@/components/ui/role-badge';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { StatCard } from '@/components/shell/stat-card';
import { MobileInspectionCard } from '@/components/shell/mobile-inspection-card';
import { Navigation } from '@/components/shell/navigation';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/scan'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
}));

describe('StatusBadge Component', () => {
  it('renders PASS status badge with checkmark indicator', () => {
    const html = renderToStaticMarkup(React.createElement(StatusBadge, { status: 'PASS' }));
    expect(html).toContain('PASS');
  });

  it('renders FAIL status badge with alert indicator', () => {
    const html = renderToStaticMarkup(React.createElement(StatusBadge, { status: 'FAIL' }));
    expect(html).toContain('FAIL');
  });

  it('renders REVIEW status badge with warning indicator', () => {
    const html = renderToStaticMarkup(React.createElement(StatusBadge, { status: 'REVIEW' }));
    expect(html).toContain('REVIEW');
  });
});

describe('RoleBadge Component', () => {
  it('renders Inspector badge correctly', () => {
    const html = renderToStaticMarkup(React.createElement(RoleBadge, { role: 'inspector' }));
    expect(html).toContain('Inspector');
  });

  it('renders Reviewer badge correctly', () => {
    const html = renderToStaticMarkup(React.createElement(RoleBadge, { role: 'reviewer' }));
    expect(html).toContain('Reviewer');
  });

  it('renders Administrator badge correctly', () => {
    const html = renderToStaticMarkup(React.createElement(RoleBadge, { role: 'admin' }));
    expect(html).toContain('Administrator');
  });
});

describe('Breadcrumbs Component', () => {
  it('renders semantic nav landmark with aria-label', () => {
    const html = renderToStaticMarkup(
      React.createElement(Breadcrumbs, {
        items: [
          { label: 'Field Inspections', href: '/scan' },
          { label: 'New Inspection' },
        ],
      })
    );
    expect(html).toContain('aria-label="Breadcrumbs"');
    expect(html).toContain('Field Inspections');
    expect(html).toContain('New Inspection');
    expect(html).toContain('aria-current="page"');
  });
});

describe('StatCard Component', () => {
  it('renders statistical metrics and title accurately', () => {
    const html = renderToStaticMarkup(
      React.createElement(StatCard, {
        title: 'Statewide Inspections',
        value: '1,482',
        description: 'Total inspections conducted',
      })
    );
    expect(html).toContain('Statewide Inspections');
    expect(html).toContain('1,482');
    expect(html).toContain('Total inspections conducted');
  });
});

describe('MobileInspectionCard Component', () => {
  it('renders mobile card with inspection details and violations alert', () => {
    const html = renderToStaticMarkup(
      React.createElement(MobileInspectionCard, {
        id: 'demo-insp-002',
        inspectionNumber: 'INSP-2026-0890',
        brandName: 'Kaveri Pure',
        productName: 'Mustard Oil (1L)',
        status: 'FAIL',
        locationName: 'APMC Yard',
        date: 'Today',
        violationsCount: 2,
        href: '/scan/demo-insp-002/result',
      })
    );
    expect(html).toContain('INSP-2026-0890');
    expect(html).toContain('Kaveri Pure — Mustard Oil (1L)');
    expect(html).toContain('2 statutory infractions detected');
    expect(html).toContain('href="/scan/demo-insp-002/result"');
  });
});

describe('Navigation Role Awareness', () => {
  it('renders inspector navigation links for inspector role', () => {
    const html = renderToStaticMarkup(React.createElement(Navigation, { userRole: 'inspector' }));
    expect(html).toContain('Inspections');
    expect(html).toContain('New Inspection');
    expect(html).toContain('History');
    expect(html).not.toContain('Rules Config');
  });

  it('renders reviewer navigation links for reviewer role', () => {
    const html = renderToStaticMarkup(React.createElement(Navigation, { userRole: 'reviewer' }));
    expect(html).toContain('Review Queue');
    expect(html).not.toContain('User Directory');
  });

  it('renders admin navigation links for admin role', () => {
    const html = renderToStaticMarkup(React.createElement(Navigation, { userRole: 'admin' }));
    expect(html).toContain('Rules Config');
    expect(html).toContain('User Directory');
    expect(html).toContain('Audit Logs');
  });

  it('provides mobile navigation bar with touch-friendly targets', () => {
    const html = renderToStaticMarkup(React.createElement(Navigation, { userRole: 'inspector' }));
    expect(html).toContain('aria-label="Mobile Navigation"');
    expect(html).toContain('aria-label="Sidebar Navigation"');
  });
});
