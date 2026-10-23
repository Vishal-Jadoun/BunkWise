# Attendly Pre-Launch Quality & Security Audit

**Target Project:** `X:\SEM3\reverse-engg`  
**Date:** October 2026  
**Auditor Mode:** Ponytail (Lean, high-signal, smallest viable fixes)  
**Verification Baseline:** Vitest 47/47 tests passing | Production build verified (`tsc && vite build`: 744.00 kB JS, 29.21 kB CSS)

---

## Executive Summary

Attendly's core attendance calculations, subject register parsing, and dark/light UI are well-engineered, robust, and verified by 47 automated tests. However, **before public launch to students**, several vulnerabilities and reliability gaps must be resolved:

1. **Critical:** The Vercel serverless proxy (`api/proxy.js`) and Vite local proxy are open proxies with no destination allowlisting, creating a severe Server-Side Request Forgery (SSRF) and abuse risk.
2. **High:** Unencrypted authentication tokens and full student PII are stored indefinitely in `localStorage`.
3. **High:** ERP session expirations return HTTP 200 with error JSON, which the app currently swallows as empty data without prompting re-login.
4. **High:** The single entry bundle is 744 kB because heavy PDF libraries and all 12 screens are statically loaded together.
5. **High:** No `robots.txt` or `noindex` tag exists, allowing authenticated student tools to be crawled.
6. **Medium:** The feedback modal in the dashboard is non-functional (uncontrolled input, discards feedback).

No architecture rewrites or UI redesigns are needed. All findings have minimal, drop-in fixes.

---

## Prioritized Findings Matrix

| ID | Severity | Category | Finding Summary | File Reference |
|---|---|---|---|---|
| **SEC-01** | **Critical** | Security | Open Forward Proxy & SSRF Vulnerability | `api/proxy.js:53-97`, `vite.config.ts:54-155` |
| **SEC-02** | **High** | Privacy | Unencrypted Tokens & Student PII in LocalStorage | `src/services/schoolpadApi.ts:94-109` |
| **REL-01** | **High** | Reliability | Silent Session Expiry Masked as Empty Records | `src/services/schoolpadApi.ts:978-994`, `AppContext.tsx:215-230` |
| **PERF-01** | **High** | Performance | Monolithic 744 kB Bundle / Zero Route Code-Splitting | `src/App.tsx:5-16`, `vite.config.ts` |
| **SEO-01** | **High** | SEO | Missing Search Engine Exclusion (`robots.txt` / `noindex`) | `index.html:1-21`, `public/` |
| **SEC-03** | **Medium** | Privacy | Incomplete In-Memory State Purge on Logout | `src/context/AppContext.tsx:322-331` |
| **SEC-04** | **Medium** | Privacy | External Asset & Google Staging Hotlinking | `index.html:8-9`, `GetStartedScreen.tsx:39` |
| **REL-02** | **Medium** | Reliability | Infinite Hanging Due to Missing Request Timeouts | `src/services/schoolpadApi.ts` (all 13 `fetch` calls) |
| **REL-03** | **Medium** | Reliability | Missing 404 Route Fallback | `src/App.tsx:61-64` |
| **PERF-02** | **Medium** | Reliability | Broken Avatar Image Fallback on Load Error | `DashboardScreen.tsx:90-103`, `ProfileScreen.tsx:56-69` |
| **A11Y-01** | **Medium** | Accessibility | Missing Form Labels (`htmlFor`), ARIA & Keyboard Handlers | `LoginScreen.tsx:170-202`, `AttendanceScreen.tsx:203` |
| **FEED-01** | **Medium** | Feedback | Dashboard Feedback Form Discards Submissions | `DashboardScreen.tsx:574-586` |
| **SEC-05** | **Low** | Security | Missing HTTP Security Hardening Headers | `vercel.json:1-6` |
| **SEC-06** | **Low** | Hygiene | Missing Root `.gitignore` | Project Root |
| **A11Y-02** | **Low** | Accessibility | Viewport Pinch-to-Zoom Disabled (`maximum-scale=1.0`) | `index.html:5` |
| **SEO-02** | **Low** | SEO | Static Document Titles Across Routes | `index.html:10`, `src/App.tsx` |

