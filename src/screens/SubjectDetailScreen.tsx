import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  Calculator, CheckCircle2, AlertTriangle, Info, Clock,
  MapPin, User, Layers, ShieldCheck, Flame
} from 'lucide-react';
import {
  calculateAttendancePercentage,
  calculateRawAttendance,
  getAttendanceStatus,
  calculateSafeBunks,
  calculateRecoveryClasses,
  DAY_NAMES,
} from '../utils/attendanceCalculations';
import { BunkPlannerModal } from '../components/attendance/BunkPlannerModal';

interface SubjectDetailScreenProps {
  courseCode: string;
}

export const SubjectDetailScreen: React.FC<SubjectDetailScreenProps> = ({ courseCode }) => {
  const {
    attendanceData,
    attendanceRegister,
    timetableData,
    theme,
    navigate,
  } = useApp();

  const isDark = theme === 'dark';

  // Configurable attendance target (default 75%)
  const [targetPercentage, setTargetPercentage] = useState<number>(75);

  // Active tab: 'summary' | 'register'
  const [activeTab, setActiveTab] = useState<'summary' | 'register'>('summary');

  // Register view mode: 'calendar' | 'list' (for accessibility)
  const [registerViewMode, setRegisterViewMode] = useState<'calendar' | 'list'>('calendar');

  // Plan a bunk modal state
  const [showBunkPlanner, setShowBunkPlanner] = useState<boolean>(false);

  // Selected date on calendar (DD-MM)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(() => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${dd}-${mm}`;
  });

  // Calendar month navigation
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => new Date());

  // Find subject attendance aggregate
  const subject = useMemo(() => {
    if (!attendanceData?.subjects) return null;
    return (
      attendanceData.subjects.find(
        (s) => s.course_code.toLowerCase() === courseCode.toLowerCase()
      ) || null
    );
  }, [attendanceData, courseCode]);

  // Find subject register entries (ONLY FOR THIS SUBJECT)
  const registerSubject = useMemo(() => {
    if (!attendanceRegister?.subjects) return null;
    return (
      attendanceRegister.subjects.find(
        (s) => s.courseCode.toLowerCase() === courseCode.toLowerCase()
      ) || null
    );
  }, [attendanceRegister, courseCode]);

  // Find subject timetable slots
  const subjectTimetableSlots = useMemo(() => {
    if (!timetableData) return [];
    return timetableData.filter(
      (s) => s.subjectCode.toLowerCase() === courseCode.toLowerCase()
    );
  }, [timetableData, courseCode]);

  // Subject statistics
  const currentAttended = subject?.attended ?? 0;
  const currentDelivered = subject?.delivered ?? 0;
  const currentAbsent = subject?.absent ?? 0;
  const currentDutyLeave = subject?.duty_leave ?? 0;
  const currentMedicalLeave = subject?.medical_leave ?? 0;
  const approvedDutyLeave = subject?.approved_duty_leave;
  const approvedMedicalLeave = subject?.approved_medical_leave;

  const rawPct = subject?.raw_percentage ?? calculateRawAttendance(currentAttended, currentDelivered, 2);
  const officialPct = subject?.official_percentage;
  const displayPct = officialPct != null ? officialPct : rawPct;
  const currentPct = displayPct;
  const status = getAttendanceStatus(displayPct, targetPercentage);
  const safeBunks = calculateSafeBunks(currentAttended, currentDelivered, targetPercentage);
  const recoveryNeeded = calculateRecoveryClasses(currentAttended, currentDelivered, targetPercentage);

  // Status Badge styling
  const statusBadge = useMemo(() => {
    if (status === 'Safe') {
      return {
        label: 'Safe',
        bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500',
        icon: ShieldCheck,
      };
    }
    if (status === 'At Risk') {
      return {
        label: 'At Risk',
        bg: 'bg-amber-500/15 border-amber-500/30 text-amber-500',
        icon: AlertTriangle,
      };
    }
    return {
      label: 'Below Target',
      bg: 'bg-rose-500/15 border-rose-500/30 text-rose-500',
      icon: Flame,
    };
  }, [status]);

  // Map register entries for THIS subject by "DD-MM"
  const entriesByDate = useMemo(() => {
    const map: Record<
      string,
      {
        lectureNum: number;
        period: string;
        status: 'P' | 'A' | 'DL' | 'ML';
      }[]
    > = {};

    if (!registerSubject?.entries) return map;

    for (const e of registerSubject.entries) {
      if (!e.date) continue;
      if (!map[e.date]) {
        map[e.date] = [];
      }
      map[e.date].push({
        lectureNum: e.lectureNum,
        period: e.period,
        status: e.status,
      });
    }

    return map;
  }, [registerSubject]);

  // Calendar month days generation
  const calendarDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth(); // 0-indexed

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: {
      dayNumber: number;
      dateKey: string; // "DD-MM"
      fullDateStr: string; // "YYYY-MM-DD"
      isCurrentMonth: boolean;
      isToday: boolean;
      isPast: boolean;
      isFuture: boolean;
      hasScheduledSlot: boolean;
      scheduledSlots: typeof subjectTimetableSlots;
      registerEntries: {
        lectureNum: number;
        period: string;
        status: 'P' | 'A' | 'DL' | 'ML';
      }[];
    }[] = [];

    // Prepend padding days from previous month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({
        dayNumber: 0,
        dateKey: '',
        fullDateStr: '',
        isCurrentMonth: false,
        isToday: false,
        isPast: false,
        isFuture: false,
        hasScheduledSlot: false,
        scheduledSlots: [],
        registerEntries: [],
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dd = String(d).padStart(2, '0');
      const mm = String(month + 1).padStart(2, '0');
      const dateKey = `${dd}-${mm}`;
      const fullDateStr = `${year}-${mm}-${dd}`;

      const dateObj = new Date(year, month, d);
      dateObj.setHours(0, 0, 0, 0);

      const isToday = dateObj.getTime() === today.getTime();
      const isPast = dateObj.getTime() < today.getTime();
      const isFuture = dateObj.getTime() > today.getTime();

      const dayOfWeekName = DAY_NAMES[dateObj.getDay()];
      const daySlots = subjectTimetableSlots.filter(
        (s) =>
          (s.day && s.day.toLowerCase() === dayOfWeekName.toLowerCase()) ||
          s.dayNumber === dateObj.getDay()
      );

      const entries = entriesByDate[dateKey] || [];

      days.push({
        dayNumber: d,
        dateKey,
        fullDateStr,
        isCurrentMonth: true,
        isToday,
        isPast,
        isFuture,
        hasScheduledSlot: daySlots.length > 0,
        scheduledSlots: daySlots,
        registerEntries: entries,
      });
    }

    return days;
  }, [currentMonthDate, entriesByDate, subjectTimetableSlots]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Selected date breakdown sessions
  const selectedDayInfo = useMemo(() => {
    return calendarDays.find((c) => c.isCurrentMonth && c.dateKey === selectedCalendarDate) || null;
  }, [calendarDays, selectedCalendarDate]);

  // Subject monthly register summary
  const monthSummary = useMemo(() => {
    const monthStr = String(currentMonthDate.getMonth() + 1).padStart(2, '0');
    let attended = 0;
    let delivered = 0;
    let absent = 0;
    let duty = 0;
    let medical = 0;

    for (const [dateKey, entries] of Object.entries(entriesByDate)) {
      if (dateKey.endsWith(`-${monthStr}`)) {
        for (const e of entries) {
          delivered++;
          if (e.status === 'P') attended++;
          else if (e.status === 'A') absent++;
          else if (e.status === 'DL') {
            duty++;
            attended++; // Verified: approved DL counts as attended
          } else if (e.status === 'ML') {
            medical++;
          }
        }
      }
    }

    const pct = delivered > 0 ? (attended / delivered) * 100 : 0;
    return { attended, delivered, absent, duty, medical, pct };
  }, [currentMonthDate, entriesByDate]);

  // If subject was not found in attendanceData
  if (!subject) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center p-6 text-center subpage-pb pt-safe-header ${
        isDark ? 'bg-[#0A0A0A] text-white' : 'bg-[#F8F7F4] text-[#1E1A1D]'
      }`}>
        <AlertTriangle size={48} className="text-[#FF7A00] mb-4" />
        <h2 className="text-lg font-bold">Subject Not Found</h2>
        <p className="text-xs opacity-70 mt-1 max-w-xs">
          No attendance record matches course code <span className="font-mono font-bold">{courseCode}</span>.
        </p>
        <button
          onClick={() => navigate('/attendance')}
          className="mt-6 px-4 py-2 bg-[#FF7A00] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#E66E00] transition-colors"
        >
          Return to Attendance
        </button>
      </div>
    );
  }

  const StatusIcon = statusBadge.icon;

  return (
    <div
      className={`flex-1 flex flex-col transition-colors duration-300 subpage-pb ${
        isDark ? 'bg-[#0A0A0A] text-white' : 'bg-[#F8F7F4] text-[#1E1A1D]'
      }`}
    >
      {/* Top Sticky Header */}
      <header
        className={`sticky top-0 z-30 px-4 sm:px-5 py-3.5 flex items-center justify-between backdrop-blur-md transition-colors pt-safe-header ${
          isDark ? 'bg-[#0A0A0A]/90 border-b border-[#1E1E1E]' : 'bg-[#F8F7F4]/90 border-b border-[#E8E8E8]'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/attendance')}
            className="p-1 -ml-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Back to attendance overview"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Subject Detail</span>
            <h1 className="text-base font-bold tracking-tight truncate max-w-[200px]">
              {subject.course_code}
            </h1>
          </div>
        </div>

        {/* Plan a Bunk CTA */}
        <button
          onClick={() => setShowBunkPlanner(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FF7A00] text-white text-xs font-semibold hover:bg-[#E66E00] shadow-sm transition-all"
        >
          <Calculator size={13} />
          <span>Plan a Bunk</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="px-4 sm:px-5 pt-4 space-y-4">
        {/* Subject Hero Card */}
        <div
          className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden ${
            isDark ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
          }`}
        >
          {/* Header Row: Name + Code + Status Badge */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                  {subject.course_code}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${statusBadge.bg}`}>
                  <StatusIcon size={11} />
                  <span>{statusBadge.label}</span>
                </span>
              </div>
              <h2 className="text-base font-extrabold tracking-tight leading-snug">
                {subject.subject_name}
              </h2>
              {subject.teacher && (
                <div className="flex items-center gap-1.5 mt-1 text-xs opacity-70">
                  <User size={12} className="shrink-0" />
                  <span className="truncate">{subject.teacher}</span>
                </div>
              )}
            </div>

            {/* Attendance Circular Ring Gauge */}
            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="25"
                  className={isDark ? 'text-[#242628]' : 'text-gray-100'}
                  strokeWidth="5"
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="25"
                  className={displayPct >= targetPercentage ? 'text-emerald-500' : 'text-rose-500'}
                  strokeWidth="5"
                  strokeDasharray={157}
                  strokeDashoffset={157 - (157 * Math.min(100, displayPct)) / 100}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs font-black">{displayPct.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Counts Grid: Attended, Delivered, Absent, DL, ML */}
          <div className="grid grid-cols-5 gap-1 pt-3 border-t border-white/5 text-center text-xs">
            <div className="p-1.5 rounded-xl bg-white/5">
              <p className="text-[9px] uppercase font-bold opacity-60">Delivered</p>
              <p className="text-sm font-black mt-0.5">{currentDelivered}</p>
            </div>
            <div className="p-1.5 rounded-xl bg-emerald-500/10">
              <p className="text-[9px] uppercase font-bold text-emerald-500">Attended</p>
              <p className="text-sm font-black text-emerald-500 mt-0.5">{currentAttended}</p>
            </div>
            <div className="p-1.5 rounded-xl bg-rose-500/10">
              <p className="text-[9px] uppercase font-bold text-rose-500">Absent</p>
              <p className="text-sm font-black text-rose-500 mt-0.5">{currentAbsent}</p>
            </div>
            <div className="p-1.5 rounded-xl bg-blue-500/10">
              <p className="text-[9px] uppercase font-bold text-blue-500">Duty Lv</p>
              <p className="text-sm font-black text-blue-500 mt-0.5">{currentDutyLeave}</p>
            </div>
            <div className="p-1.5 rounded-xl bg-amber-500/10">
              <p className="text-[9px] uppercase font-bold text-amber-500">Med Lv</p>
              <p className="text-sm font-black text-amber-500 mt-0.5">{currentMedicalLeave}</p>
            </div>
          </div>

          {(approvedDutyLeave !== undefined || approvedMedicalLeave !== undefined || (officialPct != null && Math.abs(officialPct - rawPct) > 0.05)) && (
            <div className="pt-2 flex items-center justify-between text-[10px] opacity-70">
              {officialPct != null && Math.abs(officialPct - rawPct) > 0.05 && (
                <span>Official: <strong>{officialPct}%</strong> • Raw: <strong>{rawPct.toFixed(1)}%</strong></span>
              )}
              <div className="flex items-center gap-2 ml-auto">
                {approvedDutyLeave !== undefined && <span>Approved DL: <strong className="text-blue-400">{approvedDutyLeave}</strong></span>}
                {approvedMedicalLeave !== undefined && <span>Approved ML: <strong className="text-amber-400">{approvedMedicalLeave}</strong></span>}
              </div>
            </div>
          )}

          {/* Target Configurator Quick Bar */}
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-[11px] font-semibold opacity-70">Target Threshold:</span>
            <div className="flex items-center gap-1.5">
              {[65, 75, 80, 85].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setTargetPercentage(pct)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                    targetPercentage === pct
                      ? 'bg-[#FF7A00] text-white shadow-sm'
                      : isDark
                      ? 'bg-[#1C1D21] text-gray-400 hover:text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Two Tabs Navigation: Summary & Register (Subject-Scoped) */}
        <div
          className={`grid grid-cols-2 p-1 rounded-xl border ${
            isDark ? 'bg-[#141517] border-[#222428]' : 'bg-gray-100 border-gray-200'
          }`}
        >
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'summary'
                ? 'bg-[#FF7A00] text-white shadow-sm'
                : isDark
                ? 'text-gray-400 hover:text-white'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <Layers size={13} />
            <span>Summary</span>
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'register'
                ? 'bg-[#FF7A00] text-white shadow-sm'
                : isDark
                ? 'text-gray-400 hover:text-white'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <CalendarIcon size={13} />
            <span>Register & History</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: SUMMARY                                                */}
        {/* ============================================================ */}
        {activeTab === 'summary' && (
          <div className="space-y-4">
            {/* Safe Bunk & Recovery Advice Card */}
            <div
              className={`p-4 rounded-2xl border shadow-sm ${
                isDark ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                  Target Status ({targetPercentage}%)
                </span>
                <span
                  className={`text-[11px] font-bold ${
                    currentPct >= targetPercentage ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {currentPct >= targetPercentage ? 'Criteria Met' : 'Action Required'}
                </span>
              </div>

              {currentPct >= targetPercentage ? (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-400 text-sm">
                        {safeBunks > 0
                          ? `You can safely bunk ${safeBunks} more class${safeBunks > 1 ? 'es' : ''}`
                          : 'You are exactly on target'}
                      </p>
                      <p className="text-[11px] opacity-80 mt-1">
                        {safeBunks > 0
                          ? `Missing ${safeBunks} additional class${
                              safeBunks > 1 ? 'es' : ''
                            } will bring your attendance to ${calculateAttendancePercentage(
                              currentAttended,
                              currentDelivered + safeBunks,
                              2
                            )}%, safely at or above ${targetPercentage}%.`
                          : `Any absence will drop you below your ${targetPercentage}% requirement.`}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-400 text-sm">
                        Attend {recoveryNeeded} consecutive class{recoveryNeeded > 1 ? 'es' : ''} to recover
                      </p>
                      <p className="text-[11px] opacity-80 mt-1">
                        Attending {recoveryNeeded} consecutive upcoming classes without missing any will lift your attendance to{' '}
                        {calculateAttendancePercentage(
                          currentAttended + recoveryNeeded,
                          currentDelivered + recoveryNeeded,
                          2
                        )}
                        %, reaching your {targetPercentage}% requirement.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button: Launch Planner */}
              <button
                onClick={() => setShowBunkPlanner(true)}
                className="w-full mt-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Calculator size={14} className="text-[#FF7A00]" />
                <span>Simulate Absences for this Subject</span>
              </button>
            </div>

            {/* Attendance Trend & Recent Sessions */}
            <div
              className={`p-4 rounded-2xl border shadow-sm ${
                isDark ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                  Recent Lecture History
                </span>
                {registerSubject?.entries && registerSubject.entries.length > 0 && (
                  <span className="text-[11px] opacity-60">
                    Total {registerSubject.entries.length} logged
                  </span>
                )}
              </div>

              {!registerSubject?.entries || registerSubject.entries.length === 0 ? (
                <div className="py-6 text-center text-xs opacity-60">
                  <Info size={24} className="mx-auto mb-2 text-[#FF7A00]" />
                  <p className="font-semibold">Individual Session History Unavailable</p>
                  <p className="text-[11px] mt-1 max-w-xs mx-auto">
                    Faculty has submitted aggregate attendance ({currentAttended}/{currentDelivered}), but detailed individual lecture records are not yet published on ERP.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Visual Outcome Pill Strip (Last 12 sessions) */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase opacity-60">Last Sessions Outcome</span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {registerSubject.entries.slice(-14).map((e, idx) => {
                        const bg =
                          e.status === 'P'
                            ? 'bg-emerald-500 text-white'
                            : e.status === 'A'
                            ? 'bg-rose-500 text-white'
                            : e.status === 'DL'
                            ? 'bg-blue-500 text-white'
                            : 'bg-amber-500 text-white';
                        return (
                          <div
                            key={idx}
                            title={`Lec #${e.lectureNum} (${e.date}): ${e.status}`}
                            className={`w-7 h-7 rounded-lg text-[10px] font-black flex items-center justify-center cursor-default ${bg}`}
                          >
                            {e.status}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* List of last 5 detailed sessions */}
                  <div className="pt-2 space-y-1.5">
                    {registerSubject.entries
                      .slice(-5)
                      .reverse()
                      .map((lec, idx) => {
                        const statusClass =
                          lec.status === 'P'
                            ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                            : lec.status === 'A'
                            ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                            : lec.status === 'DL'
                            ? 'bg-blue-500/15 text-blue-500 border-blue-500/30'
                            : 'bg-amber-500/15 text-amber-500 border-amber-500/30';

                        const statusLabel =
                          lec.status === 'P'
                            ? 'Present'
                            : lec.status === 'A'
                            ? 'Absent'
                            : lec.status === 'DL'
                            ? 'Duty Leave'
                            : 'Medical Leave';

                        return (
                          <div
                            key={idx}
                            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                              isDark ? 'bg-[#0E0E10] border-[#222428]' : 'bg-gray-50 border-gray-100'
                            }`}
                          >
                            <div>
                              <p className="font-bold">Lecture #{lec.lectureNum}</p>
                              <p className="text-[10px] opacity-60 font-mono">
                                Date: {lec.date} • Period {lec.period}
                              </p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </div>
                        );
                      })}
                  </div>

                  {/* Button to view all in Register tab */}
                  <button
                    onClick={() => setActiveTab('register')}
                    className="w-full py-2 text-center text-xs font-bold text-[#FF7A00] hover:underline pt-2"
                  >
                    View All {registerSubject.entries.length} Sessions in Register →
                  </button>
                </div>
              )}
            </div>

            {/* Weekly Timetable Schedule Slots */}
            {subjectTimetableSlots.length > 0 && (
              <div
                className={`p-4 rounded-2xl border shadow-sm ${
                  isDark ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                    Weekly Schedule ({subjectTimetableSlots.length} slot{subjectTimetableSlots.length !== 1 ? 's' : ''}/week)
                  </span>
                </div>

                <div className="space-y-2">
                  {subjectTimetableSlots.map((slot, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                        isDark ? 'bg-[#0E0E10] border-[#222428]' : 'bg-gray-50 border-gray-100'
                      }`}
                    >
                      <div>
                        <p className="font-bold">{slot.day}</p>
                        <p className="text-[10px] opacity-60 flex items-center gap-1.5 mt-0.5">
                          <Clock size={11} />
                          <span>
                            {slot.startTime} - {slot.endTime} (Period {slot.period})
                          </span>
                        </p>
                      </div>
                      {slot.roomNumber && (
                        <span className="text-[10px] font-mono opacity-80 px-2 py-0.5 rounded bg-white/5 border border-white/5 flex items-center gap-1">
                          <MapPin size={10} />
                          <span>{slot.roomNumber}</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: REGISTER (CALENDAR & SESSIONS FOR THIS SUBJECT ONLY)   */}
        {/* ============================================================ */}
        {activeTab === 'register' && (
          <div className="space-y-4">
            {/* View Mode Toggle: Calendar vs List */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                Attendance Register
              </span>
              <div className="flex items-center p-0.5 rounded-lg border border-white/10 bg-white/5">
                <button
                  onClick={() => setRegisterViewMode('calendar')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                    registerViewMode === 'calendar'
                      ? 'bg-[#FF7A00] text-white shadow-sm'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  Calendar
                </button>
                <button
                  onClick={() => setRegisterViewMode('list')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                    registerViewMode === 'list'
                      ? 'bg-[#FF7A00] text-white shadow-sm'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  List View
                </button>
              </div>
            </div>

            {registerViewMode === 'calendar' ? (
              <>
                {/* Monthly Calendar Card */}
                <div
                  className={`p-4 rounded-2xl border shadow-sm ${
                    isDark ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
                  }`}
                >
                  {/* Month Navigation Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
                    <button
                      onClick={handlePrevMonth}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      aria-label="Previous month"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div className="text-center">
                      <h3 className="text-sm font-extrabold tracking-tight">
                        {monthNames[currentMonthDate.getMonth()]} {currentMonthDate.getFullYear()}
                      </h3>
                      <span className="text-[10px] opacity-60">
                        {subject.course_code} Register
                      </span>
                    </div>
                    <button
                      onClick={handleNextMonth}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      aria-label="Next month"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  {/* Day of Week Headers */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                      <span
                        key={idx}
                        className={`text-[10px] font-bold uppercase ${
                          idx === 0 || idx === 6 ? 'text-gray-500' : 'text-gray-400'
                        }`}
                      >
                        {day}
                      </span>
                    ))}
                  </div>

                  {/* Calendar Dates Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {calendarDays.map((cell, idx) => {
                      if (!cell.isCurrentMonth) {
                        return <div key={`empty-${idx}`} className="h-11" />;
                      }

                      const isSelected = selectedCalendarDate === cell.dateKey;
                      const hasEntries = cell.registerEntries.length > 0;
                      const hasScheduled = cell.hasScheduledSlot;

                      // Status flags
                      const hasPresent = cell.registerEntries.some((e) => e.status === 'P');
                      const hasAbsent = cell.registerEntries.some((e) => e.status === 'A');
                      const hasDuty = cell.registerEntries.some((e) => e.status === 'DL');
                      const hasMedical = cell.registerEntries.some((e) => e.status === 'ML');

                      return (
                        <button
                          key={cell.dateKey}
                          onClick={() => setSelectedCalendarDate(cell.dateKey)}
                          className={`h-11 rounded-xl flex flex-col items-center justify-center relative transition-all ${
                            isSelected
                              ? 'ring-2 ring-[#FF7A00] bg-[#FF7A00]/20 font-bold'
                              : hasEntries
                              ? isDark
                                ? 'bg-[#1C1D21] hover:bg-[#25272D]'
                                : 'bg-gray-50 hover:bg-gray-100'
                              : hasScheduled
                              ? isDark
                                ? 'bg-white/5 border border-dashed border-white/15'
                                : 'bg-gray-50/50 border border-dashed border-gray-200'
                              : 'opacity-40 hover:opacity-100'
                          }`}
                        >
                          <span className="text-xs">{cell.dayNumber}</span>

                          {/* Indicators for verified records */}
                          {hasEntries ? (
                            <div className="flex gap-0.5 mt-0.5">
                              {hasPresent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                              {hasAbsent && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                              {hasDuty && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                              {hasMedical && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                            </div>
                          ) : hasScheduled && cell.isFuture ? (
                            <span className="w-1 h-1 rounded-full bg-gray-400 mt-1" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  {/* Status Legend */}
                  <div
                    className={`mt-4 pt-3 border-t flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-center text-[10px] font-semibold ${
                      isDark ? 'border-[#222428] text-gray-400' : 'border-gray-100 text-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Present</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>Absent</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>Duty</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>Medical</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      <span>Scheduled</span>
                    </div>
                  </div>
                </div>

                {/* Monthly Register Summary for This Subject */}
                {monthSummary.delivered > 0 && (
                  <div
                    className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider opacity-70">
                        {monthNames[currentMonthDate.getMonth()]} Summary ({subject.course_code})
                      </h4>
                      <span className="text-xs font-extrabold text-[#FF7A00]">
                        {monthSummary.pct.toFixed(1)}%
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-xs pt-1">
                      <div className="p-2 rounded-xl bg-emerald-500/10">
                        <p className="text-[10px] text-emerald-500 font-bold uppercase">Present</p>
                        <p className="text-sm font-extrabold text-emerald-500 mt-0.5">{monthSummary.attended}</p>
                      </div>
                      <div className="p-2 rounded-xl bg-rose-500/10">
                        <p className="text-[10px] text-rose-500 font-bold uppercase">Absent</p>
                        <p className="text-sm font-extrabold text-rose-500 mt-0.5">{monthSummary.absent}</p>
                      </div>
                      <div className="p-2 rounded-xl bg-blue-500/10">
                        <p className="text-[10px] text-blue-500 font-bold uppercase">Duty</p>
                        <p className="text-sm font-extrabold text-blue-500 mt-0.5">{monthSummary.duty}</p>
                      </div>
                      <div className="p-2 rounded-xl bg-amber-500/10">
                        <p className="text-[10px] text-amber-500 font-bold uppercase">Medical</p>
                        <p className="text-sm font-extrabold text-amber-500 mt-0.5">{monthSummary.medical}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Selected Date Sessions List */}
                <div
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <CalendarIcon size={14} className="text-[#FF7A00]" />
                      <span>Sessions on {selectedCalendarDate}</span>
                    </h4>
                    <span className="text-[10px] font-mono opacity-60">
                      {subject.course_code}
                    </span>
                  </div>

                  {selectedDayInfo && selectedDayInfo.registerEntries.length > 0 ? (
                    <div className="space-y-2">
                      {selectedDayInfo.registerEntries.map((lec, i) => {
                        const statusClass =
                          lec.status === 'P'
                            ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                            : lec.status === 'A'
                            ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                            : lec.status === 'DL'
                            ? 'bg-blue-500/15 text-blue-500 border-blue-500/30'
                            : 'bg-amber-500/15 text-amber-500 border-amber-500/30';

                        const statusLabel =
                          lec.status === 'P'
                            ? 'Present'
                            : lec.status === 'A'
                            ? 'Absent'
                            : lec.status === 'DL'
                            ? 'Duty Leave'
                            : 'Medical Leave';

                        return (
                          <div
                            key={i}
                            className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                              isDark ? 'border-[#222428] bg-[#0E0E10]' : 'border-gray-100 bg-gray-50'
                            }`}
                          >
                            <div>
                              <p className="font-bold">Lecture #{lec.lectureNum}</p>
                              <p className="text-[10px] opacity-60 font-mono mt-0.5">
                                Period {lec.period} • Recorded Status
                              </p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : selectedDayInfo && selectedDayInfo.hasScheduledSlot ? (
                    <div className="space-y-2">
                      {selectedDayInfo.scheduledSlots.map((slot, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                            isDark ? 'border-[#222428] bg-[#0E0E10]' : 'border-gray-100 bg-gray-50'
                          }`}
                        >
                          <div>
                            <p className="font-bold flex items-center gap-1.5">
                              <span>Period {slot.period}</span>
                              {slot.roomNumber && (
                                <span className="text-[10px] opacity-60 font-mono">({slot.roomNumber})</span>
                              )}
                            </p>
                            <p className="text-[10px] opacity-60 mt-0.5">
                              {slot.startTime} - {slot.endTime}
                            </p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${
                            selectedDayInfo.isFuture
                              ? 'bg-white/10 text-gray-300 border-white/15'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {selectedDayInfo.isFuture ? 'Upcoming' : 'No verified record'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-xs opacity-50">
                      No class scheduled or recorded on {selectedCalendarDate} for this subject.
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Accessible List View */
              <div
                className={`p-4 rounded-2xl border shadow-sm ${
                  isDark ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
                }`}
              >
                <div className="pb-3 mb-3 border-b border-white/5 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Full Session Log ({registerSubject?.entries?.length || 0} entries)
                  </h4>
                  <span className="text-[10px] opacity-60 font-mono">{subject.course_code}</span>
                </div>

                {!registerSubject?.entries || registerSubject.entries.length === 0 ? (
                  <p className="py-6 text-center text-xs opacity-60">
                    Individual historical session records are unavailable for this subject.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {registerSubject.entries.map((lec, idx) => {
                      const statusClass =
                        lec.status === 'P'
                          ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                          : lec.status === 'A'
                          ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                          : lec.status === 'DL'
                          ? 'bg-blue-500/15 text-blue-500 border-blue-500/30'
                          : 'bg-amber-500/15 text-amber-500 border-amber-500/30';

                      const statusLabel =
                        lec.status === 'P'
                          ? 'Present'
                          : lec.status === 'A'
                          ? 'Absent'
                          : lec.status === 'DL'
                          ? 'Duty Leave'
                          : 'Medical Leave';

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                            isDark ? 'bg-[#0E0E10] border-[#222428]' : 'bg-gray-50 border-gray-100'
                          }`}
                        >
                          <div>
                            <p className="font-bold">
                              Lecture #{lec.lectureNum} • Date: {lec.date}
                            </p>
                            <p className="text-[10px] opacity-60 font-mono mt-0.5">
                              Period {lec.period}
                            </p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Plan a Bunk Modal: automatically bound to this subject! */}
      <BunkPlannerModal
        isOpen={showBunkPlanner}
        onClose={() => setShowBunkPlanner(false)}
        initialSubjectCode={subject.course_code}
      />
    </div>
  );
};
