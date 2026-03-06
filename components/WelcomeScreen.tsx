
import React, { useState } from 'react';
import { LogIn, User, School, GraduationCap, Backpack } from 'lucide-react';

interface WelcomeScreenProps {
  onGoogleLogin: () => void;
  onSkip: (persist: boolean, role?: 'student' | 'teacher') => void;
  isDarkMode: boolean;
  currentOrigin?: string;
  onOpenBrowser: (url: string) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
  onGoogleLogin, 
  onSkip, 
  isDarkMode, 
  currentOrigin = window.location.origin,
  onOpenBrowser
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);

  const handleAnonymousClick = () => {
    setShowRoleSelection(true);
  };

  const handleRoleSelect = (role: 'student' | 'teacher') => {
    // Save role preference and proceed
    localStorage.setItem('user_role', role);
    onSkip(dontShowAgain, role);
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen w-full transition-colors duration-500 relative p-4 ${isDarkMode ? 'bg-[#0f1014] text-white' : 'bg-[#f8f9fa] text-gray-900'}`}>
      <div className={`max-w-[480px] w-full p-8 rounded-[32px] text-center flex flex-col items-center relative overflow-hidden ${isDarkMode ? 'bg-[#1e1f22] border border-white/5' : 'bg-white shadow-2xl'}`}>
        
        {/* Logo Area */}
        <div className="mb-8 relative">
          <div className="w-20 h-20 rounded-3xl bg-[#5865f2]/10 flex items-center justify-center text-[#5865f2] mb-4 mx-auto">
            <School size={40} />
          </div>
          <h1 className="text-2xl font-bold mb-2">Добро пожаловать</h1>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Рады приветствовать Вас! Войдите в аккаунт для синхронизации, либо войдите анонимно (позднее будет возможность войти в аккаунт в пункте "настройки").
          </p>
        </div>

        {!showRoleSelection ? (
          /* Main Login Options */
          <div className="w-full space-y-3">
            <button 
              onClick={handleAnonymousClick}
              className={`w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${isDarkMode ? 'bg-[#2b2d31] hover:bg-[#35373c] text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}
            >
              <User size={18} />
              Войти анонимно
            </button>

            <button 
              onClick={() => onOpenBrowser('https://school-helper.ru/#/auth')}
              className="w-full py-3.5 rounded-xl font-bold bg-white text-gray-900 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 border border-gray-200"
            >
              <img src="https://www.google.com/favicon.ico" alt="G" className="w-5 h-5" />
              <span>Войти как User</span>
            </button>

            <div className="flex items-center gap-2 justify-center mt-6 cursor-pointer group select-none" onClick={() => setDontShowAgain(!dontShowAgain)}>
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${dontShowAgain ? 'bg-[#5865f2] border-[#5865f2]' : 'border-gray-500'}`}>
                {dontShowAgain && <User size={12} className="text-white" />}
              </div>
              <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-500'}`}>
                Запомнить выбор
              </span>
            </div>
          </div>
        ) : (
          /* Role Selection */
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h3 className="text-lg font-bold mb-6">Выберите роль</h3>
            <div className="grid grid-cols-2 gap-3 p-1 bg-[#111214] rounded-xl border border-white/5">
              <button 
                onClick={() => handleRoleSelect('student')}
                className="flex items-center justify-center gap-2 py-3 rounded-lg hover:bg-[#2b2d31] transition-colors text-gray-300 hover:text-white font-medium"
              >
                <Backpack size={18} />
                Я Ученик
              </button>
              <button 
                onClick={() => handleRoleSelect('teacher')}
                className="flex items-center justify-center gap-2 py-3 rounded-lg hover:bg-[#2b2d31] transition-colors text-gray-300 hover:text-white font-medium"
              >
                <GraduationCap size={18} />
                Я Учитель
              </button>
            </div>
            <button 
              onClick={() => setShowRoleSelection(false)}
              className={`mt-6 text-sm font-medium hover:underline ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
            >
              Назад
            </button>
          </div>
        )}

        <div className={`mt-8 text-[10px] text-center max-w-xs ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
          Продолжая, вы принимаете <button onClick={() => onOpenBrowser('https://school-helper.ru/#/privacy')} className="underline hover:text-[#5865f2]">Политику конфиденциальности</button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
