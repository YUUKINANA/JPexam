import type { PracticeLibrary } from "./types";
import type { PracticeHistory, PracticeHistoryEntry } from "./storage";

const dbName = "jpexam.localData";
const dbVersion = 1;
const libraryStore = "importedLibraries";
const historyStore = "practiceHistory";

interface StoredPracticeHistoryEntry extends PracticeHistoryEntry {
  id: string;
}

function openLocalDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("当前浏览器不支持 IndexedDB。"));
      return;
    }

    const request = indexedDB.open(dbName, dbVersion);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(libraryStore)) {
        db.createObjectStore(libraryStore, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(historyStore)) {
        db.createObjectStore(historyStore, { keyPath: "id" });
      }
    };

    request.onerror = () => reject(request.error ?? new Error("打开本地数据库失败。"));
    request.onsuccess = () => resolve(request.result);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error("本地数据库操作失败。"));
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore<T>(
  storeName: typeof libraryStore | typeof historyStore,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
) {
  const db = await openLocalDatabase();
  try {
    return await requestToPromise(action(db.transaction(storeName, mode).objectStore(storeName)));
  } finally {
    db.close();
  }
}

export async function loadImportedLibraries(): Promise<PracticeLibrary[]> {
  return withStore<PracticeLibrary[]>(libraryStore, "readonly", (store) => store.getAll());
}

export async function saveImportedLibrary(library: PracticeLibrary): Promise<void> {
  const updatedLibrary = {
    ...library,
    updatedAt: new Date().toISOString(),
  };
  await withStore<IDBValidKey>(libraryStore, "readwrite", (store) => store.put(updatedLibrary));
}

export async function loadIndexedPracticeHistory(): Promise<PracticeHistory> {
  const entries = await withStore<StoredPracticeHistoryEntry[]>(historyStore, "readonly", (store) => store.getAll());
  return entries.reduce<PracticeHistory>((history, entry) => {
    history[entry.id] = {
      lastPracticed: entry.lastPracticed,
      times: entry.times,
    };
    return history;
  }, {});
}

export async function saveIndexedPracticeHistory(history: PracticeHistory): Promise<void> {
  const db = await openLocalDatabase();
  const transaction = db.transaction(historyStore, "readwrite");
  const store = transaction.objectStore(historyStore);

  Object.entries(history).forEach(([id, entry]) => {
    store.put({ id, ...entry });
  });

  await new Promise<void>((resolve, reject) => {
    transaction.onerror = () => reject(transaction.error ?? new Error("保存练习历史失败。"));
    transaction.oncomplete = () => resolve();
  });
  db.close();
}
