
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SectionId, UserInfo, Note, PlannerEvent } from './types';
import { SECTIONS } from './constants';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import WelcomeScreen from './components/WelcomeScreen';
import { PremiumModal } from './components/PremiumComponents'; // Import PremiumModal
import GradesPage from './pages/GradesPage';
import NotesPage from './pages/NotesPage';
import DrawingPage from './pages/DrawingPage';
import CalculatorPage from './pages/CalculatorPage';
import AIPage from './pages/AIPage';
import SettingsPage from './pages/SettingsPage';
import ConverterPage from './pages/ConverterPage';
import PlannerPage from './pages/PlannerPage';
import StopwatchPage from './pages/StopwatchPage';
import TimerPage from './pages/TimerPage';
import { School, Loader2, CheckCircle, X, Download, AlertTriangle } from 'lucide-react';
import { streamMessageFromGemini } from './services/geminiService';
import LogViewer from './components/LogViewer'; // Import LogViewer

declare const google: any;

// Внутренняя версия для сверки (техническая)
const APP_VERSION = "0.1.2";

// --- VERSION CHECK HELPER ---
const compareVersions = (v1: string, v2: string) => {
    // Удаляем слово "Бета" и пробелы, если они пришли с сервера
    const cleanV1 = v1.replace(/[^0-9.]/g, '');
    const cleanV2 = v2.replace(/[^0-9.]/g, '');
    
    const parts1 = cleanV1.split('.').map(Number);
    const parts2 = cleanV2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
    }
    return 0;
};

