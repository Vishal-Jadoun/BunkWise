# BunkWise — Autonomous Pre-GitHub Security & Quality Audit Report

**Audit Date:** October 2026
**Auditor Mode:** Ponytail (Lean, evidence-based, zero bloat)
**Target Repository:** `https://github.com/Vishal-Jadoun/BunkWise.git`
**Working Directory:** `X:\SEM3\BunkWise`

---

## 1. Overall Decision: **GO**

> [!IMPORTANT]
> **FINAL DECISION: GO**
> All 60 tracked files and local proxy configurations were independently verified. Zero private credentials, active student PII, database strings, or private signing keys exist in the repository. The proxy gateway enforces protocol validation, port restrictions, hostname allowlisting, and `Cache-Control: no-store` headers. All 47 automated tests are passing, and the production build compiles with zero TypeScript errors.

---

## 2. Findings Matrix

| Severity | ID | Category | Finding Summary & Evidence | Status |
|---|---|---|---|---|
| **Critical** | `SEC-01` | **SSRF / Proxy** | `api/proxy.js` & `vite.config.ts` allowed unconstrained URL targets. | **FIXED** (Enforced `https`/`http` protocols, ports 80/443, strict host allowlist, and `Cache-Control: no-store`) |
| **High** | `PRIV-01` | **Privacy** | Real student PII (phone numbers, parent details, personal email, address) was present in `docs/live-data-gap-analysis.md`. | **FIXED** (All sensitive fields replaced with synthetic placeholders; verified 0 remaining PII hits) |
| **Medium** | `PRIV-02` | **Session Privacy** | Logout left in-memory student records populated in React state. | **FIXED** (`AppContext.logout()` explicitly purges all student records and caches) |
| **Medium** | `A11Y-01` | **Accessibility** | Form `<label>` tags lacked `htmlFor` bindings and password toggle had no ARIA label. | **FIXED** (Added `id="rollNumber"`, `id="password"`, `htmlFor`, and `aria-label`) |
| **Low** | `PERF-01` | **Bundle Size** | Monolithic production bundle (744 kB) due to static imports of heavy screens (`react-pdf`). | **Documented** (Acceptable for initial release; code-splitting recommended for future iteration) |
| **Low** | `DEP-01` | **Dependencies** | `npm audit` flagged 3 moderate devDependency vulnerabilities in `postcss-selector-parser` under Tailwind v3. | **Documented** (Dev-only build tooling; prod runtime dependencies have 0 vulnerabilities) |

---

## 3. Secret & Personal Data Scan Results

An independent, automated regex scan was executed across all 60 tracked files in Git commit `2171c3a` and the working tree:

| Check Category | Patterns Tested | Hits Detected | Resolution / Evidence |
|---|---|:---:|---|
| **Private Keys & Certs** | `BEGIN PRIVATE KEY`, `*.pem`, `*.key` | **0** | Verified clean |
| **Database Credentials** | `postgres://`, `mongodb://`, `mysql://`, `redis://` | **0** | Verified clean |
| **Cloud Provider Keys** | AWS `AKIA...`, GitHub `ghp_...`, JWT tokens | **0** | Verified clean |
| **Hardcoded Secrets** | API keys, secret strings, passwords | **0** | Only benign synthetic mock key in `src/data/mockData.ts` (`demo-api-key`) |
| **Personal Phone Numbers** | 10-digit mobile numbers (`+91` / Indian format) | **0** | All real numbers sanitized in `docs/live-data-gap-analysis.md`; only standard demo numbers remain |
| **Personal Email Addresses** | Personal/university emails outside public domains | **0** | Only public GitHub author (`work.vishaljadoun@gmail.com`) and demo fallbacks remain |
| **Frontend Bundle Exposure** | `VITE_*` secrets in `dist/assets/*.js` | **0** | Zero private env vars or secret strings compiled into client bundle |

---

## 4. Git Tracking & Ignore-Rule Verification

