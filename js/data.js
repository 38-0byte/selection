// データモデル定義・初期データ・ID生成・CRUDヘルパー
import { todayStr } from "./utils.js";

export const APP_VERSION = "1.0";

export const STATUS_LIST = [
  "情報待ち",
  "検討中",
  "応募予定",
  "応募済",
  "当選",
  "落選",
  "参戦決定",
  "見送り",
  "参戦済",
];

export const COST_FIELDS = [
  { key: "ticket", label: "チケット" },
  { key: "transportation", label: "交通費" },
  { key: "hotel", label: "ホテル" },
  { key: "goods", label: "グッズ" },
];

export const DEFAULT_CATEGORIES = ["ライブ", "舞台", "ファンミ", "フェス", "お笑い", "イベント"];

export const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
  "岐阜県", "静岡県", "愛知県", "三重県",
  "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];

export const ACCENT_PALETTE = [
  "#c9756f", "#5b8fc0", "#7fb17d", "#d4b45a",
  "#9d8ec9", "#5fb0ac", "#c98fbb", "#b3936a",
];

let idCounter = 0;
export function generateId(prefix) {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}_${Math.floor(Math.random() * 1000)}`;
}

export function emptyCost() {
  return { ticket: 0, transportation: 0, hotel: 0, goods: 0, others: [] };
}

export function costTotal(cost) {
  if (!cost) return 0;
  const base =
    (Number(cost.ticket) || 0) +
    (Number(cost.transportation) || 0) +
    (Number(cost.hotel) || 0) +
    (Number(cost.goods) || 0);
  const others = Array.isArray(cost.others)
    ? cost.others.reduce((sum, o) => sum + (Number(o.price) || 0), 0)
    : 0;
  return base + others;
}

export function findGroup(data, groupId) {
  return data.favorites.find((g) => g.id === groupId) || null;
}

export function findMember(data, memberId) {
  for (const group of data.favorites) {
    const member = (group.members || []).find((m) => m.id === memberId);
    if (member) return { member, group };
  }
  return null;
}

export function allMembers(data) {
  const list = [];
  for (const group of data.favorites) {
    for (const member of group.members || []) {
      list.push({ member, group });
    }
  }
  return list;
}

export function memberColor(data, memberId) {
  const found = findMember(data, memberId);
  if (found?.member?.color) return found.member.color;
  if (found?.group?.color) return found.group.color;
  return "#9d8ec9";
}

export function createEvent(input) {
  return {
    id: generateId("event"),
    year: input.year,
    favoriteId: input.favoriteId || "",
    groupId: input.groupId || "",
    title: input.title || "",
    category: input.category || "",
    date: input.date || "",
    venue: input.venue || "",
    prefecture: input.prefecture || "",
    priority: input.priority ?? 3,
    status: input.status || STATUS_LIST[0],
    applicationStart: input.applicationStart || "",
    applicationDeadline: input.applicationDeadline || "",
    resultDate: input.resultDate || "",
    paymentDeadline: input.paymentDeadline || "",
    plannedCost: input.plannedCost || emptyCost(),
    actualCost: input.actualCost || emptyCost(),
    memo: input.memo || "",
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

export function createDefaultData() {
  const year = new Date().getFullYear();
  const categories = DEFAULT_CATEGORIES.map((name) => ({ id: generateId("category"), name }));

  return {
    appInfo: { appName: "現場SELECTION", version: APP_VERSION },
    settings: {
      currentYear: year,
      annualBudgets: {},
    },
    favorites: [],
    categories,
    events: [],
  };
}