// --- UPDATE SCREEN COMPONENT ---
const UpdateScreen = ({ isDarkMode }: { isDarkMode: boolean }) => {
    return (
        <div className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center p-6 ${isDarkMode ? 'bg-[#202225] text-white' : 'bg-gray-50 text-gray-900'}`}>
            <div className={`max-w-md w-full p-8 rounded-[32px] text-center shadow-2xl ${isDarkMode ? 'bg-[#2f3136] border border-white/5' : 'bg-white border border-gray-200'}`}>
                <div className="w-20 h-20 rounded-full bg-[#ed4245]/10 flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <AlertTriangle size={40} className="text-[#ed4245]" />
                </div>
                <h1 className="text-2xl font-bold mb-3">Доступно обновление</h1>
                <p className={`text-sm mb-8 leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Ваша версия приложения ({APP_VERSION}) устарела. Для продолжения работы необходимо обновить School Helper до актуальной версии.
                </p>
                <a 
                    href="https://school-helper.ru" 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-xl font-bold text-white bg-[#5865f2] hover:bg-[#4752c4] transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-500/30"
                >
                    <Download size={20} />
                    Скачать обновление
                </a>
            </div>
        </div>
    );
};

// --- Loading Screen Component ---
const LoadingScreen = ({ isFinished }: { isFinished: boolean }) => {
  const [shouldRender, setShouldRender] = useState(true);
  const [tipIndex, setTipIndex] = useState(0);

  const tips = [
    "Знаете ли вы? Школьный Помощник умеет синхронизироваться с Google Диском!",
    "Интересный факт: Таймер работает в фоновом режиме.",
    "Совет: Войдите в аккаунт, чтобы синхронизировать свои данные.",
    "Интересный факт: используйте горячие клавиши в редакторе заметок.",
    "Совет: Используйте нейросеть для объяснения сложных тем.",
    "Интересный факт: Секундомер работает в фоновом режиме.",
    "Совет: Работайте в других инструментах, пока создается заметка:)",
    "Знаете ли вы? Темная тема экономит заряд батареи на OLED экранах."
  ];

  useEffect(() => {
    setTipIndex(Math.floor(Math.random() * tips.length));
  }, []);

  useEffect(() => {
    if (isFinished) {
      // display: none через 500мс после того как opacity станет 0
      const timer = setTimeout(() => setShouldRender(false), 500); 
      return () => clearTimeout(timer);
    }
  }, [isFinished]);

  if (!shouldRender) return null;

  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#202225] text-white transition-all duration-500 ${isFinished ? 'opacity-0 pointer-events-none scale-105' : 'opacity-100'}`}>
      <div className="relative mb-8">
        <div className="w-24 h-24 bg-[#5865f2] rounded-[28px] flex items-center justify-center shadow-2xl animate-bounce">
          <School size={48} className="text-white" />
        </div>
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-16 h-2 bg-black/20 rounded-full blur-sm animate-pulse" />
      </div>
      
      <h1 className="text-2xl font-bold mb-6 tracking-tight">Загрузка...</h1>
      
      <div className="flex flex-col items-center gap-2">
        <Loader2 size={32} className="animate-spin text-[#5865f2] mb-4" />
        <p className="text-gray-400 text-sm max-w-md text-center px-4 font-medium animate-pulse">
          {tips[tipIndex]}
        </p>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [isAppReady, setIsAppReady] = useState(false);
  const [isUpdateRequired, setIsUpdateRequired] = useState(false);
  
  // --- DEBUG LOGS STATE ---
  const [showLogs, setShowLogs] = useState(false);

  // --- KEYBOARD LISTENERS (F9 for Logs) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'F9') {
            e.preventDefault();
            setShowLogs(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- PREMIUM MODAL STATE ---
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumTrigger, setPremiumTrigger] = useState<string>('');

  const triggerPremiumModal = useCallback((source: string) => {
    setPremiumTrigger(source);
    setShowPremiumModal(true);
  }, []);

  // --- STATE INITIALIZATION (LAZY LOAD FROM STORAGE) ---
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const config = localStorage.getItem('school_helper_config');
      return config ? (JSON.parse(config).themeMode !== 'light') : true;
    } catch (e) { return true; }
  });

  const [activeSection, setActiveSection] = useState<SectionId>(SectionId.Grades);
  
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const config = localStorage.getItem('school_helper_config');
      return config ? (JSON.parse(config).isLoggedIn || false) : false;
    } catch { return false; }
  });

  const [userInfo, setUserInfo] = useState<UserInfo | null>(() => {
    try {
      const config = localStorage.getItem('school_helper_config');
      return config ? (JSON.parse(config).userInfo || null) : null;
    } catch { return null; }
  });

  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
     try {
       const config = localStorage.getItem('school_helper_config');
       if (!config) return true;
       const parsed = JSON.parse(config);
       return !parsed.skipWelcome && !parsed.isLoggedIn;
     } catch { return true; }
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
      try {
        const config = localStorage.getItem('school_helper_config');
        return config ? (JSON.parse(config).isSidebarCollapsed || false) : false;
      } catch { return false; }
  });

  // --- GLOBAL NOTE CREATION STATE ---
  const [noteCreationStatus, setNoteCreationStatus] = useState<'idle' | 'creating' | 'success'>('idle');
  const [notesRefreshTrigger, setNotesRefreshTrigger] = useState(0);

  // --- GLOBAL AI STATE ---
  const [aiMessages, setAiMessages] = useState<any[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSelectedModel, setAiSelectedModel] = useState('deepseek/deepseek-r1');
  const isAiStreamingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- GLOBAL PLANNER STATE ---
  const [plannerEvents, setPlannerEvents] = useState<PlannerEvent[]>(() => {
    try {
        const saved = localStorage.getItem('school_helper_planner_events');
        return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const notifiedEventsRef = useRef<Set<string>>(new Set());

  // --- GLOBAL STOPWATCH STATE ---
  const [swStart, setSwStart] = useState<number | null>(null);
  const [swAccumulated, setSwAccumulated] = useState<number>(0);
  const [swLaps, setSwLaps] = useState<number[]>([]);

  // --- GLOBAL TIMER STATE ---
  const [timerTarget, setTimerTarget] = useState<number | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<number>(0);
  const [timerInitial, setTimerInitial] = useState<number>(0);
  const [timerStatus, setTimerStatus] = useState<'idle' | 'running' | 'paused' | 'finished'>('idle');
  
  // --- AUDIO SYSTEM ---
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<number | null>(null);

  // --- HELPERS FOR CONFIG ---
  const saveConfig = useCallback((updates: any) => {
    const currentStr = localStorage.getItem('school_helper_config');
    const current = currentStr ? JSON.parse(currentStr) : {};
    const updated = { ...current, ...updates };
    localStorage.setItem('school_helper_config', JSON.stringify(updated));
  }, []);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
  }, []);

  const playAlarm = useCallback(() => {
    if (!audioCtxRef.current) {
       audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    if (alarmIntervalRef.current) return;

    const playPattern = () => {
        const now = ctx.currentTime;
        for(let i=0; i<4; i++) {
             const t = now + i * 0.15;
             const osc = ctx.createOscillator();
             const gain = ctx.createGain();
             osc.connect(gain);
             gain.connect(ctx.destination);
             
             osc.type = 'square';
             osc.frequency.value = 880; 
             gain.gain.setValueAtTime(0.05, t);
             gain.gain.linearRampToValueAtTime(0, t + 0.1);
             
             osc.start(t);
             osc.stop(t + 0.1);
        }
    };

    playPattern();
    alarmIntervalRef.current = window.setInterval(playPattern, 1200);
  }, []);

  const stopAlarm = useCallback(() => {
    if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
    }
  }, []);

  // --- AUTH & DEEP LINK HANDLER ---
  useEffect(() => {
    if (window.electron?.onAuthData) {
      window.electron.onAuthData((data: any) => {
        // Data comes from schoolhelper:// link (via Electron)
        console.log("Received Auth Data:", data);
        if (data.email) {
            const newUser: UserInfo = {
                displayName: data.displayName || data.email.split('@')[0],
                email: data.email,
                isPremium: data.isPremium,
                licenseKey: data.licenseKey,
                validUntil: data.validUntil,
                photoUrl: data.photoUrl, // Capture Photo URL from Google
                accessToken: data.accessToken // Might be null with new flow
            };
            handleLoginSuccess(newUser);
        }
      });
    }
  }, []);

  // --- APP SYNC & BACKGROUND CHECK (FIXED) ---
  useEffect(() => {
      const syncApp = async () => {
          // Определяем платформу (В базе данных используется "PC", а не "Windows")
          const platform = window.electron ? 'PC' : 'Web';
          
          // Формируем payload точно по спецификации
          const payload = {
              platform,
              current_version: APP_VERSION,
              email: isLoggedIn ? userInfo?.email : undefined,
              // Backend might use token for additional verification
              google_token: isLoggedIn ? userInfo?.accessToken : undefined
          };

          try {
              console.log("App Sync Payload:", payload); // Debug
              const response = await fetch('https://school-helper.ru/api.php?action=app_sync', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
              });

              if (response.ok) {
                  const data = await response.json();
                  console.log("App Sync Response:", data); // Debug
                  
                  // 1. Version Check
                  // Если latest_version на сервере новее текущей -> БЛОКИРУЕМ
                  if (data.latest_version && compareVersions(data.latest_version, APP_VERSION) > 0) {
                      setIsUpdateRequired(true);
                      return; 
                  } else {
                      setIsUpdateRequired(false);
                  }

                  // 2. Sync User Info (if logged in and data returned)
                  // Обновляем статус премиума и лицензии
                  if (isLoggedIn && userInfo) {
                      // FIX: Сервер возвращает данные внутри 'user_status'. Добавлена поддержка вложенности.
                      const serverUser = data.user_status || data;
                      
                      const isPremium = serverUser.is_premium === true || serverUser.is_premium === '1' || serverUser.is_premium === 1 || serverUser.is_premium === 'true';
                      
                      const updatedUser = { 
                          ...userInfo, 
                          isPremium: isPremium,
                          licenseKey: serverUser.license_key || userInfo.licenseKey,
                          validUntil: serverUser.premium_until || userInfo.validUntil
                      };
                      
                      // Only update state if something changed to avoid re-renders
                      if (JSON.stringify(updatedUser) !== JSON.stringify(userInfo)) {
                          console.log("Updating user info from server sync");
                          setUserInfo(updatedUser);
                          saveConfig({ userInfo: updatedUser });
                      }
                  }
              }
          } catch (e) {
              console.error("App Sync Failed:", e);
              // Fail silently for network errors to allow offline use
          }
      };

      // Run on mount and whenever login status changes
      // Добавили небольшую задержку, чтобы убедиться, что стейт загрузился
      const timeout = setTimeout(syncApp, 2000);
      
      // Run interval check every 10 minutes
      const interval = setInterval(syncApp, 10 * 60 * 1000);
      
      return () => {
          clearTimeout(timeout);
          clearInterval(interval);
      };
  }, [isLoggedIn, userInfo?.email, userInfo?.accessToken]);

  // --- SYNC TOKEN EFFECT ---
  useEffect(() => {
    if (window.electron?.setAuthToken) {
       window.electron.setAuthToken(userInfo?.accessToken || null);
    }
  }, [userInfo]);

  // --- APP INIT EFFECT ---
  useEffect(() => {
    const isFirstLaunch = !localStorage.getItem('school_helper_launch_complete');
    const loadDuration = isFirstLaunch ? 5000 : 1000;

    const timer = setTimeout(() => {
       setIsAppReady(true);
       if (isFirstLaunch) {
         localStorage.setItem('school_helper_launch_complete', 'true');
       }
    }, loadDuration);

    if ("Notification" in window) {
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }

    return () => {
        clearTimeout(timer);
        stopAlarm();
        if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, [stopAlarm]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // --- TIMER LOGIC ---
  useEffect(() => {
    let interval: number | null = null;
    if ((timerStatus === 'running' || timerStatus === 'finished') && timerTarget) {
        interval = window.setInterval(() => {
            const now = Date.now();
            const left = Math.ceil((timerTarget - now) / 1000);
            setTimerRemaining(left);
            if (left <= 0 && timerStatus !== 'finished') {
                setTimerStatus('finished');
            }
        }, 200);
    }
    if (timerStatus === 'finished') playAlarm();
    else stopAlarm();

    return () => { if (interval) clearInterval(interval); };
  }, [timerStatus, timerTarget, playAlarm, stopAlarm]);

  const handleTimerStart = (seconds: number) => {
    initAudio(); 
    if (timerStatus === 'idle' || timerStatus === 'finished') {
        setTimerInitial(seconds);
        setTimerRemaining(seconds);
        setTimerTarget(Date.now() + seconds * 1000);
        setTimerStatus('running');
    } else if (timerStatus === 'paused') {
        setTimerTarget(Date.now() + timerRemaining * 1000);
        setTimerStatus('running');
    }
  };

  const handleTimerPause = () => {
    if (timerStatus === 'running') {
        setTimerStatus('paused');
        setTimerTarget(null);
    }
  };

  const handleTimerReset = () => {
    stopAlarm();
    setTimerStatus('idle');
    setTimerTarget(null);
    setTimerRemaining(0);
    setTimerInitial(0);
  };

  const handleSwToggle = () => {
      if (swStart) {
          setSwAccumulated(prev => prev + (Date.now() - swStart));
          setSwStart(null);
      } else {
          setSwStart(Date.now());
      }
  };

  const handleSwReset = () => {
      setSwStart(null);
      setSwAccumulated(0);
      setSwLaps([]);
  };

  const handleSwLap = () => {
      const currentTotal = swAccumulated + (swStart ? Date.now() - swStart : 0);
      setSwLaps(prev => [currentTotal, ...prev]);
  };


  useEffect(() => {
    localStorage.setItem('school_helper_planner_events', JSON.stringify(plannerEvents));

    const checkNotifications = () => {
        if (!("Notification" in window)) return;
        if (Notification.permission !== "granted") return;
        
        // --- PREMIUM RESTRICTION: Notifications ---
        if (!userInfo?.isPremium) return;

        const now = Date.now();
        plannerEvents.forEach(event => {
            if (event.completed) return;
            const remindKey = `remind-${event.id}`;
            const dueKey = `due-${event.id}`;

            if (event.reminderMinutes && event.reminderMinutes > 0) {
                const remindTime = event.dueDate - (event.reminderMinutes * 60 * 1000);
                const diff = now - remindTime;
                if (diff >= 0 && diff < 60000 && !notifiedEventsRef.current.has(remindKey)) {
                     new Notification("Школьный Помощник: Напоминание", {
                        body: `"${event.text}" через ${event.reminderMinutes} мин.`,
                        icon: '/icon.png',
                        tag: remindKey
                     });
                     notifiedEventsRef.current.add(remindKey);
                }
            }

            const dueDiff = now - event.dueDate;
            if (dueDiff >= 0 && dueDiff < 60000 && !notifiedEventsRef.current.has(dueKey)) {
                new Notification("Школьный Помощник: Время пришло!", {
                    body: `Задача "${event.text}" сейчас!`,
                    icon: '/icon.png',
                    tag: dueKey
                 });
                 notifiedEventsRef.current.add(dueKey);
            }
        });
    };

    const interval = setInterval(checkNotifications, 10000);
    return () => clearInterval(interval);
  }, [plannerEvents, userInfo?.isPremium]);

  const toggleSidebar = () => {
    const newVal = !isSidebarCollapsed;
    setIsSidebarCollapsed(newVal);
    saveConfig({ isSidebarCollapsed: newVal });
  };

  const toggleTheme = () => {
    const newVal = !isDarkMode;
    setIsDarkMode(newVal);
    saveConfig({ themeMode: newVal ? 'dark' : 'light' });
  };

  const handleLoginSuccess = (user: UserInfo) => {
    setIsLoggedIn(true);
    setUserInfo(user);
    setShowWelcome(false);
    saveConfig({ isLoggedIn: true, userInfo: user, skipWelcome: true });
  };

  const handleUpdateUser = (updatedUser: UserInfo) => {
    setUserInfo(updatedUser);
    saveConfig({ isLoggedIn: true, userInfo: updatedUser });
  };

  const handleLogout = () => {
    if (userInfo?.accessToken && userInfo.accessToken !== 'mock_token_dev_mode' && typeof google !== 'undefined') {
        try { google.accounts.oauth2.revoke(userInfo.accessToken, () => {}); } catch(e) {}
    }
    setIsLoggedIn(false);
    setUserInfo(null);
    setShowWelcome(true); 
    saveConfig({ isLoggedIn: false, userInfo: null, skipWelcome: false });
  };

  const handleSkipWelcome = (persist: boolean) => {
    setShowWelcome(false);
    if (persist) saveConfig({ skipWelcome: true });
  };

  const handleResetWelcome = () => {
    setIsLoggedIn(false);
    setUserInfo(null);
    setShowWelcome(true);
    saveConfig({ isLoggedIn: false, userInfo: null, skipWelcome: false });
  };

  const handleDevLogin = () => {
    const devUser: UserInfo = {
      displayName: "Тестовый Ученик",
      email: "student@school-helper.dev",
      accessToken: "mock_token_dev_mode",
      isPremium: true
    };
    handleLoginSuccess(devUser);
  };

  const initiateGoogleLogin = async () => {
    if (window.electron && window.electron.loginGoogle) {
      try {
        await window.electron.loginGoogle(); 
      } catch (e: any) {
        alert(`Критическая ошибка: ${e.message || e}`);
      }
      return;
    }
    alert("Для веб-версии функционал входа ограничен.");
  };

  const handleStartNoteCreation = useCallback(() => {
    if (noteCreationStatus === 'creating') return;
    setNoteCreationStatus('creating');
    setTimeout(() => {
      const STORAGE_KEY = 'school_helper_notes_v3';
      let currentNotes: Note[] = [];
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) currentNotes = JSON.parse(saved);
      } catch (e) { console.error(e); }

      const newId = Math.floor(Date.now() / 1000);
      const newNote: Note = {
        id: newId,
        title: 'Новая заметка',
        timestamp: Date.now(),
        content: [{ type: 'TextBlock', id: Math.random().toString(36).substr(2, 9), text: '', styles: [] }]
      };

      const updatedNotes = [newNote, ...currentNotes];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes));
      setNoteCreationStatus('success');
      setNotesRefreshTrigger(prev => prev + 1);
      setTimeout(() => setNoteCreationStatus('idle'), 3000);
    }, 500); 
  }, [noteCreationStatus]);

  // --- AI Logic ---
  const handleAiSend = async (text: string) => {
    // --- PREMIUM RESTRICTION: 8 Messages / Day ---
    if (!userInfo?.isPremium) {
       const today = new Date().toDateString();
       let usage = { date: today, count: 0 };
       try {
          const savedUsage = localStorage.getItem('ai_daily_usage');
          if (savedUsage) {
             const parsed = JSON.parse(savedUsage);
             if (parsed.date === today) {
                usage = parsed;
             }
          }
       } catch (e) {}

       if (usage.count >= 8) {
           triggerPremiumModal('ai');
           return;
       }

       usage.count++;
       localStorage.setItem('ai_daily_usage', JSON.stringify(usage));
    }

    if (isAiLoading) return;
    setIsAiLoading(true);
    isAiStreamingRef.current = true;
    abortControllerRef.current = new AbortController(); 

    setAiMessages(prev => [...prev, { role: 'user', text: text }]);
    setAiMessages(prev => [...prev, { role: 'model', text: '', isStreaming: true }]);

    try {
      const history = aiMessages
        .filter(m => !m.isError)
        .map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      
      const stream = await streamMessageFromGemini(text, history, aiSelectedModel, undefined, abortControllerRef.current.signal);
      let fullText = "";

      for await (const chunk of stream) {
        if (!isAiStreamingRef.current) break;
        fullText += (chunk as any).text || "";
        setAiMessages(prev => {
          const newArr = [...prev];
          const lastIdx = newArr.length - 1;
          if (newArr[lastIdx]) {
             newArr[lastIdx] = { ...newArr[lastIdx], text: fullText };
          }
          return newArr;
        });
      }

      setAiMessages(prev => {
        const newArr = [...prev];
        if(newArr[newArr.length - 1]) newArr[newArr.length - 1] = { ...newArr[newArr.length - 1], isStreaming: false };
        return newArr;
      });
    } catch (e: any) {
      if (e.name === 'AbortError') {
         setAiMessages(prev => {
            const newArr = [...prev];
            const lastIdx = newArr.length - 1;
            if (lastIdx >= 0 && newArr[lastIdx].role === 'model') {
               const currentText = newArr[lastIdx].text;
               newArr[lastIdx] = { 
                 role: 'model', 
                 text: currentText ? currentText + " [Отменено]" : "Генерация отменена", 
                 isStreaming: false,
                 isError: true 
               };
            }
            return newArr;
         });
         return;
      }
      console.error(e);
      setAiMessages(prev => {
        const newArr = [...prev];
        const lastIdx = newArr.length - 1;
        if (lastIdx >= 0) {
           let errorMsg = `Ошибка: ${e.message || 'Неизвестная ошибка'}`;
           newArr[lastIdx] = { role: 'model', text: errorMsg, isError: true };
        }
        return newArr;
      });
    } finally {
      setIsAiLoading(false);
      isAiStreamingRef.current = false;
      abortControllerRef.current = null;
    }
  };

  const handleAiStop = () => {
      isAiStreamingRef.current = false;
      if (abortControllerRef.current) {
          abortControllerRef.current.abort(); 
      }
      setIsAiLoading(false);
  };

  const handleAiClear = () => {
    isAiStreamingRef.current = false;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setIsAiLoading(false);
    setAiMessages([]);
    localStorage.removeItem('school_helper_ai_session');
  };

  const renderContent = () => {
    const props = { isDarkMode };
    switch (activeSection) {
      case SectionId.Grades: return <GradesPage {...props} isLoggedIn={isLoggedIn} isPremium={userInfo?.isPremium} onTriggerPremium={triggerPremiumModal} />;
      case SectionId.Notes: return (
        <NotesPage 
            {...props} 
            isLoggedIn={isLoggedIn} 
            isPremium={userInfo?.isPremium}
            onTriggerPremium={triggerPremiumModal}
            refreshTrigger={notesRefreshTrigger}
            onCreateNote={handleStartNoteCreation}
            isCreatingGlobal={noteCreationStatus === 'creating'}
        />
      );
      case SectionId.Drawing: return <DrawingPage {...props} />;
      case SectionId.Calculator: return <CalculatorPage {...props} isPremium={userInfo?.isPremium} onTriggerPremium={triggerPremiumModal} />;
      case SectionId.AI: return (
        <AIPage 
            {...props} 
            userInfo={userInfo}
            messages={aiMessages}
            setMessages={setAiMessages}
            isLoading={isAiLoading}
            onSend={handleAiSend}
            onStop={handleAiStop}
            onClear={handleAiClear}
            selectedModel={aiSelectedModel}
            setSelectedModel={setAiSelectedModel}
            isAppReady={isAppReady}
        />
      );
      case SectionId.Settings: return (
        <SettingsPage 
          userInfo={userInfo} 
          isDarkMode={isDarkMode} 
          onToggleTheme={toggleTheme} 
          onLogout={handleLogout}
          onGoogleLogin={initiateGoogleLogin}
          onResetWelcome={handleResetWelcome}
          onUpdateUser={handleUpdateUser}
        />
      );
      case SectionId.Converter: return <ConverterPage {...props} />;
      case SectionId.Planner: return (
          <PlannerPage 
            {...props} 
            isLoggedIn={isLoggedIn} 
            isPremium={userInfo?.isPremium}
            onTriggerPremium={triggerPremiumModal}
            events={plannerEvents}
            setEvents={setPlannerEvents}
          />
      );
      case SectionId.Stopwatch: return (
        <StopwatchPage 
            {...props}
            startTime={swStart}
            accumulated={swAccumulated}
            laps={swLaps}
            onToggle={handleSwToggle}
            onReset={handleSwReset}
            onLap={handleSwLap}
        />
      );
      case SectionId.Timer: return (
        <TimerPage 
            {...props} 
            totalSeconds={timerRemaining}
            initialTotal={timerInitial}
            status={timerStatus}
            onStart={handleTimerStart}
            onPause={handleTimerPause}
            onReset={handleTimerReset}
        />
      );
      default: return <div className={isDarkMode ? "text-white" : "text-gray-800"}>Раздел в разработке...</div>;
    }
  };

  return (
    <>
      <LogViewer isOpen={showLogs} onClose={() => setShowLogs(false)} />
      
      <LoadingScreen isFinished={isAppReady} />
      
      {isUpdateRequired && <UpdateScreen isDarkMode={isDarkMode} />}

      <PremiumModal 
        isOpen={showPremiumModal} 
        onClose={() => setShowPremiumModal(false)} 
        isDarkMode={isDarkMode}
        triggerSource={premiumTrigger}
      />

      {showWelcome && isAppReady && !isUpdateRequired ? (
        <div className="w-full h-full">
          <WelcomeScreen 
            onGoogleLogin={initiateGoogleLogin} 
            onDevLogin={handleDevLogin}
            onSkip={handleSkipWelcome} 
            isDarkMode={isDarkMode} 
            currentOrigin={window.location.origin}
          />
        </div>
      ) : (
        <div className={`flex w-screen h-screen overflow-hidden transition-opacity duration-300 ${isDarkMode ? 'bg-[#202225] text-white' : 'bg-[#e3e5e8] text-gray-900'} ${!isAppReady ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex w-full h-full">
            <Sidebar 
              activeId={activeSection} 
              onSelect={setActiveSection} 
              isDarkMode={isDarkMode} 
              userInfo={userInfo}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={toggleSidebar}
            />

            <div className="flex flex-col flex-1 overflow-hidden relative">
              <Header activeLabel={SECTIONS.find(s => s.id === activeSection)?.label || ''} isDarkMode={isDarkMode} />
              
              <main className="flex-1 overflow-hidden p-3 md:p-6 relative z-0">
                <div className={`rounded-xl shadow-2xl p-4 md:p-6 h-full overflow-y-auto transition-colors duration-300 ${isDarkMode ? 'bg-[#2f3136]' : 'bg-white'}`}>
                    {renderContent()}
                </div>
              </main>

              {noteCreationStatus !== 'idle' && (
                <div className={`fixed bottom-6 left-6 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-[9999] animate-in slide-in-from-left-5 fade-in duration-300 group ${isDarkMode ? 'bg-[#202225] border border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                    {noteCreationStatus === 'creating' ? (
                        <>
                            <Loader2 size={18} className="text-[#eb459e] animate-spin" />
                            <span className="text-sm font-medium pr-6">Создание заметки...</span>
                        </>
                    ) : (
                        <>
                            <CheckCircle size={18} className="text-green-500" />
                            <span className="text-sm font-medium pr-6">Заметка создана</span>
                        </>
                    )}
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); setNoteCreationStatus('idle'); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <X size={14} />
                    </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;