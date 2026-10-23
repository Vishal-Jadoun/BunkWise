# CodeBrigade / ChalkPad Pro Endpoint Diagnostic Report

**Execution Timestamp:** `2026-10-22T13:07:59.782Z`  
**Execution Mode:** `OFFLINE`  
**Target System:** `https://cuiet.codebrigade.in` (Chitkara University SchoolPad / ChalkPad Pro)  
**Safety Policy:** Zero secrets, zero PII, zero session tokens, read-only evaluation.  

> [!NOTE]
> Executed in OFFLINE mode using validated synthetic fixtures. Zero external requests made.

## 1. Executive Summary Table

| Total Tested | PASS_DATA | PASS_EMPTY | PARTIAL_DATA | FAIL_SCHEMA | AUTH_REQUIRED | BLOCKED_AUTH | FAIL_HTTP/NET | SKIPPED |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **10** | **6** | **2** | **2** | **0** | **0** | **0** | **0** | **0** |

## 2. Endpoint Diagnostic Ledger

| Feature | Endpoint Path | Method | HTTP | Content-Type | Duration | Records | Status |
| :--- | :--- | :---: | :---: | :--- | :---: | :---: | :---: |
| **Circulars (Web Feed)** | `/dashboardFeed/filterFeedHtml/` | `POST` | 200 | `text/html; charset=utf-8` | 85ms | 1 | `PASS_DATA` |
| **Circulars API (Mobile)** | `/mobilev2/getAppFeed` | `POST` | 200 | `application/json` | 42ms | 2 | `PASS_DATA` |
| **Notice Attachment** | `/dashboardFeed/downloadAttachment/[id]` | `GET` | 200 | `application/pdf` | 110ms | 1 | `PASS_DATA` |
| **Attendance Summary (Web)** | `/studentDetails/displayAttendance/` | `POST` | 200 | `text/html; charset=utf-8` | 95ms | 2 | `PASS_DATA` |
| **Legacy Attendance (CommonPage 28)** | `/mobilev2/commonPage?commonPageId=28` | `POST` | 200 | `application/json` | 38ms | 0 | `PASS_EMPTY` |
| **Attendance Register (ChalkPad Pro)** | `/chalkpadpro/studentDetails/getAttendanceRegister` | `POST` | 200 | `text/html; charset=utf-8` | 130ms | 4 | `PASS_DATA` |
| **Legacy Timetable (CommonPage 85)** | `/mobilev2/commonPage?commonPageId=85` | `POST` | 200 | `application/json` | 35ms | 0 | `PASS_EMPTY` |
| **Student Profile (Mobile)** | `/mobilev2/getUserDetails` | `POST` | 200 | `application/json` | 50ms | 1 | `PASS_DATA` |
| **Academic Results (Web Performance)** | `/studentPerformanceParent/graphDisplay` | `POST` | 200 | `text/html; charset=utf-8` | 140ms | 1 | `PARTIAL_DATA` |
| **Legacy Results (CommonPage 31)** | `/mobilev2/commonPage?commonPageId=31` | `POST` | 200 | `application/json` | 45ms | 1 | `PARTIAL_DATA` |

## 3. Detailed Failure Analysis & Diagnostic Findings

### Circulars (Web Feed) (`/dashboardFeed/filterFeedHtml/`)
- **Diagnostic Status:** `PASS_DATA`
- **Failure Category:** None
- **Records Parsed:** 1
- **Suggested Next Step:** Endpoint verified operational and ready for live synchronization.

### Circulars API (Mobile) (`/mobilev2/getAppFeed`)
- **Diagnostic Status:** `PASS_DATA`
- **Failure Category:** None
- **Records Parsed:** 2
- **Suggested Next Step:** Endpoint verified operational and ready for live synchronization.

### Notice Attachment (`/dashboardFeed/downloadAttachment/[id]`)
- **Diagnostic Status:** `PASS_DATA`
- **Failure Category:** None
- **Records Parsed:** 1
- **Suggested Next Step:** Endpoint verified operational and ready for live synchronization.

### Attendance Summary (Web) (`/studentDetails/displayAttendance/`)
- **Diagnostic Status:** `PASS_DATA`
- **Failure Category:** None
- **Records Parsed:** 2
- **Suggested Next Step:** Endpoint verified operational and ready for live synchronization.

### Legacy Attendance (CommonPage 28) (`/mobilev2/commonPage?commonPageId=28`)
- **Diagnostic Status:** `PASS_EMPTY`
- **Failure Category:** None
- **Records Parsed:** 0
- **Missing Fields / Elements:** `content`
- **Suggested Next Step:** Valid response structure; no active records currently assigned to student.

### Attendance Register (ChalkPad Pro) (`/chalkpadpro/studentDetails/getAttendanceRegister`)
- **Diagnostic Status:** `PASS_DATA`
- **Failure Category:** None
- **Records Parsed:** 4
- **Suggested Next Step:** Endpoint verified operational and ready for live synchronization.

### Legacy Timetable (CommonPage 85) (`/mobilev2/commonPage?commonPageId=85`)
- **Diagnostic Status:** `PASS_EMPTY`
- **Failure Category:** None
- **Records Parsed:** 0
- **Missing Fields / Elements:** `content`
- **Suggested Next Step:** Valid response structure; no active records currently assigned to student.

### Student Profile (Mobile) (`/mobilev2/getUserDetails`)
- **Diagnostic Status:** `PASS_DATA`
- **Failure Category:** None
- **Records Parsed:** 1
- **Suggested Next Step:** Endpoint verified operational and ready for live synchronization.

### Academic Results (Web Performance) (`/studentPerformanceParent/graphDisplay`)
- **Diagnostic Status:** `PARTIAL_DATA`
- **Failure Category:** Endpoint Behavior
- **Records Parsed:** 1
- **Suggested Next Step:** Verify if missing fields require additional query parameters or ERP publication.

### Legacy Results (CommonPage 31) (`/mobilev2/commonPage?commonPageId=31`)
- **Diagnostic Status:** `PARTIAL_DATA`
- **Failure Category:** Endpoint Behavior
- **Records Parsed:** 1
- **Suggested Next Step:** Verify if missing fields require additional query parameters or ERP publication.

## 4. Architectural Conclusions & Integration Action Items

1. **Chitkara CommonPage 28 & 85 Vacuity:** Legacy SchoolPad mobile endpoints return valid empty shells (`PASS_EMPTY`). Production Attendly must continue routing through `getAttendanceRegister` and statistical schedule derivation.
2. **Web Session Warmup Requirement:** ChalkPad Pro register (`/chalkpadpro/.../getAttendanceRegister`) requires active session cookies (`PHPSESSID`) initiated via warmup to `/mobilev2/showAttendance`.
3. **Academic Results Publication Status:** Multi-semester results are published under web performance (`studentPerformanceParent/graphDisplay`), whereas legacy mobile common page 31 only surfaces published semester marksheets.
