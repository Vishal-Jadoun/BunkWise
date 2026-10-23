/**
 * Statistical timetable derivation engine
 * Reconstructs a student's weekly timetable by analyzing raw lecture records from the attendance register.
 */

export interface RegisterEntry {
  lectureNum: number;
  date: string;
  period: string;
  status: 'P' | 'A' | 'DL' | 'ML';
}

export interface RegisterSubject {
  subjectName: string;
  courseCode: string;
  entries: RegisterEntry[];
  total: string;
  percentage: string;
}

export interface AttendanceRegister {
  subjects: RegisterSubject[];
}

export interface DerivedSlot {
  day: string;
  dayNumber: number;
  subjectCode: string;
  subjectName?: string;
  teacherName?: string;
  period: number;
  startTime: string;
  endTime: string;
  inferred: boolean;
  timeInferred: boolean;
  occurrences: number;
}

export interface DerivedSubject {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
}

export interface DerivedTimetableResult {
  entries: DerivedSlot[];
  subjects: DerivedSubject[];
  weeksObserved: number;
  observations: number;
  slots: number;
  dateFormat: string;
  windowed: boolean;
  minOccurrences: number;
  confidence: number;
  timesInferred: boolean;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ONE_WEEK_MS = 604800000;
const THREE_DAYS_MS = 259200000;

export function periodPlaceholderTimes(period: number): { startTime: string; endTime: string } {
  const startHour = 9 + (period - 1);
  const endHour = startHour + 1;
  const pad = (h: number) => `${String(Math.min(h, 23)).padStart(2, '0')}:00`;
  return { startTime: pad(startHour), endTime: pad(endHour) };
}

function parsePeriod(val: any): number | null {
  if (val == null) return null;
  const match = String(val).match(/\d+/);
  if (!match) return null;
  const p = parseInt(match[0], 10);
  return Number.isFinite(p) && p > 0 && p <= 20 ? p : null;
}

function parseDateParts(val: any): [number, number] | null {
  if (!val) return null;
  const match = String(val).trim().match(/^(\d{1,2})\s*[-/]\s*(\d{1,2})$/);
  if (!match) return null;
  const d1 = parseInt(match[1], 10);
  const d2 = parseInt(match[2], 10);
  return Number.isFinite(d1) && Number.isFinite(d2) ? [d1, d2] : null;
}

function getWeekIndex(timeMs: number): number {
  return Math.floor((timeMs + THREE_DAYS_MS) / ONE_WEEK_MS);
}

function getAcademicMonthOffsets(monthsSet: Set<number>): Map<number, number> {
  const sorted = [...monthsSet].sort((a, b) => a - b);
  const offsets = new Map<number, number>();
  if (sorted.length === 0) return offsets;

  let maxGap = -1;
  let startMonth = sorted[0];
  for (let i = 0; i < sorted.length; i++) {
    const prev = sorted[(i - 1 + sorted.length) % sorted.length];
    const gap = (sorted[i] - prev + 12) % 12;
    if (gap > maxGap) {
      maxGap = gap;
      startMonth = sorted[i];
    }
  }

  for (const m of sorted) {
    offsets.set(m, m >= startMonth ? 0 : 1);
  }
  return offsets;
}

interface RawObservation {
  courseCode: string;
  subjectName: string;
  time: number;
  dayNumber: number;
  period: number;
  week: number;
}

function extractObservations(
  register: AttendanceRegister,
  dateFormat: 'DD-MM' | 'MM-DD',
  now: number
): RawObservation[] {
  const rawList: { courseCode: string; subjectName: string; day: number; month: number; period: number }[] = [];
  const monthsSet = new Set<number>();

  for (const sub of register.subjects || []) {
    const code = (sub.courseCode || '').trim();
    if (!code) continue;

    for (const ent of sub.entries || []) {
      const parts = parseDateParts(ent.date);
      const period = parsePeriod(ent.period);
      if (!parts || period === null) continue;

      const [day, month] = dateFormat === 'DD-MM' ? [parts[0], parts[1]] : [parts[1], parts[0]];
      if (month < 1 || month > 12 || day < 1 || day > 31) return [];

      rawList.push({
        courseCode: code,
        subjectName: (sub.subjectName || '').trim(),
        day,
        month,
        period,
      });
      monthsSet.add(month);
    }
  }

  if (rawList.length === 0) return [];

  const monthOffsets = getAcademicMonthOffsets(monthsSet);
  let baseYear = new Date(now).getFullYear();

  for (let attempt = 0; attempt < 3; attempt++) {
    let latestTime = -Infinity;
    for (const obs of rawList) {
      const yearOffset = monthOffsets.get(obs.month) || 0;
      const t = new Date(baseYear + yearOffset, obs.month - 1, obs.day).getTime();
      if (t > latestTime) latestTime = t;
    }
    if (latestTime <= now + ONE_WEEK_MS) break;
    baseYear -= 1;
  }

  const results: RawObservation[] = [];
  for (const obs of rawList) {
    const yearOffset = monthOffsets.get(obs.month) || 0;
    const d = new Date(baseYear + yearOffset, obs.month - 1, obs.day);
    if (d.getMonth() !== obs.month - 1 || d.getDate() !== obs.day) continue;

    const time = d.getTime();
    results.push({
      courseCode: obs.courseCode,
      subjectName: obs.subjectName,
      time,
      dayNumber: d.getDay(),
      period: obs.period,
      week: getWeekIndex(time),
    });
  }

  return results;
}

function calculateConsistencyScore(observations: RawObservation[]): number {
  if (observations.length === 0) return 0;
  const countMap = new Map<string, number>();
  for (const obs of observations) {
    const key = `${obs.dayNumber}|${obs.period}|${obs.courseCode}`;
    countMap.set(key, (countMap.get(key) || 0) + 1);
  }

  let recurrent = 0;
  for (const obs of observations) {
    const key = `${obs.dayNumber}|${obs.period}|${obs.courseCode}`;
    if ((countMap.get(key) || 0) >= 2) recurrent++;
  }

  return recurrent / observations.length;
}

function resolveDateFormat(
  register: AttendanceRegister,
  now: number
): { format: 'DD-MM' | 'MM-DD'; observations: RawObservation[] } {
  const dd = extractObservations(register, 'DD-MM', now);
  const mm = extractObservations(register, 'MM-DD', now);

  if (mm.length === 0) return { format: 'DD-MM', observations: dd };
  if (dd.length === 0 || calculateConsistencyScore(mm) > calculateConsistencyScore(dd) + 0.05) {
    return { format: 'MM-DD', observations: mm };
  }
  return { format: 'DD-MM', observations: dd };
}

function getMinOccurrences(weeks: number): number {
  return weeks >= 6 ? 3 : weeks >= 3 ? 2 : 1;
}

export function deriveTimetableFromRegister(
  register: AttendanceRegister | null,
  now: number = Date.now()
): DerivedTimetableResult {
  const emptyResult: DerivedTimetableResult = {
    entries: [],
    subjects: [],
    weeksObserved: 0,
    observations: 0,
    slots: 0,
    dateFormat: 'DD-MM',
    windowed: false,
    minOccurrences: 0,
    confidence: 0,
    timesInferred: true,
  };

  if (!register || !Array.isArray(register.subjects) || register.subjects.length === 0) {
    return emptyResult;
  }

  const { format, observations } = resolveDateFormat(register, now);
  if (observations.length === 0) return emptyResult;

  // Window to recent 8 weeks if sufficient history exists
  const maxWeek = Math.max(...observations.map((o) => o.week));
  const recentCutoff = maxWeek - 7;
  const recentObs = observations.filter((o) => o.week >= recentCutoff);
  const distinctRecentWeeks = new Set(recentObs.map((o) => o.week)).size;
  const isWindowed = distinctRecentWeeks >= 3 && recentObs.length < observations.length;

  const dataset = isWindowed ? recentObs : observations;
  const weeksObserved = new Set(dataset.map((o) => o.week)).size;
  const minOccurrences = getMinOccurrences(weeksObserved);

  // Group by "dayNumber|period" -> Map<courseCode, { count, lastSeen, subjectName }>
  const slotMap = new Map<string, Map<string, { count: number; lastSeen: number; subjectName?: string }>>();

  for (const obs of dataset) {
    const slotKey = `${obs.dayNumber}|${obs.period}`;
    let codeMap = slotMap.get(slotKey);
    if (!codeMap) {
      codeMap = new Map();
      slotMap.set(slotKey, codeMap);
    }

    const current = codeMap.get(obs.courseCode);
    if (current) {
      current.count += 1;
      current.lastSeen = Math.max(current.lastSeen, obs.time);
      if (!current.subjectName && obs.subjectName) current.subjectName = obs.subjectName;
    } else {
      codeMap.set(obs.courseCode, {
        count: 1,
        lastSeen: obs.time,
        subjectName: obs.subjectName,
      });
    }
  }

  const slots: DerivedSlot[] = [];
  let accountedCount = 0;

  for (const [slotKey, codeMap] of slotMap) {
    const [dayNum, period] = slotKey.split('|').map(Number);
    let dominant: { courseCode: string; data: { count: number; lastSeen: number; subjectName?: string } } | null = null;

    for (const [courseCode, data] of codeMap) {
      if (
        !dominant ||
        data.count > dominant.data.count ||
        (data.count === dominant.data.count && data.lastSeen > dominant.data.lastSeen)
      ) {
        dominant = { courseCode, data };
      }
    }

    if (!dominant || dominant.data.count < minOccurrences) continue;

    accountedCount += dominant.data.count;
    const times = periodPlaceholderTimes(period);

    slots.push({
      day: DAYS[dayNum] || 'Unknown',
      dayNumber: dayNum,
      subjectCode: dominant.courseCode,
      subjectName: dominant.data.subjectName,
      period,
      ...times,
      inferred: true,
      timeInferred: true,
      occurrences: dominant.data.count,
    });
  }

  // Sort slots by day number then period
  slots.sort((a, b) => a.dayNumber - b.dayNumber || a.period - b.period);

  // Build subjects list
  const subjects: DerivedSubject[] = [];
  const seenCodes = new Set<string>();

  for (const sub of register.subjects) {
    const code = (sub.courseCode || '').trim();
    if (code && !seenCodes.has(code)) {
      seenCodes.add(code);
      subjects.push({
        subjectId: code,
        subjectCode: code,
        subjectName: (sub.subjectName || '').trim() || code,
      });
    }
  }

  const coverageRatio = dataset.length > 0 ? accountedCount / dataset.length : 0;
  const weekFactor = Math.min(1, weeksObserved / 4);
  const confidence = Math.round(coverageRatio * weekFactor * 100) / 100;

  return {
    entries: slots,
    subjects,
    weeksObserved,
    observations: dataset.length,
    slots: slots.length,
    dateFormat: format,
    windowed: isWindowed,
    minOccurrences,
    confidence,
    timesInferred: true,
  };
}
