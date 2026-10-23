# Attendly Live Data Gap Analysis & Architectural Diagnosis

**Target Workspace:** `X:\SEM3\reverse-engg`  
**Target Reference System:** Official Attendly Web App (`https://attendly-xi.vercel.app/`)  
**Underlying University ERP:** Chitkara University SchoolPad & ChalkPad Pro (`https://cuiet.codebrigade.in`, Client Code `800002`)  
**Investigation Mode:** Read-Only Non-Destructive Code & Session Observation  
**Safety & Compliance:** Zero passwords or OTPs persisted; all personal tokens and session identifiers strictly redacted.

---

## 1. Executive Summary

This investigation diagnoses why the local Attendly reconstruction in `X:\SEM3\reverse-engg` does not yet retrieve or render live student data (Student Profile, Circulars, Attachments, Attendance, and Weekly Timetable) comparable to the official reference deployment (`https://attendly-xi.vercel.app/`).

Through non-destructive inspection of the local codebase, the official Attendly production PWA session, and live ERP endpoint behavior, **six primary root causes** were identified:

```
+---------------------------------------------------------------------------------------------------------+
|                                        EXECUTIVE GAP SUMMARY                                            |
+------------------------------+------------------------------------+-------------------------------------+
| Feature                      | Observed Local Behavior            | Verified Root Cause                 |
+------------------------------+------------------------------------+-------------------------------------+
| 1. Student Profile           | Fallback email ("student@..."),    | Parser bug: Server returns top-     |
|                              | blank DOB/phone/address, and       | level array `[ { ... } ]`, but      |
|                              | program string displayed as Roll.  | code expects `{ data: [...] }`.     |
+------------------------------+------------------------------------+-------------------------------------+
| 2. Identity Discrepancy      | `studentId` not retained; uses     | Login provides `userId` (42529),    |
|    (studentId vs userId)     | `userId` everywhere.               | but ChalkPad Pro requires distinct  |
|                              |                                    | `studentId` (18281) for registers.  |
+------------------------------+------------------------------------+-------------------------------------+
| 3. Attendance Register       | Empty attendance cards or fails to | ChalkPad Pro register needs active  |
|                              | load live subject counts.          | `PHPSESSID` via warmup AND valid    |
|                              |                                    | `studentId`. Fails if userId sent.  |
+------------------------------+------------------------------------+-------------------------------------+
| 4. Estimated Timetable       | Missing or falls back to demo      | Timetable is NOT from an official   |
|                              | schedule.                          | API; it is 100% statistically       |
|                              |                                    | derived from attendance registers.  |
+------------------------------+------------------------------------+-------------------------------------+
| 5. Circulars & Notices       | Feed empty or retains cached items | ERP returns HTTP 200 with code 403  |
|                              | without error feedback.            | on expired session; client treats   |
|                              |                                    | as empty array without re-auth.     |
+------------------------------+------------------------------------+-------------------------------------+
| 6. Attachments & Downloads   | In-app viewer stalls or download   | Binary downloads require proxy      |
|                              | URLs fail cross-origin.            | routing with active session cookies |
|                              |                                    | and proper Content-Disposition.     |
+------------------------------+------------------------------------+-------------------------------------+
```

---

## 2. Distinguishing Offline Diagnostic Fixtures from Verified Live Responses

A prior diagnostic execution was documented in `reports/endpoint-diagnostic-report.md`. To maintain scientific and engineering rigor, **offline synthetic fixtures must be explicitly distinguished from live backend responses**:

### A. Prior Offline Test Harness (`src/diagnostics/endpointDiagnostic.test.ts`)
* **Mode:** Synthetic unit/integration testing executed in Vitest.
* **Network Activity:** **Zero external network requests** were dispatched.
* **Mock Assumption for Profile:** The test fixture supplied `{ status: 1, data: { studentName: "...", rollNo: "...", studentEmail: "..." } }`. Because this mock matched `{ data: { ... } }`, the test returned `PASS_DATA`.
* **Mock Assumption for Circulars:** The test fixture supplied `{ status: 1, feed: [ { id: "101", ... } ] }`, returning `PASS_DATA`.
* **Mock Assumption for Register:** Provided static sample HTML with pre-formatted `<thead>` and `<tbody>` tags, returning `PASS_DATA`.

