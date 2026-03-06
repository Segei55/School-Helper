import React, { useState, useEffect, useRef } from 'react';
import { 
  Dices, 
  Users, 
  Play, 
  RotateCcw, 
  Settings2,
  Trash2,
  Plus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { Student } from '../types';

interface TeacherRandomizerPageProps {
  isDarkMode: boolean;
}

const TeacherRandomizerPage: React.FC<TeacherRandomizerPageProps> = ({ isDarkMode }) => {
  const [items, setItems] = useState<string[]>(['Вариант 1', 'Вариант 2', 'Вариант 3', 'Вариант 4']);
  const [newItem, setNewItem] = useState('');
  const [spinDuration, setSpinDuration] = useState(5); // seconds
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [winnerColor, setWinnerColor] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [rotation, setRotation] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate distinct colors
  const getColors = (count: number) => {
    const colors = [];
    for (let i = 0; i < count; i++) {
      // Use HSL for distinct colors with good saturation/lightness
      const hue = (i * 360) / count;
      colors.push(`hsl(${hue}, 70%, 60%)`);
    }
    return colors;
  };

  // Helper to get hex colors for confetti (canvas-confetti doesn't support HSL strings well)
  const getHexColors = (count: number) => {
    const colors = [];
    for (let i = 0; i < count; i++) {
      const hue = (i * 360) / count;
      // Simple HSL to Hex conversion for saturation 70% and lightness 60%
      // Or just use a predefined vibrant palette
      colors.push(hslToHex(hue, 70, 60));
    }
    return colors;
  };

  const hslToHex = (h: number, s: number, l: number) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  const [colors, setColors] = useState<string[]>([]);

  useEffect(() => {
    setColors(getColors(items.length));
  }, [items.length]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;

    ctx.clearRect(0, 0, width, height);
    
    // Save context for rotation
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);

    const totalSegments = items.length;
    const arcSize = (2 * Math.PI) / totalSegments;

    items.forEach((item, index) => {
      const startAngle = index * arcSize;
      const endAngle = startAngle + arcSize;

      // Draw segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.fillStyle = colors[index] || '#ccc';
      ctx.fill();
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + arcSize / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Arial';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 2;
      ctx.fillText(item.length > 15 ? item.substring(0, 15) + '...' : item, radius - 20, 5);
      ctx.restore();
    });

    ctx.restore();

    // Draw pointer (static)
    // Actually, let's draw the pointer outside the rotated context so it stays fixed
    // But wait, the canvas itself is static, we rotated the content.
    // So drawing here means it's drawn on top of the rotated wheel.
    // The pointer should be at the right side (0 degrees) or top (-90 degrees).
    // Let's put it at the right side (0 degrees) for simplicity with arc calculations.
    
    // Pointer triangle
    ctx.beginPath();
    ctx.moveTo(width - 10, centerY);
    ctx.lineTo(width + 10, centerY - 15);
    ctx.lineTo(width + 10, centerY + 15);
    ctx.fillStyle = '#333';
    ctx.fill();
  };

  // Redraw when rotation or items change
  useEffect(() => {
    drawWheel();
  }, [rotation, items, colors]);

  const spin = () => {
    if (isSpinning || items.length < 2) return;

    setIsSpinning(true);
    setWinner(null);
    setWinnerColor(null);
    setShowModal(false);

    // Calculate random extra rotation (at least 5 full spins)
    const minSpins = 5;
    const maxSpins = 10;
    const randomSpins = Math.random() * (maxSpins - minSpins) + minSpins;
    const totalRotation = randomSpins * 360;
    
    // Random offset within a segment to make it less predictable
    const segmentSize = 360 / items.length;
    const randomOffset = Math.random() * segmentSize;
    
    const targetRotation = rotation + totalRotation + randomOffset;
    
    const startTime = performance.now();
    const duration = spinDuration * 1000;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentRot = rotation + (targetRotation - rotation) * easeOut;
      setRotation(currentRot);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        calculateWinner(currentRot);
      }
    };

    requestAnimationFrame(animate);
  };

  const calculateWinner = (finalRotation: number) => {
    // Normalize rotation to 0-360
    const normalizedRotation = finalRotation % 360;
    
    // The pointer is at 0 degrees (right side).
    // The wheel rotates clockwise.
    // So the winning segment is the one that intersects 0 degrees.
    // Since we rotate the canvas, a segment at index i starts at i * arcSize.
    // If rotation is R, the segment at 0 is the one where:
    // (startAngle + R) % 360 contains 0 (or 360).
    // Actually, let's think about the angle at the pointer.
    // The pointer is at angle 0.
    // The wheel is rotated by `finalRotation`.
    // So the angle on the wheel at the pointer is `(360 - (finalRotation % 360)) % 360`.
    
    const pointerAngle = (360 - (normalizedRotation % 360)) % 360;
    const segmentAngle = 360 / items.length;
    const winningIndex = Math.floor(pointerAngle / segmentAngle);
    
    const winningItem = items[winningIndex];
    const winningColor = colors[winningIndex];
    setWinner(winningItem);
    setWinnerColor(winningColor);
    setShowModal(true);
    
    // Confetti!
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 99999 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // Fireworks/Explosion from random positions
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.9), y: Math.random() - 0.2 },
        startVelocity: randomInRange(20, 50),
        spread: 360,
        scalar: randomInRange(0.8, 1.5),
        colors: getHexColors(10)
      });
    }, 250);
  };

  const loadStudents = () => {
    const savedStudents = localStorage.getItem('teacher_students');
    if (savedStudents) {
      try {
        const students: Student[] = JSON.parse(savedStudents);
        if (students.length > 0) {
          setItems(students.map(s => `${s.lastName} ${s.firstName}`));
        } else {
          alert('Список учеников пуст!');
        }
      } catch (e) {
        console.error('Failed to parse students', e);
      }
    } else {
      alert('Список учеников не найден!');
    }
  };

  const addItem = () => {
    if (newItem.trim()) {
      setItems([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const bgColor = isDarkMode ? 'bg-[#1e1f22]' : 'bg-gray-50';
  const cardBg = isDarkMode ? 'bg-[#2b2d31]' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const subTextColor = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const borderColor = isDarkMode ? 'border-white/10' : 'border-gray-200';
  const hoverBg = isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-100';

  return (
    <div className={`h-full w-full flex flex-col ${bgColor} ${textColor} transition-colors duration-300`}>
      {/* Header */}
      <div className={`p-4 border-b ${borderColor} ${cardBg}`}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[#faa61a]/10 text-[#faa61a]">
            <Dices size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Рандомайзер</h1>
            <p className={`text-sm ${subTextColor}`}>Колесо фортуны для случайного выбора</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Controls */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Input Area */}
            <div className={`p-4 rounded-2xl border ${borderColor} ${cardBg} shadow-sm`}>
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Settings2 size={18} />
                Настройки
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className={`block text-xs font-bold uppercase mb-2 ${subTextColor}`}>Добавить вариант</label>
                  <div className="flex gap-2">
                    <input 
                      value={newItem}
                      onChange={(e) => setNewItem(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addItem()}
                      placeholder="Введите текст..."
                      className={`flex-1 p-2 rounded-lg outline-none border ${borderColor} ${isDarkMode ? 'bg-black/20' : 'bg-gray-50'}`}
                    />
                    <button 
                      onClick={addItem}
                      className="p-2 rounded-lg bg-[#faa61a] text-white hover:brightness-110 transition-all"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                   <button 
                    onClick={loadStudents}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold border ${borderColor} ${hoverBg} flex items-center justify-center gap-2 transition-colors`}
                  >
                    <Users size={16} />
                    Из списка учеников
                  </button>
                  <button 
                    onClick={() => setItems([])}
                    className={`py-2 px-3 rounded-lg text-sm font-bold border ${borderColor} hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center transition-colors`}
                    title="Очистить список"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase mb-2 ${subTextColor}`}>Длительность (сек): {spinDuration}</label>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={spinDuration} 
                    onChange={(e) => setSpinDuration(parseInt(e.target.value))}
                    className="w-full accent-[#faa61a]"
                  />
                </div>
              </div>
            </div>

            {/* List of Items */}
            <div className={`p-4 rounded-2xl border ${borderColor} ${cardBg} shadow-sm flex flex-col max-h-[400px]`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">Список ({items.length})</h3>
              </div>
              <div className="overflow-y-auto custom-scrollbar flex-1 space-y-2 pr-1">
                <AnimatePresence>
                  {items.length === 0 ? (
                    <motion.p 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }} 
                      className={`text-center py-4 ${subTextColor}`}
                    >
                      Список пуст
                    </motion.p>
                  ) : (
                    items.map((item, index) => (
                      <motion.div 
                        key={`${item}-${index}`}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className={`flex items-center justify-between p-2 rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} group`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colors[index] }} />
                          <span className="truncate text-sm font-medium">{item}</span>
                        </div>
                        <button 
                          onClick={() => removeItem(index)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-500/10 rounded transition-all"
                        >
                          <XIcon size={14} />
                        </button>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right Column: Wheel */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center">
            <div className="relative mb-8">
              {/* Pointer */}
              <div className="absolute top-1/2 -right-6 -translate-y-1/2 z-10 text-[#333] drop-shadow-md">
                <div className="w-0 h-0 border-t-[15px] border-t-transparent border-b-[15px] border-b-transparent border-r-[25px] border-r-[#333]" />
              </div>

              {/* Canvas Wheel */}
              <div className={`rounded-full shadow-2xl overflow-hidden border-4 ${isDarkMode ? 'border-gray-700' : 'border-white'}`}>
                <canvas 
                  ref={canvasRef} 
                  width={500} 
                  height={500} 
                  className="max-w-full h-auto w-[300px] md:w-[400px] lg:w-[500px]"
                />
              </div>
            </div>

            {/* Winner Display */}
            <div className="h-16 mb-6 flex items-center justify-center">
              {winner && (
                <div className="animate-in zoom-in duration-300 text-center">
                  <div className={`text-sm font-bold uppercase tracking-widest mb-1 ${subTextColor}`}>Выбрано</div>
                  <div className="text-3xl md:text-4xl font-black drop-shadow-sm" style={{ color: winnerColor || '#faa61a' }}>
                    {winner}
                  </div>
                </div>
              )}
            </div>

            {/* Spin Button */}
            <button
              onClick={spin}
              disabled={isSpinning || items.length < 2}
              className={`
                py-4 px-12 rounded-2xl font-black text-xl shadow-lg transform transition-all
                ${isSpinning || items.length < 2 
                  ? 'bg-gray-400 cursor-not-allowed opacity-50' 
                  : 'bg-[#faa61a] hover:bg-[#e59610] hover:scale-105 hover:shadow-[#faa61a]/40 text-white'
                }
              `}
            >
              {isSpinning ? 'Крутим...' : 'КРУТИТЬ!'}
            </button>
          </div>

        </div>
      </div>

      {/* Full Screen Winner Modal */}
      <AnimatePresence>
        {showModal && winner && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md"
            onClick={() => setShowModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="text-center p-8 max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4">
                <motion.div 
                  animate={{ rotate: [0, 10, -10, 10, 0] }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="inline-block p-4 rounded-full bg-white/10 mb-4"
                >
                  <Dices size={64} className="text-[#faa61a]" />
                </motion.div>
                <h2 className="text-2xl md:text-3xl font-bold text-white/80 uppercase tracking-widest mb-2">Выбрано:</h2>
                <motion.div 
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
                  className="text-5xl md:text-7xl font-black drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)] leading-tight"
                  style={{ color: winnerColor || '#faa61a' }}
                >
                  {winner}
                </motion.div>
              </div>
              
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowModal(false)}
                className="mt-12 px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all border border-white/20"
              >
                Закрыть
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Simple X icon component since I missed importing it or it might conflict
const XIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M18 6 6 18"/>
    <path d="m6 6 12 12"/>
  </svg>
);

export default TeacherRandomizerPage;
