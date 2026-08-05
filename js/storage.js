// LocalStorage 保存・読込・バックアップ処理（データ処理をUIから分離）
import { createDefaultData, APP_VERSION, emptyCost, DEFAULT_CATEGORIES, generateId } from "./data.js";

const STORAGE_KEY = "genbaSelectionData";

function repairData(raw) {
  const fallback = createDefaultData();
  if (!raw || typeof raw !== "object") return fallback;

  const data = {
    appInfo: raw.appInfo && typeof raw.appInfo === "object" ? raw.appInfo : fallback.appInfo,
    settings: raw.settings && typeof raw.settings === "object" ? raw.settings : fallback.settings,
    favorites: Array.isArray(raw.favorites) ? raw.favorites : fallback.favorites,
    categories: Array.isArray(raw.categories) ? raw.categories : fallback.categories,
    events: Array.isArray(raw.events) ? raw.events : [],
  };

  data.appInfo.appName = data.appInfo.appName || "現場SELECTION";
  data.appInfo.version = data.appInfo.version || APP_VERSION;

  if (!data.settings.currentYear) data.settings.currentYear = new Date().getFullYear();
  if (!data.settings.annualBudgets || typeof data.settings.annualBudgets !== "object") {
    data.settings.annualBudgets = {};
  }

  if (!data.categories.length) {
    data.categories = DEFAULT_CATEGORIES.map((name) => ({ id: generateId("category"), name }));
  }

  data.favorites = data.favorites.map((g) => ({
    id: g.id || generateId("group"),
    name: g.name || "",
    color: g.color || "#9d8ec9",
    members: Array.isArray(g.members)
      ? g.members.map((m) => ({
          id: m.id || generateId("member"),
          name: m.name || "",
          color: m.color || g.color || "#9d8ec9",
        }))
      : [],
  }));

  data.events = data.events.map((e) => ({
    id: e.id || generateId("event"),
    year: e.year || new Date().getFullYear(),
    favoriteId: e.favoriteId || "",
    groupId: e.groupId || "",
    title: e.title || "",
    category: e.category || "",
    date: e.date || "",
    venue: e.venue || "",
    prefecture: e.prefecture || "",
    priority: e.priority ?? 3,
    status: e.status || "情報待ち",
    applicationStart: e.applicationStart || "",
    applicationDeadline: e.applicationDeadline || "",
    resultDate: e.resultDate || "",
    paymentDeadline: e.paymentDeadline || "",
    plannedCost: e.plannedCost || emptyCost(),
    actualCost: e.actualCost || emptyCost(),
    memo: e.memo || "",
    createdAt: e.createdAt || new Date().toISOString(),
  }));

  return data;
}

export function loadData() {
  let raw = null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    raw = stored ? JSON.parse(stored) : null;
  } catch (e) {
    raw = null;
  }
  const data = raw ? repairData(raw) : createDefaultData();
  saveData(data);
  return data;
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("LocalStorageへの保存に失敗しました", e);
    return false;
  }
}

export function exportBackup(data, year) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `現場SELECTION_backup_${year}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function readBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        resolve(repairData(parsed));
      } catch (e) {
        reject(new Error("バックアップデータを読み込めませんでした"));
      }
    };
    reader.onerror = () => reject(new Error("バックアップデータを読み込めませんでした"));
    reader.readAsText(file);
  });
}

export function mergeData(current, incoming, mode) {
  if (mode === "replace") {
    return incoming;
  }
  // append: イベント・推し・カテゴリーを重複IDを避けて追加
  const existingEventIds = new Set(current.events.map((e) => e.id));
  const mergedEvents = [
    ...current.events,
    ...incoming.events.filter((e) => !existingEventIds.has(e.id)),
  ];

  const existingGroupIds = new Set(current.favorites.map((g) => g.id));
  const mergedFavorites = [
    ...current.favorites,
    ...incoming.favorites.filter((g) => !existingGroupIds.has(g.id)),
  ];

  const existingCatNames = new Set(current.categories.map((c) => c.name));
  const mergedCategories = [
    ...current.categories,
    ...incoming.categories.filter((c) => !existingCatNames.has(c.name)),
  ];

  const mergedBudgets = { ...incoming.settings.annualBudgets, ...current.settings.annualBudgets };

  return {
    appInfo: current.appInfo,
    settings: { ...current.settings, annualBudgets: mergedBudgets },
    favorites: mergedFavorites,
    categories: mergedCategories,
    events: mergedEvents,
  };
}
