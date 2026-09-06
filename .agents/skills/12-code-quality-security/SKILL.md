---
name: code-quality-security
description: >-
  Code quality standards, strict TypeScript conventions, input validation, defensive security practices,
  and AI coding guidelines for the PS26034 codebase.
  Use when writing or refactoring code, adding API routes, handling user uploads,
  or reviewing pull requests for security vulnerabilities.
---

# Code Quality and Security Standards

This skill establishes coding rigor, TypeScript conventions, security guidelines, and defensive engineering practices for **SIH PS26034**.

---

## 1. The 7 AI Coding Rules

When generating or modifying code in this codebase:

1. **Inspect Before Modifying**: Always read existing files, types, and route definitions before creating new files or changing implementations.
2. **Reuse Existing Utilities**: Do not reinvent existing validation helpers, Supabase clients, or styling primitives. Reuse shared modules.
3. **Make Minimal, Targeted Changes**: Touch only lines and files required for the task. Avoid sweeping refactors or unnecessary reorganizations.
4. **Avoid Unnecessary Rewrites**: Preserve existing comments, docstrings, and architectural patterns.
5. **No Redundant Dependencies**: Do not introduce external npm packages or Python libraries without a genuine, justified requirement.
6. **Explain Significant Architectural Changes**: Discuss breaking changes or schema alterations before executing them.
7. **Run Validation Checks**: Verify code quality by running typechecks, linter, and unit tests after implementation.

---

## 2. TypeScript & Code Rigor

- **Strict Mode Enabled**: Maintain `"strict": true` in `tsconfig.json`. No usage of `any` except in temporary adapter boundaries where unavoidable and accompanied by an explanatory comment.
- **Explicit Type Annotations**: All API request/response payloads, function arguments, and return types must be explicitly typed.
- **Runtime Input Validation**: Validate all external inputs (API request bodies, query parameters, webhook payloads, file metadata) using **Zod** schemas.
- **Defensive Error Handling**: Always use `try/catch` around external I/O, database queries, and CV/OCR network calls. Return structured, sanitized error responses to clients without leaking stack traces or internal environment variables.

---

## 3. Application Security & Hardening

### File Upload & Media Protection
- **MIME Type Validation**: Whitelist permitted image formats: `image/jpeg`, `image/png`, `image/webp`. Validate both MIME type header and file magic bytes.
- **File Size Bounds**: Enforce strict file size limits (minimum $20\text{KB}$, maximum $15\text{MB}$).
- **Filename Sanitization**: Strip path traversal characters (`../`, `..\`), special characters, and shell control codes. Store files under cryptographically random UUID keys: `{inspection_id}/{uuid}.{ext}`.

### Authorization & Data Integrity
- **Prevent IDOR (Insecure Direct Object Reference)**: Every API route and database query accessing an inspection or report must verify that the requesting user owns the resource or holds `reviewer`/`admin` privileges.
- **Server-Side Role Verification**: Read roles strictly from verified JWT tokens or server-side database profiles. Never trust role flags sent in client request bodies.
- **Storage Security**: Packaging images and PDF reports must reside in private buckets. Access must be governed by short-lived signed URLs generated on the server.
- **Secret Management**:
  - Never commit `.env` or `.env.local` files containing real credentials.
  - Never prefix backend secrets (`SUPABASE_SERVICE_ROLE_KEY`, OCR API keys, OpenAI/Gemini keys) with `NEXT_PUBLIC_`.
  - Use environment variables exclusively through a validated config module (e.g., `lib/env.ts` validated via Zod).

### Content Sanitization
- Sanitize user-controlled text inputs (product names, manufacturer addresses, reviewer notes) to prevent Cross-Site Scripting (XSS).
- When generating PDF reports, escape dynamic strings to prevent template injection vulnerabilities.

---

## 4. Pre-Commit / Pre-Merge Checklist

Before committing any modification:
- [ ] TypeScript compilation succeeds with zero errors: `npm run typecheck` or `npx tsc --noEmit`.
- [ ] Linter passes with no errors: `npm run lint`.
- [ ] Unit & engine tests pass: `npm test`.
- [ ] Relevant Playwright E2E tests pass if UI or workflow changed.
- [ ] No secrets, private keys, or internal IP addresses committed.
