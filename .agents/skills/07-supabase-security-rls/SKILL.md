---
name: supabase-security-rls
description: >-
  Supabase PostgreSQL data modeling, Row Level Security (RLS) policies, Role-Based Access Control (RBAC),
  migration safety, and secure private storage management for PS26034.
  Use when writing database schemas, designing RLS policies, modifying user permissions,
  or configuring storage buckets.
---

# Supabase Security and Row Level Security (RLS)

This skill provides backend security policies, relational schema design guidelines, Row Level Security configurations, and storage access patterns for **SIH PS26034**.

---

## 1. Core Relational Entities

The Supabase PostgreSQL database models the following core entities:

1. **`users_profile`**: Extended user profile linked to `auth.users`, storing `role` (`inspector`, `reviewer`, `admin`), station, and badge number.
2. **`products`**: Catalog of inspected commodities (name, brand, category, barcode).
3. **`inspections`** (scans): Central inspection record (product reference, inspector ID, overall status `PASS`/`FAIL`/`REVIEW`, location).
4. **`packaging_images`**: Images attached to an inspection (storage path, panel type, resolution, blur score).
5. **`declarations`**: Extracted legal fields (field name, raw text, normalized value, bbox, confidence).
6. **`cv_measurements`**: OpenCV font geometry records (pixel height, contrast, confidence).
7. **`rules`**: Master table of Legal Metrology compliance rules (rule code, target field, condition, version, enabled).
8. **`violations`**: Individual infractions triggered during an inspection (rule code, observed vs expected, evidence reference).
9. **`reports`**: Generated PDF report records (storage path, hash, generated timestamp).
10. **`audit_logs`**: Immutable security and compliance event ledger.

---

## 2. Row Level Security (RLS) Guidelines

Every public table must have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`.

### Role-Based Access Policies

| Entity Table | Inspector | Reviewer | Administrator |
|---|---|---|---|
| `users_profile` | Read own profile | Read inspectors & own profile | Read / Write all profiles |
| `products` | Read all, Insert new | Read all, Insert/Update | Read / Write all |
| `inspections` | Insert new, Read own, Update draft | Read all, Update review status | Read all, Update all |
| `declarations` | Insert / Read for own inspections | Read all | Read all |
| `violations` | Read for own inspections | Read all, Annotate | Read all |
| `rules` | Read enabled rules | Read all rules | Read, Insert, Update, Version rules |
| `reports` | Read reports for own inspections | Read all reports | Read / Download all reports |
| `audit_logs` | Insert own actions | Read review audits | Read all audit logs (No updates/deletes) |

### Sample RLS Policy Implementation

```sql
-- Enable RLS
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

-- Inspector can view only their own inspections
CREATE POLICY "Inspectors view own inspections"
ON inspections
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'role' = 'inspector' AND inspector_id = auth.uid())
  OR (auth.jwt() ->> 'role' IN ('reviewer', 'admin'))
);

-- Only Admin can modify compliance rules
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read active rules"
ON rules
FOR SELECT
TO authenticated
USING (enabled = true OR (auth.jwt() ->> 'role' = 'admin'));

CREATE POLICY "Only admin can insert or update rules"
ON rules
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');
```

---

## 3. Storage Security Rules

- **Private Buckets**:
  - `packaging-images`: Restricted read/write access.
  - `evidence-crops`: Restricted read/write access.
  - `inspection-reports`: Restricted read access.
- **Signed URL Access**: Never generate public bucket URLs for inspection evidence or legal reports. Always generate short-lived, signed URLs via server-side Supabase client.
- **Path Isolation**: Organize storage objects by inspection ID: `{inspection_id}/{filename}` to enforce tenant/inspector isolation.

---

## 4. Server-Side Authorization Invariants

> [!CAUTION]
> **NEVER TRUST CLIENT-PROVIDED ROLES OR STATUS**:
> - Never read role from client request body or query params. Always verify user role from the authenticated session JWT or `users_profile` lookup in a secure Next.js Server Component or API route.
> - Never allow client code to set `status: 'PASS'` directly. The status must be assigned solely by the server-side compliance engine.
> - Prevent IDOR (Insecure Direct Object Reference) by checking `inspector_id === session.user.id` on all mutating operations unless the actor is an admin/reviewer.

> [!WARNING]
> **NEVER EXPOSE THE SERVICE-ROLE KEY**:
> - The `SUPABASE_SERVICE_ROLE_KEY` must never appear in client bundles, `NEXT_PUBLIC_` environment variables, or client components.
> - Use the public `NEXT_PUBLIC_SUPABASE_ANON_KEY` in browser clients, governed by RLS.

---

## 5. Migration Safety Protocol

Before running database migrations:
1. **Inspect Existing Schema**: Run `\d tablename` or inspect migration files to understand existing constraints and dependencies.
2. **Impact Assessment**: Evaluate whether column renames, drops, or type alterations could corrupt historical inspection data.
3. **Migration Plan**: Author explicit forward (`up`) and rollback (`down`) migration scripts.
4. **Non-Destructive Alterations**: Prefer adding nullable columns or creating new table versions over dropping active columns.
