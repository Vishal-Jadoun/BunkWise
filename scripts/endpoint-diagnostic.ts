#!/usr/bin/env node
/**
 * Isolated CodeBrigade / ChalkPad Pro Endpoint Diagnostic Utility
 *
 * Usage:
 *   Offline Diagnostic (default, uses synthetic fixtures, 0 network requests):
 *     node scripts/endpoint-diagnostic.ts
 *
 *   Live Diagnostic (requires active authenticated session, safe sequential requests):
 *     node scripts/endpoint-diagnostic.ts --live
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CODEBRIGADE_ENDPOINTS,
  evaluateEndpointResponse,
  generateDiagnosticMarkdownReport,
  type DiagnosticEvaluation,
  type EndpointTestSpec,
} from '../src/diagnostics/diagnosticEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(PROJECT_ROOT, 'reports');
const REPORT_FILE = path.join(REPORTS_DIR, 'endpoint-diagnostic-report.md');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Synthetic Offline Fixtures for Safe, Isolated Evaluation
// ---------------------------------------------------------------------------
const OFFLINE_FIXTURES: Record<
  string,
  {
    httpStatus: number;
    contentType: string;
    durationMs: number;
    body: string;
    notes?: string;
  }
> = {
  circulars_web: {
    httpStatus: 200,
    contentType: 'text/html; charset=utf-8',
    durationMs: 85,
    body: `
      <div class="ui-feed-item">
        <h4 class="notice-title">Mid-Semester Exam Guidelines</h4>
        <span class="notice-date">22-10-2026</span>
        <a href="/dashboardFeed/downloadAttachment/0100704">Notice_Guidelines.pdf</a>
      </div>
    `,
    notes: 'Rendered HTML feed fragment with notice titles and attachment references',
  },
  circulars_mobile: {
    httpStatus: 200,
    contentType: 'application/json',
    durationMs: 42,
    body: JSON.stringify({
      status: 1,
      feed: [
        {
          id: 'circ-001',
          title: 'Campus Placement Drive 2026',
          desc: 'Eligible branches: CSE, AI&ML',
          creDate: '2026-10-22',
          type: 'circular',
        },
        {
          id: 'circ-002',
          title: 'Academic Calendar Update',
          desc: 'Commencement of practical examinations',
          creDate: '2026-10-21',
          type: 'circular',
        },
      ],
    }),
    notes: 'Mobile JSON feed collection with notice items',
  },
  attachment_download: {
    httpStatus: 200,
    contentType: 'application/pdf',
    durationMs: 110,
    body: '%PDF-1.5 Mock PDF Binary Stream for Diagnostic Validation',
    notes: 'Binary PDF stream with application/pdf header',
  },
  attendance_web: {
    httpStatus: 200,
    contentType: 'text/html; charset=utf-8',
    durationMs: 95,
    body: `
      <table class="attendance-table">
        <tr>
          <td>Database Management System 24CSE0209 Teacher: Dr. Sharma From: 01 Aug 2026 TO: 22 Oct 2026 Delivered: 58 Attended: 48 Absent: 10 DL: 4 ML: 4 Total Percentage: 82.8% Total Approved DL: 4 Total Approved ML: 4</td>
        </tr>
        <tr>
          <td>Operating Systems 24CSE0208 Teacher: Prof. Verma From: 01 Aug 2026 TO: 22 Oct 2026 Delivered: 42 Attended: 38 Absent: 4 DL: 0 ML: 0 Total Percentage: 90.5% Total Approved DL: 0 Total Approved ML: 0</td>
        </tr>
      </table>
    `,
    notes: 'Web attendance report table rows with subject code, counts, and percentages',
  },
  attendance_legacy: {
    httpStatus: 200,
    contentType: 'application/json',
    durationMs: 38,
    body: JSON.stringify({
      title: 'Attendance Subjectwise',
      content: '', // Explicitly empty on Chitkara ERP
    }),
    notes: 'Confirmed Chitkara ERP behavior: legacy commonPage 28 returns empty content',
  },
  attendance_register: {
    httpStatus: 200,
    contentType: 'text/html; charset=utf-8',
    durationMs: 130,
    body: `
      <table>
        <thead>
          <tr><th>Lecture</th><th>01-09</th><th>03-09</th><th>05-09</th><th>08-09</th></tr>
        </thead>
        <tbody>
          <tr><td>Status</td><td>P</td><td>A</td><td>DL</td><td>ML</td></tr>
        </tbody>
      </table>
    `,
    notes: 'ChalkPad Pro lecture register with period dates and status cells (P, A, DL, ML)',
  },
  timetable_legacy: {
    httpStatus: 200,
    contentType: 'application/json',
    durationMs: 35,
    body: JSON.stringify({
      title: 'Time Table',
      content: '', // Legacy commonPage 85 returns empty content for current batches
    }),
    notes: 'Confirmed Chitkara ERP behavior: legacy commonPage 85 returns 0 timetable entries',
  },
  student_profile: {
    httpStatus: 200,
    contentType: 'application/json',
    durationMs: 50,
    body: JSON.stringify({
      status: 1,
      data: {
        studentName: 'REDACTED_DIAGNOSTIC_STUDENT',
        rollNo: 'REDACTED_ROLL_NUMBER',
        className: 'B.Tech CSE (AI&ML)',
        studentEmail: 'redacted@chitkara.edu.in',
      },
    }),
    notes: 'Mobile user details JSON with name, roll number, program, and email',
  },
  academic_results_web: {
    httpStatus: 200,
    contentType: 'text/html; charset=utf-8',
    durationMs: 140,
    body: `
      <div>
        <p>Study Period: 1 SEM</p>
        <p>SGPA: 8.75</p>
        <p>CGPA: 8.75</p>
        <table>
          <tr><td>24CSE0101</td><td>Problem Solving</td><td>4</td><td>A+</td></tr>
        </table>
      </div>
    `,
    notes: 'Web performance graph displaying published semester marksheets',
  },
  academic_results_legacy: {
    httpStatus: 200,
    contentType: 'application/json',
    durationMs: 45,
    body: JSON.stringify({
      title: 'Report Card',
      content: `
        <div>
          <p>Study Period: 1 SEM</p>
          <p>SGPA: 8.75</p>
          <p>CGPA: 8.75</p>
        </div>
      `,
    }),
    notes: 'Legacy commonPage 31 returning published Semester 1 summary',
  },
};

// ---------------------------------------------------------------------------
// Runner Implementation
// ---------------------------------------------------------------------------
async function runOfflineDiagnostics(): Promise<DiagnosticEvaluation[]> {
  console.log('================================================================');
  console.log(' Running CodeBrigade Endpoint Diagnostic Suite (OFFLINE MODE)   ');
  console.log(' Evaluates multi-level contracts, HTTP statuses, and data schemas');
  console.log(' Zero external requests • Zero secret exposure • 100% Deterministic');
  console.log('================================================================\n');

  const evaluations: DiagnosticEvaluation[] = [];

  for (const spec of CODEBRIGADE_ENDPOINTS) {
    const fixture = OFFLINE_FIXTURES[spec.id];
    if (!fixture) {
      evaluations.push({
        endpointId: spec.id,
        featureName: spec.featureName,
        relativePath: spec.relativePath,
        method: spec.method,
        httpStatus: null,
        contentType: '',
        durationMs: 0,
        isEmpty: true,
        status: 'SKIPPED',
        recordCount: 0,
        failureCategory: 'None',
        missingFields: [],
        parsingErrors: ['No fixture defined for endpoint'],
        suggestedNextStep: 'Define offline fixture to test this endpoint.',
        isLive: false,
      });
      continue;
    }

    const evaluation = evaluateEndpointResponse(
      spec,
      fixture.httpStatus,
      fixture.contentType,
      fixture.body,
      fixture.durationMs,
      null,
      false
    );

    evaluations.push(evaluation);
  }

  return evaluations;
}

async function runLiveDiagnostics(): Promise<DiagnosticEvaluation[]> {
  console.log('================================================================');
  console.log(' Running CodeBrigade Endpoint Diagnostic Suite (LIVE MODE)      ');
  console.log(' Safe, read-only sequential inspection with timeout boundaries  ');
  console.log('================================================================\n');

  // Check for established session cache in scratch or environment
  let sessionData: any = null;

  // 1. Check environment variable
  if (process.env.ATTENDLY_SESSION) {
    try {
      sessionData = JSON.parse(process.env.ATTENDLY_SESSION);
    } catch {}
  }

  // 2. Check local scratch session cache file if present
  const sessionCachePath = path.join(PROJECT_ROOT, 'scratch', 'active-session.json');
  if (!sessionData && fs.existsSync(sessionCachePath)) {
    try {
      sessionData = JSON.parse(fs.readFileSync(sessionCachePath, 'utf8'));
    } catch {}
  }

  // If no established session, safely report BLOCKED_AUTH without attempting requests
  if (!sessionData || !sessionData.authToken || !sessionData.baseUrl) {
    console.warn('⚠️  [BLOCKED_AUTH] No authenticated live session provided.');
    console.warn('   Live mode requires an already-established session from your existing login flow.');
    console.warn('   To run live diagnostics, log in to Attendly through the web interface first.\n');

    return CODEBRIGADE_ENDPOINTS.map((spec) => ({
      endpointId: spec.id,
      featureName: spec.featureName,
      relativePath: spec.relativePath,
      method: spec.method,
      httpStatus: null,
      contentType: '',
      durationMs: 0,
      isEmpty: true,
      status: 'BLOCKED_AUTH',
      recordCount: 0,
      failureCategory: 'Authentication',
      missingFields: ['activeSessionToken'],
      parsingErrors: ['Endpoint could not be safely tested without an established authenticated session'],
      suggestedNextStep: 'Sign in to your university student account through Attendly first.',
      isLive: true,
    }));
  }

  // If session is present, execute sequential read-only requests with bounded timeout
  const evaluations: DiagnosticEvaluation[] = [];
  const proxyBase = 'http://localhost:5173/api/proxy?url=';
  let stopFurtherRequests = false;

  for (const spec of CODEBRIGADE_ENDPOINTS) {
    if (stopFurtherRequests) {
      evaluations.push({
        endpointId: spec.id,
        featureName: spec.featureName,
        relativePath: spec.relativePath,
        method: spec.method,
        httpStatus: null,
        contentType: '',
        durationMs: 0,
        isEmpty: true,
        status: 'SKIPPED',
        recordCount: 0,
        failureCategory: 'Authentication',
        missingFields: [],
        parsingErrors: ['Skipped because earlier endpoint reported session authentication failure'],
        suggestedNextStep: 'Re-authenticate with university ERP.',
        isLive: true,
      });
      continue;
    }

    const startTime = Date.now();
    try {
      const targetUrl = `${sessionData.baseUrl}${spec.relativePath}`;
      const fullUrl = `${proxyBase}${encodeURIComponent(targetUrl)}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s bounded timeout

      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      if (spec.requiresWarmup) {
        headers['X-Warmup-Url'] = encodeURIComponent(`${sessionData.baseUrl}/mobilev2/showAttendance`);
        headers['X-Warmup-Body'] = encodeURIComponent(
          `userId=${sessionData.userDetails?.userId}&sessionId=${sessionData.userDetails?.sessionId}`
        );
      }

      const bodyPayload =
        spec.method === 'POST'
          ? `userId=${sessionData.userDetails?.userId}&sessionId=${sessionData.userDetails?.sessionId}&roleId=${sessionData.userDetails?.roleId}&securityToken=${encodeURIComponent(
              sessionData.securityToken || ''
            )}&deviceIdUUID=${encodeURIComponent(sessionData.deviceUUID || '')}`
          : undefined;

      const res = await fetch(fullUrl, {
        method: spec.method,
        headers,
        body: bodyPayload,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;
      const contentType = res.headers.get('content-type') || '';
      const text = await res.text();

      const evaluation = evaluateEndpointResponse(
        spec,
        res.status,
        contentType,
        text,
        durationMs,
        null,
        true
      );

      evaluations.push(evaluation);

      // Stop immediately if authentication failure is detected
      if (evaluation.status === 'AUTH_REQUIRED') {
        console.warn(`🛑 Authentication failure detected on ${spec.relativePath}. Stopping further live requests.`);
        stopFurtherRequests = true;
      }
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const isTimeout = err.name === 'AbortError';
      const evaluation = evaluateEndpointResponse(
        spec,
        null,
        '',
        '',
        durationMs,
        isTimeout ? 'timeout' : 'network',
        true
      );
      evaluations.push(evaluation);
    }

    // Small delay between live requests to avoid server pressure
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return evaluations;
}

// ---------------------------------------------------------------------------
// Main Driver
// ---------------------------------------------------------------------------
async function main() {
  const isLive = process.argv.includes('--live');
  const mode = isLive ? 'LIVE' : 'OFFLINE';

  const evaluations = isLive ? await runLiveDiagnostics() : await runOfflineDiagnostics();

  // Print results table to console
  console.log('| Endpoint Feature | HTTP | Content-Type | Duration | Records | Status |');
  console.log('| :--------------- | :--: | :----------- | :------: | :-----: | :----: |');
  for (const e of evaluations) {
    const httpStr = e.httpStatus ? String(e.httpStatus) : '-';
    const durStr = e.durationMs > 0 ? `${e.durationMs}ms` : '-';
    console.log(
      `| ${e.featureName.padEnd(28)} | ${httpStr.padEnd(4)} | ${(e.contentType || '-').slice(0, 18).padEnd(18)} | ${durStr.padEnd(8)} | ${String(e.recordCount).padEnd(7)} | ${e.status} |`
    );
  }

  // Summary counts
  const passData = evaluations.filter((e) => e.status === 'PASS_DATA').length;
  const passEmpty = evaluations.filter((e) => e.status === 'PASS_EMPTY').length;
  const partial = evaluations.filter((e) => e.status === 'PARTIAL_DATA').length;
  const failSchema = evaluations.filter((e) => e.status === 'FAIL_SCHEMA').length;
  const authReq = evaluations.filter((e) => e.status === 'AUTH_REQUIRED').length;
  const blockedAuth = evaluations.filter((e) => e.status === 'BLOCKED_AUTH').length;
  const failHttp = evaluations.filter((e) => e.status === 'FAIL_HTTP' || e.status === 'FAIL_NETWORK' || e.status === 'FAIL_TIMEOUT').length;

  console.log('\nSummary:');
  console.log(`  PASS_DATA:    ${passData}`);
  console.log(`  PASS_EMPTY:   ${passEmpty}`);
  console.log(`  PARTIAL_DATA: ${partial}`);
  console.log(`  FAIL_SCHEMA:  ${failSchema}`);
  console.log(`  AUTH_REQUIRED:${authReq}`);
  console.log(`  BLOCKED_AUTH: ${blockedAuth}`);
  console.log(`  FAIL_HTTP/NET:${failHttp}`);

  // Generate and save Markdown Report
  const notes = isLive
    ? 'Executed in LIVE mode with established authenticated session.'
    : 'Executed in OFFLINE mode using validated synthetic fixtures. Zero external requests made.';

  const mdReport = generateDiagnosticMarkdownReport(evaluations, mode, notes);
  fs.writeFileSync(REPORT_FILE, mdReport, 'utf8');

  console.log(`\n📄 Diagnostic report saved to: ${path.relative(PROJECT_ROOT, REPORT_FILE)}`);
}

main().catch((err) => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});
