
import React, { useState } from 'react';
import { LogIn, User, TestTube, School } from 'lucide-react';

interface WelcomeScreenProps {
  onGoogleLogin: () => void;
  onDevLogin: () => void;
  onSkip: (persist: boolean) => void;
  isDarkMode: boolean;
  currentOrigin?: string;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
  onGoogleLogin, 
  onDevLogin,
  onSkip, 
  isDarkMode, 
  currentOrigin = window.location.origin
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen w-full transition-colors duration-500 relative p-4 ${isDarkMode ? 'bg-[#202225] text-white' : 'bg-[#f8f9fa] text-gray-900'}`}>
      <div className={`max-w-2xl w-full p-6 md:p-12 rounded-2xl text-center flex flex-col items-center gap-6 md:gap-8 ${isDarkMode ? 'bg-[#2f3136]' : 'bg-white shadow-2xl'}`}>
        
        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-[#5865f2] flex items-center justify-center text-white shadow-lg shrink-0">
          <School className="w-12 h-12 md:w-16 md:h-16" />
        </div>
        
        <div>
          <h1 className="text-2xl md:text-4xl font-extrabold mb-4">Школьный Помощник</h1>
          <p className={`text-sm md:text-lg opacity-80 max-w-lg mx-auto leading-relaxed ${isDarkMode ? 'text-[#b9bbbe]' : 'text-gray-600'}`}>
            Рад приветствовать Вас! Войдите в аккаунт для синхронизации, либо войдите анонимно (позднее будет возможность войти в аккаунт в пункте "настройки").
          </p>
        </div>

        <div className="flex flex-col gap-3 md:gap-4 w-full max-w-sm">
          <button 
            onClick={onGoogleLogin}
            className="flex items-center justify-center gap-3 bg-[#4285f4] hover:bg-[#357ae8] text-white py-3 md:py-4 rounded-lg font-bold transition-all transform hover:scale-105 active:scale-95 shadow-lg"
          >
            <LogIn size={20} />
            Войти через Google
          </button>

          {(currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1')) && (
            <button 
              onClick={onDevLogin}
              className="flex items-center justify-center gap-3 bg-[#3ba55c] hover:bg-[#2d7d46] text-white py-3 md:py-4 rounded-lg font-bold transition-all transform hover:scale-105 active:scale-95 shadow-lg"
            >
              <TestTube size={20} />
              Тестовый вход (Localhost)
            </button>
          )}
          
          <button 
            onClick={() => onSkip(dontShowAgain)}
            className={`flex items-center justify-center gap-3 py-3 md:py-4 rounded-lg font-bold transition-all transform hover:scale-105 active:scale-95 border-2 ${isDarkMode ? 'border-[#424549] bg-[#424549] text-white' : 'border-[#e3e5e8] bg-white text-gray-700'}`}
          >
            <User size={20} />
            Войти анонимно
          </button>
        </div>

        <div className="flex items-center gap-2 mt-2 md:mt-4 cursor-pointer group select-none" onClick={() => setDontShowAgain(!dontShowAgain)}>
          <input type="checkbox" checked={dontShowAgain} onChange={() => {}} className="w-4 h-4 rounded border-gray-300 text-[#5865f2] focus:ring-[#5865f2] cursor-pointer" />
          <span className={`text-xs md:text-sm group-hover:underline ${isDarkMode ? 'text-[#b9bbbe]' : 'text-gray-500'}`}>Больше не показывать</span>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
