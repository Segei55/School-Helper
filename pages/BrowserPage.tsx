import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, ArrowRight, RotateCw, Plus, X, Globe, 
  Search, Shield, ShieldAlert, History, Settings,
  Home, Star, MoreVertical, Loader2, Cloud, Upload, Download, CheckCircle, AlertTriangle, Lock
} from 'lucide-react';
import { BrowserTab, BrowserHistoryItem, BrowserSettings, BrowserData } from '../types';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface BrowserPageProps {
  isDarkMode?: boolean;
  isLoggedIn: boolean;
  isPremium?: boolean;
  onTriggerPremium?: (source: string) => void;
  onSyncError?: () => void;
  externalUrlRequest?: string | null;
  onExternalUrlHandled?: () => void;
}

const DEFAULT_SETTINGS: BrowserSettings = {
  homePage: 'https://ya.ru',
  searchEngineUrl: 'https://yandex.ru/search/?text=',
  adBlockEnabled: true
};

const BROWSER_DATA_FILE = 'browser_data.json';

// --- Sortable Tab Component ---
interface SortableTabProps {
  tab: BrowserTab;
  activeTabId: string;
  isDarkMode: boolean;
  setActiveTabId: (id: string) => void;
  closeTab: (e: React.MouseEvent, id: string) => void;
}

const SortableTab = ({ tab, activeTabId, isDarkMode, setActiveTabId, closeTab }: SortableTabProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => setActiveTabId(tab.id)}
        className={`group relative flex items-center gap-2 px-3 py-2 rounded-t-xl min-w-[120px] max-w-[200px] cursor-pointer transition-colors border-t border-x select-none ${
            activeTabId === tab.id 
            ? (isDarkMode ? 'bg-[#2f3136] border-white/5' : 'bg-white border-gray-200')
            : 'border-transparent opacity-60 hover:opacity-100 hover:bg-black/5'
        }`}
    >
        {tab.isLoading ? <Loader2 size={12} className="animate-spin text-blue-500 shrink-0" /> : <Globe size={12} className="shrink-0" />}
        <span className="text-xs font-medium truncate flex-1">{tab.title || 'Вкладка'}</span>
        <button 
            onClick={(e) => closeTab(e, tab.id)}
            className="p-0.5 rounded-full hover:bg-red-500/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            onPointerDown={(e) => e.stopPropagation()} // Prevent drag start on close button
        >
            <X size={12} />
        </button>
    </div>
  );
};