---

## Detailed Findings & Minimal Fixes

### 1. Security and Privacy

#### [SEC-01] Critical: Open Forward Proxy & SSRF Vulnerability
* **Evidence:** `api/proxy.js:53-97` and `vite.config.ts:54-155`
  ```js
  const targetUrl = req.query.url;
  // ... directly calls transport.request(targetUrl) with Access-Control-Allow-Origin: *
  ```
  The endpoint accepts any arbitrary URL passed via `?url=` without hostname validation.
* **Impact:** 
  1. Attackers can abuse Vercel compute as an open anonymous forward proxy for arbitrary HTTP scraping or phishing.
  2. Potential Server-Side Request Forgery (SSRF) against cloud metadata endpoints (`http://169.254.169.254/`) or internal network services.
* **Minimal Proposed Fix:**
  Add a strict hostname allowlist in `api/proxy.js` and `vite.config.ts`. Reject unauthorized hosts with HTTP 403:
  ```js
  const ALLOWED_HOSTS = new Set(['cuiet.codebrigade.in', 'gdemo.schoolpad.in', 's3.amazonaws.com']);
  try {
    const parsed = new URL(targetUrl);
    if (!ALLOWED_HOSTS.has(parsed.hostname) && !parsed.hostname.endsWith('.codebrigade.in') && !parsed.hostname.endsWith('.schoolpad.in')) {
      return res.status(403).json({ error: 'Target host not permitted' });
    }
  } catch {
    return res.status(400).json({ error: 'Malformed target URL' });
  }
  ```

#### [SEC-02] High: Plaintext Storage of Session Tokens and PII in LocalStorage
* **Evidence:** `src/services/schoolpadApi.ts:94-109`
  ```ts
  localStorage.setItem('attendly_session_cache', JSON.stringify({
    baseUrl: this.baseUrl,
    userDetails: this.userDetails,
    authToken: this.authToken,
    securityToken: this.securityToken,
    deviceUUID: this.deviceUUID,
  }));
  ```
* **Impact:** `localStorage` persists across browser sessions and is accessible to any script in the origin. If an XSS vulnerability occurs or a third-party dependency is compromised, student authentication credentials, session IDs, and personal information (roll number, email, mobile, parent details) can be exfiltrated.
* **Minimal Proposed Fix:**
  Move session authentication data (`authToken`, `securityToken`, `userDetails`) to `sessionStorage` so tokens auto-purge when the browser tab closes. Restrict `localStorage` strictly to non-sensitive user preferences (`theme`, `schoolCode`, `targetPercentage`).

#### [SEC-03] Medium: Incomplete In-Memory State Purge on Logout
* **Evidence:** `src/context/AppContext.tsx:322-331`
  ```ts
  const logout = () => {
    schoolPadApi.logout();
    setIsLoggedIn(false);
    setIsDemoMode(false);
    setUserData(null);
    setReportCard(null);
    // studentProfile, attendanceData, attendanceRegister, timetableData, circulars are NOT reset!
    navigate('/auth/get-started');
  };
  ```
* **Impact:** On shared devices (e.g. mobile borrowed from a classmate or university lab PC), if a student logs out and another student uses the browser or hits back, the previous student's photo, subjects, attendance percentages, and notices remain in React memory.
* **Minimal Proposed Fix:**
  Reset all cached records in `AppContext.logout()`:
  ```ts
  setStudentProfile(INITIAL_PROFILE);
  setAttendanceData(null);
  setAttendanceRegister(null);
  setTimetableData(null);
  setCirculars([]);
  ```

#### [SEC-04] Medium: Hotlinking Third-Party and Staging Assets
* **Evidence:**
  - `index.html:8-9`: Hotlinks favicon and Apple touch icon directly to `https://attendly-xi.vercel.app/`.
  - `src/screens/GetStartedScreen.tsx:39`: Loads hero image from Google staging URL (`https://lh3.googleusercontent.com/aida-public/...`).
* **Impact:**
  - Leaks user IP address and referrer to third-party endpoints on initial page load.
  - The Google staging CDN URL is volatile; if removed, the landing hero image breaks.
