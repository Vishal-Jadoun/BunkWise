# BunkWise — GitHub Readiness & Security Audit Report

**Date:** October 2026  
**Auditor Mode:** Ponytail (Lean, high-signal, zero bloat)  
**Project:** `X:\SEM3\reverse-engg`  
**Current Git Status:** Not yet initialized (`.git` does not exist; no commits or history currently tracked).

---

## 1. Executive Summary: Is BunkWise Safe to Push to GitHub?

> [!IMPORTANT]
> **VERDICT: SAFE TO INITIALIZE & PUSH AFTER USER REVIEW**  
> All real student Personal Identifying Information (PII) has been sanitized and redacted. The open forward proxy (SSRF) has been locked down with an ERP domain allowlist. New BunkWise branding, favicons, manifests, and creator credits have been integrated seamlessly.
> 
> All 47 automated tests are passing and the production build compiles with zero TypeScript errors.

---

## 2. Branding & Asset Updates

The newly supplied orange-gradient `B` with dark checkmark logo was extracted from user assets and generated across all responsive formats in `public/`:

| Asset File | Dimensions | Purpose | Status |
|---|---|---|---|
| `public/favicon.ico` | Multi-size (16, 32, 48) | Desktop browser tab icon | Generated |
| `public/favicon.png` | 32x32 | Modern PNG browser favicon | Generated |
| `public/icon-192.png` | 192x192 | PWA / Mobile Android icon | Generated |
| `public/icon-512.png` | 512x512 | High-res install icon & Open Graph preview | Generated |
| `public/apple-touch-icon.png` | 180x180 | iOS home screen icon | Generated |
| `public/bunkwise-icon.png` | 1024x1024 | Master transparent-corner squircle asset | Generated |
| `public/manifest.json` | JSON | PWA manifest defining BunkWise name, theme `#FF7A00`, and icons | Created |
| `public/robots.txt` | TXT | `User-agent: * \n Disallow: /` to block search engine indexing | Created |

### Codebase Branding Replacements

- **`index.html`:** Updated title to `BunkWise — Attendance Intelligence & Academic Companion`, replaced external Attendly icon hotlinks with local `/favicon.ico` and `/icon-192.png`, added OpenGraph metadata, and set WCAG-compliant viewport tags.
- **`package.json`:** Updated package name from `"attendly-reconstruction"` to `"bunkwise"`.
- **`src/screens/GetStartedScreen.tsx`:** Replaced generic checkmark with BunkWise logo (`/icon-192.png`), updated title to `Welcome to BunkWise`, and updated footer to `Made by Vishal (CSE'25)`.
- **`src/screens/LoginScreen.tsx`:** Replaced top checkmark pill with rounded BunkWise logo, updated prompt to `Sign in to BunkWise with your Chitkara University credentials`, and added `id`/`htmlFor` form accessibility bindings.
- **`src/screens/DashboardScreen.tsx`:** Renamed `Attendly+` to `BunkWise+`, renamed OTA notice to `BunkWise update`, fixed broken avatar fallback when photo URLs fail, and bound feedback modal inputs.
- **`src/screens/ProfileScreen.tsx`:** Renamed `Upgrade to Attendly+` to `Upgrade to BunkWise+`, fixed avatar error handling, and added creator footer credit: `Made by Vishal (CSE'25)`.
- **`src/components/layout/MobileShell.tsx`:** Added desktop status credit: `Made by Vishal (CSE'25)`.

---

## 3. GitHub Security Audit Findings

### A. Secrets, API Keys & PII Scan (Values Redacted)

A full automated scan of all workspace files was executed for credentials, tokens, session IDs, private keys, emails, and phone numbers:

1. **Real Student PII in `docs/live-data-gap-analysis.md` (RESOLVED):**
   - **Finding:** Contained real student name, roll number, university email, mobile phone number, parents' names, and parents' mobile numbers extracted during reverse-engineering probes.
   - **Remediation Applied:** All sensitive fields were replaced with synthetic placeholders (e.g., `[REDACTED STUDENT EMAIL]`, `[REDACTED MOBILE NO]`, `[REDACTED RESIDENTIAL ADDRESS]`).
   - **Credential Rotation:** Not required; no active passwords or private API keys were exposed in documentation.
2. **API Keys / Bearer Tokens in Source Code:**
   - **Finding:** `src/data/mockData.ts` contains `apiKey: 'demo-api-key'`.
   - **Assessment:** Harmless synthetic fixture for the offline demo user (Alex Johnson). Zero real keys exist in code.
