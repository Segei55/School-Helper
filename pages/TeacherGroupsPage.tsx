import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Users, 
  Shuffle, 
  Copy, 
  RefreshCw, 
  Settings2,
  AlertCircle,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Student } from '../types';

interface TeacherGroupsPageProps {
  isDarkMode: boolean;
}

interface Group {
  id: number;
  name: string;
  students: Student[];
}

const TeacherGroupsPage: React.FC<TeacherGroupsPageProps> = ({ isDarkMode }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [method, setMethod] = useState<'count' | 'size'>('count'); // 'count' = number of groups, 'size' = students per group
  const [inputValue, setInputValue] = useState<number>(2);
  const [isGenerated, setIsGenerated] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load students from localStorage
  useEffect(() => {
    const loadStudents = () => {
      const savedStudents = localStorage.getItem('teacher_students');
      if (savedStudents) {
        try {
          setStudents(JSON.parse(savedStudents));
        } catch (e) {
          console.error('Failed to parse students', e);
        }
      }
    };

    loadStudents();
    // Listen for storage changes in case students are updated in another tab
    window.addEventListener('storage', loadStudents);
    return () => window.removeEventListener('storage', loadStudents);
  }, []);

  // Load groups from localStorage
  useEffect(() => {
    const savedGroups = localStorage.getItem('teacher_groups_generated');
    if (savedGroups) {
      try {
        const parsed = JSON.parse(savedGroups);
        if (parsed && parsed.length > 0) {
            setGroups(parsed);
            setIsGenerated(true);
        }
      } catch (e) {
        console.error('Failed to parse groups', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save groups to localStorage
  useEffect(() => {
    if (isLoaded && groups.length > 0) {
        localStorage.setItem('teacher_groups_generated', JSON.stringify(groups));
    }
  }, [groups, isLoaded]);

  const handleGenerate = () => {
    if (students.length === 0) return;

    // 1. Shuffle students
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    
    const newGroups: Group[] = [];
    let numGroups = 0;

    if (method === 'count') {
      // Split into N groups
      numGroups = Math.max(1, Math.min(inputValue, students.length));
      
      // Initialize groups
      for (let i = 0; i < numGroups; i++) {
        newGroups.push({ id: i + 1, name: `Группа ${i + 1}`, students: [] });
      }

      // Distribute students
      shuffled.forEach((student, index) => {
        const groupIndex = index % numGroups;
        newGroups[groupIndex].students.push(student);
      });

    } else {
      // Split by size (approx N students per group)
      const size = Math.max(1, inputValue);
      numGroups = Math.ceil(shuffled.length / size);

      for (let i = 0; i < numGroups; i++) {
        newGroups.push({ id: i + 1, name: `Группа ${i + 1}`, students: [] });
      }

      // Distribute to fill size first, then overflow to new groups
      for (let i = 0; i < shuffled.length; i += size) {
        const chunk = shuffled.slice(i, i + size);
        const groupIndex = i / size;
        if (newGroups[groupIndex]) {
            newGroups[groupIndex].students = chunk;
        }
      }
    }

    setGroups(newGroups);
    setIsGenerated(true);
  };

  const startEditing = (group: Group) => {
      setEditingGroupId(group.id);
      setEditingName(group.name);
  };

  const saveGroupName = () => {
      if (editingGroupId !== null && editingName.trim()) {
          setGroups(prev => prev.map(g => g.id === editingGroupId ? { ...g, name: editingName.trim() } : g));
          setEditingGroupId(null);
          setEditingName('');
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') saveGroupName();
      if (e.key === 'Escape') {
          setEditingGroupId(null);
          setEditingName('');
      }
  };

  const copyGroupToClipboard = (group: Group) => {
    const text = `${group.name}:\n${group.students.map(s => `${s.lastName} ${s.firstName}`).join('\n')}`;
    navigator.clipboard.writeText(text);
  };

  const copyAllToClipboard = () => {
    const text = groups.map(g => `${g.name}:\n${g.students.map(s => `${s.lastName} ${s.firstName}`).join('\n')}`).join('\n\n');
    navigator.clipboard.writeText(text);
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
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[#eb459e]/10 text-[#eb459e]">
            <Grid size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Генератор Групп</h1>
            <p className={`text-sm ${subTextColor}`}>Автоматическое распределение учеников по командам</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        
        {students.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-64 rounded-2xl border-2 border-dashed ${borderColor} ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
            <div className="p-4 rounded-full bg-orange-500/10 text-orange-500 mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-lg font-bold mb-2">Список учеников пуст</h3>
            <p className={`text-center max-w-md mb-6 ${subTextColor}`}>
              Чтобы использовать генератор групп, сначала добавьте учеников в разделе "Ученики".
            </p>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* Controls */}
            <div className={`p-6 rounded-2xl shadow-sm border ${borderColor} ${cardBg}`}>
              <div className="flex flex-col md:flex-row items-end gap-6">
                
                {/* Method Selection */}
                <div className="flex-1 w-full">
                  <label className={`block text-xs font-bold uppercase mb-3 ${subTextColor}`}>Способ разделения</label>
                  <div className={`flex p-1 rounded-xl border ${borderColor} ${isDarkMode ? 'bg-black/20' : 'bg-gray-100'}`}>
                    <button
                      onClick={() => setMethod('count')}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${method === 'count' ? (isDarkMode ? 'bg-[#40444b] text-white shadow-md' : 'bg-white text-gray-900 shadow-sm') : subTextColor}`}
                    >
                      По количеству групп
                    </button>
                    <button
                      onClick={() => setMethod('size')}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${method === 'size' ? (isDarkMode ? 'bg-[#40444b] text-white shadow-md' : 'bg-white text-gray-900 shadow-sm') : subTextColor}`}
                    >
                      По размеру группы
                    </button>
                  </div>
                </div>

                {/* Value Input */}
                <div className="w-full md:w-48">
                  <label className={`block text-xs font-bold uppercase mb-3 ${subTextColor}`}>
                    {method === 'count' ? 'Количество групп' : 'Учеников в группе'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max={students.length}
                      value={inputValue}
                      onChange={(e) => setInputValue(parseInt(e.target.value) || 1)}
                      className={`w-full p-3 pl-10 rounded-xl outline-none font-bold text-center border ${borderColor} ${isDarkMode ? 'bg-black/20' : 'bg-gray-50'}`}
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {method === 'count' ? <Grid size={18} /> : <Users size={18} />}
                    </div>
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  className="w-full md:w-auto py-3 px-8 rounded-xl bg-[#eb459e] hover:bg-[#d63b8c] text-white font-bold shadow-lg shadow-[#eb459e]/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Shuffle size={20} />
                  {isGenerated ? 'Перемешать' : 'Сгенерировать'}
                </button>
              </div>
              
              <div className={`mt-4 text-xs font-medium ${subTextColor} flex items-center gap-2`}>
                <Users size={14} />
                Всего учеников: {students.length}
              </div>
            </div>

            {/* Results */}
            {isGenerated && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Результаты ({groups.length} групп)</h2>
                  <button 
                    onClick={copyAllToClipboard}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${hoverBg} ${subTextColor} hover:text-[#eb459e]`}
                  >
                    <Copy size={16} />
                    Скопировать всё
                  </button>
                </div>

                <motion.div 
                  layout
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  <AnimatePresence>
                    {groups.map((group, index) => (
                      <motion.div 
                        key={group.id}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className={`rounded-2xl border ${borderColor} ${cardBg} overflow-hidden flex flex-col`}
                      >
                        <div className={`p-4 border-b ${borderColor} flex items-center justify-between ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                          {editingGroupId === group.id ? (
                              <div className="flex items-center gap-2 flex-1 mr-2">
                                  <input 
                                      autoFocus
                                      value={editingName}
                                      onChange={(e) => setEditingName(e.target.value)}
                                      onBlur={saveGroupName}
                                      onKeyDown={handleKeyDown}
                                      className={`w-full p-1 px-2 rounded-md outline-none text-lg font-bold border ${borderColor} ${isDarkMode ? 'bg-black/20' : 'bg-white'}`}
                                  />
                              </div>
                          ) : (
                              <h3 
                                  onClick={() => startEditing(group)}
                                  className="font-bold text-lg cursor-pointer hover:underline decoration-dashed underline-offset-4 decoration-gray-400"
                                  title="Нажмите, чтобы переименовать"
                              >
                                  {group.name}
                              </h3>
                          )}
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded-md ${isDarkMode ? 'bg-black/20' : 'bg-gray-200'} ${subTextColor}`}>
                              {group.students.length} чел.
                            </span>
                            <button 
                              onClick={() => startEditing(group)}
                              className={`p-1.5 rounded-md hover:bg-[#eb459e]/10 hover:text-[#eb459e] transition-colors ${subTextColor}`}
                              title="Переименовать группу"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => copyGroupToClipboard(group)}
                              className={`p-1.5 rounded-md hover:bg-[#eb459e]/10 hover:text-[#eb459e] transition-colors ${subTextColor}`}
                              title="Скопировать группу"
                            >
                              <Copy size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="p-4">
                          <ul className="space-y-2">
                            <AnimatePresence>
                              {group.students.map((student, sIdx) => (
                                <motion.li 
                                  key={student.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.2, delay: (index * 0.05) + (sIdx * 0.02) }}
                                  className="flex items-center gap-2"
                                >
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDarkMode ? 'bg-[#eb459e]/20 text-[#eb459e]' : 'bg-[#eb459e]/10 text-[#eb459e]'}`}>
                                    {student.firstName[0]}{student.lastName[0]}
                                  </div>
                                  <span className="font-medium">{student.lastName} {student.firstName}</span>
                                </motion.li>
                              ))}
                            </AnimatePresence>
                          </ul>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherGroupsPage;
