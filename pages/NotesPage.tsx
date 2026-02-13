
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { 
  Plus, Trash2, Bold, Italic, Underline, 
  MoreVertical, Download, Upload,
  CheckCircle, AlertCircle, FileText, Lock, Loader2, X, Info
} from 'lucide-react';
import { Note, TextBlock, StyleRange } from '../types';

interface NotesPageProps {
  isDarkMode?: boolean;
  isLoggedIn: boolean;
  refreshTrigger?: number;      
  onCreateNote: () => void;     
  isCreatingGlobal: boolean;   
  isPremium?: boolean;
  onTriggerPremium?: (source: string) => void; 
}

const STORAGE_KEY = 'school_helper_notes_v3';
const DRIVE_FILENAME = 'notes.json';

// --- Helper Functions (Styles, etc.) ---
const renderStylesToHtml = (text: string, styles: StyleRange[]): string => {
  if (!text && text !== '') return ''; 
  const safeStyles = Array.isArray(styles) ? styles : [];
  if (safeStyles.length === 0) return text;
  
  const points = new Set<number>([0, text.length]);
  safeStyles.forEach(s => {
    points.add(Math.max(0, Math.min(s.start, text.length)));
    points.add(Math.max(0, Math.min(s.end, text.length)));
  });
  const sortedPoints = Array.from(points).sort((a, b) => a - b);
  
  let html = '';
  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const start = sortedPoints[i];
    const end = sortedPoints[i+1];
    const segment = text.substring(start, end);
    if (!segment) continue;
    
    const activeStyles = safeStyles.filter(s => s.start <= start && s.end >= end);
    let content = segment;
    if (activeStyles.some(s => s.isBold)) content = `<b>${content}</b>`;
    if (activeStyles.some(s => s.isItalic)) content = `<i>${content}</i>`;
    if (activeStyles.some(s => s.isUnderlined)) content = `<u>${content}</u>`;
    html += content;
  }
  return html.replace(/\n/g, '<br>');
};

const parseDomToModel = (root: HTMLElement): { text: string, styles: StyleRange[] } => {
  let text = '';
  const styles: StyleRange[] = [];
  const processNode = (node: Node, currentStyle: { isBold: boolean, isItalic: boolean, isUnderlined: boolean }) => {
    if (node.nodeType === Node.TEXT_NODE) {
       const content = node.textContent || '';
       if (content.length > 0) {
         const start = text.length;
         text += content;
         const end = text.length;
         if (currentStyle.isBold || currentStyle.isItalic || currentStyle.isUnderlined) {
           styles.push({ start, end, ...currentStyle });
         }
       }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
       const el = node as HTMLElement;
       const nextStyle = { ...currentStyle };
       if (el.tagName === 'B' || el.tagName === 'STRONG' || Number(el.style.fontWeight) >= 700) nextStyle.isBold = true;
       if (el.tagName === 'I' || el.tagName === 'EM' || el.style.fontStyle === 'italic') nextStyle.isItalic = true;
       if (el.tagName === 'U' || el.style.textDecoration.includes('underline')) nextStyle.isUnderlined = true;
       if (el.tagName === 'BR') {
          text += '\n';
       } else {
          el.childNodes.forEach(c => processNode(c, nextStyle));
          if ((el.tagName === 'DIV' || el.tagName === 'P') && node.nextSibling) {
             text += '\n';
          } else if ((el.tagName === 'DIV' || el.tagName === 'P') && !node.nextSibling && text.length > 0 && !text.endsWith('\n')) {
             text += '\n';
          }
       }
    }
  };
  processNode(root, { isBold: false, isItalic: false, isUnderlined: false });
  return { text, styles };
};

