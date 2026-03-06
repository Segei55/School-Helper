import React, { useState, useEffect, useCallback } from 'react';
import { Delete, X, Fingerprint, Lock } from 'lucide-react';

interface PinScreenProps {
  mode: 'unlock' | 'setup' | 'verify';
  onSuccess: () => void;
  onCancel?: () => void;
  isDarkMode: boolean;
}

const PIN_STORAGE_KEY = 'school_helper_pin_hash';

// Simple hash function for client-side storage
const hashPin = async (pin: string) => {
  const msgBuffer = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const PinScreen: React.FC<PinScreenProps> = ({ mode, onSuccess, onCancel, isDarkMode }) => {
  const [pin, setPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [title, setTitle] = useState('');

  // Determine Title based on mode and step
  useEffect(() => {
    if (error) {
       setTitle('Неверный код');
       return;
    }
    if (mode === 'unlock') setTitle('Введите код-пароль');
    else if (mode === 'verify') setTitle('Введите текущий пароль');
    else if (mode === 'setup') {
      setTitle(step === 'enter' ? 'Придумайте код-пароль' : 'Повторите код-пароль');
    }
  }, [mode, step, error]);

  const handlePress = useCallback((digit: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit);
      setError(false);
    }
  }, [pin]);

  const handleDelete = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  }, []);

  const triggerError = () => {
    setError(true);
    setShake(true);
    setPin('');
    setTimeout(() => setShake(false), 500);
  };

  const processPin = async (inputPin: string) => {
    if (mode === 'setup') {
      if (step === 'enter') {
        setFirstPin(inputPin);
        setStep('confirm');
        setPin('');
      } else {
        if (inputPin === firstPin) {
          const hash = await hashPin(inputPin);
          localStorage.setItem(PIN_STORAGE_KEY, hash);
          onSuccess();
        } else {
          setTitle('Пароли не совпадают');
          triggerError();
          setStep('enter'); // Reset to start
          setFirstPin('');
        }
      }
    } else {
      // Unlock or Verify mode
      const storedHash = localStorage.getItem(PIN_STORAGE_KEY);
      const inputHash = await hashPin(inputPin);
      
      if (storedHash === inputHash) {
        if (mode === 'verify') {
             // If verifying to disable, we remove the pin here or let parent handle
             // Usually parent handles logic, but removing here for simplicity if 'verify' implies removal check
        }
        onSuccess();
      } else {
        triggerError();
      }
    }
  };

  useEffect(() => {
    if (pin.length === 4) {
      // Small delay for visual feedback of the 4th dot
      setTimeout(() => processPin(pin), 100);
    }
  }, [pin]);

  // Keyboard support
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (/[0-9]/.test(e.key)) handlePress(e.key);
          if (e.key === 'Backspace') handleDelete();
          if (e.key === 'Escape' && onCancel) onCancel();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePress, handleDelete, onCancel]);

  const bgColor = isDarkMode ? 'bg-[#202225]' : 'bg-[#f2f2f7]';
  const textColor = isDarkMode ? 'text-white' : 'text-black';
  const dotEmpty = isDarkMode ? 'border-white/30' : 'border-black/20';
  const dotFilled = isDarkMode ? 'bg-white' : 'bg-black';
  const keyBg = isDarkMode ? 'bg-[#3a3a3c] hover:bg-[#4a4a4c]' : 'bg-white hover:bg-gray-200 shadow-sm';
  const keyText = isDarkMode ? 'text-white' : 'text-black';

  return (
    <div className={`fixed inset-0 z-[50000] flex flex-col items-center justify-center select-none ${bgColor} ${textColor} animate-in fade-in duration-300`}>
      
      {/* Cancel Button (if applicable) */}
      {onCancel && (
          <button onClick={onCancel} className="absolute top-12 right-8 p-2 rounded-full hover:bg-black/10 transition-colors">
              <span className="text-sm font-semibold text-[#5865f2]">Отмена</span>
          </button>
      )}

      {/* Title */}
      <div className="flex flex-col items-center gap-3 mb-4 sm:mb-6 mt-auto">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1 ${isDarkMode ? 'bg-[#5865f2]/20 text-[#5865f2]' : 'bg-[#5865f2] text-white'}`}>
             <Lock size={20} />
        </div>
        <h2 className={`text-base sm:text-lg font-medium tracking-wide transition-all text-center px-4 ${shake ? 'text-red-500 animate-shake' : ''}`}>
            {title}
        </h2>
        
        {/* Dots */}
        <div className={`flex gap-3 mt-2 transition-transform ${shake ? 'translate-x-[-5px]' : ''}`} style={shake ? { animation: 'shake 0.4s cubic-bezier(.36,.07,.19,.97) both' } : {}}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border transition-all duration-200 ${
                i < pin.length ? `${dotFilled} border-transparent` : `${dotEmpty} bg-transparent`
              }`}
            />
          ))}
        </div>
      </div>

      {/* Keypad */}
      <div className="flex flex-col items-center w-full max-w-sm px-6 pb-8 flex-1 justify-start min-h-0">
        <div className="grid grid-cols-3 gap-x-6 gap-y-4 sm:gap-x-8 sm:gap-y-6 w-full max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handlePress(String(num))}
              className={`aspect-square w-full rounded-full flex items-center justify-center text-xl sm:text-2xl font-normal transition-colors active:scale-95 ${keyBg} ${keyText}`}
            >
              {num}
            </button>
          ))}
          
          {/* Bottom Row */}
          <div className="flex items-center justify-center">
             {/* Placeholder */}
          </div>
          
          <button
              onClick={() => handlePress('0')}
              className={`aspect-square w-full rounded-full flex items-center justify-center text-xl sm:text-2xl font-normal transition-colors active:scale-95 ${keyBg} ${keyText}`}
          >
              0
          </button>
          
          <div className="flex items-center justify-center">
              {pin.length > 0 ? (
                  <button 
                      onClick={handleDelete}
                      className={`aspect-square w-full rounded-full flex items-center justify-center transition-colors active:scale-95 hover:bg-black/5 text-inherit`}
                  >
                      <Delete size={20} strokeWidth={1.5} className="sm:w-6 sm:h-6" />
                  </button>
              ) : (
                  onCancel && (
                      <button 
                          onClick={onCancel}
                          className={`aspect-square w-full rounded-full flex items-center justify-center transition-colors active:scale-95 hover:bg-black/5 text-inherit opacity-50`}
                      >
                          <span className="text-xs sm:text-sm font-medium">Отмена</span>
                      </button>
                  )
              )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
};

export default PinScreen;