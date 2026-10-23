import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Sun, Moon, Sparkles, LogOut, Mail, Phone, Calendar, MapPin, User, ShieldCheck, Info } from 'lucide-react';

export const ProfileScreen: React.FC = () => {
  const { studentProfile, schoolCode, isDemoMode, logout, navigate, theme, toggleTheme } = useApp();
  const [avatarError, setAvatarError] = useState(false);

  return (
    <div className={`flex-1 flex flex-col transition-colors duration-300 tab-page-pb ${
      theme === 'dark' ? 'bg-[#0A0A0A] text-white' : 'bg-[#F8F7F4] text-[#1E1A1D]'
    }`}>
      {/* Top Header */}
      <header
        className={`sticky top-0 z-30 px-4 sm:px-5 py-2.5 sm:py-3.5 flex items-center justify-between backdrop-blur-md transition-colors border-b pt-safe-header ${
          theme === 'dark' ? 'bg-[#0A0A0A]/90 border-[#1E1E1E]' : 'bg-[#F8F7F4]/90 border-[#E8E8E8]'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => navigate('/')}
            className="w-11 h-11 -ml-2 rounded-xl hover:bg-white/10 flex items-center justify-center shrink-0 transition-colors focus:outline-none"
            aria-label="Go to Dashboard"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">Profile</h1>
        </div>

        <button
          onClick={toggleTheme}
          className={`w-11 h-11 rounded-xl sm:rounded-full border transition-colors flex items-center justify-center shrink-0 focus:outline-none ${
            theme === 'dark' ? 'bg-[#151718] border-[#2A2A2A] text-yellow-400' : 'bg-white border-[#E8E8E8] text-gray-700'
          }`}
          title="Toggle Theme"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      {/* Demo Notice */}
      {isDemoMode && (
        <div className="mx-4 sm:mx-5 mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-center gap-2">
          <Info size={15} className="shrink-0" />
          <span className="min-w-0 break-words">Showing sample student profile (Demo Mode).</span>
        </div>
      )}

      {/* Main Content */}
      <main className="px-4 sm:px-5 pt-3 sm:pt-4 space-y-4">
        {/* User Card */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border flex items-center gap-3.5 sm:gap-4 shadow-sm min-w-0 ${
            theme === 'dark' ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
          }`}
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-[#FF7A00] overflow-hidden shrink-0 shadow-md bg-[#FF7A00]/15 flex items-center justify-center">
            {studentProfile.profilePhoto && !avatarError ? (
              <img
                src={studentProfile.profilePhoto}
                alt={studentProfile.studentName}
                className="w-full h-full object-cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <span className="text-lg sm:text-xl font-bold text-[#FF7A00]">
                {studentProfile.studentName?.charAt(0) || 'S'}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-bold truncate">{studentProfile.studentName}</h2>
            <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {studentProfile.className}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="font-mono text-[10px] sm:text-[11px] px-2 py-0.5 rounded bg-[#FF7A00]/15 text-[#FF7A00] font-semibold">
                {studentProfile.rollNo}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                isDemoMode ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-500'
              }`}>
                {isDemoMode ? 'Demo' : 'Live ERP'}
              </span>
            </div>
          </div>
        </div>

        {/* Upgrade to BunkWise+ Banner */}
        <div
          onClick={() => navigate('/plus')}
          className="p-4 rounded-2xl bg-gradient-to-r from-[#FC5D32] to-[#FD943A] text-white cursor-pointer shadow-[0_8px_20px_rgba(252,93,50,0.3)] hover:shadow-[0_12px_28px_rgba(252,93,50,0.4)] transition-all"
        >
          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles size={18} className="text-yellow-200 shrink-0" />
              <h3 className="font-bold text-sm tracking-wide truncate">Upgrade to BunkWise+</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white uppercase tracking-wider shrink-0">
              PRO
            </span>
          </div>
          <p className="text-xs text-white/90 leading-relaxed break-words">
            Unlock predictive attendance targets, ad-free experience, timetable widgets, and premium themes.
          </p>
        </div>

        {/* Student Details Section */}
        <div
          className={`p-4 rounded-2xl border space-y-3 shadow-sm ${
            theme === 'dark' ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
          }`}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider opacity-70 mb-2 truncate">
            Academic & Contact Details
          </h3>

          <div className="flex items-center gap-3 text-xs min-w-0">
            <Mail size={16} className="text-[#FF7A00] shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="block text-[10px] opacity-60 truncate">Student Email</span>
              <span className="font-medium truncate block">{studentProfile.email}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs min-w-0">
            <Phone size={16} className="text-[#FF7A00] shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="block text-[10px] opacity-60 truncate">Mobile Number</span>
              <span className="font-medium truncate block">{studentProfile.mobile}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs min-w-0">
            <Calendar size={16} className="text-[#FF7A00] shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="block text-[10px] opacity-60 truncate">Date of Birth</span>
              <span className="font-medium truncate block">{studentProfile.dateOfBirth}</span>
            </div>
          </div>

          <div className="flex items-start gap-3 text-xs min-w-0">
            <MapPin size={16} className="text-[#FF7A00] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="block text-[10px] opacity-60">Campus Residence</span>
              <span className="font-medium break-words block leading-snug">{studentProfile.currentAddress}</span>
            </div>
          </div>
        </div>

        {/* Parent / Guardian Information */}
        <div
          className={`p-4 rounded-2xl border space-y-3 shadow-sm ${
            theme === 'dark' ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
          }`}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider opacity-70 mb-2 truncate">
            Parent & Guardian Information
          </h3>

          <div className="flex items-start gap-3 text-xs min-w-0">
            <User size={16} className="text-[#FF7A00] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="block text-[10px] opacity-60">Father</span>
              <span className="font-medium break-words block leading-snug">{studentProfile.fatherName} ({studentProfile.fatherMobile})</span>
            </div>
          </div>

          <div className="flex items-start gap-3 text-xs min-w-0">
            <User size={16} className="text-[#FF7A00] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="block text-[10px] opacity-60">Mother</span>
              <span className="font-medium break-words block leading-snug">{studentProfile.motherName} ({studentProfile.motherMobile})</span>
            </div>
          </div>
        </div>

        {/* ERP System Status */}
        <div
          className={`p-3.5 rounded-2xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs ${
            theme === 'dark' ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold truncate">SchoolPad Connected</p>
              <p className="text-[10px] opacity-60 truncate">Institute Code: {schoolCode}</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500 shrink-0">
            Active
          </span>
        </div>

        {/* Log Out Button */}
        <button
          onClick={logout}
          className="w-full min-h-[44px] py-3 sm:py-3.5 px-4 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 active:bg-rose-500/20 font-semibold text-xs transition-colors flex items-center justify-center gap-2 focus:outline-none"
        >
          <LogOut size={16} />
          <span>{isDemoMode ? 'Log Out of Demo Account' : 'Sign Out of Chitkara ERP'}</span>
        </button>

        {/* Creator Credit */}
        <div className={`text-center pt-3 pb-2 text-xs font-medium ${theme === 'dark' ? 'text-[#7A7A7A]' : 'text-[#8A8A8A]'}`}>
          Made by Vishal (CSE'25)
        </div>
      </main>
    </div>
  );
};
