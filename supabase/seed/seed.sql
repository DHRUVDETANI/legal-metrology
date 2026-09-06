-- ==============================================================================
-- supabase/seed/seed.sql
-- SIH PS26034 Demo Seed Data
--
-- ⚠️  WARNING: ALL DATA IN THIS FILE IS DEMO / TEST DATA ONLY.
-- ⚠️  None of the rules, thresholds, or requirements below constitute
-- ⚠️  actual legal advice or authoritative Legal Metrology law.
-- ⚠️  All regulatory rules are explicitly marked [DEMO / TEST RULE].
-- ⚠️  Verify any compliance rule against the official Gazette of India
-- ⚠️  / Legal Metrology (Packaged Commodities) Rules, 2011 before use.
--
-- This file is idempotent (ON CONFLICT DO NOTHING) and safe to re-run.
-- ==============================================================================

-- NOTE: Demo Auth users must be created via Supabase Auth UI or API before
-- running this seed. The UUIDs below are reserved placeholders.
-- Create accounts for these UUIDs in Supabase Dashboard > Authentication > Users
-- or use the sign-up flow, then update the UUIDs here to match.

-- DEMO users_profile entries
-- (These will only insert if the auth.users rows with matching IDs exist.)
-- Replace the placeholder UUIDs below with real auth.users IDs after creating
-- the demo accounts.

INSERT INTO public.users_profile (id, full_name, role, jurisdiction, badge_number, phone)
VALUES
    -- DEMO Inspector
    ('00000001-demo-demo-demo-000000000001',
     'Demo Inspector Ravi Kumar',
     'inspector',
     'Maharashtra — Pune District',
     'MH-INS-2024-001',
     '+91-9876543210'),

    -- DEMO Reviewer
    ('00000002-demo-demo-demo-000000000002',
     'Demo Reviewer Priya Sharma',
     'reviewer',
     'Maharashtra — State Level',
     'MH-REV-2024-001',
     '+91-9876543211'),

    -- DEMO Admin
    ('00000003-demo-demo-demo-000000000003',
     'Demo Admin Ajay Patel',
     'admin',
     'National — Central Authority',
     'NAT-ADM-2024-001',
     '+91-9876543212')
ON CONFLICT (id) DO NOTHING;

-- DEMO Product
INSERT INTO public.products (id, brand_name, product_name, category, barcode, declared_net_quantity, declared_unit, declared_mrp, manufacturer)
VALUES
    ('11111111-1111-1111-1111-111111111111',
     'Sunrise Brand',
     'Whole Wheat Biscuits',
     'Food & Beverages',
     '8901234567890',
     '200',
     'g',
     50.00,
     'Sunrise Foods Pvt. Ltd., 12 Industrial Area, Pune - 411018')
ON CONFLICT (id) DO NOTHING;