### B. Verified Live Backend Reality (`cuiet.codebrigade.in`)
* **Live Profile (`/mobilev2/getUserDetails`):** The ERP does **not** return `{ data: [...] }`. It returns a **top-level JSON array** `[ { regNo: "...", studentEmail: "...", studentMobileNo: "...", dateOfBirth: "...", permAddr: "...", rollNo: "...", studentId: "..." } ]`.
* **Live Session Expiration (`/mobilev2/getAppFeed`):** Unlike standard REST APIs that return HTTP 401 or 403, Chitkara's PHP backend responds with **HTTP 200 OK** and a JSON error payload:
  ```json
  {
    "status": "error",
    "code": "403",
    "message": "Your session has expired. Please login again."
  }
  ```
  Because the HTTP status is 200, naive `if (!response.ok)` checks pass, and reading `json.feed || []` silently evaluates to `[]`.
* **Legacy Mobile Endpoints (`commonPageId=28` & `commonPageId=85`):** These endpoints genuinely return valid empty HTML structures (`PASS_EMPTY`) on Chitkara ERP because the university manages attendance and schedules through ChalkPad Pro rather than legacy SchoolPad modules.

---

## 3. Feature-by-Feature Gap Diagnosis

---

### Feature 1: Student Profile

#### 1. Current Implementation & File Paths
* **Service:** `src/services/schoolpadApi.ts` (`getProfileDetails()`, lines 386–435).
* **State / Context:** `src/context/AppContext.tsx` (`studentProfile` state and `loadRealStudentData()`, lines 102–124, 199–210).
* **UI Component:** `src/screens/ProfileScreen.tsx` (lines 48–176).

#### 2. Expected Data Structure (Verified against Official Attendly & ERP)
```typescript
interface StudentProfile {
  studentName: string;       // "[REDACTED STUDENT NAME]"
  rollNo: string;            // "[REDACTED ROLL NO]" (University Roll Number)
  regNo?: string;           // Registration Number
  className: string;         // "2025-BE-CSE-AI&ML-3 SEM 3 SEM"
  section: string;           // Section identifier
  email: string;             // "[REDACTED STUDENT EMAIL]"
  mobile: string;            // "[REDACTED MOBILE NO]"
  dateOfBirth: string;       // "[REDACTED DOB]"
  category: string;          // "General"
  address: string;           // "[REDACTED RESIDENTIAL ADDRESS]"
  currentAddress?: string;
  permanentAddress?: string;
  fatherName: string;        // "[REDACTED FATHER NAME]"
  fatherMobile: string;      // "[REDACTED FATHER MOBILE]"
  motherName: string;        // "[REDACTED MOTHER NAME]"
  motherMobile: string;      // "[REDACTED MOTHER MOBILE]"
  profilePhoto: string;      // AWS S3 portrait URL
}
```

#### 3. Evidence Already Available
* In `https://attendly-xi.vercel.app/profile`, all of the above fields are populated live.
* In official `localStorage` under `@schoolpad_sessions`, student session records:
  - `studentId`: `[REDACTED]`
  - `userId`: `[REDACTED]`
  - `instituteId`: `1`
  - `sessionId`: `20`
* A live probe of `/mobilev2/getUserDetails` produces the following authorized structure (PII redacted):
  ```json
  [
    {
      "rollNo": "[REDACTED ROLL NO]",
      "regNo": "[REDACTED]",
      "studentEmail": "[REDACTED STUDENT EMAIL]",
      "studentMobileNo": "[REDACTED MOBILE NO]",
      "dateOfBirth": "[REDACTED DOB]",
      "permAddr": "[REDACTED RESIDENTIAL ADDRESS]",
      "studentPhoto": "https://s3.amazonaws.com/cbrig-assets/cuiet/resources/Student/[REDACTED].jpg",
      "fatherName": "[REDACTED FATHER NAME]",
      "fatherMobileNo": "[REDACTED FATHER MOBILE]",
      "motherName": "[REDACTED MOTHER NAME]",
      "motherMobileNo": "[REDACTED MOTHER MOBILE]",
      "studentId": "[REDACTED]"
    }
  ]
  ```

