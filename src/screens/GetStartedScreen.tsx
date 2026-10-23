import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sun, Moon } from 'lucide-react';

export const GetStartedScreen: React.FC = () => {
  const { navigate, theme, toggleTheme } = useApp();
  const [isPressed, setIsPressed] = useState(false);

  return (
    <div className={`flex-1 flex flex-col justify-between p-6 max-w-sm mx-auto w-full transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#0A0A0A] text-white' : 'bg-[#F8F7F4] text-[#1E1A1D]'
    }`}>
      {/* Top Header: Brand & Theme Toggle */}
      <div className="flex items-center justify-between pt-6">
        <div className="w-8" /> {/* spacer */}

        <div className="flex items-center gap-2.5">
          <img
            src="/icon-192.png"
            alt="BunkWise Logo"
            className="w-8 h-8 rounded-xl shadow-md object-cover"
          />
          <span className="text-2xl font-bold tracking-tight">bunkwise</span>
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-white/10 transition-colors focus:outline-none"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-gray-700" />}
        </button>
      </div>

      {/* Center Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center my-auto py-8">
        {/* 3D Illustration */}
        <div className="w-full max-w-[280px] aspect-square mb-8 flex items-center justify-center">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCK5pbIfz18tVMO3ZbC0h1YgoWgMSNt3_AT8KiX6aq0WCxxaqCP4FsuU7i4JKaP8JPj6rsj5j59V_80WFEtcaLV3KlIIj87rAkqU8H9chDbUW95cT5xm_2KeAwftKxSFMnedB4qAurxuYXg6cR_nnYJ5SIHxYg6ZVbiEP09L3T-kFpzJW601NesSHp9DV3a7FjbQntdLJbFwwdYiWP5OaVFizZ7l9_Rv5otBVAUs6whzYbEuysYlwHZLjkVL-iDHJ0gZcAaVFEmZR0V"
            alt="BunkWise Hero"
            className="w-full h-full object-contain filter drop-shadow-xl"
            loading="eager"
          />
        </div>

        {/* Headings */}
        <div className="text-center px-2">
          <h1 className="text-3xl font-extrabold tracking-tight mb-3">
            Welcome to BunkWise
          </h1>
          <p className={`text-base leading-relaxed ${theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#7A7570]'}`}>
            Your smart attendance companion <span className="text-red-500">❤️</span>
          </p>
        </div>
      </div>

      {/* Bottom CTA & Footer */}
      <div className="pb-4 pt-2">
        <button
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onTouchStart={() => setIsPressed(true)}
          onTouchEnd={() => setIsPressed(false)}
          onClick={() => navigate('/auth/login')}
          style={{
            transform: isPressed ? 'scale(0.96)' : 'scale(1)',
            transition: 'transform 0.15s ease-out',
          }}
          className="w-full py-4 px-6 rounded-full bg-gradient-to-r from-[#FC5D32] to-[#FD943A] text-white font-bold text-lg text-center shadow-[0_8px_20px_rgba(252,93,50,0.35)] hover:shadow-[0_12px_24px_rgba(252,93,50,0.45)] transition-shadow duration-200"
        >
          Get Started
        </button>

        <div className={`flex items-center justify-center gap-1.5 mt-6 text-xs ${
          theme === 'dark' ? 'text-[#A0A0A0]' : 'text-[#7A7570]'
        }`}>
          <span>Made by Vishal (CSE'25)</span>
        </div>
      </div>
    </div>
  );
};
