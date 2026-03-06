import React from 'react';
import { X, Keyboard, Command } from 'lucide-react';

interface HotkeysModalProps {
  onClose: () => void;
  isDarkMode: boolean;
}

const HotkeysModal: React.FC<HotkeysModalProps> = ({ onClose, isDarkMode }) => {
  const sections = [
    {
      title: 'Общие',
      shortcuts: [
        { key: 'F11', description: 'Полноэкранный режим' },
        { key: 'Esc', description: 'Закрыть модальное окно' }
      ]
    },
    {
      title: 'Рисовалка',
      shortcuts: [
        { key: 'Ctrl + Z', description: 'Отменить действие' },
        { key: 'Ctrl + Y', description: 'Повторить действие' },
        { key: 'Ctrl + Scroll', description: 'Масштабирование' },
        { key: 'ПКМ (Зажать)', description: 'Перемещение холста' },
        { key: 'Ctrl + S', description: 'Сохранить проект' }
      ]
    },
    {
      title: 'Заметки',
      shortcuts: [
        { key: 'Ctrl + B', description: 'Жирный текст' },
        { key: 'Ctrl + I', description: 'Курсив' },
        { key: 'Ctrl + U', description: 'Подчеркнутый текст' }
      ]
    },
    {
      title: 'Калькулятор',
      shortcuts: [
        { key: 'Enter', description: 'Вычислить' },
        { key: 'Esc', description: 'Очистить' },
        { key: 'Backspace', description: 'Удалить символ' }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className={`w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#2f3136] text-white' : 'bg-white text-gray-900'}`} 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-6 border-b flex items-center justify-between shrink-0 ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-[#5865f2]/20 text-[#5865f2]' : 'bg-blue-50 text-blue-600'}`}>
              <Keyboard size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Горячие клавиши</h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Управление приложением с клавиатуры</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sections.map((section, idx) => (
              <div key={idx} className={`rounded-xl overflow-hidden border ${isDarkMode ? 'border-white/10 bg-[#202225]' : 'border-gray-200 bg-gray-50'}`}>
                <div className={`px-4 py-3 font-bold text-sm uppercase tracking-wider border-b ${isDarkMode ? 'bg-[#2f3136] border-white/10 text-gray-300' : 'bg-white border-gray-200 text-gray-600'}`}>
                  {section.title}
                </div>
                <div className="p-2">
                  {section.shortcuts.map((shortcut, sIdx) => (
                    <div key={sIdx} className={`flex items-center justify-between p-2 rounded-lg ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-white'}`}>
                      <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{shortcut.description}</span>
                      <kbd className={`px-2 py-1 rounded-md text-xs font-mono font-bold border shadow-sm flex items-center gap-1 ${isDarkMode ? 'bg-[#2f3136] border-white/10 text-gray-200' : 'bg-white border-gray-200 text-gray-600'}`}>
                        {shortcut.key.includes('Ctrl') && <Command size={10} />}
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className={`p-4 border-t text-center text-xs opacity-50 ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
          Нажмите Esc, чтобы закрыть это окно
        </div>
      </div>
    </div>
  );
};

export default HotkeysModal;
