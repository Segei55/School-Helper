
import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Trash2, ChevronDown, Download, Upload, RotateCcw, AlertTriangle, CheckCircle, Loader2, Lock, TrendingUp } from 'lucide-react';
import { Grade, AndroidGrade } from '../types';
import { PremiumOverlay } from '../components/PremiumComponents';

interface GradesPageProps {
  isDarkMode?: boolean;
  isLoggedIn: boolean;
  isPremium?: boolean;
  onTriggerPremium?: (source: string) => void;
  onSyncError?: () => void;
}

const SUBJECTS_LIST = [
  'Алгебра', 'Биология', 'География', 'Геометрия', 'Английский язык',
  'Информатика', 'История', 'Литература', 'ОБиЗР', 'Обществознание',
  'Русский язык', 'Физика', 'Физкультура', 'Химия'
];

const BUTTON_COLORS = {
  5: 'bg-[#60a5fa]',
  4: 'bg-[#a3e6aa]',
  3: 'bg-[#d8b4fe]',
  2: 'bg-[#fca5a5]'
};
const BUTTON_TEXT_COLORS = {
  5: 'text-[#1e3a8a]',
  4: 'text-[#064e3b]',
  3: 'text-[#4c1d95]',
  2: 'text-[#7f1d1d]'
};

