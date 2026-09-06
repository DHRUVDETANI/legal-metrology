// ============================================================================
// src/lib/auth/helpers.ts
// SIH PS26034 — Server-Side Authentication & Authorization Helpers
//
// SECURITY CONTRACT:
//   - NEVER trust request.body.role or client-side role state.
//   - The authenticated Supabase JWT + DB profile determine identity.
//   - get_auth_role() in the DB is SECURITY DEFINER — no client input trusted.
//   - All functions here run exclusively on the server (Next.js Server Components
//     or Route Handlers). Never import from client components.
// ============================================================================

import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { UserProfile, UserRole } from "@/types/database.types"

// ---------------------------------------------------------------------------
// AuthorizationError — thrown when a server guard fails
// ---------------------------------------------------------------------------

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 401 | 403 = 403
  ) {
    super(message)
    this.name = "AuthorizationError"
  }
}

// ---------------------------------------------------------------------------
// getCurrentUser — reads the server session via Supabase SSR cookie
//
// Returns the authenticated Supabase auth.User or null.
// NEVER returns a user if the JWT is expired or invalid.
// ---------------------------------------------------------------------------

export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }
  return user
}

// ---------------------------------------------------------------------------
// getUserProfile — fetches users_profile row for the authenticated user.
//
// Queries the DB using the server Supabase client (respects RLS).
// Returns null if no profile exists (edge case: user created but profile
// not yet populated by trigger / first-time setup incomplete).
// ---------------------------------------------------------------------------

export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from("users_profile")
    .select("*")
    .eq("id", user.id)
    .single()

  if (error || !data) return null
  return data
}

// ---------------------------------------------------------------------------
// requireUser — throws/redirects if no authenticated session.
//
// Use in Server Components and Route Handlers to guard endpoints.
// If the route should redirect instead of throwing, set redirect = true.
// ---------------------------------------------------------------------------

export async function requireUser(options?: { redirectTo?: string }) {
  const user = await getCurrentUser()

  if (!user) {
    if (options?.redirectTo) {
      redirect(options.redirectTo)
    }
    throw new AuthorizationError("Authentication required.", 401)
  }

  return user
}

// ---------------------------------------------------------------------------
// requireRole — verifies the authenticated user has a specific DB role.
//
// Reads role from users_profile (via RLS-scoped server client), never from
// request body or client-supplied claims.
// ---------------------------------------------------------------------------

export async function requireRole(
  allowedRoles: UserRole | UserRole[],
  options?: { redirectTo?: string }
): Promise<UserProfile> {
  const profile = await getUserProfile()

  if (!profile) {
    if (options?.redirectTo) {
      redirect(options.redirectTo)
    }
    throw new AuthorizationError("Authentication required.", 401)
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
  if (!roles.includes(profile.role)) {
    if (options?.redirectTo) {
      redirect(options.redirectTo)
    }
    throw new AuthorizationError(
      `Access denied. Required role: ${roles.join(" or ")}. Your role: ${profile.role}.`,
      403
    )
  }

  return profile
}

// ---------------------------------------------------------------------------
// Convenience role-specific guards
// ---------------------------------------------------------------------------

/**
 * requireInspector — ensures the caller is an inspector or admin.
 * Inspectors perform label scans and create inspections.
 */
export async function requireInspector(
  options?: { redirectTo?: string }
): Promise<UserProfile> {
  return requireRole(["inspector", "admin"], options)
}

/**
 * requireReviewer — ensures the caller is a reviewer or admin.
 * Reviewers can read all inspections and submit review decisions.
 */
export async function requireReviewer(
  options?: { redirectTo?: string }
): Promise<UserProfile> {
  return requireRole(["reviewer", "admin"], options)
}

/**
 * requireAdmin — ensures the caller is an admin.
 * Admins manage rules, users, and system configuration.
 */
export async function requireAdmin(
  options?: { redirectTo?: string }
): Promise<UserProfile> {
  return requireRole("admin", options)
}

// ---------------------------------------------------------------------------
// isRole — non-throwing role check for conditional UI rendering in RSC.
//
// Usage:
//   const isAdmin = await isRole("admin")
//   if (isAdmin) { ... }
// ---------------------------------------------------------------------------

export async function isRole(role: UserRole): Promise<boolean> {
  const profile = await getUserProfile()
  return profile?.role === role
}

// ---------------------------------------------------------------------------
// getProfileOrRedirect — convenience: fetch profile or redirect to login.
// ---------------------------------------------------------------------------

export async function getProfileOrRedirect(
  loginPath = "/login"
): Promise<UserProfile> {
  const profile = await getUserProfile()
  if (!profile) {
    redirect(loginPath)
  }
  return profile
}
