export type ThemeMode = 'dark' | 'light';

export interface UserData {
  roleId: number;
  userId: number;
  name: string;
  sessionId: number;
  instituteId: number;
  studentId: number;
  apiKey: string;
  feedName: string;
  photo: string;
  roleName: string;
}

export interface StudentProfile {
  studentName: string;
  rollNo: string;
  className: string;
  section: string;
  email: string;
  mobile: string;
  phone: string;
  dateOfBirth: string;
  dob: string;
  category: string;
  fatherName: string;
  fatherMobile: string;
  motherName: string;
  motherMobile: string;
  profilePhoto: string;
  address: string;
  permanentAddress: string;
  currentAddress: string;
  stuClassName: string;
  regNo: string;
  studentEmail: string;
  studentMobileNo: string;
  firstName: string;
  userId: string;
}

export interface SubjectItem {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherName: string;
  teacherId: string;
}

export interface SubjectAttendance {
  subject_name: string;
  course_code: string;
  teacher: string;
  delivered: number;
  attended: number;
  absent: number;
  percentage: number;
  raw_percentage?: number;
  official_percentage?: number | null;
  duty_leave: number;
  medical_leave: number;
  approved_duty_leave?: number;
  approved_medical_leave?: number;
}

export interface OverallAttendance {
  title: string;
  page_id: string;
  page_name: string;
  total_subjects: number;
  overall_percentage: number;
  raw_percentage?: number;
  total_delivered?: number;
  total_attended?: number;
  total_absent?: number;
  total_duty_leave?: number;
  total_medical_leave?: number;
  total_approved_duty_leave?: number;
  total_approved_medical_leave?: number;
  official_percentage?: number | null;
  subjects: SubjectAttendance[];
}

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

export interface TimetableSlot {
  day: string;
  dayNumber: number;
  subjectCode: string;
  subjectName?: string;
  startTime: string;
  endTime: string;
  teacherName: string;
  period: number;
  roomNumber: string;
  timeInferred?: boolean;
}

export interface CircularAttachment {
  name: string;
  url: string;
  /** File extension inferred from name or URL, e.g. 'pdf', 'docx', 'jpg' */
  fileType?: string;
  /** File size in bytes if known */
  sizeBytes?: number;
}

export interface CircularItem {
  id: string;
  title: string;
  desc: string;
  creDate: string;
  type: string;
  category: 'Yesterday' | 'This Week' | 'Earlier';
  unread?: boolean;
  attachments?: CircularAttachment[];
  /** Raw HTML description from the server, preserved for detailed view */
  rawDesc?: string;
}

export interface LeaveCategory {
  id: string;
  name: string;
  maxDays: number;
}

export interface LeaveItem {
  id: string;
  category: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  appliedOn: string;
}

export interface ReportCardSubject {
  name: string;
  code: string;
  credits: number;
  grade: string;
  marks: number;
  maxMarks: number;
}

export interface SemesterResult {
  semester: string;
  semesterNumber: number;
  sgpa: number;
  academicYear: string;
  subjects: ReportCardSubject[];
  totalCredits: number;
  earnedCredits: number;
  isCurrent?: boolean;
}

export interface ReportCard {
  semester: string;
  sgpa: number;
  cgpa: number;
  academicYear: string;
  subjects: ReportCardSubject[];
  /** All semesters when multi-semester data is available */
  semesters?: SemesterResult[];
}

/** Grade-point mapping for Chitkara University grading system */
export const GRADE_POINTS: Record<string, number> = {
  'O': 10,
  'A+': 9,
  'A': 8,
  'B+': 7,
  'B': 6,
  'C+': 5,
  'C': 4,
  'D': 3,
  'F': 0,
  'I': 0,    // Incomplete
  'W': 0,    // Withdrawn
  'AB': 0,   // Absent
};

/**
 * Returns the numeric grade point for a given letter grade.
 * Returns -1 if the grade is not recognized (so callers can decide to exclude it).
 */
export function gradeToPoint(grade: string): number {
  const normalized = grade.trim().toUpperCase();
  if (normalized in GRADE_POINTS) return GRADE_POINTS[normalized];
  return -1;
}

/**
 * Calculates SGPA from a list of subjects using weighted grade points.
 * Only includes subjects with recognized grades and positive credits.
 */
export function calculateSGPA(subjects: ReportCardSubject[]): number {
  let totalCredits = 0;
  let weightedSum = 0;
  for (const sub of subjects) {
    const gp = gradeToPoint(sub.grade);
    if (gp < 0 || sub.credits <= 0) continue;  // skip unrecognized grades
    totalCredits += sub.credits;
    weightedSum += sub.credits * gp;
  }
  if (totalCredits === 0) return 0;
  return Math.round((weightedSum / totalCredits) * 100) / 100;
}

/**
 * Calculates CGPA from all semester results.
 */
export function calculateCGPA(semesters: SemesterResult[]): number {
  let totalCredits = 0;
  let weightedSum = 0;
  for (const sem of semesters) {
    for (const sub of sem.subjects) {
      const gp = gradeToPoint(sub.grade);
      if (gp < 0 || sub.credits <= 0) continue;
      totalCredits += sub.credits;
      weightedSum += sub.credits * gp;
    }
  }
  if (totalCredits === 0) return 0;
  return Math.round((weightedSum / totalCredits) * 100) / 100;
}

/** Returns a CSS color for a grade badge */
export function gradeColor(grade: string): { bg: string; text: string } {
  const g = grade.trim().toUpperCase();
  switch (g) {
    case 'O':  return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981' };
    case 'A+': return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6' };
    case 'A':  return { bg: 'rgba(99, 102, 241, 0.15)', text: '#6366F1' };
    case 'B+': return { bg: 'rgba(168, 85, 247, 0.15)', text: '#A855F7' };
    case 'B':  return { bg: 'rgba(236, 72, 153, 0.15)', text: '#EC4899' };
    case 'C+': case 'C': return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B' };
    case 'D':  return { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444' };
    case 'F':  return { bg: 'rgba(239, 68, 68, 0.2)', text: '#DC2626' };
    default:   return { bg: 'rgba(255, 122, 0, 0.15)', text: '#FF7A00' };
  }
}