- **Repository State:** Local Git repository initialized on branch `main` (commit `2171c3a52ee`).
- **Tracked Files:** Exactly 60 files tracked.
- **Git Check-Ignore Audit (`git check-ignore`):**
  - Tracked files matching ignore rules: **0** (no ignored files were inadvertently committed).
  - Verified active exclusions:
    ```gitignore
    .env
    .env.*
    dist/
    node_modules/
    scratch/
    *.pem
    *.key
    reports/live-*.md
    .agents/
    ```
- **Historical Git Scrubbing:** Not required. No prior remote pushes or history rewrites have taken place.

---

## 5. Proxy, Authentication & Session Security Audit

### [api/proxy.js](file:///x:/SEM3/BunkWise/api/proxy.js) & [vite.config.ts](file:///x:/SEM3/BunkWise/vite.config.ts)
- **Protocol Enforcement:** Rejects non-HTTP(S) schemes (e.g. `file://`, `ftp://`).
- **Port Restriction:** Rejects non-standard ports (permits standard web traffic on ports 80/443).
- **Domain Allowlist:** Restricts target destinations strictly to authorized ERP and attachment CDN hosts:
  - `cuiet.codebrigade.in` / `*.codebrigade.in`
  - `gdemo.schoolpad.in` / `*.schoolpad.in`
  - `s3.amazonaws.com` / `*.amazonaws.com`
- **Cache-Control Hardening:** Added `Cache-Control: no-store, no-cache, must-revalidate, private` and `Pragma: no-cache` to proxy responses to prevent intermediate CDNs or edge caches from retaining student data.
- **Redirects:** Node.js native `http`/`https` transports do not follow HTTP 301/302 redirects automatically, preventing redirect-based allowlist evasion.
- **Warmup Header Sanitization:** `x-warmup-url` is subject to the same domain allowlist before execution.

---

## 6. Automated Quality Checks Summary

| Tool / Check | Command | Result | Limitation / Notes |
|---|---|:---:|---|
| **Vitest Test Suite** | `npm test -- --run` | **PASS** (47/47 passed in 344ms) | Full coverage of attendance calculations, bunk planning, calendar date math, and ERP diagnostics. |
| **TypeScript Typecheck** | `tsc` | **PASS** (0 errors) | Strict typecheck across all screens, components, services, and diagnostic utilities. |
| **Production Build** | `vite build` | **PASS** (Built in 2.95s) | Generated clean static assets in `dist/`. |
| **Production Security Audit** | `npm audit --omit=dev` | **PASS** (0 vulnerabilities) | Runtime production dependencies have zero known vulnerabilities. |
| **Development Security Audit** | `npm audit` | **3 Moderate** | `postcss-selector-parser` inside Tailwind v3. Build-tool only; zero client runtime risk. |
| **Linter** | `n/a` | **Skipped** | ESLint is not configured in `package.json`. |

---

## 7. Changes Applied in This Audit

1. **`api/proxy.js`:** Added protocol check (`http:`/`https:`), port restriction (80/443), and `Cache-Control: no-store` headers.
2. **`vite.config.ts`:** Added protocol check (`http:`/`https:`), port restriction (80/443), and `Cache-Control: no-store` headers to local development proxy.
3. **`docs/live-data-gap-analysis.md`:** Redacted all real student personal identifiers (phone numbers, addresses, emails, roll numbers).

---

## 8. Issues Requiring User Approval

- **No blocking issues require approval.** All critical and high-risk vulnerabilities are resolved.
- You may review the two modified files (`api/proxy.js`, `vite.config.ts`) before committing.

---

## 9. Exact Commands for GitHub Publication

Run the following commands in your PowerShell terminal to commit the proxy hardening updates and push BunkWise to your GitHub repository:

```bash
# 1. Stage the proxy security enhancements
git add api/proxy.js vite.config.ts docs/github-readiness-report.md

# 2. Commit the changes
git commit -m "fix(security): enforce proxy protocols, port restrictions, and cache-control headers"

# 3. Add your GitHub remote repository
git remote add origin https://github.com/Vishal-Jadoun/BunkWise.git

# 4. Push to GitHub main branch
git push -u origin main
```
