
/**
 * Сервис для работы с ИИ через OpenRouter (DeepSeek)
 */

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Стриминг ответа от DeepSeek
 * Если мы в Electron - используем безопасный IPC канал.
 * Если мы в Web - используем прямой fetch (требует настройки прокси в будущем для безопасности, сейчас работает только в dev/если ключ есть)
 */
export const streamMessageFromGemini = async (
  message: string, 
  history: any[],
  modelName: string = "deepseek/deepseek-r1",
  systemInstruction: string = 'Ты — классный парень и школьный помощник. Общайся на русском языке, будь дружелюбным, используй эмодзи 📚✨. Объясняй сложные темы просто и понятно, как друг.',
  signal?: AbortSignal
) => {
  
  // Мапим историю
  const messages: ChatMessage[] = history.map((m: any): ChatMessage => ({
      role: m.role === 'model' ? 'assistant' : 'user',
      content: m.parts[0].text
  }));
  messages.push({ role: 'user', content: message });

  // 1. ELECTRON SAFE MODE
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
          systemInstruction
      });

      if (signal) {
          signal.addEventListener('abort', () => {
              window.electron?.removeAiListeners();
          });
      }

      return {
          [Symbol.asyncIterator]: async function* () {
              while (true) {
                  if (error) throw error;
                  if (pushQueue.length > 0) {
                      const result = pushQueue.shift();
                      if (result.done) return;
                      yield result.value;
                  } else {
                      if (isDone) return;
                      // Ждем следующего чанка
                      const result: any = await new Promise(resolve => resolveQueue.push(resolve));
                      if (result.done) return;
                      yield result.value;
                  }
              }
          }
      };
  }

  // 2. WEB MODE (UNSAFE FOR PRODUCTION KEYS)
  // В веб-версии ключа нет в сборке (мы его убрали из vite.config), поэтому тут будет ошибка,
  // если пользователь не настроит свой сервер или прокси.
  // Для совместимости оставим код, но он не будет работать без backend-proxy.
  throw new Error("В веб-версии ИИ временно недоступен без серверной части. Скачайте приложение для ПК.");
};
