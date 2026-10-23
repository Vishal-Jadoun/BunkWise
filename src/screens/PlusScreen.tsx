import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft, Sparkles, Check, Sliders, Bell,
  AlertTriangle, CheckCircle2
} from 'lucide-react';

export const PlusScreen: React.FC = () => {
  const { attendanceData, reportCard, navigate, theme } = useApp();
  const [targetPercentage, setTargetPercentage] = useState<number>(75);

  // Reminder preferences state
  const [reminders, setReminders] = useState<{
    morningSchedule: boolean;
    attendanceWarning: boolean;
    circularAlerts: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem('attendly_reminder_prefs');
      return saved ? JSON.parse(saved) : {
        morningSchedule: true,
        attendanceWarning: true,
        circularAlerts: false,
      };
    } catch {
      return {
        morningSchedule: true,
        attendanceWarning: true,
        circularAlerts: false,
      };
    }
  });

  const toggleReminder = (key: 'morningSchedule' | 'attendanceWarning' | 'circularAlerts') => {
    setReminders(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('attendly_reminder_prefs', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const isDark = theme === 'dark';
  const subjects = attendanceData?.subjects || [];

  // Dynamic margin calculations for target percentage
  const subjectMargins = subjects.map(s => {
    const isBelow = s.percentage < targetPercentage;
    let classesCount = 0;
    if (isBelow) {
      if (targetPercentage >= 100) {
        classesCount = 0;
      } else {
        classesCount = Math.max(0, Math.ceil((targetPercentage * s.delivered - 100 * s.attended) / (100 - targetPercentage)));
      }
    } else {
      if (targetPercentage <= 0) {
        classesCount = 0;
      } else {
        classesCount = Math.max(0, Math.floor((s.attended / (targetPercentage / 100)) - s.delivered));
      }
    }
    return {
      name: s.subject_name,
      code: s.course_code,
      percentage: s.percentage,
      isBelow,
      classesCount,
    };
  });

  const subjectsBelowTarget = subjectMargins.filter(s => s.isBelow);
  const subjectsAboveTarget = subjectMargins.filter(s => !s.isBelow);

  const perks = [
    { title: 'Interactive Target Simulator', desc: 'Predict consecutive classes needed or safe bunks across any threshold.' },
    { title: 'Academic Performance Insights', desc: 'Semester-by-semester SGPA trends and credit completion metrics.' },
    { title: 'Built-in Document Reader', desc: 'View official campus notice PDFs without automatic external downloads.' },
    { title: 'Study Session Reminders', desc: 'Configurable local lecture and attendance boundary alerts.' },
  ];

  return (
    <div className={`flex-1 flex flex-col transition-colors duration-300 pb-20 ${
      isDark ? 'bg-[#0A0A0A] text-white' : 'bg-[#F8F7F4] text-[#1E1A1D]'
    }`}>
      {/* Top Header */}
      <header
        className={`sticky top-0 z-30 px-5 py-3.5 flex items-center justify-between backdrop-blur-md transition-colors ${
          isDark ? 'bg-[#0A0A0A]/90 border-b border-[#1E1E1E]' : 'bg-[#F8F7F4]/90 border-b border-[#E8E8E8]'
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
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold tracking-tight">Academic Tools</h1>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-[#FF7A00] text-white">PLUS</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-5 pt-4 space-y-4">
        {/* Hero Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#FC5D32] to-[#FD943A] text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-2.5">
              <Sparkles size={20} className="text-yellow-200" />
            </div>
            <h2 className="text-lg font-extrabold mb-1">Student Academic Overview</h2>
            <p className="text-xs text-white/90 leading-relaxed">
              Personal intelligence tools to plan lecture attendance, track semester milestones, and manage deadlines.
            </p>
          </div>
        </div>

        {/* Academic Overview Quick Metric Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className={`p-3 rounded-2xl border text-center ${
            isDark ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
          }`}>
            <span className="text-[10px] uppercase font-bold opacity-60 block">Overall</span>
            <span className={`text-base font-extrabold mt-0.5 block ${
              (attendanceData?.overall_percentage ?? 0) >= 75 ? 'text-emerald-500' : 'text-rose-500'
            }`}>
              {attendanceData?.overall_percentage ?? 0}%
            </span>
            <span className="text-[9px] opacity-50">Attendance</span>
          </div>

          <div className={`p-3 rounded-2xl border text-center ${
            isDark ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
          }`}>
            <span className="text-[10px] uppercase font-bold opacity-60 block">CGPA</span>
            <span className="text-base font-extrabold text-[#FF7A00] mt-0.5 block">
              {reportCard?.cgpa ? reportCard.cgpa.toFixed(2) : '—'}
            </span>
            <span className="text-[9px] opacity-50">Cumulative</span>
          </div>

          <div className={`p-3 rounded-2xl border text-center ${
            isDark ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
          }`}>
            <span className="text-[10px] uppercase font-bold opacity-60 block">Enrolled</span>
            <span className="text-base font-extrabold mt-0.5 block">
              {subjects.length}
            </span>
            <span className="text-[9px] opacity-50">Courses</span>
          </div>
        </div>

        {/* Dynamic Attendance Target Simulator */}
        <div
          className={`p-4 rounded-2xl border space-y-3.5 ${
            isDark ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-[#FF7A00]" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Attendance Target Simulator</h3>
            </div>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-[#FF7A00]/15 text-[#FF7A00]">
              Goal: {targetPercentage}%
            </span>
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-semibold opacity-60 mb-1">
              <span>65% (Min. Allowed)</span>
              <span>75% (Standard)</span>
              <span>90% (Distinction)</span>
            </div>
            <input
              type="range"
              min="65"
              max="95"
              step="1"
              value={targetPercentage}
              onChange={e => setTargetPercentage(Number(e.target.value))}
              className="w-full accent-[#FF7A00] cursor-pointer"
            />
          </div>

          {/* Dynamic Analysis Feed */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-60">
              Analysis for {targetPercentage}% threshold:
            </p>

            {subjectsBelowTarget.length > 0 ? (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1.5">
                <div className="flex items-center gap-1.5 text-rose-500 font-bold text-xs">
                  <AlertTriangle size={14} />
                  <span>{subjectsBelowTarget.length} course{subjectsBelowTarget.length > 1 ? 's' : ''} currently below {targetPercentage}%:</span>
                </div>
                {subjectsBelowTarget.map(s => (
                  <p key={s.code} className="text-xs text-rose-300 pl-5">
                    • <strong>{s.name} ({s.percentage.toFixed(1)}%)</strong>: Need <strong>{s.classesCount}</strong> more consecutive classes.
                  </p>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-emerald-500 text-xs font-semibold">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>All {subjects.length} courses satisfy the {targetPercentage}% attendance goal!</span>
              </div>
            )}

            {subjectsAboveTarget.length > 0 && (
              <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                isDark ? 'bg-white/5 border-white/5 text-gray-300' : 'bg-gray-50 border-gray-100 text-gray-600'
              }`}>
                <p className="font-semibold text-[11px] text-[#FF7A00]">Safe Bunk Margins:</p>
                {subjectsAboveTarget.slice(0, 3).map(s => (
                  <p key={s.code} className="text-[11px]">
                    • <strong>{s.name} ({s.percentage.toFixed(1)}%)</strong>: Can safely miss <strong>{s.classesCount}</strong> class{s.classesCount !== 1 ? 'es' : ''}.
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Personal Reminders & Alert Settings */}
        <div
          className={`p-4 rounded-2xl border space-y-3 ${
            isDark ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-[#FF7A00]" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Class Reminders & Alerts</h3>
          </div>

          <div className="space-y-2.5 pt-1">
            <div
              onClick={() => toggleReminder('morningSchedule')}
              className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                isDark ? 'border-[#222428] hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div>
                <p className="text-xs font-semibold">Morning Schedule Alert</p>
                <p className="text-[10px] opacity-60">Notify daily timetable at 08:30 AM</p>
              </div>
              <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                reminders.morningSchedule ? 'bg-[#FF7A00]' : isDark ? 'bg-gray-700' : 'bg-gray-300'
              }`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  reminders.morningSchedule ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </div>
            </div>

            <div
              onClick={() => toggleReminder('attendanceWarning')}
              className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                isDark ? 'border-[#222428] hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div>
                <p className="text-xs font-semibold">Attendance Shortage Alert</p>
                <p className="text-[10px] opacity-60">Instant warning when any course drops below 75%</p>
              </div>
              <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                reminders.attendanceWarning ? 'bg-[#FF7A00]' : isDark ? 'bg-gray-700' : 'bg-gray-300'
              }`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  reminders.attendanceWarning ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </div>
            </div>

            <div
              onClick={() => toggleReminder('circularAlerts')}
              className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                isDark ? 'border-[#222428] hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div>
                <p className="text-xs font-semibold">New Circular Notifications</p>
                <p className="text-[10px] opacity-60">Notify when official exam/event circulars are published</p>
              </div>
              <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                reminders.circularAlerts ? 'bg-[#FF7A00]' : isDark ? 'bg-gray-700' : 'bg-gray-300'
              }`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  reminders.circularAlerts ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </div>
            </div>
          </div>
        </div>

        {/* Feature Overview */}
        <div className="space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wider opacity-60 px-1">
            Built-in Capabilities
          </p>
          {perks.map((p, i) => (
            <div
              key={i}
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                isDark ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-[#FF7A00]/15 text-[#FF7A00] flex items-center justify-center shrink-0 mt-0.5">
                <Check size={14} />
              </div>
              <div>
                <p className="text-xs font-bold">{p.title}</p>
                <p className="text-[11px] opacity-60 mt-0.5 leading-relaxed">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
