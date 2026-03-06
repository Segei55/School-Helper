import React from 'react';
import { Minus, Square, X } from 'lucide-react';

interface HeaderProps {
  activeLabel: string;
  isDarkMode: boolean;
}

const Header: React.FC<HeaderProps> = ({ activeLabel, isDarkMode }) => {
  
  const handleMinimize = () => {
    if (window.electron) {
      window.electron.minimize();
    }
  };

  const handleMaximize = () => {
    if (window.electron) {
      window.electron.maximize();
    }
  };

  const handleClose = () => {
    if (window.electron) {
      window.electron.close();
    } else {
        // Fallback for web mode check
        alert("Закрытие работает только в приложении.");
    }
  };

  return (
    <header className={`h-12 flex items-center justify-between px-4 border-b shrink-0 select-none transition-colors duration-300 ${isDarkMode ? 'bg-[#202225] border-[#202225] text-white' : 'bg-white border-[#e3e5e8] text-gray-800'} app-drag-region`}>
      <div className="flex items-center gap-2 min-w-0 flex-1 mr-4 opacity-0 animate-in fade-in duration-500 slide-in-from-left-5">
        <span className="text-[#8e9297] font-bold text-xl opacity-50 shrink-0">#</span>
        <h1 className="font-bold text-base truncate tracking-tight">{activeLabel}</h1>
      </div>

      {/* Desktop Window Controls - Only in Electron */}
      {window.electron && (
        <div className="flex items-center h-full -mr-4 no-drag shrink-0">
          <button 
            onClick={handleMinimize}
            className={`h-full w-12 flex items-center justify-center transition-colors duration-200 group ${isDarkMode ? 'hover:bg-[#424549]' : 'hover:bg-gray-100'}`}
            aria-label="Свернуть"
          >
            <Minus size={16} className="opacity-70 group-hover:opacity-100" />
          </button>
          <button 
            onClick={handleMaximize}
            className={`h-full w-12 flex items-center justify-center transition-colors duration-200 group ${isDarkMode ? 'hover:bg-[#424549]' : 'hover:bg-gray-100'}`}
            aria-label="Развернуть"
          >
            <Square size={12} className="opacity-70 group-hover:opacity-100" />
          </button>
          <button 
            onClick={handleClose}
            className={`h-full w-12 flex items-center justify-center transition-colors duration-200 hover:bg-[#ed4245] hover:text-white group`}
            aria-label="Закрыть"
          >
            <X size={18} className="opacity-70 group-hover:opacity-100" />
          </button>
        </div>
      )}
      
      <style>{`
        .app-drag-region {
          -webkit-app-region: drag;
        }
        .no-drag {
          -webkit-app-region: no-drag;
        }
      `}</style>
    </header>
  );
};

export default Header;