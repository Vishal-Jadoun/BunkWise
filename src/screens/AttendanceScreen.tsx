import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft, Calendar as CalendarIcon, SlidersHorizontal,
  Calculator, Info, ChevronRight, ShieldCheck, AlertTriangle, Flame
} from 'lucide-react';
import {
  calculateRawAttendance,
  calculateOverallAttendance,
  getAttendanceStatus,
  calculateSafeBunks,
  calculateRecoveryClasses,
} from '../utils/attendanceCalculations';
import { BunkPlannerModal } from '../components/attendance/BunkPlannerModal';

export const AttendanceScreen: React.FC = () => {
  const {
    attendanceData,
    isDemoMode,
    isLoadingData,
    navigate,
    theme,
  } = useApp();

  const isDark = theme === 'dark';

  // Configurable global target percentage (default 75%)
  const [targetPercentage, setTargetPercentage] = useState<number>(75);

  // Plan a Bunk modal state
  const [showBunkPlanner, setShowBunkPlanner] = useState<boolean>(false);

  const subjects = attendanceData?.subjects || [];

  // Overall attendance calculations using weighted sums
  const summary = calculateOverallAttendance(subjects);
  const totalDelivered = summary.totalDelivered;
  const totalAttended = summary.totalAttended;
  const totalAbsent = summary.totalAbsent;
  const overallPercentage = summary.rawPercentage;
  const displayOverallPercentage = summary.roundedPercentage;

  return (
    <div
      className={`flex-1 flex flex-col transition-colors duration-300 pb-24 ${
        isDark ? 'bg-[#0A0A0A] text-white' : 'bg-[#F8F7F4] text-[#1E1A1D]'
      }`}
    >
      {/* Top Header */}
      <header
        className={`sticky top-0 z-30 px-5 py-3.5 flex items-center justify-between backdrop-blur-md transition-colors ${
          isDark ? 'bg-[#0A0A0A]/90 border-b border-[#1E1E1E]' : 'bg-[#F8F7F4]/90 border-b border-[#E8E8E8]'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1 -ml-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Go to Dashboard"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Attendance</h1>
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

      {/* Demo Mode Notice */}
      {isDemoMode && (
        <div className="mx-5 mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-center gap-2">
          <Info size={15} className="shrink-0" />
          <span>Showing sample attendance records and register (Demo Mode).</span>
        </div>
      )}

      {/* Main Content */}
      <main className="px-5 pt-4 space-y-4">
        {isLoadingData ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-[#FF7A00] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-medium opacity-70">Synchronizing attendance records from Chitkara ERP...</p>
          </div>
        ) : subjects.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-gray-700/40 my-4">
            <CalendarIcon size={34} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm font-semibold">No Attendance Records Found</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Your faculty has not uploaded attendance register entries for this semester yet.
            </p>
          </div>
        ) : (
          <>
            {/* Overall Attendance Summary Card */}
            <div
              className={`p-5 rounded-2xl border text-center shadow-sm relative overflow-hidden ${
                isDark ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
              }`}
            >
              <div className="relative w-36 h-36 mx-auto mb-3 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="56"
                    className={isDark ? 'text-[#242628]' : 'text-gray-100'}
                    strokeWidth="11"
                    stroke="currentColor"
                    fill="transparent"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r="56"
                    className={overallPercentage >= targetPercentage ? 'text-[#FF7A00]' : 'text-rose-500'}
                    strokeWidth="11"
                    strokeDasharray={351.8}
                    strokeDashoffset={351.8 - (351.8 * Math.min(100, overallPercentage)) / 100}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black tracking-tight">{displayOverallPercentage}%</span>
                  <span
                    className={`text-[11px] font-medium uppercase tracking-wider ${
                      isDark ? 'text-[#8A8A8A]' : 'text-[#7A7570]'
                    }`}
                  >
                    Overall
                  </span>
                </div>
              </div>

              {/* Stats Delivered / Attended / Absent */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-xs">
                <div>
                  <p className={`text-[10px] uppercase font-semibold ${isDark ? 'text-[#8A8A8A]' : 'text-[#7A7570]'}`}>
                    Delivered
                  </p>
                  <p className="text-sm font-bold mt-0.5">{totalDelivered}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-emerald-500">Attended</p>
                  <p className="text-sm font-bold text-emerald-500 mt-0.5">{totalAttended}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-rose-500">Absent</p>
                  <p className="text-sm font-bold text-rose-500 mt-0.5">{totalAbsent}</p>
                </div>
              </div>

              {/* Target Threshold Configurator bar */}
              <div
                className={`mt-4 pt-3 border-t flex items-center justify-between text-xs ${
                  isDark ? 'border-[#222428]' : 'border-gray-100'
                }`}
              >
                <div className="flex items-center gap-1.5 opacity-80">
                  <SlidersHorizontal size={13} className="text-[#FF7A00]" />
                  <span className="text-[11px] font-semibold">Min. Target:</span>
                </div>
                <div className="flex items-center gap-2">
                  {[65, 75, 80, 85].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setTargetPercentage(pct)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                        targetPercentage === pct
                          ? 'bg-[#FF7A00] text-white shadow-sm'
                          : isDark
                          ? 'bg-[#1E1E22] text-gray-400 hover:text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section Heading */}
            <div className="flex items-center justify-between px-1 pt-1">
              <div>
                <h2 className="text-xs font-bold tracking-wider uppercase opacity-70">
                  Subject-wise Attendance ({subjects.length})
                </h2>
                <p className="text-[10px] opacity-50">Tap any subject to view detailed register & calendar</p>
              </div>
              <span className="text-[11px] text-[#FF7A00] font-semibold">Target: {targetPercentage}%</span>
            </div>

            {/* Subject Cards List: Click navigates to dedicated subject page */}
            <div className="space-y-3">
              {subjects.map((subject) => {
                const rawPct = subject.raw_percentage ?? calculateRawAttendance(subject.attended, subject.delivered, 2);
                const displayPct = subject.official_percentage != null ? subject.official_percentage : rawPct;
                const status = getAttendanceStatus(displayPct, targetPercentage);
                const safeBunks = calculateSafeBunks(subject.attended, subject.delivered, targetPercentage);
                const recoveryNeeded = calculateRecoveryClasses(subject.attended, subject.delivered, targetPercentage);

                const statusBadge =
                  status === 'Safe'
                    ? { text: 'Safe', bg: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30', icon: ShieldCheck }
                    : status === 'At Risk'
                    ? { text: 'At Risk', bg: 'bg-amber-500/15 text-amber-500 border-amber-500/30', icon: AlertTriangle }
                    : { text: 'Below Target', bg: 'bg-rose-500/15 text-rose-500 border-rose-500/30', icon: Flame };

                const StatusIcon = statusBadge.icon;

                return (
                  <div
                    key={subject.course_code}
                    onClick={() => navigate(`/attendance/${encodeURIComponent(subject.course_code)}`)}
                    className={`p-4 rounded-xl border cursor-pointer hover:border-[#FF7A00]/60 active:scale-[0.99] transition-all shadow-sm ${
                      isDark ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 flex items-center gap-1 ${statusBadge.bg}`}
                          >
                            <StatusIcon size={10} />
                            <span>{statusBadge.text}</span>
                          </span>
                          <span className="font-mono text-[11px] opacity-60 truncate">{subject.course_code}</span>
                        </div>
                        <h3 className="text-sm font-bold truncate">{subject.subject_name}</h3>
                        {subject.teacher && (
                          <p className="text-[11px] opacity-60 truncate mt-0.5">{subject.teacher}</p>
                        )}
                      </div>

                      {/* Circular Gauge Miniature */}
                      <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="24"
                            cy="24"
                            r="19"
                            className={isDark ? 'text-[#242628]' : 'text-gray-100'}
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="transparent"
                          />
                          <circle
                            cx="24"
                            cy="24"
                            r="19"
                            className={displayPct >= targetPercentage ? 'text-emerald-500' : 'text-rose-500'}
                            strokeWidth="3.5"
                            strokeDasharray={119.4}
                            strokeDashoffset={119.4 - (119.4 * Math.min(100, displayPct)) / 100}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                          />
                        </svg>
                        <span className="absolute text-[10px] font-extrabold">{displayPct.toFixed(0)}%</span>
                      </div>
                    </div>

                    {/* Horizontal Progress bar */}
                    <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          displayPct >= targetPercentage ? 'bg-[#FF7A00]' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, displayPct)}%` }}
                      />
                    </div>

                    {/* Classes delivered and Safe Bunk advice with right chevron */}
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className={`font-medium ${isDark ? 'text-[#8A8A8A]' : 'text-[#7A7570]'}`}>
                        {subject.attended} / {subject.delivered} Classes
                      </span>

                      <div className="flex items-center gap-1.5">
                        {displayPct >= targetPercentage ? (
                          <span className="text-[11px] font-bold text-emerald-500">
                            {safeBunks > 0 ? `Can miss ${safeBunks} class${safeBunks > 1 ? 'es' : ''}` : 'On track'}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-rose-500">
                            {`Need ${recoveryNeeded} class${recoveryNeeded > 1 ? 'es' : ''} to recover`}
                          </span>
                        )}
                        <ChevronRight size={14} className="opacity-40" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Plan a Bunk Modal: Accessible globally with default subject */}
      <BunkPlannerModal
        isOpen={showBunkPlanner}
        onClose={() => setShowBunkPlanner(false)}
      />
    </div>
  );
};
