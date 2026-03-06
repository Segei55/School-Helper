
import React, { useState, useEffect } from 'react';
import { Lock, Delete, ShieldCheck } from 'lucide-react';

interface PinLockProps {
  mode: 'unlock' | 'setup' | 'verify' | 'remove';
  onSuccess: (pin?: string) => void;
  onCancel?: () => void;
  isDarkMode: boolean;
  existingPin?: string; // For verify mode inside settings or remove
}

const PinLock: React.FC<PinLockProps> = ({ mode, onSuccess, onCancel, isDarkMode, existingPin }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter'); // for setup

  const handleDigit = (digit: number) => {
    if (error) setError('');
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  useEffect(() => {
    if (pin.length === 4) {
      // Delay to show the last dot
      const timer = setTimeout(() => {
        processPin();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pin]);

  const processPin = () => {
    if (mode === 'unlock') {
      const stored = localStorage.getItem('school_helper_pin');
      if (pin === stored) {
        onSuccess();
      } else {
        triggerError();
      }
    } 
    else if (mode === 'remove') {
       const stored = localStorage.getItem('school_helper_pin');
       if (pin === stored) {
         localStorage.removeItem('school_helper_pin');
         onSuccess();
       } else {
         triggerError();
       }
    }
    else if (mode === 'setup') {
      if (step === 'enter') {
        setConfirmPin(pin);
        setPin('');
        setStep('confirm');
      } else {
        if (pin === confirmPin) {
          localStorage.setItem('school_helper_pin', pin);
          onSuccess(pin);
        } else {
          setError('Пин-коды не совпадают');
          setPin('');
          setConfirmPin('');
          setStep('enter');
          shake();
        }
      }
    }
  };

  const triggerError = () => {
    setError('Неверный код');
    setPin('');
    shake();
  };

  const shake = () => {
    const el = document.getElementById('pin-dots');
    if (el) {
      el.classList.add('animate-shake');
      setTimeout(() => el.classList.remove('animate-shake'), 400);
    }
  };

  const getTitle = () => {
    if (mode === 'unlock') return 'Введите код-пароль';
    if (mode === 'remove') return 'Введите текущий код';
    if (mode === 'setup') return step === 'enter' ? 'Придумайте код-пароль' : 'Повторите код-пароль';
    return 'Код-пароль';
  };

  return (
    <div className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center p-4 backdrop-blur-xl ${isDarkMode ? 'bg-[#202225]/95 text-white' : 'bg-gray-100/95 text-gray-900'}`}>
      
      {onCancel && (
          <button onClick={onCancel} className="absolute top-8 left-8 text-sm font-medium opacity-60 hover:opacity-100">
              Отмена
          </button>
      )}

      <div className="flex flex-col items-center gap-8 w-full max-w-xs animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center gap-4">
           <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`}>
              {mode === 'setup' ? <ShieldCheck size={32} className="text-[#3ba55c]" /> : <Lock size={32} className="text-[#5865f2]" />}
           </div>
           <h2 className="text-xl font-bold">{getTitle()}</h2>
           <p className="text-xs font-bold text-red-500 h-4">{error}</p>
        </div>

        {/* Dots */}
        <div id="pin-dots" className="flex gap-6 mb-4">
           {[0, 1, 2, 3].map(i => (
              <div 
                key={i} 
                className={`w-4 h-4 rounded-full transition-all duration-200 
                  ${pin.length > i 
                    ? (isDarkMode ? 'bg-white' : 'bg-black') 
                    : (isDarkMode ? 'border-2 border-white/20' : 'border-2 border-black/10')}
                `}
              />
           ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-x-8 gap-y-6 w-full">
           {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handleDigit(num)}
                className={`w-16 h-16 rounded-full text-2xl font-medium transition-all active:scale-95 flex items-center justify-center
                   ${isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-white shadow-sm hover:bg-gray-50'}
                `}
              >
                {num}
              </button>
           ))}
           <div />
           <button
              onClick={() => handleDigit(0)}
              className={`w-16 h-16 rounded-full text-2xl font-medium transition-all active:scale-95 flex items-center justify-center
                 ${isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-white shadow-sm hover:bg-gray-50'}
              `}
            >
              0
            </button>
            <button
              onClick={handleDelete}
              className="w-16 h-16 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
            >
              <Delete size={24} />
            </button>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.3s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
};

export default PinLock;
