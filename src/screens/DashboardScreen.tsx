import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  SearchIcon,
  FeedbackIcon,
  ArrowForwardIcon,
  WifiIcon,
  HubIcon,
  EngineeringIcon,
  SparklesIcon,
} from '../components/icons';
import { Calendar, FileText, Award, X, Search, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';

export const DashboardScreen: React.FC = () => {
  const {
    studentProfile,
    attendanceData,
    timetableData,
    circulars,
    navigate,
    theme,
    toggleTheme,
    whatsNewDismissed,
    dismissWhatsNew,
    isDemoMode,
    isLoadingData,
    dataError,
    refreshData,
  } = useApp();

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [avatarError, setAvatarError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Today's date string
  // Today's date string
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayName = dayNames[today.getDay()];

  // Get current day's timetable (or Monday if weekend / no slots today)
  const todaySlots = timetableData.filter(s => s.day?.toLowerCase() === todayDayName.toLowerCase());
  const activeDayName = todaySlots.length > 0 ? todayDayName : 'Monday';
  const currentDaySlots = (todaySlots.length > 0 ? todaySlots : timetableData.filter(s => s.day?.toLowerCase() === 'monday')).slice(0, 3);

  const getSubjectIcon = (name: string, isCurrent: boolean) => {
    const iconColor = isCurrent ? '#FF7A00' : theme === 'dark' ? '#FF9D4D' : '#6B6B6B';
    const n = name.toLowerCase();
    if (n.includes('network') || n.includes('computer')) {
      return <WifiIcon color={iconColor} size={20} />;
    }
    if (n.includes('data') || n.includes('structure')) {
      return <HubIcon color={iconColor} size={20} />;
    }
    return <EngineeringIcon color={iconColor} size={20} />;
  };

  const filteredSlots = timetableData.filter(
    s =>
      s.subjectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.day.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  return (
    <div className={`flex-1 flex flex-col transition-colors duration-300 pb-20 ${
      theme === 'dark' ? 'bg-[#0A0A0A] text-white' : 'bg-[#F8F7F4] text-[#1E1A1D]'
    }`}>
      {/* Sticky Top Header */}
      <header
        className={`sticky top-0 z-30 px-5 py-3.5 flex items-center justify-between backdrop-blur-md transition-colors ${
          theme === 'dark' ? 'bg-[#0A0A0A]/90 border-b border-[#1E1E1E]' : 'bg-[#F8F7F4]/90 border-b border-[#E8E8E8]'
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Avatar button navigating to profile */}
          <button
            onClick={() => navigate('/profile')}
            className="w-11 h-11 rounded-full border-2 border-[#FF7A00] overflow-hidden focus:outline-none hover:opacity-90 transition-opacity shadow-sm shrink-0 bg-[#FF7A00]/15 flex items-center justify-center"
          >
            {studentProfile.profilePhoto && !avatarError ? (
              <img
                src={studentProfile.profilePhoto}
                alt={studentProfile.studentName}
                className="w-full h-full object-cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <span className="text-base font-bold text-[#FF7A00]">
                {studentProfile.studentName?.charAt(0) || 'S'}
              </span>
            )}
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`block text-xs truncate ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#7A7570]'}`}>
                Welcome back,
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                isDemoMode
                  ? 'bg-amber-500/15 text-amber-500'
                  : 'bg-emerald-500/15 text-emerald-500'
              }`}>
                {isDemoMode ? 'Demo Mode' : 'Chitkara Live'}
              </span>
            </div>
            <span className="block text-base font-bold leading-tight truncate">
              {studentProfile.firstName || 'Student'}
            </span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          {!isDemoMode && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoadingData}
              className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${
                theme === 'dark'
                  ? 'bg-[#151718] border-[#2A2A2A] text-gray-300 hover:text-white'
                  : 'bg-white border-[#E8E8E8] text-gray-600 hover:text-black'
              }`}
              title="Refresh University Data"
            >
              <RefreshCw size={15} className={isRefreshing || isLoadingData ? 'animate-spin' : ''} />
            </button>
          )}

          <button
            onClick={() => setShowSearchModal(true)}
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${
              theme === 'dark'
                ? 'bg-[#151718] border-[#2A2A2A] text-[#FF9D4D] hover:bg-[#202425]'
                : 'bg-white border-[#E8E8E8] text-[#FF7A00] hover:bg-gray-50'
            }`}
            title="Search Timetable"
          >
            <SearchIcon size={17} color="currentColor" />
          </button>

          <button
            onClick={() => setShowFeedbackModal(true)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              theme === 'dark'
                ? 'bg-[#FF7A00]/15 text-[#FF9D4D] hover:bg-[#FF7A00]/25'
                : 'bg-[#FFF7ED] text-[#FF7A00] hover:bg-[#FFEDD5]'
            }`}
            title="Feedback & Settings"
          >
            <FeedbackIcon size={17} color="currentColor" />
          </button>
        </div>
      </header>

      {/* Sync Warning or Loading Banner */}
      {dataError && (
        <div className="mx-5 mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-center gap-2">
          <AlertTriangle size={15} className="shrink-0" />
          <span>{dataError}</span>
        </div>
      )}

      {isLoadingData && (
        <div className="mx-5 mt-3 p-2.5 rounded-xl bg-[#FF7A00]/10 border border-[#FF7A00]/30 text-[#FF7A00] text-xs flex items-center gap-2">
          <div className="w-3.5 h-3.5 border-2 border-[#FF7A00] border-t-transparent rounded-full animate-spin shrink-0" />
          <span>Synchronizing student records with Chitkara University ERP...</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="px-5 pt-3 space-y-4">
        {/* Today's Schedule Card */}
        <div
          onClick={() => navigate('/timetable')}
          className={`p-4 rounded-2xl border cursor-pointer hover:border-[#FF7A00]/60 transition-all shadow-sm ${
            theme === 'dark' ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
          }`}
        >
          {/* Card Title Bar */}
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#FF7A00]">Today's Schedule</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#FF7A00]/10 text-[#FF7A00] font-medium">
                {activeDayName}
              </span>
            </div>
            <div className={`flex items-center gap-1.5 text-xs ${
              theme === 'dark' ? 'text-[#8A8A8A]' : 'text-[#7A7570]'
            }`}>
              <span>{dateStr}</span>
              <ArrowForwardIcon size={13} color="currentColor" />
            </div>
          </div>

          {/* Timeline preview (Period slots) */}
          {currentDaySlots.length === 0 ? (
            <div className="py-4 text-center text-xs opacity-60">
              No classes scheduled for today
            </div>
          ) : (
            <div className="space-y-3">
              {currentDaySlots.map((slot, idx) => {
                const isCurrent = idx === 0;
                const isLast = idx === currentDaySlots.length - 1;

                return (
                  <div key={idx} className="flex items-center gap-3 relative">
                    {/* Indicator Column */}
                    <div className="flex flex-col items-center justify-center">
                      <div
                        className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                          isCurrent
                            ? 'bg-[#FF7A00] border-[#FF7A00] shadow-[0_0_8px_rgba(255,122,0,0.6)]'
                            : theme === 'dark'
                            ? 'bg-[#141517] border-[#3A3A3A]'
                            : 'bg-white border-[#B0B0B0]'
                        }`}
                      />
                      {!isLast && (
                        <div className={`w-0.5 h-7 ${theme === 'dark' ? 'bg-[#2A2A2A]' : 'bg-[#E5E7EB]'}`} />
                      )}
                    </div>

                    {/* Slot Details */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${
                        isCurrent ? 'text-[#FF7A00]' : theme === 'dark' ? 'text-white' : 'text-[#1E1A1D]'
                      }`}>
                        {slot.subjectName}
                      </p>
                      <p className={`text-[11px] truncate ${theme === 'dark' ? 'text-[#8A8A8A]' : 'text-[#7A7570]'}`}>
                        {slot.startTime} - {slot.endTime} • {slot.teacherName}
                      </p>
                    </div>

                    {/* Icon on right */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isCurrent
                        ? 'bg-[#FF7A00]/15'
                        : theme === 'dark'
                        ? 'bg-[#1E2023]'
                        : 'bg-gray-100'
                    }`}>
                      {getSubjectIcon(slot.subjectName || '', isCurrent)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 1:1 Metric Cards Grid */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Attendance Card */}
          <div
            onClick={() => navigate('/attendance')}
            className={`aspect-square p-4 rounded-2xl border cursor-pointer hover:border-[#FF7A00]/60 transition-all flex flex-col justify-between shadow-sm ${
              theme === 'dark' ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${theme === 'dark' ? 'text-[#8A8A8A]' : 'text-[#7A7570]'}`}>
                Attendance
              </span>
              <span className={`w-2 h-2 rounded-full ${
                attendanceData.overall_percentage >= 75 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-pulse'
              }`} />
            </div>

            {/* Circular Ring & Percentage */}
            <div className="flex items-center justify-center my-auto relative">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  className={theme === 'dark' ? 'text-[#2A2A2A]' : 'text-gray-100'}
                  strokeWidth="7"
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  className={attendanceData.overall_percentage >= 75 ? 'text-[#FF7A00]' : 'text-rose-500'}
                  strokeWidth="7"
                  strokeDasharray={201}
                  strokeDashoffset={201 - (201 * ((attendanceData.raw_percentage ?? attendanceData.overall_percentage) || 0)) / 100}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-extrabold tracking-tight">
                  {attendanceData.overall_percentage}%
                </span>
              </div>
            </div>

            <div className="text-center">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                attendanceData.overall_percentage >= 75
                  ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-500 border-rose-500/30'
              }`}>
                {attendanceData.overall_percentage >= 75 ? 'Good Standing' : 'Low Attendance'}
              </span>
            </div>
          </div>

          {/* Circulars / Notice Card */}
          <div
            onClick={() => navigate('/circulars')}
            className={`aspect-square p-4 rounded-2xl border cursor-pointer hover:border-[#FF7A00]/60 transition-all flex flex-col justify-between shadow-sm ${
              theme === 'dark' ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${theme === 'dark' ? 'text-[#8A8A8A]' : 'text-[#7A7570]'}`}>
                Circulars
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#FF7A00] text-white">
                {circulars.length}
              </span>
            </div>

            <div className="my-auto text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#FF7A00]/15 mx-auto mb-2 flex items-center justify-center text-[#FF7A00]">
                <SparklesIcon size={24} color="currentColor" />
              </div>
              <p className="text-lg font-bold leading-tight">
                {circulars.length} Updates
              </p>
              <p className={`text-[10px] mt-0.5 truncate ${theme === 'dark' ? 'text-[#8A8A8A]' : 'text-[#7A7570]'}`}>
                {typeof circulars[0]?.title === 'string'
                  ? circulars[0].title
                  : (circulars[0]?.title as any)?.S || 'Check student notice board'}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-[#FF7A00] font-semibold">
              <span>View All</span>
              <ArrowForwardIcon size={12} color="currentColor" />
            </div>
          </div>
        </div>

        {/* "For You" Section / Quick Action Cards */}
        <div>
          <div className="flex items-center justify-between mb-2.5 px-0.5">
            <h2 className="text-xs font-bold tracking-wider uppercase opacity-70">
              For You
            </h2>
            <button
              onClick={() => navigate('/plus')}
              className="text-xs font-semibold text-[#FF7A00] flex items-center gap-1 hover:underline"
            >
              <span>BunkWise+</span>
              <SparklesIcon size={12} color="currentColor" />
            </button>
          </div>

          <div className="space-y-2.5">
            {/* Weekly Timetable */}
            <div
              onClick={() => navigate('/timetable')}
              className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer hover:border-[#FF7A00]/50 transition-all ${
                theme === 'dark' ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold">Weekly Schedule</p>
                  <p className={`text-[11px] ${theme === 'dark' ? 'text-[#8A8A8A]' : 'text-[#7A7570]'}`}>
                    View full semester timetable & rooms
                  </p>
                </div>
              </div>
              <ArrowForwardIcon size={14} color="currentColor" className="opacity-40" />
            </div>

            {/* Leave Request */}
            <div
              onClick={() => navigate('/leave')}
              className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer hover:border-[#FF7A00]/50 transition-all ${
                theme === 'dark' ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold">Leave Application</p>
                  <p className={`text-[11px] ${theme === 'dark' ? 'text-[#8A8A8A]' : 'text-[#7A7570]'}`}>
                    Apply for medical, duty & casual leaves
                  </p>
                </div>
              </div>
              <ArrowForwardIcon size={14} color="currentColor" className="opacity-40" />
            </div>

            {/* Grades / Report Card */}
            <div
              onClick={() => navigate('/reportcard')}
              className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer hover:border-[#FF7A00]/50 transition-all ${
                theme === 'dark' ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center">
                  <Award size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold">Grades & Performance</p>
                  <p className={`text-[11px] ${theme === 'dark' ? 'text-[#8A8A8A]' : 'text-[#7A7570]'}`}>
                    Semester results & grade transcripts
                  </p>
                </div>
              </div>
              <ArrowForwardIcon size={14} color="currentColor" className="opacity-40" />
            </div>
          </div>
        </div>
      </main>

      {/* "What's New in v1.2.0" Campaign Modal */}
      {!whatsNewDismissed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-xs p-6 rounded-2xl shadow-2xl transition-colors ${
            theme === 'dark' ? 'bg-[#1E1E1E] border border-[#2A2A2A]' : 'bg-white border border-gray-100'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-[#FF7A00]/15 text-[#FF7A00] flex items-center justify-center mb-3">
              <SparklesIcon size={24} color="currentColor" />
            </div>
            <h3 className="text-lg font-bold mb-1">What's New in v1.2.0</h3>
            <p className={`text-xs mb-4 ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#7A7570]'}`}>
              BunkWise update is now live on your device!
            </p>

            <ul className="space-y-2.5 mb-6 text-xs">
              <li className="flex items-start gap-2">
                <span className="text-[#FF7A00]">✦</span>
                <span><strong>Live ERP Integration:</strong> Connect directly to Chitkara University SchoolPad portal.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#FF7A00]">✦</span>
                <span><strong>Predictive Attendance:</strong> Real-time safe bunks calculator.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#FF7A00]">✦</span>
                <span><strong>Instant Demo Mode:</strong> Explore sample records without ERP login.</span>
              </li>
            </ul>

            <button
              onClick={dismissWhatsNew}
              className="w-full py-3 rounded-xl bg-[#FF7A00] hover:bg-[#E66E00] text-white text-xs font-semibold shadow-md transition-all"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}

      {/* Timetable Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-xs p-4 rounded-2xl shadow-2xl transition-colors ${
            theme === 'dark' ? 'bg-[#1E1E1E] border border-[#2A2A2A]' : 'bg-white border border-gray-100'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">Search Classes & Teachers</h3>
              <button
                onClick={() => setShowSearchModal(false)}
                className="p-1 rounded-full hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>
            <div className="relative mb-3">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search subject or teacher..."
                className={`w-full px-3 py-2 pl-9 rounded-xl border text-xs outline-none ${
                  theme === 'dark' ? 'bg-[#121212] border-[#2A2A2A] text-white' : 'bg-gray-50 border-gray-200 text-black'
                }`}
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="max-h-52 overflow-y-auto space-y-2 pr-1 text-xs">
              {filteredSlots.length === 0 ? (
                <p className="text-center py-4 text-gray-400 text-xs">No matching classes found</p>
              ) : (
                filteredSlots.map((s, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setShowSearchModal(false);
                      navigate('/timetable');
                    }}
                    className={`p-2 rounded-lg border cursor-pointer hover:border-[#FF7A00] ${
                      theme === 'dark' ? 'bg-[#121212] border-[#2A2A2A]' : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <p className="font-semibold text-[11px] text-[#FF7A00]">{s.subjectName}</p>
                    <p className="text-[10px] text-gray-400">{s.day} • {s.startTime} - {s.endTime} • {s.teacherName}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-xs p-5 rounded-2xl shadow-2xl transition-colors ${
            theme === 'dark' ? 'bg-[#1E1E1E] border border-[#2A2A2A]' : 'bg-white border border-gray-100'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">Feedback & Settings</h3>
              <button
                onClick={() => {
                  setShowFeedbackModal(false);
                  setFeedbackSent(false);
                }}
                className="p-1 rounded-full hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            {feedbackSent ? (
              <div className="text-center py-6">
                <CheckCircle size={36} className="text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-bold">Thank you for your feedback!</p>
                <p className="text-[11px] text-gray-400 mt-1">We appreciate your support in improving BunkWise.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-white/5">
                  <span className="text-xs font-medium">Appearance</span>
                  <button
                    onClick={toggleTheme}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#FF7A00]/15 text-[#FF7A00]"
                  >
                    {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder="Share a suggestion or report an issue..."
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none resize-none ${
                    theme === 'dark' ? 'bg-[#121212] border-[#2A2A2A] text-white' : 'bg-gray-50 border-gray-200 text-black'
                  }`}
                />
                <button
                  onClick={() => {
                    if (feedbackText.trim()) {
                      setFeedbackSent(true);
                      setFeedbackText('');
                    }
                  }}
                  disabled={!feedbackText.trim()}
                  className="w-full py-2.5 rounded-xl bg-[#FF7A00] text-white text-xs font-semibold hover:bg-[#E66E00] disabled:opacity-50"
                >
                  Submit Feedback
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
