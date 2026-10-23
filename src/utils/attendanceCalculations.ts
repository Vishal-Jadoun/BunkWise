import { TimetableSlot, SubjectAttendance } from '../types';

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export interface AttendanceValidation {
  isValid: boolean;
  error?: string;
}

export type BunkScenario = 'skip' | 'attend' | 'medical' | 'duty';

export interface ScheduledSessionItem {
  id: string; // e.g. "2026-10-23-p1-24CSE0301"
  date: string; // "YYYY-MM-DD"
  day: string; // "Monday", etc.
  period: number;
  startTime?: string;
  endTime?: string;
  subjectCode: string;
}

export interface BunkSimulationResult {
  scheduledSessionsCount: number;
  scheduledDates: ScheduledSessionItem[];
  currentAttended: number;
  currentDelivered: number;
  currentPercentage: number;
  projectedAttended: number;
  projectedDelivered: number;
  projectedPercentage: number;
  percentageDelta: number;
  currentStatus: 'Safe' | 'At Risk' | 'Below Target';
  projectedStatus: 'Safe' | 'At Risk' | 'Below Target';
  projectedSafeBunks: number;
  projectedRecoveryNeeded: number;
  isTimetableAvailable: boolean;
  zeroSessionsReason?: string | null;
  validationError?: string | null;
}

/**
 * Validates attendance counts and target percentage.
 */
export function validateAttendanceInputs(
  attended: number,
  delivered: number,
  targetPercentage = 75
): AttendanceValidation {
  if (typeof attended !== 'number' || typeof delivered !== 'number' || isNaN(attended) || isNaN(delivered)) {
    return { isValid: false, error: 'Attended and delivered counts must be valid numbers.' };
  }
  if (attended < 0 || delivered < 0) {
    return { isValid: false, error: 'Attendance counts cannot be negative.' };
  }
  if (attended > delivered) {
    return { isValid: false, error: 'Attended classes cannot exceed delivered classes.' };
  }
  if (typeof targetPercentage !== 'number' || isNaN(targetPercentage) || targetPercentage <= 0 || targetPercentage > 100) {
    return { isValid: false, error: 'Target percentage must be between 1% and 100%.' };
  }
  return { isValid: true };
}

/**
 * Calculates attendance percentage rounded to requested decimal places (default 2).
 * Handles zero delivered without returning NaN or Infinity.
 */
export function calculateAttendancePercentage(attended: number, delivered: number, decimals = 2): number {
  if (delivered <= 0 || attended <= 0) return 0;
  if (attended >= delivered) return 100;
  const factor = Math.pow(10, decimals);
  return Math.round((attended / delivered) * 100 * factor) / factor;
}

/**
 * Calculates raw subject attendance percentage: (attended / delivered) * 100.
 * Handles zero delivered, non-numeric values, and negative counts safely returning 0 without NaN/Infinity.
 * If decimals is a number, rounds to that number of decimal places; otherwise returns full precision.
 */
export function calculateRawAttendance(attended: number, delivered: number, decimals?: number): number {
  if (typeof attended !== 'number' || typeof delivered !== 'number' || isNaN(attended) || isNaN(delivered)) {
    return 0;
  }
  if (delivered <= 0 || attended <= 0) return 0;
  const raw = (attended / delivered) * 100;
  if (typeof decimals === 'number') {
    const factor = Math.pow(10, decimals);
    return Math.round(raw * factor) / factor;
  }
  return raw;
}

export interface OverallAttendanceSummary {
  totalDelivered: number;
  totalAttended: number;
  totalAbsent: number;
  totalDutyLeave: number;
  totalMedicalLeave: number;
  totalApprovedDutyLeave: number;
  totalApprovedMedicalLeave: number;
  rawPercentage: number;
  roundedPercentage: number;
}

/**
 * Calculates weighted overall attendance from subject records:
 * (sum(attended) / sum(delivered)) * 100
 *
 * CRITICAL REQUIREMENTS:
 * - Always uses weighted sum of attended over sum of delivered.
 * - NEVER uses an unweighted average of subject percentages.
 * - Handles empty list or zero total delivered safely (returns 0%).
 * - Preserves leaves (DL, ML, approved DL/ML) as separate fields; NEVER assumes
 *   leaves should be added to attended classes.
 */
