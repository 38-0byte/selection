// 現場一覧画面：表/カード切替・検索・フィルター・比較選択
import { el, icon, formatDateFull, formatTimeRange, formatCurrency, starHtml, debounce, todayStr } from "../utils.js";
import { eventPlannedTotal, availableYears } from "../calc.js";
import { findMember, STATUS_LIST } from "../data.js";

// 現場一覧画面専用の状態。年フィルターは他画面の年状態と独立し、初期値は「すべての年」
const localState = {
  viewMode: "card",
  search: "",
  yearFilter: "all",
  filters: { favoriteId: "", category: "", prefecture: "", status: "", priority: "" },
  sheetOpen: false,
};

export function resetFilters() {
  localState.search = "";
  localState.yearFilter = "all";
  localState.filters = { favoriteId: "", category: "", prefecture: "", status: "", priority: "" };
  localState.sheetOpen = false;
}

function matchesFilters(ctx, event) {
  const f = localState.filters;
  if (f.favoriteId && !(event.favoriteIds || []).includes(f.favoriteId)) return false;
  if (f.category && event.category !== f.category) return false;
  if (f.prefecture && event.prefecture !== f.prefecture) return false;
  if (f.status && event.status !== f.status) return false;
  if (f.priority && Number(event.priority) !== Number(f.priority)) return false;
  return true;
}

