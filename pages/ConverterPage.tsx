
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Search, X } from 'lucide-react';

interface ConverterPageProps {
  isDarkMode?: boolean;
}

type ConverterItem = {
  id: string;
  label: string;
  convert: (val: number) => string;
};

type ConverterGroup = {
  title: string;
  items: ConverterItem[];
};

type Category = 'Математика' | 'Физика' | 'Химия' | 'Информатика';

// Data from Kotlin source
const CONVERTERS: Record<Category, ConverterGroup[]> = {
  'Математика': [
    {
      title: 'Длина',
      items: [
        { id: 'm_cm', label: 'Метры -> Сантиметры', convert: (v) => (v * 100).toString() },
        { id: 'cm_m', label: 'Сантиметры -> Метры', convert: (v) => (v / 100).toString() },
        { id: 'km_m', label: 'Километры -> Метры', convert: (v) => (v * 1000).toString() },
        { id: 'm_km', label: 'Метры -> Километры', convert: (v) => (v / 1000).toString() },
        { id: 'in_cm', label: 'Дюймы -> Сантиметры', convert: (v) => (v * 2.54).toString() },
        { id: 'cm_in', label: 'Сантиметры -> Дюймы', convert: (v) => (v / 2.54).toString() },
        { id: 'ft_m', label: 'Футы -> Метры', convert: (v) => (v * 0.3048).toString() },
        { id: 'm_ft', label: 'Метры -> Футы', convert: (v) => (v / 0.3048).toString() },
      ]
    },
    {
      title: 'Площадь',
      items: [
        { id: 'm2_cm2', label: 'Кв. метры -> Кв. сантиметры', convert: (v) => (v * 10000).toString() },
        { id: 'cm2_m2', label: 'Кв. сантиметры -> Кв. метры', convert: (v) => (v / 10000).toString() },
        { id: 'ha_m2', label: 'Гектары -> Кв. метры', convert: (v) => (v * 10000).toString() },
        { id: 'm2_ha', label: 'Кв. метры -> Гектары', convert: (v) => (v / 10000).toString() },
        { id: 'ac_m2', label: 'Акры -> Кв. метры', convert: (v) => (v * 4046.86).toString() },
        { id: 'm2_ac', label: 'Кв. метры -> Акры', convert: (v) => (v / 4046.86).toString() },
      ]
    },
    {
      title: 'Объем',
      items: [
        { id: 'l_ml', label: 'Литры -> Миллилитры', convert: (v) => (v * 1000).toString() },
        { id: 'ml_l', label: 'Миллилитры -> Литры', convert: (v) => (v / 1000).toString() },
        { id: 'm3_l', label: 'Куб. метры -> Литры', convert: (v) => (v * 1000).toString() },
        { id: 'l_m3', label: 'Литры -> Куб. метры', convert: (v) => (v / 1000).toString() },
      ]
    }
  ],
  'Физика': [
    {
      title: 'Масса',
      items: [
        { id: 'g_kg', label: 'Граммы -> Килограммы', convert: (v) => (v / 1000).toString() },
        { id: 'kg_g', label: 'Килограммы -> Граммы', convert: (v) => (v * 1000).toString() },
        { id: 't_kg', label: 'Тонны -> Килограммы', convert: (v) => (v * 1000).toString() },
        { id: 'kg_t', label: 'Килограммы -> Тонны', convert: (v) => (v / 1000).toString() },
      ]
    },
    {
      title: 'Температура',
      items: [
        { id: 'c_f', label: 'Цельсий -> Фаренгейт', convert: (v) => (v * 9 / 5 + 32).toString() },
        { id: 'f_c', label: 'Фаренгейт -> Цельсий', convert: (v) => ((v - 32) * 5 / 9).toString() },
        { id: 'c_k', label: 'Цельсий -> Кельвин', convert: (v) => (v + 273.15).toString() },
        { id: 'k_c', label: 'Кельвин -> Цельсий', convert: (v) => (v - 273.15).toString() },
      ]
    },
    {
      title: 'Скорость',
      items: [
        { id: 'ms_kmh', label: 'м/с -> км/ч', convert: (v) => (v * 3.6).toString() },
        { id: 'kmh_ms', label: 'км/ч -> м/с', convert: (v) => (v / 3.6).toString() },
      ]
    },
    {
      title: 'Энергия',
      items: [
        { id: 'j_cal', label: 'Джоули -> Калории', convert: (v) => (v * 0.239006).toString() },
        { id: 'cal_j', label: 'Калории -> Джоули', convert: (v) => (v / 0.239006).toString() },
      ]
    },
    {
      title: 'Мощность',
      items: [
        { id: 'w_hp', label: 'Ватты -> л.с.', convert: (v) => (v / 735.5).toString() },
        { id: 'hp_w', label: 'л.с. -> Ватты', convert: (v) => (v * 735.5).toString() },
      ]
    }
  ],
  'Химия': [
    {
      title: 'Количество вещества',
      items: [
        { id: 'mol_mmol', label: 'Моль -> ммоль', convert: (v) => (v * 1000).toString() },
        { id: 'mmol_mol', label: 'ммоль -> Моль', convert: (v) => (v / 1000).toString() },
      ]
    },
    {
      title: 'Давление',
      items: [
        { id: 'pa_atm', label: 'Паскаль -> Атмосфера', convert: (v) => (v / 101325).toString() },
        { id: 'atm_pa', label: 'Атмосфера -> Паскаль', convert: (v) => (v * 101325).toString() },
        { id: 'pa_bar', label: 'Паскаль -> Бар', convert: (v) => (v / 100000).toString() },
        { id: 'bar_pa', label: 'Бар -> Паскаль', convert: (v) => (v * 100000).toString() },
      ]
    }
  ],
  'Информатика': [
    {
      title: 'Хранение данных',
      items: [
        { id: 'b_kb', label: 'Байты -> Килобайты', convert: (v) => (v / 1024).toString() },
        { id: 'kb_mb', label: 'Килобайты -> Мегабайты', convert: (v) => (v / 1024).toString() },
        { id: 'mb_gb', label: 'Мегабайты -> Гигабайты', convert: (v) => (v / 1024).toString() },
        { id: 'gb_tb', label: 'Гигабайты -> Терабайты', convert: (v) => (v / 1024).toString() },
      ]
    },
    {
      title: 'Скорость передачи данных',
      items: [
        { id: 'mbps_mbs', label: 'Мбит/с -> МБ/с', convert: (v) => (v / 8).toString() },
        { id: 'mbs_mbps', label: 'МБ/с -> Мбит/с', convert: (v) => (v * 8).toString() },
      ]
    }
  ]
};