export function calculateOverallAttendance(
  subjects: Array<Partial<SubjectAttendance>> | null | undefined
): OverallAttendanceSummary {
  let totalDelivered = 0;
  let totalAttended = 0;
  let totalAbsent = 0;
  let totalDutyLeave = 0;
  let totalMedicalLeave = 0;
  let totalApprovedDutyLeave = 0;
  let totalApprovedMedicalLeave = 0;

  if (Array.isArray(subjects)) {
    for (const s of subjects) {
      if (!s) continue;
      const d = typeof s.delivered === 'number' && !isNaN(s.delivered) && s.delivered > 0 ? s.delivered : 0;
      const a = typeof s.attended === 'number' && !isNaN(s.attended) && s.attended > 0 ? s.attended : 0;
      const ab = typeof s.absent === 'number' && !isNaN(s.absent) && s.absent >= 0 ? s.absent : Math.max(0, d - a);

      totalDelivered += d;
      totalAttended += a;
      totalAbsent += ab;

      if (typeof s.duty_leave === 'number' && !isNaN(s.duty_leave)) {
        totalDutyLeave += s.duty_leave;
      }
      if (typeof s.medical_leave === 'number' && !isNaN(s.medical_leave)) {
        totalMedicalLeave += s.medical_leave;
      }
      if (typeof s.approved_duty_leave === 'number' && !isNaN(s.approved_duty_leave)) {
        totalApprovedDutyLeave += s.approved_duty_leave;
      }
      if (typeof s.approved_medical_leave === 'number' && !isNaN(s.approved_medical_leave)) {
        totalApprovedMedicalLeave += s.approved_medical_leave;
      }
    }
  }

  const rawPercentage = totalDelivered > 0 ? (totalAttended / totalDelivered) * 100 : 0;
  const roundedPercentage = Math.round(rawPercentage);

  return {
    totalDelivered,
    totalAttended,
    totalAbsent,
    totalDutyLeave,
    totalMedicalLeave,
    totalApprovedDutyLeave,
    totalApprovedMedicalLeave,
    rawPercentage,
    roundedPercentage,
  };
}

/**
 * Returns attendance status badge based on target threshold.
 * - Safe: >= targetPercentage
 * - At Risk: between (targetPercentage - 5%) and targetPercentage
 * - Below Target: < (targetPercentage - 5%)
 */
export function getAttendanceStatus(
  percentage: number,
  targetPercentage = 75
): 'Safe' | 'At Risk' | 'Below Target' {
  if (percentage >= targetPercentage) return 'Safe';
  if (percentage >= targetPercentage - 5) return 'At Risk';
  return 'Below Target';
}

/**
 * If current attendance is at or above the target (p in fraction, e.g. 0.75):
 * floor(A / p - T)
 * Calculates from exact counts, not rounded display percentages.
 */
export function calculateSafeBunks(attended: number, delivered: number, targetPercentage = 75): number {
  const val = validateAttendanceInputs(attended, delivered, targetPercentage);
  if (!val.isValid || delivered <= 0) return 0;

  const exactRatio = attended / delivered;
  if (exactRatio < targetPercentage / 100) return 0;

  // Exact formula: floor( (100 * attended) / targetPercentage - delivered )
  const rawBunks = (100 * attended) / targetPercentage - delivered;
  const bunks = Math.floor(rawBunks + 1e-9);
  return Math.max(0, bunks);
}

/**
 * If current attendance is below the target (p in fraction, e.g. 0.75):
 * ceil((p * T - A) / (1 - p))
 * Calculates from exact counts, not rounded display percentages.
 */
export function calculateRecoveryClasses(attended: number, delivered: number, targetPercentage = 75): number {
  const val = validateAttendanceInputs(attended, delivered, targetPercentage);
  if (!val.isValid || delivered <= 0) return 0;

  if (targetPercentage >= 100) return 999;

  const exactRatio = attended / delivered;
  if (exactRatio >= targetPercentage / 100) return 0;

  // Exact integer-scaled formula: ceil((p * T - 100 * A) / (100 - p))
  const numerator = targetPercentage * delivered - 100 * attended;
  const denominator = 100 - targetPercentage;
  const rawNeeded = numerator / denominator;
  const needed = Math.ceil(rawNeeded - 1e-9);
  return Math.max(0, needed);
}

/**
 * Finds all scheduled class sessions for a subject within a date range [startDate, endDate].
 * Respects day of week from real timetable.
 */
export function findScheduledSessions(
  timetable: TimetableSlot[],
  subjectCode: string,
  startDateStr: string,
  endDateStr: string
): ScheduledSessionItem[] {
  if (!timetable || timetable.length === 0 || !startDateStr || !endDateStr) {
    return [];
  }

  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T23:59:59');
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return [];
  }

  const sessions: ScheduledSessionItem[] = [];
  const curr = new Date(start);

  while (curr <= end) {
    const dayIndex = curr.getDay();
    const dayName = DAY_NAMES[dayIndex];

    // Find slots for this day matching subject code
    const daySlots = timetable.filter((s) => {
      const matchDay = (s.day && s.day.toLowerCase() === dayName.toLowerCase()) || s.dayNumber === dayIndex;
      const matchSubject = subjectCode === 'ALL' || !subjectCode || s.subjectCode === subjectCode;
      return matchDay && matchSubject;
    });

    const dateFormatted = curr.toISOString().split('T')[0];
    for (const slot of daySlots) {
      sessions.push({
        id: `${dateFormatted}-p${slot.period}-${slot.subjectCode}`,
        date: dateFormatted,
        day: dayName,
        period: slot.period,
        startTime: slot.startTime,
        endTime: slot.endTime,
        subjectCode: slot.subjectCode,
      });
    }

    curr.setDate(curr.getDate() + 1);
  }

  return sessions;
}

/**
 * Simulates the impact of a planning scenario over a given date range.
 * Supports per-session decisions or bulk scenario.
 */