3. **Chitkara ERP Session Tokens in LocalStorage:**
   - **Finding:** `src/services/schoolpadApi.ts` stores session tokens in client browser storage.
   - **Assessment:** Safe for open-source repositories because client credentials belong to individual users on their local machines. No hardcoded global tokens exist in the repo.
4. **Environment Variables:**
   - Zero production secrets are checked into code.
   - Safe template `.env.example` created with placeholder documentation.

### B. Git Ignore Hardening

A comprehensive `.gitignore` was created to guarantee that sensitive local data is never committed:

```gitignore
node_modules/
dist/
.env
.env.*
!.env.example
*.session
*.cookie
*.auth
*.token
*.pem
*.key
reports/live-*.md
reports/private-*
scratch/
```

### C. Git Tracked Files Status

- **Tracking Status:** The repository has **never been initialized with git**.
- **Impact:** Zero files or commit revisions currently exist in any git history. Therefore, **no Git history rewriting (`git filter-branch` / BFG) is required**.
- When you run `git init`, the new `.gitignore` will immediately prevent all ignored and temporary files from being staged.

### D. Proxy & Network Gateway Security

1. **SSRF & Open Proxy Neutralization (`api/proxy.js` & `vite.config.ts`):**
   - **Fix Implemented:** Enforced strict destination hostname allowlist.
   - **Permitted Hosts:** `cuiet.codebrigade.in`, `*.codebrigade.in`, `gdemo.schoolpad.in`, `*.schoolpad.in`, `s3.amazonaws.com`, `*.amazonaws.com`.
   - **Protection:** Any attempt to forward requests to localhost, cloud metadata (`169.254.169.254`), or third-party phishing domains is rejected with HTTP 403 Forbidden.
2. **In-Memory State Purge on Logout (`src/context/AppContext.tsx`):**
   - **Fix Implemented:** All student state (`studentProfile`, `attendanceData`, `attendanceRegister`, `timetableData`, `circulars`) is explicitly cleared in React memory when `logout()` is called, preventing data leakage on shared devices.

---

## 4. Verification & Build Results

### Vitest Unit & Regression Tests (`npm test -- --run`)
```text
✓ src/utils/plannerAndCalendar.test.ts (10 tests)
✓ src/utils/attendanceCalculations.test.ts (20 tests)
✓ src/diagnostics/endpointDiagnostic.test.ts (17 tests)

Test Files  3 passed (3)
     Tests  47 passed (47)
  Duration  229ms
```

### Production Build & Typecheck (`npm run build`)
```text
> bunkwise@1.0.0 build
> tsc && vite build

vite v6.4.5 building for production...
✓ 1650 modules transformed.
dist/index.html                                    1.73 kB │ gzip:   0.76 kB
dist/assets/index-CgIpTIJA.css                    51.55 kB │ gzip:   9.43 kB
dist/assets/__vite-browser-external-BIHI7g3E.js    0.03 kB │ gzip:   0.05 kB
dist/assets/index-DUNVMf0G.js                    744.28 kB │ gzip: 209.01 kB
✓ built in 2.92s
```

---

## 5. Remaining Risks & Recommendations

1. **Monolithic Bundle (744 kB):** The application bundle is currently 744 kB due to static imports of all screens and `react-pdf`. For launch optimization, code-splitting secondary screens (`/reportcard`, `/plus`) via `React.lazy` is recommended in future iterations.
2. **Feedback Form Backend:** The feedback modal now captures user text and resets cleanly. For production receipt, connect `FEEDBACK_WEBHOOK_URL` in `.env.local` or Vercel environment variables to an encrypted webhook.

---

## 6. Recommended Next Steps & Exact Git Commands

To initialize the git repository, commit the clean BunkWise codebase, and push to GitHub, run the following commands in your terminal:

```bash
# 1. Initialize git repository
git init

# 2. Stage all allowed files (respecting .gitignore)
git add .

# 3. Verify that no ignored files (.env, dist, node_modules) are staged
git status

# 4. Create the initial commit
git commit -m "feat: initial commit for BunkWise attendance platform"

# 5. Set main branch
git branch -M main

# 6. Link to your GitHub repository (replace with your repo URL)
git remote add origin https://github.com/<your-username>/bunkwise.git

# 7. Push to GitHub
git push -u origin main
```
