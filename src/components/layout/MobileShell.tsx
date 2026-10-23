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
    <div className="min-h-screen w-full flex flex-col items-center justify-start md:py-5 md:px-4 bg-[#0A0A0A] md:bg-gradient-to-br md:from-[#1a1a2e] md:via-[#16213e] md:to-[#0f0f23] transition-colors duration-300 select-none">
      {/* Desktop Helper & Creator Banner */}
      <div className="hidden md:flex items-center justify-between w-[430px] mb-2 px-1 text-white/50 text-[11px] font-medium tracking-wide">
        <div className="flex items-center gap-1.5">
          <span>📱</span>
          <span>Mobile view active</span>
        </div>
        <span>Made by Vishal (CSE'25)</span>
      </div>

      {/* Centered Mobile Frame Container */}
      <div
        className={`w-full md:w-[430px] h-screen md:h-[calc(100vh-60px)] md:rounded-[28px] overflow-hidden flex flex-col relative shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] border-0 md:border md:border-white/10 transition-colors duration-300 ${
          theme === 'dark' ? 'bg-[#0A0A0A] text-white' : 'bg-[#F8F7F4] text-[#1E1A1D]'
        }`}
      >
        {/* Main Content Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col">
          {children}
        </div>

        {/* Floating Animated Bottom Tab Bar (Only visible on main tab routes when logged in) */}
        {isLoggedIn && isTabRoute && (
          <nav
            className={`sticky bottom-0 z-40 w-full h-16 px-4 flex items-center justify-around border-t backdrop-blur-md transition-colors duration-300 ${
              theme === 'dark'
                ? 'bg-[#121212]/95 border-[#2A2A2A]'
                : 'bg-[#FFFFFF]/95 border-[#E8E8E8]'
            }`}
          >
            {tabs.map(tab => {
              const isFocused = currentRoute === tab.route;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.route)}
                  className="flex-1 h-full flex flex-col items-center justify-center relative group focus:outline-none"
                  aria-label={tab.label}
                >
                  <div
                    className={`relative flex items-center justify-center transition-all duration-300 ease-out ${
                      isFocused ? '-translate-y-3' : 'translate-y-0'
                    }`}
                  >
                    {/* Glowing active circular background */}
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isFocused
                          ? 'bg-[#FF7A00] shadow-[0_6px_16px_rgba(255,122,0,0.4)] scale-100 opacity-100'
                          : 'bg-transparent scale-75 opacity-0'
                      }`}
                    >
                      <Icon
                        size={22}
                        color={isFocused ? '#FFFFFF' : theme === 'dark' ? '#7A7A7A' : '#9E9E9E'}
                        filled={isFocused}
                      />
                    </div>

                    {/* Unfocused Icon positioned on top if not focused */}
                    {!isFocused && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon
                          size={21}
                          color={theme === 'dark' ? '#8A8A8A' : '#9E9E9E'}
                          filled={false}
                        />
                      </div>
                    )}

                    {/* Unread Badge Notification */}
                    {tab.badge && tab.badge > 0 && !isFocused && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF7A00] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                        {tab.badge}
                      </span>
                    )}
                  </div>

                  {/* Tab Label */}
                  <span
                    className={`text-[11px] font-medium transition-colors duration-200 mt-0.5 ${
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