const ConverterCard = React.memo(({ item, inputValue, resultValue, onInputChange, onConvert, cardBg, inputBg, containerText, labelColor }: any) => {
  return (
    <div className={`p-5 rounded-2xl shadow-md ${cardBg}`}>
      <h4 className="font-bold mb-4 text-sm opacity-90">{item.label}</h4>
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <input 
            type="number"
            autoComplete="off"
            placeholder="Значение"
            value={inputValue}
            onChange={(e) => onInputChange(item.id, e.target.value)}
            className={`w-full bg-transparent border rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#3ba55c] ${inputBg} ${containerText}`}
          />
        </div>
        <button 
          onClick={() => onConvert(item.id, inputValue, item.convert)} 
          className="bg-[#3ba55c] text-white px-6 py-3 rounded-full font-bold shadow-lg transform active:scale-95 transition-transform"
        >
          Перевод
        </button>
        <div className="flex-1 font-bold text-lg overflow-hidden truncate">
          {resultValue ? (
            <span>{parseFloat(resultValue).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
          ) : (
            <span className="opacity-30">Результат</span>
          )}
        </div>
      </div>
    </div>
  );
});

const ConverterPage: React.FC<ConverterPageProps> = ({ isDarkMode = true }) => {
  const [activeCategory, setActiveCategory] = useState<Category>('Математика');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, string>>({});

  const handleConvert = useCallback((id: string, value: string, convertFunc: any) => {
    const val = parseFloat(value);
    setResults(prev => ({ ...prev, [id]: isNaN(val) ? '' : convertFunc(val) }));
  }, []);

  const handleInputChange = useCallback((id: string, value: string) => {
    setInputs(prev => ({ ...prev, [id]: value }));
  }, []);

  // Filter Logic: If search query exists, look through ALL categories. Else use active category.
  const displayedContent = useMemo(() => {
    if (!searchQuery.trim()) {
        return CONVERTERS[activeCategory]?.map(group => ({
            ...group,
            sourceCategory: activeCategory
        })) || [];
    }

    const query = searchQuery.toLowerCase();
    const allGroups: { title: string, items: ConverterItem[], sourceCategory: string }[] = [];

    (Object.keys(CONVERTERS) as Category[]).forEach(cat => {
        CONVERTERS[cat].forEach(group => {
            const matchingItems = group.items.filter(item => 
                item.label.toLowerCase().includes(query) || 
                group.title.toLowerCase().includes(query)
            );

            if (matchingItems.length > 0) {
                allGroups.push({
                    title: group.title,
                    items: matchingItems,
                    sourceCategory: cat
                });
            }
        });
    });

    return allGroups;
  }, [activeCategory, searchQuery]);

  const cardBg = isDarkMode ? 'bg-[#2f3136] border-white/10' : 'bg-white border-gray-200';
  const inputBg = isDarkMode ? 'bg-[#36393f] border-white/10' : 'bg-gray-50 border-gray-300';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';

  return (
    <div className="h-full flex flex-col gap-6 max-w-3xl mx-auto">
      
      {/* Search & Category Header */}
      <div className="shrink-0 space-y-4">
        
        {/* Search Bar */}
        <div className={`flex items-center gap-3 p-3 rounded-2xl border transition-all focus-within:ring-2 focus-within:ring-[#3ba55c]/50 ${isDarkMode ? 'bg-[#202225] border-white/10' : 'bg-white border-gray-200'}`}>
            <Search size={20} className="text-gray-500 ml-2" />
            <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Найти конвертер (например: метры, скорость)..."
                className={`flex-1 bg-transparent border-none outline-none font-medium ${textColor}`}
            />
            {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-gray-500/20 rounded-full text-gray-500">
                    <X size={16} />
                </button>
            )}
        </div>

        {/* Category Tabs (Only show if not searching) */}
        {!searchQuery && (
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {Object.keys(CONVERTERS).map(cat => (
                <button
                key={cat}
                onClick={() => {
                    setActiveCategory(cat as Category);
                    setInputs({});
                    setResults({});
                }}
                className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                    activeCategory === cat 
                    ? 'bg-[#3ba55c] text-white shadow-lg' 
                    : (isDarkMode ? 'bg-[#2f3136] text-gray-400 hover:bg-[#36393f]' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200')
                }`}
                >
                {cat}
                </button>
            ))}
            </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar pb-6">
        {displayedContent.length > 0 ? (
            displayedContent.map((group, groupIndex) => (
            <div key={`${group.sourceCategory}-${group.title}-${groupIndex}`} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center gap-3 mb-4">
                <div className="h-[2px] flex-1 bg-current opacity-10 rounded-full" />
                <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase font-bold opacity-40">{group.sourceCategory}</span>
                    <h3 className={`text-lg font-bold uppercase tracking-wider opacity-80 ${textColor}`}>{group.title}</h3>
                </div>
                <div className="h-[2px] flex-1 bg-current opacity-10 rounded-full" />
                </div>
                
                <div className="space-y-4">
                {group.items.map((item, itemIndex) => (
                    <ConverterCard 
                    key={item.id} 
                    item={item} 
                    inputValue={inputs[item.id] || ''} 
                    resultValue={results[item.id] || ''} 
                    onInputChange={handleInputChange} 
                    onConvert={handleConvert} 
                    cardBg={cardBg} 
                    inputBg={inputBg} 
                    containerText={textColor}
                    // Auto-focus removed intentionally to allow user to choose freely
                    />
                ))}
                </div>
            </div>
            ))
        ) : (
           <div className="opacity-50 text-center py-10">
               {searchQuery ? 'Ничего не найдено' : 'В этом разделе пока пусто'}
           </div>
        )}
      </div>
    </div>
  );
};

export default ConverterPage;
