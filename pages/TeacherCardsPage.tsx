import React, { useState, useEffect, useRef } from 'react';
import { 
  Layers, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Circle, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw,
  Save,
  AlertCircle,
  Search,
  MoreVertical,
  Edit2,
  ArrowLeft,
  Clock,
  Calendar,
  Play,
  Trophy,
  XCircle,
  CheckCircle2,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Flashcard, FlashcardDeck } from '../types';

interface TeacherCardsPageProps {
  isDarkMode: boolean;
}

const TeacherCardsPage: React.FC<TeacherCardsPageProps> = ({ isDarkMode }) => {
  const [view, setView] = useState<'dashboard' | 'editor' | 'presentation'>('dashboard');
  
  // Initialize decks from localStorage immediately to prevent race conditions
  const [decks, setDecks] = useState<FlashcardDeck[]>(() => {
    const saved = localStorage.getItem('teacher_flashcard_decks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse decks', e);
        return [];
      }
    }
    return [];
  });

  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const isInitialLoad = useRef(true);

  // Presentation State
  const [presentationIndex, setPresentationIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modalInputValue, setModalInputValue] = useState('');
  const [targetDeckId, setTargetDeckId] = useState<string | null>(null);

  // Editor State
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [splitWidth, setSplitWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // New card form state
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState<string[]>(['', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Migration and Initial Setup
  useEffect(() => {
    const oldCards = localStorage.getItem('teacher_flashcards');

    if (decks.length === 0 && oldCards) {
      // Migration from old single-deck system
      try {
        const parsedOldCards = JSON.parse(oldCards);
        if (parsedOldCards.length > 0) {
          const initialDeck: FlashcardDeck = {
            id: 'default-deck',
            name: 'Мои карточки',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            cards: parsedOldCards
          };
          setDecks([initialDeck]);
          // Clean up old storage
          localStorage.removeItem('teacher_flashcards');
        }
      } catch (e) {
        console.error('Migration failed', e);
      }
    }
    isInitialLoad.current = false;
  }, []);

  // Save decks to localStorage whenever they change
  useEffect(() => {
    if (!isInitialLoad.current) {
      localStorage.setItem('teacher_flashcard_decks', JSON.stringify(decks));
    }
  }, [decks]);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Editor Logic: Sync cards with active deck
  useEffect(() => {
    if (view === 'editor' && activeDeckId) {
      const deck = decks.find(d => d.id === activeDeckId);
      if (deck) {
        setCards(deck.cards);
      }
    }
  }, [view, activeDeckId]);

  // Auto-save cards to deck
  useEffect(() => {
    if (view === 'editor' && activeDeckId) {
      setDecks(prev => prev.map(d => 
        d.id === activeDeckId 
          ? { ...d, cards, updatedAt: Date.now() } 
          : d
      ));
    }
  }, [cards]);

  const handleCreateDeck = () => {
    if (!modalInputValue.trim()) return;

    const newDeck: FlashcardDeck = {
      id: Date.now().toString(),
      name: modalInputValue.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      cards: []
    };

    setDecks([newDeck, ...decks]);
    setActiveDeckId(newDeck.id);
    setView('editor');
    setShowCreateModal(false);
    setModalInputValue('');
  };

  const handleDeleteDeck = () => {
    if (targetDeckId) {
      setDecks(decks.filter(d => d.id !== targetDeckId));
      setShowDeleteModal(false);
      setTargetDeckId(null);
    }
  };

  const handleRenameDeck = () => {
    if (targetDeckId && modalInputValue.trim()) {
      setDecks(decks.map(d => d.id === targetDeckId ? { ...d, name: modalInputValue.trim(), updatedAt: Date.now() } : d));
      setShowRenameModal(false);
      setTargetDeckId(null);
      setModalInputValue('');
    }
  };

  const openCreateModal = () => {
    setModalInputValue('');
    setShowCreateModal(true);
  };

  const openRenameModal = (deck: FlashcardDeck, e: React.MouseEvent) => {
    e.stopPropagation();
    setTargetDeckId(deck.id);
    setModalInputValue(deck.name);
    setShowRenameModal(true);
  };

  const openDeleteModal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTargetDeckId(id);
    setShowDeleteModal(true);
  };

  const handleOpenDeck = (id: string) => {
    setActiveDeckId(id);
    setView('editor');
    setCurrentCardIndex(0);
  };

  const handleStartPresentation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveDeckId(id);
    const deck = decks.find(d => d.id === id);
    if (deck && deck.cards.length > 0) {
      setView('presentation');
      setPresentationIndex(0);
      setSelectedOption(null);
      setIsCorrect(null);
      setScore(0);
      setShowResults(false);
    } else {
      alert('В этом наборе нет карточек!');
    }
  };

  const handleSelectOption = (index: number) => {
    if (selectedOption !== null || !activeDeck) return;
    
    const card = activeDeck.cards[presentationIndex];
    setSelectedOption(index);
    const correct = index === card.correctOptionIndex;
    setIsCorrect(correct);
    
    if (correct) {
      setScore(prev => prev + 1);
      // Create particles
      const newParticles = Array.from({ length: 20 }).map((_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100 - 50,
        y: Math.random() * 100 - 50,
        color: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][Math.floor(Math.random() * 5)]
      }));
      setParticles(newParticles);
      setTimeout(() => setParticles([]), 1000);
    }

    setTimeout(() => {
      if (presentationIndex < activeDeck.cards.length - 1) {
        setPresentationIndex(prev => prev + 1);
        setSelectedOption(null);
        setIsCorrect(null);
      } else {
        setShowResults(true);
      }
    }, 1500);
  };

  const restartPresentation = () => {
    setPresentationIndex(0);
    setSelectedOption(null);
    setIsCorrect(null);
    setScore(0);
    setShowResults(false);
  };

  // Editor Functions (Copied and adapted)
  const handleMouseDown = () => {
    if (isMobile) return;
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      setSplitWidth(Math.max(20, Math.min(80, newWidth)));
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleAddOption = () => {
    if (newOptions.length < 6) setNewOptions([...newOptions, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (newOptions.length > 2) {
      const updated = newOptions.filter((_, i) => i !== index);
      setNewOptions(updated);
      if (correctIndex >= updated.length) setCorrectIndex(updated.length - 1);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...newOptions];
    updated[index] = value;
    setNewOptions(updated);
  };

  const handleSaveCard = () => {
    if (!newQuestion.trim() || newOptions.some(opt => !opt.trim())) return;
    const cardColors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500', 'bg-indigo-500'];
    const randomColor = cardColors[Math.floor(Math.random() * cardColors.length)];

    if (editingId) {
      setCards(prev => prev.map(c => c.id === editingId ? {
        ...c, question: newQuestion, options: newOptions, correctOptionIndex: correctIndex
      } : c));
      setEditingId(null);
    } else {
      const newCard: Flashcard = {
        id: Date.now().toString(),
        question: newQuestion,
        options: newOptions,
        correctOptionIndex: correctIndex,
        color: randomColor
      };
      setCards([...cards, newCard]);
    }
    setNewQuestion('');
    setNewOptions(['', '']);
    setCorrectIndex(0);
  };

  const handleDeleteCard = (id: string) => {
    const updated = cards.filter(c => c.id !== id);
    setCards(updated);
    if (currentCardIndex >= updated.length && updated.length > 0) {
      setCurrentCardIndex(updated.length - 1);
    }
  };

  const handleEditCard = (card: Flashcard) => {
    setNewQuestion(card.question);
    setNewOptions(card.options);
    setCorrectIndex(card.correctOptionIndex);
    setEditingId(card.id);
  };

  const nextCard = () => {
    if (cards.length > 0) setCurrentCardIndex((prev) => (prev + 1) % cards.length);
  };

  const prevCard = () => {
    if (cards.length > 0) setCurrentCardIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const bgColor = isDarkMode ? 'bg-[#1e1f22]' : 'bg-gray-50';
  const cardBg = isDarkMode ? 'bg-[#2b2d31]' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const subTextColor = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const borderColor = isDarkMode ? 'border-white/10' : 'border-gray-200';

  const filteredDecks = decks.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (view === 'dashboard') {
    return (
      <div className={`h-full w-full flex flex-col ${bgColor} ${textColor} p-6 overflow-y-auto custom-scrollbar`}>
        <div className="max-w-6xl mx-auto w-full space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight">Наборы карточек</h1>
              <p className={subTextColor}>Создавайте и управляйте наборами для занятий</p>
            </div>
            <button 
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[#9c84ef] hover:bg-[#8a72e0] text-white rounded-2xl font-bold shadow-lg shadow-[#9c84ef]/20 transition-all active:scale-95"
            >
              <Plus size={20} />
              Новый набор
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${subTextColor}`} size={20} />
            <input 
              type="text"
              placeholder="Поиск наборов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-12 pr-4 py-4 rounded-2xl outline-none border-2 transition-all font-bold ${
                isDarkMode ? 'bg-black/20 border-white/5 focus:border-[#9c84ef]' : 'bg-white border-gray-100 focus:border-[#9c84ef]'
              }`}
            />
          </div>

          {/* Grid */}
          {filteredDecks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className={`w-24 h-24 rounded-3xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'} flex items-center justify-center`}>
                <Layers size={48} className="text-gray-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold">Наборов пока нет</h3>
                <p className={subTextColor}>Создайте свой первый набор карточек для урока</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDecks.map(deck => (
                <motion.div
                  key={deck.id}
                  layoutId={deck.id}
                  onClick={() => handleOpenDeck(deck.id)}
                  className={`group relative p-6 rounded-[32px] border-2 ${borderColor} ${cardBg} hover:border-[#9c84ef] transition-all cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1`}
                >
                  <div className="flex flex-col h-full space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="p-3 rounded-2xl bg-[#9c84ef]/10 text-[#9c84ef]">
                        <Layers size={24} />
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => handleStartPresentation(deck.id, e)}
                          className={`p-2 rounded-xl hover:bg-emerald-500/10 text-emerald-500`}
                          title="Презентация"
                        >
                          <Play size={18} />
                        </button>
                        <button 
                          onClick={(e) => openRenameModal(deck, e)}
                          className={`p-2 rounded-xl hover:bg-blue-500/10 text-blue-500`}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={(e) => openDeleteModal(deck.id, e)}
                          className={`p-2 rounded-xl hover:bg-red-500/10 text-red-500`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-black truncate">{deck.name}</h3>
                      <p className={`text-sm font-bold ${subTextColor}`}>
                        Карточек: {deck.cards.length}
                      </p>
                    </div>

                    <div className="pt-4 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest opacity-50">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(deck.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(deck.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Custom Modals */}
        <AnimatePresence>
          {(showCreateModal || showRenameModal) && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`w-full max-w-md p-6 rounded-[32px] ${cardBg} border-2 ${borderColor} shadow-2xl`}
              >
                <h3 className="text-2xl font-black mb-4">
                  {showCreateModal ? 'Новый набор' : 'Переименовать'}
                </h3>
                <input 
                  autoFocus
                  type="text"
                  value={modalInputValue}
                  onChange={(e) => setModalInputValue(e.target.value)}
                  placeholder="Название набора..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') showCreateModal ? handleCreateDeck() : handleRenameDeck();
                    if (e.key === 'Escape') {
                      setShowCreateModal(false);
                      setShowRenameModal(false);
                    }
                  }}
                  className={`w-full p-4 rounded-2xl outline-none border-2 transition-all font-bold mb-6 ${
                    isDarkMode ? 'bg-black/20 border-white/5 focus:border-[#9c84ef]' : 'bg-gray-50 border-gray-100 focus:border-[#9c84ef]'
                  }`}
                />
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowRenameModal(false);
                    }}
                    className={`flex-1 py-3 rounded-xl font-bold ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} transition-all`}
                  >
                    Отмена
                  </button>
                  <button 
                    onClick={showCreateModal ? handleCreateDeck : handleRenameDeck}
                    className="flex-1 py-3 rounded-xl bg-[#9c84ef] hover:bg-[#8a72e0] text-white font-bold transition-all"
                  >
                    Готово
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {showDeleteModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`w-full max-w-md p-6 rounded-[32px] ${cardBg} border-2 ${borderColor} shadow-2xl`}
              >
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-2xl font-black mb-2">Удалить набор?</h3>
                <p className={`${subTextColor} mb-6 font-medium`}>
                  Это действие нельзя будет отменить. Все карточки в этом наборе будут удалены навсегда.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowDeleteModal(false)}
                    className={`flex-1 py-3 rounded-xl font-bold ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} transition-all`}
                  >
                    Отмена
                  </button>
                  <button 
                    onClick={handleDeleteDeck}
                    className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all"
                  >
                    Удалить
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Editor View
  const activeDeck = decks.find(d => d.id === activeDeckId);

  if (view === 'presentation' && activeDeck) {
    const currentCard = activeDeck.cards[presentationIndex];
    
    return (
      <div className={`h-full w-full flex flex-col ${bgColor} ${textColor} relative overflow-hidden`}>
        {/* Background Decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#9c84ef] blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500 blur-[120px]" />
        </div>

        {/* Header */}
        <div className={`p-4 border-b ${borderColor} flex items-center justify-between relative z-10 ${cardBg}`}>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setView('dashboard')}
              className={`p-2 rounded-xl hover:bg-gray-500/10 ${subTextColor}`}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="font-bold">{activeDeck.name}</h2>
              <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider">Режим презентации</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`px-4 py-1.5 rounded-full font-black text-sm ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
              Счет: <span className="text-[#9c84ef]">{score}</span>
            </div>
            <div className={`px-4 py-1.5 rounded-full font-black text-sm ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
              {presentationIndex + 1} / {activeDeck.cards.length}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 relative z-10 flex flex-col items-center custom-scrollbar">
          <div className="flex-1 w-full flex flex-col items-center justify-center min-h-full py-4">
            <AnimatePresence mode="wait">
              {showResults ? (
                <motion.div
                  key="results"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`w-full max-w-lg p-8 sm:p-12 rounded-[32px] sm:rounded-[48px] ${cardBg} border-2 ${borderColor} shadow-2xl text-center space-y-6 sm:space-y-8 my-auto`}
                >
                  <div className="relative inline-block">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                      <Trophy size={48} className="text-amber-500 sm:w-16 sm:h-16" />
                    </div>
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 border-4 border-dashed border-amber-500/30 rounded-full" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-3xl sm:text-4xl font-black">Отличная работа!</h2>
                    <p className={`${subTextColor} text-base sm:text-lg font-medium`}>Вы завершили презентацию набора</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                      <div className="text-2xl sm:text-3xl font-black text-[#9c84ef]">{score}</div>
                      <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-50">Правильно</div>
                    </div>
                    <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                      <div className="text-2xl sm:text-3xl font-black text-rose-500">{activeDeck.cards.length - score}</div>
                      <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-50">Ошибок</div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <button 
                      onClick={() => setView('dashboard')}
                      className={`w-full sm:flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} transition-all`}
                    >
                      В меню
                    </button>
                    <button 
                      onClick={restartPresentation}
                      className="w-full sm:flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-[#9c84ef] hover:bg-[#8a72e0] text-white font-bold shadow-lg shadow-[#9c84ef]/20 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={20} />
                      Заново
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={currentCard.id}
                  initial={{ x: 100, opacity: 0, rotateY: 45 }}
                  animate={{ x: 0, opacity: 1, rotateY: 0 }}
                  exit={{ x: -100, opacity: 0, rotateY: -45 }}
                  transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                  className="h-full max-h-[75vh] sm:max-h-[80vh] max-w-[85vw] sm:max-w-[400px] aspect-[2/3] perspective-1000 my-auto flex flex-col mx-auto"
                >
                  <div className={`rounded-[32px] sm:rounded-[40px] shadow-2xl p-6 sm:p-8 flex flex-col flex-1 w-full h-full ${currentCard.color || 'bg-indigo-500'} text-white relative overflow-hidden border border-white/10`}>
                    {/* Particles */}
                    {particles.map(p => (
                      <motion.div
                        key={p.id}
                        initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                        animate={{ x: p.x, y: p.y, scale: 0, opacity: 0 }}
                        className="absolute left-1/2 top-1/2 w-4 h-4 rounded-full z-50"
                        style={{ backgroundColor: p.color }}
                      />
                    ))}

                    <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar pr-2">
                      <div className="flex items-center gap-2 mb-4 sm:mb-6 shrink-0">
                        <Sparkles size={16} className="text-white/50" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Вопрос</span>
                      </div>
                      
                      <h3 className="text-2xl sm:text-3xl font-black leading-tight mb-6 sm:mb-8 shrink-0">
                        {currentCard.question}
                      </h3>

                      <div className="space-y-2 sm:space-y-3 mt-auto pb-4">
                        {currentCard.options.map((opt, idx) => {
                          const isSelected = selectedOption === idx;
                          const isCorrectOption = idx === currentCard.correctOptionIndex;
                          let stateClasses = "bg-white/10 hover:bg-white/20 border-white/10";
                          
                          if (selectedOption !== null) {
                            if (isCorrectOption) stateClasses = "bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/40";
                            else if (isSelected) stateClasses = "bg-rose-500 border-rose-400 shadow-lg shadow-rose-500/40";
                            else stateClasses = "bg-white/5 border-white/5 opacity-50";
                          }

                          return (
                            <motion.button
                              key={idx}
                              whileHover={selectedOption === null ? { scale: 1.02, x: 5 } : {}}
                              whileTap={selectedOption === null ? { scale: 0.98 } : {}}
                              onClick={() => handleSelectOption(idx)}
                              className={`w-full p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 text-left flex items-center justify-between transition-all group ${stateClasses}`}
                            >
                              <span className="text-base sm:text-lg font-bold leading-tight pr-2">{opt}</span>
                              <div className="flex items-center gap-3 shrink-0">
                                {selectedOption !== null && isCorrectOption && <CheckCircle2 size={20} className="text-white" />}
                                {selectedOption !== null && isSelected && !isCorrectOption && <XCircle size={20} className="text-white" />}
                                {selectedOption === null && (
                                  <div className="w-5 h-5 rounded-full border-2 border-white/30 group-hover:border-white/60 transition-colors" />
                                )}
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Visual Feedback Overlay */}
                    <AnimatePresence>
                      {isCorrect !== null && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={`absolute inset-0 flex items-center justify-center pointer-events-none ${isCorrect ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}
                        >
                          <motion.div
                            initial={{ scale: 0.5, rotate: -20 }}
                            animate={{ scale: 1.2, rotate: 0 }}
                            className="p-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20"
                          >
                            {isCorrect ? (
                              <CheckCircle2 size={80} className="text-white" />
                            ) : (
                              <XCircle size={80} className="text-white" />
                            )}
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  // Editor View

  return (
    <div ref={containerRef} className={`w-full flex flex-col lg:flex-row lg:h-full ${bgColor} ${textColor} transition-colors duration-300 box-border overflow-x-hidden`}>
      
      {/* Left Side: Preview */}
      <div 
        className="w-full flex flex-col relative border-b lg:border-b-0 lg:border-r border-transparent shrink-0 lg:h-full overflow-hidden"
        style={{ width: isMobile ? '100%' : `${splitWidth}%` }}
      >
        <div className={`p-3 sm:p-4 border-b ${borderColor} ${cardBg} flex items-center justify-between sticky top-0 z-20`}>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setView('dashboard')}
              className={`p-2 rounded-xl hover:bg-gray-500/10 ${subTextColor}`}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="font-bold truncate max-w-[150px]">{activeDeck?.name}</h2>
              <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider">Предпросмотр</p>
            </div>
          </div>
          <div className={`text-xs font-bold px-2 py-1 rounded-md ${isDarkMode ? 'bg-black/20' : 'bg-gray-200'} ${subTextColor}`}>
            {cards.length > 0 ? `${currentCardIndex + 1} / ${cards.length}` : '0 / 0'}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 relative min-h-[350px] sm:min-h-0 flex flex-col items-center custom-scrollbar">
          <div className="flex-1 w-full flex flex-col items-center justify-center min-h-full py-4">
            {cards.length === 0 ? (
              <div className="text-center p-6 my-auto">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-4">
                  <Layers size={32} className="text-gray-400 sm:w-10 sm:h-10" />
                </div>
                <p className={`text-sm sm:text-base ${subTextColor}`}>Создайте первую карточку, чтобы увидеть её здесь</p>
              </div>
            ) : (
              <div className="relative h-full max-h-[65vh] sm:max-h-[75vh] max-w-[80vw] sm:max-w-[360px] aspect-[2/3] flex items-center justify-center my-auto mx-auto w-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={cards[currentCardIndex].id}
                    initial={{ x: 300, opacity: 0, rotate: 10 }}
                    animate={{ x: 0, opacity: 1, rotate: 0 }}
                    exit={{ x: -300, opacity: 0, rotate: -10 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className={`absolute inset-0 rounded-3xl shadow-2xl p-5 sm:p-8 flex flex-col w-full h-full ${cards[currentCardIndex].color || 'bg-indigo-500'} text-white cursor-pointer overflow-hidden`}
                    onClick={nextCard}
                  >
                    <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar pr-1">
                      <div className="text-xl sm:text-3xl font-black mb-3 sm:mb-6 leading-tight break-words">
                        {cards[currentCardIndex].question}
                      </div>
                      <div className="space-y-2 sm:space-y-3 mt-auto pb-2">
                        {cards[currentCardIndex].options.map((opt, idx) => (
                          <div 
                            key={idx} 
                            className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm border border-white/10 flex items-center gap-2 sm:gap-3 text-xs sm:text-base`}
                          >
                            <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-full border-2 border-white/50 flex items-center justify-center shrink-0">
                              {idx === cards[currentCardIndex].correctOptionIndex && (
                                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-white" />
                              )}
                            </div>
                            <span className="font-bold truncate">{opt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 inset-0 bg-white/10 rounded-3xl -z-10 translate-x-1 translate-y-1" />
                    <div className="absolute -bottom-4 -right-4 inset-0 bg-white/5 rounded-3xl -z-20 translate-x-2 translate-y-2" />
                  </motion.div>
                </AnimatePresence>

                <div className="absolute -bottom-12 sm:-bottom-16 flex items-center gap-4">
                  <button onClick={prevCard} className={`p-2 sm:p-3 rounded-full ${cardBg} border ${borderColor} shadow-lg hover:scale-110 transition-all active:scale-95`}>
                    <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
                  </button>
                  <button onClick={nextCard} className={`p-2 sm:p-3 rounded-full ${cardBg} border ${borderColor} shadow-lg hover:scale-110 transition-all active:scale-95`}>
                    <ChevronRight size={20} className="sm:w-6 sm:h-6" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resize Handle */}
      <div 
        className={`hidden lg:flex w-1.5 h-full cursor-col-resize hover:bg-[#9c84ef] transition-colors items-center justify-center group relative z-50 ${isResizing ? 'bg-[#9c84ef]' : 'bg-transparent'}`}
        onMouseDown={handleMouseDown}
      >
        <div className={`w-1 h-12 rounded-full bg-gray-400/30 group-hover:bg-white/50 ${isResizing ? 'bg-white/50' : ''}`} />
      </div>

      {/* Right Side: Creation */}
      <div 
        className={`w-full flex flex-col ${cardBg} border-t lg:border-t-0 lg:border-l ${borderColor} lg:h-full overflow-hidden`}
        style={{ width: isMobile ? '100%' : `${100 - splitWidth}%` }}
      >
        <div className={`p-3 sm:p-4 border-b ${borderColor} flex items-center justify-between sticky top-0 z-20 ${cardBg}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Plus size={20} />
            </div>
            <h2 className="font-bold">{editingId ? 'Редактировать' : 'Создание'}</h2>
          </div>
          {editingId && (
            <button 
              onClick={() => {
                setEditingId(null);
                setNewQuestion('');
                setNewOptions(['', '']);
                setCorrectIndex(0);
              }}
              className={`p-2 rounded-lg hover:bg-gray-500/10 ${subTextColor}`}
            >
              <RotateCcw size={18} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 custom-scrollbar lg:h-full">
          <div className="flex flex-col md:flex-row gap-6 sm:gap-8">
            <div className="hidden md:block w-48 lg:w-56 xl:w-64 shrink-0">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-3 ${subTextColor}`}>Предпросмотр</label>
              <div className={`aspect-[2/3] rounded-3xl shadow-xl p-4 sm:p-5 flex flex-col bg-indigo-500 text-white relative overflow-hidden`}>
                <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar pr-1">
                  <div className="text-base sm:text-xl font-black mb-3 leading-tight break-words">{newQuestion || '?'}</div>
                  <div className="space-y-1.5 mt-auto pb-2">
                    {newOptions.map((opt, idx) => (
                      <div key={idx} className={`p-1.5 rounded-lg bg-white/20 backdrop-blur-sm border border-white/10 flex items-center gap-2 text-[10px]`}>
                        <div className="w-3 h-3 rounded-full border border-white/50 flex items-center justify-center shrink-0">
                          {idx === correctIndex && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="font-bold truncate">{opt || `Вариант ${idx + 1}`}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 inset-0 bg-white/10 rounded-3xl -z-10 translate-x-1 translate-y-1" />
              </div>
            </div>

            <div className="flex-1 space-y-5">
              <div className="space-y-2">
                <label className={`block text-xs font-bold uppercase tracking-wider ${subTextColor}`}>Вопрос</label>
                <textarea
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Введите вопрос..."
                  className={`w-full p-3 sm:p-4 rounded-2xl outline-none border-2 transition-all min-h-[80px] resize-none font-bold text-base sm:text-lg ${
                    isDarkMode ? 'bg-black/20 border-white/5 focus:border-[#9c84ef]' : 'bg-gray-50 border-gray-100 focus:border-[#9c84ef]'
                  }`}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className={`block text-xs font-bold uppercase tracking-wider ${subTextColor}`}>Варианты ответов</label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-500`}>Выберите правильный</span>
                </div>
                <div className="space-y-2">
                  {newOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2 group">
                      <button onClick={() => setCorrectIndex(idx)} className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${correctIndex === idx ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : `border-2 ${borderColor} ${subTextColor} hover:border-emerald-500/50`}`}>
                        {correctIndex === idx ? <CheckCircle size={16} /> : <Circle size={16} />}
                      </button>
                      <input value={opt} onChange={(e) => handleOptionChange(idx, e.target.value)} placeholder={`Вариант ${idx + 1}`} className={`flex-1 p-2.5 sm:p-3 rounded-xl outline-none border-2 transition-all font-bold text-sm sm:text-base ${isDarkMode ? 'bg-black/20 border-white/5 focus:border-[#9c84ef]' : 'bg-gray-50 border-gray-100 focus:border-[#9c84ef]'}`} />
                      {newOptions.length > 2 && (
                        <button onClick={() => handleRemoveOption(idx)} className="p-2 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-all"><Trash2 size={16} /></button>
                      )}
                    </div>
                  ))}
                </div>
                {newOptions.length < 6 && (
                  <button onClick={handleAddOption} className={`w-full py-2.5 rounded-xl border-2 border-dashed ${borderColor} ${subTextColor} hover:border-[#9c84ef] hover:text-[#9c84ef] transition-all flex items-center justify-center gap-2 font-bold text-sm`}><Plus size={16} />Добавить вариант</button>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleSaveCard} disabled={!newQuestion.trim() || newOptions.some(opt => !opt.trim())} className={`flex-1 py-3 sm:py-4 rounded-2xl bg-[#9c84ef] hover:bg-[#8a72e0] text-white font-black text-base sm:text-lg shadow-lg shadow-[#9c84ef]/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}><Save size={18} />{editingId ? 'Сохранить' : 'Создать'}</button>
              </div>
            </div>
          </div>

          {cards.length > 0 && (
            <div className="pt-8 space-y-4">
              <label className={`block text-xs font-bold uppercase tracking-wider ${subTextColor}`}>Все карточки ({cards.length})</label>
              <div className="grid grid-cols-1 gap-3">
                {cards.map((card) => (
                  <div key={card.id} className={`p-4 rounded-2xl border ${borderColor} ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} flex items-center justify-between group`}>
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className={`w-10 h-10 rounded-xl ${card.color || 'bg-indigo-500'} flex items-center justify-center text-white shrink-0`}><Layers size={20} /></div>
                      <div className="overflow-hidden">
                        <h4 className="font-bold truncate">{card.question}</h4>
                        <p className={`text-xs ${subTextColor}`}>Вариантов: {card.options.length}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditCard(card)} className={`p-2 rounded-lg hover:bg-blue-500/10 text-blue-500`} title="Редактировать"><RotateCcw size={18} /></button>
                      <button onClick={() => handleDeleteCard(card.id)} className={`p-2 rounded-lg hover:bg-red-500/10 text-red-500`} title="Удалить"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherCardsPage;