const GradesPage: React.FC<GradesPageProps> = ({ isDarkMode = true, isLoggedIn, isPremium, onTriggerPremium, onSyncError }) => {
  const [grades, setGrades] = useState<Grade[]>(() => {
    const saved = localStorage.getItem('school_helper_grades');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  const [selectedSubject, setSelectedSubject] = useState<string>('general');
  const [showClearModal, setShowClearModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    localStorage.setItem('school_helper_grades', JSON.stringify(grades));
  }, [grades]);

  const addGrade = (value: number) => {
    if (selectedSubject === 'general') {
      alert("Сначала выберите предмет");
      return;
    }
    const now = new Date();
    const dateStr = `${now.toLocaleDateString()} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
    const newGrade: Grade = { id: Date.now().toString(), subject: selectedSubject, grade: value, date: dateStr };
    setGrades(prev => [newGrade, ...prev]);
  };

  const deleteGrade = (id: string) => setGrades(prev => prev.filter(g => g.id !== id));
  const handleClearClick = () => setShowClearModal(true);
  const confirmClear = () => {
    if (selectedSubject === 'general') setGrades([]);
    else setGrades(prev => prev.filter(g => g.subject !== selectedSubject));
    setShowClearModal(false);
  };

  // --- Drive Synchronization Logic ---
  const handleExport = async () => {
    // PREMIUM LOCK - TEMPORARILY DISABLED
    /*
    if (!isPremium) {
       onTriggerPremium && onTriggerPremium('import_export');
       return;
    }
    */

    if (!isLoggedIn) return; 
    if (!window.electron || !window.electron.driveExport) {
        alert("Экспорт доступен только в десктопной версии.");
        return;
    }

    setSyncStatus('loading');
    
    // Transform React Grades -> Android Grades
    const androidData: AndroidGrade[] = grades.map(g => {
        let ts = parseInt(g.id);
        if (isNaN(ts)) ts = Date.now(); 
        return {
            value: Number(g.grade),
            subject: g.subject,
            timestamp: ts
        };
    });

    const jsonContent = JSON.stringify(androidData, null, 2);
    
    try {
        const success = await window.electron.driveExport('grades.json', jsonContent);
        setSyncStatus(success ? 'success' : 'error');
        setTimeout(() => setSyncStatus('idle'), 2500);
    } catch (e: any) {
        console.error(e);
        if (e.message && (e.message.includes("UNAUTHORIZED") || e.message.includes("NO_TOKEN")) && onSyncError) {
             onSyncError();
        }
        setSyncStatus('error');
    }
  };

  const handleImport = async () => {
    // PREMIUM LOCK - TEMPORARILY DISABLED
    /*
    if (!isPremium) {
       onTriggerPremium && onTriggerPremium('import_export');
       return;
    }
    */

    if (!isLoggedIn) return;
    if (!window.electron || !window.electron.driveImport) {
        alert("Импорт доступен только в десктопной версии.");
        return;
    }

    if (!confirm("Импорт полностью заменит текущие оценки данными с Диска. Продолжить?")) return;

    setSyncStatus('loading');

    try {
        const jsonContent = await window.electron.driveImport('grades.json');
        if (jsonContent) {
            const androidData: AndroidGrade[] = JSON.parse(jsonContent);
            const reactData: Grade[] = androidData.map(ag => {
                const dateObj = new Date(ag.timestamp);
                const dateStr = `${dateObj.toLocaleDateString()} ${dateObj.getHours().toString().padStart(2,'0')}:${dateObj.getMinutes().toString().padStart(2,'0')}`;
                return {
                    id: ag.timestamp.toString(),
                    subject: ag.subject,
                    grade: ag.value,
                    date: dateStr
                };
            });
            reactData.sort((a, b) => parseInt(b.id) - parseInt(a.id));
            setGrades(reactData);
            setSyncStatus('success');
            setTimeout(() => setSyncStatus('idle'), 2500);
        } else {
            alert("Файл grades.json не найден в корне Google Диска.");
            setSyncStatus('error');
        }
    } catch (e: any) {
        console.error(e);
        if (e.message && (e.message.includes("UNAUTHORIZED") || e.message.includes("NO_TOKEN")) && onSyncError) {
             onSyncError();
        }
        setSyncStatus('error');
    }
  };

  const filteredGrades = useMemo(() => {
    if (selectedSubject === 'general') return grades;
    return grades.filter(g => g.subject === selectedSubject);
  }, [grades, selectedSubject]);

  const average = useMemo(() => {
    if (filteredGrades.length === 0) return 0;
    const sum = filteredGrades.reduce((acc, g) => acc + Number(g.grade), 0);
    return (sum / filteredGrades.length).toFixed(2);
  }, [filteredGrades]);

  const chartData = useMemo(() => {
    const stats: Record<string, { sum: number, count: number }> = {};
    grades.forEach(g => {
      if (!stats[g.subject]) stats[g.subject] = { sum: 0, count: 0 };
      stats[g.subject].sum += Number(g.grade);
      stats[g.subject].count += 1;
    });
    return Object.keys(stats).map(subj => ({
      subject: subj,
      value: parseFloat((stats[subj].sum / stats[subj].count).toFixed(2))
    }));
  }, [grades]);

  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const mutedText = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  // Backdrop for sticky headers to match the container background
  const stickyBg = isDarkMode ? 'bg-[#2f3136]/90' : 'bg-white/90';

  return (
    <div className={`flex flex-col h-full w-full max-w-5xl mx-auto transition-colors duration-300 ${textColor} overflow-hidden`}>
      
      {/* 2. Scrollable Content (Subject Selector + Stats + Chart + List) */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 relative">
        
        {/* Subject Selector (Now inside scrollable area) */}
        <div className="mb-3 pt-1 animate-in fade-in slide-in-from-right-10 duration-500 sticky top-0 z-20">
            <div className={`pb-2 ${isDarkMode ? 'bg-[#2f3136]' : 'bg-white'}`}>
                <label className={`text-[10px] font-bold uppercase tracking-wider ml-1 mb-1 block ${mutedText}`}>Выберите предмет</label>
                <div className="relative">
                <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className={`w-full appearance-none p-3 pr-10 rounded-2xl outline-none focus:ring-2 focus:ring-[#5865f2] border font-bold text-lg cursor-pointer transition-all hover:shadow-md ${isDarkMode ? 'bg-[#202225] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-800'}`}
                >
                    <option value="general">Общий обзор (График)</option>
                    {SUBJECTS_LIST.map(subj => <option key={subj} value={subj}>{subj}</option>)}
                </select>
                <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 ${mutedText} pointer-events-none`} size={20} />
                </div>
            </div>
        </div>

        {selectedSubject === 'general' ? (
          <div className="flex flex-col gap-3 animate-in zoom-in-95 duration-300 pb-2">
             
             {/* Stats Card */}
             <div className={`p-3 rounded-3xl border flex items-center justify-between shadow-lg relative overflow-hidden shrink-0 ${isDarkMode ? 'bg-gradient-to-br from-[#2f3136] to-[#202225] border-white/5' : 'bg-white border-gray-200'}`}>
                <div className="z-10">
                    <p className={`text-xs font-bold uppercase ${mutedText} mb-1`}>Средний балл по всем предметам</p>
                    <div className="text-4xl font-extrabold text-[#5865f2] tracking-tighter">{average}</div>
                </div>
                <div className="w-12 h-12 rounded-full bg-[#5865f2]/20 flex items-center justify-center text-[#5865f2] z-10">
                    <TrendingUp size={24} />
                </div>
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#5865f2]/5 rounded-full blur-3xl pointer-events-none" />
             </div>

             {/* Chart */}
             <div className={`h-[220px] shrink-0 rounded-3xl p-2 shadow-inner border relative ${isDarkMode ? 'bg-[#202225] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                {/* TEMPORARILY HIDDEN
                {!isPremium && (
                   <PremiumOverlay 
                     title="График успеваемости"
                     isDarkMode={isDarkMode}
                     onOpenModal={() => onTriggerPremium && onTriggerPremium('stats')}
                   />
                )}
                */}
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#424549" : "#e5e7eb"} vertical={false} />
                      <XAxis dataKey="subject" stroke={isDarkMode ? "#8e9297" : "#9ca3af"} fontSize={10} tickLine={false} axisLine={false} tick={{fill: isDarkMode ? '#8e9297' : '#6b7280'}} interval={0} />
                      <YAxis domain={[0, 5]} ticks={[2,3,4,5]} stroke={isDarkMode ? "#8e9297" : "#9ca3af"} tickLine={false} axisLine={false} tick={{fill: isDarkMode ? '#8e9297' : '#6b7280'}} />
                      <Tooltip 
                        cursor={{ fill: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' }}
                        formatter={(value: number | undefined) => [value, '']}
                        separator=""
                        contentStyle={{ 
                          backgroundColor: isDarkMode ? '#1a1c1e' : '#ffffff', 
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)',
                          padding: '12px'
                        }}
                        itemStyle={{ color: '#5865f2', fontWeight: 800, fontSize: '14px' }}
                        labelStyle={{ color: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '11px', marginBottom: '4px' }}
                        labelFormatter={(label) => label}
                      />
                      <Bar name="Средний балл: " dataKey="value" radius={[6, 6, 0, 0]} animationDuration={1000}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.value >= 4.5 ? '#60a5fa' : entry.value >= 3.5 ? '#a3e6aa' : entry.value >= 2.5 ? '#d8b4fe' : '#fca5a5'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-40 text-sm gap-2">
                    <TrendingUp size={48} className="opacity-50" />
                    <p>Добавьте оценки, чтобы увидеть статистику</p>
                  </div>
                )}
             </div>

             {/* History List */}
             <div>
                <div className={`sticky top-0 z-10 py-2 backdrop-blur-md ${stickyBg}`}>
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${mutedText}`}>История оценок (Все)</h3>
                </div>
                
                <div className="space-y-2">
                    {filteredGrades.length === 0 ? (
                        <div className="p-8 text-center opacity-30 text-sm">Оценок пока нет</div>
                    ) : (
                        filteredGrades.map((grade, i) => (
                            <div key={grade.id} className={`flex items-center p-2 rounded-2xl shadow-sm border border-l-[6px] transition-all hover:translate-x-1 ${isDarkMode ? 'bg-[#202225] border-white/5' : 'bg-white border-gray-200'}`} style={{ borderLeftColor: Number(grade.grade) >= 4 ? '#3ba55c' : Number(grade.grade) === 3 ? '#faa61a' : '#ed4245' }}>
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg font-bold mr-3 shrink-0 ${Number(grade.grade) === 5 ? 'bg-blue-500/20 text-[#60a5fa]' : Number(grade.grade) === 4 ? 'bg-green-500/20 text-[#a3e6aa]' : Number(grade.grade) === 3 ? 'bg-purple-500/20 text-[#d8b4fe]' : 'bg-red-500/20 text-[#fca5a5]'}`}>
                                    {grade.grade}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className={`font-bold text-sm truncate ${textColor}`}>{grade.subject}</div>
                                    <div className={`text-[10px] ${mutedText}`}>{grade.date}</div>
                                </div>
                                <button onClick={() => deleteGrade(grade.id)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"><Trash2 size={16} /></button>
                            </div>
                        ))
                    )}
                </div>
             </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-4 duration-500 pb-2">
            {/* Control Panel */}
            <div className={`p-3 rounded-3xl border shadow-sm shrink-0 ${isDarkMode ? 'bg-[#2f3136] border-white/5' : 'bg-white border-gray-200'}`}>
                <div className="flex justify-between items-center gap-2 mb-3">
                  {[2, 3, 4, 5].map((val) => (
                    <button 
                      key={val} 
                      onClick={() => addGrade(val)} 
                      className={`flex-1 h-12 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-md transform transition-all hover:-translate-y-1 active:scale-95 hover:shadow-lg ${BUTTON_COLORS[val as 2|3|4|5]} ${BUTTON_TEXT_COLORS[val as 2|3|4|5]}`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between items-end px-2">
                    <div>
                        <div className={`text-xs font-bold uppercase ${mutedText}`}>Средний балл</div>
                        <div className="text-3xl font-extrabold text-[#5865f2]">{average}</div>
                    </div>
                    <div className={`text-xs font-bold ${mutedText}`}>Всего оценок: {filteredGrades.length}</div>
                </div>
            </div>

            {/* History List */}
            <div>
              <div className={`sticky top-0 z-10 py-2 backdrop-blur-md ${stickyBg}`}>
                 <h3 className={`text-xs font-bold uppercase tracking-wider ${mutedText}`}>История</h3>
              </div>

              <div className="space-y-2">
                {filteredGrades.length === 0 ? (
                   <div className="h-32 flex flex-col items-center justify-center opacity-30 text-center">
                      <div className="w-10 h-10 rounded-full border-4 border-current border-dashed mb-2 animate-spin-slow" />
                      <p>Оценок пока нет</p>
                   </div>
                ) : (
                  filteredGrades.map((grade, i) => (
                    <div key={grade.id} className={`flex items-center p-2 rounded-2xl shadow-sm border border-l-[6px] transition-all hover:translate-x-1 animate-in slide-in-from-left-5 duration-300 ${isDarkMode ? 'bg-[#202225] border-white/5' : 'bg-white border-gray-200'}`} style={{ borderLeftColor: Number(grade.grade) >= 4 ? '#3ba55c' : Number(grade.grade) === 3 ? '#faa61a' : '#ed4245', animationDelay: `${i * 0.05}s` }}>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xl font-bold mr-3 shrink-0 ${Number(grade.grade) === 5 ? 'bg-blue-500/20 text-[#60a5fa]' : Number(grade.grade) === 4 ? 'bg-green-500/20 text-[#a3e6aa]' : Number(grade.grade) === 3 ? 'bg-purple-500/20 text-[#d8b4fe]' : 'bg-red-500/20 text-[#fca5a5]'}`}>
                          {grade.grade}
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className={`font-bold text-sm truncate ${textColor}`}>{grade.subject}</div>
                         <div className={`text-[10px] ${mutedText}`}>{grade.date}</div>
                      </div>
                      <button onClick={() => deleteGrade(grade.id)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"><Trash2 size={16} /></button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Footer: Action Buttons (Fixed at bottom) */}
      <div className={`shrink-0 mt-2 pt-2 border-t flex flex-col sm:flex-row gap-3 ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
         <button onClick={handleClearClick} className="w-full sm:flex-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 text-sm">
             <RotateCcw size={16} /> Очистить
         </button>
         
         <div className="flex gap-3 w-full sm:flex-[2]">
           <button 
             onClick={handleExport}
             className={`flex-1 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-sm
               bg-[#5865f2] hover:bg-[#4752c4] text-white shadow-lg shadow-indigo-500/20
               ${syncStatus === 'loading' ? 'opacity-70 cursor-wait' : ''}
               `}
           >
              {syncStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> : syncStatus === 'success' ? <CheckCircle size={16} /> : <Upload size={16} />}
              Экспорт
           </button>
           
           <button 
             onClick={handleImport}
             className={`flex-1 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-sm
               bg-[#3ba55c] hover:bg-[#2d7d46] text-white shadow-lg shadow-green-500/20
               ${syncStatus === 'loading' ? 'opacity-70 cursor-wait' : ''}
               `}
           >
              {syncStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Импорт
           </button>
         </div>
      </div>

      {showClearModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`rounded-3xl p-6 shadow-2xl w-full max-w-sm border animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-[#2f3136] border-[#202225]' : 'bg-white border-gray-200'}`}>
             <div className="flex flex-col items-center text-center gap-4">
               <div className="w-16 h-16 rounded-full bg-[#ed4245]/10 flex items-center justify-center text-[#ed4245] animate-pulse"><AlertTriangle size={32} /></div>
               <div>
                 <h3 className={`text-xl font-bold mb-2 ${textColor}`}>Очистка оценок</h3>
                 <p className={`${mutedText} text-sm`}>
                   {selectedSubject === 'general' ? "Это действие удалит ВСЕ оценки из журнала. Это необратимо." : `Удалить все оценки по предмету "${selectedSubject}"?`}
                 </p>
               </div>
               <div className="flex w-full gap-3 mt-4">
                 <button onClick={() => setShowClearModal(false)} className={`flex-1 py-3 rounded-xl font-bold transition-colors ${isDarkMode ? 'bg-[#424549] text-white hover:bg-[#4f545c]' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>Отмена</button>
                 <button onClick={confirmClear} className="flex-1 py-3 rounded-xl font-bold bg-[#ed4245] text-white hover:bg-[#c03537] transition-all shadow-lg shadow-red-500/20">Удалить</button>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradesPage;