const RichTextBlock = memo(({ 
  block, onUpdate, onFocus, onCheckStyles, isDarkMode, shouldFocus 
}: { 
  block: TextBlock; onUpdate: (id: string, text: string, styles: StyleRange[]) => void;
  onFocus: (id: string) => void; onCheckStyles: () => void; isDarkMode: boolean; shouldFocus?: boolean;
}) => {
  const editableRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (editableRef.current) {
      const isFocused = document.activeElement === editableRef.current;
      const html = renderStylesToHtml(block.text, block.styles);
      if (!isFocused && editableRef.current.innerHTML !== html) {
           editableRef.current.innerHTML = html;
      }
      if (block.text === '' && editableRef.current.innerHTML !== '') {
         editableRef.current.innerHTML = '';
      }
    }
  }, [block.text, block.styles]);

  useEffect(() => {
    if (shouldFocus && editableRef.current) {
        setTimeout(() => {
            editableRef.current?.focus();
            if (block.text.length > 0) {
               const range = document.createRange();
               const sel = window.getSelection();
               range.selectNodeContents(editableRef.current!);
               range.collapse(false);
               sel?.removeAllRanges();
               sel?.addRange(range);
            }
        }, 50);
    }
  }, [shouldFocus]);

  const handleInput = () => {
    if (!editableRef.current) return;
    const { text: rawText, styles: rawStyles } = parseDomToModel(editableRef.current);
    const indexMap = new Map<number, number>();
    let newCleanText = '';
    const tempText = rawText.replace(/\r\n/g, '\n');

    for (let i = 0; i < tempText.length; i++) {
        const char = tempText[i];
        indexMap.set(i, newCleanText.length);
        newCleanText += char;
    }
    indexMap.set(tempText.length, newCleanText.length);

    const finalNormalizedText = newCleanText.trim();
    const finalTrimStartOffset = newCleanText.length - newCleanText.trimStart().length;

    const finalStyles: StyleRange[] = [];
    if (finalNormalizedText.length > 0) {
        rawStyles.forEach(s => {
            const mappedStart = indexMap.has(s.start) ? indexMap.get(s.start)! : s.start;
            const mappedEnd = indexMap.has(s.end) ? indexMap.get(s.end)! : s.end;
            let correctedStart = mappedStart - finalTrimStartOffset;
            let correctedEnd = mappedEnd - finalTrimStartOffset;
            correctedStart = Math.max(0, Math.min(correctedStart, finalNormalizedText.length));
            correctedEnd = Math.max(0, Math.min(correctedEnd, finalNormalizedText.length));
            if (correctedStart < correctedEnd) {
                finalStyles.push({ ...s, start: correctedStart, end: correctedEnd });
            }
        });
    }

    const cleanText = finalNormalizedText;
    if (cleanText.length === 0 && block.text.length > 0) {
       document.execCommand('removeFormat', false, null);
    }
    onUpdate(block.id, cleanText, finalStyles);
    onCheckStyles();
  };

  return (
    <div className="group relative mb-4">
      <div
        ref={editableRef} 
        contentEditable 
        suppressContentEditableWarning
        onFocus={() => { onFocus(block.id); onCheckStyles(); }}
        onInput={handleInput} 
        onKeyUp={onCheckStyles} 
        onMouseUp={onCheckStyles}
        className={`w-full p-2 bg-transparent outline-none min-h-[32px] text-lg leading-relaxed prose prose-sm max-w-none dark:prose-invert ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
        data-placeholder="Напишите что-нибудь..."
        style={{ whiteSpace: 'pre-wrap' }} 
      />
    </div>
  );
});

const FormattingToolbar = ({ isDarkMode, onAction, activeStyles }: { isDarkMode: boolean, onAction: (cmd: string) => void, activeStyles: { bold: boolean, italic: boolean, underline: boolean } }) => {
  const tools = [
    { id: 'bold', icon: <Bold size={18} />, isActive: activeStyles.bold },
    { id: 'italic', icon: <Italic size={18} />, isActive: activeStyles.italic },
    { id: 'underline', icon: <Underline size={18} />, isActive: activeStyles.underline },
  ];

  return (
    <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 p-2 rounded-xl shadow-xl flex gap-1 animate-in slide-in-from-bottom-4 z-50 border transition-colors ${isDarkMode ? 'bg-[#2f3136] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-800'}`}>
      {tools.map(tool => (
        <button
          key={tool.id}
          onMouseDown={(e) => { e.preventDefault(); onAction(tool.id); }}
          className={`p-2.5 rounded-lg transition-all duration-200 ${tool.isActive ? 'bg-[#eb459e] text-white shadow-[0_0_15px_#eb459e] scale-110' : 'hover:bg-gray-500/20 text-gray-500'}`}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
};

const NoteEditor = memo(({ note, onUpdate, isDarkMode }: any) => {
  const [title, setTitle] = useState(note.title);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeStyles, setActiveStyles] = useState({ bold: false, italic: false, underline: false });

  useEffect(() => { setTitle(note.title); }, [note.title, note.id]);

  const checkStyles = useCallback(() => {
    setTimeout(() => {
      setActiveStyles({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline')
      });
    }, 10);
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', checkStyles);
    return () => document.removeEventListener('selectionchange', checkStyles);
  }, [checkStyles]);

  return (
    <div className="flex-1 flex flex-col h-full relative">
      <div className="p-8 pb-4 shrink-0">
        <input 
          value={title} 
          onChange={(e) => { setTitle(e.target.value); onUpdate({ ...note, title: e.target.value, timestamp: Date.now() }); }} 
          className={`bg-transparent border-none text-3xl font-bold mb-4 focus:ring-0 w-full outline-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`} 
          placeholder="Заголовок" 
        />
        <div className="h-[1px] w-full bg-gray-500/10 mb-2" />
      </div>
      <div className="flex-1 overflow-y-auto px-8 pb-32 custom-scrollbar">
        {note.content.map((block: any, index: number) => (
          <RichTextBlock 
            key={block.id} 
            block={block} 
            isDarkMode={isDarkMode}
            shouldFocus={index === 0} 
            onUpdate={(id, text, styles) => {
              const updatedContent = note.content.map((b: any) => b.id === id ? { ...b, text, styles } : b);
              onUpdate({ ...note, content: updatedContent, timestamp: Date.now() });
            }} 
            onFocus={setActiveBlockId} 
            onCheckStyles={checkStyles} 
          />
        ))}
      </div>
      {activeBlockId && (
        <FormattingToolbar isDarkMode={isDarkMode} onAction={(cmd: string) => { document.execCommand(cmd, false); checkStyles(); }} activeStyles={activeStyles} />
      )}
    </div>
  );
});

const NotesPage: React.FC<NotesPageProps> = ({ isDarkMode = true, isLoggedIn, refreshTrigger, onCreateNote, isCreatingGlobal, isPremium, onTriggerPremium }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [showMenu, setShowMenu] = useState(false);

  // --- Resizing Logic ---
  const [sidebarWidth, setSidebarWidth] = useState(288); // Default and Max Width
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const startResizing = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing && sidebarRef.current) {
      const rect = sidebarRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      
      if (newWidth >= 180 && newWidth <= 288) {
          setSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  // --- Notes Loading Logic ---
  const loadNotes = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNotes(parsed);
        if (parsed.length > 0 && selectedNoteId === null) {
            setSelectedNoteId(Number(parsed[0].id));
        }
      } catch (e) { console.error(e); }
    }
  }, [selectedNoteId]);
  
  useEffect(() => {
    loadNotes();
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            setNotes(parsed);
            if (parsed.length > 0) setSelectedNoteId(Number(parsed[0].id));
        }
    }
  }, [refreshTrigger]);

  const notesRef = useRef<Note[]>([]);
  useEffect(() => { notesRef.current = notes; }, [notes]);

  useEffect(() => {
    const handleUnload = () => {
       if (notesRef.current.length > 0 || isLoaded) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(notesRef.current));
       }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    const handler = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    }, 500); 
    return () => clearTimeout(handler);
  }, [notes, isLoaded]);

  const performDelete = useCallback((id: number) => {
    const targetId = Number(id);
    setNotes(prev => prev.filter(n => Number(n.id) !== targetId));
    setSelectedNoteId(current => {
      const currentId = current !== null ? Number(current) : null;
      return currentId === targetId ? null : current;
    });
  }, []);

  const handleDeleteClick = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (confirmDeleteId === id) {
      performDelete(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => {
        setConfirmDeleteId(prev => prev === id ? null : prev);
      }, 3000);
    }
  };

  const handleSelectNote = (id: number) => {
    setSelectedNoteId(id);
    setConfirmDeleteId(null);
  };

  const handleNoteUpdate = useCallback((updatedNote: Note) => {
    setNotes(prev => prev.map(n => Number(n.id) === Number(updatedNote.id) ? updatedNote : n));
  }, []);

  const handleImport = async () => {
    if (!isPremium) {
       onTriggerPremium && onTriggerPremium('import_export');
       return;
    }
    if (!window.electron || !isLoggedIn) return;
    setSyncStatus('loading');
    setShowMenu(false);
    try {
      const content = await window.electron.driveImport(DRIVE_FILENAME);
      if (content) {
        const remote: Note[] = JSON.parse(content);
        setNotes(prev => {
           const map = new Map();
           [...remote, ...prev].forEach(n => {
             const exist = map.get(Number(n.id));
             if (!exist || n.timestamp > exist.timestamp) map.set(Number(n.id), n);
           });
           return Array.from(map.values()).sort((a,b) => b.timestamp - a.timestamp);
        });
        setSyncStatus('success');
      } else {
        setSyncStatus('error');
      }
    } catch (e) { setSyncStatus('error'); }
    finally { setTimeout(() => setSyncStatus('idle'), 2000); }
  };

  const handleExport = async () => {
    if (!isPremium) {
       onTriggerPremium && onTriggerPremium('import_export');
       return;
    }
    if (!window.electron || !isLoggedIn) return;
    setSyncStatus('loading');
    setShowMenu(false);
    try {
      const content = JSON.stringify(notes);
      const ok = await window.electron.driveExport(DRIVE_FILENAME, content);
      setSyncStatus(ok ? 'success' : 'error');
    } catch (e) { setSyncStatus('error'); }
    finally { setTimeout(() => setSyncStatus('idle'), 2000); }
  };

  const activeNote = notes.find(n => Number(n.id) === Number(selectedNoteId));

  return (
    <div className="flex h-full overflow-hidden animate-in fade-in duration-500 relative select-none">
      {/* Resizable Sidebar */}
      <div 
        ref={sidebarRef}
        style={{ width: sidebarWidth }}
        className="flex flex-col gap-4 shrink-0 h-full relative"
      >
        <div className="flex items-center justify-between px-2">
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Заметки</h2>
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} 
                className={`p-2 rounded-xl transition-colors relative ${isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
              >
                 {syncStatus === 'loading' ? <Loader2 size={20} className="animate-spin text-[#eb459e]" /> : <MoreVertical size={20} />}
                 {syncStatus === 'success' && <div className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full" />}
                 {syncStatus === 'error' && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />}
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-[100]" onClick={() => setShowMenu(false)} />
                  <div className={`absolute top-full right-0 mt-2 w-56 rounded-xl shadow-2xl border z-[101] overflow-hidden ${isDarkMode ? 'bg-[#2f3136] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-800'}`}>
                    <button 
                      onClick={handleImport} 
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-left transition-colors ${!isLoggedIn ? 'opacity-50 text-gray-500' : 'hover:bg-gray-500/10'} ${!isPremium ? 'opacity-70' : ''}`}
                    >
                      {!isPremium ? <Lock size={16} /> : (isLoggedIn ? <Download size={16} className="text-[#3ba55c]" /> : <Lock size={16} />)} 
                      Импорт с Drive
                    </button>
                    <button 
                      onClick={handleExport} 
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-left transition-colors ${!isLoggedIn ? 'opacity-50 text-gray-500' : 'hover:bg-gray-500/10'} ${!isPremium ? 'opacity-70' : ''}`}
                    >
                      {!isPremium ? <Lock size={16} /> : (isLoggedIn ? <Upload size={16} className="text-[#5865f2]" /> : <Lock size={16} />)}
                      Экспорт в Drive
                    </button>
                  </div>
                </>
              )}
            </div>
        </div>

        <button 
          onClick={onCreateNote} 
          disabled={isCreatingGlobal}
          className={`w-full bg-[#eb459e] text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${isCreatingGlobal ? 'opacity-70 cursor-wait' : 'hover:brightness-110 active:scale-95'}`}
        >
          {isCreatingGlobal ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
          {isCreatingGlobal ? 'Создание...' : 'Создать заметку'}
        </button>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {notes.map(note => (
            <div 
              key={note.id} 
              onClick={() => handleSelectNote(Number(note.id))} 
              className={`p-4 rounded-2xl cursor-pointer transition-all border-2 group relative overflow-hidden ${
                Number(selectedNoteId) === Number(note.id) 
                  ? (isDarkMode ? 'bg-[#36393f] border-[#eb459e] shadow-lg' : 'bg-white border-[#eb459e] shadow-md ring-2 ring-[#eb459e]/10') 
                  : 'border-transparent hover:bg-white/5'
              }`}
            >
              <div className="pr-12">
                <h3 className={`font-bold truncate text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{note.title || 'Без названия'}</h3>
                <p className="text-[10px] mt-1 text-gray-500">{new Date(note.timestamp).toLocaleDateString()}</p>
              </div>
              
              <button 
                type="button"
                onClick={(e) => handleDeleteClick(e, note.id)}
                className={`absolute top-0 right-0 h-full transition-all flex items-center justify-center z-20 
                  ${confirmDeleteId === note.id 
                    ? 'w-24 bg-red-600 opacity-100 shadow-xl' 
                    : 'w-12 bg-[#ed4245] opacity-0 group-hover:opacity-100 hover:bg-[#c03537]'}`}
                title={confirmDeleteId === note.id ? "Нажмите для подтверждения" : "Удалить заметку"}
              >
                {confirmDeleteId === note.id ? (
                   <span className="text-white text-xs font-bold animate-in fade-in whitespace-nowrap">Удалить?</span>
                ) : (
                   <Trash2 size={18} className="text-white pointer-events-none" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Drag Handle */}
      <div
        onMouseDown={startResizing}
        className={`w-4 cursor-col-resize flex items-center justify-center group hover:scale-105 active:scale-100 z-10`}
      >
        <div className={`w-1 h-12 rounded-full transition-all duration-300 ${isResizing ? 'bg-[#eb459e] shadow-[0_0_15px_#eb459e]' : (isDarkMode ? 'bg-[#eb459e]/40 group-hover:bg-[#eb459e] group-hover:shadow-[0_0_10px_#eb459e]' : 'bg-[#eb459e]/30 group-hover:bg-[#eb459e]')}`} />
      </div>

      {/* Editor Area */}
      <div className={`flex-1 rounded-[32px] overflow-hidden relative shadow-md transition-all ${isDarkMode ? 'bg-[#2f3136] border border-white/5' : 'bg-white'}`}>
        {activeNote ? (
          <NoteEditor key={activeNote.id} note={activeNote} onUpdate={handleNoteUpdate} isDarkMode={isDarkMode} />
        ) : (
          <div className="flex-1 h-full flex flex-col items-center justify-center opacity-30 text-gray-500">
            <FileText size={80} className="mb-4" />
            <h2 className="text-xl font-bold">Выберите заметку</h2>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesPage;
