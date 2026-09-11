import type { PracticeItem, PracticeLibrary, PracticeOrder, Strictness } from "./types";

const punctuationRegex = /[\p{P}\p{S}]/gu;
const spaceRegex = /\s+/g;

export function libraryItems(library: PracticeLibrary): PracticeItem[] {
  return library.type === "lyrics" ? library.lines ?? [] : library.items ?? [];
}

export function normalizeText(value: string, strictness: Strictness) {
  const normalized = value.normalize("NFKC").trim();
  if (strictness === "ignore-space-punctuation") return normalized.replace(punctuationRegex, "").replace(spaceRegex, "");
  if (strictness === "ignore-punctuation") return normalized.replace(punctuationRegex, "").replace(spaceRegex, " ");
  return normalized.replace(spaceRegex, " ");
}

export function isComplete(input: string, target: string, strictness: Strictness) {
  return normalizeText(input, strictness) === normalizeText(target, strictness);
}

export function answerText(item: PracticeItem) {
  return item.kana?.trim() || item.jp;
}

export function countCorrectChars(input: string, target: string) {
  const targetChars = Array.from(target);
  const inputChars = Array.from(input);
  return targetChars.reduce((score, char, index) => score + (inputChars[index] === char ? 1 : 0), 0);
}

export function buildQueue(items: PracticeItem[], order: PracticeOrder, mistakes: Record<string, number>) {
  const queue = [...items];
  if (order === "random") return queue.sort(() => Math.random() - 0.5);
  if (order === "mistakes") {
    return queue.sort((a, b) => (mistakes[b.id] ?? 0) - (mistakes[a.id] ?? 0));
  }
  return queue;
}

export function parseImportedJson(jsonText: string): PracticeLibrary {
  const parsed = JSON.parse(jsonText);
  if (Array.isArray(parsed)) {
    return {
      schemaVersion: "1.0",
      type: "sentence",
      title: "导入内容",
      sourceLanguage: "ja",
      items: parsed,
    };
  }
  if (!parsed.type || !parsed.schemaVersion) {
    throw new Error("JSON 缺少 schemaVersion 或 type 字段。");
  }
  return parsed as PracticeLibrary;
}

export function ensureLibraryIdentity(library: PracticeLibrary, fallback = "library"): PracticeLibrary {
  const idBase = `${library.type}-${library.title || fallback}`
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return {
    ...library,
    id: library.id ?? `${idBase || fallback}-${Date.now()}`,
  };
}

export function lyricsTextToLibrary(text: string, title = "TXT 歌词导入"): PracticeLibrary {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({
      id: `txt-lyrics-${Date.now()}-${index + 1}`,
      type: "lyrics" as const,
      jp: line,
      kana: line,
      zh: "待补充中文释义",
      level: "custom" as const,
      lineNumber: index + 1,
      reading: [],
    }));

  return {
    schemaVersion: "1.0",
    type: "lyrics",
    title,
    description: "从 TXT 文本按行导入。可后续用提示词补充中文释义和假名标注。",
    sourceLanguage: "ja",
    lines,
  };
}
