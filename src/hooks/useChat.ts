import { useState, useCallback } from 'react';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export function useChat(defaultModel = 'anthropic/claude-3-5-sonnet') {
  const [messages, setMessages] = useState<ChatCompletionMessageParam[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string, model = defaultModel) => {
    if (!content.trim()) return;

    const userMessage: ChatCompletionMessageParam = { role: 'user', content };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setIsLoading(true);
    setError(null);

    try {
      if (!window.electron?.polzaChat) {
        throw new Error('Electron API is not available.');
      }

      const responseMessage = await window.electron.polzaChat(newMessages, model);
      setMessages([...newMessages, responseMessage as ChatCompletionMessageParam]);
    } catch (err: any) {
      setError(err.message || 'Произошла неизвестная ошибка при отправке сообщения.');
    } finally {
      setIsLoading(false);
    }
  }, [messages, defaultModel]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
}
