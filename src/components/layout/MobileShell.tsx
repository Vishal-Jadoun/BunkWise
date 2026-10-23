import React from 'react';
import { useApp } from '../../context/AppContext';
import { HomeIcon, CampaignIcon, ChecklistIcon, PersonIcon } from '../icons';

interface MobileShellProps {
  children: React.ReactNode;
}

export const MobileShell: React.FC<MobileShellProps> = ({ children }) => {
  const { currentRoute, navigate, isLoggedIn, circulars, theme } = useApp();

  const isTabRoute = ['/', '/circulars', '/attendance', '/profile'].includes(currentRoute);
  const unreadCount = circulars.filter(c => c.unread).length;

  const tabs = [
    { id: 'home', label: 'Home', route: '/', icon: HomeIcon },
    { id: 'circulars', label: 'Circulars', route: '/circulars', icon: CampaignIcon, badge: unreadCount },
    { id: 'attendance', label: 'Attendance', route: '/attendance', icon: ChecklistIcon },
    { id: 'profile', label: 'Profile', route: '/profile', icon: PersonIcon },
  ];

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex flex-col items-center justify-start md:py-4 md:px-4 bg-[#0A0A0A] md:bg-gradient-to-br md:from-[#1a1a2e] md:via-[#16213e] md:to-[#0f0f23] transition-colors duration-300 select-none">
      {/* Desktop Helper & Creator Banner */}
      <div className="hidden md:flex items-center justify-between w-full max-w-[430px] mb-2 px-1 text-white/50 text-[11px] font-medium tracking-wide">
        <div className="flex items-center gap-1.5">
          <span>📱</span>
          <span>Mobile view active</span>
        </div>
        <span>Made by Vishal (CSE'25)</span>
      </div>

      {/* Centered Mobile Frame Container */}
      <div
        className={`w-full md:max-w-[430px] h-screen h-[100dvh] md:h-[min(880px,calc(100dvh-32px))] md:rounded-[32px] overflow-hidden flex flex-col relative shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] border-0 md:border md:border-white/10 transition-colors duration-300 ${
          theme === 'dark' ? 'bg-[#0A0A0A] text-white' : 'bg-[#F8F7F4] text-[#1E1A1D]'
        }`}
      >
        {/* Main Content Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col overscroll-contain">
          {children}
        </div>

        {/* Floating Animated Bottom Tab Bar (Only visible on main tab routes when logged in) */}
        {isLoggedIn && isTabRoute && (
          <nav
            className={`shrink-0 z-40 w-full px-2 sm:px-4 flex items-center justify-around border-t backdrop-blur-md transition-colors duration-300 ${
              theme === 'dark'
                ? 'bg-[#121212]/95 border-[#2A2A2A]'
                : 'bg-[#FFFFFF]/95 border-[#E8E8E8]'
            }`}
            style={{
              paddingBottom: 'var(--sab)',
              height: 'calc(var(--bottom-nav-base-height) + var(--sab))',
            }}
          >
            {tabs.map(tab => {
              const isFocused = currentRoute === tab.route;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.route)}
                  className="flex-1 min-w-[56px] min-h-[44px] h-full flex flex-col items-center justify-center relative group focus:outline-none"
                  aria-label={tab.label}
                >
                  <div
                    className={`relative flex items-center justify-center transition-all duration-300 ease-out ${
                      isFocused ? '-translate-y-2.5' : 'translate-y-0'
                    }`}
                  >
                    {/* Glowing active circular background */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isFocused
                          ? 'bg-[#FF7A00] shadow-[0_6px_16px_rgba(255,122,0,0.4)] scale-100 opacity-100'
                          : 'bg-transparent scale-75 opacity-0'
                      }`}
                    >
                      <Icon
                        size={20}
                        color={isFocused ? '#FFFFFF' : theme === 'dark' ? '#7A7A7A' : '#9E9E9E'}
                        filled={isFocused}
                      />
                    </div>

                    {/* Unfocused Icon positioned on top if not focused */}
                    {!isFocused && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon
                          size={20}
                          color={theme === 'dark' ? '#8A8A8A' : '#9E9E9E'}
                          filled={false}
                        />
                      </div>
                    )}

                    {/* Unread Badge Notification */}
                    {tab.badge && tab.badge > 0 && !isFocused && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-[#FF7A00] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm">
                        {tab.badge}
                      </span>
                    )}
                  </div>

                  {/* Tab Label */}
                  <span
                    className={`text-[10px] sm:text-[11px] font-medium transition-colors duration-200 mt-0.5 leading-none ${
                      isFocused
                        ? 'text-[#FF7A00] font-semibold'
                        : theme === 'dark'
                        ? 'text-[#8A8A8A]'
                        : 'text-[#9E9E9E]'
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
};