const BrowserPage: React.FC<BrowserPageProps> = ({ isDarkMode = true, isLoggedIn, isPremium, onTriggerPremium, onSyncError, externalUrlRequest, onExternalUrlHandled }) => {
  // --- Lazy Initial State for Persistence ---
  const [tabs, setTabs] = useState<BrowserTab[]>(() => {
      try {
          const savedData = localStorage.getItem('school_helper_browser_data');
          if (savedData) {
              const parsed: BrowserData = JSON.parse(savedData);
              // Ensure at least one tab if saved array is empty or corrupt
              if (parsed.tabs && parsed.tabs.length > 0) {
                  // Reset loading state on reload
                  return parsed.tabs.map(t => ({...t, isLoading: false}));
              }
          }
      } catch(e) {}
      return [{ id: '1', url: DEFAULT_SETTINGS.homePage, title: 'Новая вкладка', isLoading: false, canGoBack: false, canGoForward: false }];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
      try {
          const savedData = localStorage.getItem('school_helper_browser_data');
          if (savedData) {
              const parsed: BrowserData = JSON.parse(savedData);
              if (parsed.activeTabId) return parsed.activeTabId;
          }
      } catch(e) {}
      return '1';
  });

  const [history, setHistory] = useState<BrowserHistoryItem[]>(() => {
      try {
          const savedData = localStorage.getItem('school_helper_browser_data');
          if (savedData) {
              const parsed: BrowserData = JSON.parse(savedData);
              return parsed.history || [];
          }
      } catch(e) {}
      return [];
  });

  const [settings, setSettings] = useState<BrowserSettings>(() => {
      try {
          const savedData = localStorage.getItem('school_helper_browser_data');
          if (savedData) {
              const parsed: BrowserData = JSON.parse(savedData);
              return parsed.settings || DEFAULT_SETTINGS;
          }
      } catch(e) {}
      return DEFAULT_SETTINGS;
  });

  // Local UI State
  const [urlInput, setUrlInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Refs for webviews (mapped by tab ID)
  const webviewRefs = useRef<Record<string, any>>({});

  // Detect Electron
  const isElectron = !!window.electron;

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setTabs((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Apply AdBlock on mount/settings change
  useEffect(() => {
      if (window.electron?.setAdBlock) {
          window.electron.setAdBlock(settings.adBlockEnabled);
      }
  }, [settings.adBlockEnabled]);

  // --- Persistence Effect ---
  // Save everything to localStorage whenever critical state changes
  useEffect(() => {
    const data: BrowserData = { 
        history, 
        settings, 
        tabs, 
        activeTabId 
    };
    localStorage.setItem('school_helper_browser_data', JSON.stringify(data));
  }, [history, settings, tabs, activeTabId]);

  // Update input when active tab changes
  useEffect(() => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab) {
      setUrlInput(activeTab.url);
    }
  }, [activeTabId, tabs]);

  // --- Handle External URL Requests ---
  const lastHandledUrlRef = useRef<{url: string, time: number} | null>(null);

  useEffect(() => {
    if (externalUrlRequest) {
        const now = Date.now();
        // Prevent double handling (Strict Mode or rapid re-renders)
        if (lastHandledUrlRef.current && 
            lastHandledUrlRef.current.url === externalUrlRequest && 
            (now - lastHandledUrlRef.current.time < 1000)) {
            return;
        }
        
        lastHandledUrlRef.current = { url: externalUrlRequest, time: now };

        const newId = now.toString();
        const newTab: BrowserTab = {
            id: newId,
            url: externalUrlRequest,
            title: 'Загрузка...',
            isLoading: true,
            canGoBack: false,
            canGoForward: false
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newId);
        
        if (onExternalUrlHandled) {
            onExternalUrlHandled();
        }
    }
  }, [externalUrlRequest, onExternalUrlHandled]);

  // --- Handlers ---

  const handleNavigate = (urlStr: string) => {
    let targetUrl = urlStr;
    
    // Check if it's a URL or search query
    if (!/^https?:\/\//i.test(urlStr)) {
        if (/^[\w-]+\.[\w-]+/.test(urlStr)) {
            targetUrl = 'https://' + urlStr;
        } else {
            targetUrl = settings.searchEngineUrl + encodeURIComponent(urlStr);
        }
    }

    if (isElectron) {
       const wv = webviewRefs.current[activeTabId];
       if (wv) wv.loadURL(targetUrl);
    } else {
       // Web Fallback (iframe - limited)
       setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: targetUrl } : t));
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNavigate(urlInput);
    }
  };

  const createTab = () => {
    const newId = Date.now().toString();
    const newTab: BrowserTab = {
      id: newId,
      url: settings.homePage,
      title: 'Новая вкладка',
      isLoading: false,
      canGoBack: false,
      canGoForward: false
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const closeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tabs.length === 1) {
       handleNavigate(settings.homePage);
       return;
    }
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
    delete webviewRefs.current[id];
  };

  const addToHistory = (url: string, title: string) => {
    // Avoid duplicates for same URL if recent
    setHistory(prev => {
        const last = prev[0];
        if (last && last.url === url && Date.now() - last.timestamp < 60000) return prev;
        const newItem = { url, title, timestamp: Date.now() };
        return [newItem, ...prev.slice(0, 499)]; // Keep last 500
    });
  };

  // --- Electron Webview Events ---
  const handleWebviewRef = (id: string) => (el: any) => {
    if (el) {
        if (!webviewRefs.current[id]) {
            webviewRefs.current[id] = el;
            
            el.addEventListener('did-start-loading', () => {
                setTabs(prev => prev.map(t => t.id === id ? { ...t, isLoading: true } : t));
            });

            el.addEventListener('did-stop-loading', () => {
                setTabs(prev => prev.map(t => t.id === id ? { 
                    ...t, 
                    isLoading: false,
                    canGoBack: el.canGoBack(),
                    canGoForward: el.canGoForward(),
                    title: el.getTitle(),
                    url: el.getURL()
                } : t));
                if (id === activeTabId) setUrlInput(el.getURL());
                addToHistory(el.getURL(), el.getTitle());
            });

            el.addEventListener('did-navigate', () => {
                setTabs(prev => prev.map(t => t.id === id ? { 
                    ...t, 
                    canGoBack: el.canGoBack(),
                    canGoForward: el.canGoForward(),
                    title: el.getTitle(),
                    url: el.getURL()
                } : t));
                if (id === activeTabId) setUrlInput(el.getURL());
                addToHistory(el.getURL(), el.getTitle());
            });

            el.addEventListener('did-navigate-in-page', () => {
                setTabs(prev => prev.map(t => t.id === id ? { 
                    ...t, 
                    canGoBack: el.canGoBack(),
                    canGoForward: el.canGoForward(),
                    title: el.getTitle(),
                    url: el.getURL()
                } : t));
                if (id === activeTabId) setUrlInput(el.getURL());
                addToHistory(el.getURL(), el.getTitle());
            });

            el.addEventListener('page-title-updated', (e: any) => {
                setTabs(prev => prev.map(t => t.id === id ? { 
                    ...t, 
                    title: e.title || el.getTitle()
                } : t));
            });

            el.addEventListener('new-window', (e: any) => {
                // Open in new tab inside app instead of external
                const newId = Date.now().toString();
                setTabs(prev => [...prev, { 
                    id: newId, 
                    url: e.url, 
                    title: 'Загрузка...', 
                    isLoading: true, 
                    canGoBack: false, 
                    canGoForward: false 
                }]);
                setActiveTabId(newId);
            });
        }
    } else {
        delete webviewRefs.current[id];
    }
  };

  const goBack = () => {
      const wv = webviewRefs.current[activeTabId];
      if (wv && typeof wv.goBack === 'function' && wv.canGoBack()) wv.goBack();
  };

  const goForward = () => {
      const wv = webviewRefs.current[activeTabId];
      if (wv && typeof wv.goForward === 'function' && wv.canGoForward()) wv.goForward();
  };

  const reload = () => {
      const wv = webviewRefs.current[activeTabId];
      if (wv && typeof wv.reload === 'function') wv.reload();
  };

  const goHome = () => {
      handleNavigate(settings.homePage);
  };

  const toggleAdBlock = () => {
      const newVal = !settings.adBlockEnabled;
      setSettings(prev => ({ ...prev, adBlockEnabled: newVal }));
      if (window.electron?.setAdBlock) {
          window.electron.setAdBlock(newVal);
      }
      reload();
  };

  // --- Smart Cloud Sync ---
  const handleExport = async () => {
      if (!isLoggedIn || !window.electron?.driveExport) return;
      setSyncStatus('loading');
      try {
          const data: BrowserData = { 
              history, 
              settings,
              tabs, // We export tabs for backup, but import is careful
              activeTabId 
          };
          const success = await window.electron.driveExport(BROWSER_DATA_FILE, JSON.stringify(data));
          setSyncStatus(success ? 'success' : 'error');
      } catch (e: any) {
          if (onSyncError) onSyncError();
          setSyncStatus('error');
      }
      setTimeout(() => setSyncStatus('idle'), 2000);
  };

  const handleImport = async () => {
      if (!isLoggedIn || !window.electron?.driveImport) return;
      setSyncStatus('loading');
      try {
          const content = await window.electron.driveImport(BROWSER_DATA_FILE);
          if (content) {
              const cloudData: BrowserData = JSON.parse(content);
              
              // 1. Merge History (Smart Merge: Combine unique URLs, newest first)
              setHistory(prevHistory => {
                  const combined = [...(cloudData.history || []), ...prevHistory];
                  const uniqueMap = new Map();
                  // Sort by timestamp descending so newer entries overwrite older map entries (or we check existence)
                  combined.sort((a,b) => b.timestamp - a.timestamp);
                  combined.forEach(item => {
                      if (!uniqueMap.has(item.url)) {
                          uniqueMap.set(item.url, item);
                      }
                  });
                  return Array.from(uniqueMap.values()).slice(0, 500); // Limit to 500
              });

              // 2. Settings (Cloud wins, but keep local AdBlock if user toggled it recently? Let's take cloud)
              if (cloudData.settings) {
                  setSettings(cloudData.settings);
              }

              // 3. Tabs (Do NOT overwrite local tabs unless local is empty/default)
              // If user is working, we don't want to close their tabs. 
              // We could prompt, but "smart" usually means non-destructive.
              // If local tabs are just the default "New Tab" at home page, overwrite.
              const isLocalDefault = tabs.length === 1 && tabs[0].url === DEFAULT_SETTINGS.homePage && !tabs[0].canGoBack;
              
              if (isLocalDefault && cloudData.tabs && cloudData.tabs.length > 0) {
                  setTabs(cloudData.tabs);
                  if (cloudData.activeTabId) setActiveTabId(cloudData.activeTabId);
              } 
              // Else: Keep local tabs. 

              setSyncStatus('success');
          } else {
              setSyncStatus('error');
          }
      } catch (e: any) {
          if (onSyncError) onSyncError();
          setSyncStatus('error');
      }
      setTimeout(() => setSyncStatus('idle'), 2000);
  };

  // --- Renders ---

  return (
    <div className={`flex flex-col h-full overflow-hidden relative ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
      
      {/* 1. Top Bar: Tabs & Controls */}
      <div className={`shrink-0 flex flex-col gap-2 p-2 pb-0 ${isDarkMode ? 'bg-[#202225]' : 'bg-gray-100'} border-b ${isDarkMode ? 'border-white/5' : 'border-gray-200'}`}>
         
         {/* Tabs Strip */}
         <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={tabs.map(t => t.id)}
                strategy={horizontalListSortingStrategy}
              >
                {tabs.map(tab => (
                    <SortableTab 
                        key={tab.id}
                        tab={tab}
                        activeTabId={activeTabId}
                        isDarkMode={isDarkMode}
                        setActiveTabId={setActiveTabId}
                        closeTab={closeTab}
                    />
                ))}
              </SortableContext>
            </DndContext>
            <button onClick={createTab} className="p-2 rounded-lg hover:bg-white/10 ml-1">
                <Plus size={16} />
            </button>
         </div>

         {/* Navigation Bar */}
         <div className={`flex items-center gap-2 p-2 rounded-xl mb-2 ${isDarkMode ? 'bg-[#2f3136]' : 'bg-white shadow-sm'}`}>
            <button onClick={goBack} disabled={!tabs.find(t=>t.id===activeTabId)?.canGoBack} className="p-2 rounded-lg hover:bg-black/10 disabled:opacity-30"><ArrowLeft size={18} /></button>
            <button onClick={goForward} disabled={!tabs.find(t=>t.id===activeTabId)?.canGoForward} className="p-2 rounded-lg hover:bg-black/10 disabled:opacity-30 hidden sm:block"><ArrowRight size={18} /></button>
            <button onClick={reload} className="p-2 rounded-lg hover:bg-black/10"><RotateCw size={18} /></button>
            <button onClick={goHome} className="p-2 rounded-lg hover:bg-black/10 hidden sm:block"><Home size={18} /></button>

            {/* URL Input */}
            <div className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg border focus-within:ring-2 focus-within:ring-blue-500/50 transition-all min-w-0 ${isDarkMode ? 'bg-[#202225] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                {settings.homePage.includes('ya.ru') && <span className="text-red-500 font-bold shrink-0">Y</span>}
                <input 
                    className="flex-1 bg-transparent border-none outline-none text-sm font-medium min-w-0"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    onFocus={(e) => e.target.select()}
                    placeholder="Введите URL..."
                />
            </div>

            {/* Menu Actions */}
            <button 
                onClick={toggleAdBlock} 
                className={`p-2 rounded-lg transition-colors hidden sm:block ${settings.adBlockEnabled ? 'text-blue-500 bg-blue-500/10' : 'text-gray-400'}`}
                title={settings.adBlockEnabled ? "Реклама блокируется" : "Блокировщик выключен"}
            >
                {settings.adBlockEnabled ? <Shield size={18} /> : <ShieldAlert size={18} />}
            </button>
            
            <button onClick={() => setShowHistory(true)} className="p-2 rounded-lg hover:bg-black/10 hidden sm:block"><History size={18} /></button>
            <button onClick={() => setShowSettings(true)} className="p-2 rounded-lg hover:bg-black/10"><Settings size={18} /></button>
         </div>
      </div>

      {/* 2. Webview Container */}
      <div className="flex-1 relative bg-white overflow-hidden">
         {!isElectron && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-800 z-50">
                 <Globe size={64} className="mb-4 text-blue-500" />
                 <h2 className="text-2xl font-bold">Браузер доступен только в приложении</h2>
                 <p className="max-w-md text-center mt-2 opacity-70">
                     Веб-версия не поддерживает безопасный серфинг из-за ограничений браузера.
                     Пожалуйста, скачайте Desktop версию.
                 </p>
             </div>
         )}
         
         {/* Render Webviews (Keep alive) */}
         {tabs.map(tab => (
             <div 
                key={tab.id} 
                className={`w-full h-full ${activeTabId === tab.id ? 'block' : 'hidden'}`}
             >
                 <webview
                    ref={handleWebviewRef(tab.id)}
                    src={tab.url}
                    className="w-full h-full"
                    allowpopups={"true" as any}
                    // Security params
                    webpreferences="nativeWindowOpen=yes, contextIsolation=yes, nodeIntegration=no, sandbox=true"
                 />
             </div>
         ))}
      </div>

      {/* 3. Settings Modal */}
      {showSettings && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
              <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl ${isDarkMode ? 'bg-[#2f3136] text-white' : 'bg-white text-gray-900'}`} onClick={e => e.stopPropagation()}>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Settings size={20} /> Настройки браузера</h2>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold uppercase opacity-50 mb-1">Стартовая страница</label>
                          <input 
                             value={settings.homePage}
                             onChange={e => setSettings({...settings, homePage: e.target.value})}
                             className={`w-full p-2 rounded border bg-transparent ${isDarkMode ? 'border-white/10' : 'border-gray-300'}`}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold uppercase opacity-50 mb-1">Поисковая система (URL запроса)</label>
                          <input 
                             value={settings.searchEngineUrl}
                             onChange={e => setSettings({...settings, searchEngineUrl: e.target.value})}
                             className={`w-full p-2 rounded border bg-transparent ${isDarkMode ? 'border-white/10' : 'border-gray-300'}`}
                          />
                          <div className="flex gap-2 mt-2">
                              <button onClick={() => setSettings({...settings, searchEngineUrl: 'https://yandex.ru/search/?text='})} className="text-xs px-2 py-1 bg-red-500/10 text-red-500 rounded">Yandex</button>
                              <button onClick={() => setSettings({...settings, searchEngineUrl: 'https://www.google.com/search?q='})} className="text-xs px-2 py-1 bg-blue-500/10 text-blue-500 rounded">Google</button>
                              <button onClick={() => setSettings({...settings, searchEngineUrl: 'https://duckduckgo.com/?q='})} className="text-xs px-2 py-1 bg-orange-500/10 text-orange-500 rounded">DuckDuckGo</button>
                          </div>
                      </div>

                      <div className="pt-4 border-t border-white/5">
                          <label className="flex items-center gap-2 cursor-pointer" onClick={toggleAdBlock}>
                              <div className={`w-10 h-6 rounded-full p-1 transition-colors ${settings.adBlockEnabled ? 'bg-blue-500' : 'bg-gray-500'}`}>
                                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.adBlockEnabled ? 'translate-x-4' : ''}`} />
                              </div>
                              <span className="font-bold text-sm">Блокировка рекламы</span>
                          </label>
                      </div>

                      <div className="pt-4 border-t border-white/5">
                          <h3 className="text-xs font-bold uppercase opacity-50 mb-2 flex items-center gap-2"><Cloud size={14} /> Синхронизация</h3>
                          <div className="flex gap-2">
                              <button 
                                onClick={handleImport}
                                className={`flex-1 p-2 rounded flex items-center justify-center gap-2 text-sm font-bold bg-blue-500/10 text-blue-500 hover:bg-blue-500/20`}
                              >
                                  {syncStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Импорт
                              </button>
                              <button 
                                onClick={handleExport}
                                className={`flex-1 p-2 rounded flex items-center justify-center gap-2 text-sm font-bold bg-green-500/10 text-green-500 hover:bg-green-500/20`}
                              >
                                  {syncStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Экспорт
                              </button>
                          </div>
                          {/* TEMPORARILY HIDDEN
                          {!isPremium && <div className="text-[10px] text-center mt-1 opacity-50 flex items-center justify-center gap-1"><Lock size={10} /> Только Premium</div>}
                          */}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* 4. History Modal */}
      {showHistory && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowHistory(false)}>
              <div className={`w-full max-w-lg h-[80%] flex flex-col p-6 rounded-2xl shadow-2xl ${isDarkMode ? 'bg-[#2f3136] text-white' : 'bg-white text-gray-900'}`} onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold flex items-center gap-2"><History size={20} /> История</h2>
                      <button onClick={() => setHistory([])} className="text-red-500 text-sm hover:underline">Очистить</button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                      {history.length === 0 ? <div className="text-center opacity-50 mt-10">История пуста</div> : 
                        history.map((item, i) => (
                          <div key={i} onClick={() => { handleNavigate(item.url); setShowHistory(false); }} className={`p-2 rounded cursor-pointer flex justify-between items-center hover:bg-black/10`}>
                              <div className="flex-1 min-w-0">
                                  <div className="font-bold text-sm truncate">{item.title || item.url}</div>
                                  <div className="text-xs opacity-50 truncate">{item.url}</div>
                              </div>
                              <div className="text-[10px] opacity-40 ml-2">
                                  {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default BrowserPage;