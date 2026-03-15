
export enum SectionId {
  Grades = 'grades',
  Notes = 'notes',
  Drawing = 'drawing',
  Calculator = 'calculator',
  Converter = 'converter',
  Planner = 'planner',
  Stopwatch = 'stopwatch',
  Timer = 'timer',
  AI = 'ai',
  Browser = 'browser',
  Teacher = 'teacher', 
  TeacherStudents = 'teacher_students', 
  TeacherGroups = 'teacher_groups',
  TeacherRandomizer = 'teacher_randomizer',
  TeacherNoiseMeter = 'teacher_noise_meter',
  TeacherCards = 'teacher_cards',
  Settings = 'settings'
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  notes?: string;
  email?: string;
  phone?: string;
}

export interface Section {
  id: SectionId;
  label: string;
  icon: string;
  color: string;
}

export interface UserInfo {
  displayName: string;
  email: string;
  photoUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
  isPremium?: boolean;
  licenseKey?: string;
  validUntil?: string;
  role?: 'student' | 'teacher';
}

export interface Grade {
  id: string;
  subject: string;
  grade: number | string;
  date: string | number;
}

export interface AndroidGrade {
  value: number;
  subject: string;
  timestamp: number;
}

export interface StyleRange {
  start: number;
  end: number;
  isBold: boolean;
  isItalic: boolean;
  isUnderlined: boolean;
}

export interface TextBlock {
  type: "TextBlock";
  id: string;
  text: string;
  styles: StyleRange[];
}

export type ContentBlock = TextBlock;

export interface Note {
  id: number;
  title: string;
  content: ContentBlock[];
  timestamp: number;
}

export interface PlannerEvent {
  id: string | number;
  text: string;
  dueDate: number;
  completed: boolean;
  reminderMinutes?: number;
}

export interface AppSettings {
  autoLaunch: boolean;
  minimizeToTray: boolean;
  useInternalBrowser?: boolean;
}

export interface AuthTokens {
  access_token: string | null;
  refresh_token: string | null;
}

// --- Browser Types ---
export interface BrowserHistoryItem {
  url: string;
  title: string;
  timestamp: number;
}

export interface BrowserTab {
  id: string;
  url: string;
  title: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface BrowserSettings {
  homePage: string;
  searchEngineUrl: string; // e.g. "https://yandex.ru/search/?text="
  adBlockEnabled: boolean;
}

export interface BrowserData {
  history: BrowserHistoryItem[];
  settings: BrowserSettings;
  bookmarks?: { url: string; title: string }[];
  // Persistence fields
  tabs?: BrowserTab[];
  activeTabId?: string;
}

// --- Sync Types ---
export interface SyncBrowserTab {
  id: string;
  url: string;
  title: string;
  lastAccessed: number;
}

export interface SyncBrowserSettings {
  homePage: string;
  searchEngineUrl: string;
  isAdBlockEnabled: boolean;
}

export interface SyncBrowserData {
  tabs: SyncBrowserTab[];
  history: BrowserHistoryItem[];
  settings: SyncBrowserSettings;
  bookmarks: { url: string; title: string }[];
}

// --- AI Types ---
export interface AIModel {
  id: string;
  name: string;
  modelId: string; // Model ID (e.g. "anthropic/claude-3-5-sonnet")
  apiKey?: string; // Optional custom key
  isDefault?: boolean;
  provider?: 'openrouter' | 'polza';
}

// --- Drawing Types ---
export type DrawingToolType = 'brush' | 'eraser' | 'fill' | 'eyedropper';
export type GridType = 'none' | 'grid' | 'ruled' | 'music' | 'math' | 'line';

export interface DrawingLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0-1
  dataUrl: string; // The actual image data
  order: number; // Z-index
}

export interface DrawingProject {
  id: string;
  name: string;
  width: number;
  height: number;
  createdAt: number;
  updatedAt: number;
  thumbnail?: string; // DataURL for dashboard preview
  layers: DrawingLayer[];
  activeLayerId: string;
  gridType: GridType;
  backgroundType?: string; // Added for compatibility
  backgroundColor: string;
}

export interface Flashcard {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  color?: string;
}

export interface FlashcardDeck {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  cards: Flashcard[];
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        ref?: any;
        allowpopups?: any;
        webpreferences?: string;
        partition?: string;
        preload?: string;
        httpreferrer?: string;
        useragent?: string;
        disablewebsecurity?: any;
      };
    }
  }

  interface Window {
    electron?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      loginGoogle: () => Promise<void>; 
      onAuthData: (callback: (data: any) => void) => void;
      setAuthToken: (tokens: AuthTokens) => void;
      driveExport: (filename: string, content: string) => Promise<boolean>;
      driveImport: (filename: string) => Promise<string | null>;
      getApiKey: () => Promise<string>;
      getAppSettings: () => Promise<AppSettings>;
      updateAppSetting: (key: string, value: any) => Promise<AppSettings>;
      
      // AI Secure Bridge
      streamAiRequest: (data: any) => void;
      polzaChat: (messages: any[], model?: string) => Promise<any>;
      onAiChunk: (callback: (chunk: string) => void) => void;
      onAiDone: (callback: () => void) => void;
      onAiError: (callback: (err: string) => void) => void;
      removeAiListeners: () => void;

      // Browser Control
      setAdBlock: (enabled: boolean) => void;
      onOpenInternalUrl: (callback: (url: string) => void) => void;
    }
  }
}