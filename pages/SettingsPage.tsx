import React, { useState, useEffect } from 'react';
import { UserInfo } from '../types';
import { LogOut, Sun, Info, ShieldCheck, LogIn, School, RotateCcw, Monitor, Power, ArrowDownToLine, Star, CreditCard, Sparkles, Crown, Key, Loader2, CheckCircle, AlertTriangle, GraduationCap, Lock, Keyboard, Command } from 'lucide-react';
import PinScreen from '../components/PinScreen';
import HotkeysModal from '../components/HotkeysModal';

interface SettingsPageProps {
  userInfo: UserInfo | null;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
  onGoogleLogin: () => void;
  onResetWelcome?: () => void;
  onUpdateUser?: (updatedUser: UserInfo) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ userInfo, isDarkMode, onToggleTheme, onLogout, onGoogleLogin, onResetWelcome, onUpdateUser }) => {
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [minimizeToTray, setMinimizeToTray] = useState(true);
  const [isElectron, setIsElectron] = useState(false);
  
  // PIN State
  const [hasPin, setHasPin] = useState(false);
  const [showPinModal, setShowPinModal] = useState< 'setup' | 'verify' | null >(null);
  const [showHotkeys, setShowHotkeys] = useState(false);

  // License Activation State
  const [licenseInput, setLicenseInput] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activationSuccess, setActivationSuccess] = useState(false);

  useEffect(() => {
    const isElectronEnv = !!window.electron;
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // Check if PIN is set
    setHasPin(!!localStorage.getItem('school_helper_pin_hash'));
    
    if (isElectronEnv || isDev) {
      setIsElectron(true);
      if (window.electron?.getAppSettings) {
        window.electron.getAppSettings().then(settings => {
          setAutoLaunch(settings.autoLaunch);
          setMinimizeToTray(settings.minimizeToTray);
        });
      }
    }
  }, []);

  const handleToggleAutoLaunch = async () => {
    const newVal = !autoLaunch;
    setAutoLaunch(newVal);
    if (window.electron?.updateAppSetting) {
      await window.electron.updateAppSetting('autoLaunch', newVal);
    }
  };

  const handleToggleTray = async () => {
    const newVal = !minimizeToTray;
    setMinimizeToTray(newVal);
    if (window.electron?.updateAppSetting) {
      await window.electron.updateAppSetting('minimizeToTray', newVal);
    }
  };

  const handleTogglePin = () => {
    if (hasPin) {
      // If PIN is enabled, verify before disabling
      setShowPinModal('verify');
    } else {
      // If PIN is disabled, setup new
      setShowPinModal('setup');
    }
  };

  const onPinSuccess = () => {
    if (showPinModal === 'verify') {
       // Was verifying to disable
       localStorage.removeItem('school_helper_pin_hash');
       setHasPin(false);
    } else if (showPinModal === 'setup') {
       // Was setting up
       setHasPin(true);
    }
    setShowPinModal(null);
  };

  const handleActivateLicense = async () => {
    if (!licenseInput.trim() || !userInfo?.email) return;
    setIsActivating(true);
    setActivationError(null);

    const cleanKey = licenseInput.trim();

    try {
        console.log(`Activating license for ${userInfo.email}...`);
        
        const response = await fetch('https://school-helper.ru/api.php?action=activate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                email: userInfo.email,
                key: cleanKey
            })
        });
        
        const data = await response.json();
        console.log("Activation Response:", data);

        if (data.success || data.is_premium === true || data.is_premium === '1') {
            setActivationSuccess(true);
            if (onUpdateUser) {
                onUpdateUser({ ...userInfo, isPremium: true, licenseKey: cleanKey });
            }
        } else {
            console.error("Activation Error:", data.error);
            setActivationError(data.error || "Неверный ключ активации или ошибка сервера");
        }
    } catch (e) {
        console.error("Activation network failed:", e);
        setActivationError("Ошибка соединения с сервером. Проверьте интернет.");
    } finally {
        setIsActivating(false);
    }
  };

  const handleOpenSite = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.electron && window.electron.loginGoogle) {
         window.electron.loginGoogle(); 
    } else {
         window.open('https://school-helper.ru/#/auth', '_blank');
    }
  };

  const formatValidUntil = (dateStr?: string) => {
      if (!dateStr) return 'Бессрочно';
      const date = new Date(isNaN(Number(dateStr)) ? dateStr : Number(dateStr) * 1000);
      if (isNaN(date.getTime())) return dateStr;
      
      return date.toLocaleDateString('ru-RU', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
      });
  };

  const cardClasses = isDarkMode ? 'bg-[#202225]' : 'bg-white border border-gray-200';
  const subCardClasses = isDarkMode ? 'bg-[#2f3136]' : 'bg-gray-100';
  const secondaryText = isDarkMode ? 'text-[#8e9297]' : 'text-gray-500';
  const primaryText = isDarkMode ? 'text-white' : 'text-gray-900';
  const headerText = isDarkMode ? 'text-white' : 'text-gray-900';

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <style>{`
        @keyframes sheen {
          0% { transform: translateX(-150%) skewX(-15deg); }
          50%, 100% { transform: translateX(150%) skewX(-15deg); }
        }
        @keyframes float-star {
          0%, 100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 0.8; }
          50% { transform: translateY(-4px) scale(1.2) rotate(15deg); opacity: 1; }
        }
        .animate-sheen {
          animation: sheen 3s infinite linear;
        }
        .animate-star-1 { animation: float-star 2s infinite ease-in-out; }
        .animate-star-2 { animation: float-star 2.5s infinite ease-in-out 0.5s; }
        .animate-star-3 { animation: float-star 3s infinite ease-in-out 1s; }
      `}</style>
      
      {showPinModal && (
          <PinScreen 
             mode={showPinModal} 
             onSuccess={onPinSuccess}
             onCancel={() => setShowPinModal(null)}
             isDarkMode={isDarkMode}
          />
      )}

      {/* User Profile Card */}
      <div className={`flex flex-col md:flex-row items-center gap-6 p-8 rounded-[32px] ${cardClasses}`}>
        <div className="relative w-24 h-24 shrink-0">
          <div className="w-full h-full rounded-[24px] bg-[#5865f2] overflow-hidden flex items-center justify-center shadow-lg relative group">
            {userInfo?.photoUrl ? (
              <img src={userInfo.photoUrl} alt="Avatar" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
            ) : (
              <School size={48} className="text-white" />
            )}
          </div>
          
          {userInfo?.role === 'teacher' && (
              <div className="absolute -top-3 -right-3 bg-[#5865f2] text-white p-2 rounded-full border-4 border-[#202225] shadow-lg z-20" title="Учитель">
                  <GraduationCap size={16} />
              </div>
          )}

          {/* TEMPORARILY HIDDEN
          {userInfo?.isPremium && (
             <div className="absolute -bottom-2 -right-2 bg-[#faa61a] rounded-full p-2 border-4 border-[#202225] z-20">
                 <Crown size={14} className="text-white fill-white" />
             </div>
          )}
          */}
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
             <h2 className={`text-3xl font-extrabold ${headerText} flex items-center gap-3`}>
                {userInfo?.role === 'teacher' && (
                  <span className="text-sm bg-[#5865f2] text-white px-2 py-1 rounded-lg shadow-sm align-middle flex items-center gap-1">
                     <GraduationCap size={12} />
                     Учитель
                  </span>
                )}
                {userInfo?.role === 'student' && (
                  <span className="text-sm bg-[#3ba55c] text-white px-2 py-1 rounded-lg shadow-sm align-middle flex items-center gap-1">
                     <School size={12} />
                     Ученик
                  </span>
                )}
                {userInfo?.displayName || 'Гость'}
             </h2>
             {/* TEMPORARILY HIDDEN
             {userInfo?.isPremium && (
                 <div className="px-3 py-1 rounded-full bg-gradient-to-r from-[#faa61a] to-[#f59e0b] flex items-center gap-1.5 shadow-lg shadow-[#faa61a]/20 animate-in zoom-in duration-300">
                    <Crown size={14} className="text-white fill-white" />
                    <span className="text-white text-[10px] font-extrabold uppercase tracking-widest">Premium</span>
                 </div>
             )}
             */}
          </div>
          <p className={secondaryText}>{userInfo?.email || 'Автономный режим'}</p>
        </div>
      </div>

      {/* Premium Subscription Section - TEMPORARILY HIDDEN */}
      {/* 
      <div className="relative p-[2px] rounded-[34px] bg-gradient-to-r from-[#5865f2] via-[#eb459e] to-[#faa61a] shadow-xl group/premium">
        <div className={`p-6 rounded-[32px] flex flex-col items-start gap-6 relative overflow-hidden ${isDarkMode ? 'bg-[#202225]' : 'bg-white'}`}>
          
          <div className="flex flex-col md:flex-row items-start md:items-center gap-5 z-10 w-full">
            <div className="w-14 h-14 rounded-2xl bg-[#faa61a]/20 flex items-center justify-center shrink-0 relative overflow-hidden">
               <Star size={28} className="text-[#faa61a] fill-[#faa61a] relative z-10" />
               <div className="absolute inset-0 bg-[#faa61a]/20 blur-xl animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className={`text-xl font-bold flex items-center gap-2 ${headerText}`}>
                School Helper Premium 
              </h3>
              <p className={`text-sm mt-1 leading-relaxed ${secondaryText}`}>
                 {userInfo?.isPremium 
                   ? `Ваша подписка активна! Срок истечения: ${formatValidUntil(userInfo?.validUntil)}`
                   : <>Разблокируйте premium-функции<br/>получите код, купив подписку на <a href="https://school-helper.ru/#/auth" onClick={handleOpenSite} className="text-[#5865f2] hover:underline cursor-pointer font-bold">сайте</a></>}
              </p>
            </div>
          </div>
          
          {userInfo?.isPremium ? (
             <div className="w-full p-4 rounded-xl bg-[#3ba55c]/10 border border-[#3ba55c]/20 flex items-center gap-3">
                 <CheckCircle size={20} className="text-[#3ba55c]" />
                 <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Подписка активна</span>
             </div>
          ) : (
             <div className="w-full flex flex-col md:flex-row gap-3 mt-2">
               {userInfo?.email ? (
                 <>
                   <div className="relative flex-1 group">
                      <Key size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-gray-500 group-focus-within:text-[#eb459e]' : 'text-gray-400 group-focus-within:text-[#eb459e]'}`} />
                      <input 
                        value={licenseInput}
                        onChange={(e) => { setLicenseInput(e.target.value); setActivationError(null); }}
                        placeholder="Введите ключ активации..."
                        className={`w-full h-12 pl-12 pr-4 rounded-xl outline-none font-medium transition-all border-2 ${isDarkMode ? 'bg-[#2f3136] border-transparent focus:border-[#eb459e] text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 focus:border-[#eb459e] text-gray-900'}`}
                      />
                   </div>
                   <button
                    onClick={handleActivateLicense}
                    disabled={isActivating || !licenseInput.trim()}
                    className={`h-12 px-8 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap
                        ${isActivating || !licenseInput.trim() ? 'bg-gray-500 opacity-50 cursor-not-allowed' : 'bg-gradient-to-r from-[#eb459e] to-[#faa61a] hover:brightness-110 active:scale-95 shadow-[#eb459e]/30'}
                    `}
                   >
                     {isActivating ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={18} />}
                     {isActivating ? 'Проверка...' : 'Активировать'}
                   </button>
                 </>
               ) : (
                  <button 
                    onClick={handleOpenSite}
                    className="w-full p-3 rounded-xl bg-[#5865f2]/10 hover:bg-[#5865f2]/20 border border-[#5865f2]/20 text-[#5865f2] text-sm font-medium flex items-center gap-2 justify-center transition-colors cursor-pointer"
                  >
                     <LogIn size={16} />
                     Войдите в аккаунт, чтобы активировать подписку
                  </button>
               )}
             </div>
          )}

          {activationError && (
              <div className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
                  <AlertTriangle size={16} />
                  {activationError}
              </div>
          )}
          {activationSuccess && !userInfo?.isPremium && (
               <div className="w-full p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
                  <CheckCircle size={16} />
                  Успешно! Обновляем статус...
              </div>
          )}
        </div>
      </div>
      */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Appearance */}
        <div className={`${cardClasses} p-6 rounded-2xl space-y-4`}>
          <div className="flex items-center gap-2 font-bold mb-4">
             <Sun size={20} className="text-[#faa61a]" />
             <span>Оформление</span>
          </div>
          <div className={`flex items-center justify-between p-4 rounded-xl ${subCardClasses}`}>
            <span className="font-medium">Тёмная тема</span>
            <button 
              onClick={onToggleTheme}
              className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 flex items-center ${isDarkMode ? 'bg-[#5865f2]' : 'bg-gray-300'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${isDarkMode ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        </div>

        {/* System Settings */}
        <div className={`${cardClasses} p-6 rounded-2xl space-y-4`}>
            <div className="flex items-center gap-2 font-bold mb-4">
               <Monitor size={20} className="text-[#3ba55c]" />
               <span>Система</span>
            </div>
            
            {isElectron && (
              <>
                <div className={`flex items-center justify-between p-4 rounded-xl mb-2 ${subCardClasses}`}>
                  <div className="flex items-center gap-3">
                    <Power size={18} className="text-gray-500" />
                    <span className="font-medium text-sm">Автозапуск</span>
                  </div>
                  <button 
                    onClick={handleToggleAutoLaunch}
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 flex items-center ${autoLaunch ? 'bg-[#5865f2]' : 'bg-gray-400'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${autoLaunch ? 'translate-x-6' : ''}`} />
                  </button>
                </div>

                <div className={`flex items-center justify-between p-4 rounded-xl mb-2 ${subCardClasses}`}>
                  <div className="flex items-center gap-3">
                    <ArrowDownToLine size={18} className="text-gray-500" />
                    <span className="font-medium text-sm">Сворачивать в трей</span>
                  </div>
                  <button 
                    onClick={handleToggleTray}
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 flex items-center ${minimizeToTray ? 'bg-[#5865f2]' : 'bg-gray-400'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${minimizeToTray ? 'translate-x-6' : ''}`} />
                  </button>
                </div>
              </>
            )}

            {/* PIN Toggle */}
            <div className={`flex items-center justify-between p-4 rounded-xl ${subCardClasses}`}>
                <div className="flex items-center gap-3">
                    <Lock size={18} className="text-gray-500" />
                    <span className="font-medium text-sm">Вход по ПИН-коду</span>
                </div>
                <button 
                    onClick={handleTogglePin}
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 flex items-center ${hasPin ? 'bg-[#5865f2]' : 'bg-gray-400'}`}
                >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${hasPin ? 'translate-x-6' : ''}`} />
                </button>
            </div>
        </div>

        {/* Controls Settings */}
        <div className={`${cardClasses} p-6 rounded-2xl space-y-4`}>
            <div className="flex items-center gap-2 font-bold mb-4">
               <Keyboard size={20} className="text-[#eb459e]" />
               <span>Управление</span>
            </div>
            
            <button 
              onClick={() => setShowHotkeys(true)}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${subCardClasses} hover:brightness-95 active:scale-[0.98]`}
            >
              <div className="flex items-center gap-3">
                <Command size={18} className="text-gray-500" />
                <span className="font-medium text-sm">Горячие клавиши</span>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-bold ${isDarkMode ? 'bg-black/20 text-gray-400' : 'bg-white text-gray-500'}`}>
                Показать
              </div>
            </button>
        </div>
      </div>

      {showHotkeys && <HotkeysModal onClose={() => setShowHotkeys(false)} isDarkMode={isDarkMode} />}

      {/* Info & Account */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`${cardClasses} p-6 rounded-2xl space-y-4`}>
          <div className="flex items-center gap-2 font-bold mb-4">
             <Info size={20} className="text-[#eb459e]" />
             <span>О приложении</span>
          </div>
          <div className={`space-y-2 text-sm ${secondaryText}`}>
             <div className="flex justify-between">
                <span>Версия</span>
                <span className={primaryText}>Бета 0.1.2</span>
             </div>
             <div className="flex justify-between">
                <span>Разработчик</span>
                <span className={primaryText}>Sihmer</span>
             </div>
          </div>
        </div>
        
        <div className={`${cardClasses} p-6 rounded-2xl`}>
            <div className="flex items-center gap-2 font-bold mb-4">
                <ShieldCheck size={20} className="text-[#5865f2]" />
                <span>Аккаунт</span>
            </div>
            <div className="flex flex-col gap-3">
                {userInfo ? (
                <button 
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-2 bg-[#ed4245] hover:bg-red-600 text-white p-4 rounded-xl font-bold transition-all transform active:scale-[0.98]"
                >
                    <LogOut size={20} />
                    Выйти из аккаунта
                </button>
                ) : (
                <div className="flex flex-col gap-3">
                    <button 
                    onClick={onGoogleLogin}
                    className="w-full flex items-center justify-center gap-2 bg-[#4285f4] hover:bg-[#357ae8] text-white p-4 rounded-xl font-bold transition-all transform active:scale-[0.98]"
                    >
                    <LogIn size={20} />
                    Войти через Google
                    </button>
                    
                    {onResetWelcome && (
                    <button 
                        onClick={onResetWelcome}
                        className={`w-full flex items-center justify-center gap-2 p-4 rounded-xl font-bold transition-all ${isDarkMode ? 'bg-[#2f3136] hover:bg-[#36393f] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                    >
                        <RotateCcw size={20} />
                        Вернуться на стартовый экран
                    </button>
                    )}
                </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;