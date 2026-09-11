import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { sampleLibraries } from "./sampleData";
import {
  loadImportedLibraries,
  loadIndexedPracticeHistory,
  saveImportedLibrary,
  saveIndexedPracticeHistory,
} from "./localDb";
import {
  answerText,
  buildQueue,
  countCorrectChars,
  ensureLibraryIdentity,
  isComplete,
  libraryItems,
  lyricsTextToLibrary,
  normalizeText,
  parseImportedJson,
} from "./practiceEngine";
import {
  loadPracticeHistory,
  loadProgress,
  loadSettings,
  savePracticeHistory,
  saveProgress,
  saveSettings,
  todayKey,
  type PracticeHistory,
} from "./storage";
import type {
  Difficulty,
  HintMode,
  LibraryType,
  PracticeItem,
  PracticeLibrary,
  PracticeOrder,
  Strictness,
} from "./types";

const levelOptions: Array<Difficulty | "all"> = ["all", "N5", "N4", "N3", "N2", "N1", "custom"];
const modes: Array<{ id: LibraryType; label: string; kana: string; loaded: string; selected: string }> = [
  { id: "vocab", label: "词汇", kana: "ごい", loaded: "已加载词汇库", selected: "本轮词汇" },
  { id: "sentence", label: "句子", kana: "ぶん", loaded: "已加载句子库", selected: "本轮句子" },
  { id: "lyrics", label: "歌词", kana: "かし", loaded: "已加载歌曲", selected: "本轮歌曲" },
];

const studyNotes = [
  { jp: "少しずつ、確かに。", zh: "一点一点，扎实前进。" },
  { jp: "読むことは、打つことにつながる。", zh: "读得清楚，才打得准确。" },
  { jp: "迷ったら、音を思い出す。", zh: "犹豫时，先想起读音。" },
  { jp: "今日の一行も、力になる。", zh: "今天的一行，也会变成积累。" },
];

type View = "setup" | "practice" | "preview";
type AnswerState = "typing" | "correct";

function zhText(value: PracticeItem["zh"]) {
  return Array.isArray(value) ? value.join("；") : value;
}

function libraryId(library: PracticeLibrary) {
  return library.id ?? `${library.type}-${library.title}`;
}

function modeMeta(mode: LibraryType) {
  return modes.find((item) => item.id === mode) ?? modes[0];
}