export function simulateBunk(
  currentSubject: SubjectAttendance,
  timetable: TimetableSlot[],
  startDateStr: string,
  endDateStr: string,
  scenario: BunkScenario = 'skip',
  targetPercentage = 75,
  perSessionChoices?: Record<string, BunkScenario>,
  dutyLeaveApproved = true
): BunkSimulationResult {
  const currentA = currentSubject?.attended ?? 0;
  const currentT = currentSubject?.delivered ?? 0;

  // Validate inputs
  const validation = validateAttendanceInputs(currentA, currentT, targetPercentage);
  if (!validation.isValid) {
    return {
      scheduledSessionsCount: 0,
      scheduledDates: [],
      currentAttended: currentA,
      currentDelivered: currentT,
      currentPercentage: calculateAttendancePercentage(currentA, currentT, 2),
      projectedAttended: currentA,
      projectedDelivered: currentT,
      projectedPercentage: calculateAttendancePercentage(currentA, currentT, 2),
      percentageDelta: 0,
      currentStatus: 'Below Target',
      projectedStatus: 'Below Target',
      projectedSafeBunks: 0,
      projectedRecoveryNeeded: 0,
      isTimetableAvailable: false,
      validationError: validation.error,
      zeroSessionsReason: validation.error,
    };
  }

  // Check reversed dates
  if (startDateStr && endDateStr && startDateStr > endDateStr) {
    return {
      scheduledSessionsCount: 0,
      scheduledDates: [],
      currentAttended: currentA,
      currentDelivered: currentT,
      currentPercentage: calculateAttendancePercentage(currentA, currentT, 2),
      projectedAttended: currentA,
      projectedDelivered: currentT,
      projectedPercentage: calculateAttendancePercentage(currentA, currentT, 2),
      percentageDelta: 0,
      currentStatus: getAttendanceStatus(calculateAttendancePercentage(currentA, currentT, 2), targetPercentage),
      projectedStatus: getAttendanceStatus(calculateAttendancePercentage(currentA, currentT, 2), targetPercentage),
      projectedSafeBunks: calculateSafeBunks(currentA, currentT, targetPercentage),
      projectedRecoveryNeeded: calculateRecoveryClasses(currentA, currentT, targetPercentage),
      isTimetableAvailable: timetable && timetable.length > 0,
      zeroSessionsReason: 'Start date cannot be after end date.',
    };
  }

  const currentPct = calculateAttendancePercentage(currentA, currentT, 2);
  const currentStatus = getAttendanceStatus(currentPct, targetPercentage);

  const scheduled = findScheduledSessions(timetable, currentSubject.course_code, startDateStr, endDateStr);
  const sessionCount = scheduled.length;
  const isTimetableAvailable = timetable && timetable.length > 0;

  let zeroSessionsReason: string | null = null;
  if (sessionCount === 0) {
    if (!isTimetableAvailable) {
      zeroSessionsReason = 'Timetable schedule is unavailable for this subject.';
    } else {
      zeroSessionsReason = 'No classes are scheduled on the selected date(s) for this subject.';
    }
  }

  // Calculate delta attended and delta delivered
  let deltaA = 0;
  let deltaT = sessionCount;

  if (perSessionChoices && Object.keys(perSessionChoices).length > 0) {
    // Individual per-session evaluation
    for (const s of scheduled) {
      const choice = perSessionChoices[s.id] || scenario;
      if (choice === 'attend') {
        deltaA += 1;
      } else if (choice === 'duty' && dutyLeaveApproved) {
        deltaA += 1;
      }
      // skip or medical leaves do not increment attended
    }
  } else {
    // Bulk scenario evaluation
    if (scenario === 'attend') {
      deltaA = sessionCount;
      deltaT = sessionCount;
    } else if (scenario === 'skip') {
      deltaA = 0;
      deltaT = sessionCount;
    } else if (scenario === 'duty') {
      deltaA = dutyLeaveApproved ? sessionCount : 0;
      deltaT = sessionCount;
    } else {
      // medical leave
      deltaA = 0;
      deltaT = sessionCount;
    }
  }

  const projectedA = currentA + deltaA;
  const projectedT = currentT + deltaT;
  const projectedPct = calculateAttendancePercentage(projectedA, projectedT, 2);
  const deltaPct = Math.round((projectedPct - currentPct) * 100) / 100;
  const projectedStatus = getAttendanceStatus(projectedPct, targetPercentage);

  const projectedSafeBunks = calculateSafeBunks(projectedA, projectedT, targetPercentage);
  const projectedRecoveryNeeded = calculateRecoveryClasses(projectedA, projectedT, targetPercentage);

  return {
    scheduledSessionsCount: sessionCount,
    scheduledDates: scheduled,
    currentAttended: currentA,
    currentDelivered: currentT,
    currentPercentage: currentPct,
    projectedAttended: projectedA,
    projectedDelivered: projectedT,
    projectedPercentage: projectedPct,
    percentageDelta: deltaPct,
    currentStatus,
    projectedStatus,
    projectedSafeBunks,
    projectedRecoveryNeeded,
    isTimetableAvailable,
    zeroSessionsReason,
  };
}