* **Minimal Proposed Fix:**
  Place `icon-192.png`, `apple-touch-icon.png`, and `hero.png` directly inside the `/public/` directory and reference them locally via `/icon-192.png` and `/hero.png`.

#### [SEC-05] Low: Missing HTTP Security Hardening Headers
* **Evidence:** `vercel.json:1-6` only defines rewrites without security headers.
* **Impact:** Missing `X-Frame-Options` and `X-Content-Type-Options` leaves the web app susceptible to clickjacking within external iframes.
* **Minimal Proposed Fix:**
  Add standard security headers in `vercel.json`:
  ```json
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
  ```

#### [SEC-06] Low: Missing `.gitignore` File in Repository Root
* **Evidence:** No `.gitignore` exists at `x:\SEM3\reverse-engg\.gitignore`.
* **Impact:** Risk of accidentally committing `.env`, build directories (`dist/`), diagnostic logs, or dependencies into version control.
* **Minimal Proposed Fix:**
  Create `.gitignore` containing `node_modules/`, `dist/`, `.env*`, and `.DS_Store`.

---

### 2. Reliability & Resilience

#### [REL-01] High: ERP Session Expiry Masked as Empty Data
* **Evidence:** `src/services/schoolpadApi.ts:978, 1014` & `AppContext.tsx:215-230`
  Chitkara/SchoolPad ERP returns an HTTP 200 with `{ "status": "error", "code": "403", "message": "Your session has expired. Please login again." }` when tokens lapse.
  `schoolpadApi.ts` methods only check `if (!response.ok) return [];`, so the error response is treated as empty data.
* **Impact:** Students with expired sessions see completely empty attendance registers, blank circulars, and zero subjects with no explanation or re-login trigger.
* **Minimal Proposed Fix:**
  In `schoolpadApi.ts`, add a response validator helper:
  ```ts
  if (json && (json.status === 'error' || json.code === '403' || json.message?.includes('session has expired'))) {
    this.logout();
    throw new Error('SESSION_EXPIRED');
  }
  ```
  In `AppContext.tsx`, catch `SESSION_EXPIRED` and trigger `logout()` with an informative banner: `"Your session expired. Please sign in again."`

#### [REL-02] Medium: Indefinite Request Hanging (Missing Timeouts)
* **Evidence:** None of the 13 `fetch()` calls in `src/services/schoolpadApi.ts` supply an `AbortSignal`.
* **Impact:** During campus peak registration or ERP downtimes, requests can hang indefinitely, locking the UI into permanent loading skeletons.
* **Minimal Proposed Fix:**
  Attach an `AbortSignal.timeout(12000)` (12 seconds) to all `fetch` requests in `schoolpadApi.ts`, catching `TimeoutError` and displaying a retry button.

#### [REL-03] Medium: Missing 404 Route Fallback
* **Evidence:** `src/App.tsx:61-64`
  ```tsx
  case '/':
  default:
    return <DashboardScreen />;
  ```
* **Impact:** Any invalid or broken URL (e.g. `/unknown`, `/attendance/invalid-code`) silently falls back to `DashboardScreen` without alerting the user that the resource does not exist.
* **Minimal Proposed Fix:**
  Add a minimal `<NotFoundScreen />` for unrecognized routes when logged in, with a clean button returning to `"Home"`.

#### [REL-04] Low: Silent Empty States on Network Drop
* **Evidence:** `AttendanceScreen.tsx:203-306`
  When `subjects.length === 0`, the screen displays `Subject-wise Attendance (0)` with blank white/dark space.
* **Impact:** Users cannot distinguish between "No classes scheduled yet" and a failed network fetch.
* **Minimal Proposed Fix:**
  Render a lightweight empty state box with a "Refresh" button when `subjects.length === 0` and `!isLoading`.

---

### 3. Performance & Accessibility

