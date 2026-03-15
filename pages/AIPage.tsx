
import React, { useState, useRef, useEffect, useLayoutEffect, memo } from 'react';
import { 
  Send, User, Loader2, Sparkles, Brain, Trash2, Bot as BotIcon, 
  AlertTriangle, StopCircle, Crown, Plus, HelpCircle, X, ChevronDown, Check, ExternalLink
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UserInfo, AIModel } from '../types';

interface AIPageProps {
  isDarkMode?: boolean;
  userInfo?: UserInfo | null;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isLoading: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onClear: () => void;
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
  isAppReady?: boolean;
  aiModels: AIModel[];
  setAiModels: React.Dispatch<React.SetStateAction<AIModel[]>>;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isStreaming?: boolean;
  isError?: boolean;
}

const MessageItem = memo(({ message, isDarkMode, userAvatarUrl }: { message: ChatMessage, isDarkMode: boolean, userAvatarUrl?: string }) => {
  const isUser = message.role === 'user';
  const bubbleClass = isUser
    ? 'bg-[#5865f2] text-white rounded-br-none'
    : `${isDarkMode ? 'bg-[#36393f] border border-white/5 text-gray-100' : 'bg-white border border-gray-100 text-gray-900 shadow-sm'} rounded-bl-none`;

  const avatarBg = isUser 
     ? (isDarkMode ? 'bg-[#4f545c]' : 'bg-gray-200')
     : (message.isError ? 'bg-red-500' : 'bg-gradient-to-br from-[#5865f2] to-[#9c84ef] shadow-lg shadow-[#5865f2]/20');

  const proseClass = isUser 
    ? 'prose-invert text-white marker:text-white prose-headings:text-white prose-p:text-white prose-strong:text-white prose-code:text-white' 
    : (isDarkMode ? 'prose-invert' : 'prose text-gray-900 marker:text-gray-900 prose-headings:text-gray-900 prose-p:text-gray-900 prose-strong:text-gray-900 prose-code:text-gray-900');

  const renderContent = (content: string) => {
      // Поддержка отображения тегов рассуждений DeepSeek
      const thinkMatch = content.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
      const thinkContent = thinkMatch ? thinkMatch[1] : null;
      const mainContent = content.replace(/<think>[\s\S]*?(?:<\/think>|$)/, '').trim();

      return (
          <>
              {thinkContent && (
                  <div className={`mb-4 p-4 rounded-xl border text-xs font-mono opacity-80 ${isDarkMode ? 'bg-black/20 border-white/10 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                      <div className="font-bold uppercase opacity-50 mb-2 text-[10px] flex items-center gap-2">
                        <Brain size={12} />
                        Цепочка рассуждений:
                      </div>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{thinkContent}</ReactMarkdown>
                  </div>
              )}
              {mainContent && (
                 <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                        code({node, className, children, ...props}: any) {
                            const match = /language-(\w+)/.exec(className || '')
                            return match ? (
                                <div className={`rounded-lg overflow-hidden my-3 border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                                    <div className={`px-4 py-1.5 text-xs font-mono font-bold opacity-70 flex justify-between items-center ${isDarkMode ? 'bg-black/30 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                        <span>{match[1]}</span>
                                    </div>
                                    <code className={`${className} block p-4 overflow-x-auto text-sm ${isDarkMode ? 'bg-[#202225]' : 'bg-gray-50'}`} {...props}>
                                        {children}
                                    </code>
                                </div>
                            ) : (
                                <code className={`px-1.5 py-0.5 rounded font-mono text-sm ${isDarkMode ? 'bg-white/10 text-gray-200' : 'bg-gray-100 text-[#ed4245]'}`} {...props}>
                                    {children}
                                </code>
                            )
                        }
                    }}
                >
                    {mainContent}
                </ReactMarkdown>
              )}
          </>
      );
  };

  return (
    <div className={`flex gap-4 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300 group ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden transition-transform group-hover:scale-105 ${avatarBg} text-white mt-auto`}>
         {isUser ? (
            userAvatarUrl ? <img src={userAvatarUrl} alt="User" className="w-full h-full object-cover" /> : <User size={20} />
         ) : (message.isError ? <AlertTriangle size={20} /> : <Sparkles size={18} />)}
      </div>
      <div className={`relative max-w-[85%] px-6 py-4 rounded-2xl shadow-sm ${bubbleClass}`}>
         <div className={`prose prose-sm max-w-none break-words leading-relaxed ${proseClass}`}>
            {isUser ? (
              <div className="whitespace-pre-wrap font-medium">{message.text}</div>
            ) : (
              message.text === '' && message.isStreaming ? (
                <div className="flex gap-1.5 items-center h-6 pl-1">
                  <span className="w-2 h-2 bg-current opacity-40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 bg-current opacity-40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 bg-current opacity-40 rounded-full animate-bounce"></span>
                </div>
              ) : (
                renderContent(message.text)
              )
            )}
         </div>
         {message.isStreaming && message.text !== '' && (
             <span className="inline-block w-2 h-4 ml-1 align-middle bg-[#5865f2] animate-pulse rounded-full"/>
         )}
      </div>
    </div>
  );
});

const AIPage: React.FC<AIPageProps> = ({ 
    isDarkMode = true, 
    userInfo, 
    messages, 
    setMessages,
    isLoading,
    onSend,
    onStop,
    onClear,
    selectedModel,
    setSelectedModel,
    isAppReady,
    aiModels,
    setAiModels
}) => {
  const [input, setInput] = useState('');
  const [msgsLeft, setMsgsLeft] = useState<number>(8);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // --- Daily Limit Logic ---
  useEffect(() => {
    if (!userInfo?.isPremium) {
        const checkUsage = () => {
            try {
                const today = new Date().toDateString();
                const usage = JSON.parse(localStorage.getItem('ai_daily_usage') || '{}');
                if (usage.date !== today) return 8;
                return Math.max(0, 8 - (usage.count || 0));
            } catch { return 8; }
        };
        setMsgsLeft(checkUsage());
        
        // Poll for changes (since App.tsx updates it)
        const interval = setInterval(() => setMsgsLeft(checkUsage()), 1000);
        return () => clearInterval(interval);
    }
  }, [userInfo?.isPremium, messages]);

  // Восстановление сессии
  useEffect(() => {
    if (messages.length === 0) {
      const saved = localStorage.getItem('school_helper_ai_session');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.messages) setMessages(parsed.messages);
        } catch (e) {}
      }
    }
  }, []);

  // --- PREMIUM RESTRICTION: Do NOT save history if free ---
  useEffect(() => {
    if (userInfo?.isPremium) {
        if (messages.length > 0) {
            localStorage.setItem('school_helper_ai_session', JSON.stringify({ messages, selectedModel }));
        } else {
            localStorage.removeItem('school_helper_ai_session');
        }
    } else {
        // Ensure no history is kept for free users across reloads
        localStorage.removeItem('school_helper_ai_session');
    }
  }, [messages, selectedModel, userInfo?.isPremium]);

  useEffect(() => {
    if (scrollRef.current) {
        const { scrollHeight, clientHeight } = scrollRef.current;
        scrollRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior: 'smooth' });
    }
  }, [messages.length, messages[messages.length - 1]?.text]);

  // ПРИНУДИТЕЛЬНЫЙ ФОКУС
  useLayoutEffect(() => {
    if (isAppReady) {
      const focusInterval = setInterval(() => {
        if (document.activeElement !== inputRef.current) {
          inputRef.current?.focus();
        } else {
          clearInterval(focusInterval);
        }
      }, 50);
      
      const timer = setTimeout(() => clearInterval(focusInterval), 1000);
      return () => {
        clearInterval(focusInterval);
        clearTimeout(timer);
      };
    }
  }, [isAppReady]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (!input.trim() || isLoading) return;
          onSend(input);
          setInput('');
      }
  };

  const handleSendClick = () => {
      if (!input.trim() || isLoading) return;
      onSend(input);
      setInput('');
  }

  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newModelId, setNewModelId] = useState('');
  const [newModelKey, setNewModelKey] = useState('');
  const [addModelProvider, setAddModelProvider] = useState<'openrouter' | 'polza'>('openrouter');
  const modelSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
              setShowModelSelector(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddModel = () => {
      if (!newModelName || !newModelId) return;
      
      const newModel: AIModel = {
          id: Math.random().toString(36).substr(2, 9),
          name: newModelName,
          modelId: newModelId,
          apiKey: newModelKey || undefined,
          provider: addModelProvider
      };
      
      setAiModels(prev => [...prev, newModel]);
      setSelectedModel(newModel.id);
      setShowAddModel(false);
      setNewModelName('');
      setNewModelId('');
      setNewModelKey('');
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<string | null>(null);

  const handleDeleteModel = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setModelToDelete(id);
      setShowDeleteConfirm(true);
  };

  const confirmDeleteModel = () => {
      if (!modelToDelete) return;
      
      setAiModels(prev => prev.filter(m => m.id !== modelToDelete));
      if (selectedModel === modelToDelete) {
          const defaultModel = aiModels.find(m => m.isDefault);
          setSelectedModel(defaultModel?.id || aiModels[0]?.id || 'default');
      }
      
      setShowDeleteConfirm(false);
      setModelToDelete(null);
  };

  const currentModel = aiModels.find(m => m.id === selectedModel) || aiModels[0];

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* --- DELETE CONFIRM MODAL --- */}
      {showDeleteConfirm && (
          <div className="fixed inset-0 z-[102] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className={`w-full max-w-sm p-6 rounded-2xl shadow-2xl relative ${isDarkMode ? 'bg-[#2f3136] text-white border border-white/10' : 'bg-white text-gray-900'}`}>
                  <h2 className="text-lg font-bold mb-2 flex items-center gap-2 text-red-500">
                      <Trash2 size={20} />
                      Удалить модель?
                  </h2>
                  <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Вы уверены, что хотите удалить эту модель из списка? Это действие нельзя отменить.
                  </p>
                  <div className="flex gap-3">
                      <button 
                          onClick={() => setShowDeleteConfirm(false)}
                          className={`flex-1 py-2 rounded-xl font-medium transition-colors ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}
                      >
                          Отмена
                      </button>
                      <button 
                          onClick={confirmDeleteModel}
                          className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors shadow-lg shadow-red-500/20"
                      >
                          Удалить
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- ADD MODEL MODAL --- */}
      {showAddModel && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl relative ${isDarkMode ? 'bg-[#2f3136] text-white border border-white/10' : 'bg-white text-gray-900'}`}>
                  <button onClick={() => setShowAddModel(false)} className="absolute top-4 right-4 opacity-50 hover:opacity-100"><X size={20}/></button>
                  <button onClick={() => setShowHelp(true)} className="absolute top-4 right-12 opacity-50 hover:opacity-100 text-[#5865f2]"><HelpCircle size={20}/></button>
                  
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <BotIcon className="text-[#5865f2]" />
                      Добавить нейросеть
                  </h2>

                  <div className={`flex border-b mb-6 ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                      <button 
                          className={`flex-1 py-2 text-sm font-bold text-center border-b-2 transition-colors ${addModelProvider === 'openrouter' ? 'border-[#5865f2] text-[#5865f2]' : 'border-transparent opacity-50 hover:opacity-100'}`}
                          onClick={() => setAddModelProvider('openrouter')}
                      >
                          OpenRouter
                      </button>
                      <button 
                          className={`flex-1 py-2 text-sm font-bold text-center border-b-2 transition-colors ${addModelProvider === 'polza' ? 'border-[#5865f2] text-[#5865f2]' : 'border-transparent opacity-50 hover:opacity-100'}`}
                          onClick={() => setAddModelProvider('polza')}
                      >
                          polza.ai
                      </button>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold uppercase opacity-50 mb-1">Название (для себя)</label>
                          <input 
                              value={newModelName}
                              onChange={(e) => setNewModelName(e.target.value)}
                              placeholder="Например: GPT-4o Mini"
                              className={`w-full p-3 rounded-xl outline-none border transition-all focus:border-[#5865f2] ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold uppercase opacity-50 mb-1">ID Модели ({addModelProvider === 'openrouter' ? 'OpenRouter' : 'Polza.ai'})</label>
                          <input 
                              value={newModelId}
                              onChange={(e) => setNewModelId(e.target.value)}
                              placeholder={addModelProvider === 'openrouter' ? 'openai/gpt-4o-mini' : 'anthropic/claude-3-5-sonnet'}
                              className={`w-full p-3 rounded-xl outline-none border transition-all focus:border-[#5865f2] ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold uppercase opacity-50 mb-1">API Key ({addModelProvider === 'openrouter' ? 'OpenRouter' : 'Polza.ai'})</label>
                          <input 
                              value={newModelKey}
                              onChange={(e) => setNewModelKey(e.target.value)}
                              type="password"
                              placeholder={addModelProvider === 'openrouter' ? 'sk-or-...' : 'pza_...'}
                              className={`w-full p-3 rounded-xl outline-none border transition-all focus:border-[#5865f2] ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}
                          />
                          <p className="text-[10px] opacity-50 mt-1">Оставьте пустым, чтобы использовать встроенный ключ</p>
                      </div>
                      
                      <button 
                          onClick={handleAddModel}
                          disabled={!newModelName || !newModelId}
                          className="w-full py-3 rounded-xl bg-[#5865f2] hover:bg-[#4752c4] text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                      >
                          Добавить
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- HELP MODAL --- */}
      {showHelp && (
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className={`w-full max-w-lg p-6 rounded-2xl shadow-2xl relative ${isDarkMode ? 'bg-[#2f3136] text-white border border-white/10' : 'bg-white text-gray-900'}`}>
                  <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 opacity-50 hover:opacity-100"><X size={20}/></button>
                  
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <HelpCircle className="text-[#5865f2]" />
                      Как подключить {addModelProvider === 'openrouter' ? 'OpenRouter' : 'Polza.ai'}?
                  </h2>
                  
                  <div className={`space-y-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <p>{addModelProvider === 'openrouter' ? 'OpenRouter' : 'Polza.ai'} — это агрегатор нейросетей, который дает доступ к GPT-4, Claude 3, Gemini и другим моделям через один API.</p>
                      
                      <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                          <h3 className="font-bold mb-2 flex items-center gap-2">1. Получите API Key</h3>
                          <ol className="list-decimal list-inside space-y-1 opacity-80">
                              {addModelProvider === 'openrouter' ? (
                                  <>
                                      <li>Зайдите на <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-[#5865f2] hover:underline">openrouter.ai/keys</a></li>
                                      <li>Войдите через Google или GitHub</li>
                                      <li>Нажмите "Create Key"</li>
                                      <li>Скопируйте ключ (начинается с sk-or-...)</li>
                                  </>
                              ) : (
                                  <>
                                      <li>Зайдите на <a href="https://polza.ai" target="_blank" rel="noreferrer" className="text-[#5865f2] hover:underline">polza.ai</a></li>
                                      <li>Войдите в аккаунт</li>
                                      <li>Скопируйте ключ (начинается с pza_...)</li>
                                  </>
                              )}
                          </ol>
                      </div>

                      <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                          <h3 className="font-bold mb-2 flex items-center gap-2">2. Выберите модель</h3>
                          <ol className="list-decimal list-inside space-y-1 opacity-80">
                              {addModelProvider === 'openrouter' ? (
                                  <>
                                      <li>Перейдите на <a href="https://openrouter.ai/models" target="_blank" rel="noreferrer" className="text-[#5865f2] hover:underline">openrouter.ai/models</a></li>
                                      <li>Выберите любую модель (например, google/gemini-2.0-flash-001)</li>
                                      <li>Скопируйте её ID (он написан серым цветом под названием)</li>
                                  </>
                              ) : (
                                  <>
                                      <li>Выберите любую модель из списка на сайте</li>
                                      <li>Скопируйте её ID (например, anthropic/claude-3-5-sonnet)</li>
                                  </>
                              )}
                          </ol>
                      </div>
                      
                      <p className="opacity-60 text-xs">
                          Примечание: Многие модели на {addModelProvider === 'openrouter' ? 'OpenRouter бесплатны (Free)' : 'Polza.ai'}, но для мощных моделей (GPT-4, Claude 3.5 Sonnet) нужно пополнить баланс.
                      </p>
                  </div>
              </div>
          </div>
      )}

      <div className={`p-2 sm:p-4 rounded-2xl flex flex-wrap gap-3 items-center justify-between shrink-0 transition-all ${isDarkMode ? 'bg-[#202225] text-white' : 'bg-white text-gray-900 shadow-sm border border-gray-100'}`}>
         <div className="flex gap-3 items-center flex-1 min-w-0">
           
           {/* MODEL SELECTOR */}
           <div className="relative" ref={modelSelectorRef}>
               <button 
                  onClick={() => setShowModelSelector(!showModelSelector)}
                  className={`relative flex items-center gap-2 px-2 py-2 sm:px-4 sm:py-2.5 rounded-xl border transition-all hover:bg-opacity-80 active:scale-95 ${isDarkMode ? 'bg-[#2f3136] border-white/5 hover:bg-[#36393f]' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
               >
                  <BotIcon size={18} className="text-[#5865f2]" />
                  <div className="flex flex-col items-start">
                      <span className="hidden sm:block text-[10px] font-bold uppercase opacity-50 leading-none mb-0.5">Модель</span>
                      <div className="flex items-center gap-1">
                          <span className={`text-sm font-bold truncate max-w-[100px] sm:max-w-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{currentModel?.name || 'Нет моделей'}</span>
                          <ChevronDown size={12} className="opacity-50" />
                      </div>
                  </div>
               </button>

               {/* DROPDOWN */}
               {showModelSelector && (
                   <div className={`absolute top-full left-0 mt-2 w-64 rounded-xl shadow-2xl border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 ${isDarkMode ? 'bg-[#2f3136] border-white/10' : 'bg-white border-gray-200'}`}>
                       <div className="max-h-64 overflow-y-auto custom-scrollbar p-1">
                           {aiModels.map(model => (
                               <button
                                  key={model.id}
                                  onClick={() => { setSelectedModel(model.id); setShowModelSelector(false); }}
                                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between group transition-colors ${selectedModel === model.id ? (isDarkMode ? 'bg-[#5865f2]/20 text-[#5865f2]' : 'bg-indigo-50 text-indigo-600') : (isDarkMode ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700')}`}
                               >
                                   <div className="flex flex-col items-start min-w-0">
                                       <span className="truncate font-medium text-sm">{model.name}</span>
                                       <span className="text-[10px] opacity-50 uppercase">{model.provider === 'openrouter' ? 'OpenRouter' : 'Polza.ai'}</span>
                                   </div>
                                   <div className="flex items-center gap-2 ml-auto">
                                       {selectedModel === model.id && <Check size={14} />}
                                       {!model.isDefault && (
                                           <div 
                                              onClick={(e) => handleDeleteModel(e, model.id)}
                                              className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                                           >
                                               <Trash2 size={12} />
                                           </div>
                                       )}
                                   </div>
                               </button>
                           ))}
                       </div>
                       <div className={`p-1 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`}>
                           <button 
                              onClick={() => { setShowAddModel(true); setShowModelSelector(false); }}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                           >
                               <Plus size={14} />
                               Добавить модель
                           </button>
                       </div>
                   </div>
               )}
           </div>
           
           {isLoading && (
               <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#5865f2]/10 text-[#5865f2]">
                   <Loader2 size={12} className="animate-spin" />
                   <span className="text-xs font-bold">{currentModel?.name?.split(' ')[0] || 'ИИ'} думает...</span>
               </div>
           )}
         </div>
         
         <button 
            onClick={onClear} 
            className={`p-2.5 transition-colors rounded-xl hover:bg-red-500/10 hover:text-red-500 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`}
            title="Очистить чат"
         >
            <Trash2 size={20} />
         </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto pr-2 custom-scrollbar scroll-smooth px-4 py-4">
        {aiModels.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-100 select-none text-center animate-in zoom-in-95 duration-500">
             <div className="relative">
                <div className={`w-32 h-32 rounded-[40px] flex items-center justify-center mb-8 shadow-2xl relative z-10 ${isDarkMode ? 'bg-gradient-to-br from-[#2f3136] to-[#202225] border border-white/5' : 'bg-white border border-gray-100'}`}>
                    <BotIcon size={64} className="text-[#5865f2]" />
                </div>
                <div className="absolute top-0 left-0 w-32 h-32 bg-[#5865f2] blur-[80px] opacity-20 animate-pulse"></div>
             </div>
            <h3 className={`font-extrabold text-2xl mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Нет подключенных нейросетей</h3>
            <div className={`max-w-xs space-y-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
               <p className="text-sm font-medium">Пожалуйста, добавьте свою модель через меню сверху, чтобы начать общение.</p>
               <button onClick={() => setShowAddModel(true)} className="px-6 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-xl font-bold transition-colors shadow-lg shadow-[#5865f2]/20">Добавить модель</button>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-100 select-none text-center animate-in zoom-in-95 duration-500">
             <div className="relative">
                <div className={`w-32 h-32 rounded-[40px] flex items-center justify-center mb-8 shadow-2xl relative z-10 ${isDarkMode ? 'bg-gradient-to-br from-[#2f3136] to-[#202225] border border-white/5' : 'bg-white border border-gray-100'}`}>
                    <Brain size={64} className="text-[#5865f2]" />
                </div>
                <div className="absolute top-0 left-0 w-32 h-32 bg-[#5865f2] blur-[80px] opacity-20 animate-pulse"></div>
             </div>
            {/* 
              ЗДЕСЬ МОЖНО ИЗМЕНИТЬ НАЗВАНИЕ И ОПИСАНИЕ НЕЙРОСЕТИ НА ГЛАВНОМ ЭКРАНЕ ЧАТА.
              По умолчанию используется имя из currentModel.name, но вы можете написать любой текст.
            */}
            <h3 className={`font-extrabold text-2xl mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{currentModel?.name || 'Claude 3.5 Sonnet'}</h3>
            <div className={`max-w-xs space-y-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
               <p className="text-sm font-medium">Ваш умный помощник на базе Qwen. Решает задачи, пишет код и объясняет сложные темы.</p>
            </div>
          </div>
        ) : (
          <div className="py-2 max-w-4xl mx-auto w-full">
              {messages.map((m, i) => <MessageItem key={i} message={m} isDarkMode={isDarkMode} userAvatarUrl={userInfo?.photoUrl} />)}
          </div>
        )}
      </div>

      <div className="p-2 sm:p-4 pt-0 max-w-4xl mx-auto w-full">
        {/* FREE PLAN LIMIT INDICATOR - TEMPORARILY HIDDEN */}
        {/*
        {!userInfo?.isPremium && (
            <div className="flex justify-center mb-2 animate-in fade-in slide-in-from-bottom-1">
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 ${msgsLeft > 0 ? 'bg-[#5865f2]/10 text-[#5865f2]' : 'bg-red-500/10 text-red-500'}`}>
                    {msgsLeft > 0 ? (
                        <>Осталось сообщений: {msgsLeft}/8</>
                    ) : (
                        <><Crown size={10} /> Лимит исчерпан</>
                    )}
                </div>
            </div>
        )}
        */}

        <div className={`flex flex-col gap-2 p-1.5 rounded-[24px] border shadow-2xl transition-all focus-within:ring-2 focus-within:ring-[#5865f2]/50 focus-within:translate-y-[-2px] ${isDarkMode ? 'bg-[#2f3136] border-[#202225]' : 'bg-white border-gray-100'}`}>
            <div className="flex items-end gap-2">
                <textarea 
                ref={inputRef}
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={aiModels.length === 0 ? "Сначала добавьте модель..." : "Спроси меня о чем угодно..."}
                className={`bg-transparent border-none flex-1 p-4 pl-5 outline-none font-medium text-base resize-none custom-scrollbar ${isDarkMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
                rows={1}
                style={{ minHeight: '56px', maxHeight: '150px' }}
                disabled={isLoading || aiModels.length === 0}
                />
                
                {isLoading ? (
                    <button 
                    onClick={onStop}
                    className="p-3 mr-1.5 mb-1.5 rounded-[20px] bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors flex items-center justify-center w-12 h-12 shrink-0"
                    title="Остановить"
                    >
                    <StopCircle size={24} />
                    </button>
                ) : (
                    <button 
                    onClick={handleSendClick} 
                    disabled={!input.trim() || aiModels.length === 0}
                    className={`p-3 mr-1.5 mb-1.5 rounded-[20px] transition-all shadow-md active:scale-95 flex items-center justify-center w-12 h-12 shrink-0 ${(!input.trim() || aiModels.length === 0) ? 'bg-gray-500/10 text-gray-400 cursor-not-allowed opacity-50' : 'bg-[#5865f2] text-white hover:bg-[#4752c4] shadow-[#5865f2]/30'}`}
                    >
                    <Send size={20} className={input.trim() ? "ml-0.5" : ""} />
                    </button>
                )}
            </div>
        </div>
        {/* TEMPORARILY HIDDEN
        {!userInfo?.isPremium && (
             <div className={`text-center mt-2 text-[10px] font-medium opacity-40 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                История чата очистится при перезагрузке (Premium функция)
             </div>
        )}
        */}
      </div>
    </div>
  );
};

export default AIPage;
