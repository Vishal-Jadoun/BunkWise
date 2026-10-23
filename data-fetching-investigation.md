# Attendly Data-Fetching Investigation & Architecture Report

**Target Production Site:** `https://attendly-xi.vercel.app/`  
**Local Project:** `X:\SEM3\reverse-engg`  
**ERP Backend:** SchoolPad / ChalkPad Pro (`cuiet.codebrigade.in` / Client `800002`)  
**Investigation Mode:** REA passive browser session observation + production client bundle reverse engineering

---

## 1. Executive Summary

When a student logs in to the real Attendly application (`https://attendly-xi.vercel.app/`), the application interfaces with Chitkara University's SchoolPad / ChalkPad Pro mobile ERP backend. 

The local Attendly reconstruction completed authentication (roll number + password / OTP flow), but failed to display real attendance, timetable, and subjects. The investigation identified the exact reasons for this failure:

1. **ERP Architecture Discrepancy (CommonPage vs. Register):**
   - Chitkara University students do **not** have data populated under the standard SchoolPad `commonPageId=28` (Subjectwise Attendance) or `commonPageId=85` (Direct Timetable). Calling these returns empty HTML tables.
   - Production Attendly overcomes this by querying ChalkPad Pro's attendance register endpoint (`/chalkpadpro/studentDetails/getAttendanceRegister`) and deriving both subject attendance and the weekly timetable algorithmically from raw lecture records.
2. **Proxy Session Warmup Requirement (`X-Warmup-Url`):**
   - ChalkPad Pro's `/chalkpadpro/studentDetails/getAttendanceRegister` is a web endpoint that requires an active PHP web session cookie.
   - Production Attendly sends `X-Warmup-Url` (`/mobilev2/showAttendance`) and `X-Warmup-Body` headers to its `/api/proxy`. The proxy executes the warmup request first, captures `Set-Cookie` session cookies, and forwards them in the `Cookie` header to the register endpoint.
   - The local Vite proxy (`schoolpadLocalProxy` in `vite.config.ts`) was unaware of `x-warmup-url` and never forwarded cookies.
3. **Missing Schedule Derivation (`deriveTimetableFromRegister`):**
   - Production Attendly includes a sophisticated timetable derivation engine that analyzes register lecture timestamps, detects date format (`DD-MM` vs `MM-DD`), maps periods, and infers weekly schedule slots when no official timetable is published.
   - The local codebase lacked this derivation engine.

---

## 2. Authentication & Session Architecture

### Observed Credentials & Tokens
- **Client Resolution:**
  - `POST https://gdemo.schoolpad.in/mobile/getClientDetails`
  - Body: `schoolCode=800002`
  - Response: `[{ client_abbr: "cuiet", baseUrl: "codebrigade.in" }]` -> `https://cuiet.codebrigade.in`
- **Login Request:**
  - `POST ${baseUrl}/mobilev2/appLoginAuthV2`
  - Body: `deviceIdUUID=<uuid>&device=android&txtUsername=<roll>&txtPassword=<pass>`
  - Response: Status `1` (Success) or `4` (OTP required with `userId` and `mobileString` hint).
- **OTP Verification:**
  - `POST ${baseUrl}/mobilev2/verifyOtp`
  - Body: `authUserId=<userId>&OTPText=<otp>`
  - Response: Status `1` returns user object with `apiKey` (Auth Token), `userId`, `roleId`, `sessionId`.
- **Security Token Acquisition:**
  - `POST ${baseUrl}/mobilev2/savetoken`
  - Body: `user_id=<userId>&roleId=<roleId>&clientId=800002&deviceIdUUID=<uuid>`
  - Response: `{ token: "<securityToken>" }`
- **Request Authentication Suffix:**
  All authenticated requests append:
  `&securityToken=${securityToken}&deviceIdUUID=${deviceUUID}`

### Local Storage Structure (Production Site)
The real Attendly site maintains the following keys:
- `@schoolpad_sessions`: JSON map storing `{ [rollNumber]: { base_url, user_details, security_token, device_uuid } }`.
- `@schoolpad_device_uuid`: Persistent UUID v4 identifying the device.
- `@attendly_cache_<rollNumber>_subjects`: Cached subjects array extracted from ERP.
- `@attendly_cache_<rollNumber>_timetable_derived`: Cached timetable entries inferred from attendance register observations.

---

## 3. Detailed Feature Breakdown & Observable Endpoints

