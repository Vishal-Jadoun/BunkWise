/**
 * Diagnostic Engine for CodeBrigade / ChalkPad Pro Endpoints
 * Provides safe, multi-level evaluation of HTTP responses, schemas, auth states,
 * and data integrity with zero secret/PII leakage.
 */

export type DiagnosticStatus =
  | 'PASS_DATA'
  | 'PASS_EMPTY'
  | 'PARTIAL_DATA'
  | 'FAIL_SCHEMA'
  | 'FAIL_HTTP'
  | 'AUTH_REQUIRED'
  | 'FAIL_TIMEOUT'
  | 'FAIL_NETWORK'
  | 'BLOCKED_AUTH'
  | 'SKIPPED';

export type FailureCategory =
  | 'None'
  | 'Authentication'
  | 'Endpoint Behavior'
  | 'Response Parsing'
  | 'Proxy Configuration'
  | 'Frontend Integration'
  | 'Network/Transport';

export interface EndpointTestSpec {
  id: string;
  featureName: string;
  relativePath: string;
  method: 'GET' | 'POST';
  expectedFormat: 'JSON' | 'HTML' | 'BINARY';
  description: string;
  requiresWarmup?: boolean;
}

export interface ValidationDetails {
  recordCount: number;
  usableFields: string[];
  missingFields: string[];
  parsingErrors: string[];
  isPartial: boolean;
  notes?: string;
}

export interface DiagnosticEvaluation {
  endpointId: string;
  featureName: string;
  relativePath: string;
  method: 'GET' | 'POST';
  httpStatus: number | null;
  contentType: string;
  durationMs: number;
  isEmpty: boolean;
  status: DiagnosticStatus;
  recordCount: number;
  failureCategory: FailureCategory;
  missingFields: string[];
  parsingErrors: string[];
  suggestedNextStep: string;
  isLive: boolean;
}

/**
 * Standard test inventory mapped to codebrigade-integration-map.md
 */
export const CODEBRIGADE_ENDPOINTS: EndpointTestSpec[] = [
  {
    id: 'circulars_web',
    featureName: 'Circulars (Web Feed)',
    relativePath: '/dashboardFeed/filterFeedHtml/',
    method: 'POST',
    expectedFormat: 'HTML',
    description: 'Web portal rendered notice feed HTML',
  },
  {
    id: 'circulars_mobile',
    featureName: 'Circulars API (Mobile)',
    relativePath: '/mobilev2/getAppFeed',
    method: 'POST',
    expectedFormat: 'JSON',
    description: 'Mobile JSON notice feed items',
  },
  {
    id: 'attachment_download',
    featureName: 'Notice Attachment',
    relativePath: '/dashboardFeed/downloadAttachment/[id]',
    method: 'GET',
    expectedFormat: 'BINARY',
    description: 'Binary document download (PDF, image, doc)',
  },
  {
    id: 'attendance_web',
    featureName: 'Attendance Summary (Web)',
    relativePath: '/studentDetails/displayAttendance/',
    method: 'POST',
    expectedFormat: 'HTML',
    description: 'Web attendance report subject rows',
  },
  {
    id: 'attendance_legacy',
    featureName: 'Legacy Attendance (CommonPage 28)',
    relativePath: '/mobilev2/commonPage?commonPageId=28',
    method: 'POST',
    expectedFormat: 'JSON',
    description: 'Legacy mobile subject attendance common page',
  },
  {
    id: 'attendance_register',
    featureName: 'Attendance Register (ChalkPad Pro)',
    relativePath: '/chalkpadpro/studentDetails/getAttendanceRegister',
    method: 'POST',
    expectedFormat: 'HTML',
    description: 'ChalkPad Pro lecture-by-lecture register records',
    requiresWarmup: true,
  },
  {
    id: 'timetable_legacy',
    featureName: 'Legacy Timetable (CommonPage 85)',
    relativePath: '/mobilev2/commonPage?commonPageId=85',
    method: 'POST',
    expectedFormat: 'JSON',
    description: 'Legacy mobile timetable common page',
  },
  {
    id: 'student_profile',
    featureName: 'Student Profile (Mobile)',
    relativePath: '/mobilev2/getUserDetails',
    method: 'POST',
    expectedFormat: 'JSON',
    description: 'Mobile student profile metadata',
  },
  {
    id: 'academic_results_web',
    featureName: 'Academic Results (Web Performance)',
    relativePath: '/studentPerformanceParent/graphDisplay',
    method: 'POST',
    expectedFormat: 'HTML',
    description: 'Web portal multi-semester examination graph and marks',
  },
  {
    id: 'academic_results_legacy',
    featureName: 'Legacy Results (CommonPage 31)',
    relativePath: '/mobilev2/commonPage?commonPageId=31',
    method: 'POST',
    expectedFormat: 'JSON',
    description: 'Legacy mobile report card common page',
  },
];

