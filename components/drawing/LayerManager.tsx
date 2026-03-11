import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, Trash2, Eye, EyeOff, Lock, Unlock, 
  ArrowUp, ArrowDown, Layers as LayersIcon,
  MoreVertical, Edit2, Check, X
} from 'lucide-react';
import { DrawingLayer } from '../../types';

interface LayerManagerProps {
  layers: DrawingLayer[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onAddLayer: () => void;
  onDeleteLayer: (id: string) => void;
  onReorderLayer: (id: string, direction: 'up' | 'down') => void;
  onRenameLayer: (id: string, newName: string) => void;
  onUpdateOpacity: (id: string, opacity: number) => void;
  isDarkMode: boolean;
}

const LayerManager: React.FC<LayerManagerProps> = ({
  layers,
  activeLayerId,
  onSelectLayer,
  onToggleVisibility,
  onToggleLock,
  onAddLayer,
  onDeleteLayer,
  onReorderLayer,
  onRenameLayer,
  onUpdateOpacity,
  isDarkMode
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const startEditing = (layer: DrawingLayer) => {
    setEditingId(layer.id);
    setEditName(layer.name);
  };

  const saveEditing = () => {
    if (editingId && editName.trim()) {
      onRenameLayer(editingId, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className={`flex flex-col h-full ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
      <div className="p-4 border-b flex justify-between items-center shrink-0">
        <h3 className="text-sm font-bold uppercase opacity-70 flex items-center gap-2">
          <LayersIcon size={16} /> Слои
        </h3>
        <button 
          onClick={onAddLayer}
          className="p-2 rounded-lg hover:bg-black/10 transition-colors"
          title="Новый слой"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {[...layers].reverse().map((layer, index) => (
          <div 
            key={layer.id}
            onClick={() => onSelectLayer(layer.id)}
            className={`
              group flex items-center gap-3 p-2 rounded-xl cursor-pointer select-none transition-all relative border
              ${activeLayerId === layer.id 
                ? (isDarkMode ? 'bg-[#5865f2]/10 border-[#5865f2] shadow-md' : 'bg-blue-50 border-blue-200 shadow-sm') 
                : (isDarkMode ? 'bg-[#2b2d31] border-transparent hover:bg-[#35373c]' : 'bg-white border-transparent hover:bg-gray-50')}
            `}
          >
            {/* Visibility & Lock (Left) */}
            <div className="flex flex-col gap-1 text-gray-400">
               <button onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }} className={`hover:text-[#5865f2] ${!layer.visible && 'text-gray-600 opacity-50'}`}>
                 {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
               </button>
               <button onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }} className={`hover:text-[#5865f2] ${layer.locked && 'text-red-400'}`}>
                 {layer.locked ? <Lock size={14} /> : <Unlock size={14} className="opacity-0 group-hover:opacity-50" />}
               </button>
            </div>

            {/* Preview Thumbnail */}
            <div className={`w-12 h-12 bg-white border rounded-lg overflow-hidden shrink-0 relative shadow-sm ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
               <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhYWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==')] opacity-20" />
               {layer.dataUrl && <img src={layer.dataUrl} className="w-full h-full object-contain relative z-10" />}
            </div>

            {/* Name & Opacity */}
            <div className="flex-1 min-w-0 flex flex-col justify-center h-full gap-0.5">
              {editingId === layer.id ? (
                <div className="flex items-center gap-1">
                  <input 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEditing()}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-xs bg-transparent border-b border-blue-500 outline-none py-1"
                    autoFocus
                  />
                  <button onClick={(e) => { e.stopPropagation(); saveEditing(); }}><Check size={12} className="text-green-500" /></button>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-medium truncate" onDoubleClick={() => startEditing(layer)}>{layer.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); startEditing(layer); }} className="opacity-0 group-hover:opacity-100 hover:text-blue-500 p-1"><Edit2 size={12} /></button>
                </div>
              )}
              <div className="flex items-center gap-2">
                 <div className="text-[10px] opacity-50 font-mono w-6 text-right">{Math.round(layer.opacity * 100)}%</div>
                 <input 
                   type="range" 
                   min="0" max="1" step="0.01" 
                   value={layer.opacity} 
                   onChange={(e) => onUpdateOpacity(layer.id, parseFloat(e.target.value))}
                   onClick={(e) => e.stopPropagation()}
                   className="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                 />
              </div>
            </div>

            {/* Reorder & Delete (Right) */}
            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <div className="flex gap-1">
                <button 
                  disabled={index === 0} 
                  onClick={(e) => { e.stopPropagation(); onReorderLayer(layer.id, 'up'); }}
                  className="hover:text-blue-500 disabled:opacity-20 p-1"
                >
                  <ArrowUp size={12} />
                </button>
                <button 
                  disabled={index === layers.length - 1}
                  onClick={(e) => { e.stopPropagation(); onReorderLayer(layer.id, 'down'); }}
                  className="hover:text-blue-500 disabled:opacity-20 p-1"
                >
                  <ArrowDown size={12} />
                </button>
               </div>
               
               <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteLayer(layer.id); }}
                  className="hover:text-red-500 transition-colors p-1 self-end"
                  title="Удалить слой"
                >
                  <Trash2 size={14} />
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LayerManager;
