
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Trash2, Search, Filter, Bug, AlertTriangle, Info, AlertOctagon, Terminal, Lock } from 'lucide-react';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  details?: string;
}

interface LogViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

// --- SECURITY: DATA SANITIZER ---
// Функция для очистки логов от чувствительных данных перед отображением
const sanitizeLog = (args: any[]): { message: string, details: string } => {
  const rawString = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return '[Circular Object]';
      }
    }
    return String(arg);
  }).join(' ');

  // Маскировка чувствительных данных
  const sanitized = rawString
    // Mask OpenRouter/DeepSeek Keys
    .replace(/sk-or-[a-zA-Z0-9]{10,}/g, 'sk-or-********************')
    // Mask Google API Keys (AIza...)
    .replace(/AIza[a-zA-Z0-9_\-]{20,}/g, 'AIza********************')
    // Mask Bearer Tokens / JWT (long strings starting with eyJ)
    .replace(/Bearer\s+eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/g, 'Bearer eyJ***.***.***')
    // Mask raw JWT without Bearer
    .replace(/eyJ[a-zA-Z0-9\-_]{10,}\.[a-zA-Z0-9\-_]{10,}\.[a-zA-Z0-9\-_]{10,}/g, 'eyJ***.***.***')
    // Mask Emails (leave first letter and domain)
    .replace(/([a-zA-Z0-9._%+-]{2})[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '$1***@$2');

  // Разделяем на краткое сообщение и детали (если длинное)
  const lines = sanitized.split('\n');
  const message = lines[0].substring(0, 150) + (lines[0].length > 150 ? '...' : '');
  const details = sanitized.length > 150 || lines.length > 1 ? sanitized : '';

  return { message, details };
};

// Глобальное хранилище логов, чтобы сохранять их даже когда компонент скрыт
const GLOBAL_LOGS: LogEntry[] = [];
let listeners: (() => void)[] = [];

// Перехват консоли (выполняется один раз при загрузке модуля)
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug
};

const captureLog = (level: LogEntry['level'], args: any[]) => {
  const { message, details } = sanitizeLog(args);
  const entry: LogEntry = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: Date.now(),
    level,
    message,
    details
  };
  
  // Храним последние 1000 логов
  if (GLOBAL_LOGS.length >= 1000) GLOBAL_LOGS.shift();
  GLOBAL_LOGS.push(entry);
  
  // Уведомляем подписчиков
  listeners.forEach(l => l());
  
  // Вызываем оригинальный метод, чтобы не ломать DX
  originalConsole[level](...args);
};

// Override console only once
if ((console as any).isOverridden !== true) {
  console.log = (...args) => captureLog('log', args);
  console.info = (...args) => captureLog('info', args);
  console.warn = (...args) => captureLog('warn', args);
  console.error = (...args) => captureLog('error', args);
  console.debug = (...args) => captureLog('debug', args);
  (console as any).isOverridden = true;
}

const LogViewer: React.FC<LogViewerProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>(GLOBAL_LOGS);
  const [filterText, setFilterText] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Подписка на обновления логов
  useEffect(() => {
    const update = () => setLogs([...GLOBAL_LOGS]);
    listeners.push(update);
    return () => {
      listeners = listeners.filter(l => l !== update);
    };
  }, []);

  // Автоскролл
  useEffect(() => {
    if (autoScroll && isOpen && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen, autoScroll]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesText = log.message.toLowerCase().includes(filterText.toLowerCase()) || 
                          (log.details && log.details.toLowerCase().includes(filterText.toLowerCase()));
      const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
      return matchesText && matchesLevel;
    });
  }, [logs, filterText, levelFilter]);

  const handleClear = () => {
    GLOBAL_LOGS.length = 0;
    setLogs([]);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'warn': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'info': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'debug': return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
      default: return 'text-gray-300 bg-gray-500/5 border-gray-500/10';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertOctagon size={14} />;
      case 'warn': return <AlertTriangle size={14} />;
      case 'info': return <Info size={14} />;
      default: return <Terminal size={14} />;
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 h-[400px] z-[99999] bg-[#1a1b1e] border-t border-gray-700 shadow-2xl flex flex-col font-mono text-sm animate-in slide-in-from-bottom-10 duration-200">
      
      {/* HEADER TOOLBAR */}
      <div className="flex items-center justify-between p-2 border-b border-gray-700 bg-[#25262b]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2 py-1 bg-black/20 rounded text-gray-400 select-none">
            <Bug size={16} />
            <span className="font-bold text-xs uppercase">App Logs (Logcat)</span>
          </div>
          
          <div className="flex items-center gap-2 bg-[#1a1b1e] border border-gray-700 rounded px-2 py-1 focus-within:border-[#5865f2] transition-colors">
            <Search size={14} className="text-gray-500" />
            <input 
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter logs..."
              className="bg-transparent border-none outline-none text-gray-200 text-xs w-48 placeholder-gray-600"
            />
          </div>

          <div className="flex bg-[#1a1b1e] border border-gray-700 rounded overflow-hidden">
            {['all', 'info', 'warn', 'error'].map(lvl => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`px-3 py-1 text-xs uppercase font-bold transition-colors ${levelFilter === lvl ? 'bg-[#5865f2] text-white' : 'text-gray-500 hover:bg-white/5'}`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <button 
            onClick={handleClear}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
            title="Clear Logcat"
          >
            <Trash2 size={16} />
          </button>

          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={autoScroll} 
              onChange={(e) => setAutoScroll(e.target.checked)} 
              className="rounded bg-gray-700 border-gray-600 text-[#5865f2]" 
            />
            Auto-scroll
          </label>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] text-green-500 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
             <Lock size={10} />
             SECURE MODE (Sanitized)
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* LOGS CONTAINER */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 bg-[#141517]">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2">
            <Terminal size={32} className="opacity-50" />
            <p>Нет логов для отображения</p>
          </div>
        ) : (
          filteredLogs.map(log => (
            <div key={log.id} className={`flex gap-2 p-1.5 rounded border-l-2 text-xs group hover:bg-white/5 ${getLevelColor(log.level)}`}>
               <div className="min-w-[80px] text-gray-500 select-none opacity-70 font-mono text-[10px] pt-0.5">
                 {formatTime(log.timestamp)}
               </div>
               <div className="shrink-0 pt-0.5 opacity-80">
                 {getLevelIcon(log.level)}
               </div>
               <div className="flex-1 break-all whitespace-pre-wrap font-mono leading-tight">
                 <span className="font-bold opacity-90">{log.message}</span>
                 {log.details && (
                   <details className="mt-1">
                     <summary className="cursor-pointer text-[10px] opacity-60 hover:opacity-100 select-none">Показать детали</summary>
                     <pre className="mt-1 p-2 bg-black/30 rounded text-gray-300 overflow-x-auto whitespace-pre-wrap text-[10px] border border-white/5">
                       {log.details}
                     </pre>
                   </details>
                 )}
               </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default LogViewer;
