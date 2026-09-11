export type LibraryType = "vocab" | "sentence" | "lyrics";
export type Difficulty = "N5" | "N4" | "N3" | "N2" | "N1" | "custom";
export type HintMode = "off" | "hover" | "always";
export type PracticeOrder = "sequential" | "random" | "mistakes";
export type Strictness = "strict" | "ignore-punctuation" | "ignore-space-punctuation";

export interface ReadingPart {
  text: string;
  kana: string;
  note?: string;
}

export interface Ambiguity {
  text: string;
  readings?: Array<{ kana: string; zh: string; note?: string }>;
  meanings?: string[];
  note?: string;
}

export interface PracticeItem {
  id: string;
  type: LibraryType;
  jp: string;
  kana?: string;
  zh: string | string[];
  pos?: string;
  level: Difficulty;
  tags?: string[];
  reading?: ReadingPart[];
  ambiguities?: Ambiguity[];
  source?: string;
  lineNumber?: number;
  note?: string;
}

export interface PracticeLibrary {
  schemaVersion: "1.0";
  id?: string;
  type: LibraryType;
  title: string;
  description?: string;
  sourceLanguage?: "ja";
  license?: string;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
  items?: PracticeItem[];
  lines?: PracticeItem[];
}

export interface UserSettings {
  mode: LibraryType;
  level: Difficulty | "all";
  dailyGoal: number;
  sessionSize: number;
  hintMode: HintMode;
  order: PracticeOrder;
  strictness: Strictness;
}

export interface DailyProgress {
  date: string;
  completed: number;
  correctChars: number;
  totalChars: number;
  sessions: number;
  mistakes: Record<string, number>;
}