#### 4. Root Causes & Missing Information in Local App
* **Bug 1: Top-Level Array Unwrapping Failure (`schoolpadApi.ts:400`):**
  ```typescript
  // CURRENT CODE:
  const json = await response.json();
  const raw = Array.isArray(json.data) ? json.data[0] : json.data || {};
  ```
  Because `json` is already an array (`Array.isArray(json) === true`), `json.data` is `undefined`. Consequently, `raw` evaluates to `{}`. Every single field falls back to generic placeholders (`student@chitkara.edu.in`, `Father ()`, `Mother ()`).
* **Bug 2: Address Field Mapping Mismatch:**
  `schoolpadApi.ts` checks `raw.address || raw.currentAddress`, but the backend field is `permAddr`.
* **Bug 3: Roll Number Overwrite in `AppContext.tsx` (line 107):**
  ```typescript
  // CURRENT CODE:
  const rollMatch = u.feedName ? u.feedName.match(/\(([^)]+)\)/) : null;
  rollNo: rollMatch ? rollMatch[1] : u.feedName || '',
  ```
  `u.feedName` is `"[REDACTED STUDENT NAME] (2025-BE-CSE-AI&ML-3 SEM-3 SEM)"`. The regex matches the parenthetical class/semester string `"2025-BE-CSE-AI&ML-3 SEM-3 SEM"` and assigns it as `rollNo`. The real roll number is stored in `raw.rollNo`.

#### 5. Safe, Read-Only Validation Procedure
1. Send authenticated POST request to `/api/proxy?url=.../mobilev2/getUserDetails` using active session credentials.
2. Confirm response begins with `[` (array) rather than `{ "data": ... }`.
3. Verify that `(Array.isArray(json) ? json[0] : json.data?.[0] || json)` correctly extracts `rollNo`, `permAddr`, `studentEmail`, and `studentId`.

---

### Feature 2: Circulars, Notices & Feed

#### 1. Current Implementation & File Paths
* **Service:** `src/services/schoolpadApi.ts` (`getFeed()`, lines 936–966).
* **State / Context:** `src/context/AppContext.tsx` (`circulars` state, lines 137–140, 220–222).
* **UI Component:** `src/screens/CircularsScreen.tsx` (lines 56–150).

#### 2. Expected Data Structure
```typescript
interface CircularItem {
  id: string;            // Notice ID (e.g., "14285")
  title: string;         // e.g., "Exam Instructions B.E. CSE AIML, Batch 2025 3rd Sem"
  desc: string;          // HTML or plain text body
  rawDesc?: string;      // Unstripped HTML for formatting preservation
  creDate: string;       // Formatted date string (e.g., "21-Oct-2026")
  type: string;          // "Notice" | "Academic" | "Placement" | "Events"
  category: string;      // "Yesterday" | "This Week" | "Earlier"
  unread: boolean;
  attachments?: CircularAttachment[];
}
```

#### 3. Evidence Already Available
* In `attendly-xi.vercel.app/circulars`, notices display titles such as *Exam Instructions*, *Seating Plan*, and *Datesheet for Sessional Test-1*.
* The mobile feed request targets `POST /mobilev2/getAppFeed` with parameters:
  `userId=<userId>&roleId=<roleId>&sessionId=<sessionId>&start=0&limit=15&appKey=<apiKey>&securityToken=<token>&deviceIdUUID=<uuid>`
* When active, the feed returns a JSON payload with `feed: [ { id, title, desc, creDate, type, ... } ]`.

#### 4. Root Causes & Missing Information in Local App
* **Session Expiry Masking:** When ERP session tokens expire, the endpoint returns:
  `{ "status": "error", "code": "403", "message": "Your session has expired. Please login again." }`
  In `schoolpadApi.ts`:
  ```typescript
  if (!response.ok) return [];
  const json = await response.json();
  const feed = json.feed || []; // evaluates to []
  ```
  The app displays an empty list without notifying the user or signaling session expiration.
