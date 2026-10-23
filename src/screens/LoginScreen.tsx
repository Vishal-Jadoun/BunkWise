import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { schoolPadApi } from '../services/schoolpadApi';
import { Eye, EyeOff, ArrowLeft, KeyRound, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { navigate, login, verifyOTP, enableDemoMode, schoolCode, setSchoolCode, theme } = useApp();

  // Inputs are blank for real authentication — no hardcoded demo fallback
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPassword, setIsGeneratingPassword] = useState(false);

  // OTP Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpText, setOtpText] = useState('');
  const [otpAuthUserId, setOtpAuthUserId] = useState('');
  const [otpHint, setOtpHint] = useState('');
  const [otpError, setOtpError] = useState('');

  // School Code Modal State
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [tempSchoolCode, setTempSchoolCode] = useState(schoolCode);

  const handleGeneratePassword = async () => {
    if (!username.trim()) {
      setErrorMsg('Please enter your university roll number first.');
      return;
    }
    setIsGeneratingPassword(true);
    setErrorMsg('');
    setInfoMsg('');
    try {
      schoolPadApi.setSchoolCode(schoolCode);
      const res = await schoolPadApi.generatePassword(username);
      if (res.success) {
        setInfoMsg(res.message);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch password.');
    } finally {
      setIsGeneratingPassword(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both your Chitkara Roll Number and Password.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(username, password);

      if (result.requiresOTP) {
        setOtpAuthUserId(String(result.userData?.userId || ''));
        setOtpHint(result.otpHint || 'your registered mobile number');
        setShowOtpModal(true);
      } else if (!result.success) {
        setErrorMsg(result.error || 'Authentication rejected by Chitkara University ERP.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to communicate with university ERP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpText.trim()) return;

    setIsLoading(true);
    setOtpError('');

    try {
      const res = await verifyOTP(otpAuthUserId, otpText);
      if (res.success) {
        setShowOtpModal(false);
      } else {
        setOtpError(res.error || 'Invalid OTP code.');
      }
    } catch (err: any) {
      setOtpError(err.message || 'OTP verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex-1 flex flex-col justify-between p-4 sm:p-6 max-w-sm mx-auto w-full transition-colors duration-300 pt-safe-header pb-[calc(1.5rem+var(--sab))] ${
      theme === 'dark' ? 'bg-[#0A0A0A] text-white' : 'bg-[#F8F7F4] text-[#1E1A1D]'
    }`}>
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/auth/get-started')}
            className={`p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors ${
              theme === 'dark' ? 'text-white' : 'text-[#1E1A1D]'
            }`}
          >
            <ArrowLeft size={20} />
          </button>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#FF7A00]/10 text-[#FF7A00] font-semibold">
            Chitkara ERP (800002)
          </span>
        </div>

        {/* Brand Icon & Welcome Headings */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl overflow-hidden mb-3 shadow-[0_6px_20px_rgba(255,122,0,0.35)]">
            <img
              src="/icon-192.png"
              alt="BunkWise Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Student Portal Login</h1>
          <p className={`text-xs ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#7A7570]'}`}>
            Sign in to BunkWise with your Chitkara University credentials
          </p>
        </div>

        {/* Error notification banner */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-medium flex items-start gap-2">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        {/* Success / OTP dispatched notification banner */}
        {infoMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-medium flex items-start gap-2">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <span className="leading-snug">{infoMsg}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleLogin} className="space-y-3.5">
          <div>
            <label htmlFor="rollNumber" className="block text-xs font-semibold mb-1 opacity-90">University Roll Number</label>
            <input
              id="rollNumber"
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. 2310990001"
              autoComplete="username"
              className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${
                theme === 'dark'
                  ? 'bg-[#151718] border-[#2A2A2A] text-white focus:border-[#FF7A00]'
                  : 'bg-white border-[#E8E8E8] text-black focus:border-[#FF7A00]'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-xs font-semibold opacity-90">Password / OTP</label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                disabled={isGeneratingPassword}
                className="text-[11px] text-[#FF7A00] font-medium hover:underline focus:outline-none"
              >
                {isGeneratingPassword ? 'Sending OTP to email...' : infoMsg ? 'Resend OTP to Email' : 'Get OTP / Forgot Password?'}
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password or email OTP"
                autoComplete="current-password"
                className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm outline-none transition-colors ${
                  theme === 'dark'
                    ? 'bg-[#151718] border-[#2A2A2A] text-white focus:border-[#FF7A00]'
                    : 'bg-white border-[#E8E8E8] text-black focus:border-[#FF7A00]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 p-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Primary Log In Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 rounded-xl bg-[#FF7A00] hover:bg-[#E66E00] text-white font-semibold text-sm shadow-[0_4px_16px_rgba(255,122,0,0.3)] transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Connecting to Chitkara ERP...</span>
              </>
            ) : (
              'Log In with Chitkara Account'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-4">
          <div className={`flex-1 h-px ${theme === 'dark' ? 'bg-[#2A2A2A]' : 'bg-[#E8E8E8]'}`} />
          <span className={`px-3 text-xs ${theme === 'dark' ? 'text-[#6B6B6B]' : 'text-[#A0A0A0]'}`}>
            or preview offline
          </span>
          <div className={`flex-1 h-px ${theme === 'dark' ? 'bg-[#2A2A2A]' : 'bg-[#E8E8E8]'}`} />
        </div>

        {/* Separate Demo Mode Button */}
        <button
          type="button"
          onClick={enableDemoMode}
          className={`w-full py-3 rounded-xl border text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            theme === 'dark'
              ? 'border-[#2A2A2A] text-gray-300 hover:border-[#FF7A00] hover:text-[#FF7A00]'
              : 'border-gray-200 text-gray-700 hover:border-[#FF7A00] hover:text-[#FF7A00]'
          }`}
        >
          <span>Try Demo (Offline Sample Data)</span>
        </button>
      </div>

      {/* Footer: School Code & Modal trigger */}
      <div className="pt-4 pb-2 text-center">
        <button
          type="button"
          onClick={() => {
            setTempSchoolCode(schoolCode);
            setShowSchoolModal(true);
          }}
          className="group inline-flex flex-col items-center focus:outline-none"
        >
          <span className={`text-[11px] ${theme === 'dark' ? 'text-[#8A8A8A]' : 'text-[#7A7570]'}`}>
            Institute: Chitkara University (<span className="font-semibold text-[#FF7A00]">{schoolCode}</span>)
          </span>
          <span className="text-[10px] text-gray-400 group-hover:text-gray-200 underline mt-0.5">
            Change School Code
          </span>
        </button>
      </div>

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <form
            onSubmit={handleVerifyOtp}
            className={`w-full max-w-xs p-6 rounded-2xl shadow-2xl transition-colors ${
              theme === 'dark' ? 'bg-[#1E1E1E] border border-[#2A2A2A]' : 'bg-white border border-gray-100'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-[#FF7A00]/15 text-[#FF7A00] flex items-center justify-center mb-3">
              <KeyRound size={22} />
            </div>
            <h3 className="text-base font-bold mb-1">Two-Factor Authentication</h3>
            <p className={`text-xs mb-3 leading-relaxed ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              An OTP has been sent to {otpHint}. Please enter it below:
            </p>

            {otpError && (
              <div className="mb-3 p-2 rounded-lg bg-red-500/10 text-red-500 text-xs text-center font-medium">
                {otpError}
              </div>
            )}

            <input
              type="text"
              autoFocus
              required
              value={otpText}
              onChange={e => setOtpText(e.target.value)}
              placeholder="Enter 4 or 6 digit OTP"
              className={`w-full px-3 py-2.5 rounded-xl border text-sm mb-4 outline-none text-center font-mono tracking-widest ${
                theme === 'dark' ? 'bg-[#121212] border-[#2A2A2A] text-white' : 'bg-gray-50 border-gray-200 text-black'
              }`}
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-600 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-xl bg-[#FF7A00] text-white text-xs font-semibold hover:bg-[#E66E00] flex items-center justify-center"
              >
                {isLoading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Verify & Continue'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* School Code Modal */}
      {showSchoolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-xs p-6 rounded-2xl shadow-2xl transition-colors ${
            theme === 'dark' ? 'bg-[#1E1E1E] border border-[#2A2A2A]' : 'bg-white border border-gray-100'
          }`}>
            <h3 className="text-base font-bold mb-1.5">Change School Code</h3>
            <p className={`text-xs mb-4 leading-relaxed ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#7A7570]'}`}>
              Chitkara University default code is <strong>800002</strong>.
            </p>
            <input
              type="text"
              value={tempSchoolCode}
              onChange={e => setTempSchoolCode(e.target.value)}
              placeholder="e.g. 800002"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm mb-4 outline-none ${
                theme === 'dark' ? 'bg-[#121212] border-[#2A2A2A] text-white' : 'bg-gray-50 border-gray-200 text-black'
              }`}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSchoolModal(false)}
                className={`flex-1 py-2 rounded-xl border text-xs font-semibold ${
                  theme === 'dark' ? 'border-[#2A2A2A] text-white hover:bg-white/5' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setSchoolCode(tempSchoolCode.trim() || '800002');
                  setShowSchoolModal(false);
                }}
                className="flex-1 py-2 rounded-xl bg-[#FF7A00] text-white text-xs font-semibold shadow-md hover:bg-[#E66E00]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
