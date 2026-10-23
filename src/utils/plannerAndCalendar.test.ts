  import { describe, it, expect } from 'vitest';
import {
  findScheduledSessions,
  simulateBunk,
  calculateSafeBunks,
  calculateRecoveryClasses,
  calculateAttendancePercentage,
  DAY_NAMES,
} from './attendanceCalculations';
import {
  TimetableSlot,
  SubjectAttendance,
  AttendanceRegister,
} from '../types';

describe('Planner Simulator - Integration & Scenario Tests', () => {
  const sampleTimetable: TimetableSlot[] = [
    {
      day: 'Monday',
      dayNumber: 1,
      subjectCode: '24CSE0301',
      startTime: '09:00',
      endTime: '10:00',
      teacherName: 'Dr. Priya Sharma',
      period: 1,
      roomNumber: 'LH-301',
    },
    {
      day: 'Tuesday',
      dayNumber: 2,
      subjectCode: '24CSE0302',
      startTime: '10:00',
      endTime: '11:00',
      teacherName: 'Prof. Amit Kumar',
      period: 2,
      roomNumber: 'LH-302',
    },
    {
      day: 'Wednesday',
      dayNumber: 3,
      subjectCode: '24CSE0301',
      startTime: '11:15',
      endTime: '12:15',
      teacherName: 'Dr. Priya Sharma',
      period: 3,
      roomNumber: 'LH-301',
    },
    {
      day: 'Friday',
      dayNumber: 5,
      subjectCode: '24CSE0301',
      startTime: '14:00',
      endTime: '15:00',
      teacherName: 'Dr. Priya Sharma',
      period: 5,
      roomNumber: 'LH-301',
    },
  ];

  const dsaSubject: SubjectAttendance = {
    subject_name: 'Data Structures & Algorithms',
    course_code: '24CSE0301',
    teacher: 'Dr. Priya Sharma',
    delivered: 42,
    attended: 38,
    absent: 4,
    percentage: 90.48,
    duty_leave: 0,
    medical_leave: 0,
  };

  const sampleRegister: AttendanceRegister = {
    subjects: [
      {
        subjectName: 'Data Structures & Algorithms',
        courseCode: '24CSE0301',
        total: '38/42',
        percentage: '90.5%',
        entries: [
          { lectureNum: 1, date: '01-09', period: '1', status: 'P' },
          { lectureNum: 2, date: '03-09', period: '3', status: 'P' },
          { lectureNum: 3, date: '05-09', period: '5', status: 'A' },
        ],
      },
      {
        subjectName: 'Operating Systems',
        courseCode: '24CSE0302',
        total: '32/40',
        percentage: '80.0%',
        entries: [
          { lectureNum: 1, date: '02-09', period: '2', status: 'P' },
          { lectureNum: 2, date: '09-09', period: '2', status: 'DL' },
          { lectureNum: 3, date: '16-09', period: '2', status: 'ML' },
        ],
      },
    ],
  };

  it('Isolates subject register records strictly by courseCode', () => {
    // Subject 1 query
    const dsaRecord = sampleRegister.subjects.find(
      (s) => s.courseCode.toLowerCase() === '24cse0301'
    );
    expect(dsaRecord).toBeDefined();
    expect(dsaRecord?.entries.length).toBe(3);
    // DSA must not contain OS entries (lecture on 02-09 or period 2)
    const hasOsEntries = dsaRecord?.entries.some((e) => e.date === '02-09');
    expect(hasOsEntries).toBe(false);

    // Subject 2 query
    const osRecord = sampleRegister.subjects.find(
      (s) => s.courseCode.toLowerCase() === '24cse0302'
    );
    expect(osRecord).toBeDefined();
    expect(osRecord?.entries.length).toBe(3);
    const hasDsaEntries = osRecord?.entries.some((e) => e.date === '01-09');
    expect(hasDsaEntries).toBe(false);
  });

  it('Changing date range dynamically updates scheduled session count', () => {
    // 1-week range: Mon Oct 26 to Fri Oct 30, 2026 -> 3 sessions (Mon, Wed, Fri)
    const week1 = findScheduledSessions(sampleTimetable, '24CSE0301', '2026-10-26', '2026-10-30');
    expect(week1.length).toBe(3);

    // 2-week range: Mon Oct 26 to Sun Nov 08, 2026 -> 6 sessions (3 per week)
    const week2 = findScheduledSessions(sampleTimetable, '24CSE0301', '2026-10-26', '2026-11-08');
    expect(week2.length).toBe(6);

    // Single day: Wednesday only -> 1 session
    const singleDay = findScheduledSessions(sampleTimetable, '24CSE0301', '2026-10-28', '2026-10-28');
    expect(singleDay.length).toBe(1);
    expect(singleDay[0].period).toBe(3);
  });

  it('Changing scenario from Skip to Attend alters projection correctly', () => {
    // DSA current: 38/42. Range has 3 scheduled classes (Mon, Wed, Fri).
    const skipSim = simulateBunk(dsaSubject, sampleTimetable, '2026-10-26', '2026-10-30', 'skip', 75);
    expect(skipSim.projectedAttended).toBe(38);
    expect(skipSim.projectedDelivered).toBe(45);
    expect(skipSim.projectedPercentage).toBe(84.44);

    const attendSim = simulateBunk(dsaSubject, sampleTimetable, '2026-10-26', '2026-10-30', 'attend', 75);
    expect(attendSim.projectedAttended).toBe(41);
    expect(attendSim.projectedDelivered).toBe(45);
    expect(attendSim.projectedPercentage).toBe(91.11);
  });

  it('Handles Duty Leave (approved) and Medical Leave scenarios', () => {
    // Duty Leave (verified approved) counts as attended: 38 + 3 = 41 / 45
    const dutySim = simulateBunk(dsaSubject, sampleTimetable, '2026-10-26', '2026-10-30', 'duty', 75);
    expect(dutySim.projectedAttended).toBe(41);
    expect(dutySim.projectedDelivered).toBe(45);
    expect(dutySim.projectedPercentage).toBe(91.11);

    // Medical Leave (unapproved/pending) treated as absence without assumption: 38 / 45
    const medSim = simulateBunk(dsaSubject, sampleTimetable, '2026-10-26', '2026-10-30', 'medical', 75);
    expect(medSim.projectedAttended).toBe(38);
    expect(medSim.projectedDelivered).toBe(45);
    expect(medSim.projectedPercentage).toBe(84.44);
  });

  it('Changing target between 65%, 75%, 80%, and 85% dynamically updates safe bunks', () => {
    const a = 38;
    const t = 42;
    // 65% target
    expect(calculateSafeBunks(a, t, 65)).toBe(16);
    // 75% target: floor(38 / 0.75 - 42) = floor(50.66 - 42) = 8
    expect(calculateSafeBunks(a, t, 75)).toBe(8);
    // 80% target: floor(38 / 0.8 - 42) = floor(47.5 - 42) = 5
    expect(calculateSafeBunks(a, t, 80)).toBe(5);
    // 85% target: floor(38 / 0.85 - 42) = floor(44.7 - 42) = 2
    expect(calculateSafeBunks(a, t, 85)).toBe(2);
  });

  it('Under-target recovery updates dynamically between 75%, 80%, 85%', () => {
    const a = 50;
    const t = 80; // Current: 62.5%
    // To reach 75%: ceil((0.75 * 80 - 50) / 0.25) = ceil((60 - 50) / 0.25) = 40
    expect(calculateRecoveryClasses(a, t, 75)).toBe(40);
    expect(calculateAttendancePercentage(a + 40, t + 40)).toBe(75.0);

    // To reach 80%: ceil((0.8 * 80 - 50) / 0.2) = ceil((64 - 50) / 0.2) = 70
    expect(calculateRecoveryClasses(a, t, 80)).toBe(70);
    expect(calculateAttendancePercentage(a + 70, t + 70)).toBe(80.0);
  });

  it('Zero scheduled sessions gives clear explanatory message and no misleading calculation', () => {
    // Saturday to Sunday (weekend)
    const weekendSim = simulateBunk(dsaSubject, sampleTimetable, '2026-10-24', '2026-10-25', 'skip', 75);
    expect(weekendSim.scheduledSessionsCount).toBe(0);
    expect(weekendSim.projectedPercentage).toBe(weekendSim.currentPercentage);
    expect(weekendSim.percentageDelta).toBe(0);
    expect(weekendSim.zeroSessionsReason).toContain('No classes are scheduled');
  });
});