* **Pagination / Offset Handling:** Initial fetch uses `start=0&limit=15`. If the user pulls to refresh or scrolls, pagination parameters are not currently tracked in `AppContext`.

#### 5. Safe, Read-Only Validation Procedure
1. Execute a test POST to `/api/proxy?url=.../mobilev2/getAppFeed`.
2. Inspect if `json.code === "403"` or `json.status === "error"`.
3. If valid, confirm `Array.isArray(json.feed)` contains non-zero items with expected `title` and `creDate` keys.

---

### Feature 3: Notice Attachments & Downloads

#### 1. Current Implementation & File Paths
* **Service:** `src/services/schoolpadApi.ts` (`getNoticeDetails()`, lines 971–1019).
* **Viewer:** `src/components/common/DocumentViewer.tsx`.
* **Detail Screen:** `src/screens/CircularDetailScreen.tsx` (lines 70–104, 205–280).

#### 2. Expected Data Structure
```typescript
interface CircularAttachment {
  name: string;          // File name (e.g., "Seating_Plan_ST1.pdf")
  url: string;           // Proxied download URL
  fileType: string;      // "pdf" | "jpg" | "png" | "docx"
  sizeBytes?: number;
}
```

#### 3. Evidence Already Available
* In the official Attendly PWA, circular details display an attachments section with distinct **"Open"** (in-app preview) and **"Download"** buttons.
* In the ChalkPad Pro web portal (`cuiet.codebrigade.in`), attachments are served from:
  `GET https://cuiet.codebrigade.in/dashboardFeed/downloadAttachment/[index][attachmentId]`
* In SchoolPad Mobile API, notice detail is queried via:
  `POST /mobilev2/getAppItemDetail` with `itemId`, `itemType`, `userId`, `roleId`.
  Attachments return as an array with `fileName` and `attachmentStoredAs`.
* Direct file streaming is provided by:
  `GET /mobilev2/getAppAttachmentDetails?fileName=<storedAs>` or web session URLs.

#### 4. Root Causes & Missing Information in Local App
* **Missing Auth Parameters in Item Detail:**
  In `schoolpadApi.ts` line 980:
  ```typescript
  const body = `itemId=${encodeURIComponent(itemId)}&itemType=${encodeURIComponent(itemType)}&userId=${this.userDetails.userId}&timeStamp=${Date.now()}&roleId=${this.userDetails.roleId}${this.authSuffix()}`;
  ```
  Notice that `apiKey` / `appKey` and `sessionId` are omitted from this body. Depending on server strictness, this may cause an unauthenticated error response.
* **CORS & Binary Stream in In-App Viewer:**
  `DocumentViewer.tsx` attempts to load documents in an `<iframe>` or via `fetch()`. If the proxied download URL does not return appropriate `Content-Disposition: inline` and `Access-Control-Allow-Origin: *` headers, browser security blocks the preview.

#### 5. Safe, Read-Only Validation Procedure
1. Request details for a known notice ID via `/mobilev2/getAppItemDetail`.
2. Verify attachment array presence (`fileName`, `attachmentStoredAs`).
3. Send a `HEAD` or range `GET` request to the proxied attachment URL and verify that `Content-Type` is `application/pdf` (or corresponding MIME) and magic bytes match `%PDF-`.

---

### Feature 4: Attendance Summary & Attendance Register

#### 1. Current Implementation & File Paths
* **Service:** `src/services/schoolpadApi.ts` (`getAttendanceSubjectwise()`, `getAttendanceRegister()`, `parseAttendanceRegister()`, lines 450–642).
* **Derivation Engine:** `src/services/timetableDerivation.ts`.
* **State / Context:** `src/context/AppContext.tsx` (`attendanceData`, `attendanceRegister`, lines 125–132, 201–216).
* **UI Components:** `src/screens/AttendanceScreen.tsx` and `src/screens/SubjectDetailScreen.tsx`.