### 3.1 Student Profile
- **Endpoint:** `POST ${baseUrl}/mobilev2/getUserDetails`
- **Request Body:**
  ```http
  userId=<userId>&sessionId=<sessionId>&apiKey=<apiKey>&roleId=<roleId>&securityToken=<token>&deviceIdUUID=<uuid>
  ```
- **Response Structure:**
  JSON array or object containing:
  - `studentName` / `firstName` / `name`: Student's full name.
  - `rollNo` / `regNo`: University roll number.
  - `stuClassName` / `className`: Academic program (e.g. `B.Tech CSE`).
  - `section`: Batch section (e.g. `2024-G1`).
  - `studentEmail` / `email`: Student institutional email.
  - `studentMobileNo` / `mobile`: Contact phone number.
  - `dateOfBirth` / `dob`: Date of birth.
  - `fatherName`, `fatherMobile`, `motherName`, `motherMobile`.
  - `photo` / `profilePhoto`: CDN URL to student portrait.
  - `permAddr` / `permanentAddress`: Address string.

### 3.2 Attendance Summary & Subject Breakdown
Production Attendly uses a two-tier strategy:
1. **Tier 1 (Subjectwise Common Page):**
   - **Endpoint:** `POST ${baseUrl}/mobilev2/commonPage`
   - **Body:** `commonObj=&commonPageId=28&device=android&userId=<userId>&sessionId=<sessionId>&roleId=<roleId>&securityToken=<token>&deviceIdUUID=<uuid>`
   - **Chitkara Behavior:** For Chitkara University, this endpoint returns an empty body or blank table.
2. **Tier 2 (ChalkPad Pro Attendance Register):**
   - **Warmup Request (Triggered by proxy):**
     - `POST ${baseUrl}/mobilev2/showAttendance`
     - Body: `prevNext=0&userId=<userId>&sessionId=<sessionId>&apiKey=<apiKey>&roleId=<roleId>&month=&securityToken=<token>&deviceIdUUID=<uuid>`
     - Action: Establishes ChalkPad Pro web session cookies (`PHPSESSID`).
   - **Main Data Request:**
     - `POST ${baseUrl}/chalkpadpro/studentDetails/getAttendanceRegister`
     - Body: `studentId=<studentId>&sessionId=<sessionId>&userId=<userId>&apiKey=<apiKey>&roleId=<roleId>&securityToken=<token>&deviceIdUUID=<uuid>`
     - Headers: `X-Warmup-Url` and `X-Warmup-Body` (passed through `/api/proxy`).
   - **Response Structure:**
     HTML document with `<thead>` blocks containing subject titles, lecture dates, period indices, and `<tbody>` rows with attendance status cells:
     - `P`: Present
     - `X` / `A`: Absent
     - `DL`: Duty Leave
     - `ML`: Medical Leave
     - Summary cells: Total delivered/attended (e.g. `34/38`) and percentage (`89.5%`).

### 3.3 Timetable / Weekly Schedule
Production Attendly employs fallback reconstruction:
1. **Official Timetable Attempt:**
   - **Endpoint:** `POST ${baseUrl}/mobilev2/commonPage` with `commonPageId=85`.
   - **Chitkara Behavior:** Chitkara University ERP does not publish the mobile timetable table via `commonPageId=85` for current batches.
2. **Register Schedule Derivation (`deriveTimetableFromRegister`):**
   - When `commonPageId=85` returns 0 entries, Attendly parses the attendance register from `getAttendanceRegister()`.
   - **Algorithm:**
     1. Extracts each lecture date `date` and period `period`.
     2. Discovers date format (`DD-MM` vs `MM-DD`) by evaluating consistency score across all observed lectures.
     3. Determines calendar day of the week (`0` = Sun, `1` = Mon ... `6` = Sat).
     4. Aggregates counts of `(dayNumber, period) -> courseCode`.
     5. Filters slots that have sufficient occurrences across observed academic weeks (minimum 2-3 occurrences).
     6. Infers start and end times based on periods:
        $$\text{startTime} = (9 + \text{period} - 1):00, \quad \text{endTime} = (9 + \text{period}):00$$
     7. Builds subject metadata map linking `courseCode` to full `subjectName`.
     8. Saves result in localStorage under `@attendly_cache_<rollNumber>_timetable_derived`.

### 3.4 Subjects
- **Endpoint:** `POST ${baseUrl}/mobilev2/commonPage` with `commonPageId=80`.
- **Fallback:** If `commonPageId=80` returns 0 subjects, subject codes and titles are recovered directly from the `getAttendanceRegister()` headers (`<th>Subject Name<br>(Subject Code)</th>`).

