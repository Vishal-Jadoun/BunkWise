import { describe, it, expect } from 'vitest';
import {
  calculateAttendancePercentage,
  calculateRawAttendance,
  calculateOverallAttendance,
  calculateSafeBunks,
  calculateRecoveryClasses,
  getAttendanceStatus,
  validateAttendanceInputs,
  findScheduledSessions,
  simulateBunk,
} from './attendanceCalculations';
import { TimetableSlot, SubjectAttendance } from '../types';

describe('Attendance Calculation Engine - Unit Tests', () => {
  // Test Case 1: 68 attended out of 84 delivered, 75% target
  it('Case 1: 68/84 delivered at 75% target', () => {
    const attended = 68;
    const delivered = 84;
    const target = 75;

    // Current attendance = 80.95%
    const currentPct = calculateAttendancePercentage(attended, delivered, 2);
    expect(currentPct).toBe(80.95);

    // Maximum safe additional absences = 6
    const safeBunks = calculateSafeBunks(attended, delivered, target);
    expect(safeBunks).toBe(6);

    // 6 absences leave attendance at 68/90 = 75.56% (>= 75%)
    const pctAfter6 = calculateAttendancePercentage(attended, delivered + 6, 2);
    expect(pctAfter6).toBe(75.56);
    expect(pctAfter6).toBeGreaterThanOrEqual(target);

    // 7 absences leave attendance at 68/91 = 74.73% (< 75%)
    const pctAfter7 = calculateAttendancePercentage(attended, delivered + 7, 2);
    expect(pctAfter7).toBe(74.73);
    expect(pctAfter7).toBeLessThan(target);
  });

  // Test Case 2: 48/58, 75% target
  it('Case 2: 48/58 delivered at 75% target', () => {
    const attended = 48;
    const delivered = 58;
    const target = 75;

    // Current attendance = 82.76%
    const currentPct = calculateAttendancePercentage(attended, delivered, 2);
    expect(currentPct).toBe(82.76);

    // Maximum safe additional absences = 6
    const safeBunks = calculateSafeBunks(attended, delivered, target);
    expect(safeBunks).toBe(6);

    // 6 absences result in 48/64 = 75.00%
    const pctAfter6 = calculateAttendancePercentage(attended, delivered + 6, 2);
    expect(pctAfter6).toBe(75.0);
    expect(pctAfter6).toBeGreaterThanOrEqual(target);

    // 7 absences result in 48/65 = 73.85%
    const pctAfter7 = calculateAttendancePercentage(attended, delivered + 7, 2);
    expect(pctAfter7).toBe(73.85);
    expect(pctAfter7).toBeLessThan(target);
  });

  // Test Case 3: 60/80, 75% target (exact threshold)
  it('Case 3: 60/80 delivered at 75% target (exact boundary)', () => {
    const attended = 60;
    const delivered = 80;
    const target = 75;

    // Current attendance = 75%
    const currentPct = calculateAttendancePercentage(attended, delivered, 2);
    expect(currentPct).toBe(75.0);

    // Maximum safe additional absences = 0
    const safeBunks = calculateSafeBunks(attended, delivered, target);
    expect(safeBunks).toBe(0);

    // 1 absence results in 60/81 = 74.07%
    const pctAfter1 = calculateAttendancePercentage(attended, delivered + 1, 2);
    expect(pctAfter1).toBe(74.07);
    expect(pctAfter1).toBeLessThan(target);
  });

  // Test Case 4: 55/80, 75% target (recovery calculation)
  it('Case 4: 55/80 delivered at 75% target requires 20 recovery classes', () => {
    const attended = 55;
    const delivered = 80;
    const target = 75;

    // Current attendance = 68.75%
    const currentPct = calculateAttendancePercentage(attended, delivered, 2);
    expect(currentPct).toBe(68.75);

    // Required consecutive attended classes = 20
    const recoveryNeeded = calculateRecoveryClasses(attended, delivered, target);
    expect(recoveryNeeded).toBe(20);

    // After attending 20 classes: 75/100 = 75%
    const pctAfter20 = calculateAttendancePercentage(attended + 20, delivered + 20, 2);
    expect(pctAfter20).toBe(75.0);
    expect(pctAfter20).toBeGreaterThanOrEqual(target);

    // After attending only 19 classes: 74/99 = 74.75% (< 75%)
    const pctAfter19 = calculateAttendancePercentage(attended + 19, delivered + 19, 2);
    expect(pctAfter19).toBe(74.75);
    expect(pctAfter19).toBeLessThan(target);
  });

  // Test Case 5: Zero delivered classes
  it('Case 5: Zero delivered classes does not return NaN or Infinity', () => {
    expect(calculateAttendancePercentage(0, 0)).toBe(0);
    expect(calculateSafeBunks(0, 0, 75)).toBe(0);
    expect(calculateRecoveryClasses(0, 0, 75)).toBe(0);
    expect(Number.isFinite(calculateAttendancePercentage(0, 0))).toBe(true);
    expect(Number.isNaN(calculateAttendancePercentage(0, 0))).toBe(false);
  });

  // Test Case 6: Invalid inputs
  it('Case 6: Rejects negative counts, attended > delivered, and invalid target', () => {
    // Negative counts
    const negAttended = validateAttendanceInputs(-5, 20, 75);
    expect(negAttended.isValid).toBe(false);
    expect(negAttended.error).toContain('negative');

    // Attended > Delivered
    const exceeded = validateAttendanceInputs(25, 20, 75);
    expect(exceeded.isValid).toBe(false);
    expect(exceeded.error).toContain('cannot exceed');

    // Invalid target
    const invalidTarget = validateAttendanceInputs(10, 20, 150);
    expect(invalidTarget.isValid).toBe(false);
    expect(invalidTarget.error).toContain('Target percentage');
  });

  // Status badges
  it('Returns correct status badges', () => {
    expect(getAttendanceStatus(80, 75)).toBe('Safe');
    expect(getAttendanceStatus(75, 75)).toBe('Safe');
    expect(getAttendanceStatus(72, 75)).toBe('At Risk'); // 70 to 74.9
    expect(getAttendanceStatus(65, 75)).toBe('Below Target');
  });

  // Configurable targets (65%, 80%, 85%)
  it('Handles configurable targets (65%, 80%, 85%) accurately', () => {
    // 38 attended out of 42 delivered:
    // With 80% target: floor(38 / 0.8 - 42) = floor(47.5 - 42) = 5
    expect(calculateSafeBunks(38, 42, 80)).toBe(5);
    // With 85% target: floor(38 / 0.85 - 42) = floor(44.7 - 42) = 2
    expect(calculateSafeBunks(38, 42, 85)).toBe(2);
    // With 65% target: floor(38 / 0.65 - 42) = floor(58.46 - 42) = 16
    expect(calculateSafeBunks(38, 42, 65)).toBe(16);
  });
});

