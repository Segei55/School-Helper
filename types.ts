
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
  Settings = 'settings'
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
  error?: string;
  // Centralized Auth Fields
  isPremium?: boolean;
  licenseKey?: string;
  validUntil?: string;
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

// --- Notes Data Structure (Single Source of Truth) ---

export interface StyleRange {
  start: number;
  end: number;
  isBold: boolean;
  isItalic: boolean;
  isUnderlined: boolean;
}

export interface TextBlock {
  type: "TextBlock"; // Discriminator
  id: string; // UUID
  text: string;
  styles: StyleRange[];
}

// Union type for future extensibility
export type ContentBlock = TextBlock;

export interface Note {
  id: number; // Unique numeric ID
  title: string;
  content: ContentBlock[];
  timestamp: number; // Unix timestamp (ms) of last modification
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
}

declare global {
  interface Window {
    electron?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      loginGoogle: () => Promise<void>; 
      onAuthData: (callback: (data: any) => void) => void;
      setAuthToken: (token: string | null) => void;
      driveExport: (filename: string, content: string) => Promise<boolean>;
      driveImport: (filename: string) => Promise<string | null>;
      getApiKey: () => Promise<string>;
      getAppSettings: () => Promise<AppSettings>;
      updateAppSetting: (key: string, value: any) => Promise<AppSettings>;
      
      // AI Secure Bridge
      streamAiRequest: (data: any) => void;
      onAiChunk: (callback: (chunk: string) => void) => void;
      onAiDone: (callback: () => void) => void;
      onAiError: (callback: (err: string) => void) => void;
      removeAiListeners: () => void;
    }
  }
}