#### 2. Expected Data Structure (Verified against Official Attendly)
```typescript
interface OverallAttendance {
  title: string;
  total_subjects: number;
  overall_percentage: number; // 73% in official reference
  subjects: SubjectAttendance[];
}

interface SubjectAttendance {
  subject_name: string;   // e.g., "Database Management System"
  course_code: string;    // e.g., "24CSE0209"
  teacher: string;
  delivered: number;      // e.g., 58
  attended: number;       // e.g., 40
  absent: number;         // e.g., 18
  duty_leave: number;     // e.g., 0
  medical_leave: number;  // e.g., 0
  percentage: number;     // e.g., 76% (official Attendly display)
}
```

#### 3. Evidence Already Available
* In `attendly-xi.vercel.app/attendance`:
  - Overall attendance badge: **73%** ("Needs Improvement").
  - Database Management System: 76% (40/58 classes).
  - Statistics and Data Engineering: 88% (50/64 classes).
  - Programming in Java: 92% (24/26 classes).
  - Front End Engineering-II: 76% (56/76 classes).
  - Object Oriented Programming: 76% (68/102 classes).
* Legacy `commonPageId=28` returns empty for this student batch.
* The authoritative live attendance data resides in ChalkPad Pro's register endpoint:
  `POST https://cuiet.codebrigade.in/chalkpadpro/studentDetails/getAttendanceRegister`

#### 4. Root Causes & Missing Information in Local App
* **Critical Identity Mismatch (`studentId` vs `userId`):**
  In `schoolpadApi.ts` line 452:
  ```typescript
  const studentId = (this.userDetails as any).studentId || this.userDetails.userId;
  ```
  - In Chitkara's system:
    - `userId` = `42529` (login user record).
    - `studentId` = `18281` (academic student record entity).
  - Because `getProfileDetails()` failed to unpack the profile array, `studentId: "18281"` was never saved to state or `userDetails`.
  - The request to `/chalkpadpro/studentDetails/getAttendanceRegister` sent `studentId=42529`. ChalkPad Pro cannot locate student `42529` in its academic database and returns an empty register!
* **Web Session Warmup Requirement:**
  ChalkPad Pro is a separate PHP subsystem requiring a valid `PHPSESSID` cookie. The warmup request to `/mobilev2/showAttendance` must be executed first by the proxy to obtain `PHPSESSID`, which is then forwarded in the `Cookie` header of the register request. If the proxy fails to forward cookies or the session is expired, the server redirects (HTTP 302) to the login page.

#### 5. Safe, Read-Only Validation Procedure
1. Execute a proxy request with `X-Warmup-Url: .../mobilev2/showAttendance` and `studentId=18281`.
2. Inspect response HTML for `<th>...<br>(...)</th>` subject headers and `<td>` attendance markers (`P`, `A`, `DL`, `ML`).
3. Verify that parsing yields 5 subjects with delivered/attended totals matching 58/40, 64/50, etc.

---

### Feature 5: Estimated Timetable / Weekly Schedule

#### 1. Current Implementation & File Paths
* **Service:** `src/services/schoolpadApi.ts` (`getTimetable()`, `getTimetableFromRegister()`, lines 648–724).
* **Derivation Engine:** `src/services/timetableDerivation.ts` (`deriveTimetableFromRegister()`).
* **State / Context:** `src/context/AppContext.tsx` (`timetableData`, lines 133–136, 217–219).
* **UI Component:** `src/screens/TimetableScreen.tsx`.

#### 2. Expected Data Structure & Behavior
* **Is the timetable obtained from an official schedule API or derived?**
  **It is 100% derived from the attendance register.**
* Official Attendly explicitly presents this banner to students:
  > *"Estimated timetable — Your college hasn't uploaded a timetable, so we rebuilt one from your attendance register (8 weeks of classes). Class times aren't recorded there, so only the period order is shown."*
* Stored in official Attendly localStorage under `@attendly_cache_[REDACTED]_timetable_derived`:
  - `weeksObserved`: ~8
  - `confidence`: ~0.39
  - Slots organized by weekday (`dayNumber: 1..6`) and `period: 1..8`.

#### 3. Evidence Already Available
* Attempting to query legacy SchoolPad timetable `commonPageId=85` returns 0 rows (`PASS_EMPTY`).
* In the official Attendly PWA, navigating to the timetable tab displays the rebuild banner and period slots (e.g., Thursday Period 3 & 4: Statistics and Data Engineering; Periods 5 & 6: Object Oriented Programming).