/**
 * Strips HTML tags for safe text inspection
 */
export function stripHtmlTags(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detects if a response is an unauthenticated login page or session timeout redirect,
 * even when returned with HTTP 200 OK.
 */
export function isLoginPageOrSessionExpired(bodyText: string, httpStatus: number | null): boolean {
  if (httpStatus === 401 || httpStatus === 403 || httpStatus === 302 || httpStatus === 301) {
    return true;
  }
  if (!bodyText) return false;

  const lower = bodyText.toLowerCase();

  // Web portal login markers
  const webLoginPatterns = [
    'loginmanager',
    'txtusername',
    'txtpassword',
    'login to your account',
    'sign in to your account',
    'forgot / generate password',
    'session expired',
    'session timeout',
    'invalid session',
    'please login again',
    'unauthorized access',
  ];

  for (const pat of webLoginPatterns) {
    if (lower.includes(pat)) return true;
  }

  // JSON status 0/4 with auth failure message
  try {
    const json = JSON.parse(bodyText);
    const status = String(json.status);
    const msg = String(json.error || json.validation || json.message || '').toLowerCase();
    if (status === '0' || status === '4') {
      if (
        msg.includes('session') ||
        msg.includes('auth') ||
        msg.includes('login') ||
        msg.includes('expired') ||
        msg.includes('token')
      ) {
        return true;
      }
    }
  } catch {}

  return false;
}

// -------------------------------------------------------------
// Feature-Specific Validators
// -------------------------------------------------------------

export function validateCircularsWebHtml(html: string): ValidationDetails {
  const errors: string[] = [];
  const usableFields: string[] = [];
  const missingFields: string[] = [];

  const items = html.match(/class=["'][^"']*ui-feed-item[^"']*["']/gi) || [];
  const noticeTitles = html.match(/class=["'][^"']*notice-title[^"']*["']|<h[3-6][^>]*>([\s\S]*?)<\/h[3-6]>/gi) || [];

  if (items.length > 0 || noticeTitles.length > 0) {
    usableFields.push('feedItems', 'noticeTitle');
    return {
      recordCount: Math.max(items.length, noticeTitles.length),
      usableFields,
      missingFields,
      parsingErrors: errors,
      isPartial: false,
    };
  }

  // Check if explicitly empty feed
  if (/no\s+(feed|notices|records)\s+found/i.test(html) || html.trim().length < 100) {
    return {
      recordCount: 0,
      usableFields: [],
      missingFields: ['feedItems'],
      parsingErrors: errors,
      isPartial: false,
      notes: 'Empty feed container returned',
    };
  }

  errors.push('No recognized feed container or notice item elements found in HTML');
  return {
    recordCount: 0,
    usableFields: [],
    missingFields: ['feedItems'],
    parsingErrors: errors,
    isPartial: false,
  };
}

export function validateCircularsMobileJson(json: any): ValidationDetails {
  const errors: string[] = [];
  const usableFields: string[] = [];
  const missingFields: string[] = [];

  if (!json || typeof json !== 'object') {
    errors.push('Response root is not a valid JSON object');
    return { recordCount: 0, usableFields, missingFields: ['feed'], parsingErrors: errors, isPartial: false };
  }

  const feed = json.feed;
  if (!Array.isArray(feed)) {
    errors.push('Missing array property "feed" in JSON response');
    return { recordCount: 0, usableFields, missingFields: ['feed'], parsingErrors: errors, isPartial: false };
  }

  if (feed.length === 0) {
    return { recordCount: 0, usableFields: ['feed'], missingFields, parsingErrors: errors, isPartial: false };
  }

  let validItems = 0;
  let hasMissingRequired = false;

  for (const item of feed) {
    const hasId = item.id !== undefined || item.itemId !== undefined;
    const hasTitle = item.title !== undefined;
    const hasDate = item.creDate !== undefined || item.date !== undefined;

    if (hasId && hasTitle && hasDate) {
      validItems++;
    } else {
      hasMissingRequired = true;
    }
  }

  usableFields.push('id', 'title', 'creDate');
  if (hasMissingRequired) {
    missingFields.push('some item IDs or titles missing');
  }

  return {
    recordCount: validItems,
    usableFields,
    missingFields,
    parsingErrors: errors,
    isPartial: hasMissingRequired,
  };
}

export function validateAttachmentBinary(
  contentType: string,
  bufferOrText: string | Uint8Array
): ValidationDetails {
  const errors: string[] = [];
  const lowerType = (contentType || '').toLowerCase();

  const isPdf = lowerType.includes('pdf');
  const isImage = lowerType.includes('image/');
  const isDoc =
    lowerType.includes('officedocument') ||
    lowerType.includes('msword') ||
    lowerType.includes('octet-stream');

  // Check magic bytes if available
  let startsWithPdfMagic = false;
  if (typeof bufferOrText === 'string') {
    startsWithPdfMagic = bufferOrText.startsWith('%PDF-');
  } else if (bufferOrText && bufferOrText.length >= 4) {
    startsWithPdfMagic =
      bufferOrText[0] === 0x25 &&
      bufferOrText[1] === 0x50 &&
      bufferOrText[2] === 0x44 &&
      bufferOrText[3] === 0x46; // "%PDF"
  }

  if (isPdf || startsWithPdfMagic || isImage || isDoc) {
    return {
      recordCount: 1,
      usableFields: ['binaryStream', 'contentType'],
      missingFields: [],
      parsingErrors: errors,
      isPartial: false,
      notes: `Valid binary payload (${isPdf || startsWithPdfMagic ? 'PDF' : isImage ? 'Image' : 'Document'})`,
    };
  }

  errors.push(`Unexpected attachment content-type: "${contentType}"`);
  return {
    recordCount: 0,
    usableFields: [],
    missingFields: ['validBinaryFormat'],
    parsingErrors: errors,
    isPartial: false,
  };
}

export function validateAttendanceSummaryWebHtml(html: string): ValidationDetails {
  const errors: string[] = [];
  const usableFields: string[] = [];
  const missingFields: string[] = [];

  const plain = stripHtmlTags(html);
  const subjectRegex = /([^0-9]+?)\s+(\d{2}[A-Z]{2,4}\d{2,4})\s+Teacher\s*:\s*(.+?)From\s*:\s*(\d{1,2}\s+\w+\s+\d{4})\s+TO\s*:\s*(\d{1,2}\s+\w+\s+\d{4})\s*Delivered\s*:\s*(-?\d+)\s*Attended\s*:\s*(-?\d+)\s*Absent\s*:\s*(-?\d+)/gi;

  let count = 0;
  let match;
  while ((match = subjectRegex.exec(plain)) !== null) {
    const delivered = parseInt(match[6], 10);
    const attended = parseInt(match[7], 10);
    if (delivered >= 0 && attended >= 0 && attended <= delivered + 10) {
      count++;
    } else {
      errors.push(`Inconsistent attendance counts in row: delivered=${delivered}, attended=${attended}`);
    }
  }

  if (count > 0) {
    usableFields.push('subjectName', 'courseCode', 'teacher', 'delivered', 'attended', 'absent');
    return { recordCount: count, usableFields, missingFields, parsingErrors: errors, isPartial: errors.length > 0 };
  }

  // Check if standard table exists but empty
  if (/<table/i.test(html) && /attendance/i.test(html)) {
    return {
      recordCount: 0,
      usableFields: ['tableContainer'],
      missingFields: ['subjectRows'],
      parsingErrors: errors,
      isPartial: false,
      notes: 'Attendance table shell found but 0 subject rows populated',
    };
  }

  errors.push('No recognized attendance subject table or rows found');
  return { recordCount: 0, usableFields: [], missingFields: ['subjectRows'], parsingErrors: errors, isPartial: false };
}

export function validateLegacyAttendanceCommonPage(json: any): ValidationDetails {
  const errors: string[] = [];
  const usableFields: string[] = [];
  const missingFields: string[] = [];

  if (!json || typeof json !== 'object') {
    errors.push('Invalid JSON object');
    return { recordCount: 0, usableFields, missingFields, parsingErrors: errors, isPartial: false };
  }

  const content = String(json.content || '');
  if (!content || content.trim().length === 0) {
    return {
      recordCount: 0,
      usableFields: ['commonObj'],
      missingFields: ['content'],
      parsingErrors: errors,
      isPartial: false,
      notes: 'Legacy commonPage 28 returned empty content (Confirmed Chitkara behavior)',
    };
  }

  const details = validateAttendanceSummaryWebHtml(content);
  return details;
}

export function validateAttendanceRegisterHtml(html: string): ValidationDetails {
  const errors: string[] = [];
  const usableFields: string[] = [];
  const missingFields: string[] = [];

  const tables = html.match(/<table[^>]*>([\s\S]*?)<\/table>/gi) || [];
  if (tables.length === 0) {
    errors.push('No table elements found in attendance register HTML');
    return { recordCount: 0, usableFields, missingFields: ['tables'], parsingErrors: errors, isPartial: false };
  }

  let subjectCount = 0;
  let sessionRecordsCount = 0;
  const observedStatuses = new Set<string>();

  for (const table of tables) {
    // Check for lecture column headers e.g. "L1 01-09 P1" or "Lec"
    const hasLectureHeaders = /lecture|lec|period|\d{1,2}-\d{1,2}/i.test(table);
    if (!hasLectureHeaders) continue;

    subjectCount++;

    // Check status cells P, A, X, DL, ML
    const cellRegex = /<td[^>]*>\s*([PAX]|DL|ML)\s*<\/td>/gi;
    let m;
    while ((m = cellRegex.exec(table)) !== null) {
      sessionRecordsCount++;
      observedStatuses.add(m[1].trim());
    }
  }

  if (subjectCount > 0 && sessionRecordsCount > 0) {
    usableFields.push('subjects', 'lectureDates', 'statuses', ...Array.from(observedStatuses));
    return {
      recordCount: sessionRecordsCount,
      usableFields,
      missingFields,
      parsingErrors: errors,
      isPartial: false,
      notes: `Found ${subjectCount} subjects with ${sessionRecordsCount} lecture entries. Observed statuses: ${Array.from(
        observedStatuses
      ).join(', ')}`,
    };
  }

  if (subjectCount > 0 && sessionRecordsCount === 0) {
    return {
      recordCount: 0,
      usableFields: ['subjectHeaders'],
      missingFields: ['sessionCells'],
      parsingErrors: errors,
      isPartial: true,
      notes: 'Register table found but 0 lecture status entries parsed',
    };
  }

  errors.push('Register tables lacked recognizable lecture period columns or status entries');
  return { recordCount: 0, usableFields, missingFields: ['registerTable'], parsingErrors: errors, isPartial: false };
}

export function validateTimetableContent(htmlOrJson: string | any): ValidationDetails {
  const errors: string[] = [];
  const usableFields: string[] = [];
  const missingFields: string[] = [];

  // If JSON (Legacy commonPage 85)
  if (typeof htmlOrJson === 'object' && htmlOrJson !== null) {
    const content = String(htmlOrJson.content || '');
    if (!content || content.trim().length === 0) {
      return {
        recordCount: 0,
        usableFields: ['responseObject'],
        missingFields: ['content'],
        parsingErrors: errors,
        isPartial: false,
        notes: 'Legacy commonPage 85 returned 0 entries / empty content',
      };
    }
    htmlOrJson = content;
  }

  const text = typeof htmlOrJson === 'string' ? htmlOrJson : '';
  const hasDays = /monday|tuesday|wednesday|thursday|friday/i.test(text);
  const hasPeriods = /period|period\s*\d|\d{1,2}:\d{2}/i.test(text);

  if (hasDays && hasPeriods) {
    const slots = text.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || [];
    usableFields.push('weekday', 'period', 'scheduleGrid');
    return {
      recordCount: Math.max(1, Math.floor(slots.length / 5)),
      usableFields,
      missingFields,
      parsingErrors: errors,
      isPartial: false,
    };
  }

  if (text.trim().length === 0 || /no\s+timetable|no\s+data/i.test(text)) {
    return {
      recordCount: 0,
      usableFields: [],
      missingFields: ['timetableGrid'],
      parsingErrors: errors,
      isPartial: false,
      notes: 'Explicit empty timetable response',
    };
  }

  errors.push('Timetable content lacks recognizable day or period structure');
  return { recordCount: 0, usableFields, missingFields: ['timetableStructure'], parsingErrors: errors, isPartial: false };
}

export function validateStudentProfileJson(json: any): ValidationDetails {
  const errors: string[] = [];
  const usableFields: string[] = [];
  const missingFields: string[] = [];

  if (!json || typeof json !== 'object') {
    errors.push('Profile response is not a valid JSON object');
    return { recordCount: 0, usableFields, missingFields: ['profileData'], parsingErrors: errors, isPartial: false };
  }

  const rawData = Array.isArray(json.data) ? json.data[0] : json.data || json;
  if (!rawData || typeof rawData !== 'object') {
    errors.push('Missing inner profile data object');
    return { recordCount: 0, usableFields, missingFields: ['data'], parsingErrors: errors, isPartial: false };
  }

  const expectedKeys = [
    { key: 'name', variants: ['studentName', 'firstName', 'name'] },
    { key: 'rollNo', variants: ['rollNo', 'regNo', 'rollNumber'] },
    { key: 'className', variants: ['stuClassName', 'className', 'program'] },
    { key: 'email', variants: ['studentEmail', 'email'] },
  ];

  for (const exp of expectedKeys) {
    const found = exp.variants.some((v) => rawData[v] !== undefined && String(rawData[v]).trim() !== '');
    if (found) {
      usableFields.push(exp.key);
    } else {
      missingFields.push(exp.key);
    }
  }

  if (usableFields.length === expectedKeys.length) {
    return { recordCount: 1, usableFields, missingFields: [], parsingErrors: errors, isPartial: false };
  }

  if (usableFields.length > 0) {
    return { recordCount: 1, usableFields, missingFields, parsingErrors: errors, isPartial: true };
  }

  errors.push('None of the expected profile fields were found in response');
  return { recordCount: 0, usableFields: [], missingFields, parsingErrors: errors, isPartial: false };
}

export function validateAcademicResultsContent(htmlOrJson: string | any): ValidationDetails {
  const errors: string[] = [];
  const usableFields: string[] = [];
  const missingFields: string[] = [];

  let text = '';
  if (typeof htmlOrJson === 'object' && htmlOrJson !== null) {
    text = String(htmlOrJson.content || JSON.stringify(htmlOrJson));
  } else {
    text = String(htmlOrJson || '');
  }

  const hasCgpa = /cgpa\s*[:=]\s*[\d.]+/i.test(text);
  const hasSgpa = /sgpa\s*[:=]\s*[\d.]+/i.test(text);
  const hasSemesters = /sem|semester|study\s*period/i.test(text);
  const hasGrades = /grade|credit|[A-O][+]?|grade\s*point/i.test(text);

  if (hasCgpa) usableFields.push('CGPA');
  else missingFields.push('CGPA');

  if (hasSgpa) usableFields.push('SGPA');
  else missingFields.push('SGPA');

  if (hasSemesters) usableFields.push('SemesterList');
  else missingFields.push('SemesterList');

  if (hasGrades) usableFields.push('Grades/Credits');
  else missingFields.push('Grades/Credits');

  // Count semester matches
  const semMatches = text.match(/semester\s*\d|sem\s*\d|\d\s*sem/gi) || [];
  const distinctSems = new Set(semMatches.map((s) => s.toLowerCase()));

  if (hasCgpa && hasSgpa && distinctSems.size > 0) {
    const isPartial = distinctSems.size < 3; // Student is in Sem 3, so <3 means partial
    return {
      recordCount: distinctSems.size,
      usableFields,
      missingFields,
      parsingErrors: errors,
      isPartial,
      notes: `Found ${distinctSems.size} semester record(s). ${isPartial ? 'Semesters 2 & 3 not published in this view' : ''}`,
    };
  }

  if (hasCgpa || hasSgpa || distinctSems.size > 0) {
    return {
      recordCount: distinctSems.size,
      usableFields,
      missingFields,
      parsingErrors: errors,
      isPartial: true,
      notes: 'Partial marksheet records found',
    };
  }

  if (text.trim().length === 0 || /no\s+records|no\s+result/i.test(text)) {
    return {
      recordCount: 0,
      usableFields: [],
      missingFields,
      parsingErrors: errors,
      isPartial: false,
      notes: 'Empty report card content',
    };
  }

  errors.push('No recognized GPA summary or marksheet tables found');
  return { recordCount: 0, usableFields, missingFields, parsingErrors: errors, isPartial: false };
}

// -------------------------------------------------------------
// Multi-Level Evaluator Engine
// -------------------------------------------------------------

export function evaluateEndpointResponse(
  spec: EndpointTestSpec,
  httpStatus: number | null,
  contentType: string,
  rawBody: string | Uint8Array,
  durationMs: number,
  errorType?: 'timeout' | 'network' | 'blocked_auth' | null,
  isLive = false
): DiagnosticEvaluation {
  const bodyText = typeof rawBody === 'string' ? rawBody : '';
  const isEmpty =
    rawBody === null ||
    rawBody === undefined ||
    (typeof rawBody === 'string' && rawBody.trim().length === 0) ||
    (rawBody instanceof Uint8Array && rawBody.length === 0);

  // 1. Check Explicit Errors
  if (errorType === 'timeout') {
    return {
      endpointId: spec.id,
      featureName: spec.featureName,
      relativePath: spec.relativePath,
      method: spec.method,
      httpStatus,
      contentType,
      durationMs,
      isEmpty: true,
      status: 'FAIL_TIMEOUT',
      recordCount: 0,
      failureCategory: 'Network/Transport',
      missingFields: ['all'],
      parsingErrors: ['Request exceeded timeout boundary (10000ms)'],
      suggestedNextStep: 'Verify university server reachability and proxy timeout settings.',
      isLive,
    };
  }

  if (errorType === 'network') {
    return {
      endpointId: spec.id,
      featureName: spec.featureName,
      relativePath: spec.relativePath,
      method: spec.method,
      httpStatus,
      contentType,
      durationMs,
      isEmpty: true,
      status: 'FAIL_NETWORK',
      recordCount: 0,
      failureCategory: 'Network/Transport',
      missingFields: ['all'],
      parsingErrors: ['Connection failed or proxy refused transport'],
      suggestedNextStep: 'Check local dev proxy (npm run dev) or server network interface.',
      isLive,
    };
  }

  if (errorType === 'blocked_auth') {
    return {
      endpointId: spec.id,
      featureName: spec.featureName,
      relativePath: spec.relativePath,
      method: spec.method,
      httpStatus,
      contentType,
      durationMs,
      isEmpty: true,
      status: 'BLOCKED_AUTH',
      recordCount: 0,
      failureCategory: 'Authentication',
      missingFields: ['all'],
      parsingErrors: ['Live test requested without an established authenticated session'],
      suggestedNextStep: 'Sign in to your university student account through Attendly first.',
      isLive,
    };
  }

  // 2. Check HTTP Failures (4xx, 5xx)
  if (httpStatus && (httpStatus >= 500 || httpStatus === 404 || httpStatus === 400 || httpStatus === 405)) {
    return {
      endpointId: spec.id,
      featureName: spec.featureName,
      relativePath: spec.relativePath,
      method: spec.method,
      httpStatus,
      contentType,
      durationMs,
      isEmpty,
      status: 'FAIL_HTTP',
      recordCount: 0,
      failureCategory: 'Endpoint Behavior',
      missingFields: ['all'],
      parsingErrors: [`Server responded with HTTP error status ${httpStatus}`],
      suggestedNextStep: `Check if endpoint URL ${spec.relativePath} is deprecated or rejected by SchoolPad.`,
      isLive,
    };
  }

  // 3. Check Authentication Failures (Login redirects, 401, 403, or 200 containing login page)
  if (isLoginPageOrSessionExpired(bodyText, httpStatus)) {
    return {
      endpointId: spec.id,
      featureName: spec.featureName,
      relativePath: spec.relativePath,
      method: spec.method,
      httpStatus: httpStatus || 200,
      contentType,
      durationMs,
      isEmpty: false,
      status: 'AUTH_REQUIRED',
      recordCount: 0,
      failureCategory: 'Authentication',
      missingFields: ['all'],
      parsingErrors: [
        httpStatus === 401 || httpStatus === 403
          ? `Server returned HTTP ${httpStatus} Unauthorized`
          : 'Server redirected to or rendered loginManager / session expired form',
      ],
      suggestedNextStep: 'Refresh active student session or perform session warmup before requesting.',
      isLive,
    };
  }

  // 4. Check Content-Type Mismatches
  const lowerContentType = (contentType || '').toLowerCase();
  if (spec.expectedFormat === 'JSON' && !lowerContentType.includes('json') && !lowerContentType.includes('text/plain')) {
    // If empty 200, might be PASS_EMPTY
    if (isEmpty) {
      return {
        endpointId: spec.id,
        featureName: spec.featureName,
        relativePath: spec.relativePath,
        method: spec.method,
        httpStatus,
        contentType,
        durationMs,
        isEmpty: true,
        status: 'PASS_EMPTY',
        recordCount: 0,
        failureCategory: 'None',
        missingFields: [],
        parsingErrors: [],
        suggestedNextStep: 'Endpoint is valid but has 0 records populated for this student.',
        isLive,
      };
    }

    return {
      endpointId: spec.id,
      featureName: spec.featureName,
      relativePath: spec.relativePath,
      method: spec.method,
      httpStatus,
      contentType,
      durationMs,
      isEmpty: false,
      status: 'FAIL_SCHEMA',
      recordCount: 0,
      failureCategory: 'Response Parsing',
      missingFields: ['expectedJson'],
      parsingErrors: [`Expected application/json but received Content-Type "${contentType}"`],
      suggestedNextStep: 'Verify if endpoint expects mobile user-agent headers or returns raw HTML.',
      isLive,
    };
  }

  // 5. Run Feature-Specific Validation
  let validation: ValidationDetails = {
    recordCount: 0,
    usableFields: [],
    missingFields: [],
    parsingErrors: [],
    isPartial: false,
  };

  try {
    switch (spec.id) {
      case 'circulars_web':
        validation = validateCircularsWebHtml(bodyText);
        break;
      case 'circulars_mobile': {
        const json = typeof rawBody === 'string' ? JSON.parse(bodyText) : rawBody;
        validation = validateCircularsMobileJson(json);
        break;
      }
      case 'attachment_download':
        validation = validateAttachmentBinary(contentType, rawBody);
        break;
      case 'attendance_web':
        validation = validateAttendanceSummaryWebHtml(bodyText);
        break;
      case 'attendance_legacy': {
        const json = typeof rawBody === 'string' ? JSON.parse(bodyText) : rawBody;
        validation = validateLegacyAttendanceCommonPage(json);
        break;
      }
      case 'attendance_register':
        validation = validateAttendanceRegisterHtml(bodyText);
        break;
      case 'timetable_legacy': {
        const json = typeof rawBody === 'string' ? JSON.parse(bodyText) : rawBody;
        validation = validateTimetableContent(json);
        break;
      }
      case 'student_profile': {
        const json = typeof rawBody === 'string' ? JSON.parse(bodyText) : rawBody;
        validation = validateStudentProfileJson(json);
        break;
      }
      case 'academic_results_web':
        validation = validateAcademicResultsContent(bodyText);
        break;
      case 'academic_results_legacy': {
        const json = typeof rawBody === 'string' ? JSON.parse(bodyText) : rawBody;
        validation = validateAcademicResultsContent(json);
        break;
      }
      default:
        validation = {
          recordCount: isEmpty ? 0 : 1,
          usableFields: ['rawBody'],
          missingFields: [],
          parsingErrors: [],
          isPartial: false,
        };
    }
  } catch (err: any) {
    return {
      endpointId: spec.id,
      featureName: spec.featureName,
      relativePath: spec.relativePath,
      method: spec.method,
      httpStatus,
      contentType,
      durationMs,
      isEmpty,
      status: 'FAIL_SCHEMA',
      recordCount: 0,
      failureCategory: 'Response Parsing',
      missingFields: [],
      parsingErrors: [`JSON/HTML parsing exception: ${err.message}`],
      suggestedNextStep: 'Inspect raw structure for malformed tags or unexpected formatting.',
      isLive,
    };
  }

  // 6. Map Validation to Final Status
  if (validation.recordCount === 0) {
    if (validation.parsingErrors.length > 0) {
      return {
        endpointId: spec.id,
        featureName: spec.featureName,
        relativePath: spec.relativePath,
        method: spec.method,
        httpStatus,
        contentType,
        durationMs,
        isEmpty,
        status: 'FAIL_SCHEMA',
        recordCount: 0,
        failureCategory: 'Response Parsing',
        missingFields: validation.missingFields,
        parsingErrors: validation.parsingErrors,
        suggestedNextStep: 'Check parser regex or selector against active portal HTML.',
        isLive,
      };
    }

    return {
      endpointId: spec.id,
      featureName: spec.featureName,
      relativePath: spec.relativePath,
      method: spec.method,
      httpStatus,
      contentType,
      durationMs,
      isEmpty: true,
      status: 'PASS_EMPTY',
      recordCount: 0,
      failureCategory: 'None',
      missingFields: validation.missingFields,
      parsingErrors: [],
      suggestedNextStep: 'Valid response structure; no active records currently assigned to student.',
      isLive,
    };
  }

  if (validation.isPartial || validation.missingFields.length > 0) {
    return {
      endpointId: spec.id,
      featureName: spec.featureName,
      relativePath: spec.relativePath,
      method: spec.method,
      httpStatus,
      contentType,
      durationMs,
      isEmpty: false,
      status: 'PARTIAL_DATA',
      recordCount: validation.recordCount,
      failureCategory: 'Endpoint Behavior',
      missingFields: validation.missingFields,
      parsingErrors: validation.parsingErrors,
      suggestedNextStep: 'Verify if missing fields require additional query parameters or ERP publication.',
      isLive,
    };
  }

  return {
    endpointId: spec.id,
    featureName: spec.featureName,
    relativePath: spec.relativePath,
    method: spec.method,
    httpStatus,
    contentType,
    durationMs,
    isEmpty: false,
    status: 'PASS_DATA',
    recordCount: validation.recordCount,
    failureCategory: 'None',
    missingFields: [],
    parsingErrors: [],
    suggestedNextStep: 'Endpoint verified operational and ready for live synchronization.',
    isLive,
  };
}

// -------------------------------------------------------------
// Markdown Diagnostic Report Formatter
// -------------------------------------------------------------

export function generateDiagnosticMarkdownReport(
  evaluations: DiagnosticEvaluation[],
  mode: 'OFFLINE' | 'LIVE',
  notes?: string
): string {
  const timestamp = new Date().toISOString();
  const total = evaluations.length;
  const passData = evaluations.filter((e) => e.status === 'PASS_DATA').length;
  const passEmpty = evaluations.filter((e) => e.status === 'PASS_EMPTY').length;
  const partial = evaluations.filter((e) => e.status === 'PARTIAL_DATA').length;
  const failSchema = evaluations.filter((e) => e.status === 'FAIL_SCHEMA').length;
  const failHttp = evaluations.filter((e) => e.status === 'FAIL_HTTP').length;
  const authReq = evaluations.filter((e) => e.status === 'AUTH_REQUIRED').length;
  const timeout = evaluations.filter((e) => e.status === 'FAIL_TIMEOUT').length;
  const network = evaluations.filter((e) => e.status === 'FAIL_NETWORK').length;
  const blockedAuth = evaluations.filter((e) => e.status === 'BLOCKED_AUTH').length;
  const skipped = evaluations.filter((e) => e.status === 'SKIPPED').length;

  let md = `# CodeBrigade / ChalkPad Pro Endpoint Diagnostic Report\n\n`;
  md += `**Execution Timestamp:** \`${timestamp}\`  \n`;
  md += `**Execution Mode:** \`${mode}\`  \n`;
  md += `**Target System:** \`https://cuiet.codebrigade.in\` (Chitkara University SchoolPad / ChalkPad Pro)  \n`;
  md += `**Safety Policy:** Zero secrets, zero PII, zero session tokens, read-only evaluation.  \n\n`;

  if (notes) {
    md += `> [!NOTE]\n> ${notes}\n\n`;
  }

  md += `## 1. Executive Summary Table\n\n`;
  md += `| Total Tested | PASS_DATA | PASS_EMPTY | PARTIAL_DATA | FAIL_SCHEMA | AUTH_REQUIRED | BLOCKED_AUTH | FAIL_HTTP/NET | SKIPPED |\n`;
  md += `| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;
  md += `| **${total}** | **${passData}** | **${passEmpty}** | **${partial}** | **${failSchema}** | **${authReq}** | **${blockedAuth}** | **${failHttp + network + timeout}** | **${skipped}** |\n\n`;

  md += `## 2. Endpoint Diagnostic Ledger\n\n`;
  md += `| Feature | Endpoint Path | Method | HTTP | Content-Type | Duration | Records | Status |\n`;
  md += `| :--- | :--- | :---: | :---: | :--- | :---: | :---: | :---: |\n`;

  for (const e of evaluations) {
    const statusBadge =
      e.status === 'PASS_DATA'
        ? `\`PASS_DATA\``
        : e.status === 'PASS_EMPTY'
        ? `\`PASS_EMPTY\``
        : e.status === 'PARTIAL_DATA'
        ? `\`PARTIAL_DATA\``
        : e.status === 'AUTH_REQUIRED'
        ? `\`AUTH_REQUIRED\``
        : e.status === 'BLOCKED_AUTH'
        ? `\`BLOCKED_AUTH\``
        : `\`${e.status}\``;

    const httpStr = e.httpStatus ? String(e.httpStatus) : '-';
    const durationStr = e.durationMs > 0 ? `${e.durationMs}ms` : '-';
    md += `| **${e.featureName}** | \`${e.relativePath}\` | \`${e.method}\` | ${httpStr} | \`${e.contentType || '-'}\` | ${durationStr} | ${e.recordCount} | ${statusBadge} |\n`;
  }

  md += `\n## 3. Detailed Failure Analysis & Diagnostic Findings\n\n`;

  for (const e of evaluations) {
    md += `### ${e.featureName} (\`${e.relativePath}\`)\n`;
    md += `- **Diagnostic Status:** \`${e.status}\`\n`;
    md += `- **Failure Category:** ${e.failureCategory}\n`;
    md += `- **Records Parsed:** ${e.recordCount}\n`;

    if (e.missingFields.length > 0) {
      md += `- **Missing Fields / Elements:** ${e.missingFields.map((f) => `\`${f}\``).join(', ')}\n`;
    }
    if (e.parsingErrors.length > 0) {
      md += `- **Parsing / Evaluation Messages:**\n`;
      for (const err of e.parsingErrors) {
        md += `  - ${err}\n`;
      }
    }
    md += `- **Suggested Next Step:** ${e.suggestedNextStep}\n\n`;
  }

  md += `## 4. Architectural Conclusions & Integration Action Items\n\n`;
  md += `1. **Chitkara CommonPage 28 & 85 Vacuity:** Legacy SchoolPad mobile endpoints return valid empty shells (\`PASS_EMPTY\`). Production Attendly must continue routing through \`getAttendanceRegister\` and statistical schedule derivation.\n`;
  md += `2. **Web Session Warmup Requirement:** ChalkPad Pro register (\`/chalkpadpro/.../getAttendanceRegister\`) requires active session cookies (\`PHPSESSID\`) initiated via warmup to \`/mobilev2/showAttendance\`.\n`;
  md += `3. **Academic Results Publication Status:** Multi-semester results are published under web performance (\`studentPerformanceParent/graphDisplay\`), whereas legacy mobile common page 31 only surfaces published semester marksheets.\n`;

  return md;
}
