// ============================================================================
// tests/unit/auth-rls.test.ts
// SIH PS26034 — Auth & Authorization Unit Tests
//
// Tests the server-side authorization helpers in src/lib/auth/helpers.ts
// using mock Supabase clients. No live Supabase connection is required.
//
// Scenarios covered:
//  1. requireUser — returns user when session is valid
//  2. requireUser — throws AuthorizationError when no session
//  3. requireRole — allows access for correct role
//  4. requireRole — throws 403 for wrong role (role spoofing rejection)
//  5. requireInspector — allows inspector role
//  6. requireInspector — allows admin role (admin is super-role)
//  7. requireInspector — throws for reviewer role
//  8. requireReviewer — allows reviewer role
//  9. requireAdmin — throws for inspector role
// 10. getUserProfile — returns null when auth session is absent
// ============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest"
import { AuthorizationError } from "@/lib/auth/helpers"
import type { UserProfile } from "@/types/database.types"

// ---------------------------------------------------------------------------
// Mock: next/navigation (redirect throws in test context)
// ---------------------------------------------------------------------------
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

// ---------------------------------------------------------------------------
// Mock: @/lib/supabase/server
// We control what getUser() and from().select().eq().single() return
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn()
const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}))

// ---------------------------------------------------------------------------
// Re-import after mocks are set up
// ---------------------------------------------------------------------------
const { getCurrentUser, getUserProfile, requireUser, requireRole, requireInspector, requireReviewer, requireAdmin } =
  await import("@/lib/auth/helpers")

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockAuthUser(id = "user-uuid-001") {
  mockGetUser.mockResolvedValue({ data: { user: { id } }, error: null })
}

function mockNoSession() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
}

function mockProfile(profile: Partial<UserProfile>) {
  const fullProfile: UserProfile = {
    id: "user-uuid-001",
    full_name: "Test User",
    role: "inspector",
    jurisdiction: "Test Jurisdiction",
    badge_number: null,
    phone: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...profile,
  }
  mockSingle.mockResolvedValue({ data: fullProfile, error: null })
}

function mockNoProfile() {
  mockSingle.mockResolvedValue({ data: null, error: { message: "Not found" } })
}

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------

describe("getCurrentUser", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("returns user when session is valid", async () => {
    mockAuthUser("abc-123")
    const user = await getCurrentUser()
    expect(user).not.toBeNull()
    expect(user?.id).toBe("abc-123")
  })

  it("returns null when there is no active session", async () => {
    mockNoSession()
    const user = await getCurrentUser()
    expect(user).toBeNull()
  })
})

describe("getUserProfile", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("returns profile when user and profile both exist", async () => {
    mockAuthUser()
    mockProfile({ role: "reviewer" })
    const profile = await getUserProfile()
    expect(profile).not.toBeNull()
    expect(profile?.role).toBe("reviewer")
  })

  it("returns null when no authenticated session (scenario 10)", async () => {
    mockNoSession()
    const profile = await getUserProfile()
    expect(profile).toBeNull()
  })

  it("returns null when auth user exists but profile row is missing", async () => {
    mockAuthUser()
    mockNoProfile()
    const profile = await getUserProfile()
    expect(profile).toBeNull()
  })
})

describe("requireUser", () => {
  beforeEach(() => { vi.clearAllMocks() })

  // Scenario 1: valid session → returns user
  it("returns auth user when session is valid (scenario 1)", async () => {
    mockAuthUser("uid-valid")
    const user = await requireUser()
    expect(user.id).toBe("uid-valid")
  })

  // Scenario 2: no session → throws AuthorizationError 401
  it("throws AuthorizationError 401 when no session (scenario 2)", async () => {
    mockNoSession()
    await expect(requireUser()).rejects.toThrow(AuthorizationError)
    await expect(requireUser()).rejects.toMatchObject({ statusCode: 401 })
  })
})

describe("requireRole", () => {
  beforeEach(() => { vi.clearAllMocks() })

  // Scenario 3: correct role → allowed
  it("allows access when role matches (scenario 3)", async () => {
    mockAuthUser()
    mockProfile({ role: "reviewer" })
    const profile = await requireRole("reviewer")
    expect(profile.role).toBe("reviewer")
  })

  // Scenario 4: wrong role → throws 403 (role spoofing rejected)
  it("throws AuthorizationError 403 when role does not match (scenario 4 — role spoofing rejection)", async () => {
    mockAuthUser()
    mockProfile({ role: "inspector" }) // user is inspector, not admin
    await expect(requireRole("admin")).rejects.toThrow(AuthorizationError)
    await expect(requireRole("admin")).rejects.toMatchObject({ statusCode: 403 })
  })

  it("allows multiple roles (array overload)", async () => {
    mockAuthUser()
    mockProfile({ role: "inspector" })
    const profile = await requireRole(["inspector", "admin"])
    expect(profile.role).toBe("inspector")
  })
})

describe("requireInspector", () => {
  beforeEach(() => { vi.clearAllMocks() })

  // Scenario 5: inspector → allowed
  it("allows inspector role (scenario 5)", async () => {
    mockAuthUser()
    mockProfile({ role: "inspector" })
    const profile = await requireInspector()
    expect(profile.role).toBe("inspector")
  })

  // Scenario 6: admin → allowed (admin is super-role)
  it("allows admin role as super-role (scenario 6)", async () => {
    mockAuthUser()
    mockProfile({ role: "admin" })
    const profile = await requireInspector()
    expect(profile.role).toBe("admin")
  })

  // Scenario 7: reviewer → denied
  it("throws 403 for reviewer role (scenario 7)", async () => {
    mockAuthUser()
    mockProfile({ role: "reviewer" })
    await expect(requireInspector()).rejects.toThrow(AuthorizationError)
    await expect(requireInspector()).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe("requireReviewer", () => {
  beforeEach(() => { vi.clearAllMocks() })

  // Scenario 8: reviewer → allowed
  it("allows reviewer role (scenario 8)", async () => {
    mockAuthUser()
    mockProfile({ role: "reviewer" })
    const profile = await requireReviewer()
    expect(profile.role).toBe("reviewer")
  })

  it("allows admin as super-role for reviewer guard", async () => {
    mockAuthUser()
    mockProfile({ role: "admin" })
    const profile = await requireReviewer()
    expect(profile.role).toBe("admin")
  })
})

describe("requireAdmin", () => {
  beforeEach(() => { vi.clearAllMocks() })

  // Scenario 9: inspector → throws 403
  it("throws 403 for inspector role (scenario 9)", async () => {
    mockAuthUser()
    mockProfile({ role: "inspector" })
    await expect(requireAdmin()).rejects.toThrow(AuthorizationError)
    await expect(requireAdmin()).rejects.toMatchObject({ statusCode: 403 })
  })

  it("throws 403 for reviewer role", async () => {
    mockAuthUser()
    mockProfile({ role: "reviewer" })
    await expect(requireAdmin()).rejects.toThrow(AuthorizationError)
  })

  it("allows admin role", async () => {
    mockAuthUser()
    mockProfile({ role: "admin" })
    const profile = await requireAdmin()
    expect(profile.role).toBe("admin")
  })
})