#### [PERF-01] High: Monolithic 744 kB Bundle / Zero Code-Splitting
* **Evidence:** `src/App.tsx:5-16` statically imports all 12 screens. Production build generates a single 744 kB chunk (`dist/assets/index-D4VtLwo7.js`).
* **Impact:** Mobile users on 3G/4G connections must download PDF viewers (`react-pdf`) and screens they might not use (`ReportCardScreen`, `PlusScreen`, `LeaveScreen`) before initial render.
* **Minimal Proposed Fix:**
  1. Use `React.lazy()` and `<Suspense>` in `App.tsx` for secondary screens:
     ```tsx
     const ReportCardScreen = React.lazy(() => import('./screens/ReportCardScreen'));
     const CircularDetailScreen = React.lazy(() => import('./screens/CircularDetailScreen'));
     const PlusScreen = React.lazy(() => import('./screens/PlusScreen'));
     const LeaveScreen = React.lazy(() => import('./screens/LeaveScreen'));
     ```
  2. In `vite.config.ts`, split vendor chunks:
     ```ts
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             pdf: ['react-pdf'],
             icons: ['lucide-react']
           }
         }
       }
     }
     ```

#### [PERF-02] Medium: Broken Profile Avatar Fallback
* **Evidence:** `src/screens/DashboardScreen.tsx:90-103` and `src/screens/ProfileScreen.tsx:56-69`:
  ```tsx
  {studentProfile.profilePhoto ? (
    <img
      src={studentProfile.profilePhoto}
      alt={studentProfile.studentName}
      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
    />
  ) : (
    <span>{studentProfile.studentName?.charAt(0) || 'S'}</span>
  )}
  ```
* **Impact:** If `profilePhoto` fails to load (e.g. S3 expired URL, offline, or blocked), hiding the `img` does NOT trigger the `<span>` fallback because `profilePhoto` string is still truthy. The student sees an empty blank circle.
* **Minimal Proposed Fix:**
  Add a simple image error state:
  ```tsx
  const [photoError, setPhotoError] = useState(false);
  // Render:
  {studentProfile.profilePhoto && !photoError ? (
    <img src={studentProfile.profilePhoto} onError={() => setPhotoError(true)} ... />
  ) : (
    <span>{studentProfile.studentName?.charAt(0) || 'S'}</span>
  )}
  ```

#### [A11Y-01] Medium: Form Label & Keyboard Navigation Gaps
* **Evidence:**
  - `src/screens/LoginScreen.tsx:170-202`: `<label>` tags have no `htmlFor` matching input `id` attributes.
  - Password visibility toggle (`<button>`) has no `aria-label`.
  - Subject cards in `AttendanceScreen.tsx:220` use `<div onClick={...}>` without `role="button"`, `tabIndex={0}`, or keyboard `onKeyDown` listeners.
* **Impact:** Screen readers cannot associate form fields with labels. Non-pointer / keyboard navigation cannot activate subject cards.
* **Minimal Proposed Fix:**
  - Add `id="rollNumber"` and `id="password"` to inputs and matching `htmlFor` to labels.
  - Add `aria-label="Toggle password visibility"` to the eye button.
  - Add `role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(...) }` to custom clickable cards.

#### [A11Y-02] Low: Pinch-to-Zoom Disabled on Mobile
* **Evidence:** `index.html:5` specifies `maximum-scale=1.0, user-scalable=no`.
* **Impact:** Violates WCAG 1.4.4. Students with visual impairments cannot zoom into dense timetable rows or attendance tables.
* **Minimal Proposed Fix:**
  Change viewport meta tag to standard: `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />`.

---

### 4. Search Engine Optimization (SEO) & Indexing

#### [SEO-01] High: Missing Search Exclusion (`robots.txt` / `noindex`)
* **Evidence:** No `public/robots.txt` file exists; `index.html` lacks `<meta name="robots" content="noindex, nofollow" />`.
* **Impact:** Public search engines will crawl and index application paths, demo screens, and potentially cached UI states. Because Attendly handles private student data and is an authenticated utility, indexing is counterproductive and risks exposing routes.
* **Minimal Proposed Fix:**
  1. Create `public/robots.txt`:
     ```text
     User-agent: *
     Disallow: /
     ```
  2. Add to `index.html`:
     ```html
     <meta name="robots" content="noindex, nofollow" />
     ```