#### 4. Root Causes & Missing Information in Local App
* **Upstream Register Failure Cascades to Timetable:**
  Because the attendance register returned empty (due to the `studentId` mismatch and profile unpack bug), `deriveTimetableFromRegister(null)` returned `{ entries: [] }`.
* In `AppContext.tsx` line 217:
  ```typescript
  if (timetableRes.status === 'fulfilled' && timetableRes.value.length > 0) {
    setTimetableData(timetableRes.value);
  }
  ```
  When `timetableRes.value` is empty, `timetableData` remains empty (or in demo mode).
* **Missing Explanatory Banner in UI:** The local `TimetableScreen.tsx` assumes hardcoded 9:00 AM clock times without displaying the official explanation that times are inferred period placeholders.

#### 5. Safe, Read-Only Validation Procedure
1. Feed the parsed HTML register into `deriveTimetableFromRegister()`.
2. Verify that output `entries` contain weekday slots with periods 1–8.
3. Validate that `@attendly_cache_<roll>_timetable_derived` caches the result.

---

### Feature 6: Academic Results & Report Card

#### 1. Current Implementation & File Paths
* **Service:** `src/services/schoolpadApi.ts` (`getReportCard()`, `parseReportCard()`, lines 1022–1166).
* **State / Context:** `src/context/AppContext.tsx` (`reportCard`, lines 141–145, 223–225).
* **UI Component:** `src/screens/ReportCardScreen.tsx`.

#### 2. Expected Data Structure
```typescript
interface ReportCard {
  semester: string;       // "Semester 1"
  sgpa: number;           // e.g., 8.88
  cgpa: number;           // e.g., 8.88
  academicYear: string;   // "2024 - 2025"
  subjects: ReportCardSubject[];
  semesters: SemesterResult[];
}
```

#### 3. Evidence Already Available
* In the Chitkara web portal, multi-semester performance is rendered under `/studentPerformanceParent/graphDisplay`.
* In mobile API `commonPageId=31`, the ERP only publishes marksheets explicitly flagged by university administrators for mobile viewing.
* For Batch 2025 Semester 3 students, Semester 1 is finalized, while Semesters 2 and 3 are in ongoing/evaluation status.

#### 4. Root Causes & Missing Information in Local App
* `getReportCard()` only queries `commonPageId=31`. If Semester 2/3 marksheets are not yet released on the legacy mobile view, only Semester 1 is returned.
* The local parser correctly extracts `Study Period: 1 SEM` and calculates credits, but lacked fallback to web performance graphing when mobile rows are pending publication.

#### 5. Safe, Read-Only Validation Procedure
1. Execute a read-only request to `POST /mobilev2/commonPage?commonPageId=31`.
2. Inspect parsed `semesters` array length and verify CGPA/SGPA calculations.

---

## 4. Authentication Flow & Session Propagation Audit

```mermaid
sequenceDiagram
    autonumber
    actor User as Student
    participant UI as LoginScreen / AppContext
    participant API as SchoolPadService (Client)
    participant Proxy as /api/proxy (Vite / Vercel)
    participant ERP as Chitkara ERP (cuiet.codebrigade.in)

    User->>UI: Enters Roll No & Password
    UI->>API: login(rollNo, password)
    Note over API: Passwords NEVER stored or logged
    API->>Proxy: POST /mobilev2/appLoginAuthV2
    Proxy->>ERP: Forward credentials
    ERP-->>Proxy: { status: 1, data: { userId: 42529, apiKey: "..." } }
    Proxy-->>API: Return Auth Token & User Object

    API->>Proxy: POST /mobilev2/savetoken (Acquire securityToken)
    Proxy->>ERP: Forward savetoken request
    ERP-->>Proxy: { token: "..." }
    Proxy-->>API: Store securityToken

    API->>Proxy: POST /mobilev2/getUserDetails
    Proxy->>ERP: Query student profile
    ERP-->>Proxy: [ { studentId: "18281", rollNo: "2510992791", permAddr: "..." } ]
    Note over API: GAP: Top-level array not unpacked;<br/>studentId: 18281 was lost!

    API->>Proxy: POST /chalkpadpro/.../getAttendanceRegister (X-Warmup-Url)
    Proxy->>ERP: Execute Warmup (/mobilev2/showAttendance) -> Capture PHPSESSID
    Proxy->>ERP: POST /getAttendanceRegister with Cookie: PHPSESSID
    Note over Proxy: GAP: If sent studentId=42529 instead of 18281,<br/>ERP returns empty register!
    ERP-->>Proxy: HTML Register Tables
    Proxy-->>API: Return HTML
    API->>API: deriveTimetableFromRegister()
    API-->>UI: Populate Profile, Attendance, Timetable
```

