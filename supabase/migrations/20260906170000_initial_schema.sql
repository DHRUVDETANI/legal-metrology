-- ==============================================================================
-- SIH PS26034: Software System for Legal Metrology Compliance of Packaged Commodities
-- Initial Core Schema Migration: Types, Tables, Constraints, Indexes & RLS Policies
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CUSTOM ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('inspector', 'reviewer', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE inspection_status AS ENUM ('PASS', 'FAIL', 'REVIEW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE severity_level AS ENUM ('CRITICAL', 'MAJOR', 'MINOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE panel_type AS ENUM ('primary_display', 'info_panel', 'side', 'back', 'top_bottom');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TIMESTAMP UPDATER FUNCTION
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. TABLE: users_profile (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.users_profile (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'inspector',
    badge_number TEXT UNIQUE,
    full_name TEXT NOT NULL,
    jurisdiction TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_users_profile_updated_at
    BEFORE UPDATE ON public.users_profile
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Secure function to retrieve current caller's role from users_profile
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS user_role AS $$
    SELECT role FROM public.users_profile WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 5. TABLE: products (Catalog of inspected commodities)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_name TEXT NOT NULL,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    barcode TEXT,
    declared_net_quantity TEXT,
    declared_unit TEXT,
    declared_mrp NUMERIC(10, 2),
    manufacturer TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. TABLE: inspections (Central inspection ledger)
CREATE TABLE IF NOT EXISTS public.inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_number TEXT NOT NULL UNIQUE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    inspector_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE RESTRICT,
    status inspection_status NOT NULL DEFAULT 'REVIEW',
    location_name TEXT NOT NULL,
    gps_lat DOUBLE PRECISION,
    gps_lng DOUBLE PRECISION,
    ruleset_version TEXT NOT NULL DEFAULT 'v2024.1',
    total_violations INT NOT NULL DEFAULT 0,
    reviewer_notes TEXT,
    reviewed_by UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_inspections_updated_at
    BEFORE UPDATE ON public.inspections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. TABLE: packaging_images (Images belonging to inspection)
CREATE TABLE IF NOT EXISTS public.packaging_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    panel_type panel_type NOT NULL DEFAULT 'primary_display',
    width_px INT NOT NULL,
    height_px INT NOT NULL,
    blur_score NUMERIC(6, 2),
    is_acceptable_quality BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. TABLE: declarations (Extracted legal declarations)
CREATE TABLE IF NOT EXISTS public.declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
    image_id UUID REFERENCES public.packaging_images(id) ON DELETE SET NULL,
    field_name TEXT NOT NULL,
    raw_ocr_text TEXT NOT NULL,
    observed_value TEXT NOT NULL,
    normalized_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    confidence NUMERIC(4, 3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    bbox JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_manually_edited BOOLEAN NOT NULL DEFAULT FALSE,
    edited_by UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_declarations_updated_at
    BEFORE UPDATE ON public.declarations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. TABLE: cv_measurements (Computer vision geometry measurements)
CREATE TABLE IF NOT EXISTS public.cv_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
    image_id UUID REFERENCES public.packaging_images(id) ON DELETE CASCADE,
    target_field TEXT NOT NULL,
    character_height_px NUMERIC(6, 2) NOT NULL,
    contrast_ratio NUMERIC(5, 2) NOT NULL,
    is_calibrated BOOLEAN NOT NULL DEFAULT FALSE,
    measurement_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. TABLE: rules (Master regulatory rules)
CREATE TABLE IF NOT EXISTS public.rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    target_field TEXT NOT NULL,
    severity severity_level NOT NULL DEFAULT 'MAJOR',
    condition_operator TEXT NOT NULL,
    condition_parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    expected_constraint_text TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    current_version TEXT NOT NULL DEFAULT 'v2024.1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_rules_updated_at
    BEFORE UPDATE ON public.rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. TABLE: rule_versions (Immutable regulatory rule history)
CREATE TABLE IF NOT EXISTS public.rule_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES public.rules(id) ON DELETE CASCADE,
    version_code TEXT NOT NULL,
    parameters_snapshot JSONB NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.users_profile(id) ON DELETE SET NULL
);

-- 12. TABLE: violations (Detected statutory violations)
CREATE TABLE IF NOT EXISTS public.violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES public.rules(id) ON DELETE SET NULL,
    rule_code TEXT NOT NULL REFERENCES public.rules(rule_code) ON DELETE CASCADE,
    observed_value TEXT NOT NULL,
    expected_constraint TEXT NOT NULL,
    severity severity_level NOT NULL DEFAULT 'MAJOR',
    evidence_crop_path TEXT,
    evidence_bbox JSONB NOT NULL DEFAULT '{}'::jsonb,
    confidence NUMERIC(4, 3) NOT NULL DEFAULT 1.0,
    rule_version TEXT NOT NULL DEFAULT 'v2024.1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. TABLE: reports (Generated inspection reports)
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL UNIQUE REFERENCES public.inspections(id) ON DELETE CASCADE,
    report_number TEXT NOT NULL UNIQUE,
    pdf_storage_path TEXT NOT NULL,
    sha256_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE RESTRICT
);

-- 14. TABLE: audit_logs (Append-only audit ledger)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
    actor_role user_role NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_users_profile_role ON public.users_profile(role);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_inspections_number ON public.inspections(inspection_number);
CREATE INDEX IF NOT EXISTS idx_inspections_inspector ON public.inspections(inspector_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON public.inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_created_at ON public.inspections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_packaging_images_inspection ON public.packaging_images(inspection_id);
CREATE INDEX IF NOT EXISTS idx_declarations_inspection ON public.declarations(inspection_id);
CREATE INDEX IF NOT EXISTS idx_declarations_field ON public.declarations(inspection_id, field_name);
CREATE INDEX IF NOT EXISTS idx_cv_measurements_inspection ON public.cv_measurements(inspection_id);
CREATE INDEX IF NOT EXISTS idx_rules_code ON public.rules(rule_code);
CREATE INDEX IF NOT EXISTS idx_rules_enabled ON public.rules(enabled);
CREATE INDEX IF NOT EXISTS idx_rule_versions_rule ON public.rule_versions(rule_id);
CREATE INDEX IF NOT EXISTS idx_violations_inspection ON public.violations(inspection_id);
CREATE INDEX IF NOT EXISTS idx_violations_rule_code ON public.violations(rule_code);
CREATE INDEX IF NOT EXISTS idx_reports_inspection ON public.reports(inspection_id);
CREATE INDEX IF NOT EXISTS idx_reports_number ON public.reports(report_number);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- 16. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packaging_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cv_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- users_profile Policies
CREATE POLICY "users_profile_select" ON public.users_profile
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.get_auth_role() IN ('reviewer', 'admin'));

CREATE POLICY "users_profile_insert" ON public.users_profile
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid() OR public.get_auth_role() = 'admin');

CREATE POLICY "users_profile_update" ON public.users_profile
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.get_auth_role() = 'admin')
    WITH CHECK (
        (id = auth.uid() AND role = (SELECT role FROM public.users_profile WHERE id = auth.uid()))
        OR public.get_auth_role() = 'admin'
    );

-- products Policies
CREATE POLICY "products_select" ON public.products
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "products_insert" ON public.products
    FOR INSERT TO authenticated
    WITH CHECK (public.get_auth_role() IN ('inspector', 'admin'));

CREATE POLICY "products_update" ON public.products
    FOR UPDATE TO authenticated
    USING (public.get_auth_role() IN ('inspector', 'admin'));

-- inspections Policies
CREATE POLICY "inspections_select" ON public.inspections
    FOR SELECT TO authenticated
    USING (
        inspector_id = auth.uid()
        OR public.get_auth_role() IN ('reviewer', 'admin')
    );

CREATE POLICY "inspections_insert" ON public.inspections
    FOR INSERT TO authenticated
    WITH CHECK (
        (inspector_id = auth.uid() AND public.get_auth_role() = 'inspector')
        OR public.get_auth_role() = 'admin'
    );

CREATE POLICY "inspections_update" ON public.inspections
    FOR UPDATE TO authenticated
    USING (
        inspector_id = auth.uid()
        OR public.get_auth_role() IN ('reviewer', 'admin')
    )
    WITH CHECK (
        inspector_id = auth.uid()
        OR public.get_auth_role() IN ('reviewer', 'admin')
    );

-- Helper policy function for child inspection entities
CREATE OR REPLACE FUNCTION public.can_access_inspection(target_inspection_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.inspections
        WHERE id = target_inspection_id
          AND (inspector_id = auth.uid() OR public.get_auth_role() IN ('reviewer', 'admin'))
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- packaging_images Policies
CREATE POLICY "packaging_images_select" ON public.packaging_images
    FOR SELECT TO authenticated
    USING (public.can_access_inspection(inspection_id));

CREATE POLICY "packaging_images_insert" ON public.packaging_images
    FOR INSERT TO authenticated
    WITH CHECK (public.can_access_inspection(inspection_id));

CREATE POLICY "packaging_images_delete" ON public.packaging_images
    FOR DELETE TO authenticated
    USING (public.can_access_inspection(inspection_id) AND public.get_auth_role() IN ('inspector', 'admin'));

-- declarations Policies
CREATE POLICY "declarations_select" ON public.declarations
    FOR SELECT TO authenticated
    USING (public.can_access_inspection(inspection_id));

CREATE POLICY "declarations_insert" ON public.declarations
    FOR INSERT TO authenticated
    WITH CHECK (public.can_access_inspection(inspection_id));

CREATE POLICY "declarations_update" ON public.declarations
    FOR UPDATE TO authenticated
    USING (public.can_access_inspection(inspection_id));

-- cv_measurements Policies
CREATE POLICY "cv_measurements_select" ON public.cv_measurements
    FOR SELECT TO authenticated
    USING (public.can_access_inspection(inspection_id));

CREATE POLICY "cv_measurements_insert" ON public.cv_measurements
    FOR INSERT TO authenticated
    WITH CHECK (public.can_access_inspection(inspection_id));

-- rules Policies (Admin writes, everyone authenticated reads)
CREATE POLICY "rules_select" ON public.rules
    FOR SELECT TO authenticated
    USING (enabled = true OR public.get_auth_role() = 'admin');

CREATE POLICY "rules_admin_all" ON public.rules
    FOR ALL TO authenticated
    USING (public.get_auth_role() = 'admin')
    WITH CHECK (public.get_auth_role() = 'admin');

-- rule_versions Policies (Immutable history)
CREATE POLICY "rule_versions_select" ON public.rule_versions
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "rule_versions_insert" ON public.rule_versions
    FOR INSERT TO authenticated
    WITH CHECK (public.get_auth_role() = 'admin');

-- violations Policies
CREATE POLICY "violations_select" ON public.violations
    FOR SELECT TO authenticated
    USING (public.can_access_inspection(inspection_id));

CREATE POLICY "violations_insert" ON public.violations
    FOR INSERT TO authenticated
    WITH CHECK (public.can_access_inspection(inspection_id));

-- reports Policies
CREATE POLICY "reports_select" ON public.reports
    FOR SELECT TO authenticated
    USING (public.can_access_inspection(inspection_id));

CREATE POLICY "reports_insert" ON public.reports
    FOR INSERT TO authenticated
    WITH CHECK (public.can_access_inspection(inspection_id));

-- audit_logs Policies (Append-only from application layer)
CREATE POLICY "audit_logs_select" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
        actor_id = auth.uid()
        OR public.get_auth_role() IN ('reviewer', 'admin')
    );

CREATE POLICY "audit_logs_insert" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (
        actor_id = auth.uid()
        OR public.get_auth_role() = 'admin'
    );
-- Notice: No UPDATE or DELETE policies on audit_logs => strictly append-only.

-- ==============================================================================
-- 17. STORAGE BUCKETS CONFIGURATION (Private Buckets & Policies)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('inspection-images', 'inspection-images', false, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('evidence-crops', 'evidence-crops', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('inspection-reports', 'inspection-reports', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage object policies
CREATE POLICY "inspection_images_read" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id IN ('inspection-images', 'evidence-crops', 'inspection-reports'));

CREATE POLICY "inspection_images_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id IN ('inspection-images', 'evidence-crops')
        AND (public.get_auth_role() IN ('inspector', 'admin'))
    );

CREATE POLICY "inspection_reports_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'inspection-reports'
        AND (public.get_auth_role() IN ('inspector', 'reviewer', 'admin'))
    );
