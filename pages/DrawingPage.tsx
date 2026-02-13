
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Eraser, Paintbrush, Trash2, Download, Minus as MinusIcon, 
  Plus as PlusIcon, Save, Undo2, RotateCcw
} from 'lucide-react';

interface DrawingPageProps {
  isDarkMode?: boolean;
}

const STORAGE_KEY = 'school_helper_standalone_drawing';

const DrawingPage: React.FC<DrawingPageProps> = ({ isDarkMode = true }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#ed4245');
  const [brushSize, setBrushSize] = useState(5);
  const [backgroundColor, setBackgroundColor] = useState(isDarkMode ? '#2f3136' : '#ffffff');
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  
  // History for Undo
  const [history, setHistory] = useState<string[]>([]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    if (canvas.width === rect.width && canvas.height === rect.height) return;

    const tempImage = canvas.toDataURL();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const img = new Image();
    img.src = tempImage;
    img.onload = () => ctx.drawImage(img, 0, 0);
  }, []);

  // Initialization and Loading
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initial setup
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Load from storage
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.backgroundColor) setBackgroundColor(parsed.backgroundColor);
        if (parsed.brushColor) setBrushColor(parsed.brushColor);
        if (parsed.brushSize) setBrushSize(parsed.brushSize);
        
        if (parsed.imageData) {
          const img = new Image();
          img.src = parsed.imageData;
          img.onload = () => ctx.drawImage(img, 0, 0);
        }
      } catch (e) {
        console.error("Failed to load drawing", e);
      }
    }
    
    // Use ResizeObserver to handle sidebar collapse/expand
    let resizeTimeout: any;
    const observer = new ResizeObserver(() => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resizeCanvas, 100);
    });
    observer.observe(container);

    return () => {
        observer.disconnect();
        clearTimeout(resizeTimeout);
    };
  }, [resizeCanvas]);

  // Save functionality
  const saveToStorage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const data = {
      imageData: canvas.toDataURL(),
      backgroundColor,
      brushColor,
      brushSize
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [backgroundColor, brushColor, brushSize]);

  // Periodic autosave
  useEffect(() => {
    const timer = setTimeout(saveToStorage, 2000);
    return () => clearTimeout(timer);
  }, [saveToStorage]);

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Keep last 20 steps
    setHistory(prev => [...prev.slice(-19), canvas.toDataURL()]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    
    const previousState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = previousState;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      saveToStorage();
    };
  };

  const getCoordinates = (e: any, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = (e.clientX || (e.touches && e.touches[0].clientX));
    const clientY = (e.clientY || (e.touches && e.touches[0].clientY));

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    saveHistory(); // Save state before drawing

    const { x, y } = getCoordinates(e, canvas);

    ctx.beginPath();
    ctx.moveTo(x, y);
    
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = brushColor;
    }
    
    ctx.lineWidth = brushSize;
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e, canvas);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    saveToStorage();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    saveHistory(); // Save state before clearing

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      saveToStorage();
    }
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // To download with the background, we create a temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Fill background
    tempCtx.fillStyle = backgroundColor;
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    // Draw original canvas over it
    tempCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = `drawing-${Date.now()}.png`;
    link.href = tempCanvas.toDataURL();
    link.click();
  };

  const panelBg = isDarkMode ? 'bg-[#202225]/80' : 'bg-white/80';
  const controlBorder = isDarkMode ? 'border-white/10' : 'border-gray-200';

  return (
    <div className="h-full flex flex-col gap-6 relative overflow-hidden">
      {/* Centered Controls Toolbar */}
      <div className="flex justify-center shrink-0">
        <div className={`flex flex-wrap items-center gap-4 p-3 rounded-2xl border shadow-xl backdrop-blur-md z-10 ${panelBg} ${controlBorder}`}>
          
          {/* Tools Switcher */}
          <div className={`flex items-center gap-1 p-1 rounded-xl ${isDarkMode ? 'bg-white/10' : 'bg-gray-100'}`}>
            <button 
              onClick={() => setTool('brush')} 
              className={`p-2.5 rounded-lg transition-all ${tool === 'brush' ? 'bg-[#5865f2] text-white shadow-lg' : (isDarkMode ? 'text-gray-400 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-200')}`}
              title="Кисть"
            >
              <Paintbrush size={18} />
            </button>
            <button 
              onClick={() => setTool('eraser')} 
              className={`p-2.5 rounded-lg transition-all ${tool === 'eraser' ? 'bg-[#5865f2] text-white shadow-lg' : (isDarkMode ? 'text-gray-400 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-200')}`}
              title="Ластик"
            >
              <Eraser size={18} />
            </button>
          </div>

          {/* Size Slider */}
          <div className={`flex items-center gap-3 px-3 rounded-xl h-10 min-w-[140px] ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
            <MinusIcon size={14} className="opacity-50" />
            <input 
              type="range" min="1" max="50" 
              value={brushSize} 
              onChange={e => setBrushSize(Number(e.target.value))} 
              className="w-24 accent-[#5865f2] cursor-pointer" 
            />
            <PlusIcon size={14} className="opacity-50" />
            <span className="w-5 text-center font-mono text-xs font-bold opacity-70">{brushSize}</span>
          </div>

          <div className={`h-8 w-[1px] ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} />

          {/* Color Pickers */}
          <div className="flex items-center gap-4 px-2">
            <div className="flex flex-col items-center gap-0.5" title="Цвет кисти">
              <input 
                type="color" 
                value={brushColor} 
                onChange={e => { setBrushColor(e.target.value); setTool('brush'); }} 
                className="w-8 h-8 rounded-full cursor-pointer bg-transparent border-2 border-white/20 p-0 overflow-hidden" 
              />
              <span className="text-[9px] opacity-40 uppercase font-bold tracking-wider">Кисть</span>
            </div>
            <div className="flex flex-col items-center gap-0.5" title="Цвет фона">
              <input 
                type="color" 
                value={backgroundColor} 
                onChange={e => setBackgroundColor(e.target.value)} 
                className="w-8 h-8 rounded-full cursor-pointer bg-transparent border-2 border-white/20 p-0 overflow-hidden" 
              />
              <span className="text-[9px] opacity-40 uppercase font-bold tracking-wider">Фон</span>
            </div>
          </div>

          <div className={`h-8 w-[1px] ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} />

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button 
              onClick={handleUndo} 
              className={`p-2.5 rounded-lg transition-colors text-green-500 ${isDarkMode ? 'hover:bg-green-500/20' : 'hover:bg-green-50'} ${history.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`} 
              title="Шаг назад"
              disabled={history.length === 0}
            >
              <RotateCcw size={20} />
            </button>
            <button 
              onClick={clearCanvas} 
              className={`p-2.5 rounded-lg transition-colors text-red-500 ${isDarkMode ? 'hover:bg-red-500/20' : 'hover:bg-red-50'}`} 
              title="Очистить всё"
            >
              <Trash2 size={20} />
            </button>
            <button 
              onClick={downloadImage} 
              className={`p-2.5 rounded-lg transition-colors text-blue-500 ${isDarkMode ? 'hover:bg-blue-500/20' : 'hover:bg-blue-50'}`} 
              title="Скачать рисунок"
            >
              <Download size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div 
        ref={containerRef}
        className={`flex-1 rounded-3xl overflow-hidden shadow-2xl relative border transition-all duration-300 ${isDarkMode ? 'border-white/5' : 'border-gray-200'}`}
        style={{ backgroundColor }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full block cursor-crosshair"
        />
        
        {/* Subtle helper text */}
        <div className="absolute bottom-4 right-6 pointer-events-none opacity-20 text-xs font-bold uppercase tracking-widest">
          Творческое пространство
        </div>
      </div>
    </div>
  );
};

export default DrawingPage;
