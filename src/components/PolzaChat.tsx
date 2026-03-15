import React, { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { useChat } from '../hooks/useChat';

export function PolzaChat() {
  const { messages, isLoading, error, sendMessage, clearMessages } = useChat('anthropic/claude-3-5-sonnet');
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('anthropic/claude-3-5-sonnet');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const currentInput = input;
    setInput('');
    await sendMessage(currentInput, selectedModel);
  };

  return (
    <div className="flex flex-col h-full max-h-[600px] w-full max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Polza.ai Assistant</h2>
          <select 
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="anthropic/claude-3-5-sonnet">Claude 3.5 Sonnet</option>
            <option value="google/gemini-3.1-pro-preview-customtools">Gemini 3.1 Pro</option>
            <option value="openai/gpt-4o">GPT-4o</option>
          </select>
        </div>
        <button 
          onClick={clearMessages}
          className="p-2 text-gray-500 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
          title="Очистить чат"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 space-y-2">
            <p>Чат пуст. Напишите что-нибудь, чтобы начать!</p>
            <p className="text-xs text-center max-w-xs">
              Запросы проксируются через безопасный Main Process к <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">https://polza.ai/api/v1</span>
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-sm' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.content as string}</p>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-gray-900 prose-pre:text-gray-100">
                    <Markdown remarkPlugins={[remarkGfm]}>
                      {msg.content as string}
                    </Markdown>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center space-x-2">
              <Loader2 size={16} className="animate-spin text-indigo-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Печатает...</span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="flex justify-center my-2">
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm flex items-center space-x-2 border border-red-200 dark:border-red-800/50">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <form onSubmit={handleSubmit} className="relative flex items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Введите сообщение..."
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none min-h-[52px] max-h-[150px]"
            rows={1}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
