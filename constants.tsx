
import React from 'react';
import { 
  ClipboardList, 
  StickyNote, 
  Brush, 
  Calculator, 
  ArrowLeftRight, 
  Calendar, 
  Timer, 
  Clock, 
  BrainCircuit, 
  Settings,
  Globe,
  GraduationCap,
  Users,
  ArrowLeft,
  Grid,
  Shuffle,
  Mic,
  Layers
} from 'lucide-react';
import { SectionId, Section } from './types';

export const SECTIONS: Section[] = [
  { id: SectionId.Teacher, label: "Учительская", icon: "GraduationCap", color: "#f47b67" }, 
  { id: SectionId.Grades, label: "Оценки", icon: "ClipboardList", color: "#5865f2" },
  { id: SectionId.Notes, label: "Заметки", icon: "StickyNote", color: "#eb459e" },
  { id: SectionId.Drawing, label: "Рисовалка", icon: "Brush", color: "#ed4245" },
  { id: SectionId.Calculator, label: "Калькулятор", icon: "Calculator", color: "#faa61a" },
  { id: SectionId.Converter, label: "Конвертер", icon: "ArrowLeftRight", color: "#3ba55c" },
  { id: SectionId.Planner, label: "Планировщик", icon: "Calendar", color: "#9b84ec" },
  { id: SectionId.Stopwatch, label: "Секундомер", icon: "Timer", color: "#f47b67" },
  { id: SectionId.Timer, label: "Таймер", icon: "Clock", color: "#f47b67" },
  { id: SectionId.Browser, label: "Браузер", icon: "Globe", color: "#00a1e4" },
  { id: SectionId.AI, label: "Нейросеть", icon: "BrainCircuit", color: "#9c84ef" },
  { id: SectionId.Settings, label: "Настройки", icon: "Settings", color: "#8e9297" }
];

export const TEACHER_SECTIONS: Section[] = [
  { id: SectionId.TeacherStudents, label: "Ученики", icon: "Users", color: "#5865f2" },
  { id: SectionId.TeacherGroups, label: "Генератор Групп", icon: "Grid", color: "#eb459e" },
  { id: SectionId.TeacherRandomizer, label: "Рандомайзер", icon: "Shuffle", color: "#faa61a" },
  { id: SectionId.TeacherNoiseMeter, label: "Шумомер", icon: "Mic", color: "#ed4245" },
  { id: SectionId.TeacherCards, label: "Карточки", icon: "Layers", color: "#9c84ef" },
];

export const getIcon = (iconName: string, size = 20, color = 'currentColor') => {
  const props = { size, color };
  switch (iconName) {
    case 'ClipboardList': return <ClipboardList {...props} />;
    case 'StickyNote': return <StickyNote {...props} />;
    case 'Brush': return <Brush {...props} />;
    case 'Calculator': return <Calculator {...props} />;
    case 'ArrowLeftRight': return <ArrowLeftRight {...props} />;
    case 'Calendar': return <Calendar {...props} />;
    case 'Timer': return <Timer {...props} />;
    case 'Clock': return <Clock {...props} />;
    case 'BrainCircuit': return <BrainCircuit {...props} />;
    case 'Globe': return <Globe {...props} />;
    case 'GraduationCap': return <GraduationCap {...props} />;
    case 'Users': return <Users {...props} />;
    case 'ArrowLeft': return <ArrowLeft {...props} />;
    case 'Grid': return <Grid {...props} />;
    case 'Shuffle': return <Shuffle {...props} />;
    case 'Mic': return <Mic {...props} />;
    case 'Layers': return <Layers {...props} />;
    case 'Settings': return <Settings {...props} />;
    default: return <Settings {...props} />;
  }
};