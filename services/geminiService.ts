
/**
 * Сервис для работы с ИИ через Polza.ai
 */

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Стриминг ответа от Polza.ai
 */
export const streamMessageFromGemini = async (
  message: string, 
  history: any[],
  modelName: string = "qwen/qwen3-vl-30b-a3b-thinking",
  systemInstruction: string = 'Ты — классный парень и школьный помощник. Общайся на русском языке, будь дружелюбным, используй эмодзи 📚✨. Объясняй сложные темы просто и понятно, как друг.',
  apiKey?: string,
  signal?: AbortSignal,
  provider: 'openrouter' | 'polza' = 'polza'
) => {
  
  // Мапим историю
  const messages: ChatMessage[] = history.map((m: any): ChatMessage => ({
      role: m.role === 'model' ? 'assistant' : 'user',
      content: m.parts[0].text
  }));
  messages.push({ role: 'user', content: message });

  // 1. ELECTRON SAFE MODE (If available)
  if (window.electron && window.electron.streamAiRequest) {
      // Очищаем старые листенеры
      window.electron.removeAiListeners();

      // Создаем Async Iterator для UI
      let pushQueue: any[] = [];
      let resolveQueue: any[] = [];
      let isDone = false;
      let error: any = null;

      const push = (val: any) => {
          if (resolveQueue.length > 0) {
              const resolve = resolveQueue.shift();
              resolve(val);
          } else {
              pushQueue.push(val);
          }
      };

      // Подписываемся на события Main process
      window.electron.onAiChunk((chunk: string) => push({ value: { text: chunk }, done: false }));
      window.electron.onAiDone(() => {
          isDone = true;
          push({ value: undefined, done: true });
      });
      window.electron.onAiError((err: string) => {
          error = new Error(err);
          push({ value: undefined, done: true }); // Завершаем, ошибку выбросим при чтении
      });

      // Отправляем запрос
      window.electron.streamAiRequest({
          messages, 
          model: modelName,
          systemInstruction,
          apiKey,
          provider
      });

      if (signal) {
          signal.addEventListener('abort', () => {
              window.electron?.removeAiListeners();
          });
      }

      return {
          [Symbol.asyncIterator]: async function* () {
              while (true) {
                  if (pushQueue.length > 0) {
                      const result = pushQueue.shift();
                      if (result.done) {
                          if (error) throw error;
                          return;
                      }
                      yield result.value;
                  } else {
                      if (isDone) {
                          if (error) throw error;
                          return;
                      }
                      // Ждем следующего чанка
                      const result: any = await new Promise(resolve => resolveQueue.push(resolve));
                      if (result.done) {
                          if (error) throw error;
                          return;
                      }
                      yield result.value;
                  }
              }
          }
      };
  }

  // 2. WEB MODE (Direct API Call)
  const isPolza = provider === 'polza';
  const API_KEY = apiKey || (isPolza ? process.env.POLZA_API_KEY : (process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY)) || '';
  
  if (!API_KEY) {
      throw new Error(`API ключ ${isPolza ? 'Polza.ai' : 'OpenRouter'} не настроен. Пожалуйста, добавьте его в настройки или переменные окружения.`);
  }

  const headers: any = {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
  };

  if (!isPolza) {
      headers["HTTP-Referer"] = window.location.origin;
      headers["X-Title"] = "School Helper";
  }

  try {
    const response = await fetch(isPolza ? "https://polza.ai/api/v1/chat/completions" : "https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({
        model: modelName,
        messages: [
            { role: "system", content: systemInstruction },
            ...messages
        ],
        stream: true
        }),
        signal
    });

    if (response.status === 429) {
        throw new Error('Rate Limit Exceeded: Слишком много запросов. Пожалуйста, подождите.');
    }

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`${isPolza ? 'Polza.ai' : 'OpenRouter'} API Error: ${response.status} ${errText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    return {
        [Symbol.asyncIterator]: async function* () {
            if (!reader) return;
            try {
                let buffer = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk;
                    
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep incomplete line in buffer

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed.startsWith('data: ')) {
                            const data = trimmed.slice(6);
                            if (data === '[DONE]') return;
                            try {
                                const json = JSON.parse(data);
                                const content = json.choices[0]?.delta?.content || "";
                                if (content) yield { text: content };
                            } catch (e) {
                                // ignore parse errors for partial chunks
                            }
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }
        }
    };
  } catch (error: any) {
      if (error.name === 'AbortError') {
          throw error;
      }
      console.error("AI Service Error:", error);
      throw new Error(`Ошибка подключения к ИИ: ${error.message}`);
  }
};
