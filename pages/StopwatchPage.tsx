
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Flag, Timer } from 'lucide-react';

interface StopwatchPageProps {
  isDarkMode?: boolean;
  startTime: number | null;
  accumulated: number;
  laps: number[];
  onToggle: () => void;
  onReset: () => void;
  onLap: () => void;
}

const StopwatchPage: React.FC<StopwatchPageProps> = ({ 
    isDarkMode = true,
    startTime,
    accumulated,
    laps,
    onToggle,
    onReset,
    onLap
}) => {
  const [displayTime, setDisplayTime] = useState(accumulated);
  const rafRef = useRef<number | null>(null);

  // Animation Loop for Smooth Display
  useEffect(() => {
    if (startTime) {
      const loop = () => {
        setDisplayTime(accumulated + (Date.now() - startTime));
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } else {
      setDisplayTime(accumulated);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [startTime, accumulated]);

  const format = (t: number) => {
    const mins = Math.floor(t / 60000);
    const secs = Math.floor((t % 60000) / 1000);
    const ms = Math.floor((t % 1000) / 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const isRunning = startTime !== null;
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const subTextColor = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDarkMode ? 'bg-[#2f3136] border border-white/5' : 'bg-white border border-gray-200';
  const tableRowBg = isDarkMode ? 'odd:bg-white/5 even:bg-transparent' : 'odd:bg-gray-50 even:bg-white';

  return (
    <div className={`h-full flex flex-col items-center p-4 max-w-2xl mx-auto ${textColor}`}>
      
      {/* Main Timer Display */}
      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-[200px]">
        <div className="text-[70px] md:text-[100px] font-mono font-bold text-[#f47b67] tracking-tighter drop-shadow-lg tabular-nums leading-none mb-8">
          {format(displayTime)}
        </div>
        
        {/* Controls */}
        <div className="flex gap-6 items-center">
          {!isRunning ? (
             <>
               {displayTime > 0 && (
                 <button 
                  onClick={onReset}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-[#424549] text-gray-300' : 'bg-gray-200 text-gray-600'}`}
                  title="Сброс"
                 >
                   <RotateCcw size={24} />
                 </button>
               )}
               <button 
                onClick={onToggle}
                className="w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl hover:scale-105 active:scale-95 bg-[#3ba55c] text-white"
                title="Старт"
               >
                 <Play size={32} className="ml-1" />
               </button>
             </>
          ) : (
            <>
               <button 
                onClick={onLap}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-105 active:scale-95 bg-[#5865f2] text-white`}
                title="Круг"
               >
                 <Flag size={24} />
               </button>
               <button 
                onClick={onToggle}
                className="w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl hover:scale-105 active:scale-95 bg-[#ed4245] text-white"
                title="Пауза"
               >
                 <Pause size={32} />
               </button>
            </>
          )}
        </div>
      </div>

      {/* Laps List */}
      <div className={`w-full flex-1 max-h-[40%] flex flex-col rounded-2xl overflow-hidden shadow-inner ${cardBg}`}>
        <div className={`grid grid-cols-3 p-3 text-xs font-bold uppercase tracking-wider border-b ${isDarkMode ? 'bg-black/20 border-white/5 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
           <div className="text-center">#</div>
           <div className="text-center">Время круга</div>
           <div className="text-center">Общее время</div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
           {laps.length === 0 ? (
             <div className={`h-full flex flex-col items-center justify-center opacity-30 ${subTextColor}`}>
                <Timer size={32} className="mb-2" />
                <p className="text-sm">Нет записанных кругов</p>
             </div>
           ) : (
             laps.map((lapTime, index) => {
               const lapNum = laps.length - index;
               // Calculate split: Current Lap Time - Time of the lap AFTER it (which is physically previous in time)
               // Since laps are stored [newest, ..., oldest]
               // The "previous" lap in time is laps[index + 1]
               const prevLapTotal = laps[index + 1] || 0;
               const splitDuration = lapTime - prevLapTotal;

               return (
                 <div key={lapNum} className={`grid grid-cols-3 p-3 text-sm font-mono border-b border-transparent ${tableRowBg}`}>
                    <div className={`text-center font-bold opacity-50`}>{String(lapNum).padStart(2, '0')}</div>
                    <div className={`text-center ${textColor}`}>{format(splitDuration)}</div>
                    <div className={`text-center ${subTextColor}`}>{format(lapTime)}</div>
                 </div>
               );
             })
           )}
        </div>
      </div>

    </div>
  );
};

export default StopwatchPage;
