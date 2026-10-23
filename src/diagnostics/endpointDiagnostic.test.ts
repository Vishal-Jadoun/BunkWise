import { describe, it, expect } from 'vitest';
import {
  evaluateEndpointResponse,
  CODEBRIGADE_ENDPOINTS,
  isLoginPageOrSessionExpired,
  validateAttendanceSummaryWebHtml,
  validateAttendanceRegisterHtml,
  validateStudentProfileJson,
  validateAcademicResultsContent,
  validateAttachmentBinary,
} from './diagnosticEngine';

describe('Endpoint Diagnostic Engine - Multi-Level Offline Fixture Tests', () => {
  const circularsJsonSpec = CODEBRIGADE_ENDPOINTS.find((e) => e.id === 'circulars_mobile')!;
  const circularsWebSpec = CODEBRIGADE_ENDPOINTS.find((e) => e.id === 'circulars_web')!;
  const attendanceSummarySpec = CODEBRIGADE_ENDPOINTS.find((e) => e.id === 'attendance_web')!;
  const attendanceRegisterSpec = CODEBRIGADE_ENDPOINTS.find((e) => e.id === 'attendance_register')!;
  const profileSpec = CODEBRIGADE_ENDPOINTS.find((e) => e.id === 'student_profile')!;
  const resultsWebSpec = CODEBRIGADE_ENDPOINTS.find((e) => e.id === 'academic_results_web')!;

  // 1. Valid non-empty JSON
  it('Fixture 1: Valid non-empty JSON returns PASS_DATA', () => {
    const validFeedJson = JSON.stringify({
      status: 1,
      feed: [
        { id: '101', title: 'Mid-term Seating Plan', creDate: '2026-10-22', type: 'circular' },
        { id: '102', title: 'Holiday Notification', creDate: '2026-10-21', type: 'circular' },
      ],
    });

    const res = evaluateEndpointResponse(
      circularsJsonSpec,
      200,
      'application/json',
      validFeedJson,
      45,
      null,
      false
    );

    expect(res.status).toBe('PASS_DATA');
    expect(res.recordCount).toBe(2);
    expect(res.isEmpty).toBe(false);
    expect(res.failureCategory).toBe('None');
  });

  // 2. Valid but empty JSON
  it('Fixture 2: Valid but empty JSON returns PASS_EMPTY', () => {
    const emptyFeedJson = JSON.stringify({
      status: 1,
      feed: [],
    });

    const res = evaluateEndpointResponse(
      circularsJsonSpec,
      200,
      'application/json',
      emptyFeedJson,
      30,
      null,
      false
    );

    expect(res.status).toBe('PASS_EMPTY');
    expect(res.recordCount).toBe(0);
    expect(res.isEmpty).toBe(true);
    expect(res.failureCategory).toBe('None');
  });

  // 3. Valid HTML with expected records
  it('Fixture 3: Valid HTML with expected attendance records returns PASS_DATA', () => {
    const validAttendanceHtml = `
      <html>
        <body>
          <div class="attendance-table">
            <p>Database Management System 24CSE0209 Teacher: Dr. Sharma From: 01 Aug 2026 TO: 22 Oct 2026 Delivered: 58 Attended: 48 Absent: 10 DL: 4 ML: 4 Total Percentage: 82.8% Total Approved DL: 4 Total Approved ML: 4</p>
            <p>Operating Systems 24CSE0208 Teacher: Prof. Verma From: 01 Aug 2026 TO: 22 Oct 2026 Delivered: 42 Attended: 38 Absent: 4 DL: 0 ML: 0 Total Percentage: 90.5% Total Approved DL: 0 Total Approved ML: 0</p>
          </div>
        </body>
      </html>
    `;

    const res = evaluateEndpointResponse(
      attendanceSummarySpec,
      200,
      'text/html; charset=utf-8',
      validAttendanceHtml,
      60,
      null,
      false
    );

    expect(res.status).toBe('PASS_DATA');
    expect(res.recordCount).toBe(2);
    expect(res.isEmpty).toBe(false);
  });

  // 4. Empty HTML tables
  it('Fixture 4: Empty HTML tables return PASS_EMPTY', () => {
    const emptyTableHtml = `
      <html>
        <body>
          <table class="table-attendance">
            <thead><tr><th>Subject</th><th>Delivered</th><th>Attended</th></tr></thead>
            <tbody></tbody>
          </table>
          <p>No records found for current semester.</p>
        </body>
      </html>
    `;

    const res = evaluateEndpointResponse(
      attendanceSummarySpec,
      200,
      'text/html',
      emptyTableHtml,
      40,
      null,
      false
    );

    expect(res.status).toBe('PASS_EMPTY');
    expect(res.recordCount).toBe(0);
  });

  // 5. HTML login page returned with HTTP 200 (Critical Detection)
  it('Fixture 5: HTML login page with HTTP 200 is classified as AUTH_REQUIRED', () => {
    const loginPageHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Chitkara ERP Login</title></head>
        <body>
          <form name="loginManager" id="loginManager" action="/loginManager/checkLogin" method="POST">
            <h2>Login to your account</h2>
            <input type="text" name="txtUsername" placeholder="Roll Number" />
            <input type="password" name="txtPassword" />
            <button type="submit">Sign In</button>
          </form>
        </body>
      </html>
    `;

    expect(isLoginPageOrSessionExpired(loginPageHtml, 200)).toBe(true);

    const res = evaluateEndpointResponse(
      attendanceRegisterSpec,
      200,
      'text/html',
      loginPageHtml,
      50,
      null,
      false
    );

    expect(res.status).toBe('AUTH_REQUIRED');
    expect(res.failureCategory).toBe('Authentication');
    expect(res.recordCount).toBe(0);
  });

  // 6. HTTP 302 login redirects
  it('Fixture 6: HTTP 302 redirect is classified as AUTH_REQUIRED', () => {
    const res = evaluateEndpointResponse(
      attendanceRegisterSpec,
      302,
      'text/html',
      'Redirecting to /loginManager...',
      25,
      null,
      false
    );

    expect(res.status).toBe('AUTH_REQUIRED');
    expect(res.failureCategory).toBe('Authentication');
  });

  // 7. HTTP 401 and 403 responses
  it('Fixture 7: HTTP 401 and 403 responses are classified as AUTH_REQUIRED', () => {
    const res401 = evaluateEndpointResponse(
      profileSpec,
      401,
      'application/json',
      JSON.stringify({ error: 'Unauthorized request' }),
      20,
      null,
      false
    );
    expect(res401.status).toBe('AUTH_REQUIRED');

    const res403 = evaluateEndpointResponse(
      profileSpec,
      403,
      'application/json',
      JSON.stringify({ error: 'Forbidden' }),
      20,
      null,
      false
    );
    expect(res403.status).toBe('AUTH_REQUIRED');
  });

  // 8. HTTP 500 responses
  it('Fixture 8: HTTP 500 responses are classified as FAIL_HTTP', () => {
    const res500 = evaluateEndpointResponse(
      circularsJsonSpec,
      500,
      'application/json',
      JSON.stringify({ error: 'Internal Server Error' }),
      80,
      null,
      false
    );

    expect(res500.status).toBe('FAIL_HTTP');
    expect(res500.httpStatus).toBe(500);
    expect(res500.failureCategory).toBe('Endpoint Behavior');
  });

  // 9. Invalid JSON
  it('Fixture 9: Invalid JSON returns FAIL_SCHEMA with parser message', () => {
    const malformedJson = '{ "status": 1, "feed": [ { id: 101, title: unquoted_value } ';

    const res = evaluateEndpointResponse(
      circularsJsonSpec,
      200,
      'application/json',
      malformedJson,
      35,
      null,
      false
    );

    expect(res.status).toBe('FAIL_SCHEMA');
    expect(res.failureCategory).toBe('Response Parsing');
    expect(res.parsingErrors[0]).toContain('JSON/HTML parsing exception');
  });

  // 10. Unexpected content types
  it('Fixture 10: Unexpected Content-Type returns FAIL_SCHEMA', () => {
    const textInsteadOfJson = 'Hello raw text message without json';

    const res = evaluateEndpointResponse(
      circularsJsonSpec,
      200,
      'text/html; charset=iso-8859-1',
      textInsteadOfJson,
      30,
      null,
      false
    );

    expect(res.status).toBe('FAIL_SCHEMA');
    expect(res.parsingErrors[0]).toContain('Expected application/json');
  });

  // 11. Missing required fields in profile
  it('Fixture 11: Missing required fields in profile returns PARTIAL_DATA', () => {
    const incompleteProfile = {
      status: 1,
      data: {
        studentName: 'Student Name',
        // rollNo is missing!
        // email is missing!
        className: 'B.Tech CSE',
      },
    };

    const details = validateStudentProfileJson(incompleteProfile);
    expect(details.isPartial).toBe(true);
    expect(details.missingFields).toContain('rollNo');
    expect(details.missingFields).toContain('email');

    const res = evaluateEndpointResponse(
      profileSpec,
      200,
      'application/json',
      JSON.stringify(incompleteProfile),
      35,
      null,
      false
    );

    expect(res.status).toBe('PARTIAL_DATA');
    expect(res.missingFields).toContain('rollNo');
  });

  // 12. Malformed attendance rows
  it('Fixture 12: Malformed attendance rows report parsing error', () => {
    const malformedRowHtml = `
      <p>Data Structures 24CSE0301 Teacher: Dr. Sharma From: 01 Aug 2026 TO: 22 Oct 2026 Delivered: -5 Attended: 50 Absent: 10</p>
    `;

    const details = validateAttendanceSummaryWebHtml(malformedRowHtml);
    expect(details.parsingErrors.length).toBeGreaterThan(0);
    expect(details.parsingErrors[0]).toContain('Inconsistent attendance counts');
  });

  // 13. Request timeouts
  it('Fixture 13: Request timeouts are classified as FAIL_TIMEOUT', () => {
    const res = evaluateEndpointResponse(
      circularsWebSpec,
      null,
      '',
      '',
      10005,
      'timeout',
      false
    );

    expect(res.status).toBe('FAIL_TIMEOUT');
    expect(res.failureCategory).toBe('Network/Transport');
  });

  // 14. Network errors
  it('Fixture 14: Network/proxy errors are classified as FAIL_NETWORK', () => {
    const res = evaluateEndpointResponse(
      circularsWebSpec,
      null,
      '',
      '',
      50,
      'network',
      false
    );

    expect(res.status).toBe('FAIL_NETWORK');
    expect(res.failureCategory).toBe('Network/Transport');
  });

  // 15. Partial semester results
  it('Fixture 15: Single semester results report PARTIAL_DATA without fabricating', () => {
    const partialReportHtml = `
      <div>
        <p>Study Period: 1 SEM</p>
        <p>SGPA: 8.75</p>
        <p>CGPA: 8.75</p>
        <table>
          <tr><td>24CSE0101</td><td>Programming in C</td><td>4</td><td>A+</td></tr>
        </table>
      </div>
    `;

    const details = validateAcademicResultsContent(partialReportHtml);
    expect(details.isPartial).toBe(true);
    expect(details.recordCount).toBe(1);

    const res = evaluateEndpointResponse(
      resultsWebSpec,
      200,
      'text/html',
      partialReportHtml,
      45,
      null,
      false
    );

    expect(res.status).toBe('PARTIAL_DATA');
    expect(res.recordCount).toBe(1);
  });

  // Additional check: Attendance Register with status codes P, A, DL, ML
  it('Validates attendance register with status codes P, A, DL, ML', () => {
    const registerHtml = `
      <table class="table-register">
        <thead>
          <tr><th>Lecture</th><th>01-09</th><th>03-09</th><th>05-09</th><th>08-09</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Status</td>
            <td>P</td>
            <td>A</td>
            <td>DL</td>
            <td>ML</td>
          </tr>
        </tbody>
      </table>
    `;

    const details = validateAttendanceRegisterHtml(registerHtml);
    expect(details.recordCount).toBe(4);
    expect(details.usableFields).toContain('P');
    expect(details.usableFields).toContain('A');
    expect(details.usableFields).toContain('DL');
    expect(details.usableFields).toContain('ML');
  });

  // Additional check: Attachment binary stream
  it('Validates PDF binary stream', () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35]); // "%PDF-1.5"
    const details = validateAttachmentBinary('application/pdf', pdfBytes);
    expect(details.recordCount).toBe(1);
    expect(details.notes).toContain('PDF');
  });
});
