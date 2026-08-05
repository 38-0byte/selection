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

export function favoriteEventCounts(events, year) {
  const counts = {};
  for (const e of yearEvents(events, year)) {
    if (!e.favoriteId) continue;
    counts[e.favoriteId] = (counts[e.favoriteId] || 0) + 1;
  }
  return counts;
}

export function favoriteActualCostTotals(events, year) {
  const totals = {};
  for (const e of yearEvents(events, year)) {
    if (!e.favoriteId) continue;
    const total = eventActualTotal(e);
    if (total <= 0) continue;
    totals[e.favoriteId] = (totals[e.favoriteId] || 0) + total;
  }
  return totals;
}

export function availableYears(events, settings) {
  const years = new Set(events.map((e) => Number(e.year)));
  Object.keys(settings.annualBudgets || {}).forEach((y) => years.add(Number(y)));
  years.add(Number(settings.currentYear));
  years.add(new Date().getFullYear());
  return Array.from(years).sort((a, b) => a - b);
}
