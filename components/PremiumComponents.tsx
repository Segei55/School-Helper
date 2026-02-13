
import React from 'react';
import { X, Crown, Sparkles, Star, Lock } from 'lucide-react';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  triggerSource?: string;
}

const handleOpenSite = () => {
  if (window.electron && window.electron.loginGoogle) {
     window.electron.loginGoogle(); 
  } else {
     window.open('https://school-helper.ru/#/auth', '_blank');
  }
};

export const PremiumModal: React.FC<PremiumModalProps> = ({ isOpen, onClose, isDarkMode, triggerSource }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className={`relative w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#202225]' : 'bg-white'}`}>
        
        {/* Animated Header Background */}
        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-br from-[#5865f2] via-[#eb459e] to-[#faa61a] overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-150"></div>
            {/* Particles */}
            <div className="absolute top-4 left-10 w-2 h-2 bg-white rounded-full animate-ping" style={{ animationDuration: '3s' }} />
            <div className="absolute bottom-10 right-12 w-3 h-3 bg-white rounded-full animate-pulse" style={{ animationDuration: '2s' }} />
            <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-white blur-[60px] opacity-30 animate-pulse" />
        </div>

        {/* Close Button */}
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors backdrop-blur-md"
        >
            <X size={20} />
        </button>

        <div className="relative z-10 pt-16 px-8 pb-8 flex flex-col items-center text-center">
            {/* Icon */}
            <div className="w-20 h-20 rounded-[28px] bg-white shadow-2xl flex items-center justify-center mb-6 transform rotate-3">
                <Crown size={40} className="text-[#faa61a] fill-[#faa61a]" />
            </div>

            <h2 className={`text-2xl font-black uppercase tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Premium Доступ
            </h2>
            <p className={`text-sm mb-6 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
               {triggerSource === 'ai' && "Вы достигли лимита сообщений на сегодня."}
               {triggerSource === 'graphing' && "Графический калькулятор доступен в Premium."}
               {triggerSource === 'import_export' && "Синхронизация и бэкапы доступны в Premium."}
               {triggerSource === 'reminder' && "Умные напоминания доступны в Premium."}
               <br/>
               Разблокируйте все возможности School Helper прямо сейчас!
            </p>

            {/* Feature List */}
            <div className={`w-full p-4 rounded-2xl mb-6 text-left text-xs font-bold space-y-3 ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                    <Sparkles size={16} className="text-[#eb459e]" />
                    <span className={isDarkMode ? 'text-gray-200' : 'text-gray-700'}>Безлимитный ИИ и история чатов</span>
                </div>
                <div className="flex items-center gap-3">
                    <Star size={16} className="text-[#faa61a]" />
                    <span className={isDarkMode ? 'text-gray-200' : 'text-gray-700'}>Импорт/Экспорт и облако</span>
                </div>
                <div className="flex items-center gap-3">
                    <Lock size={16} className="text-[#5865f2]" />
                    <span className={isDarkMode ? 'text-gray-200' : 'text-gray-700'}>Графики и напоминания</span>
                </div>
            </div>

            <button 
                onClick={handleOpenSite}
                className="w-full py-4 rounded-xl font-bold text-white shadow-lg shadow-[#5865f2]/30 bg-gradient-to-r from-[#5865f2] to-[#eb459e] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 group"
            >
                <span>Получить Premium</span>
                <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
            </button>
        </div>
      </div>
    </div>
  );
};

export const PremiumOverlay: React.FC<{ title: string; isDarkMode: boolean; onOpenModal: () => void }> = ({ title, isDarkMode, onOpenModal }) => {
    return (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center backdrop-blur-sm bg-black/5 overflow-hidden rounded-3xl">
             <div className={`absolute inset-0 opacity-90 ${isDarkMode ? 'bg-[#2f3136]' : 'bg-gray-50'}`} />
             
             {/* Decor */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#eb459e]/20 to-transparent blur-3xl" />
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-[#5865f2]/20 to-transparent blur-3xl" />

             <div className="relative z-10 flex flex-col items-center text-center p-6 max-w-sm">
                 <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#faa61a] to-[#f59e0b] flex items-center justify-center shadow-lg mb-4">
                     <Lock size={32} className="text-white" />
                 </div>
                 <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
                 <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                     Эта функция доступна только для пользователей с активной подпиской Premium.
                 </p>
                 <button 
                    onClick={onOpenModal}
                    className="px-8 py-3 rounded-xl font-bold text-white shadow-lg bg-[#5865f2] hover:bg-[#4752c4] transition-all active:scale-95"
                 >
                     Разблокировать
                 </button>
             </div>
        </div>
    );
};