#### [SEO-02] Low: Static Title & Missing Social Open Graph Tags
* **Evidence:** `index.html:10` hardcodes `<title>Attendly</title>`.
* **Impact:** All screens have the identical browser tab title. When students share links to the login page on WhatsApp or Telegram, no preview card is generated.
* **Minimal Proposed Fix:**
  Add standard Open Graph meta tags (`og:title`, `og:description`, `og:image`) to `index.html`, and dynamically update `document.title` on screen transition (e.g., `Attendance · Attendly`).

---

### 5. Monitoring & Error Tracking

#### Assessment of Need
* University ERP integrations frequently fail due to captcha changes, network timeouts, and sudden session invalidation. Real-time error visibility is valuable.
* **Strict Constraint:** No third-party script should ever capture student passwords, OTPs, attendance records, roll numbers, or marks.

#### Recommendation
1. **Do NOT add Google Analytics or Full-Session Replay (Hotjar, LogRocket, FullStory):** These capture DOM contents and input values, violating student privacy.
2. **Recommended Privacy-Preserving Option:**
   - **Option A (Zero-Telemetry, Preferred for Pre-Launch):** Keep local `ErrorBoundary` with clean user-facing recovery and no external tracking.
   - **Option B (Privacy-Scrubbed Sentry):** If crash monitoring is desired, use Sentry with `beforeSend`:
     ```ts
     beforeSend(event) {
       // Strip all student PII, roll numbers, and proxy URLs
       delete event.user;
       if (event.request?.url?.includes('/api/proxy')) {
         event.request.url = '/api/proxy';
       }
       return event;
     }
     ```

---

### 6. Contact and Feedback

#### Assessment
* **Evidence:** `src/screens/DashboardScreen.tsx:574-586` renders a feedback modal with a `<textarea>` and `"Submit Feedback"` button.
  ```tsx
  <textarea placeholder="Share a suggestion or report an issue..." ... />
  <button onClick={() => setFeedbackSent(true)}>Submit Feedback</button>
  ```
  The textarea has no state binding (`value` is uncontrolled), and clicking submit only calls `setFeedbackSent(true)`. The user's feedback is completely discarded.
* **Backend Status:** The existing backend (`api/proxy.js`) is an HTTP proxy only. There is no database or mail transport to store submissions.

#### Recommendation
* Students will need a reliable way to report inaccurate attendance calculations or missing subjects during launch week.
* **Minimal Proposed Fix:**
  - Create a lightweight serverless handler (`api/feedback.js`) that forwards user feedback text and app version to an encrypted Discord/Telegram webhook or Formspree endpoint via an environment variable.
  - **Privacy Guarantee:** Submissions must only contain the user's feedback text and app version; never include roll numbers, tokens, or marks.

---

## Verification & Test Results

```text
✓ Vitest Test Suite (npm test):
  - src/diagnostics/attendanceCalculations.test.ts (24 tests) -> PASS
  - src/diagnostics/endpointDiagnostic.test.ts (11 tests) -> PASS
  - src/diagnostics/plannerAndCalendar.test.ts (12 tests) -> PASS
  Total: 47 passed (1.61s)

✓ Production Build (npm run build):
  - vite v5.4.14 building for production...
  - dist/index.html                   0.97 kB │ gzip:   0.50 kB
  - dist/assets/index-B7Vj4F-h.css   29.21 kB │ gzip:   5.74 kB
  - dist/assets/index-D4VtLwo7.js   744.00 kB │ gzip: 209.03 kB
  Build completed successfully in 5.27s.
```

---

## Action Plan: Recommended Implementation Order

1. **Step 1 (Security - Day 1):** Fix SSRF proxy vulnerability (`SEC-01`) and move session credentials from `localStorage` to `sessionStorage` (`SEC-02`).
2. **Step 2 (SEO & Privacy - Day 1):** Add `public/robots.txt` and `noindex` meta tag (`SEO-01`).
3. **Step 3 (Reliability - Day 2):** Add ERP session-expired handling (`REL-01`) and request timeouts (`REL-02`).
4. **Step 4 (Performance & A11y - Day 2):** Lazy-load heavy screens, split vendor chunks (`PERF-01`), fix broken avatar fallback (`PERF-02`), and fix accessibility labels (`A11Y-01`).
5. **Step 5 (Feedback - Day 3):** Wire up the dashboard feedback form to a secure, privacy-preserving endpoint (`FEED-01`).
