// 集計・計算ロジック（UI非依存の純粋関数群）
import { costTotal } from "./data.js";
import { daysUntil, todayStr } from "./utils.js";

export function yearEvents(events, year) {
  return events.filter((e) => Number(e.year) === Number(year));
}

export function eventPlannedTotal(event) {
  return costTotal(event.plannedCost);
}

export function eventActualTotal(event) {
  return costTotal(event.actualCost);
}

export function eventDiff(event) {
  return eventPlannedTotal(event) - eventActualTotal(event);
}

export function hasActualEntered(event) {
  return eventActualTotal(event) > 0 || event.status === "参戦済";
}

export function statusCounts(events, year) {
  const list = yearEvents(events, year);
  const counts = {};
  for (const e of list) counts[e.status] = (counts[e.status] || 0) + 1;
  return counts;
}

export function plannedSpendTotal(events, year) {
  return yearEvents(events, year).reduce((sum, e) => sum + eventPlannedTotal(e), 0);
}

export function actualSpendTotal(events, year) {
  return yearEvents(events, year)
    .filter(hasActualEntered)
    .reduce((sum, e) => sum + eventActualTotal(e), 0);
}

export function budgetSummary(data, year) {
  const annualBudget = Number(data.settings.annualBudgets?.[year]) || 0;
  const plannedTotal = plannedSpendTotal(data.events, year);
  const remaining = annualBudget - plannedTotal;
  return { annualBudget, plannedTotal, remaining };
}

export function upcomingEvents(events, year, count = 5) {
  const today = todayStr();
  return yearEvents(events, year)
    .filter((e) => e.date && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, count);
}

const DEADLINE_FIELDS = [
  { key: "applicationDeadline", label: "応募締切" },
  { key: "paymentDeadline", label: "入金期限" },
];

export function deadlineItems(events, year) {
  const today = todayStr();
  const items = [];
  for (const e of yearEvents(events, year)) {
    for (const field of DEADLINE_FIELDS) {
      const date = e[field.key];
      if (date && date >= today) {
        items.push({ event: e, type: field.label, date, daysLeft: daysUntil(date) });
      }
    }
  }
  return items.sort((a, b) => a.date.localeCompare(b.date));
}

export function duplicateDateMap(events, year) {
  const map = {};
  for (const e of yearEvents(events, year)) {
    if (!e.date) continue;
    if (!map[e.date]) map[e.date] = [];
    map[e.date].push(e);
  }
  return map;
}

// 参加推し全員に1件ずつカウント（合同イベントは全員の現場数に加算される）
export function favoriteEventCounts(events, year) {
  const counts = {};
  for (const e of yearEvents(events, year)) {
    for (const fid of e.favoriteIds || []) {
      counts[fid] = (counts[fid] || 0) + 1;
    }
  }
  return counts;
}

// 合同イベントの実績費用は参加推し全員で均等に按分する
export function favoriteActualCostTotals(events, year) {
  const totals = {};
  for (const e of yearEvents(events, year)) {
    const ids = e.favoriteIds || [];
    if (!ids.length) continue;
    const total = eventActualTotal(e);
    if (total <= 0) continue;
    const share = Math.round(total / ids.length);
    for (const fid of ids) {
      totals[fid] = (totals[fid] || 0) + share;
    }
  }
  return totals;
}

// 時刻文字列("HH:MM")を分単位の数値に変換。未入力はnull
function timeToMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// 同日の2現場が時間帯として重なっているか判定。どちらかの時間が未入力の場合は同日重複として扱う（従来仕様との後方互換）
export function eventsOverlap(a, b) {
  if (!a.date || a.date !== b.date) return false;
  const aStart = timeToMinutes(a.startTime);
  const aEnd = timeToMinutes(a.endTime);
  const bStart = timeToMinutes(b.startTime);
  const bEnd = timeToMinutes(b.endTime);
  if (aStart === null || aEnd === null || bStart === null || bEnd === null) return true;
  return aStart < bEnd && bStart < aEnd;
}

// 時間帯が重なっている現場のID集合
export function overlappingEventIds(events, year) {
  const overlapping = new Set();
  const byDate = {};
  for (const e of yearEvents(events, year)) {
    if (!e.date) continue;
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  }
  for (const list of Object.values(byDate)) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (eventsOverlap(list[i], list[j])) {
          overlapping.add(list[i].id);
          overlapping.add(list[j].id);
        }
      }
    }
  }
  return overlapping;
}

// 時間帯重複を持つ現場が存在する日付の集合（カレンダーのセル強調用）
export function overlappingDates(events, year) {
  const ids = overlappingEventIds(events, year);
  const dates = new Set();
  for (const e of yearEvents(events, year)) {
    if (ids.has(e.id)) dates.add(e.date);
  }
  return dates;
}

export function monthlySpend(events, year) {
  const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, planned: 0, actual: 0 }));
  for (const e of yearEvents(events, year)) {
    if (!e.date) continue;
    const m = Number(e.date.slice(5, 7));
    if (!m || m < 1 || m > 12) continue;
    months[m - 1].planned += eventPlannedTotal(e);
    months[m - 1].actual += eventActualTotal(e);
  }
  return months;
}

export function availableYears(events, settings) {
  const years = new Set(events.map((e) => Number(e.year)));
  Object.keys(settings.annualBudgets || {}).forEach((y) => years.add(Number(y)));
  years.add(Number(settings.currentYear));
  years.add(new Date().getFullYear());
  return Array.from(years).sort((a, b) => a - b);
}
