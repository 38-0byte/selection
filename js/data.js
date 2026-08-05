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

  const groupNumberI = {
    id: generateId("group"),
    name: "Number_i",
    color: ACCENT_PALETTE[0],
    members: [{ id: generateId("member"), name: "平野紫耀", color: ACCENT_PALETTE[0] }],
  };
  const groupImp = {
    id: generateId("group"),
    name: "IMP.",
    color: ACCENT_PALETTE[1],
    members: [{ id: generateId("member"), name: "鈴木大河", color: ACCENT_PALETTE[1] }],
  };
  const groupSolo = {
    id: generateId("group"),
    name: "ソロ・俳優",
    color: ACCENT_PALETTE[2],
    members: [{ id: generateId("member"), name: "堂前透", color: ACCENT_PALETTE[2] }],
  };
  const groupBand = {
    id: generateId("group"),
    name: "キュウソネコカミ",
    color: ACCENT_PALETTE[3],
    members: [{ id: generateId("member"), name: "キュウソネコカミ", color: ACCENT_PALETTE[3] }],
  };

  const favorites = [groupNumberI, groupImp, groupSolo, groupBand];
  const categories = DEFAULT_CATEGORIES.map((name) => ({ id: generateId("category"), name }));

  const sampleEvents = [
    createEvent({
      year,
      favoriteId: groupNumberI.members[0].id,
      groupId: groupNumberI.id,
      title: "Number_i LIVE TOUR",
      category: "ライブ",
      date: `${year}-10-10`,
      venue: "大阪城ホール",
      prefecture: "大阪府",
      priority: 5,
      status: "検討中",
      applicationDeadline: `${year}-08-10`,
      plannedCost: { ticket: 9800, transportation: 12000, hotel: 8000, goods: 5000, others: [] },
      actualCost: emptyCost(),
    }),
    createEvent({
      year,
      favoriteId: groupImp.members[0].id,
      groupId: groupImp.id,
      title: "IMP. ライブ",
      category: "ライブ",
      date: `${year}-08-20`,
      venue: "東京ドームシティホール",
      prefecture: "東京都",
      priority: 4,
      status: "当選",
      paymentDeadline: `${year}-08-20`,
      plannedCost: { ticket: 8800, transportation: 4000, hotel: 0, goods: 3000, others: [] },
      actualCost: emptyCost(),
    }),
    createEvent({
      year,
      favoriteId: groupBand.members[0].id,
      groupId: groupBand.id,
      title: "ROCK FESTIVAL",
      category: "フェス",
      date: `${year}-08-09`,
      venue: "野外特設ステージ",
      prefecture: "千葉県",
      priority: 4,
      status: "参戦決定",
      plannedCost: { ticket: 15000, transportation: 6000, hotel: 12000, goods: 2000, others: [] },
      actualCost: { ticket: 15000, transportation: 5800, hotel: 12000, goods: 1500, others: [] },
    }),
    createEvent({
      year,
      favoriteId: groupSolo.members[0].id,
      groupId: groupSolo.id,
      title: "舞台『夜想曲』",
      category: "舞台",
      date: `${year}-09-13`,
      venue: "天王洲 銀河劇場",
      prefecture: "東京都",
      priority: 3,
      status: "情報待ち",
      plannedCost: emptyCost(),
      actualCost: emptyCost(),
    }),
  ];

  return {
    appInfo: { appName: "現場SELECTION", version: APP_VERSION },
    settings: {
      currentYear: year,
      annualBudgets: { [year]: 350000 },
    },
    favorites,
    categories,
    events: sampleEvents,
  };
}