describe('Planner Simulator & Timetable Sessions - Integration Tests', () => {
  const sampleTimetable: TimetableSlot[] = [
    {
      day: 'Monday',
      dayNumber: 1,
      subjectCode: '24CSE0301',
      startTime: '09:00',
      endTime: '10:00',
      teacherName: 'Dr. Sharma',
      period: 1,
      roomNumber: 'LH-301',
    },
    {
      day: 'Wednesday',
      dayNumber: 3,
      subjectCode: '24CSE0301',
      startTime: '10:00',
      endTime: '11:00',
      teacherName: 'Dr. Sharma',
      period: 2,
      roomNumber: 'LH-301',
    },
    {
      day: 'Friday',
      dayNumber: 5,
      subjectCode: '24CSE0301',
      startTime: '11:15',
      endTime: '12:15',
      teacherName: 'Dr. Sharma',
      period: 3,
      roomNumber: 'LH-301',
    },
  ];

  const sampleSubject: SubjectAttendance = {
    subject_name: 'Data Structures & Algorithms',
    course_code: '24CSE0301',
    teacher: 'Dr. Sharma',
    delivered: 42,
    attended: 38,
    absent: 4,
    percentage: 90.48,
    duty_leave: 0,
    medical_leave: 0,
  };

  it('Finds scheduled sessions in a Monday-to-Friday week (3 sessions)', () => {
    // 2026-10-26 (Monday) to 2026-10-30 (Friday)
    const sessions = findScheduledSessions(sampleTimetable, '24CSE0301', '2026-10-26', '2026-10-30');
    expect(sessions.length).toBe(3);
    expect(sessions[0].day).toBe('Monday');
    expect(sessions[1].day).toBe('Wednesday');
    expect(sessions[2].day).toBe('Friday');
  });

  it('Simulates Skip scenario accurately', () => {
    // Current: 38 / 42. If 3 classes skipped -> 38 / 45 = 84.44%
    const res = simulateBunk(sampleSubject, sampleTimetable, '2026-10-26', '2026-10-30', 'skip', 75);
    expect(res.scheduledSessionsCount).toBe(3);
    expect(res.projectedAttended).toBe(38);
    expect(res.projectedDelivered).toBe(45);
    expect(res.projectedPercentage).toBe(84.44);
    expect(res.projectedStatus).toBe('Safe');
    // Safe bunks remaining: floor(38 / 0.75 - 45) = floor(50.66 - 45) = 5
    expect(res.projectedSafeBunks).toBe(5);
  });

  it('Simulates Attend scenario accurately', () => {
    // Current: 38 / 42. If 3 classes attended -> 41 / 45 = 91.11%
    const res = simulateBunk(sampleSubject, sampleTimetable, '2026-10-26', '2026-10-30', 'attend', 75);
    expect(res.scheduledSessionsCount).toBe(3);
    expect(res.projectedAttended).toBe(41);
    expect(res.projectedDelivered).toBe(45);
    expect(res.projectedPercentage).toBe(91.11);
    expect(res.projectedStatus).toBe('Safe');
  });

  it('Returns informative zeroSessionsReason on a weekend or days without classes', () => {
    // 2026-10-24 (Saturday) to 2026-10-25 (Sunday)
    const res = simulateBunk(sampleSubject, sampleTimetable, '2026-10-24', '2026-10-25', 'skip', 75);
    expect(res.scheduledSessionsCount).toBe(0);
    expect(res.zeroSessionsReason).toContain('No classes are scheduled');
  });

  it('Explains reversed date ranges without fabricating data', () => {
    const res = simulateBunk(sampleSubject, sampleTimetable, '2026-10-30', '2026-10-20', 'skip', 75);
    expect(res.scheduledSessionsCount).toBe(0);
    expect(res.zeroSessionsReason).toContain('Start date cannot be after end date');
  });

  it('Handles missing timetable safely without fabricating classes', () => {
    const res = simulateBunk(sampleSubject, [], '2026-10-26', '2026-10-30', 'skip', 75);
    expect(res.isTimetableAvailable).toBe(false);
    expect(res.scheduledSessionsCount).toBe(0);
    expect(res.zeroSessionsReason).toContain('unavailable');
  });
});

