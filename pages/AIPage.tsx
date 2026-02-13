
import React, { useState, useRef, useEffect, useLayoutEffect, memo } from 'react';
import { Send, User, Loader2, Sparkles, Brain, Trash2, Bot as BotIcon, AlertTriangle, StopCircle, Crown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UserInfo } from '../types';

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
  setSelectedModel: (model: string) => void;
  isAppReady?: boolean;
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
    isAppReady
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

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      <div className={`p-4 rounded-2xl flex flex-wrap gap-3 items-center justify-between shrink-0 transition-all ${isDarkMode ? 'bg-[#202225] text-white' : 'bg-white text-gray-900 shadow-sm border border-gray-100'}`}>
         <div className="flex gap-3 items-center flex-1 min-w-0">
           <div className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${isDarkMode ? 'bg-[#2f3136] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
              <BotIcon size={18} className="text-[#5865f2]" />
              <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase opacity-50 leading-none mb-0.5">Модель</span>
                  <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>DeepSeek R1</span>
              </div>
           </div>
           
           {isLoading && (
               <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#5865f2]/10 text-[#5865f2]">
                   <Loader2 size={12} className="animate-spin" />
                   <span className="text-xs font-bold">DeepSeek думает...</span>
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
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-100 select-none text-center animate-in zoom-in-95 duration-500">
             <div className="relative">
                <div className={`w-32 h-32 rounded-[40px] flex items-center justify-center mb-8 shadow-2xl relative z-10 ${isDarkMode ? 'bg-gradient-to-br from-[#2f3136] to-[#202225] border border-white/5' : 'bg-white border border-gray-100'}`}>
                    <Brain size={64} className="text-[#5865f2]" />
                </div>
                <div className="absolute top-0 left-0 w-32 h-32 bg-[#5865f2] blur-[80px] opacity-20 animate-pulse"></div>
             </div>
            <h3 className={`font-extrabold text-2xl mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>DeepSeek R1</h3>
            <div className={`max-w-xs space-y-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
               <p className="text-sm font-medium">Ваш умный помощник на базе DeepSeek. Решает задачи, пишет код и объясняет сложные темы с использованием цепочки рассуждений.</p>
            </div>
          </div>
        ) : (
          <div className="py-2 max-w-4xl mx-auto w-full">
              {messages.map((m, i) => <MessageItem key={i} message={m} isDarkMode={isDarkMode} userAvatarUrl={userInfo?.photoUrl} />)}
          </div>
        )}
      </div>

      <div className="p-4 pt-0 max-w-4xl mx-auto w-full">
        {/* FREE PLAN LIMIT INDICATOR */}
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

        <div className={`flex flex-col gap-2 p-1.5 rounded-[24px] border shadow-2xl transition-all focus-within:ring-2 focus-within:ring-[#5865f2]/50 focus-within:translate-y-[-2px] ${isDarkMode ? 'bg-[#2f3136] border-[#202225]' : 'bg-white border-gray-100'}`}>
            <div className="flex items-end gap-2">
                <textarea 
                ref={inputRef}
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={"Спроси меня о чем угодно..."}
                className={`bg-transparent border-none flex-1 p-4 pl-5 outline-none font-medium text-base resize-none custom-scrollbar ${isDarkMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
                rows={1}
                style={{ minHeight: '56px', maxHeight: '150px' }}
                disabled={isLoading}
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
                    disabled={!input.trim()}
                    className={`p-3 mr-1.5 mb-1.5 rounded-[20px] transition-all shadow-md active:scale-95 flex items-center justify-center w-12 h-12 shrink-0 ${!input.trim() ? 'bg-gray-500/10 text-gray-400 cursor-not-allowed opacity-50' : 'bg-[#5865f2] text-white hover:bg-[#4752c4] shadow-[#5865f2]/30'}`}
                    >
                    <Send size={20} className={input.trim() ? "ml-0.5" : ""} />
                    </button>
                )}
            </div>
        </div>
        {!userInfo?.isPremium && (
             <div className={`text-center mt-2 text-[10px] font-medium opacity-40 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                История чата очистится при перезагрузке (Premium функция)
             </div>
        )}
      </div>
    </div>
  );
};

export default AIPage;
