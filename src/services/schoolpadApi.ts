import {
  UserData,
  StudentProfile,
  OverallAttendance,
  TimetableSlot,
  CircularItem,
  CircularAttachment,
  ReportCard,
  ReportCardSubject,
  SemesterResult,
  gradeToPoint,
  calculateSGPA,
} from '../types';
import {
  calculateRawAttendance,
  calculateOverallAttendance,
} from '../utils/attendanceCalculations';
import {
  deriveTimetableFromRegister,
  AttendanceRegister,
  RegisterSubject,
  RegisterEntry,
  DerivedTimetableResult,
} from './timetableDerivation';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function stripHtml(html: string): string {
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

export function cleanDynamoValue(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return stripHtml(val);
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    if (val.S !== undefined) return stripHtml(String(val.S));
    if (val.N !== undefined) return String(val.N);
    if (val.BOOL !== undefined) return String(val.BOOL);
    if (val.NULL !== undefined) return '';
    if (val.value !== undefined) return cleanDynamoValue(val.value);
    return '';
  }
  return String(val);
}

function proxyUrl(targetUrl: string): string {
  return `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
}

export interface LoginResult {
  success: boolean;
  requiresOTP?: boolean;
  otpHint?: string;
  passwordExpired?: boolean;
  error?: string;
  userData?: UserData;
}

export class SchoolPadService {
  private baseUrl: string | null = null;
  private currentSchoolCode: string = '800002'; // Chitkara University Institute of Engineering & Technology
  private userDetails: UserData | null = null;
  private authToken: string | null = null;
  private securityToken: string | null = null;
  private deviceUUID: string = generateUUID();
  private registerInFlight: Promise<AttendanceRegister | null> | null = null;
  private derivedTimetableCache: { data: DerivedTimetableResult; timestamp: number } | null = null;
  private _timetableSource: 'official' | 'derived' | 'none' = 'none';

  constructor() {
    this.loadSessionFromStorage();
  }

  public saveSessionToStorage() {
    if (this.userDetails && this.authToken) {
      try {
        localStorage.setItem(
          'attendly_session_cache',
          JSON.stringify({
            baseUrl: this.baseUrl,
            userDetails: this.userDetails,
            authToken: this.authToken,
            securityToken: this.securityToken,
            deviceUUID: this.deviceUUID,
            currentSchoolCode: this.currentSchoolCode,
          })
        );
      } catch {}
    }
  }

  public loadSessionFromStorage() {
    try {
      const saved = localStorage.getItem('attendly_session_cache');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.baseUrl) this.baseUrl = data.baseUrl;
        if (data.userDetails) this.userDetails = data.userDetails;
        if (data.authToken) this.authToken = data.authToken;
        if (data.securityToken) this.securityToken = data.securityToken;
        if (data.deviceUUID) this.deviceUUID = data.deviceUUID;
        if (data.currentSchoolCode) this.currentSchoolCode = data.currentSchoolCode;
      }
    } catch {}
  }

  public getSchoolCode(): string {
    return this.currentSchoolCode;
  }

  public setSchoolCode(code: string) {
    this.currentSchoolCode = code.trim();
    this.baseUrl = null;
  }

  public getUserDetails(): UserData | null {
    return this.userDetails;
  }

  public getAuthToken(): string | null {
    return this.authToken;
  }

  public isLoggedIn(): boolean {
    return Boolean(this.authToken && this.userDetails);
  }

  public logout() {
    this.userDetails = null;
    this.authToken = null;
    this.securityToken = null;
    this.baseUrl = null;
    try {
      localStorage.removeItem('attendly_session_cache');
    } catch {}
  }

  /**
   * Resolves the school code to its dedicated portal URL (e.g. 800002 -> cuiet.codebrigade.in)
   */
  public async resolveSchoolUrl(schoolCode?: string): Promise<string> {
    const code = schoolCode || this.currentSchoolCode;
    try {
      const endpoint = proxyUrl('https://gdemo.schoolpad.in/mobile/getClientDetails');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `schoolCode=${encodeURIComponent(code)}`,
      });

      if (!response.ok) {
        throw new Error(`School resolution failed with status ${response.status}`);
      }

      const list = await response.json();
      if (Array.isArray(list) && list.length > 0) {
        const item = list[0];
        this.baseUrl = `https://${item.client_abbr}.${item.baseUrl}`;
        return this.baseUrl;
      }
      throw new Error('Invalid school code entered.');
    } catch (err: any) {
      console.error('Failed to resolve school URL:', err);
      throw new Error(err.message || 'Could not connect to school verification server.');
    }
  }

  /**
   * Triggers generation of a 15-minute one-time password / OTP sent to student's university email
   */
  public async generatePassword(username: string): Promise<{ success: boolean; message: string }> {
    if (!username.trim()) {
      return { success: false, message: 'Please enter your roll number first.' };
    }
    if (!this.baseUrl) {
      try {
        await this.resolveSchoolUrl();
      } catch {
        return { success: false, message: 'Could not connect to university ERP.' };
      }
    }
    try {
      const endpoint = proxyUrl(`${this.baseUrl}/loginManager/forgotPassword`);
      const body = `txtForgotPassword=${encodeURIComponent(username.trim())}&submitClose=1`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });
      const text = await response.text();
      const parts = text.split('|');
      const code = (parts[0] || '').trim();
      let msg = parts.length > 1 ? parts.slice(1).join('|') : text;
      msg = stripHtml(msg).replace(/reloading\s*\.*/gi, '').trim();

      if (code === '0' || /password\s+has\s+been|successfully\s*dispatched|password.*(sent|dispatched)/i.test(text)) {
        return {
          success: true,
          message: msg || 'A new password / OTP has been sent to your university email (valid for 15 minutes).',
        };
      }
      return {
        success: false,
        message: msg || 'Could not dispatch password. Please check your roll number.',
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error while requesting password.' };
    }
  }

  /**
   * Performs authentication against the university SchoolPad server.
   * NOTE: The password is NEVER logged, stored in localStorage, or persisted.
   */
  public async login(username: string, pass: string): Promise<LoginResult> {
    if (!this.baseUrl) {
      await this.resolveSchoolUrl();
    }

    try {
      const loginEndpoint = proxyUrl(`${this.baseUrl}/mobilev2/appLoginAuthV2`);
      const body = `deviceIdUUID=${encodeURIComponent(this.deviceUUID)}&device=android&txtUsername=${encodeURIComponent(username.trim())}&txtPassword=${encodeURIComponent(pass)}`;

      const response = await fetch(loginEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Server responded with HTTP ${response.status}. Please try again later.`,
        };
      }

      const text = await response.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        return {
          success: false,
          error: 'Invalid response from university portal. Please check network connection.',
        };
      }

      const status = String(json.status);
      const verificationStatus = String(json.verificationStatus ?? '');
      const rawData = json.data;
      const userObj = Array.isArray(rawData) && rawData.length > 0 ? rawData[0] : rawData;

      // Status 1: Login Success
      if (status === '1') {
        this.userDetails = userObj;
        this.authToken = userObj.apiKey || 'session-token';
        await this.fetchSecurityToken();
        this.saveSessionToStorage();
        return {
          success: true,
          userData: userObj,
        };
      }

      // Status 4: OTP Required
      if (status === '4') {
        return {
          success: false,
          requiresOTP: true,
          userData: userObj,
          otpHint: json.mobileString || 'your registered mobile number',
        };
      }

      // Status 8: Password Expired
      if (verificationStatus === '8' || status === '8') {
        return {
          success: false,
          passwordExpired: true,
          error: json.validation || 'Your university password has expired. Please reset it on the university portal.',
        };
      }

      // Status 0: Invalid Credentials
      if (status === '0') {
        return {
          success: false,
          error: 'Invalid username or password. Please verify your Chitkara roll number and password.',
        };
      }

      return {
        success: false,
        error: json.error || 'Authentication rejected by university ERP.',
      };
    } catch (err: any) {
      console.error('Login request failed:', err);
      return {
        success: false,
        error: err.message || 'Failed to connect to Chitkara University ERP.',
      };
    }
  }

  /**
   * Verifies mobile OTP for 2FA-enabled accounts
   */
  public async verifyOTP(authUserId: string, otpText: string): Promise<LoginResult> {
    if (!this.baseUrl) {
      return { success: false, error: 'Base URL not initialized' };
    }

    try {
      const endpoint = proxyUrl(`${this.baseUrl}/mobilev2/verifyOtp`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `authUserId=${encodeURIComponent(authUserId)}&OTPText=${encodeURIComponent(otpText.trim())}`,
      });

      const json = await response.json();
      if (String(json.status) === '1') {
        const rawData = json.data;
        const userObj = Array.isArray(rawData) ? rawData[0] : rawData;
        this.userDetails = userObj;
        this.authToken = userObj.apiKey;
        await this.fetchSecurityToken();
        this.saveSessionToStorage();
        return { success: true, userData: userObj };
      }

      return { success: false, error: json.error || 'Invalid OTP entered. Please try again.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'OTP verification failed.' };
    }
  }

  private async fetchSecurityToken() {
    if (!this.baseUrl || !this.userDetails) return;
    try {
      const endpoint = proxyUrl(`${this.baseUrl}/mobilev2/savetoken`);
      const body = `user_id=${this.userDetails.userId}&roleId=${this.userDetails.roleId}&clientId=${this.currentSchoolCode}&deviceIdUUID=${encodeURIComponent(this.deviceUUID)}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const data = await response.json();
      if (data && data.token) {
        this.securityToken = data.token;
      }
    } catch (err) {
      console.warn('Could not acquire security token:', err);
    }
  }

  private authSuffix(): string {
    return `&securityToken=${encodeURIComponent(this.securityToken || '')}&deviceIdUUID=${encodeURIComponent(this.deviceUUID)}`;
  }

  /**
   * Fetches real Student Profile details
   */
  public async getProfileDetails(): Promise<StudentProfile | null> {
    if (!this.baseUrl || !this.authToken || !this.userDetails) return null;

    try {
      const endpoint = proxyUrl(`${this.baseUrl}/mobilev2/getUserDetails`);
      const body = `userId=${this.userDetails.userId}&sessionId=${this.userDetails.sessionId}&apiKey=${encodeURIComponent(this.authToken)}&roleId=${this.userDetails.roleId}${this.authSuffix()}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });

      if (!response.ok) return null;
      const json = await response.json();
      const raw = Array.isArray(json.data) ? json.data[0] : json.data || {};

      const studentName = cleanDynamoValue(raw.studentName || raw.firstName || raw.student_name || raw.name || this.userDetails.name) || 'Student';
      const firstName = studentName.split(' ')[0] || 'Student';

      return {
        studentName,
        rollNo: cleanDynamoValue(raw.rollNo || raw.regNo || raw.roll_no || this.userDetails.feedName) || '',
        className: cleanDynamoValue(raw.className || raw.stuClassName || raw.class_name) || 'B.Tech CSE',
        section: cleanDynamoValue(raw.section || raw.Section) || 'A',
        email: cleanDynamoValue(raw.studentEmail || raw.email || raw.emailId) || 'student@chitkara.edu.in',
        mobile: cleanDynamoValue(raw.studentMobileNo || raw.mobile || raw.mobileNo || raw.phone) || '',
        phone: cleanDynamoValue(raw.phone || raw.studentMobileNo || raw.mobile) || '',
        dateOfBirth: cleanDynamoValue(raw.dateOfBirth || raw.dob || raw.date_of_birth) || '',
        dob: cleanDynamoValue(raw.dob || raw.dateOfBirth) || '',
        category: cleanDynamoValue(raw.category || raw.Category) || 'General',
        fatherName: cleanDynamoValue(raw.fatherName || raw.father_name) || 'Father',
        fatherMobile: cleanDynamoValue(raw.fatherMobile || raw.fatherMobileNo || raw.fatherPhone) || '',
        motherName: cleanDynamoValue(raw.motherName || raw.mother_name) || 'Mother',
        motherMobile: cleanDynamoValue(raw.motherMobile || raw.motherMobileNo || raw.motherPhone) || '',
        profilePhoto: cleanDynamoValue(raw.profilePhoto || this.userDetails.photo) || '',
        address: cleanDynamoValue(raw.address || raw.currentAddress) || '',
        permanentAddress: cleanDynamoValue(raw.permanentAddress || raw.address) || '',
        currentAddress: cleanDynamoValue(raw.currentAddress || raw.address) || '',
        stuClassName: cleanDynamoValue(raw.stuClassName || raw.className) || '',
        regNo: cleanDynamoValue(raw.regNo || raw.rollNo) || '',
        studentEmail: cleanDynamoValue(raw.studentEmail || raw.email) || '',
        studentMobileNo: cleanDynamoValue(raw.studentMobileNo || raw.mobile) || '',
        firstName,
        userId: String(this.userDetails.userId),
      };
    } catch (err) {
      console.error('Failed to load profile details:', err);
      return null;
    }
  }

  /**
   * Fetches the raw ChalkPad Pro HTML Attendance Register
   * Uses proxy warmup header to establish the web session before fetching register.
   */
  public async getAttendanceRegister(): Promise<AttendanceRegister | null> {
    if (!this.registerInFlight) {
      this.registerInFlight = this._fetchAttendanceRegister().finally(() => {
        this.registerInFlight = null;
      });
    }
    return this.registerInFlight;
  }

  private async _fetchAttendanceRegister(): Promise<AttendanceRegister | null> {
    if (!this.baseUrl || !this.authToken || !this.userDetails) return null;
    const studentId = (this.userDetails as any).studentId || this.userDetails.userId;

    try {
      const warmupUrl = `${this.baseUrl}/mobilev2/showAttendance`;
      const warmupBody = `prevNext=0&userId=${this.userDetails.userId}&sessionId=${this.userDetails.sessionId}&apiKey=${this.authToken}&roleId=${this.userDetails.roleId}&month=${this.authSuffix()}`;

      const targetUrl = `${this.baseUrl}/chalkpadpro/studentDetails/getAttendanceRegister`;
      const targetBody = `studentId=${studentId}&sessionId=${this.userDetails.sessionId}&userId=${this.userDetails.userId}&apiKey=${this.authToken}&roleId=${this.userDetails.roleId}${this.authSuffix()}`;

      const headers: Record<string, string> = {
        'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 10; SM-G960F)',
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Warmup-Url': encodeURIComponent(warmupUrl),
        'X-Warmup-Body': encodeURIComponent(warmupBody),
      };

      const response = await fetch(proxyUrl(targetUrl), {
        method: 'POST',
        headers,
        body: targetBody,
      });

      if (!response.ok) return null;
      const html = await response.text();
      if (!html || html.length < 100) return null;

      const subjects = this.parseAttendanceRegister(html);
      return { subjects };
    } catch (err) {
      console.error('Failed to fetch attendance register:', err);
      return null;
    }
  }

  public parseAttendanceRegister(html: string): RegisterSubject[] {
    const list: RegisterSubject[] = [];
    try {
      const parts = html.split(/<thead>/gi).filter((s) => s.trim().length > 0);
      for (const section of parts) {
        const headerMatch = section.match(/<th>([^<]+)<br>\(([^)]+)\)<\/th>/i);
        if (!headerMatch) continue;

        const subjectName = headerMatch[1].trim();
        const courseCode = headerMatch[2].trim();
        const columnHeaders: { lectureNum: number; date: string; period: string }[] = [];

        const colRegex = /<th>(\d+)<br>(\d{2}-\d{2})<br>(\d+)<\/th>/gi;
        let cMatch;
        while ((cMatch = colRegex.exec(section)) !== null) {
          columnHeaders.push({
            lectureNum: parseInt(cMatch[1], 10),
            date: cMatch[2],
            period: cMatch[3],
          });
        }

        const tbodyMatch = section.match(/<tbody[^>]*>([\s\S]*?)(?:<\/tbody>|$)/i);
        if (!tbodyMatch) continue;

        const cellRegex = /<td[^>]*>([^<]*)<\/td>/gi;
        const cellValues: string[] = [];
        let dMatch;
        while ((dMatch = cellRegex.exec(tbodyMatch[1])) !== null) {
          cellValues.push(dMatch[1].trim());
        }

        const dataCells = cellValues.slice(1);
        const percentageStr = dataCells.pop() || '0%';
        const totalStr = dataCells.pop() || '0/0';
        const entries: RegisterEntry[] = [];

        for (let i = 0; i < Math.min(columnHeaders.length, dataCells.length); i++) {
          const rawStatus = dataCells[i];
          const col = columnHeaders[i];
          const status = rawStatus === 'X' ? 'A' : rawStatus === 'ML' ? 'ML' : rawStatus === 'DL' ? 'DL' : 'P';
          entries.push({
            lectureNum: col.lectureNum,
            date: col.date,
            period: col.period,
            status,
          });
        }

        list.push({
          subjectName,
          courseCode,
          entries,
          total: totalStr,
          percentage: percentageStr,
        });
      }
    } catch (err) {
      console.error('Error parsing attendance register:', err);
    }
    return list;
  }

  /**
   * Fetches and parses real subject-wise attendance from SchoolPad
   * Falls back automatically to ChalkPad Pro attendance register if commonPage 28 is empty.
   */
  public async getAttendanceSubjectwise(): Promise<OverallAttendance | null> {
    if (!this.baseUrl || !this.authToken || !this.userDetails) return null;

    try {
      // 1. Try standard commonPage 28
      const endpoint = proxyUrl(`${this.baseUrl}/mobilev2/commonPage`);
      const body = `commonObj=&commonPageId=28&device=android&userId=${this.userDetails.userId}&sessionId=${this.userDetails.sessionId}&roleId=${this.userDetails.roleId}${this.authSuffix()}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });

      let subjects: any[] = [];
      let title = 'Attendance Subjectwise';

      if (response.ok) {
        const json = await response.json().catch(() => ({}));
        title = json.title || 'Attendance Subjectwise';
        const content = json.content || '';
        if (content) {
          const plainText = stripHtml(content);
          const regex = /([^0-9]+?)\s+(\d{2}[A-Z]{2,4}\d{2,4})\s+Teacher\s*:\s*(.+?)From\s*:\s*(\d{1,2}\s+\w+\s+\d{4})\s+TO\s*:\s*(\d{1,2}\s+\w+\s+\d{4})\s*Delivered\s*:\s*(\d+)\s*Attended\s*:\s*(\d+)\s*Absent\s*:\s*(\d+)\s*DL\s*:\s*(\d+)\s*ML\s*:\s*(\d+)\s*Total Percentage\s*:\s*([\d.]+)%\s*Total Approved DL\s*:\s*(\d+)\s*Total Approved ML\s*:\s*(\d+)/gi;

          let match;
          while ((match = regex.exec(plainText)) !== null) {
            const [, name, code, teacher, , , deliveredStr, attendedStr, absentStr, dlStr, mlStr, pctStr, approvedDlStr, approvedMlStr] = match;
            const delivered = parseInt(deliveredStr, 10) || 0;
            const attended = parseInt(attendedStr, 10) || 0;
            const absent = parseInt(absentStr, 10) || Math.max(0, delivered - attended);
            const dl = parseInt(dlStr, 10) || 0;
            const ml = parseInt(mlStr, 10) || 0;
            const approvedDl = approvedDlStr ? parseInt(approvedDlStr, 10) : undefined;
            const approvedMl = approvedMlStr ? parseInt(approvedMlStr, 10) : undefined;
            const parsedOfficialPct = pctStr ? parseFloat(pctStr) : null;
            const officialPct = parsedOfficialPct !== null && !isNaN(parsedOfficialPct) ? parsedOfficialPct : null;
            const rawPct = calculateRawAttendance(attended, delivered, 2);

            subjects.push({
              subject_name: name.trim(),
              course_code: code.trim(),
              teacher: teacher.trim(),
              delivered,
              attended,
              absent,
              duty_leave: dl,
              medical_leave: ml,
              approved_duty_leave: approvedDl,
              approved_medical_leave: approvedMl,
              official_percentage: officialPct,
              raw_percentage: rawPct,
              percentage: officialPct !== null ? officialPct : rawPct,
            });
          }
        }
      }

      // 2. If commonPage 28 returned no subjects, recover from ChalkPad Pro attendance register
      if (subjects.length === 0) {
        const register = await this.getAttendanceRegister();
        if (register && register.subjects && register.subjects.length > 0) {
          for (const regSub of register.subjects) {
            const totalParts = regSub.total.split('/').map((s) => parseInt(s.trim(), 10));
            const attended = totalParts[0] || regSub.entries.filter((e) => e.status === 'P').length;
            const delivered = totalParts[1] || regSub.entries.length;
            const absent = Math.max(0, delivered - attended);
            const dl = regSub.entries.filter((e) => e.status === 'DL').length;
            const ml = regSub.entries.filter((e) => e.status === 'ML').length;
            const parsedOfficialPct = parseFloat(regSub.percentage.replace('%', ''));
            const officialPct = !isNaN(parsedOfficialPct) ? parsedOfficialPct : null;
            const rawPct = calculateRawAttendance(attended, delivered, 2);

            subjects.push({
              subject_name: regSub.subjectName,
              course_code: regSub.courseCode,
              teacher: 'Faculty',
              delivered,
              attended,
              absent,
              duty_leave: dl,
              medical_leave: ml,
              official_percentage: officialPct,
              raw_percentage: rawPct,
              percentage: officialPct !== null ? Math.round(officialPct * 10) / 10 : rawPct,
            });
          }
        }
      }

      if (subjects.length === 0) return null;

      const summary = calculateOverallAttendance(subjects);

      return {
        title,
        page_id: '28',
        page_name: 'Attendance Subjectwise',
        total_subjects: subjects.length,
        total_delivered: summary.totalDelivered,
        total_attended: summary.totalAttended,
        total_absent: summary.totalAbsent,
        total_duty_leave: summary.totalDutyLeave,
        total_medical_leave: summary.totalMedicalLeave,
        total_approved_duty_leave: summary.totalApprovedDutyLeave,
        total_approved_medical_leave: summary.totalApprovedMedicalLeave,
        raw_percentage: summary.rawPercentage,
        overall_percentage: summary.roundedPercentage,
        subjects,
      };
    } catch (err) {
      console.error('Failed to fetch attendance data:', err);
      return null;
    }
  }

  /**
   * Fetches real Timetable from SchoolPad
   * If commonPage 85 returns empty, reconstructs schedule using deriveTimetableFromRegister.
   */
  public async getTimetable(): Promise<TimetableSlot[]> {
    if (!this.baseUrl || !this.authToken || !this.userDetails) return [];

    try {
      const endpoint = proxyUrl(`${this.baseUrl}/mobilev2/commonPage`);
      const body = `commonObj=&commonPageId=85&device=android&userId=${this.userDetails.userId}&sessionId=${this.userDetails.sessionId}&roleId=${this.userDetails.roleId}${this.authSuffix()}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });

      if (response.ok) {
        const json = await response.json().catch(() => ({}));
        const content = json.content || '';
        if (content) {
          const slots = this.parseTimetable(content);
          if (slots.length > 0) {
            this._timetableSource = 'official';
            return slots;
          }
        }
      }

      // Rebuild from attendance register
      return this.getTimetableFromRegister('no official timetable found');
    } catch (err) {
      console.warn('Official timetable request failed, falling back to register derivation:', err);
      return this.getTimetableFromRegister('timetable request failed');
    }
  }

  public async getTimetableFromRegister(reason = ''): Promise<TimetableSlot[]> {
    console.log(`Rebuilding timetable from attendance register (${reason})...`);
    try {
      const register = await this.getAttendanceRegister();
      if (!register) return [];

      const derived = deriveTimetableFromRegister(register);
      if (derived.entries.length === 0) return [];

      this.derivedTimetableCache = { data: derived, timestamp: Date.now() };
      this._timetableSource = 'derived';

      // Attach subject names
      const subjectNameMap = new Map<string, string>();
      for (const s of derived.subjects) {
        subjectNameMap.set(s.subjectCode, s.subjectName);
      }

      return derived.entries.map((entry, idx) => ({
        day: entry.day,
        dayNumber: entry.dayNumber,
        subjectCode: entry.subjectCode,
        subjectName: subjectNameMap.get(entry.subjectCode) || entry.subjectName || entry.subjectCode,
        startTime: entry.startTime,
        endTime: entry.endTime,
        teacherName: entry.teacherName || 'Faculty',
        period: entry.period || idx + 1,
        roomNumber: 'Classroom',
      }));
    } catch (err) {
      console.error('Error deriving timetable:', err);
      return [];
    }
  }

  public getTimetableSource(): 'official' | 'derived' | 'none' {
    return this._timetableSource;
  }

  public getDerivedTimetableMeta(): any {
    if (!this.derivedTimetableCache) return null;
    const { entries, subjects, ...meta } = this.derivedTimetableCache.data;
    return meta;
  }

  public parseTimetable(html: string): TimetableSlot[] {
    const slots: TimetableSlot[] = [];
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    const tables: string[] = [];
    let tMatch;
    while ((tMatch = tableRegex.exec(html)) !== null) {
      tables.push(tMatch[1]);
    }
    if (tables.length === 0) return slots;

    let bestTable = tables[0];
    let maxFilled = 0;
    for (const t of tables) {
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let count = 0;
      let c;
      while ((c = cellRegex.exec(t)) !== null) {
        const text = stripHtml(c[1]);
        if (text.length > 5) count++;
      }
      if (count > maxFilled) {
        maxFilled = count;
        bestTable = t;
      }
    }

    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows: string[] = [];
    let rMatch;
    while ((rMatch = rowRegex.exec(bestTable)) !== null) {
      rows.push(rMatch[1]);
    }
    if (rows.length < 2) return slots;

    const header = rows[0];
    if (/Days\/Periods/i.test(header) || /rowheading/i.test(header)) {
      return this.parseWeeklyTimetable(rows);
    }
    return this.parseDailyTimetable(rows);
  }

  private parseWeeklyTimetable(rows: string[]): TimetableSlot[] {
    const slots: TimetableSlot[] = [];
    const headerCells = rows[0].match(/<t[hd][^>]*>[\s\S]*?<\/t[hd]>/gi) || [];
    const periods: { period: number; start: string; end: string }[] = [];

    for (let i = 1; i < headerCells.length; i++) {
      const cellText = stripHtml(headerCells[i].replace(/<br\s*\/?>/gi, '\n'));
      const lines = cellText.split('\n').map((s) => s.trim()).filter(Boolean);
      if (lines.length >= 3) {
        periods.push({
          period: parseInt(lines[0], 10),
          start: lines[1],
          end: lines[2],
        });
      } else {
        const clean = cellText.replace(/\s+/g, '');
        const m = clean.match(/^(\d)(\d{1,2}:\d{2}\s*(?:AM|PM)?)(\d{1,2}:\d{2}\s*(?:AM|PM)?)$/i);
        if (m) {
          periods.push({
            period: parseInt(m[1], 10),
            start: m[2],
            end: m[3],
          });
        }
      }
    }

    const daysMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    for (let r = 1; r < rows.length; r++) {
      const cells = rows[r].match(/<td[^>]*>[\s\S]*?<\/td>/gi) || [];
      if (cells.length < 2) continue;

      const dayName = stripHtml(cells[0] || '').trim();
      const dayNum = daysMap[dayName.toLowerCase()];
      if (dayNum === undefined) continue;

      for (let c = 1; c < cells.length && c - 1 < periods.length; c++) {
        const rawCell = cells[c] || '';
        const cellText = stripHtml(rawCell);
        if (!cellText || cellText.length < 2) continue;

        let subjectCode = '';
        const titleMatch = rawCell.match(/<span[^>]*title=["']([^"']+)["'][^>]*>([^<]+)<\/span>/i);
        if (titleMatch) {
          subjectCode = titleMatch[2].trim();
        } else {
          const codeMatch = cellText.match(/(\d{2}[A-Z]{3}\d{4})/);
          if (codeMatch) subjectCode = codeMatch[1];
        }

        if (subjectCode) {
          const p = periods[c - 1];
          slots.push({
            day: dayName,
            dayNumber: dayNum,
            subjectCode,
            subjectName: subjectCode,
            startTime: p.start,
            endTime: p.end,
            period: p.period,
            teacherName: 'Faculty',
            roomNumber: 'Classroom',
          });
        }
      }
    }

    return slots;
  }

  private parseDailyTimetable(rows: string[]): TimetableSlot[] {
    const slots: TimetableSlot[] = [];
    const today = new Date().getDay();
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today];

    for (let r = 1; r < rows.length; r++) {
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      const cells: string[] = [];
      let c;
      while ((c = cellRegex.exec(rows[r])) !== null) {
        cells.push(stripHtml(c[1]));
      }
      if (cells.length < 2) continue;

      const timeMatch = (cells[1] || '').match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
      const code = cells[0] || 'CLASS';
      slots.push({
        day: dayName,
        dayNumber: today,
        subjectCode: code,
        subjectName: cells[2] || code,
        startTime: timeMatch ? timeMatch[1].trim() : '09:00',
        endTime: timeMatch ? timeMatch[2].trim() : '10:00',
        teacherName: cells[3] || 'Faculty',
        period: r,
        roomNumber: 'LH',
      });
    }

    return slots;
  }

  public async getSubjects(): Promise<any[]> {
    if (!this.baseUrl || !this.authToken || !this.userDetails) return [];
    try {
      const endpoint = proxyUrl(`${this.baseUrl}/mobilev2/commonPage`);
      const body = `commonObj=&commonPageId=80&device=android&userId=${this.userDetails.userId}&sessionId=${this.userDetails.sessionId}&roleId=${this.userDetails.roleId}${this.authSuffix()}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });

      if (response.ok) {
        const json = await response.json().catch(() => ({}));
        const content = json.content || '';
        const parsed = this.parseSubjects(content);
        if (parsed.length > 0) return parsed;
      }
      return this.getSubjectsFromRegister();
    } catch {
      return this.getSubjectsFromRegister();
    }
  }

  public async getSubjectsFromRegister(): Promise<any[]> {
    try {
      const register = await this.getAttendanceRegister();
      if (!register) return [];
      const derived = deriveTimetableFromRegister(register);
      return derived.subjects;
    } catch {
      return [];
    }
  }

  public parseSubjects(html: string): any[] {
    const list: any[] = [];
    const parts = html.split('class="ui-subject-wrap"');
    for (let i = 1; i < parts.length; i++) {
      const p = parts[i];
      const item: any = {};
      const nameMatch = p.match(/<b>Subject Name:<\/b>\s*([^<]+)/);
      if (nameMatch) item.subjectName = stripHtml(nameMatch[1]);
      const codeMatch = p.match(/<b>Subject Code:<\/b>\s*([^<]+)/);
      if (codeMatch) {
        const code = stripHtml(codeMatch[1]);
        item.subjectCode = code.replace(/\s*\(Optional\)/, '').trim();
        item.isOptional = code.includes('(Optional)');
      }
      const typeMatch = p.match(/<b>Subject Type:<\/b>\s*([^<]+)/);
      if (typeMatch) item.subjectType = stripHtml(typeMatch[1]);
      if (item.subjectCode && item.subjectName) list.push(item);
    }
    return list;
  }

  /**
   * Fetches real notices and announcements from SchoolPad feed
   */
  public async getFeed(start = 0, limit = 10): Promise<CircularItem[]> {
    if (!this.baseUrl || !this.authToken || !this.userDetails) return [];

    try {
      const endpoint = proxyUrl(`${this.baseUrl}/mobilev2/getAppFeed`);
      const body = `userId=${this.userDetails.userId}&roleId=${this.userDetails.roleId}&sessionId=${this.userDetails.sessionId}&start=${start}&limit=${limit}&appKey=${this.authToken}${this.authSuffix()}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });

      if (!response.ok) return [];
      const json = await response.json();
      const feed = json.feed || [];

      return feed.map((item: any, i: number) => ({
        id: cleanDynamoValue(item.id) || cleanDynamoValue(item.itemId) || `circ-${i}`,
        title: cleanDynamoValue(item.title) || 'Official Announcement',
        desc: cleanDynamoValue(item.desc) || '',
        creDate: cleanDynamoValue(item.creDate) || 'Recent',
        type: cleanDynamoValue(item.type) || 'Notice',
        category: i < 2 ? 'Yesterday' : 'This Week',
        unread: i === 0,
      }));
    } catch (err) {
      console.error('Failed to fetch circulars feed:', err);
      return [];
    }
  }

  /**
   * Fetches detailed circular item information including attachments
   */
  public async getNoticeDetails(itemId: string, itemType: string = 'circular'): Promise<{
    desc?: string;
    rawDesc?: string;
    attachments: CircularAttachment[];
  } | null> {
    if (!this.baseUrl || !this.authToken || !this.userDetails) return null;

    try {
      const endpoint = proxyUrl(`${this.baseUrl}/mobilev2/getAppItemDetail`);
      const body = `itemId=${encodeURIComponent(itemId)}&itemType=${encodeURIComponent(itemType)}&userId=${this.userDetails.userId}&timeStamp=${Date.now()}&roleId=${this.userDetails.roleId}${this.authSuffix()}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });

      if (!response.ok) return null;
      const json = await response.json().catch(() => ({}));

      const rawDesc = json.desc || json.itemDetail || json.description || '';
      const desc = stripHtml(rawDesc);
      const rawAttachments = json.attachments || json.attachment || json.files || [];

      const attachments: CircularAttachment[] = [];
      if (Array.isArray(rawAttachments)) {
        for (const att of rawAttachments) {
          const fileName = cleanDynamoValue(att.fileName || att.name);
          const storedAs = cleanDynamoValue(att.attachmentStoredAs || att.storedAs || att.url);
          if (fileName || storedAs) {
            const ext = (fileName.split('.').pop() || '').toLowerCase();
            const downloadUrl = storedAs.startsWith('http')
              ? storedAs
              : `${this.baseUrl}/mobilev2/getAppAttachmentDetails?fileName=${encodeURIComponent(storedAs)}`;
            attachments.push({
              name: fileName || 'Attachment',
              url: proxyUrl(downloadUrl),
              fileType: ext || 'file',
            });
          }
        }
      }

      return { desc, rawDesc, attachments };
    } catch (err) {
      console.error('Failed to fetch notice details:', err);
      return null;
    }
  }

  /**
   * Fetches real Report Card / Grades from SchoolPad (commonPageId=31)
   */
  public async getReportCard(): Promise<ReportCard | null> {
    if (!this.baseUrl || !this.authToken || !this.userDetails) return null;

    try {
      const endpoint = proxyUrl(`${this.baseUrl}/mobilev2/commonPage`);
      const body = `commonObj=&commonPageId=31&device=android&userId=${this.userDetails.userId}&sessionId=${this.userDetails.sessionId}&roleId=${this.userDetails.roleId}${this.authSuffix()}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });

      if (!response.ok) return null;
      const json = await response.json().catch(() => ({}));
      const content = json.content || '';
      if (!content) return null;

      return this.parseReportCard(content);
    } catch (err) {
      console.error('Failed to fetch report card:', err);
      return null;
    }
  }

  public parseReportCard(content: string): ReportCard {
    const plain = stripHtml(content);
    const overallCgpaMatch = plain.match(/CGPA:\s*([\d.]+)/i);
    const overallSgpaMatch = plain.match(/SGPA:\s*([\d.]+)/i);
    const defaultSemMatch = plain.match(/Study Period:\s*(\d+)\s*SEM/i);

    const semesters: SemesterResult[] = [];
    let currentSubjects: ReportCardSubject[] = [];
    let latestReportedCgpa = 0;

    // Find table rows
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;

    while ((rowMatch = rowRegex.exec(content)) !== null) {
      const rowHtml = rowMatch[1];
      const rowText = stripHtml(rowHtml);

      // Check for summary row (e.g. Study Period: 1 SEM SGPA: 8.88 CGPA: 8.88)
      const periodMatch = rowText.match(/Study Period:\s*(\d+)\s*SEM/i);
      if (periodMatch) {
        const semNum = parseInt(periodMatch[1], 10);
        const semSgpaMatch = rowText.match(/SGPA:\s*([\d.]+)/i);
        const semSgpa = semSgpaMatch ? parseFloat(semSgpaMatch[1]) : calculateSGPA(currentSubjects);
        const semCgpaMatch = rowText.match(/CGPA:\s*([\d.]+)/i);
        if (semCgpaMatch) {
          latestReportedCgpa = parseFloat(semCgpaMatch[1]);
        }
        const totalCredits = currentSubjects.reduce((sum, s) => sum + s.credits, 0);
        const earnedCredits = currentSubjects.reduce((sum, s) => (gradeToPoint(s.grade) > 0 ? sum + s.credits : sum), 0);

        semesters.push({
          semester: `Semester ${semNum}`,
          semesterNumber: semNum,
          sgpa: semSgpa,
          academicYear: '2024 - 2025',
          subjects: [...currentSubjects],
          totalCredits,
          earnedCredits,
          isCurrent: false,
        });

        currentSubjects = [];
        continue;
      }

      // Check for subject data row
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells: string[] = [];
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
        cells.push(stripHtml(cellMatch[1]).trim());
      }

      // Expected columns: [index, courseCode, courseName, credits, grade]
      if (cells.length >= 5) {
        const code = cells[1];
        const name = cells[2];
        const credits = parseFloat(cells[3]) || 3;
        const grade = cells[4];

        // Ensure this is a valid subject row and not a header row
        if (code && name && grade && !code.toLowerCase().includes('subject') && !code.toLowerCase().includes('code')) {
          currentSubjects.push({
            name,
            code,
            credits,
            grade,
            marks: 85,
            maxMarks: 100,
          });
        }
      }
    }

    // If no summary row was found but subjects were parsed (single semester)
    if (semesters.length === 0 && currentSubjects.length > 0) {
      const semNum = defaultSemMatch ? parseInt(defaultSemMatch[1], 10) : 1;
      const sgpa = overallSgpaMatch ? parseFloat(overallSgpaMatch[1]) : calculateSGPA(currentSubjects);
      const totalCredits = currentSubjects.reduce((sum, s) => sum + s.credits, 0);
      const earnedCredits = currentSubjects.reduce((sum, s) => (gradeToPoint(s.grade) > 0 ? sum + s.credits : sum), 0);

      semesters.push({
        semester: `Semester ${semNum}`,
        semesterNumber: semNum,
        sgpa,
        academicYear: '2024 - 2025',
        subjects: currentSubjects,
        totalCredits,
        earnedCredits,
        isCurrent: true,
      });
    }

    // Sort ascending by semester number and mark the highest semester as current
    semesters.sort((a, b) => a.semesterNumber - b.semesterNumber);
    if (semesters.length > 0) {
      semesters[semesters.length - 1].isCurrent = true;
    }

    const latestSem = semesters[semesters.length - 1];
    const latestCgpa = latestReportedCgpa > 0
      ? latestReportedCgpa
      : overallCgpaMatch
      ? parseFloat(overallCgpaMatch[1])
      : latestSem
      ? latestSem.sgpa
      : 0;

    return {
      semester: latestSem ? latestSem.semester : 'Semester 1',
      sgpa: latestSem ? latestSem.sgpa : 0,
      cgpa: latestCgpa,
      academicYear: '2024 - 2025',
      subjects: latestSem ? latestSem.subjects : [],
      semesters,
    };
  }
}

export const schoolPadApi = new SchoolPadService();