describe('Attendance Calculation Engine - Weighted Overall & Raw Subject Tests', () => {
  // Verified five subject records from official Attendly portal
  const verifiedSubjects: SubjectAttendance[] = [
    {
      subject_name: 'Database Management System',
      course_code: '24CSE0209',
      teacher: 'Dr. Faculty',
      attended: 40,
      delivered: 58,
      absent: 18,
      duty_leave: 4,
      medical_leave: 0,
      approved_duty_leave: 4,
      approved_medical_leave: 0,
      official_percentage: 76,
      raw_percentage: 68.97,
      percentage: 76,
    },
    {
      subject_name: 'Statistics and Data Engineering',
      course_code: '24CSE0208',
      teacher: 'Dr. Faculty',
      attended: 50,
      delivered: 64,
      absent: 14,
      duty_leave: 6,
      medical_leave: 0,
      approved_duty_leave: 6,
      approved_medical_leave: 0,
      official_percentage: 88,
      raw_percentage: 78.13,
      percentage: 88,
    },
    {
      subject_name: 'Programming in Java',
      course_code: '24CSE0205',
      teacher: 'Dr. Faculty',
      attended: 24,
      delivered: 26,
      absent: 2,
      duty_leave: 0,
      medical_leave: 0,
      official_percentage: 92,
      raw_percentage: 92.31,
      percentage: 92,
    },
    {
      subject_name: 'Front End Engineering-II',
      course_code: '24CSE0210',
      teacher: 'Dr. Faculty',
      attended: 56,
      delivered: 76,
      absent: 20,
      duty_leave: 2,
      medical_leave: 0,
      official_percentage: 76,
      raw_percentage: 73.68,
      percentage: 76,
    },
    {
      subject_name: 'Object Oriented Programming',
      course_code: '24CSE0204',
      teacher: 'Dr. Faculty',
      attended: 68,
      delivered: 102,
      absent: 34,
      duty_leave: 10,
      medical_leave: 0,
      official_percentage: 76,
      raw_percentage: 66.67,
      percentage: 76,
    },
  ];

  // 1. Weighted overall attendance
  it('calculates weighted overall attendance: 238/326 = ~73.0061%, displayed as 73%', () => {
    const summary = calculateOverallAttendance(verifiedSubjects);

    // Sum of attended: 40 + 50 + 24 + 56 + 68 = 238
    expect(summary.totalAttended).toBe(238);
    // Sum of delivered: 58 + 64 + 26 + 76 + 102 = 326
    expect(summary.totalDelivered).toBe(326);
    // Sum of absent: 18 + 14 + 2 + 20 + 34 = 88
    expect(summary.totalAbsent).toBe(88);

    // Raw overall percentage: 238 / 326 * 100 = 73.00613496932515%
    expect(summary.rawPercentage).toBeCloseTo(73.0061, 4);
    expect(calculateRawAttendance(summary.totalAttended, summary.totalDelivered, 4)).toBe(73.0061);

    // Displayed dashboard percentage (rounded whole number): 73%
    expect(summary.roundedPercentage).toBe(73);

    // CRITICAL: Must NEVER equal unweighted average of subject raw percentages (~75.95%)
    const unweightedRawAverage =
      verifiedSubjects.reduce((sum, s) => sum + (s.attended / s.delivered) * 100, 0) /
      verifiedSubjects.length;
    expect(unweightedRawAverage).toBeCloseTo(75.9498, 3);
    expect(summary.rawPercentage).not.toBeCloseTo(unweightedRawAverage, 1);

    // CRITICAL: Must NEVER equal unweighted average of official percentages (81.6%)
    const unweightedOfficialAverage =
      verifiedSubjects.reduce((sum, s) => sum + (s.official_percentage || 0), 0) /
      verifiedSubjects.length;
    expect(unweightedOfficialAverage).toBe(81.6);
    expect(summary.rawPercentage).not.toBeCloseTo(unweightedOfficialAverage, 1);
  });

  // 2. Subject-level raw attendance
  it('calculates subject-level raw attendance independently for each subject', () => {
    // DBMS: 40 / 58
    expect(calculateRawAttendance(40, 58, 4)).toBe(68.9655);
    expect(calculateRawAttendance(40, 58, 2)).toBe(68.97);

    // SDE: 50 / 64
    expect(calculateRawAttendance(50, 64, 4)).toBe(78.125);
    expect(calculateRawAttendance(50, 64, 2)).toBe(78.13);

    // Java: 24 / 26
    expect(calculateRawAttendance(24, 26, 4)).toBe(92.3077);
    expect(calculateRawAttendance(24, 26, 2)).toBe(92.31);

    // Front End: 56 / 76
    expect(calculateRawAttendance(56, 76, 4)).toBe(73.6842);
    expect(calculateRawAttendance(56, 76, 2)).toBe(73.68);

    // OOP: 68 / 102
    expect(calculateRawAttendance(68, 102, 4)).toBe(66.6667);
    expect(calculateRawAttendance(68, 102, 2)).toBe(66.67);
  });

  // 3. Rounding to a whole-number dashboard percentage
  it('rounds overall raw percentage to a whole-number dashboard percentage accurately', () => {
    // 73.0061% rounds to 73%
    expect(Math.round(73.0061)).toBe(73);

    // Boundary cases
    expect(calculateOverallAttendance([{ attended: 7449, delivered: 10000 }]).roundedPercentage).toBe(74); // 74.49% -> 74
    expect(calculateOverallAttendance([{ attended: 7450, delivered: 10000 }]).roundedPercentage).toBe(75); // 74.50% -> 75
    expect(calculateOverallAttendance([{ attended: 7499, delivered: 10000 }]).roundedPercentage).toBe(75); // 74.99% -> 75
    expect(calculateOverallAttendance([{ attended: 730061, delivered: 1000000 }]).roundedPercentage).toBe(73);
    expect(Number.isInteger(calculateOverallAttendance(verifiedSubjects).roundedPercentage)).toBe(true);
  });

  // 4. Different official and calculated percentages
  it('preserves official percentage supplied by backend as a separate field without overwriting calculated raw percentage', () => {
    const dbms = verifiedSubjects[0];
    expect(dbms.official_percentage).toBe(76);
    expect(dbms.raw_percentage).toBe(68.97);
    expect(dbms.official_percentage).not.toBe(dbms.raw_percentage);

    const sde = verifiedSubjects[1];
    expect(sde.official_percentage).toBe(88);
    expect(sde.raw_percentage).toBe(78.13);
    expect(sde.official_percentage).not.toBe(sde.raw_percentage);

    // Neither value overwrites the other
    expect(dbms.official_percentage).toBeDefined();
    expect(dbms.raw_percentage).toBeDefined();
  });

  // 5. Missing or zero denominators
  it('handles zero or missing delivered classes safely without returning NaN or Infinity', () => {
    // Zero delivered for a subject
    expect(calculateRawAttendance(0, 0)).toBe(0);
    expect(calculateRawAttendance(10, 0)).toBe(0);
    expect(calculateRawAttendance(0, 10)).toBe(0);
    expect(Number.isFinite(calculateRawAttendance(0, 0))).toBe(true);
    expect(Number.isNaN(calculateRawAttendance(0, 0))).toBe(false);

    // Subject with 0 delivered in overall calculation
    const zeroSub = [{ attended: 0, delivered: 0 }];
    const zeroRes = calculateOverallAttendance(zeroSub);
    expect(zeroRes.totalDelivered).toBe(0);
    expect(zeroRes.totalAttended).toBe(0);
    expect(zeroRes.rawPercentage).toBe(0);
    expect(zeroRes.roundedPercentage).toBe(0);
    expect(Number.isFinite(zeroRes.rawPercentage)).toBe(true);
    expect(Number.isNaN(zeroRes.rawPercentage)).toBe(false);

    // Empty array or null/undefined
    expect(calculateOverallAttendance([]).rawPercentage).toBe(0);
    expect(calculateOverallAttendance([]).roundedPercentage).toBe(0);
    expect(calculateOverallAttendance(null).rawPercentage).toBe(0);
    expect(calculateOverallAttendance(undefined).rawPercentage).toBe(0);
  });

  // 6. Missing leave fields
  it('handles missing leave fields safely and never assumes DL or ML are added to attended classes', () => {
    const subjectsWithoutLeaves: SubjectAttendance[] = [
      {
        subject_name: 'Discrete Mathematics',
        course_code: '24MAT0201',
        teacher: 'Prof. Rao',
        attended: 30,
        delivered: 40,
        absent: 10,
        percentage: 75,
        duty_leave: 0,
        medical_leave: 0,
        // approved_duty_leave and approved_medical_leave are undefined
      },
      {
        subject_name: 'Computer Networks',
        course_code: '24CSE0304',
        teacher: 'Dr. Verma',
        attended: 25,
        delivered: 35,
        absent: 10,
        percentage: 71.43,
        duty_leave: 5,
        medical_leave: 2,
        // approved leaves omitted
      },
    ];

    const summary = calculateOverallAttendance(subjectsWithoutLeaves);
    // Total attended = 30 + 25 = 55 (DL/ML of 5 and 2 are NOT added)
    expect(summary.totalAttended).toBe(55);
    expect(summary.totalDelivered).toBe(75);
    expect(summary.totalDutyLeave).toBe(5);
    expect(summary.totalMedicalLeave).toBe(2);
    expect(summary.totalApprovedDutyLeave).toBe(0);
    expect(summary.totalApprovedMedicalLeave).toBe(0);

    // Attendance is strictly 55 / 75 = 73.33%, NOT (55 + 5 + 2) / 75 = 82.67%
    expect(summary.rawPercentage).toBeCloseTo(73.3333, 3);
    expect(summary.roundedPercentage).toBe(73);
  });
});
