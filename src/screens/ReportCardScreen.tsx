import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft, GraduationCap, Info, ChevronDown, ChevronUp,
  TrendingUp, Award, BookOpen, Star
} from 'lucide-react';
import {
  SemesterResult,
  calculateSGPA, gradeToPoint, gradeColor
} from '../types';

/** SGPA bar chart component */
const SGPATrendChart: React.FC<{
  semesters: SemesterResult[];
  theme: string;
}> = ({ semesters, theme }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const maxGPA = 10;
  const sorted = [...semesters].sort((a, b) => a.semesterNumber - b.semesterNumber);

  return (
    <div className={`p-4 rounded-2xl border transition-colors ${
      theme === 'dark' ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
    }`}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={16} className="text-[#FF7A00]" />
        <h3 className="text-xs font-bold uppercase tracking-wider opacity-80">SGPA Trend</h3>
      </div>

      <div className="flex items-end gap-1.5 h-32 px-1" role="img" aria-label="SGPA trend bar chart">
        {sorted.map((sem, idx) => {
          const height = Math.max(8, (sem.sgpa / maxGPA) * 100);
          const isHovered = hoveredIdx === idx;
          const isCurrent = sem.isCurrent;

          return (
            <div
              key={sem.semesterNumber}
              className="flex-1 flex flex-col items-center gap-1 relative"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onTouchStart={() => setHoveredIdx(idx)}
              onTouchEnd={() => setTimeout(() => setHoveredIdx(null), 2000)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div className={`absolute -top-12 left-1/2 -translate-x-1/2 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap z-10 shadow-lg ${
                  theme === 'dark' ? 'bg-[#2A2A2A] text-white border border-[#3A3A3A]' : 'bg-gray-800 text-white'
                }`}>
                  <div className="text-[#FF7A00]">{sem.sgpa.toFixed(2)} SGPA</div>
                  <div className="opacity-70">{sem.subjects.length} courses • {sem.totalCredits} cr</div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45" style={{
                    background: theme === 'dark' ? '#2A2A2A' : '#1F2937'
                  }} />
                </div>
              )}

              {/* SGPA value above bar */}
              <span className={`text-[10px] font-bold transition-colors ${
                isCurrent ? 'text-[#FF7A00]' : isHovered ? (theme === 'dark' ? 'text-white' : 'text-gray-800') : 'text-gray-400'
              }`}>
                {sem.sgpa.toFixed(1)}
              </span>

              {/* Bar */}
              <div
                className={`w-full rounded-t-lg transition-all duration-300 cursor-pointer ${
                  isCurrent
                    ? 'bg-gradient-to-t from-[#FF7A00] to-[#FFA94D]'
                    : isHovered
                    ? (theme === 'dark' ? 'bg-[#FF7A00]/60' : 'bg-[#FF7A00]/40')
                    : (theme === 'dark' ? 'bg-[#2A2A2A]' : 'bg-gray-200')
                }`}
                style={{
                  height: `${height}%`,
                  minHeight: '8px',
                  maxWidth: '36px',
                  margin: '0 auto'
                }}
              />

              {/* Semester label */}
              <span className={`text-[10px] font-medium mt-1 ${
                isCurrent ? 'text-[#FF7A00] font-bold' : 'opacity-50'
              }`}>
                S{sem.semesterNumber}
              </span>

              {/* Current indicator dot */}
              {isCurrent && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF7A00] animate-pulse" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Collapsible semester section */
const SemesterSection: React.FC<{
  semester: SemesterResult;
  theme: string;
  defaultExpanded?: boolean;
}> = ({ semester, theme, defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const totalCredits = semester.subjects.reduce((sum, s) => {
    if (gradeToPoint(s.grade) >= 0 && s.credits > 0) return sum + s.credits;
    return sum;
  }, 0);

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
      theme === 'dark' ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
    } ${semester.isCurrent ? 'ring-1 ring-[#FF7A00]/30' : ''}`}>
      {/* Semester Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
        aria-expanded={expanded}
        aria-label={`${semester.semester} - SGPA ${semester.sgpa}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            semester.isCurrent
              ? 'bg-[#FF7A00]/15 text-[#FF7A00]'
              : theme === 'dark' ? 'bg-[#222428] text-gray-400' : 'bg-gray-100 text-gray-500'
          }`}>
            <BookOpen size={16} />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{semester.semester}</span>
              {semester.isCurrent && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#FF7A00]/15 text-[#FF7A00] font-bold uppercase tracking-wide">
                  Current
                </span>
              )}
            </div>
            <span className={`text-[11px] ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              {semester.subjects.length} courses • {totalCredits} credits • SGPA {semester.sgpa.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-lg font-extrabold ${
            semester.sgpa >= 9 ? 'text-emerald-500' :
            semester.sgpa >= 8 ? 'text-blue-500' :
            semester.sgpa >= 7 ? 'text-purple-500' :
            'text-[#FF7A00]'
          }`}>
            {semester.sgpa.toFixed(2)}
          </span>
          {expanded
            ? <ChevronUp size={16} className="opacity-40" />
            : <ChevronDown size={16} className="opacity-40" />
          }
        </div>
      </button>

      {/* Expandable Subject List */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className={`border-t ${theme === 'dark' ? 'border-[#222428]' : 'border-gray-100'}`}>
          {/* Table header */}
          <div className={`px-4 py-2 flex items-center text-[10px] font-bold uppercase tracking-wider ${
            theme === 'dark' ? 'text-gray-500 bg-[#0E0E10]' : 'text-gray-400 bg-gray-50'
          }`}>
            <span className="flex-1">Subject</span>
            <span className="w-14 text-center">Credits</span>
            <span className="w-14 text-center">Grade</span>
          </div>

          {/* Subject rows */}
          {semester.subjects.map((sub, i) => {
            const gc = gradeColor(sub.grade);
            return (
              <div
                key={`${sub.code}-${i}`}
                className={`px-4 py-2.5 flex items-center border-t ${
                  theme === 'dark' ? 'border-[#1A1A1D]' : 'border-gray-50'
                } ${i % 2 === 0 ? '' : (theme === 'dark' ? 'bg-[#0E0E10]/50' : 'bg-gray-50/50')}`}
              >
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-[12px] font-semibold leading-tight truncate" title={sub.name}>
                    {sub.name}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {sub.code}
                  </p>
                </div>
                <span className={`w-14 text-center text-[11px] font-semibold ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {sub.credits}
                </span>
                <div className="w-14 flex justify-center">
                  <span
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold"
                    style={{ backgroundColor: gc.bg, color: gc.text }}
                  >
                    {sub.grade}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const ReportCardScreen: React.FC = () => {
  const { reportCard, isDemoMode, isLoadingData, navigate, theme, studentProfile } = useApp();

  // Build semester data
  const semesters: SemesterResult[] = useMemo(() => {
    if (!reportCard) return [];

    // If multi-semester data exists, use it
    if (reportCard.semesters && reportCard.semesters.length > 0) {
      return reportCard.semesters;
    }

    // Otherwise wrap single semester
    if (reportCard.subjects.length === 0) return [];

    const semNumMatch = reportCard.semester.match(/(\d+)/);
    const semNum = semNumMatch ? parseInt(semNumMatch[1], 10) : 1;

    return [{
      semester: reportCard.semester,
      semesterNumber: semNum,
      sgpa: reportCard.sgpa || calculateSGPA(reportCard.subjects),
      academicYear: reportCard.academicYear,
      subjects: reportCard.subjects,
      totalCredits: reportCard.subjects.reduce((sum, s) => sum + s.credits, 0),
      earnedCredits: reportCard.subjects.reduce((sum, s) => {
        const gp = gradeToPoint(s.grade);
        return gp > 0 ? sum + s.credits : sum;
      }, 0),
      isCurrent: true,
    }];
  }, [reportCard]);

  const cgpa = useMemo(() => {
    if (!reportCard) return 0;
    if (reportCard.cgpa > 0) return reportCard.cgpa;
    // Compute from available semesters
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
    return totalCredits > 0 ? Math.round((weightedSum / totalCredits) * 100) / 100 : 0;
  }, [reportCard, semesters]);

  const totalCredits = useMemo(() =>
    semesters.reduce((sum, s) => sum + s.totalCredits, 0),
    [semesters]
  );

  const currentSem = semesters.find(s => s.isCurrent) || semesters[semesters.length - 1];

  return (
    <div className={`flex-1 flex flex-col transition-colors duration-300 pb-32 ${
      theme === 'dark' ? 'bg-[#0A0A0A] text-white' : 'bg-[#F8F7F4] text-[#1E1A1D]'
    }`}>
      {/* Top Header */}
      <header
        className={`sticky top-0 z-30 px-5 py-3.5 flex items-center justify-between backdrop-blur-md transition-colors ${
          theme === 'dark' ? 'bg-[#0A0A0A]/90 border-b border-[#1E1E1E]' : 'bg-[#F8F7F4]/90 border-b border-[#E8E8E8]'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1 -ml-1 rounded-full hover:bg-white/10"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Grades & Results</h1>
        </div>
        {currentSem && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-500 font-semibold">
            {currentSem.semester}
          </span>
        )}
      </header>

      {/* Demo Mode Disclaimer */}
      {isDemoMode && (
        <div className="mx-5 mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-center gap-2">
          <Info size={15} className="shrink-0" />
          <span>Showing sample grade data for preview (Demo Mode).</span>
        </div>
      )}

      {/* Main Content */}
      <main className="px-5 pt-4 space-y-4">
        {isLoadingData ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-[#FF7A00] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-medium opacity-70">Fetching academic results from Chitkara ERP...</p>
          </div>
        ) : !reportCard || semesters.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-gray-700/40 my-4">
            <GraduationCap size={36} className="mx-auto text-gray-400 mb-2.5" />
            <h3 className="text-sm font-bold mb-1">No Grade Sheet Available</h3>
            <p className={`text-xs max-w-xs mx-auto leading-relaxed ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Chitkara University releases official semester grade sheets after board moderation.
              Check back once results for your current term are announced.
            </p>
          </div>
        ) : (
          <>
            {/* CGPA Hero Card */}
            <div className={`p-5 rounded-2xl border relative overflow-hidden ${
              theme === 'dark' ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
            }`}>
              {/* Subtle gradient accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FC5D32] via-[#FF7A00] to-[#FD943A] rounded-t-2xl" />

              <div className="flex items-start gap-4 pt-1">
                {/* CGPA circle */}
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none"
                      stroke={theme === 'dark' ? '#222428' : '#E8E8E8'}
                      strokeWidth="6" />
                    <circle cx="40" cy="40" r="34" fill="none"
                      stroke="url(#cgpaGrad)" strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${(cgpa / 10) * 213.6} 213.6`}
                      className="transition-all duration-1000 ease-out" />
                    <defs>
                      <linearGradient id="cgpaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#FC5D32" />
                        <stop offset="100%" stopColor="#FD943A" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-extrabold text-[#FF7A00] leading-none">
                      {cgpa.toFixed(2)}
                    </span>
                    <span className="text-[9px] font-semibold opacity-50 uppercase tracking-wide">CGPA</span>
                  </div>
                </div>

                {/* Student info & stats */}
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-sm font-bold truncate">{studentProfile.studentName}</p>
                  <p className={`text-[11px] mt-0.5 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {studentProfile.rollNo} • {studentProfile.className}
                  </p>

                  <div className="flex gap-4 mt-3">
                    <div>
                      <p className="text-xs font-bold text-[#FF7A00]">
                        {currentSem?.sgpa.toFixed(2) || '—'}
                      </p>
                      <p className="text-[10px] opacity-50">Latest SGPA</p>
                    </div>
                    <div className={`border-l pl-4 ${theme === 'dark' ? 'border-[#222428]' : 'border-gray-200'}`}>
                      <p className="text-xs font-bold">
                        {totalCredits}
                      </p>
                      <p className="text-[10px] opacity-50">Total Credits</p>
                    </div>
                    <div className={`border-l pl-4 ${theme === 'dark' ? 'border-[#222428]' : 'border-gray-200'}`}>
                      <p className="text-xs font-bold">
                        {semesters.length}
                      </p>
                      <p className="text-[10px] opacity-50">Semesters</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Academic distinction */}
              {cgpa >= 9 && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <Award size={14} className="text-emerald-500 shrink-0" />
                  <span className="text-[11px] font-semibold text-emerald-500">
                    Dean's List — Outstanding Academic Performance
                  </span>
                </div>
              )}
              {cgpa >= 8 && cgpa < 9 && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Star size={14} className="text-blue-500 shrink-0" />
                  <span className="text-[11px] font-semibold text-blue-500">
                    First Division — Strong Academic Standing
                  </span>
                </div>
              )}
            </div>

            {/* SGPA Trend Chart (only if >1 semester) */}
            {semesters.length > 1 && (
              <SGPATrendChart semesters={semesters} theme={theme} />
            )}

            {/* Semester Sections */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider opacity-70 mb-3 flex items-center gap-2">
                <GraduationCap size={14} />
                Semester Breakdown ({semesters.length})
              </h2>
              <div className="space-y-3">
                {[...semesters]
                  .sort((a, b) => b.semesterNumber - a.semesterNumber)
                  .map((sem) => (
                    <SemesterSection
                      key={sem.semesterNumber}
                      semester={sem}
                      theme={theme}
                      defaultExpanded={sem.isCurrent}
                    />
                  ))
                }
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
