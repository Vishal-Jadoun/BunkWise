import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Clock, MapPin, User, CalendarX, Info } from 'lucide-react';

export const TimetableScreen: React.FC = () => {
  const { timetableData, studentProfile, isDemoMode, isLoadingData, navigate, theme } = useApp();

  // Set today's day of week as initial selected day if weekday, else Monday
  const todayIndex = new Date().getDay();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = dayNames[todayIndex];
  const initialDay = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].includes(todayName)
    ? todayName
    : 'Monday';

  const [selectedDay, setSelectedDay] = useState<string>(initialDay);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const daySlots = timetableData.filter(s => s.day?.toLowerCase() === selectedDay.toLowerCase());

  // Extract semester or branch label
  const semLabel = studentProfile.className || 'Chitkara ERP';

  return (
    <div className={`flex-1 flex flex-col transition-colors duration-300 subpage-pb ${
      theme === 'dark' ? 'bg-[#0A0A0A] text-white' : 'bg-[#F8F7F4] text-[#1E1A1D]'
    }`}>
      {/* Top Header */}
      <header
        className={`sticky top-0 z-30 px-4 sm:px-5 py-3.5 flex items-center justify-between backdrop-blur-md transition-colors pt-safe-header ${
          theme === 'dark' ? 'bg-[#0A0A0A]/90 border-b border-[#1E1E1E]' : 'bg-[#F8F7F4]/90 border-b border-[#E8E8E8]'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1 -ml-1 rounded-full hover:bg-white/10"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Class Timetable</h1>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-[#FF7A00]/15 text-[#FF7A00] font-semibold max-w-[120px] truncate">
          {semLabel}
        </span>
      </header>

      {/* Demo Mode Notice */}
      {isDemoMode && (
        <div className="mx-4 sm:mx-5 mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-center gap-2">
          <Info size={15} className="shrink-0" />
          <span>Showing sample weekly schedule (Demo Mode).</span>
        </div>
      )}

      {/* Day Selector Tabs */}
      <div className="px-4 sm:px-5 pt-3 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
        {days.map(d => (
          <button
            key={d}
            onClick={() => setSelectedDay(d)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedDay === d
                ? 'bg-[#FF7A00] text-white shadow-sm'
                : theme === 'dark'
                ? 'bg-[#141517] border border-[#222428] text-gray-300 hover:border-gray-600'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Schedule Slots */}
      <main className="px-4 sm:px-5 pt-3 space-y-3">
        {isLoadingData ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-[#FF7A00] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-medium opacity-70">Loading timetable from Chitkara ERP...</p>
          </div>
        ) : daySlots.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-gray-700/40 my-4">
            <CalendarX size={34} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm font-semibold">No classes scheduled for {selectedDay}</p>
            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              There are no lecture or lab periods allocated on this day.
            </p>
          </div>
        ) : (
          daySlots.map((slot, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border transition-all shadow-sm ${
                theme === 'dark' ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF7A00]/15 text-[#FF7A00]">
                  Period {slot.period || idx + 1}
                </span>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={13} />
                  <span>{slot.startTime} - {slot.endTime}</span>
                </div>
              </div>

              <h3 className="text-sm font-bold mb-2">{slot.subjectName || slot.subjectCode}</h3>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5 text-gray-400">
                <div className="flex items-center gap-1 min-w-0 pr-2">
                  <User size={13} className="text-[#FF7A00] shrink-0" />
                  <span className="truncate">{slot.teacherName || 'Faculty'}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <MapPin size={13} className="text-[#FF7A00]" />
                  <span className="font-semibold text-white dark:text-gray-200">{slot.roomNumber || 'LH'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
};
