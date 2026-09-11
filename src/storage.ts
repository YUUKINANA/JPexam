import type { DailyProgress, UserSettings } from "./types";

const settingsKey = "jpexam.settings.v1";
const progressKey = "jpexam.progress.v1";
const historyKey = "jpexam.practiceHistory.v1";

export const defaultSettings: UserSettings = {
  mode: "vocab",
  level: "all",
  dailyGoal: 20,
  sessionSize: 10,
  hintMode: "hover",
  order: "sequential",
  strictness: "strict",
};

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function loadSettings(): UserSettings {
  const raw = localStorage.getItem(settingsKey);
  if (!raw) return defaultSettings;
  try {
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: UserSettings) {
  localStorage.setItem(settingsKey, JSON.stringify(settings));
}

export function loadProgress(): DailyProgress {
  const fallback: DailyProgress = {
    date: todayKey(),
    completed: 0,
    correctChars: 0,
    totalChars: 0,
    sessions: 0,
    mistakes: {},
  };
  const raw = localStorage.getItem(progressKey);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as DailyProgress;
    return parsed.date === todayKey() ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function saveProgress(progress: DailyProgress) {
  localStorage.setItem(progressKey, JSON.stringify(progress));
}

export interface PracticeHistoryEntry {
  lastPracticed: string;
  times: number;
}

export type PracticeHistory = Record<string, PracticeHistoryEntry>;

export function loadPracticeHistory(): PracticeHistory {
  const raw = localStorage.getItem(historyKey);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as PracticeHistory;
  } catch {
    return {};
  }
}

export function savePracticeHistory(history: PracticeHistory) {
  localStorage.setItem(historyKey, JSON.stringify(history));
}
