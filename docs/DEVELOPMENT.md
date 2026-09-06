# Local Development Guide: SIH PS26034

> **Legal Metrology Compliance System for Packaged Commodities**  
> **Core Invariant**: **The deterministic compliance engine is the final authority for compliance decisions. LLMs cannot override compliance results.**

---

## 1. Prerequisites

- **Node.js**: v20+ or v25+ (Tested on v25.9.0)
- **npm**: v10+ (Tested on 11.12.1)
- **Python**: 3.11+ (Tested on 3.13.9)
- **Git**: 2.x+

---

## 2. Quickstart

### Step 1: Environment Configuration
Copy `.env.example` to `.env.local` and populate values:
```bash
cp .env.example .env.local
```

### Step 2: Install Node Dependencies
```bash
npm install
```

### Step 3: Run Next.js Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Step 4: Run Python CV Microservice
Navigate to `cv-service/`:
```bash
cd cv-service
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Unix:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Test health endpoint:
```bash
curl http://localhost:8000/health
```

---

## 3. Scripts & Verification

| Command | Action |
|---|---|
| `npm run dev` | Starts Next.js development server at port 3000. |
| `npm run build` | Builds production Next.js application bundle. |
| `npm run lint` | Runs ESLint analysis across TypeScript files. |
| `npm run typecheck` | Validates TypeScript types strictly (`tsc --noEmit`). |
| `npm test` | Runs Vitest unit testing suite. |
| `npm run test:e2e` | Runs Playwright browser integration tests. |

---

## 4. Project Directory Map

```
src/
├── app/               # Next.js 15 App Router pages & API routes
├── components/        # UI components (shell, scanner, evidence, reporting)
├── lib/               # Utility libraries, Supabase clients, compliance engine
├── types/             # TypeScript type definitions and database interfaces
└── config/            # Environment and application constants

cv-service/            # Python / OpenCV microservice
supabase/              # Migrations, seed data, and schema definitions
tests/                 # Vitest unit tests and Playwright E2E specs
docs/                  # Architecture, development, and security manuals
```
