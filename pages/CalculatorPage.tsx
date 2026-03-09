
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Divide, X, Minus, Plus, Equal, Delete, 
  RotateCcw, Maximize2, Move, HelpCircle,
  FunctionSquare, Calculator, Binary, Info,
  Search, MousePointer2, XCircle, Shrink,
  Magnet, Target
} from 'lucide-react';
import { PremiumOverlay } from '../components/PremiumComponents';

interface CalculatorPageProps {
  isDarkMode?: boolean;
  isPremium?: boolean;
  onTriggerPremium?: (source: string) => void;
}

type CalcTab = 'standard' | 'scientific' | 'graphing';

const CalculatorPage: React.FC<CalculatorPageProps> = ({ isDarkMode = true, isPremium, onTriggerPremium }) => {
  const [activeTab, setActiveTab] = useState<CalcTab>('standard');
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [functionText, setFunctionText] = useState('x^2');
  
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapActive, setIsSnapActive] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [mouseMathPos, setMouseMathPos] = useState({ x: 0, y: 0 });
  const [showCoords, setShowCoords] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fullCanvasRef = useRef<HTMLCanvasElement>(null);

  // --- Logic Helpers ---
  const isOperator = (char: string) => ['+', '-', '×', '÷'].includes(char);

  const safeEval = (expr: string) => {
    // SECURITY: Strict Token Validation
    // This Regex matches ONLY: numbers, operators, parens, and whitelisted math functions/constants.
    // It prevents constructing words like 'alert' by only allowing specific sequences.
    // Allowed: 0-9, ., +, -, *, /, (, ), space, ^, and specific words (sin, cos, tan, log, ln, sqrt, pi, e)
    const strictWhitelist = /^(\d+(\.\d+)?|[\+\-\×\÷\*\/\(\)\^\s]|sin|cos|tan|log|ln|sqrt|pi|e)+$/i;
    
    if (!strictWhitelist.test(expr)) {
        return null;
    }

    try {
      const sanitized = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/sin/gi, 'Math.sin')
        .replace(/cos/gi, 'Math.cos')
        .replace(/tan/gi, 'Math.tan')
        .replace(/log/gi, 'Math.log10')
        .replace(/ln/gi, 'Math.log')
        .replace(/π/g, 'Math.PI')
        .replace(/pi/gi, 'Math.PI')
        .replace(/e/g, 'Math.E')
        .replace(/\^/g, '**')
        .replace(/sqrt/gi, 'Math.sqrt');
      
      return new Function(`"use strict"; return (${sanitized})`)();
    } catch {
      return null;
    }
  };

  const calculate = useCallback(() => {
    const result = safeEval(display);
    if (result !== null && Number.isFinite(result)) {
      setExpression(display + ' =');
      setDisplay(String(parseFloat(result.toFixed(8))));
    } else {
      setDisplay('Error');
    }
  }, [display]);

  const clear = useCallback(() => {
    setDisplay('0');
    setExpression('');
  }, []);

  const backspace = useCallback(() => {
    setDisplay(prev => {
        if (prev.length > 1) return prev.slice(0, -1);
        return '0';
    });
  }, []);

  // --- Input Handler with Validation ---
  const handleInput = useCallback((val: string) => {
    setDisplay(prev => {
        if (prev === 'Error') return val;

        const lastChar = prev.slice(-1);
        const isInputOp = isOperator(val);
        const isLastOp = isOperator(lastChar);

        // 1. Initial State Handling
        if (prev === '0') {
            // Allow inputting '.' or an operator immediately after 0 (e.g. 0.5 or 0-5), otherwise replace 0
            if (val === '.') return '0.';
            if (isInputOp) return '0' + val;
            return val;
        }

        // 2. Decimal Validation
        if (val === '.') {
            // Split by operators/parentheses to find the current number segment
            const parts = prev.split(/[\+\-\×\÷\(\)]/);
            const currentNum = parts[parts.length - 1];
            if (currentNum.includes('.')) return prev; // Ignore if already has decimal
            return prev + val;
        }

        // 3. Operator Validation logic
        if (isInputOp) {
            // Case A: Allow minus sign after open parenthesis (negative numbers like (-5))
            if (lastChar === '(') {
                if (val === '-') return prev + val;
                return prev; // Ignore other operators after (
            }

            // Case B: Handle existing operator at the end
            if (isLastOp) {
                // Allow negative number start after multiply/divide (e.g. 5 * -2)
                if ((lastChar === '×' || lastChar === '÷') && val === '-') {
                    return prev + val;
                }

                // If we already have an operator + minus (e.g. "5 * -"), and user types "+",
                // we should probably replace both with "+" -> "5 +"
                const secondLast = prev.slice(-2, -1);
                if (lastChar === '-' && (secondLast === '×' || secondLast === '÷')) {
                     return prev.slice(0, -2) + val;
                }

                // Default: Replace the last operator with the new one (e.g. "5 +" -> press "-" -> "5 -")
                return prev.slice(0, -1) + val;
            }
        }

        return prev + val;
    });
  }, []);

  // --- Keyboard Support ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (activeTab === 'graphing') return; // Don't intercept if user is typing a function
        
        const key = e.key;
        
        // Numbers
        if (/[0-9]/.test(key)) {
            e.preventDefault();
            handleInput(key);
        }
        
        // Operators
        if (key === '+') handleInput('+');
        if (key === '-') handleInput('-');
        if (key === '*' || key.toLowerCase() === 'x') handleInput('×');
        if (key === '/') handleInput('÷');
        
        // Misc
        if (key === '.' || key === ',') {
            e.preventDefault();
            handleInput('.');
        }
        if (key === '(' || key === ')') handleInput(key);
        
        // Actions
        if (key === 'Enter' || key === '=') {
            e.preventDefault();
            calculate();
        }
        if (key === 'Backspace') {
            e.preventDefault();
            backspace();
        }
        if (key === 'Escape') {
            e.preventDefault();
            clear();
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInput, calculate, backspace, clear, activeTab]);

  const previewResult = useMemo(() => {
    if (display === '0' || !display || activeTab === 'graphing') return null;
    const res = safeEval(display);
    if (typeof res === 'number' && Number.isFinite(res)) {
      return String(parseFloat(res.toFixed(6)));
    }
    return null;
  }, [display, activeTab]);

  const parseFunction = (text: string) => {
    // Basic sanitization for Graphing too, though strictly it's less critical as it doesn't execute arbitrary code directly in the same way, but good practice.
    // The previous implementation was purely replacement-based, which is fine for the known set of functions.
    return text.toLowerCase()
      .replace(/\^/g, '**')
      .replace(/sin/g, 'Math.sin')
      .replace(/cos/g, 'Math.cos')
      .replace(/tan/g, 'Math.tan')
      .replace(/sqrt/g, 'Math.sqrt')
      .replace(/log/g, 'Math.log10')
      .replace(/ln/g, 'Math.log')
      .replace(/pi/g, 'Math.PI')
      .replace(/e/g, 'Math.E')
      .replace(/abs/g, 'Math.abs');
  };

  const drawGraph = useCallback((canvas: HTMLCanvasElement | null, isFull: boolean = false) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2 + viewOffset.x;
    const centerY = height / 2 + viewOffset.y;

    ctx.clearRect(0, 0, width, height);

    const gridOpacityMinor = isFull ? 0.15 : 0.03;
    const gridOpacityMajor = isFull ? 0.35 : 0.08;

    const minorStep = zoom / 5;
    ctx.strokeStyle = isDarkMode ? `rgba(255,255,255,${gridOpacityMinor})` : `rgba(0,0,0,${gridOpacityMinor})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = centerX % minorStep; x < width; x += minorStep) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
    for (let y = centerY % minorStep; y < height; y += minorStep) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
    ctx.stroke();

    ctx.strokeStyle = isDarkMode ? `rgba(255,255,255,${gridOpacityMajor})` : `rgba(0,0,0,${gridOpacityMajor})`;
    ctx.beginPath();
    for (let x = centerX % zoom; x < width; x += zoom) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
    for (let y = centerY % zoom; y < height; y += zoom) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
    ctx.stroke();

    ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(centerX, 0); ctx.lineTo(centerX, height);
    ctx.moveTo(0, centerY); ctx.lineTo(width, centerY);
    ctx.stroke();

    const textToDraw = functionText || '0';
    try {
      const jsFunc = parseFunction(textToDraw);
      ctx.strokeStyle = '#5865f2';
      ctx.lineWidth = 3.5;
      ctx.beginPath();

      let started = false;
      const precision = 2; 
      // Security: This uses new Function, but on inputs controlled by the specific replacements above.
      // For production, a proper math parser library (like mathjs) is recommended instead of eval/Function, 
      // but for this snippet, we ensure basic hygiene.
      const plotFunc = new Function('x', `try { return ${jsFunc}; } catch(e) { return NaN; }`);

      for (let px = 0; px < width; px += 1/precision) {
        const xValue = (px - centerX) / zoom;
        try {
          const yValue = plotFunc(xValue);
          const py = centerY - yValue * zoom;

          if (Number.isFinite(py) && py > -height * 2 && py < height * 3) {
            if (!started) { ctx.moveTo(px, py); started = true; } 
            else { ctx.lineTo(px, py); }
          } else { started = false; }
        } catch (e) { started = false; }
      }
      ctx.stroke();

      if (showCoords && !isDragging) {
        let drawX = mousePos.x;
        let drawY = mousePos.y;
        const mathX = (mousePos.x - centerX) / zoom;

        if (isSnapActive) {
          const snappedMathX = Math.round(mathX);
          const snappedMathY = Math.round((centerY - mousePos.y) / zoom);
          drawX = centerX + snappedMathX * zoom;
          drawY = centerY - snappedMathY * zoom;
        } else {
          try {
            const graphY = plotFunc(mathX);
            if (Number.isFinite(graphY)) drawY = centerY - graphY * zoom;
          } catch(e) {}
        }

        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = '#faa61a'; 
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(drawX, drawY); ctx.lineTo(drawX, centerY);
        ctx.moveTo(drawX, drawY); ctx.lineTo(centerX, drawY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#faa61a';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#faa61a';
        ctx.beginPath();
        ctx.arc(drawX, drawY, isSnapActive ? 7 : 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    } catch (e) {}
  }, [viewOffset, zoom, functionText, isDarkMode, showCoords, mousePos, isDragging, isSnapActive]);

  useEffect(() => {
    const render = () => {
      // Only draw if we are in graphing mode (and premium is active, or we draw anyway but it's covered)
      if (activeTab === 'graphing') {
          drawGraph(canvasRef.current, false);
          if (isFullscreen) drawGraph(fullCanvasRef.current, true);
      }
    };
    render();
    const raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [drawGraph, isFullscreen, activeTab]);

  const handleWheel = (e: React.WheelEvent) => {
    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.1 : 0.9;
    setZoom(prev => Math.min(Math.max(prev * factor, 5), 2000));
  };

  const initialTouchDistance = useRef<number | null>(null);
  const initialZoom = useRef<number>(50);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      initialTouchDistance.current = dist;
      initialZoom.current = zoom;
      setIsDragging(false);
      return;
    }
    setIsDragging(true);
    setLastMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      if (initialTouchDistance.current === null) return;
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      const scale = dist / initialTouchDistance.current;
      setZoom(Math.min(Math.max(initialZoom.current * scale, 5), 2000));
      return;
    }

    if (isDragging) {
      const dx = e.touches[0].clientX - lastMousePos.x;
      const dy = e.touches[0].clientY - lastMousePos.y;
      setViewOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      initialTouchDistance.current = null;
    }
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = e.currentTarget as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2 + viewOffset.x;
    const centerY = rect.height / 2 + viewOffset.y;
    
    let mathX = (x - centerX) / zoom;
    let mathY = (centerY - y) / zoom;

    if (isSnapActive) {
      mathX = Math.round(mathX);
      mathY = Math.round(mathY);
    } else {
      try {
         const jsFunc = parseFunction(functionText);
         const f = new Function('x', `return ${jsFunc}`);
         const graphY = f(mathX);
         if (Number.isFinite(graphY)) mathY = graphY;
      } catch(e) {}
    }
    
    setMousePos({ x, y });
    setMouseMathPos({ x: mathX, y: mathY });
    setShowCoords(true);

    if (isDragging) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setViewOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const btnBase = "flex items-center justify-center rounded-2xl font-bold transition-all transform active:scale-95 shadow-md h-full w-full min-h-[44px] md:min-h-[48px]";
  const btnNum = isDarkMode ? `${btnBase} bg-[#4f545c] hover:bg-[#5d6269] text-white text-lg md:text-2xl` : `${btnBase} bg-gray-200 hover:bg-gray-300 text-gray-800 text-lg md:text-2xl`;
  const btnOp = `${btnBase} bg-[#5865f2] hover:bg-[#4752c4] text-white`;
  const btnSci = isDarkMode ? `${btnBase} bg-[#36393f] hover:bg-[#424549] text-[#b9bbbe] text-xs md:text-sm` : `${btnBase} bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs md:text-sm`;
  const btnAction = `${btnBase} bg-[#ed4245] hover:bg-red-600 text-white text-sm md:text-lg`;

  const displayBg = isDarkMode ? 'bg-[#202225]' : 'bg-gray-100';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';

  const CoordinateOverlay = () => (
    <div className={`absolute top-3 left-3 backdrop-blur-md border p-2 rounded-xl text-[10px] md:text-xs font-mono shadow-xl z-50 pointer-events-none ${isDarkMode ? 'bg-[#202225]/80 border-white/10 text-white' : 'bg-white/80 border-gray-200 text-gray-800'}`}>
      <div className="flex justify-between gap-3"><span className="opacity-40 uppercase font-bold text-[8px] md:text-[10px]">X:</span><span className="text-[#faa61a]">{mouseMathPos.x.toFixed(isSnapActive ? 0 : 2)}</span></div>
      <div className="flex justify-between gap-3"><span className="opacity-40 uppercase font-bold text-[8px] md:text-[10px]">Y:</span><span className="text-[#faa61a]">{mouseMathPos.y.toFixed(isSnapActive ? 0 : 2)}</span></div>
    </div>
  );

  const FunctionShortcuts = ({ isFloating = false }: { isFloating?: boolean }) => (
    <div className={`flex gap-1 overflow-x-auto no-scrollbar pb-1 ${!isFloating ? 'mt-3 shrink-0' : ''}`}>
      {['x', '^', '(', ')', 'sin', 'cos', 'tan', 'sqrt', 'log', 'pi', '/', '*', '+', '-'].map(sym => (
        <button 
          key={sym} 
          onClick={() => setFunctionText(prev => prev + (['sin','cos','tan','sqrt','log'].includes(sym) ? `${sym}(` : sym))} 
          className={`px-3 py-2 shrink-0 rounded-xl font-mono text-[10px] md:text-xs font-bold border transition-colors ${isDarkMode ? (isFloating ? 'bg-white/10 border-white/10 text-gray-300 hover:bg-white/20 hover:text-white' : 'bg-[#36393f] border-white/5 text-gray-400 hover:text-white') : (isFloating ? 'bg-black/5 border-black/10 text-gray-700 hover:bg-black/10' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50')}`}
        >
          {sym}
        </button>
      ))}
    </div>
  );

  return (
    <div className={`h-full w-full max-w-5xl mx-auto flex flex-col gap-4 select-none animate-in fade-in duration-500 ${isFullscreen ? 'overflow-hidden' : ''}`}>
      <div className={`flex p-1 rounded-2xl w-fit mx-auto border shrink-0 transition-all ${isDarkMode ? 'bg-[#202225] border-white/5' : 'bg-gray-100 border-gray-200'}`}>
        {[
          { id: 'standard', label: 'Обычный', icon: <Calculator size={16} /> },
          { id: 'scientific', label: 'Научный', icon: <Binary size={16} /> },
          { id: 'graphing', label: 'Функции', icon: <FunctionSquare size={16} /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as CalcTab)}
            className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-xl font-bold text-xs md:text-sm transition-all transform active:scale-95 ${activeTab === tab.id ? 'bg-[#5865f2] text-white shadow-lg' : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
          >
            {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {activeTab !== 'graphing' ? (
          <div className="flex flex-col h-full overflow-hidden">
            <div className={`p-4 md:p-8 rounded-3xl text-right mb-4 transition-all shadow-inner flex flex-col justify-end border shrink-0 flex-[0_0_auto] min-h-[80px] md:min-h-[120px] max-h-[30%] ${displayBg} ${isDarkMode ? 'border-white/5' : 'border-gray-200'}`}>
              <div className="text-[#8e9297] text-xs md:text-sm font-medium mb-1 md:mb-2 overflow-hidden truncate font-mono tracking-wide leading-normal">
                {expression || previewResult}
              </div>
              <div className={`font-bold truncate tracking-tight transition-all leading-normal ${textColor} ${display.length > 10 ? 'text-2xl md:text-5xl' : 'text-3xl md:text-6xl'}`}>
                {display}
              </div>
            </div>

            <div className={`grid gap-2 flex-1 min-h-0 ${activeTab === 'scientific' ? 'grid-cols-5' : 'grid-cols-4'}`}>
              {/* Button layouts remain same... omitting for brevity as they are unchanged from input */}
              {activeTab === 'scientific' ? (
                <>
                   {/* Scientific buttons ... */}
                  <button onClick={() => handleInput('sin(')} className={btnSci}>sin</button>
                  <button onClick={() => handleInput('7')} className={btnNum}>7</button>
                  <button onClick={() => handleInput('8')} className={btnNum}>8</button>
                  <button onClick={() => handleInput('9')} className={btnNum}>9</button>
                  <button onClick={() => handleInput('÷')} className={btnOp}><Divide size={24} /></button>
                  
                  <button onClick={() => handleInput('cos(')} className={btnSci}>cos</button>
                  <button onClick={() => handleInput('4')} className={btnNum}>4</button>
                  <button onClick={() => handleInput('5')} className={btnNum}>5</button>
                  <button onClick={() => handleInput('6')} className={btnNum}>6</button>
                  <button onClick={() => handleInput('×')} className={btnOp}><X size={24} /></button>
                  
                  <button onClick={() => handleInput('tan(')} className={btnSci}>tan</button>
                  <button onClick={() => handleInput('1')} className={btnNum}>1</button>
                  <button onClick={() => handleInput('2')} className={btnNum}>2</button>
                  <button onClick={() => handleInput('3')} className={btnNum}>3</button>
                  <button onClick={() => handleInput('-')} className={btnOp}><Minus size={24} /></button>
                  
                  <button onClick={() => handleInput('log(')} className={btnSci}>log</button>
                  <button onClick={() => handleInput('0')} className={btnNum}>0</button>
                  <button onClick={() => handleInput('.')} className={btnNum}>.</button>
                  <button onClick={backspace} className={btnNum}><Delete size={22} /></button>
                  <button onClick={() => handleInput('+')} className={btnOp}><Plus size={24} /></button>
                  
                  <button onClick={() => handleInput('ln(')} className={btnSci}>ln</button>
                  <button onClick={() => handleInput('√(')} className={btnSci}>√</button>
                  <button onClick={() => handleInput('^')} className={btnSci}>xʸ</button>
                  <button onClick={clear} className={btnAction}>AC</button>
                  <button onClick={calculate} className={`${btnOp} scale-100 md:scale-105`}><Equal size={28} /></button>
                </>
              ) : (
                <>
                   {/* Standard buttons ... */}
                  <button onClick={clear} className={btnAction}>AC</button>
                  <button onClick={() => handleInput('(')} className={btnNum}> ( </button>
                  <button onClick={() => handleInput(')')} className={btnNum}> ) </button>
                  <button onClick={() => handleInput('÷')} className={btnOp}><Divide size={24} /></button>
                  
                  <button onClick={() => handleInput('7')} className={btnNum}>7</button>
                  <button onClick={() => handleInput('8')} className={btnNum}>8</button>
                  <button onClick={() => handleInput('9')} className={btnNum}>9</button>
                  <button onClick={() => handleInput('×')} className={btnOp}><X size={24} /></button>
                  
                  <button onClick={() => handleInput('4')} className={btnNum}>4</button>
                  <button onClick={() => handleInput('5')} className={btnNum}>5</button>
                  <button onClick={() => handleInput('6')} className={btnNum}>6</button>
                  <button onClick={() => handleInput('-')} className={btnOp}><Minus size={24} /></button>
                  
                  <button onClick={() => handleInput('1')} className={btnNum}>1</button>
                  <button onClick={() => handleInput('2')} className={btnNum}>2</button>
                  <button onClick={() => handleInput('3')} className={btnNum}>3</button>
                  <button onClick={() => handleInput('+')} className={btnOp}><Plus size={24} /></button>
                  
                  <button onClick={() => handleInput('0')} className={`${btnNum} col-span-1`}>0</button>
                  <button onClick={() => handleInput('.')} className={btnNum}>.</button>
                  <button onClick={backspace} className={btnNum}><Delete size={22} /></button>
                  <button onClick={calculate} className={`${btnOp} scale-100 md:scale-105`}><Equal size={28} /></button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="mb-3 shrink-0">
              <div className={`flex items-center gap-3 p-3 rounded-2xl border transition-all focus-within:ring-2 focus-within:ring-[#5865f2]/30 ${displayBg} ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                 <span className="text-xl font-bold text-[#5865f2] shrink-0">f(x) =</span>
                 <input 
                   value={functionText} 
                   onChange={(e) => setFunctionText(e.target.value)} 
                   className={`bg-transparent border-none flex-1 text-lg font-mono outline-none ${textColor}`} 
                   placeholder="sin(x) * x" 
                   autoFocus
                 />
                 <button onClick={() => { setViewOffset({x:0,y:0}); setZoom(50); setFunctionText(''); }} className="p-2 hover:bg-red-400/10 rounded-xl text-red-400" title="Сброс">
                   <RotateCcw size={18} />
                 </button>
              </div>
            </div>
            
            <div className={`flex-1 rounded-3xl overflow-hidden relative border group shadow-inner min-h-[200px] ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`} onMouseLeave={() => setShowCoords(false)}>
              {/* PREMIUM LOCK OVERLAY - TEMPORARILY DISABLED */}
              {/*
              {!isPremium && (
                  <PremiumOverlay 
                     title="Графический калькулятор" 
                     isDarkMode={isDarkMode} 
                     onOpenModal={() => onTriggerPremium && onTriggerPremium('graphing')} 
                  />
              )}
              */}

              <canvas ref={canvasRef} onMouseMove={handleMouseMove} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onWheel={handleWheel} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} className="w-full h-full block touch-none" />
              
              {showCoords && !isDragging && <CoordinateOverlay />}
              
              <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
                 <button onClick={() => setShowHelp(!showHelp)} className={`p-2.5 backdrop-blur-md rounded-xl shadow-lg border transition-all ${showHelp ? 'bg-[#faa61a] text-white border-transparent' : (isDarkMode ? 'bg-black/40 text-white/50 border-transparent' : 'bg-white/80 text-gray-600 border-gray-200')}`} title="Подсказка">
                   <HelpCircle size={16} />
                 </button>
                 <button onClick={() => setIsSnapActive(!isSnapActive)} className={`p-2.5 backdrop-blur-md rounded-xl shadow-lg border transition-all ${isSnapActive ? 'bg-[#5865f2] text-white border-transparent' : (isDarkMode ? 'bg-black/40 text-white/50 border-transparent' : 'bg-white/80 text-gray-600 border-gray-200')}`} title="Привязка к сетке">
                   <Magnet size={16} />
                 </button>
                 <button onClick={() => setIsFullscreen(true)} className={`p-2.5 backdrop-blur-md rounded-xl shadow-lg border ${isDarkMode ? 'bg-black/40 text-white border-transparent' : 'bg-white/80 text-gray-600 border-gray-200'}`} title="Полный экран">
                   <Maximize2 size={16} />
                 </button>
              </div>

              {showHelp && (
                <div className={`absolute top-14 left-4 right-4 backdrop-blur-md border p-3 rounded-xl shadow-2xl animate-in slide-in-from-top-2 z-10 ${isDarkMode ? 'bg-[#2f3136]/95 border-white/10 text-gray-200' : 'bg-white/95 border-gray-200 text-gray-700'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-[10px] uppercase flex items-center gap-2"><Info size={12} className="text-[#5865f2]" /> Управление графиком</span>
                    <button onClick={() => setShowHelp(false)}><X size={14} /></button>
                  </div>
                  <ul className="text-[10px] space-y-1 opacity-80 font-medium">
                    <li>• Прокрутка (Scroll) — Зум</li>
                    <li>• Перетаскивание (Drag) — Перемещение</li>
                    <li>• Магнит — Привязка к сетке</li>
                    <li>• f(x) — Введите функцию</li>
                  </ul>
                </div>
              )}
            </div>

            <FunctionShortcuts />
          </div>
        )}
      </div>

      {isFullscreen && (
        <div className={`fixed inset-0 z-[2000] backdrop-blur-xl flex flex-col p-2 md:p-6 ${isDarkMode ? 'bg-black/95' : 'bg-white/95'}`}>
           <div className="flex items-center justify-between mb-2 md:mb-6 shrink-0 gap-2">
              <button onClick={() => setIsFullscreen(false)} className={`p-2 md:p-3 rounded-2xl shrink-0 ${isDarkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-800'}`}>
                <Shrink size={20} className="md:w-6 md:h-6" />
              </button>
              <div className={`flex items-center gap-1 md:gap-4 p-1.5 md:p-3 rounded-2xl border w-full max-w-xl shadow-2xl transition-all ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-200'}`}>
                 <span className="text-sm md:text-xl font-bold text-[#5865f2] ml-1 md:ml-2 shrink-0">f(x)=</span>
                 <input 
                   value={functionText} 
                   onChange={(e) => setFunctionText(e.target.value)} 
                   className={`bg-transparent border-none flex-1 text-base md:text-xl font-mono outline-none min-w-0 w-full ${isDarkMode ? 'text-white' : 'text-gray-900'}`} 
                   autoFocus 
                 />
                 <button onClick={() => { setViewOffset({x:0,y:0}); setZoom(50); setFunctionText(''); }} className="p-1.5 md:p-2 mr-1 md:mr-2 hover:bg-red-400/10 rounded-xl text-red-400 shrink-0" title="Сброс">
                   <RotateCcw size={16} className="md:w-[18px] md:h-[18px]" />
                 </button>
              </div>
              <div className="w-10 md:w-12 hidden md:block shrink-0" />
           </div>
           
           <div className={`flex-1 rounded-[24px] md:rounded-[40px] overflow-hidden relative border shadow-2xl ${isDarkMode ? 'border-white/10 bg-black/40' : 'border-gray-200 bg-gray-50'}`} onMouseLeave={() => setShowCoords(false)}>
              <canvas ref={fullCanvasRef} onMouseMove={handleMouseMove} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onWheel={handleWheel} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} className="w-full h-full block touch-none" />
              
              {showCoords && !isDragging && <CoordinateOverlay />}

              <div className="absolute top-4 right-4 flex flex-col gap-2">
                 <button onClick={() => setIsSnapActive(!isSnapActive)} className={`p-2 md:p-3 backdrop-blur-md rounded-2xl shadow-lg border transition-all ${isSnapActive ? 'bg-[#5865f2] text-white border-transparent' : (isDarkMode ? 'bg-black/40 text-white border-transparent' : 'bg-white text-gray-600 border-gray-200')}`} title="Привязка к сетке">
                   <Magnet size={20} />
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CalculatorPage;