### 3.5 Circulars, Notices & Feed
- **Feed List Endpoint:** `POST ${baseUrl}/mobilev2/getAppFeed`
  - Body: `userId=<userId>&roleId=<roleId>&sessionId=<sessionId>&start=<offset>&limit=<count>&appKey=<apiKey>&securityToken=<token>&deviceIdUUID=<uuid>`
  - Response: JSON object with `feed` array containing DynamoDB-formatted items:
    - `id` / `itemId`
    - `title`
    - `desc`
    - `creDate`
    - `type` (`circular`, `planner`, `resource`)
    - `senderName`
- **Notice Detail Endpoint:** `POST ${baseUrl}/mobilev2/getAppItemDetail`
  - Body: `itemId=<id>&itemType=<type>&userId=<userId>&timeStamp=<ts>&roleId=<roleId>&securityToken=<token>&deviceIdUUID=<uuid>`
  - Response: JSON with detailed description, attachments array (`fileName`, `attachmentStoredAs`).
- **Attachment Download:** `POST ${baseUrl}/mobilev2/getAppAttachmentDetails`
  - Returns direct download URL for attached PDFs or documents.

### 3.6 Grades & Report Card
- **Endpoint:** `POST ${baseUrl}/mobilev2/commonPage` with `commonPageId=31`
- **Response Structure:** HTML table containing:
  - Header: Student Name, Roll No, Class Name.
  - `<tbody>` rows: Subject Code, Subject Name, Credits, Grade letter (`A+`, `A`, `B+`, etc.).
  - Summary row: `SGPA: <val>`, `CGPA: <val>`, `Study Period: <SEM>`.

### 3.7 Academic Sessions & Leaves
- **All Sessions:** `POST ${baseUrl}/mobilev2/getAllSession`
- **Leave Categories:** `POST ${baseUrl}/mobile/getCategoryNameApp`
- **Apply Leave:** `POST ${baseUrl}/mobile/addLeaveApp`
- **Leave History:** `POST ${baseUrl}/mobile/getLeaveDetailsApp`

---

## 4. Root Causes of Local Data-Fetching Failure

| Component | Why Local Reconstruction Failed | Production Site Resolution |
| :--- | :--- | :--- |
| **Attendance** | Local code only queried `commonPageId=28`, which Chitkara ERP leaves empty. | Uses `getAttendanceRegister()` fallback via ChalkPad Pro register endpoint. |
| **Proxy / Cookies** | Local Vite proxy in `vite.config.ts` did not support warmup requests or cookie forwarding. | Local proxy must execute `X-Warmup-Url`, capture `Set-Cookie`, and forward `Cookie` to target. |
| **Timetable** | Local code only queried `commonPageId=85`, which returned 0 entries. | Uses `deriveTimetableFromRegister()` algorithm to reconstruct weekly timetable from attendance records. |
| **Subjects** | Local code did not parse or cache recovered subjects from attendance register. | Saves extracted subjects to `@attendly_cache_<rollNumber>_subjects`. |
| **State Fallback** | `AppContext.tsx` retained mock `DEMO_*` data when `Promise.allSettled` returned empty. | Must feed real register data into `attendanceData`, `timetableData`, and `circulars`. |

---

## 5. Implementation Action Plan

1. **Update Local Vite Proxy (`vite.config.ts`):**
   Support `X-Warmup-Url` and `X-Warmup-Body` headers. Perform the warmup request to `${baseUrl}/mobilev2/showAttendance`, preserve session cookies, and forward them in the request to `${baseUrl}/chalkpadpro/studentDetails/getAttendanceRegister`.
2. **Implement Register & Derivation in `schoolpadApi.ts`:**
   - Add `getAttendanceRegister()` and `_fetchAttendanceRegister()`.
   - Add `parseAttendanceRegister()` with lecture period, date, and attendance status mapping.
   - Add `deriveTimetableFromRegister()` algorithm matching Attendly's statistical inference model.
   - Add `getSubjectsFromRegister()` and subject recovery.
   - Compute `OverallAttendance` directly from attendance register totals if `commonPageId=28` returns empty.
3. **Connect App Context (`AppContext.tsx`):**
   Ensure `loadRealStudentData()` consumes the real attendance register, derived timetable, and circulars, updating state and UI without defaulting back to mock demo data.
4. **Preserve Demo Mode:**
   Keep demo mode isolated via `isDemoMode` flag so evaluation without credentials remains functional.
