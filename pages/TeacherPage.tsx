import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  MoreVertical, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  X,
  Save,
  Edit2,
  Loader2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Student } from '../types';

interface TeacherPageProps {
  isDarkMode: boolean;
  isLoggedIn?: boolean;
  isPremium?: boolean;
  onTriggerPremium?: (source: string) => void;
  onSyncError?: () => void;
}

const TeacherPage: React.FC<TeacherPageProps> = ({ isDarkMode, isLoggedIn, isPremium, onTriggerPremium, onSyncError }) => {
  const [activeTab, setActiveTab] = useState<'students'>('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Student; direction: 'asc' | 'desc' } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  // Form State
  const [formData, setFormData] = useState<Partial<Student>>({
    firstName: '',
    lastName: '',
    middleName: '',
    notes: '',
    email: '',
    phone: ''
  });

  // Load students from localStorage
  useEffect(() => {
    const savedStudents = localStorage.getItem('teacher_students');
    if (savedStudents) {
      try {
        setStudents(JSON.parse(savedStudents));
      } catch (e) {
        console.error('Failed to parse students', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save students to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('teacher_students', JSON.stringify(students));
    }
  }, [students, isLoaded]);

  const handleSort = (key: keyof Student) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedStudents = React.useMemo(() => {
    let sortableStudents = [...students];
    if (sortConfig !== null) {
      sortableStudents.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableStudents;
  }, [students, sortConfig]);

  const filteredStudents = sortedStudents.filter(student => 
    student.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (student.middleName && student.middleName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSaveStudent = () => {
    if (!formData.firstName || !formData.lastName) return;

    if (editingStudent) {
      setStudents(prev => prev.map(s => s.id === editingStudent.id ? { ...s, ...formData } as Student : s));
    } else {
      const newStudent: Student = {
        id: Date.now().toString(),
        firstName: formData.firstName || '',
        lastName: formData.lastName || '',
        middleName: formData.middleName || '',
        notes: formData.notes || '',
        email: formData.email || '',
        phone: formData.phone || ''
      };
      setStudents(prev => [...prev, newStudent]);
    }
    closeModal();
  };

  const handleDeleteStudent = (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этого ученика?')) {
      setStudents(prev => prev.filter(s => s.id !== id));
    }
  };

  const openModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setFormData(student);
    } else {
      setEditingStudent(null);
      setFormData({
        firstName: '',
        lastName: '',
        middleName: '',
        notes: '',
        email: '',
        phone: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStudent(null);
    setFormData({});
  };

  const handleExport = async () => {
    if (!isLoggedIn) return; 
    if (!window.electron || !window.electron.driveExport) {
        alert("Экспорт доступен только в десктопной версии.");
        return;
    }

    setSyncStatus('loading');
    
    const jsonContent = JSON.stringify(students, null, 2);
    
    try {
        const success = await window.electron.driveExport('ClassList.json', jsonContent);
        setSyncStatus(success ? 'success' : 'error');
        setTimeout(() => setSyncStatus('idle'), 2500);
    } catch (e: any) {
        console.error(e);
        if (e.message && (e.message.includes("UNAUTHORIZED") || e.message.includes("NO_TOKEN")) && onSyncError) {
             onSyncError();
        }
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 2500);
    }
  };

  const handleImport = async () => {
    if (!isLoggedIn) return;
    if (!window.electron || !window.electron.driveImport) {
        alert("Импорт доступен только в десктопной версии.");
        return;
    }

    if (!confirm("Импорт полностью заменит текущий список учеников данными с Диска. Продолжить?")) return;

    setSyncStatus('loading');

    try {
        const jsonContent = await window.electron.driveImport('ClassList.json');
        if (jsonContent) {
            const importedData = JSON.parse(jsonContent);
            if (Array.isArray(importedData)) {
              setStudents(importedData);
              setSyncStatus('success');
              setTimeout(() => setSyncStatus('idle'), 2500);
            } else {
              alert('Неверный формат файла в облаке');
              setSyncStatus('error');
              setTimeout(() => setSyncStatus('idle'), 2500);
            }
        } else {
            alert("Файл ClassList.json не найден в корне Google Диска.");
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 2500);
        }
    } catch (e: any) {
        console.error(e);
        if (e.message && (e.message.includes("UNAUTHORIZED") || e.message.includes("NO_TOKEN")) && onSyncError) {
             onSyncError();
        }
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 2500);
    }
  };

  const bgColor = isDarkMode ? 'bg-[#1e1f22]' : 'bg-gray-50';
  const cardBg = isDarkMode ? 'bg-[#2b2d31]' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const subTextColor = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const borderColor = isDarkMode ? 'border-white/10' : 'border-gray-200';
  const hoverBg = isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-100';

  return (
    <div className={`h-full w-full flex flex-col ${bgColor} ${textColor} transition-colors duration-300`}>
      {/* Header */}
      <div className={`p-4 border-b ${borderColor} ${cardBg}`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-[#5865f2]/10 text-[#5865f2]">
              <Users size={24} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Список учеников</h1>
              <p className={`text-xs sm:text-sm ${subTextColor}`}>Управление классом и учениками</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
            {syncStatus === 'loading' && <Loader2 size={18} className="animate-spin text-blue-500 hidden sm:block" />}
            {syncStatus === 'success' && <CheckCircle size={18} className="text-emerald-500 hidden sm:block" />}
            {syncStatus === 'error' && <AlertTriangle size={18} className="text-red-500 hidden sm:block" />}
            
            <button 
              onClick={handleImport} 
              disabled={!isLoggedIn || syncStatus === 'loading'}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-xl font-bold transition-all active:scale-95 text-xs sm:text-sm
                bg-[#3ba55c] hover:bg-[#2d7d46] text-white shadow-lg shadow-green-500/20
                ${(!isLoggedIn || syncStatus === 'loading') ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={!isLoggedIn ? "Войдите через Google для импорта" : "Импорт с Google Drive"}
            >
              {syncStatus === 'loading' ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              <span className="hidden sm:inline">Импорт</span>
            </button>
            <button 
              onClick={handleExport} 
              disabled={!isLoggedIn || syncStatus === 'loading'}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-xl font-bold transition-all active:scale-95 text-xs sm:text-sm
                bg-[#5865f2] hover:bg-[#4752c4] text-white shadow-lg shadow-indigo-500/20
                ${(!isLoggedIn || syncStatus === 'loading') ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={!isLoggedIn ? "Войдите через Google для экспорта" : "Экспорт на Google Drive"}
            >
              {syncStatus === 'loading' ? <Loader2 size={18} className="animate-spin" /> : syncStatus === 'success' ? <CheckCircle size={18} /> : <Upload size={18} />}
              <span className="hidden sm:inline">Экспорт</span>
            </button>
            <button onClick={() => openModal()} className="w-full md:w-auto flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-[#5865f2] text-white hover:brightness-110 transition-all shadow-lg shadow-[#5865f2]/20">
              <Plus size={18} />
              <span className="text-xs sm:text-sm font-bold">Добавить ученика</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className={`mt-6 p-1 rounded-2xl flex items-center gap-4 ${isDarkMode ? 'bg-[#1e1f22]' : 'bg-gray-100'} border ${borderColor}`}>
          <div className="flex-1 flex items-center gap-3 px-4 py-2.5">
            <Search size={18} className={subTextColor} />
            <input 
              type="text" 
              placeholder="Поиск ученика..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none w-full text-sm font-medium"
            />
          </div>
          <div className={`px-4 py-2 text-sm font-bold ${subTextColor}`}>
            Всего: {students.length}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-2 sm:p-4 overflow-hidden flex flex-col">
        {/* Students Table */}
        <div className={`flex-1 rounded-2xl overflow-hidden border ${borderColor} ${cardBg} shadow-sm flex flex-col`}>
          <div className="overflow-x-auto custom-scrollbar flex-1">
            <div className="min-w-[800px] flex flex-col h-full">
              {/* Table Header */}
              <div className={`grid grid-cols-[0.5fr_2fr_2fr_2fr_3fr_1fr] gap-4 p-4 border-b ${borderColor} ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} text-xs font-bold uppercase tracking-wider ${subTextColor} sticky top-0 z-10`}>
                <div className="text-center">№</div>
                <div onClick={() => handleSort('lastName')} className="cursor-pointer flex items-center gap-1 hover:text-[#5865f2] transition-colors">
                  Фамилия
                  {sortConfig?.key === 'lastName' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </div>
                <div onClick={() => handleSort('firstName')} className="cursor-pointer flex items-center gap-1 hover:text-[#5865f2] transition-colors">
                  Имя
                  {sortConfig?.key === 'firstName' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </div>
                <div onClick={() => handleSort('middleName')} className="cursor-pointer flex items-center gap-1 hover:text-[#5865f2] transition-colors">
                  Отчество
                  {sortConfig?.key === 'middleName' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </div>
                <div>Заметки</div>
                <div className="text-right">Действия</div>
              </div>

              {/* Table Body */}
              <div className="overflow-y-auto custom-scrollbar flex-1">
                <AnimatePresence>
                  {filteredStudents.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full flex flex-col items-center justify-center opacity-50 p-8"
                    >
                      <p className="text-lg font-medium">Список пуст</p>
                      <p className="text-sm">Добавьте учеников или импортируйте список</p>
                    </motion.div>
                  ) : (
                    filteredStudents.map((student, index) => (
                      <motion.div 
                        key={student.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2, delay: index * 0.02 }}
                        className={`grid grid-cols-[0.5fr_2fr_2fr_2fr_3fr_1fr] gap-4 p-4 border-b ${borderColor} items-center hover:bg-black/5 transition-colors group`}
                      >
                        <div className={`text-center font-bold ${subTextColor}`}>{index + 1}</div>
                        <div className="font-medium truncate" title={student.lastName}>{student.lastName}</div>
                        <div className="truncate" title={student.firstName}>{student.firstName}</div>
                        <div className={`${subTextColor} truncate`} title={student.middleName}>{student.middleName || '-'}</div>
                        <div className={`text-sm ${subTextColor} truncate`} title={student.notes}>{student.notes || '-'}</div>
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openModal(student)} className={`p-2 rounded-lg ${hoverBg} text-[#5865f2]`} title="Редактировать">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDeleteStudent(student.id)} className={`p-2 rounded-lg ${hoverBg} text-red-500`} title="Удалить">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className={`w-full max-w-lg rounded-2xl shadow-2xl p-6 ${cardBg}`}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">{editingStudent ? 'Редактирование ученика' : 'Новый ученик'}</h3>
                <button onClick={closeModal} className={`p-2 rounded-full ${hoverBg}`}><X size={20} /></button>
              </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold uppercase mb-1 ${subTextColor}`}>Фамилия *</label>
                  <input 
                    value={formData.lastName}
                    onChange={e => setFormData({...formData, lastName: e.target.value})}
                    className={`w-full p-3 rounded-xl outline-none font-medium border ${borderColor} ${isDarkMode ? 'bg-black/20' : 'bg-gray-50'}`}
                    placeholder="Иванов"
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase mb-1 ${subTextColor}`}>Имя *</label>
                  <input 
                    value={formData.firstName}
                    onChange={e => setFormData({...formData, firstName: e.target.value})}
                    className={`w-full p-3 rounded-xl outline-none font-medium border ${borderColor} ${isDarkMode ? 'bg-black/20' : 'bg-gray-50'}`}
                    placeholder="Иван"
                  />
                </div>
              </div>
              
              <div>
                <label className={`block text-xs font-bold uppercase mb-1 ${subTextColor}`}>Отчество</label>
                <input 
                  value={formData.middleName}
                  onChange={e => setFormData({...formData, middleName: e.target.value})}
                  className={`w-full p-3 rounded-xl outline-none font-medium border ${borderColor} ${isDarkMode ? 'bg-black/20' : 'bg-gray-50'}`}
                  placeholder="Иванович"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold uppercase mb-1 ${subTextColor}`}>Email</label>
                  <input 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className={`w-full p-3 rounded-xl outline-none font-medium border ${borderColor} ${isDarkMode ? 'bg-black/20' : 'bg-gray-50'}`}
                    placeholder="student@example.com"
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase mb-1 ${subTextColor}`}>Телефон</label>
                  <input 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className={`w-full p-3 rounded-xl outline-none font-medium border ${borderColor} ${isDarkMode ? 'bg-black/20' : 'bg-gray-50'}`}
                    placeholder="+7 (999) 000-00-00"
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase mb-1 ${subTextColor}`}>Заметки</label>
                <textarea 
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className={`w-full p-3 rounded-xl outline-none font-medium border ${borderColor} ${isDarkMode ? 'bg-black/20' : 'bg-gray-50'} min-h-[100px] resize-none`}
                  placeholder="Дополнительная информация об ученике..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={closeModal}
                  className={`flex-1 p-3 rounded-xl font-bold transition-colors ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  Отмена
                </button>
                <button 
                  onClick={handleSaveStudent}
                  disabled={!formData.firstName || !formData.lastName}
                  className="flex-1 p-3 rounded-xl font-bold bg-[#5865f2] text-white hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Сохранить
                </button>
              </div>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeacherPage;
