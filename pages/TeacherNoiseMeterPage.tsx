import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Volume2, AlertTriangle, Play, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TeacherNoiseMeterPageProps {
  isDarkMode: boolean;
  onBack: () => void;
}

const TeacherNoiseMeterPage: React.FC<TeacherNoiseMeterPageProps> = ({ isDarkMode, onBack }) => {
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);
  const [showPermissionBanner, setShowPermissionBanner] = useState(true);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isTooLoud, setIsTooLoud] = useState(false);
  const [sensitivity, setSensitivity] = useState(50); // 0-100
  const [threshold, setThreshold] = useState(80); // 0-100
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const sensitivityRef = useRef(sensitivity);
  const thresholdRef = useRef(threshold);
  const tooLoudTimeoutRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const requestRef = useRef<number | null>(null);
  const alarmOscillatorRef = useRef<OscillatorNode | null>(null);
  const alarmGainRef = useRef<GainNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Sync refs with state
  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  useEffect(() => {
    thresholdRef.current = threshold;
  }, [threshold]);

  // Check local storage for permission banner preference
  useEffect(() => {
    const hidden = localStorage.getItem('noise_meter_permission_hidden');
    if (hidden === 'true') {
      setShowPermissionBanner(false);
    }
  }, []);

  const handlePermissionOk = () => {
    if (dontShowAgain) {
      localStorage.setItem('noise_meter_permission_hidden', 'true');
    }
    setShowPermissionBanner(false);
  };

  const handlePermissionCancel = () => {
    onBack();
  };

  const playAlarm = useCallback(() => {
    if (!audioContextRef.current) return;

    // Create oscillator if not playing
    if (!alarmOscillatorRef.current) {
      const osc = audioContextRef.current.createOscillator();
      const gain = audioContextRef.current.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, audioContextRef.current.currentTime); // A4
      osc.frequency.exponentialRampToValueAtTime(880, audioContextRef.current.currentTime + 0.1); // Slide up
      
      gain.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(audioContextRef.current.destination);
      
      osc.start();
      osc.stop(audioContextRef.current.currentTime + 0.5);
      
      alarmOscillatorRef.current = osc;
      alarmGainRef.current = gain;

      // Reset ref after sound finishes
      setTimeout(() => {
        alarmOscillatorRef.current = null;
        alarmGainRef.current = null;
      }, 500);
    }
  }, []);

  const startListening = async () => {
    setError(null);
    setDebugInfo('Инициализация...');
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Ваш браузер не поддерживает доступ к микрофону.');
      return;
    }

    try {
      setDebugInfo('Запрос доступа к микрофону...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      streamRef.current = stream;
      setDebugInfo(`Микрофон активен: ${stream.active}`);
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      
      if (audioContext.state === 'suspended') {
        setDebugInfo('Возобновление AudioContext...');
        await audioContext.resume();
      }

      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048; // Larger buffer for better sampling
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;
      
      setIsListening(true);
      setDebugInfo('Слушаю...');
      updateVolume();
    } catch (err: any) {
      console.error('Error accessing microphone:', err);
      setDebugInfo(`Ошибка: ${err.name}`);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Доступ к микрофону запрещен. Пожалуйста, разрешите доступ в настройках браузера.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('Микрофон не найден.');
      } else {
        setError(`Ошибка доступа к микрофону: ${err.message || 'Неизвестная ошибка'}`);
      }
    }
  };

  const stopListening = () => {
    setDebugInfo('Остановка...');
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    
    setIsListening(false);
    setVolume(0);
    setIsTooLoud(false);
    setDebugInfo('Остановлено');
  };

  const lastUpdateTimeRef = useRef(0);

  const updateVolume = (timestamp?: number) => {
    if (!analyserRef.current || !audioContextRef.current) return;
    
    // Ensure context is running
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Calculate peak volume from frequency data
    let max = 0;
    for (let i = 0; i < dataArray.length; i++) {
      if (dataArray[i] > max) max = dataArray[i];
    }
    
    // Convert to 0-100 scale
    let normalizedVolume = (max / 255) * 100;
    
    // Apply sensitivity (logarithmic-ish feel)
    // Use ref to avoid stale closure
    const currentSensitivity = sensitivityRef.current;
    const sensitivityFactor = Math.pow(currentSensitivity / 50, 2.2); 
    normalizedVolume = normalizedVolume * sensitivityFactor;
    normalizedVolume = Math.min(100, Math.max(0, normalizedVolume));
    
    const now = timestamp || performance.now();
    if (now - lastUpdateTimeRef.current > 50) { // ~20fps
      setVolume(normalizedVolume);
      lastUpdateTimeRef.current = now;
    }
    
    // Use ref for threshold to avoid stale closure
    const currentThreshold = thresholdRef.current;
    if (normalizedVolume >= currentThreshold) {
      setIsTooLoud(true);
      
      // Clear existing timeout
      if (tooLoudTimeoutRef.current) {
        window.clearTimeout(tooLoudTimeoutRef.current);
      }
      
      // Set new timeout to hide warning after 1.5 seconds of silence
      tooLoudTimeoutRef.current = window.setTimeout(() => {
        setIsTooLoud(false);
        tooLoudTimeoutRef.current = null;
      }, 1500);

      if (navigator.vibrate) {
        navigator.vibrate(200);
      }
      playAlarm();
    }
    
    requestRef.current = requestAnimationFrame(updateVolume);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  const bgColor = isDarkMode ? 'bg-[#1e1f22]' : 'bg-gray-50';
  const cardBg = isDarkMode ? 'bg-[#2b2d31]' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const subTextColor = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const borderColor = isDarkMode ? 'border-white/10' : 'border-gray-200';

  // Generate meter bars
  const renderMeterBars = () => {
    const bars = [];
    const totalBars = 20;
    
    for (let i = 0; i < totalBars; i++) {
      const barLevel = (i / totalBars) * 100;
      const isActive = volume > barLevel;
      
      // Determine color based on threshold
      let barColor = 'bg-green-500';
      if (barLevel > threshold * 0.8) barColor = 'bg-yellow-500';
      if (barLevel >= threshold) barColor = 'bg-red-500';
      
      // If inactive, use gray
      const finalColor = isActive ? barColor : (isDarkMode ? 'bg-gray-700' : 'bg-gray-200');
      
      bars.push(
        <div 
          key={i} 
          className={`w-full h-3 rounded-sm transition-colors duration-75 ${finalColor} ${isActive && barLevel >= threshold ? 'animate-pulse' : ''}`}
        />
      );
    }
    
    // Reverse to stack from bottom up
    return (
      <div className="flex flex-col gap-1 w-full h-full justify-end relative">
        {bars.reverse()}
        
        {/* Threshold Indicator Line */}
        <div 
          className="absolute left-0 right-0 border-t-2 border-white/50 z-20 pointer-events-none flex items-center justify-end"
          style={{ bottom: `${threshold}%` }}
        >
          <span className="bg-white/20 backdrop-blur-sm text-[8px] px-1 rounded-l text-white font-bold">
            ПОРОГ
          </span>
        </div>
      </div>
    );
  };

  if (showPermissionBanner) {
    return (
      <div className={`h-full w-full flex flex-col items-center justify-center p-6 ${bgColor} ${textColor}`}>
        <div className={`max-w-md w-full p-8 rounded-3xl shadow-2xl ${cardBg} border ${borderColor} text-center`}>
          <div className="w-20 h-20 rounded-full bg-[#ed4245]/10 flex items-center justify-center mx-auto mb-6">
            <Mic size={40} className="text-[#ed4245]" />
          </div>
          
          <h2 className="text-2xl font-bold mb-4">Требуется доступ к микрофону</h2>
          <p className={`mb-8 ${subTextColor}`}>
            Для работы шумомера необходимо использовать микрофон вашего устройства. 
            Мы не записываем и не сохраняем аудиоданные.
          </p>
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={handlePermissionOk}
              className="w-full py-3 rounded-xl bg-[#ed4245] hover:bg-[#c03537] text-white font-bold transition-all"
            >
              Хорошо
            </button>
            <button 
              onClick={handlePermissionCancel}
              className={`w-full py-3 rounded-xl border ${borderColor} hover:bg-black/5 font-bold transition-all`}
            >
              Отмена
            </button>
          </div>
          
          <div className="mt-6 flex items-center justify-center gap-2">
            <input 
              type="checkbox" 
              id="dontShowAgain" 
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#ed4245] focus:ring-[#ed4245]"
            />
            <label htmlFor="dontShowAgain" className={`text-sm ${subTextColor} cursor-pointer select-none`}>
              Больше не показывать
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full w-full flex flex-col ${bgColor} ${textColor} transition-colors duration-300 relative overflow-y-auto`}>
      
      {/* Red Overlay for "Too Loud" */}
      <div 
        className="fixed inset-0 z-40 bg-red-500 pointer-events-none transition-opacity duration-700 ease-out"
        style={{ 
          opacity: isListening 
            ? Math.min(0.85, Math.pow(volume / threshold, 1.8) * 0.75) 
            : 0 
        }}
      />

      {/* Warning Text Overlay */}
      <div 
        className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-none transition-opacity duration-200 ${isTooLoud ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="text-center animate-bounce">
          <AlertTriangle size={120} className="text-white mx-auto mb-4 drop-shadow-lg" />
          <h1 className="text-6xl font-black text-white uppercase tracking-wider drop-shadow-lg">
            Слишком шумно!
          </h1>
        </div>
      </div>

      {/* Header */}
      <div className={`sticky top-0 p-4 border-b ${borderColor} ${cardBg} flex items-center justify-between z-30`}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[#ed4245]/10 text-[#ed4245]">
            <Volume2 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Шумомер</h1>
            <p className={`text-sm ${subTextColor}`}>Контроль уровня шума в классе</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 flex flex-col items-center py-12 relative z-0">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-8 w-full max-w-md"
        >
          
          {/* Meter Display */}
          <div className={`w-32 h-80 p-4 rounded-2xl border ${borderColor} ${cardBg} shadow-inner relative`}>
            {error ? (
              <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                <p className="text-red-500 text-sm font-bold">{error}</p>
              </div>
            ) : (
              <>
                {renderMeterBars()}
                {isListening && (
                  <div className="absolute top-2 left-0 right-0 text-center">
                    <span className="text-[10px] font-mono opacity-30 uppercase tracking-tighter">
                      {debugInfo}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Controls */}
          <div className="w-full flex flex-col gap-6">
            
            {/* Sensitivity Slider */}
            <div className={`p-4 rounded-xl border ${borderColor} ${cardBg}`}>
              <div className="flex justify-between mb-2">
                <span className={`text-sm font-bold ${subTextColor}`}>Чувствительность</span>
                <span className="text-sm font-bold">{sensitivity}%</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="200" 
                value={sensitivity} 
                onChange={(e) => setSensitivity(parseInt(e.target.value))}
                className="w-full accent-[#ed4245]"
              />
            </div>

            {/* Threshold Slider */}
            <div className={`p-4 rounded-xl border ${borderColor} ${cardBg}`}>
              <div className="flex justify-between mb-2">
                <span className={`text-sm font-bold ${subTextColor}`}>Порог срабатывания</span>
                <span className="text-sm font-bold">{threshold}%</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="100" 
                value={threshold} 
                onChange={(e) => setThreshold(parseInt(e.target.value))}
                className="w-full accent-[#ed4245]"
              />
            </div>

            {/* Start/Stop Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={isListening ? stopListening : startListening}
              className={`
                w-full py-4 rounded-2xl font-black text-xl shadow-lg transform transition-all flex items-center justify-center gap-3
                ${isListening 
                  ? 'bg-gray-500 hover:bg-gray-600 text-white' 
                  : 'bg-[#ed4245] hover:bg-[#c03537] hover:shadow-[#ed4245]/40 text-white'
                }
              `}
            >
              {isListening ? (
                <>
                  <Square size={24} fill="currentColor" />
                  ОТМЕНА
                </>
              ) : (
                <>
                  <Play size={24} fill="currentColor" />
                  НАЧАТЬ
                </>
              )}
            </motion.button>
          </div>

        </motion.div>
      </div>
    </div>
  );
};

export default TeacherNoiseMeterPage;
