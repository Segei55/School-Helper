import React, { useState, useEffect, useRef } from 'react';
import { 
  Paintbrush, Eraser, PaintBucket, Type, Image as ImageIcon, 
  Grid, ZoomIn, ZoomOut, Maximize, Minimize, 
  Save, Undo2, Redo2, Download, Trash2, 
  Settings, Layers, Palette, MousePointer2, ChevronLeft, ChevronRight, Music, Pipette
} from 'lucide-react';
import { DrawingToolType, GridType } from '../../types';

interface DrawingToolbarProps {
  tool: DrawingToolType;
  setTool: (tool: DrawingToolType) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  brushColor: string;
  setBrushColor: (color: string) => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  gridType: GridType;
  setGridType: (type: GridType) => void;
  gridSize: number;
  setGridSize: (size: number) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  isPresentationMode: boolean;
  togglePresentationMode: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onSave: () => void;
  onClose: () => void;
  onDownload?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isDarkMode?: boolean;
}

const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  tool, setTool,
  brushSize, setBrushSize,
  brushColor, setBrushColor,
  backgroundColor, setBackgroundColor,
  gridType, setGridType,
  gridSize, setGridSize,
  zoom, setZoom,
  isPresentationMode, togglePresentationMode,
  onUndo, onRedo, onClear, onSave, onDownload,
  canUndo, canRedo, isDarkMode, onClose
}) => {
  const [showGridSettings, setShowGridSettings] = useState(false);
  const gridBtnRef = useRef<HTMLButtonElement>(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  if (isPresentationMode) return null;

  const btnClass = (active: boolean) => `p-2.5 rounded-xl transition-all ${active ? 'bg-[#5865f2] text-white shadow-lg' : (isDarkMode ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900')}`;
  const separatorClass = `w-8 h-[1px] ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`;

  const handleToggleGridSettings = () => {
    if (!showGridSettings && gridBtnRef.current) {
      const rect = gridBtnRef.current.getBoundingClientRect();
      setPopoverPos({ top: rect.top, left: rect.right + 12 });
    }
    setShowGridSettings(!showGridSettings);
  };

  return (
    <div 
      className="h-full w-18 flex flex-col items-center py-4 gap-4 overflow-y-auto custom-scrollbar relative"
      onScroll={() => showGridSettings && setShowGridSettings(false)}
    >
      
      {/* Back Button */}
      <button onClick={onClose} className={btnClass(false)} title="Назад">
        <ChevronLeft size={20} />
      </button>

      <div className={separatorClass} />

      {/* Main Tools */}
      <div className="flex flex-col gap-2">
        <button onClick={() => setTool('brush')} className={btnClass(tool === 'brush')} title="Кисть">
          <Paintbrush size={20} />
        </button>
        <button onClick={() => setTool('eraser')} className={btnClass(tool === 'eraser')} title="Ластик">
          <Eraser size={20} />
        </button>
        <button onClick={() => setTool('fill')} className={btnClass(tool === 'fill')} title="Заливка">
          <div className="relative">
            <PaintBucket size={20} />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-current rounded-full" />
          </div>
        </button>
        <button onClick={() => setTool('eyedropper')} className={btnClass(tool === 'eyedropper')} title="Пипетка">
          <Pipette size={20} />
        </button>
      </div>
      
      <div className={separatorClass} />

      {/* Colors */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative group">
            <input 
                type="color" 
                value={brushColor}
                onChange={(e) => setBrushColor(e.target.value)}
                className="w-8 h-8 rounded-full cursor-pointer border-2 border-white/20 p-0 overflow-hidden"
                title="Цвет кисти"
            />
        </div>
      </div>

      <div className={separatorClass} />

      {/* Size */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-[10px] font-bold opacity-50">{brushSize}px</span>
        <input 
          type="range" 
          min="1" max="200" 
          value={brushSize} 
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="h-24 w-1 appearance-none bg-gray-200 rounded-full outline-none slider-vertical"
          style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
        />
      </div>

      <div className={separatorClass} />

      {/* Actions */}
      <div className="flex flex-col gap-2 relative">
        <button 
          ref={gridBtnRef}
          onClick={handleToggleGridSettings} 
          className={btnClass(showGridSettings)} 
          title="Настройки фона"
        >
          <Grid size={20} />
        </button>
        
        {/* Grid Settings Popover */}
        {showGridSettings && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-transparent" 
              onClick={() => setShowGridSettings(false)} 
            />
            <div 
              className={`fixed z-50 p-4 rounded-2xl shadow-xl w-64 flex flex-col gap-4 ${isDarkMode ? 'bg-[#2b2d31] border border-white/10' : 'bg-white border border-gray-200'}`}
              style={{ top: popoverPos.top, left: popoverPos.left }}
            >
              <h3 className={`text-sm font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Настройки фона</h3>
              
              {/* Background Color */}
              <div className="flex items-center justify-between">
                <span className="text-xs opacity-70">Цвет фона</span>
                <div className="relative group">
                    <input 
                        type="color" 
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-8 h-8 rounded-full cursor-pointer border-2 border-white/20 p-0 overflow-hidden"
                        title="Цвет фона"
                    />
                </div>
              </div>

              <div className={`h-[1px] w-full ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} />
              
              <div className="grid grid-cols-4 gap-2">
                 <button 
                   onClick={() => setGridType('none')}
                   className={`p-2 rounded-lg flex items-center justify-center transition-colors ${gridType === 'none' ? 'bg-[#5865f2] text-white' : (isDarkMode ? 'bg-black/20 hover:bg-black/40' : 'bg-gray-100 hover:bg-gray-200')}`}
                   title="Без сетки"
                 >
                   <div className="w-4 h-4 border-2 border-current rounded-sm" />
                 </button>
                 <button 
                   onClick={() => setGridType('math')}
                   className={`p-2 rounded-lg flex items-center justify-center transition-colors ${gridType === 'math' ? 'bg-[#5865f2] text-white' : (isDarkMode ? 'bg-black/20 hover:bg-black/40' : 'bg-gray-100 hover:bg-gray-200')}`}
                   title="Клетка"
                 >
                   <Grid size={16} />
                 </button>
                 <button 
                   onClick={() => setGridType('line')}
                   className={`p-2 rounded-lg flex items-center justify-center transition-colors ${gridType === 'line' ? 'bg-[#5865f2] text-white' : (isDarkMode ? 'bg-black/20 hover:bg-black/40' : 'bg-gray-100 hover:bg-gray-200')}`}
                   title="Линейка"
                 >
                   <div className="flex flex-col gap-1 w-4">
                     <div className="h-[2px] bg-current w-full" />
                     <div className="h-[2px] bg-current w-full" />
                   </div>
                 </button>
                 <button 
                   onClick={() => setGridType('music')}
                   className={`p-2 rounded-lg flex items-center justify-center transition-colors ${gridType === 'music' ? 'bg-[#5865f2] text-white' : (isDarkMode ? 'bg-black/20 hover:bg-black/40' : 'bg-gray-100 hover:bg-gray-200')}`}
                   title="Нотный стан"
                 >
                   <Music size={16} />
                 </button>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs opacity-70">
                  <span>Размер сетки</span>
                  <span>{gridSize}px</span>
                </div>
                <input 
                  type="range" 
                  min="10" max="100" 
                  value={gridSize} 
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                />
              </div>
            </div>
          </>
        )}
        
        <button onClick={onUndo} disabled={!canUndo} className={`${btnClass(false)} ${!canUndo && 'opacity-30'}`}><Undo2 size={20} /></button>
        <button onClick={onRedo} disabled={!canRedo} className={`${btnClass(false)} ${!canRedo && 'opacity-30'}`}><Redo2 size={20} /></button>
        
        <button onClick={onSave} className={btnClass(false)} title="Сохранить проект"><Save size={20} /></button>
        <button onClick={onDownload} className={btnClass(false)} title="Экспорт изображения"><Download size={20} /></button>
        <button onClick={onClear} className={`${btnClass(false)} text-red-500 hover:bg-red-500/10 hover:text-red-500`} title="Очистить"><Trash2 size={20} /></button>
      </div>

    </div>
  );
};

export default DrawingToolbar;
