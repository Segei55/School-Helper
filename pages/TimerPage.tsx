
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, X, BellRing } from 'lucide-react';

interface TimerPageProps {
  isDarkMode?: boolean;
  totalSeconds: number;
  initialTotal: number;
  status: 'idle' | 'running' | 'paused' | 'finished';
  onStart: (seconds: number) => void;
  onPause: () => void;
  onReset: () => void;
}

// --- Constants ---
const ITEM_HEIGHT = 60; // Height of one digit in pixels
const VISIBLE_ITEMS = 3; // How many items visible at once (window height)

// --- Helper Component: Infinite Draggable Wheel ---
interface TimeColumnProps {
  max: number;
  value: number;
  onChange: (val: number) => void;
  label: string;
  isDarkMode: boolean;
}

const TimeColumn: React.FC<TimeColumnProps> = ({ max, value, onChange, label, isDarkMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Create 3 sets of the range for infinite scrolling
  const range = Array.from({ length: max + 1 }, (_, i) => i);
  const infiniteList = [...range, ...range, ...range]; 
  const setHeight = (max + 1) * ITEM_HEIGHT;

  const isInteracting = useRef(false);
  const scrollTimeout = useRef<number | null>(null);

  // Mouse Drag State
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startScroll = useRef(0);

  // Initial Position: Middle Set
  useEffect(() => {
    if (containerRef.current) {
        containerRef.current.scrollTop = setHeight + (value * ITEM_HEIGHT);
    }
  }, []);

  // Sync prop changes (only if not interacting)
  useEffect(() => {
    if (!isInteracting.current && containerRef.current) {
        containerRef.current.scrollTop = setHeight + (value * ITEM_HEIGHT);
    }
  }, [value, setHeight]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollTop = target.scrollTop;

    // Infinite Loop Logic (Jump instantly)
    if (scrollTop < setHeight / 2) {
        target.scrollTop = scrollTop + setHeight;
    } else if (scrollTop > setHeight * 2.5) {
        target.scrollTop = scrollTop - setHeight;
    }

    // Debounce snap
    isInteracting.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

    scrollTimeout.current = window.setTimeout(() => {
        isInteracting.current = false;
        snapToNearest(target);
    }, 100);
  };

  const snapToNearest = (target: HTMLDivElement) => {
    const currentScroll = target.scrollTop;
    const rawIndex = Math.round(currentScroll / ITEM_HEIGHT);

    target.scrollTo({
        top: rawIndex * ITEM_HEIGHT,
        behavior: 'smooth'
    });

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
    }
  };

  return (
    <div className="flex flex-col items-center">
      <span className={`text-xs font-bold uppercase mb-2 tracking-widest select-none ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        {label}
      </span>
      <div 
        className="relative w-24 overflow-hidden select-none cursor-grab active:cursor-grabbing group"
        style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUpOrLeave}
        onMouseLeave={onMouseUpOrLeave}
      >
        {/* Gradients */}
        <div className={`absolute top-0 left-0 right-0 h-[50px] z-10 pointer-events-none bg-gradient-to-b ${isDarkMode ? 'from-[#2f3136] to-transparent' : 'from-white to-transparent'}`} />
        <div className={`absolute bottom-0 left-0 right-0 h-[50px] z-10 pointer-events-none bg-gradient-to-t ${isDarkMode ? 'from-[#2f3136] to-transparent' : 'from-white to-transparent'}`} />
        
        {/* Highlight Bar */}
        <div className={`absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[60px] border-y ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'} z-0 pointer-events-none`} />

        {/* Scrollable List */}
        <div 
          ref={containerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto no-scrollbar"
          style={{ scrollBehavior: 'auto' }}
        >
          <div style={{ height: ITEM_HEIGHT }} /> 
          {infiniteList.map((val, i) => (
            <div 
              key={i}
              className={`flex items-center justify-center transition-all duration-200 ${val === value ? `font-bold scale-110 ${isDarkMode ? 'text-white' : 'text-gray-900'}` : `opacity-40 scale-90 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`}`}
              style={{ height: ITEM_HEIGHT, fontSize: '24px' }}
            >
              {String(val).padStart(2, '0')}
            </div>
          ))}
          <div style={{ height: ITEM_HEIGHT }} />
        </div>
      </div>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

const TimerPage: React.FC<TimerPageProps> = ({ 
    isDarkMode = true, 
    totalSeconds,
    initialTotal,
    status,
    onStart,
    onPause,
    onReset
}) => {
  // Picker State
  const [pickHours, setPickHours] = useState(0);
  const [pickMinutes, setPickMinutes] = useState(0);
  const [pickSeconds, setPickSeconds] = useState(0);

  const startTimer = () => {
    const total = pickHours * 3600 + pickMinutes * 60 + pickSeconds;
    if (total === 0) return;
    onStart(total);
  };

  const resumeTimer = () => {
    onStart(totalSeconds);
  }

  const formatDisplay = (s: number) => {
    const isNegative = s < 0;
    const absS = Math.abs(s);
    
    const h = Math.floor(absS / 3600);
    const m = Math.floor((absS % 3600) / 60);
    const sec = absS % 60;
    
    const timeStr = h > 0 
        ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
        : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        
    return isNegative ? `-${timeStr}` : timeStr;
  };

  const containerBg = isDarkMode ? 'bg-[#2f3136]' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';

  const isSetupMode = status === 'idle' && initialTotal === 0;

  return (
    <div className={`h-full flex flex-col items-center justify-center p-4 ${textColor}`}>
      
      {isSetupMode ? (
        // --- SETUP MODE (WHEELS) ---
        <div className="flex flex-col items-center animate-in zoom-in-95 duration-300">
           <div className={`p-4 sm:p-8 rounded-3xl shadow-2xl border mb-10 flex gap-2 md:gap-8 items-center ${containerBg} ${isDarkMode ? 'border-white/5' : 'border-gray-200'}`}>
              <TimeColumn max={23} value={pickHours} onChange={setPickHours} label="Часы" isDarkMode={isDarkMode} />
              <div className={`h-[150px] flex items-center text-2xl sm:text-4xl font-bold opacity-10 pb-4 ${textColor}`}>:</div>
              <TimeColumn max={59} value={pickMinutes} onChange={setPickMinutes} label="Минуты" isDarkMode={isDarkMode} />
              <div className={`h-[150px] flex items-center text-2xl sm:text-4xl font-bold opacity-10 pb-4 ${textColor}`}>:</div>
              <TimeColumn max={59} value={pickSeconds} onChange={setPickSeconds} label="Секунды" isDarkMode={isDarkMode} />
           </div>

           <button 
             onClick={startTimer}
             className="w-20 h-20 rounded-full bg-[#3ba55c] hover:bg-[#2d7d46] text-white flex items-center justify-center shadow-xl transition-all transform hover:scale-110 active:scale-95"
           >
             <Play size={32} className="ml-1" />
           </button>
        </div>
      ) : (
        // --- RUNNING / PAUSED / FINISHED MODE ---
        <div className="flex flex-col items-center animate-in fade-in duration-500 relative">
           
           {/* Timer Circle Display */}
           <div className="relative mb-12">
              <svg className="w-[300px] h-[300px] transform -rotate-90">
                 {/* Background Circle */}
                 <circle
                   cx="150" cy="150" r="135"
                   stroke={isDarkMode ? '#202225' : '#e5e7eb'}
                   strokeWidth="15" fill="transparent"
                 />
                 {/* Progress Circle */}
                 {/* When finished (negative), we keep the circle full but red */}
                 <circle
                   cx="150" cy="150" r="135"
                   stroke={status === 'finished' ? '#ed4245' : '#f47b67'}
                   strokeWidth="15" fill="transparent"
                   strokeDasharray="848" // 2 * PI * 135
                   strokeDashoffset={
                       status === 'finished'
                       ? 0 // Full circle when ringing
                       : (initialTotal > 0 ? 848 - (848 * ((initialTotal - totalSeconds) / initialTotal)) : 0)
                   }
                   strokeLinecap="round"
                   className={`transition-all duration-1000 ease-linear ${status === 'finished' ? 'animate-pulse' : ''}`}
                 />
              </svg>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <div className={`font-mono font-bold tabular-nums tracking-tighter drop-shadow-lg ${totalSeconds >= 3600 || totalSeconds <= -3600 ? 'text-6xl' : 'text-8xl'} ${status === 'finished' ? 'text-[#ed4245]' : 'text-[#f47b67]'}`}>
                    {formatDisplay(totalSeconds)}
                 </div>
                 {status === 'finished' && (
                     <div className="text-sm font-bold uppercase mt-2 text-[#ed4245] animate-bounce flex items-center gap-2">
                        <BellRing size={16} /> Время вышло
                     </div>
                 )}
              </div>
           </div>

           {/* Controls */}
           <div className="flex gap-6">
               {status !== 'finished' && (
                   <button 
                      onClick={status === 'running' ? onPause : resumeTimer}
                      className={`w-20 h-20 rounded-full flex items-center justify-center text-white transition-all shadow-xl transform hover:scale-105 active:scale-95 ${status === 'running' ? 'bg-[#ed4245] hover:bg-red-600' : 'bg-[#3ba55c] hover:bg-green-600'}`}
                   >
                      {status === 'running' ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
                   </button>
               )}
               
               <button 
                  onClick={onReset}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl transform hover:scale-105 active:scale-95 ${status === 'finished' ? 'bg-[#f47b67] hover:bg-[#e06c59] text-white' : (isDarkMode ? 'bg-[#424549] hover:bg-[#52555b] text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-600')}`}
               >
                  {status === 'finished' ? <RotateCcw size={32} /> : <X size={32} />}
               </button>
           </div>
        </div>
      )}

    </div>
  );
};

export default TimerPage;
