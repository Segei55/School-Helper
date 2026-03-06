
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Timer, Shuffle, Play, Pause, RotateCcw, Volume2, User, Users } from 'lucide-react';

interface TeacherToolsPageProps {
  isDarkMode: boolean;
}

const TeacherToolsPage: React.FC<TeacherToolsPageProps> = ({ isDarkMode }) => {
  const [activeTool, setActiveTool] = useState<'menu' | 'timer' | 'noise' | 'random'>('menu');

  // --- BIG TIMER LOGIC ---
  const [timerTime, setTimerTime] = useState(0);
  const [timerInput, setTimerInput] = useState(15); // minutes
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    let interval: number;
    if (isTimerRunning && timerTime > 0) {
      interval = window.setInterval(() => setTimerTime(t => t - 1), 1000);
    } else if (timerTime === 0 && isTimerRunning) {
       setIsTimerRunning(false);
       // Play sound
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerTime]);

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- NOISE METER LOGIC ---
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [noiseThreshold, setNoiseThreshold] = useState(70);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number | null>(null);

  const startMonitoring = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
        setIsMonitoring(true);
        updateNoise();
    } catch (e) {
        alert("Нет доступа к микрофону");
    }
  };

  const updateNoise = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      const avg = dataArrayRef.current.reduce((a,b) => a+b) / dataArrayRef.current.length;
      setNoiseLevel(avg);
      rafRef.current = requestAnimationFrame(updateNoise);
  };

  const stopMonitoring = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      setIsMonitoring(false);
      setNoiseLevel(0);
  };

  useEffect(() => {
      return () => stopMonitoring();
  }, []);

  const isTooLoud = noiseLevel > noiseThreshold;

  // --- RANDOMIZER LOGIC ---
  const [studentList, setStudentList] = useState('');
  const [randomResult, setRandomResult] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const rollStudent = () => {
      const names = studentList.split('\n').filter(n => n.trim());
      if (names.length === 0) return;
      
      setIsRolling(true);
      let count = 0;
      const interval = setInterval(() => {
          setRandomResult(names[Math.floor(Math.random() * names.length)]);
          count++;
          if (count > 20) {
              clearInterval(interval);
              setIsRolling(false);
          }
      }, 100);
  };

  const cardBg = isDarkMode ? 'bg-[#2f3136] hover:bg-[#36393f]' : 'bg-white hover:bg-gray-50';

  return (
    <div className={`h-full flex flex-col ${isTooLoud && activeTool === 'noise' ? 'bg-red-500 animate-pulse' : ''}`}>
      {activeTool !== 'menu' && (
          <button onClick={() => { setActiveTool('menu'); stopMonitoring(); }} className="absolute top-4 left-4 z-50 px-4 py-2 bg-black/20 text-white rounded-lg backdrop-blur-md">
              ← Назад
          </button>
      )}

      {activeTool === 'menu' && (
          <div className="flex-1 flex items-center justify-center p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                  <button onClick={() => setActiveTool('timer')} className={`p-8 rounded-3xl shadow-xl transition-all transform hover:scale-105 ${cardBg} flex flex-col items-center gap-4 text-center`}>
                      <div className="w-20 h-20 rounded-full bg-[#f47b67]/20 text-[#f47b67] flex items-center justify-center"><Timer size={40} /></div>
                      <h3 className="text-xl font-bold">Большой Таймер</h3>
                      <p className="opacity-60 text-sm">Для контрольных и тестов</p>
                  </button>
                  <button onClick={() => setActiveTool('noise')} className={`p-8 rounded-3xl shadow-xl transition-all transform hover:scale-105 ${cardBg} flex flex-col items-center gap-4 text-center`}>
                      <div className="w-20 h-20 rounded-full bg-[#ed4245]/20 text-[#ed4245] flex items-center justify-center"><Mic size={40} /></div>
                      <h3 className="text-xl font-bold">Шумомер</h3>
                      <p className="opacity-60 text-sm">Контроль тишины в классе</p>
                  </button>
                  <button onClick={() => setActiveTool('random')} className={`p-8 rounded-3xl shadow-xl transition-all transform hover:scale-105 ${cardBg} flex flex-col items-center gap-4 text-center`}>
                      <div className="w-20 h-20 rounded-full bg-[#9b84ec]/20 text-[#9b84ec] flex items-center justify-center"><Shuffle size={40} /></div>
                      <h3 className="text-xl font-bold">Рандомайзер</h3>
                      <p className="opacity-60 text-sm">Выбор ученика для ответа</p>
                  </button>
              </div>
          </div>
      )}

      {activeTool === 'timer' && (
          <div className="flex-1 flex flex-col items-center justify-center">
              <div className={`font-mono font-bold text-[15vw] leading-none tabular-nums ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {formatTime(timerTime)}
              </div>
              <div className="mt-12 flex gap-6 items-center">
                  {!isTimerRunning ? (
                      <>
                        <div className="flex items-center gap-2 mr-4">
                            <input type="number" value={timerInput} onChange={e => setTimerInput(Number(e.target.value))} className="w-20 p-2 text-xl font-bold rounded-lg bg-white/10 text-center" />
                            <span className="font-bold opacity-50">мин</span>
                        </div>
                        <button onClick={() => { setTimerTime(timerInput * 60); setIsTimerRunning(true); }} className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center hover:scale-105 transition-transform"><Play size={40} className="text-white ml-2" /></button>
                      </>
                  ) : (
                      <button onClick={() => setIsTimerRunning(false)} className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center hover:scale-105 transition-transform"><Pause size={40} className="text-white" /></button>
                  )}
                  <button onClick={() => { setIsTimerRunning(false); setTimerTime(timerInput * 60); }} className="w-16 h-16 bg-gray-500/20 rounded-full flex items-center justify-center hover:bg-gray-500/40 transition-colors"><RotateCcw size={24} /></button>
              </div>
          </div>
      )}

      {activeTool === 'noise' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
             {/* Background Meter */}
             <div className="absolute bottom-0 left-0 right-0 bg-green-500 transition-all duration-100 opacity-20" style={{ height: `${(noiseLevel / 255) * 100}%` }} />
             
             <div className="relative z-10 flex flex-col items-center gap-8">
                 <div className={`p-8 rounded-full border-8 ${isTooLoud ? 'border-red-500 text-red-500 bg-red-500/10 scale-110' : 'border-green-500 text-green-500 bg-green-500/10'} transition-all duration-100 w-64 h-64 flex items-center justify-center`}>
                    <Volume2 size={80} />
                 </div>
                 
                 <div className="flex flex-col items-center gap-2">
                     <label className="text-xs font-bold uppercase opacity-50">Порог шума</label>
                     <input type="range" min="0" max="255" value={noiseThreshold} onChange={e => setNoiseThreshold(Number(e.target.value))} className="w-64" />
                 </div>

                 <button onClick={isMonitoring ? stopMonitoring : startMonitoring} className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg ${isMonitoring ? 'bg-red-500' : 'bg-green-500'}`}>
                     {isMonitoring ? 'Стоп' : 'Начать мониторинг'}
                 </button>
             </div>
          </div>
      )}

      {activeTool === 'random' && (
          <div className="flex-1 flex flex-col md:flex-row gap-8 p-8 max-w-5xl mx-auto w-full">
              <div className={`flex-1 p-6 rounded-3xl shadow-xl flex flex-col ${isDarkMode ? 'bg-[#2f3136]' : 'bg-white'}`}>
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Users size={20} /> Список учеников</h3>
                  <textarea 
                    value={studentList}
                    onChange={e => setStudentList(e.target.value)}
                    placeholder="Иванов Иван&#10;Петров Петр&#10;Сидоров..."
                    className={`flex-1 w-full bg-transparent resize-none outline-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                  />
              </div>

              <div className="flex-1 flex flex-col items-center justify-center gap-8">
                  <div className={`w-full aspect-video rounded-3xl flex items-center justify-center text-4xl font-bold text-center p-4 transition-all ${randomResult ? 'scale-105 bg-gradient-to-br from-[#5865f2] to-[#9b84ec] text-white shadow-2xl' : (isDarkMode ? 'bg-white/5 text-gray-500' : 'bg-gray-100 text-gray-400')}`}>
                      {randomResult || "Нажмите кнопку"}
                  </div>
                  
                  <button 
                    onClick={rollStudent} 
                    disabled={isRolling || !studentList.trim()}
                    className="px-12 py-4 bg-[#9b84ec] text-white font-bold rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                  >
                      {isRolling ? 'Выбор...' : 'К доске пойдет...'}
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default TeacherToolsPage;
