
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar as CalendarIcon, X, CheckCircle, Upload, Download, Loader2, Cloud, Bell, AlertTriangle, Lock } from 'lucide-react';
import { PlannerEvent } from '../types';

interface PlannerPageProps {
  isDarkMode?: boolean;
  isLoggedIn: boolean;
  events: PlannerEvent[];
  setEvents: React.Dispatch<React.SetStateAction<PlannerEvent[]>>;
  isPremium?: boolean;
  onTriggerPremium?: (source: string) => void;
}

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// --- WHEEL PICKER CONSTANTS & COMPONENT ---
const ITEM_HEIGHT = 50; 
const VISIBLE_ITEMS = 3; 

interface TimeColumnProps {
  max: number;
  value: number;
  onChange: (val: number) => void;
  label: string;
  isDarkMode: boolean;
}

const TimeColumn: React.FC<TimeColumnProps> = ({ max, value, onChange, label, isDarkMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // We render 3 copies of the list: Top, Middle (Active), Bottom
  // This allows infinite scrolling effect by jumping.
  const range = Array.from({ length: max + 1 }, (_, i) => i);
  const infiniteList = [...range, ...range, ...range]; 
  const setHeight = (max + 1) * ITEM_HEIGHT;
  
  // State to track interactions
  const isInteracting = useRef(false);
  const scrollTimeout = useRef<number | null>(null);

  // Mouse Drag State
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startScroll = useRef(0);

  // Initialize Position to Middle Set
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = setHeight + (value * ITEM_HEIGHT);
    }
  }, []);

  // Sync with props ONLY if not interacting (e.g. initial load or external change)
  useEffect(() => {
    if (!isInteracting.current && containerRef.current) {
       containerRef.current.scrollTop = setHeight + (value * ITEM_HEIGHT);
    }
  }, [value, setHeight]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollTop = target.scrollTop;
    
    // Infinite Loop Logic (Jump instantly without animation)
    if (scrollTop < setHeight / 2) {
       target.scrollTop = scrollTop + setHeight;
    } else if (scrollTop > setHeight * 2.5) {
       target.scrollTop = scrollTop - setHeight;
    }

    // Debounce snapping and state update
    isInteracting.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    
    scrollTimeout.current = window.setTimeout(() => {
        isInteracting.current = false;
        snapToNearest(target);
    }, 100);
  };

  const snapToNearest = (target: HTMLDivElement) => {
    const currentScroll = target.scrollTop;
    let rawIndex = Math.round(currentScroll / ITEM_HEIGHT);
    
    // Smooth snap
    target.scrollTo({ top: rawIndex * ITEM_HEIGHT, behavior: 'smooth' });

    // Determine value
    const actualValue = rawIndex % (max + 1);
    onChange(actualValue);
  };

  // --- Mouse Drag Handlers ---
  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    isInteracting.current = true;
    startY.current = e.clientY;
    if (containerRef.current) {
        startScroll.current = containerRef.current.scrollTop;
    }
    // Cancel any pending snap
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    e.preventDefault();
    const deltaY = e.clientY - startY.current;
    containerRef.current.scrollTop = startScroll.current - deltaY;
  };

  const onMouseUpOrLeave = () => {
    if (isDragging.current) {
        isDragging.current = false;
        // Let the scroll timeout handle the snap after momentum/stop
        if (containerRef.current) {
            // Trigger a manual scroll event logic if needed, but scrollTop change does it automatically
        }
    }
  };

  return (
    <div className="flex flex-col items-center">
      <span className={`text-[10px] font-bold uppercase mb-2 tracking-widest select-none ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{label}</span>
      <div 
        className="relative w-16 overflow-hidden select-none cursor-grab active:cursor-grabbing group rounded-xl border border-transparent hover:border-white/5"
        style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUpOrLeave}
        onMouseLeave={onMouseUpOrLeave}
      >
        <div className={`absolute top-0 left-0 right-0 h-[40px] z-10 pointer-events-none bg-gradient-to-b ${isDarkMode ? 'from-[#202225] to-transparent' : 'from-white to-transparent'}`} />
        <div className={`absolute bottom-0 left-0 right-0 h-[40px] z-10 pointer-events-none bg-gradient-to-t ${isDarkMode ? 'from-[#202225] to-transparent' : 'from-white to-transparent'}`} />
        <div className={`absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[50px] border-y ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'} z-0 pointer-events-none`} />

        <div 
          ref={containerRef} 
          onScroll={handleScroll} 
          className="h-full overflow-y-auto no-scrollbar" 
          style={{ scrollBehavior: 'auto' }}
        >
          <div style={{ height: ITEM_HEIGHT }} /> 
          {infiniteList.map((val, i) => (
            <div key={i} className={`flex items-center justify-center transition-all duration-200 ${val === value ? `font-bold scale-110 ${isDarkMode ? 'text-[#9b84ec]' : 'text-[#9b84ec]'}` : `opacity-40 scale-90 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`}`} style={{ height: ITEM_HEIGHT, fontSize: '20px' }}>
              {String(val).padStart(2, '0')}
            </div>
          ))}
          <div style={{ height: ITEM_HEIGHT }} />
        </div>
      </div>
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
};

const PlannerPage: React.FC<PlannerPageProps> = ({ isDarkMode = true, isLoggedIn, events, setEvents, isPremium, onTriggerPremium }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  
  // Modal Fields
  const [selHour, setSelHour] = useState(12);
  const [selMinute, setSelMinute] = useState(0);
  const [reminderMinutes, setReminderMinutes] = useState<string>("0"); // Input as string for easier typing

  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleExport = async () => {
    if (!isPremium) {
       onTriggerPremium && onTriggerPremium('import_export');
       return;
    }
    if (!isLoggedIn || !window.electron?.driveExport) return;
    setSyncStatus('loading');
    try {
      const content = JSON.stringify(events);
      const success = await window.electron.driveExport('planner.json', content);
      setSyncStatus(success ? 'success' : 'error');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (e) {
      console.error(e);
      setSyncStatus('error');
    }
  };

  const handleImport = async () => {
    if (!isPremium) {
       onTriggerPremium && onTriggerPremium('import_export');
       return;
    }
    if (!isLoggedIn || !window.electron?.driveImport) return;
    if (!confirm("Импорт объединит облачные задачи с локальными по принципу 'самая новая побеждает'. Продолжить?")) return;
    setSyncStatus('loading');
    try {
      const content = await window.electron.driveImport('planner.json');
      if (content) {
        const cloudEvents: PlannerEvent[] = JSON.parse(content);
        const localMap = new Map<string, PlannerEvent>();
        events.forEach(e => localMap.set(String(e.id), e)); 
        cloudEvents.forEach(ce => {
          const local = localMap.get(String(ce.id));
          if (!local) localMap.set(String(ce.id), ce);
        });
        setEvents(Array.from(localMap.values()));
        setSyncStatus('success');
      } else {
        alert("Файл planner.json не найден на Диске.");
        setSyncStatus('error');
      }
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (e) {
      console.error(e);
      setSyncStatus('error');
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => {
    const day = new Date(y, m, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const isToday = (d: number) => {
    const today = new Date();
    return today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
  };

  const currentEvents = useMemo(() => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23,59,59,999);

    return events.filter(e => e.dueDate >= startOfDay.getTime() && e.dueDate <= endOfDay.getTime())
      .sort((a, b) => a.dueDate - b.dueDate);
  }, [events, selectedDate]);

  // Validation Logic
  const isPastTime = useMemo(() => {
    if (!isModalOpen) return false;
    const targetDate = new Date(selectedDate);
    targetDate.setHours(selHour, selMinute, 0, 0);
    return targetDate.getTime() < Date.now();
  }, [selectedDate, selHour, selMinute, isModalOpen]);

  const handleAddEvent = () => {
    // Check for past time one last time
    if (isPastTime) {
        alert("Нельзя создать задачу в прошедшем времени!");
        return;
    }

    const dueDate = new Date(selectedDate);
    dueDate.setHours(selHour, selMinute, 0, 0);

    const newEvent: PlannerEvent = {
      id: Date.now().toString(),
      text: newTitle.trim() || 'Напоминание',
      dueDate: dueDate.getTime(),
      completed: false,
      reminderMinutes: parseInt(reminderMinutes) || 0
    };
    
    setEvents([...events, newEvent]);
    setIsModalOpen(false);
    setNewTitle('');
    setReminderMinutes("0");
  };

  const toggleComplete = (id: string | number) => {
    setEvents(events.map(e => e.id === id ? { ...e, completed: !e.completed } : e));
  };

  const deleteEvent = (id: string | number) => {
    setEvents(events.filter(e => e.id !== id));
  };

  const cardBg = isDarkMode ? 'bg-[#202225] border border-white/5' : 'bg-white border border-gray-200 shadow-sm';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const subTextColor = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const taskCardBg = isDarkMode ? 'bg-[#2f3136] border border-white/5' : 'bg-white border border-gray-100 shadow-sm';

  return (
    <div className={`h-full flex flex-col lg:flex-row gap-6 ${textColor}`}>
      
      {/* Calendar Card */}
      <div className={`flex-1 flex flex-col p-6 rounded-3xl shadow-xl transition-all ${cardBg}`}>
        <div className="flex items-center justify-between mb-8">
          <button onClick={handlePrevMonth} className={`p-2 rounded-xl hover:bg-gray-500/10 transition-colors ${subTextColor}`}><ChevronLeft /></button>
          <div className="text-xl font-bold capitalize flex items-center gap-2">
            <CalendarIcon size={20} className="text-[#9b84ec]" />
            {MONTHS[month]} <span className="opacity-50">{year}</span>
          </div>
          <button onClick={handleNextMonth} className={`p-2 rounded-xl hover:bg-gray-500/10 transition-colors ${subTextColor}`}><ChevronRight /></button>
        </div>

        <div className="grid grid-cols-7 mb-4 text-center text-xs font-bold uppercase tracking-wider opacity-40">
          {WEEKDAYS.map(day => <div key={day}>{day}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-y-4 gap-x-2 flex-1 content-start">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const date = new Date(year, month, day);
            const isSel = selectedDate.getDate() === day && selectedDate.getMonth() === month;
            const hasEv = events.some(e => {
                const d = new Date(e.dueDate);
                return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year && !e.completed;
            });

            // Calculate if this day is in the past compared to today (start of day)
            const todayStart = new Date();
            todayStart.setHours(0,0,0,0);
            const isPastDay = date < todayStart;

            return (
              <div key={day} className="flex flex-col items-center">
                <button
                  onClick={() => setSelectedDate(date)}
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-sm font-bold transition-all relative border-2
                    ${isSel 
                        ? 'bg-[#9b84ec] text-white border-transparent shadow-lg scale-110' 
                        : (isToday(day) 
                            ? 'border-[#9b84ec] text-[#9b84ec]' 
                            : 'border-transparent hover:bg-gray-500/10')
                    }
                    ${isPastDay && !isSel ? 'opacity-30' : ''}
                  `}
                >
                  {day}
                  {hasEv && !isSel && <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#9b84ec]" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task List Panel */}
      <div className="w-full lg:w-96 flex flex-col gap-4 animate-in slide-in-from-right-10 duration-500">
        <div className="flex items-center justify-between px-2">
           <div>
              <h2 className="text-2xl font-bold">Задачи</h2>
              <p className={`text-sm ${subTextColor}`}>{selectedDate.toLocaleDateString()}</p>
           </div>
           <button onClick={() => {
              // Reset modal state
              const now = new Date();
              setSelHour(now.getHours());
              setSelMinute(now.getMinutes());
              setIsModalOpen(true);
           }} className="w-12 h-12 rounded-2xl bg-[#9b84ec] text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95">
              <Plus size={24} />
           </button>
        </div>

        <div className={`p-3 rounded-xl border flex items-center justify-between shrink-0 ${taskCardBg}`}>
          <div className="flex items-center gap-2 opacity-50 text-xs font-bold uppercase"><Cloud size={14} /> Синхронизация</div>
          <div className="flex gap-2">
             <button onClick={handleImport} className={`p-2 rounded-lg transition-colors ${!isLoggedIn ? 'opacity-30' : 'hover:bg-gray-500/20'} ${!isPremium ? 'opacity-70' : ''}`}>
                {!isPremium ? <Lock size={16} /> : (syncStatus === 'loading' ? <Loader2 size={16} className="animate-spin text-[#9b84ec]" /> : <Download size={16} />)}
             </button>
             <button onClick={handleExport} className={`p-2 rounded-lg transition-colors ${!isLoggedIn ? 'opacity-30' : 'hover:bg-gray-500/20'} ${!isPremium ? 'opacity-70' : ''}`}>
               {!isPremium ? <Lock size={16} /> : (syncStatus === 'success' ? <CheckCircle size={16} className="text-green-500" /> : (syncStatus === 'error' ? <AlertTriangle size={16} className="text-red-500" /> : <Upload size={16} />))}
             </button>
          </div>
        </div>

        <div className={`flex-1 rounded-3xl p-4 overflow-y-auto space-y-3 custom-scrollbar min-h-[300px] ${cardBg}`}>
           {currentEvents.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center opacity-20 text-center"><CalendarIcon size={48} className="mb-2" /><p>Задач нет</p></div>
           ) : (
             currentEvents.map(event => (
               <div key={event.id} className={`group p-4 rounded-2xl flex items-center gap-3 transition-all border-l-4 shadow-sm ${event.completed ? 'border-gray-500 opacity-50 bg-gray-100 dark:bg-gray-800' : `border-[#9b84ec] ${taskCardBg}`}`}>
                  <button onClick={() => toggleComplete(event.id)} className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${event.completed ? 'bg-gray-500 border-gray-500' : 'border-gray-500'}`}>
                    {event.completed && <CheckCircle size={14} className="text-white" />}
                  </button>
                  <div className="flex-1 overflow-hidden">
                     <p className={`font-bold leading-tight truncate ${event.completed ? 'line-through' : ''}`}>{event.text}</p>
                     <p className="text-[10px] opacity-40 flex items-center gap-1 mt-1">
                        {new Date(event.dueDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        {event.reminderMinutes ? <span className="flex items-center gap-0.5"><Bell size={8} /> -{event.reminderMinutes}м</span> : null}
                     </p>
                  </div>
                  <button onClick={() => deleteEvent(event.id)} className="opacity-0 group-hover:opacity-100 text-red-500 transition-opacity"><Trash2 size={16} /></button>
               </div>
             ))
           )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className={`w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-[#2f3136]' : 'bg-white'}`}>
              {/* Modal Header with Dynamic Theme */}
              <div className={`${isDarkMode ? 'bg-[#202225] border-white/5' : 'bg-gray-50 border-gray-200'} p-6 flex flex-col items-center relative border-b transition-colors`}>
                <h3 className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-xs font-bold uppercase mb-4 tracking-widest`}>Новая задача</h3>
                
                {/* WHEEL PICKER SECTION */}
                <div className="flex items-center gap-4 mb-2">
                   <TimeColumn max={23} value={selHour} onChange={setSelHour} label="Часы" isDarkMode={isDarkMode} />
                   <div className={`text-2xl font-bold opacity-20 pb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>:</div>
                   <TimeColumn max={59} value={selMinute} onChange={setSelMinute} label="Минуты" isDarkMode={isDarkMode} />
                </div>

                <button onClick={() => setIsModalOpen(false)} className={`absolute top-4 right-4 transition-colors ${isDarkMode ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-800'}`}><X size={24} /></button>
              </div>
              
              <div className="p-6 space-y-4">
                 {isPastTime && (
                     <div className="text-red-400 text-xs text-center font-bold animate-pulse">
                         Нельзя выбрать прошедшее время
                     </div>
                 )}

                 <input 
                    value={newTitle} 
                    onChange={e => setNewTitle(e.target.value)} 
                    placeholder="Описание задачи..." 
                    className={`w-full p-4 rounded-xl outline-none font-bold placeholder-opacity-50 ${isDarkMode ? 'bg-black/20 text-white placeholder-gray-500' : 'bg-gray-100 text-gray-900 placeholder-gray-400'}`} 
                    autoFocus 
                 />
                 
                 {/* PREMIUM REMINDER LOCK */}
                 <div className={`flex items-center gap-3 p-3 rounded-xl border relative overflow-hidden ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                    <Bell size={18} className={isDarkMode ? 'text-[#9b84ec]' : 'text-gray-500'} />
                    <span className={`text-xs font-bold uppercase flex-1 ${subTextColor}`}>Напомнить за (мин):</span>
                    
                    {isPremium ? (
                        <input 
                           type="number" 
                           min="0" 
                           max="1440" 
                           value={reminderMinutes} 
                           onChange={e => setReminderMinutes(e.target.value)}
                           className={`w-16 bg-transparent text-right font-bold outline-none ${textColor}`} 
                        />
                    ) : (
                        <div onClick={() => onTriggerPremium && onTriggerPremium('reminder')} className="flex items-center gap-2 cursor-pointer bg-[#5865f2]/10 px-2 py-1 rounded text-[#5865f2]">
                            <span className="text-xs font-bold">Premium</span>
                            <Lock size={12} />
                        </div>
                    )}
                 </div>

                 <button 
                    onClick={handleAddEvent} 
                    disabled={isPastTime}
                    className={`w-full py-4 rounded-xl font-bold shadow-lg transform transition-all 
                        ${(isPastTime) 
                           ? 'bg-gray-500 opacity-50 cursor-not-allowed' 
                           : 'bg-[#9b84ec] text-white hover:brightness-110 active:scale-95'}`}
                 >
                    Создать
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default PlannerPage;