function matchesSearch(ctx, event) {
  const q = localState.search.trim().toLowerCase();
  if (!q) return true;
  const participants = (event.favoriteIds || []).map((id) => findMember(ctx.data, id)).filter(Boolean);
  const haystack = [
    event.title,
    event.venue,
    ...participants.map((p) => p.member?.name),
    ...participants.map((p) => p.group?.name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function getFilteredEvents(ctx) {
  const byYear =
    localState.yearFilter === "all"
      ? ctx.data.events
      : ctx.data.events.filter((e) => Number(e.year) === Number(localState.yearFilter));
  return byYear.filter((e) => matchesFilters(ctx, e) && matchesSearch(ctx, e));
}

function splitByDate(list) {
  const today = todayStr();
  const upcoming = list
    .filter((e) => !e.date || e.date >= today)
    .sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  const past = list
    .filter((e) => e.date && e.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));
  return { upcoming, past };
}

export function render(container, ctx) {
  container.appendChild(el("div", { class: "page-title" }, "現場一覧"));
  container.appendChild(renderYearFilter(ctx));
  container.appendChild(renderSearchBar(ctx));
  container.appendChild(renderToolbar(ctx));

  const list = getFilteredEvents(ctx);
  const listWrap = el("div", { id: "event-list-body" });
  container.appendChild(listWrap);
  renderList(listWrap, ctx, list);

  if (localState.sheetOpen) {
    container.appendChild(renderFilterSheet(ctx, () => {
      ctx.refresh();
    }));
  }

  const selection = ctx.getCompareSelection();
  if (selection.size >= 1) {
    container.appendChild(renderCompareBar(ctx));
  }
}

function renderYearFilter(ctx) {
  const years = availableYears(ctx.data.events);
  const select = el(
    "select",
    {
      onchange: (e) => {
        localState.yearFilter = e.target.value;
        ctx.refresh();
      },
    },
    [
      el("option", { value: "all", selected: localState.yearFilter === "all" }, "すべての年"),
      ...years.map((y) =>
        el("option", { value: String(y), selected: String(y) === String(localState.yearFilter) }, `${y}年`)
      ),
    ]
  );
  return el("div", { class: "field", style: "margin-bottom:12px" }, select);
}

function renderSearchBar(ctx) {
  const input = el("input", {
    type: "text",
    placeholder: "現場名・推し・グループ・会場で検索",
    value: localState.search,
    oninput: debounce((e) => {
      localState.search = e.target.value;
      ctx.refresh();
    }, 200),
  });
  return el("div", { class: "search-bar" }, [icon("search"), input]);
}

function renderToolbar(ctx) {
  const activeFilterCount = Object.values(localState.filters).filter(Boolean).length;
  return el("div", { class: "toolbar-row" }, [
    el("div", { class: "toggle-group" }, [
      el(
        "button",
        {
          class: localState.viewMode === "card" ? "active" : "",
          onclick: () => {
            localState.viewMode = "card";
            ctx.refresh();
          },
        },
        [icon("grid_view"), "カード"]
      ),
      el(
        "button",
        {
          class: localState.viewMode === "table" ? "active" : "",
          onclick: () => {
            localState.viewMode = "table";
            ctx.refresh();
          },
        },
        [icon("table_rows"), "表"]
      ),
    ]),
    el(
      "button",
      {
        class: `filter-btn${activeFilterCount ? " active-filter" : ""}`,
        onclick: () => {
          localState.sheetOpen = true;
          ctx.refresh();
        },
      },
      [icon("tune"), activeFilterCount ? `フィルター (${activeFilterCount})` : "フィルター"]
    ),
  ]);
}

function renderList(wrap, ctx, list) {
  if (!list.length) {
    wrap.appendChild(
      el("div", { class: "empty-state" }, [
        icon("confirmation_number"),
        el("div", {}, "該当する現場がありません"),
      ])
    );
    return;
  }

  const { upcoming, past } = splitByDate(list);

  if (upcoming.length) {
    wrap.appendChild(el("div", { class: "section-label", style: "margin-top:0" }, "🎫 現場予定"));
    renderGroup(wrap, ctx, upcoming);
  }
  if (past.length) {
    wrap.appendChild(el("div", { class: "section-label" }, "📖 過去現場"));
    renderGroup(wrap, ctx, past);
  }
}

function renderGroup(wrap, ctx, group) {
  if (localState.viewMode === "table") {
    wrap.appendChild(renderTable(ctx, group));
  } else {
    for (const event of group) wrap.appendChild(renderCard(ctx, event));
  }
}

function renderTable(ctx, list) {
  const rows = list.map((event) => {
    const memberInfo = findMember(ctx.data, event.mainFavoriteId);
    const extraCount = (event.favoriteIds || []).length - 1;
    const dateCell = el("div", {}, [
      el("div", {}, formatDateFull(event.date)),
      formatTimeRange(event.startTime, event.endTime)
        ? el("div", { class: "muted", style: "font-size:11px" }, formatTimeRange(event.startTime, event.endTime))
        : null,
    ]);
    return el(
      "tr",
      { onclick: () => ctx.navigate("eventDetail", { id: event.id }) },
      [
        el("td", {}, el("span", { class: "status-badge" }, event.status)),
        el("td", {}, event.title || "(無題)"),
        el("td", {}, dateCell),
        el("td", {}, `${memberInfo?.member?.name || "-"}${extraCount > 0 ? ` 他${extraCount}人` : ""}`),
        el("td", {}, formatCurrency(eventPlannedTotal(event))),
      ]
    );
  });
  return el("div", { class: "genba-table-wrap", style: "margin-bottom:14px" }, [
    el("table", { class: "genba-table" }, [
      el("thead", {}, el("tr", {}, ["状態", "現場", "日付", "推し", "金額"].map((h) => el("th", {}, h)))),
      el("tbody", {}, rows),
    ]),
  ]);
}

function renderCard(ctx, event) {
  const memberInfo = findMember(ctx.data, event.mainFavoriteId);
  const color = memberInfo?.member?.color || memberInfo?.group?.color || "#9d8ec9";
  const selected = ctx.getCompareSelection().has(event.id);
  const extraCount = (event.favoriteIds || []).length - 1;
  const timeRange = formatTimeRange(event.startTime, event.endTime);

  const card = el(
    "div",
    { class: "genba-card tappable", onclick: () => ctx.navigate("eventDetail", { id: event.id }) },
    [
      el("div", { class: "accent-line", style: `background:${color}` }),
      el(
        "button",
        {
          class: `select-check${selected ? " checked" : ""}`,
          onclick: (e) => {
            e.stopPropagation();
            ctx.toggleCompareSelection(event.id);
            ctx.refresh();
          },
        },
        icon("check")
      ),
      el("div", { class: "top-row" }, [
        el("div", {}, [
          el("div", { class: "favorite-name" }, `${memberInfo?.member?.name || ""}${extraCount > 0 ? ` 他${extraCount}人` : ""}`),
          el("div", { class: "title" }, event.title || "(無題)"),
        ]),
      ]),
      el("div", { class: "meta" }, [
        el("span", {}, formatDateFull(event.date) || "日程未定"),
        timeRange ? el("span", {}, timeRange) : null,
        el("span", {}, event.venue || "会場未定"),
      ]),
      el("div", { class: "bottom-row" }, [
        el("span", { class: "stars-display", html: starHtml(event.priority) }),
        el("span", { class: "status-badge" }, event.status),
      ]),
      el("div", { class: "bottom-row" }, [
        el("span", { class: "price" }, formatCurrency(eventPlannedTotal(event))),
      ]),
    ]
  );
  return card;
}

function renderCompareBar(ctx) {
  const selection = ctx.getCompareSelection();
  return el("div", { class: "compare-bar" }, [
    el("span", { class: "info" }, `${selection.size}件を選択中（最大3件）`),
    el("button", { class: "clear", onclick: () => { ctx.clearCompareSelection(); ctx.refresh(); } }, "クリア"),
    el(
      "button",
      {
        class: "go",
        onclick: () => ctx.navigate("compare", { ids: Array.from(selection) }),
      },
      "比較する"
    ),
  ]);
}

function renderFilterSheet(ctx) {
  const data = ctx.data;
  const members = [];
  for (const g of data.favorites) for (const m of g.members || []) members.push(m);

  const closeSheet = () => {
    localState.sheetOpen = false;
    ctx.refresh();
  };

  function selectField(label, value, options, onChange) {
    const select = el(
      "select",
      { onchange: (e) => onChange(e.target.value) },
      [el("option", { value: "" }, "すべて"), ...options.map((o) => el("option", { value: o.value, selected: o.value === value }, o.label))]
    );
    return el("div", { class: "field" }, [el("label", {}, label), select]);
  }

  const body = el("div", {}, [
    selectField(
      "推し",
      localState.filters.favoriteId,
      members.map((m) => ({ value: m.id, label: m.name })),
      (v) => (localState.filters.favoriteId = v)
    ),
    selectField(
      "カテゴリー",
      localState.filters.category,
      data.categories.map((c) => ({ value: c.name, label: c.name })),
      (v) => (localState.filters.category = v)
    ),
    selectField(
      "都道府県",
      localState.filters.prefecture,
      Array.from(new Set(data.events.map((e) => e.prefecture).filter(Boolean))).map((p) => ({ value: p, label: p })),
      (v) => (localState.filters.prefecture = v)
    ),
    selectField(
      "ステータス",
      localState.filters.status,
      STATUS_LIST.map((s) => ({ value: s, label: s })),
      (v) => (localState.filters.status = v)
    ),
    selectField(
      "優先度",
      localState.filters.priority,
      [5, 4, 3, 2, 1].map((p) => ({ value: String(p), label: "★".repeat(p) })),
      (v) => (localState.filters.priority = v)
    ),
    el("div", { class: "btn-row" }, [
      el(
        "button",
        {
          class: "btn btn-secondary",
          onclick: () => {
            localState.filters = { favoriteId: "", category: "", prefecture: "", status: "", priority: "" };
            closeSheet();
          },
        },
        "リセット"
      ),
      el("button", { class: "btn btn-primary", onclick: closeSheet }, "この条件で表示"),
    ]),
  ]);

  return el(
    "div",
    { class: "sheet-overlay", onclick: (e) => { if (e.target === e.currentTarget) closeSheet(); } },
    [el("div", { class: "sheet" }, [el("div", { class: "sheet-handle" }), el("h2", {}, "絞り込み"), body])]
  );
}
