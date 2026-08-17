// アプリシェル：画面遷移・下部ナビ・FAB・グローバル状態管理
import { loadData, saveData } from "./storage.js";
import { el, icon, clearNode } from "./utils.js";

import * as homeView from "./views/home.js";
import * as eventListView from "./views/eventList.js";
import * as eventFormView from "./views/eventForm.js";
import * as eventDetailView from "./views/eventDetail.js";
import * as compareView from "./views/compare.js";
import * as calendarView from "./views/calendar.js";
import * as dashboardView from "./views/dashboard.js";
import * as settingsView from "./views/settings.js";

const TABS = [
  { name: "home", label: "ホーム", icon: "home", view: homeView },
  { name: "list", label: "現場一覧", icon: "confirmation_number", view: eventListView },
  { name: "calendar", label: "カレンダー", icon: "calendar_month", view: calendarView },
  { name: "dashboard", label: "ダッシュボード", icon: "analytics", view: dashboardView },
  { name: "settings", label: "設定", icon: "settings", view: settingsView },
];

const SUB_VIEWS = {
  eventForm: eventFormView,
  eventDetail: eventDetailView,
  compare: compareView,
};

const FAB_TABS = new Set(["home", "list", "calendar"]);

const state = {
  data: loadData(),
  stack: [{ name: "home", params: {} }],
  compareSelection: new Set(),
};

const appRoot = document.getElementById("app");
const viewRoot = document.getElementById("view-root");
const topHeader = document.getElementById("top-header");
const bottomNav = document.getElementById("bottom-nav");
const fab = document.getElementById("fab");

function currentEntry() {
  return state.stack[state.stack.length - 1];
}

function isTab(name) {
  return TABS.some((t) => t.name === name);
}

export const ctx = {
  get data() {
    return state.data;
  },
  save() {
    saveData(state.data);
  },
  refresh() {
    render();
  },
  navigate(name, params = {}) {
    if (isTab(name)) {
      if (name === "list") eventListView.resetFilters?.();
      state.stack = [{ name, params }];
    } else {
      state.stack.push({ name, params });
    }
    render();
    viewRoot.scrollTop = 0;
  },
  replace(name, params = {}) {
    state.stack[state.stack.length - 1] = { name, params };
    render();
  },
  goBack() {
    if (state.stack.length > 1) {
      state.stack.pop();
      render();
    } else {
      ctx.navigate("home");
    }
  },
  getCompareSelection() {
    return state.compareSelection;
  },
  toggleCompareSelection(eventId) {
    if (state.compareSelection.has(eventId)) {
      state.compareSelection.delete(eventId);
    } else if (state.compareSelection.size < 3) {
      state.compareSelection.add(eventId);
    }
    return state.compareSelection;
  },
  clearCompareSelection() {
    state.compareSelection.clear();
  },
};

function renderBottomNav() {
  clearNode(bottomNav);
  const active = state.stack[0]?.name;
  for (const tab of TABS) {
    const btn = el(
      "button",
      {
        class: `nav-item${active === tab.name ? " active" : ""}`,
        onclick: () => ctx.navigate(tab.name),
      },
      [icon(tab.icon), el("span", {}, tab.label)]
    );
    bottomNav.appendChild(btn);
  }
}

function renderFab() {
  const entry = currentEntry();
  const compareBarShowing = entry.name === "list" && state.compareSelection.size >= 1;
  const showFab = state.stack.length === 1 && FAB_TABS.has(entry.name) && !compareBarShowing;
  fab.style.display = showFab ? "flex" : "none";
  fab.onclick = () => ctx.navigate("eventForm", { mode: "create" });
}

function renderHeader() {
  const entry = currentEntry();
  const isSub = state.stack.length > 1;
  if (!isSub) {
    topHeader.style.display = "none";
    return;
  }
  topHeader.style.display = "flex";
  clearNode(topHeader);
  const eventFormTitles = { edit: "現場を編集", duplicate: "現場を複製" };
  const titles = {
    eventForm: eventFormTitles[entry.params?.mode] || "現場を登録",
    eventDetail: "現場詳細",
    compare: "現場を比較",
  };
  topHeader.appendChild(
    el("button", { class: "back-btn", onclick: () => ctx.goBack() }, icon("arrow_back_ios_new"))
  );
  topHeader.appendChild(el("h1", {}, titles[entry.name] || ""));
  topHeader.appendChild(el("div", { style: "width:40px" }));
}

function render() {
  const entry = currentEntry();
  const viewModule = isTab(entry.name)
    ? TABS.find((t) => t.name === entry.name).view
    : SUB_VIEWS[entry.name];

  clearNode(viewRoot);
  renderHeader();
  renderBottomNav();
  renderFab();

  if (viewModule && typeof viewModule.render === "function") {
    viewModule.render(viewRoot, ctx, entry.params || {});
  }
}

export function mount() {
  render();
}