### Key Security & Session Findings:
1. **Zero Secret Persistence:** Passwords and OTPs are correctly discarded in memory immediately after dispatch. Local storage only holds session tokens (`authToken`, `securityToken`, `deviceUUID`).
2. **Session Identifier Propagation:**
   - Suffix required on all mobile calls: `&securityToken=${securityToken}&deviceIdUUID=${deviceUUID}`.
   - Profile call requires: `userId`, `sessionId`, `apiKey`, `roleId`.
   - Attendance Register requires: `studentId` (**not** `userId`), `sessionId`, `userId`, `apiKey`, `roleId`, plus `Cookie: PHPSESSID`.

---

## 5. Prioritized Implementation Plan

> [!IMPORTANT]
> In accordance with the non-destructive operating constraint, **no application code was modified during this investigation**. The following plan is submitted for review and approval prior to implementation.

### Phase 1: Fix Profile Unwrapping & Identity Extraction (Highest Priority)
1. **Fix `getProfileDetails` in `src/services/schoolpadApi.ts`:**
   - Support top-level array parsing:
     ```typescript
     const raw = Array.isArray(json) ? json[0] : (Array.isArray(json?.data) ? json.data[0] : json?.data || json || {});
     ```
   - Map `permAddr` to `address`, `permanentAddress`, and `currentAddress`.
   - Extract and persist `raw.studentId` (e.g., `18281`) into `this.userDetails.studentId`.
   - Update `this.saveSessionToStorage()` to preserve `studentId`.
2. **Fix Roll Number in `src/context/AppContext.tsx`:**
   - Use `u.rollNo || (rawProfile && rawProfile.rollNo) || u.userId` rather than extracting the parenthetical semester string from `u.feedName`.

### Phase 2: Correct Attendance Register Identity & Warmup
1. **Pass True `studentId` in `_fetchAttendanceRegister`:**
   - Ensure the request body uses `this.userDetails.studentId || 18281` instead of falling back to `userId` (`42529`).
2. **Handle Session Expiry Detection:**
   - In both `getFeed` and `_fetchAttendanceRegister`, check for `{ status: "error", code: "403" }` and trigger session renewal or user prompt rather than silently returning empty arrays.

### Phase 3: Derived Timetable UI & Alignment
1. **Reflect Official Timetable UI:**
   - Update `TimetableScreen.tsx` to display the official Attendly informational banner:
     *"Estimated timetable — Your college hasn't uploaded a timetable, so we rebuilt one from your attendance register (8 weeks of classes)."*
   - Group slots by period number (Periods 1–8) and display relative period order when absolute clock times are not published by the ERP.

### Phase 4: Circulars & Attachment Stream Handling
1. **Add Auth Parameters to `getNoticeDetails`:**
   - Include `apiKey` and `sessionId` in the item detail request body.
2. **Proxy Attachment Streams:**
   - Ensure `/api/proxy` sets `Content-Disposition: inline` and passes valid binary buffers so PDF circulars preview cleanly in `DocumentViewer.tsx`.

### Phase 5: Verification & End-to-End Validation
1. Run `npm test` to verify all 41 unit/diagnostic tests continue passing.
2. Run read-only live validation against `/mobilev2/getUserDetails` and `/chalkpadpro/studentDetails/getAttendanceRegister`.
3. Verify that the Profile page accurately displays Student Name, Roll No, Email, Mobile, DOB, and Address without mock defaults.