describe('Calendar Engine & Navigation Tests', () => {
  it('Correctly calculates leap year days and weekday alignment (Feb 2024)', () => {
    const year = 2024;
    const month = 1; // February (0-indexed)
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 2024 is a leap year -> 29 days
    expect(daysInMonth).toBe(29);
    // Feb 1, 2024 was a Thursday (index 4 in 0=Sun..6=Sat)
    expect(firstDayIndex).toBe(4);
    expect(DAY_NAMES[firstDayIndex]).toBe('Thursday');
  });

  it('Correctly calculates non-leap year days (Feb 2025)', () => {
    const year = 2025;
    const month = 1; // February
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    expect(daysInMonth).toBe(28);
  });

  it('Month navigation advances and regresses properly across year boundaries', () => {
    // Start at December 2026
    let date = new Date(2026, 11, 1);
    expect(date.getMonth()).toBe(11);
    expect(date.getFullYear()).toBe(2026);

    // Next month: advances to January 2027
    date = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    expect(date.getMonth()).toBe(0);
    expect(date.getFullYear()).toBe(2027);

    // Prev month twice: goes back to November 2026
    date = new Date(date.getFullYear(), date.getMonth() - 2, 1);
    expect(date.getMonth()).toBe(10);
    expect(date.getFullYear()).toBe(2026);
  });
});