function mergeLibraries(base: PracticeLibrary[], incoming: PracticeLibrary[]) {
  const seen = new Set<string>();
  return [...incoming, ...base].filter((library) => {
    const id = libraryId(library);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function renderWithRuby(item: PracticeItem, hintMode: HintMode) {
  const readings = item.reading ?? [];
  if (readings.length === 0) return <span>{item.jp}</span>;

  const nodes: ReactNode[] = [];
  let cursor = 0;
  readings.forEach((reading, index) => {
    const found = item.jp.indexOf(reading.text, cursor);
    if (found < 0) return;
    if (found > cursor) nodes.push(<span key={`plain-${index}`}>{item.jp.slice(cursor, found)}</span>);
    nodes.push(
      <ruby
        key={`${reading.text}-${index}`}
        className={`ruby ruby-${hintMode}`}
        title={hintMode === "hover" ? reading.kana : undefined}
      >
        {reading.text}
        <rt>{reading.kana}</rt>
      </ruby>
    );
    cursor = found + reading.text.length;
  });
  if (cursor < item.jp.length) nodes.push(<span key="tail">{item.jp.slice(cursor)}</span>);
  return nodes;
}

function AnswerProgress({
  target,
  input,
  strictness,
}: {
  target: string;
  input: string;
  strictness: Strictness;
}) {
  const normalizedTarget = normalizeText(target, strictness);
  const normalizedInput = normalizeText(input, strictness);
  const targetChars = Array.from(normalizedTarget);
  const inputChars = Array.from(normalizedInput);
  return (
    <div className="answer-progress" aria-label="假名输入进度">
      <div className="progress-track">
        {targetChars.map((char, index) => {
          const typed = inputChars[index];
          const state = typed == null ? "pending" : typed === char ? "correct" : "wrong";
          return <span className={`tick ${state}`} key={`${char}-${index}`} />;
        })}
      </div>
      <span className="progress-count">
        {Math.min(inputChars.length, targetChars.length)} / {targetChars.length}
      </span>
    </div>
  );
}

function StatBar({ completed, goal }: { completed: number; goal: number }) {
  const percent = Math.min(100, Math.round((completed / Math.max(goal, 1)) * 100));
  return (
    <div className="goal-meter" aria-label={`今日目标完成 ${percent}%`}>
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}

function libraryTypeName(type: LibraryType) {
  if (type === "vocab") return "词汇";
  if (type === "sentence") return "句子";
  return "歌词";
}

function scheduledQueue(
  items: PracticeItem[],
  history: PracticeHistory,
  order: PracticeOrder,
  mistakes: Record<string, number>,
  size: number
) {
  const today = todayKey();
  const ordered = buildQueue(items, order, mistakes);
  return ordered
    .sort((a, b) => {
      const aToday = history[a.id]?.lastPracticed === today;
      const bToday = history[b.id]?.lastPracticed === today;
      if (aToday !== bToday) return aToday ? 1 : -1;
      return (history[a.id]?.times ?? 0) - (history[b.id]?.times ?? 0);
    })
    .slice(0, size);
}

function App() {
  const [view, setView] = useState<View>("setup");
  const [libraries, setLibraries] = useState<PracticeLibrary[]>(() =>
    sampleLibraries.map((library, index) => ensureLibraryIdentity(library, `sample-${index + 1}`))
  );
  const [settings, setSettings] = useState(() => loadSettings());
  const [progress, setProgress] = useState(() => loadProgress());
  const [practiceHistory, setPracticeHistory] = useState(() => loadPracticeHistory());
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<Record<LibraryType, string[]>>({
    vocab: [],
    sentence: [],
    lyrics: [],
  });
  const [librarySearch, setLibrarySearch] = useState<Record<LibraryType, string>>({
    vocab: "",
    sentence: "",
    lyrics: "",
  });
  const [previewLibraryId, setPreviewLibraryId] = useState<string | null>(null);
  const [sessionQueue, setSessionQueue] = useState<PracticeItem[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [input, setInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [answerState, setAnswerState] = useState<AnswerState>("typing");
  const [message, setMessage] = useState("先把已加载库加入本轮，再开始练习。");
  const advanceTimer = useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveProgress(progress), [progress]);
  useEffect(() => {
    savePracticeHistory(practiceHistory);
    void saveIndexedPracticeHistory(practiceHistory).catch(() => {
      setMessage("练习历史暂时只能保存到浏览器轻量存储。");
    });
  }, [practiceHistory]);
  useEffect(() => {
    return () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    };
  }, []);
  useEffect(() => {
    let cancelled = false;

    void Promise.all([loadImportedLibraries(), loadIndexedPracticeHistory()])
      .then(([storedLibraries, storedHistory]) => {
        if (cancelled) return;
        if (storedLibraries.length > 0) {
          setLibraries((old) => mergeLibraries(old, storedLibraries));
        }
        if (Object.keys(storedHistory).length > 0) {
          setPracticeHistory((old) => ({ ...storedHistory, ...old }));
        }
      })
      .catch(() => {
        if (!cancelled) setMessage("本地数据库读取失败，当前仍可使用内置题库。");
      });

    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (view === "practice" && answerState === "typing") inputRef.current?.focus();
  }, [answerState, queueIndex, view]);

  const currentMeta = modeMeta(settings.mode);
  const activeLibraries = useMemo(
    () => libraries.filter((library) => library.type === settings.mode),
    [libraries, settings.mode]
  );
  const visibleLibraries = useMemo(() => {
    const query = librarySearch[settings.mode].trim().toLowerCase();
    if (!query) return activeLibraries;
    return activeLibraries.filter((library) => {
      const items = libraryItems(library);
      const searchable = [
        library.title,
        library.description ?? "",
        ...items.flatMap((item) => [item.jp, answerText(item), zhText(item.zh), item.pos ?? "", ...(item.tags ?? [])]),
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [activeLibraries, librarySearch, settings.mode]);
  const selectedLibraries = useMemo(
    () => activeLibraries.filter((library) => selectedLibraryIds[settings.mode].includes(libraryId(library))),
    [activeLibraries, selectedLibraryIds, settings.mode]
  );
  const selectedItems = useMemo(() => {
    const all = selectedLibraries.flatMap(libraryItems);
    return all.filter((item) => settings.level === "all" || item.level === settings.level);
  }, [selectedLibraries, settings.level]);
  const availableItemsCount = useMemo(
    () =>
      activeLibraries
        .flatMap(libraryItems)
        .filter((item) => settings.level === "all" || item.level === settings.level).length,
    [activeLibraries, settings.level]
  );
  const previewLibrary = useMemo(
    () => libraries.find((library) => libraryId(library) === previewLibraryId) ?? null,
    [libraries, previewLibraryId]
  );

  const current = sessionQueue[queueIndex];
  const currentAnswer = current ? answerText(current) : "";
  const previous = settings.mode === "lyrics" && queueIndex > 0 ? sessionQueue[queueIndex - 1] : undefined;
  const nextLines = settings.mode === "lyrics" ? sessionQueue.slice(queueIndex + 1, queueIndex + 2) : [];
  const studyNote = studyNotes[(queueIndex + progress.completed) % studyNotes.length];
  const accuracy =
    progress.totalChars === 0 ? 100 : Math.round((progress.correctChars / progress.totalChars) * 100);

  function updateSetting<K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) {
    setSettings((currentSettings) => ({ ...currentSettings, [key]: value }));
    setInput("");
    setMessage("设置已更新，可以开始新一轮。");
  }

  function toggleHintMode() {
    setSettings((currentSettings) => ({
      ...currentSettings,
      hintMode: currentSettings.hintMode === "always" ? "hover" : "always",
    }));
  }

  function addLibraryToSession(library: PracticeLibrary) {
    const id = libraryId(library);
    setSelectedLibraryIds((old) => {
      if (old[library.type].includes(id)) return old;
      return { ...old, [library.type]: [...old[library.type], id] };
    });
    setSettings((old) => ({ ...old, mode: library.type }));
    setMessage(`已加入本轮：${library.title}`);
  }

  function removeLibraryFromSession(library: PracticeLibrary) {
    const id = libraryId(library);
    setSelectedLibraryIds((old) => ({
      ...old,
      [library.type]: old[library.type].filter((item) => item !== id),
    }));
    setMessage(`已移出本轮：${library.title}`);
  }

  function startPractice() {
    const queue = scheduledQueue(
      selectedItems,
      practiceHistory,
      settings.order,
      progress.mistakes,
      settings.sessionSize
    );
    if (selectedLibraries.length === 0) {
      setMessage(`请先把${currentMeta.loaded.replace("已加载", "")}拖入本轮练习。`);
      return;
    }
    if (queue.length === 0) {
      setMessage("当前条件下没有可练习内容。");
      return;
    }
    setSessionQueue(queue);
    setQueueIndex(0);
    setInput("");
    setAnswerState("typing");
    setView("practice");
    setMessage("输入完整假名读音。");
  }

  function finishRound() {
    setView("setup");
    setInput("");
    setAnswerState("typing");
    setMessage("本轮练习完成。");
  }

  function completeCurrent(value: string) {
    if (!current || answerState === "correct") return;
    const correctChars = countCorrectChars(value, currentAnswer);
    const totalChars = Array.from(currentAnswer).length;

    setAnswerState("correct");
    setProgress((old) => ({
      ...old,
      completed: old.completed + 1,
      correctChars: old.correctChars + correctChars,
      totalChars: old.totalChars + totalChars,
      sessions: old.sessions + (queueIndex === 0 ? 1 : 0),
      mistakes: old.mistakes,
    }));
    setPracticeHistory((old) => ({
      ...old,
      [current.id]: {
        lastPracticed: todayKey(),
        times: (old[current.id]?.times ?? 0) + 1,
      },
    }));

    const isLast = queueIndex + 1 >= sessionQueue.length;
    const shouldAdvanceImmediately = settings.mode === "lyrics";
    const delay = shouldAdvanceImmediately ? 0 : 2000;
    setMessage(
      isLast
        ? shouldAdvanceImmediately
          ? "正确。本轮结束。"
          : "正确。本轮将在 2 秒后结束。"
        : shouldAdvanceImmediately
          ? "正确。进入下一句。"
          : "正确。2 秒后进入下一题。"
    );

    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => {
      if (isLast) {
        finishRound();
        return;
      }
      setInput("");
      setAnswerState("typing");
      setQueueIndex((index) => index + 1);
      setMessage("输入完整假名读音。");
    }, delay);
  }

  function handleInput(value: string, composing = isComposing) {
    if (answerState === "correct") return;
    setInput(value);
    if (!composing && current && isComplete(value, currentAnswer, settings.strictness)) {
      completeCurrent(value);
    }
  }

  async function importFile(file: File) {
    const text = await file.text();
    const library =
      file.name.toLowerCase().endsWith(".txt") ? lyricsTextToLibrary(text, file.name) : parseImportedJson(text);
    const identified = ensureLibraryIdentity(library, file.name);
    setLibraries((old) => [identified, ...old]);
    await saveImportedLibrary(identified);
    setSettings((old) => ({ ...old, mode: identified.type }));
    setInput("");
    setMessage(`已导入并保存：${identified.title}。可预览后加入本轮。`);
  }

  async function importFiles(files: FileList | File[]) {
    const list = Array.from(files);
    for (const file of list) {
      await importFile(file);
    }
  }

  function resetToday() {
    setProgress({
      date: new Date().toISOString().slice(0, 10),
      completed: 0,
      correctChars: 0,
      totalChars: 0,
      sessions: 0,
      mistakes: {},
    });
    setMessage("今日统计已重置。");
  }

  function openPreview(library: PracticeLibrary) {
    setPreviewLibraryId(libraryId(library));
    setView("preview");
  }

  function backToSetup() {
    setView("setup");
    setPreviewLibraryId(null);
  }

  if (view === "preview" && previewLibrary) {
    const items = libraryItems(previewLibrary);
    return (
      <main className="app-shell">
        <header className="topbar">
          <h1>日本語タイピング</h1>
        </header>
        <section className="preview-page">
          <div className="preview-head">
            <button className="ghost compact" onClick={backToSetup}>
              返回设置
            </button>
            <button onClick={() => addLibraryToSession(previewLibrary)}>加入本轮</button>
          </div>
          <div className="preview-card">
            <div className="preview-title">
              <span>{libraryTypeName(previewLibrary.type)}</span>
              <h2>{previewLibrary.title}</h2>
              <p>{previewLibrary.description ?? "标准训练库"}</p>
            </div>
            <div className="preview-list">
              {items.map((item, index) => (
                <article className="preview-item" key={item.id}>
                  <span className="preview-index">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{item.jp}</strong>
                    <small>{answerText(item)}</small>
                  </div>
                  <p>{zhText(item.zh)}</p>
                  <span className="preview-meta">
                    {item.level}
                    {item.pos ? ` · ${item.pos}` : ""}
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={`app-shell ${view === "practice" ? "practice-shell" : ""}`}>
      <header className="topbar">
        <h1>日本語タイピング</h1>
      </header>

      {view === "setup" ? (
        <section className="setup-page">
          <div className="setup-main">
            <nav className="mode-tabs" aria-label="练习类型">
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  className={settings.mode === mode.id ? "active" : ""}
                  onClick={() => updateSetting("mode", mode.id)}
                >
                  <span>{mode.label}</span>
                  <small>{mode.kana}</small>
                </button>
              ))}
            </nav>

            <div className="setup-card">
              <div className="setup-heading">
                <div>
                  <h2>练习准备</h2>
                  <p>
                    当前模式有 {activeLibraries.length} 个库、{availableItemsCount} 条内容；本轮已选{" "}
                    {selectedLibraries.length} 个库、{selectedItems.length} 条。
                  </p>
                </div>
                <button className="start-button" onClick={startPractice}>
                  开始练习
                </button>
              </div>

              <div className="settings-grid">
                <label>
                  难度
                  <select
                    value={settings.level}
                    onChange={(event) => updateSetting("level", event.target.value as typeof settings.level)}
                  >
                    {levelOptions.map((level) => (
                      <option key={level} value={level}>
                        {level === "all" ? "全部" : level}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  每日目标
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={settings.dailyGoal}
                    onChange={(event) => updateSetting("dailyGoal", Number(event.target.value))}
                  />
                </label>
                <label>
                  本轮数量
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.sessionSize}
                    onChange={(event) => updateSetting("sessionSize", Number(event.target.value))}
                  />
                </label>
                <label>
                  提示模式
                  <select
                    value={settings.hintMode}
                    onChange={(event) => updateSetting("hintMode", event.target.value as HintMode)}
                  >
                    <option value="off">关闭</option>
                    <option value="hover">悬停显示</option>
                    <option value="always">始终显示</option>
                  </select>
                </label>
                <label>
                  练习顺序
                  <select
                    value={settings.order}
                    onChange={(event) => updateSetting("order", event.target.value as typeof settings.order)}
                  >
                    <option value="sequential">顺序</option>
                    <option value="random">随机</option>
                    <option value="mistakes">错题优先</option>
                  </select>
                </label>
                <label>
                  判定
                  <select
                    value={settings.strictness}
                    onChange={(event) =>
                      updateSetting("strictness", event.target.value as typeof settings.strictness)
                    }
                  >
                    <option value="strict">严格匹配</option>
                    <option value="ignore-punctuation">忽略标点</option>
                    <option value="ignore-space-punctuation">忽略空格和标点</option>
                  </select>
                </label>
              </div>
            </div>

            <section className="setup-card library-section">
              <div className="library-head">
                <div>
                  <h2>{currentMeta.loaded}</h2>
                  <p>
                    显示 {visibleLibraries.length} / {activeLibraries.length} 个库
                  </p>
                </div>
                <label className="search-field">
                  <span>搜索</span>
                  <input
                    type="search"
                    value={librarySearch[settings.mode]}
                    onChange={(event) =>
                      setLibrarySearch((old) => ({ ...old, [settings.mode]: event.target.value }))
                    }
                    placeholder="搜索库名、歌词、中文..."
                  />
                </label>
              </div>
              <ul className="library-list">
                {visibleLibraries.map((library) => (
                  <li
                    key={libraryId(library)}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("application/x-jpexam-library", libraryId(library));
                    }}
                  >
                    <b>{library.title}</b>
                    <span>
                      {libraryItems(library).length} 条 · {library.description ?? "标准训练库"}
                    </span>
                    <div className="library-actions">
                      <button className="text-button" onClick={() => openPreview(library)}>
                        预览
                      </button>
                      <button className="text-button" onClick={() => addLibraryToSession(library)}>
                        加入
                      </button>
                    </div>
                  </li>
                ))}
                {visibleLibraries.length === 0 && <li className="empty-library">没有匹配的库。</li>}
              </ul>
            </section>
          </div>

          <aside className="setup-side">
            <section>
              <h2>今日进度</h2>
              <div className="progress-number">
                <strong>{progress.completed}</strong>
                <span>/ {settings.dailyGoal}</span>
              </div>
              <StatBar completed={progress.completed} goal={settings.dailyGoal} />
              <dl>
                <div>
                  <dt>正确率</dt>
                  <dd>{accuracy}%</dd>
                </div>
                <div>
                  <dt>轮数</dt>
                  <dd>{progress.sessions}</dd>
                </div>
                <div>
                  <dt>历史</dt>
                  <dd>{Object.keys(practiceHistory).length}</dd>
                </div>
              </dl>
              <button className="ghost" onClick={resetToday}>
                重置今日
              </button>
            </section>

            <section
              className="session-drop"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const id = event.dataTransfer.getData("application/x-jpexam-library");
                const library = activeLibraries.find((item) => libraryId(item) === id);
                if (library) addLibraryToSession(library);
              }}
            >
              <h2>{currentMeta.selected}</h2>
              {selectedLibraries.length === 0 ? (
                <p>把已加载库拖到这里，或点“加入”。</p>
              ) : (
                <ul className="selected-list">
                  {selectedLibraries.map((library) => (
                    <li key={libraryId(library)}>
                      <span>{library.title}</span>
                      <button className="text-button" onClick={() => removeLibraryFromSession(library)}>
                        移出
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="side-import">
              <h2>内容导入</h2>
              <p>补充个性化词库、句库或歌词。</p>
              <label
                className="file-drop"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (event.dataTransfer.files.length) {
                    void importFiles(event.dataTransfer.files).catch((error) => setMessage(error.message));
                  }
                }}
              >
                <input
                  type="file"
                  multiple
                  accept=".json,.txt,application/json,text/plain"
                  onChange={(event) => {
                    if (event.target.files) {
                      void importFiles(event.target.files).catch((error) => setMessage(error.message));
                    }
                  }}
                />
                <span>导入 JSON 或 TXT</span>
              </label>
            </section>
            <p className="status-line">{message}</p>
          </aside>
        </section>
      ) : (
        <section className="practice-page">
          <div className="practice-card">
            <div className="practice-head">
              <button className="ghost compact" onClick={() => setView("setup")}>
                返回设置
              </button>
              <span>
                {queueIndex + 1} / {sessionQueue.length}
              </span>
            </div>

            {current ? (
              <>
                <div className="target-stage">
                  <div className="practice-note">
                    <span>今日の一言</span>
                    <strong>{studyNote.jp}</strong>
                    <small>{studyNote.zh}</small>
                  </div>

                  {settings.mode === "lyrics" && (
                    <div className="lyric-context" aria-label="歌词上下文">
                      <span className="previous-line">{previous?.jp ?? " "}</span>
                      <strong>{renderWithRuby(current, settings.hintMode)}</strong>
                      <div className="next-lines">
                        {nextLines.length > 0 ? (
                          nextLines.map((line) => <span key={line.id}>{line.jp}</span>)
                        ) : (
                          <span>本轮即将结束</span>
                        )}
                      </div>
                    </div>
                  )}

                  {settings.mode !== "lyrics" && (
                    <div className="target-text">{renderWithRuby(current, settings.hintMode)}</div>
                  )}

                  <div className="meaning-row">
                    <span>中文</span>
                    <p>{zhText(current.zh)}</p>
                  </div>
                </div>

                <div className={`answer-zone ${answerState}`}>
                  <AnswerProgress target={currentAnswer} input={input} strictness={settings.strictness} />
                  <textarea
                    value={input}
                    ref={inputRef}
                    disabled={answerState === "correct"}
                    onChange={(event) => handleInput(event.target.value)}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={(event) => {
                      setIsComposing(false);
                      handleInput(event.currentTarget.value, false);
                    }}
                    placeholder="输入完整假名读音，例如：としょかん"
                    spellCheck={false}
                    autoFocus
                  />
                  <div className="practice-actions">
                    <button onClick={toggleHintMode}>提示</button>
                    <span>{message}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <h2>本轮没有内容</h2>
                <p>返回设置页重新选择。</p>
              </div>
            )}
          </div>

          <aside className="practice-inspector">
            <section>
              <h2>多义/多音</h2>
              {current?.ambiguities && current.ambiguities.length > 0 ? (
                current.ambiguities.map((item) => (
                  <p key={item.text}>
                    <b>{item.text}</b>
                    {item.readings?.map((reading) => ` / ${reading.kana}: ${reading.zh}`).join("")}
                    {item.meanings ? ` / ${item.meanings.join("；")}` : ""}
                  </p>
                ))
              ) : (
                <p>本题暂无额外提示。</p>
              )}
            </section>
            <section>
              <h2>今日</h2>
              <div className="progress-number small">
                <strong>{progress.completed}</strong>
                <span>/ {settings.dailyGoal}</span>
              </div>
              <StatBar completed={progress.completed} goal={settings.dailyGoal} />
            </section>
          </aside>
        </section>
      )}
    </main>
  );
}

export default App;
