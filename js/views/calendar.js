// カレンダー画面：月表示・一覧表示・重複検出
import { el, icon, formatDateFull, pad2, todayStr } from "../utils.js";
import { yearEvents, duplicateDateMap } from "../calc.js";
import { findMember } from "../data.js";

const localState = {
  mode: "month",
  month: new Date().getMonth(),
  selectedDate: null,
};

const DOW_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export function render(container, ctx) {
  const year = ctx.data.settings.currentYear;
  const events = yearEvents(ctx.data.events, year);

  container.appendChild(el("div", { class: "page-title" }, "カレンダー"));
  container.appendChild(renderYearSwitch(ctx, year));
  container.appendChild(renderToggle(ctx));

  if (localState.mode === "month") {
    container.appendChild(renderMonthNav(ctx, year));
    container.appendChild(renderMonthGrid(ctx, year, events));
    container.appendChild(renderLegend());
    if (localState.selectedDate) {
      container.appendChild(renderDayList(ctx, events, localState.selectedDate));
    }
  } else {
    container.appendChild(renderListView(ctx, events));
  }
}

function renderYearSwitch(ctx, year) {
  return el("div", { class: "year-switch" }, [
    el("button", { onclick: () => ctx.setYear(year - 1) }, icon("chevron_left")),
    el("div", { class: "year-label" }, `${year}年`),
    el("button", { onclick: () => ctx.setYear(year + 1) }, icon("chevron_right")),
  ]);
}

function renderToggle(ctx) {
  return el("div", { class: "toggle-group", style: "margin-bottom:16px" }, [
    el(
      "button",
      {
        class: localState.mode === "month" ? "active" : "",
        onclick: () => {
          localState.mode = "month";
          ctx.refresh();
        },
      },
      [icon("calendar_view_month"), "月表示"]
    ),
    el(
      "button",
      {
        class: localState.mode === "list" ? "active" : "",
        onclick: () => {
          localState.mode = "list";
          ctx.refresh();
        },
      },
      [icon("view_list"), "一覧表示"]
    ),
  ]);
}

function renderMonthNav(ctx, year) {
  return el("div", { class: "year-switch", style: "margin-top:-8px" }, [
    el("button", {
      onclick: () => {
        localState.selectedDate = null;
        if (localState.month === 0) {
          localState.month = 11;
          ctx.setYear(year - 1);
        } else {
          localState.month -= 1;
          ctx.refresh();
        }
      },
    }, icon("chevron_left")),
    el("div", { class: "year-label", style: "font-size:16px" }, `${localState.month + 1}月`),
    el("button", {
      onclick: () => {
        localState.selectedDate = null;
        if (localState.month === 11) {
          localState.month = 0;
          ctx.setYear(year + 1);
        } else {
          localState.month += 1;
          ctx.refresh();
        }
      },
    }, icon("chevron_right")),
  ]);
}

function renderMonthGrid(ctx, year, events) {
  const month = localState.month;
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dupMap = duplicateDateMap(events, year);
  const todayISO = todayStr();

  const grid = el("div", { class: "calendar-grid" }, DOW_LABELS.map((d) => el("div", { class: "calendar-dow" }, d)));

  for (let i = 0; i < firstDow; i++) {
    grid.appendChild(el("div", { class: "calendar-cell empty" }));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${pad2(month + 1)}-${pad2(day)}`;
    const dayEvents = dupMap[dateStr] || [];
    const isDuplicate = dayEvents.length >= 2;
    const isToday = dateStr === todayISO;

    const dots = dayEvents.slice(0, 4).map((e) => {
      const memberInfo = findMember(ctx.data, e.favoriteId);
      const color = memberInfo?.member?.color || memberInfo?.group?.color || "#9d8ec9";
      return el("span", { class: "dot", style: `background:${color}` });
    });

    const cell = el(
      "div",
      {
        class: `calendar-cell${isDuplicate ? " duplicate" : ""}${isToday ? " today" : ""}`,
        onclick: () => {
          if (!dayEvents.length) return;
          localState.selectedDate = localState.selectedDate === dateStr ? null : dateStr;
          ctx.refresh();
        },
      },
      [el("span", { class: "day-num" }, String(day)), el("div", { class: "dot-row" }, dots)]
    );
    grid.appendChild(cell);
  }

  return grid;
}

function renderLegend() {
  return el("div", { class: "calendar-legend" }, [el("span", { class: "dot" }), "同日に複数現場（重複）"]);
}

function renderDayList(ctx, events, dateStr) {
  const dayEvents = events.filter((e) => e.date === dateStr);
  return el("div", { class: "card", style: "margin-top:14px" }, [
    el("div", { class: "section-label", style: "margin-top:0" }, formatDateFull(dateStr)),
    ...dayEvents.map((e) => {
      const memberInfo = findMember(ctx.data, e.favoriteId);
      return el(
        "div",
        { class: "mini-list-item tappable", onclick: () => ctx.navigate("eventDetail", { id: e.id }) },
        [
          el("div", { class: "info" }, [
            el("div", { class: "title" }, e.title || "(無題)"),
            el("div", { class: "sub" }, memberInfo?.member?.name || ""),
          ]),
          el("span", { class: "status-badge" }, e.status),
        ]
      );
    }),
  ]);
}

function renderListView(ctx, events) {
  const sorted = [...events].filter((e) => e.date).sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length) {
    return el("div", { class: "empty-state" }, [icon("event_busy"), el("div", {}, "登録された現場がありません")]);
  }
  return el(
    "div",
    { class: "card" },
    sorted.map((e) => {
      const memberInfo = findMember(ctx.data, e.favoriteId);
      const [m, d] = formatDateFull(e.date).split("(");
      return el(
        "div",
        { class: "mini-list-item tappable", onclick: () => ctx.navigate("eventDetail", { id: e.id }) },
        [
          el("div", { class: "mini-date-badge" }, [m, el("span", { class: "dow" }, `(${d}`)]),
          el("div", { class: "info" }, [
            el("div", { class: "title" }, e.title || "(無題)"),
            el("div", { class: "sub" }, memberInfo?.member?.name || ""),
          ]),
          el("span", { class: "status-badge" }, e.status),
        ]
      );
    })
  );
}
