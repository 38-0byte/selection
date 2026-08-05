// ホーム画面：今年の推し活状況を一瞬で把握する
import { el, icon, formatDateFull, formatTimeRange, formatCurrency, animateCount } from "../utils.js";
import {
  yearEvents,
  statusCounts,
  budgetSummary,
  upcomingEvents,
  deadlineItems,
} from "../calc.js";
import { findMember } from "../data.js";

export function render(container, ctx) {
  const { data } = ctx;
  const year = data.settings.currentYear;

  container.appendChild(renderYearSwitch(ctx, year));
  container.appendChild(renderStatusCard(ctx, year));
  container.appendChild(renderBudgetCard(ctx, year));
  container.appendChild(renderUpcomingCard(ctx, year));
  container.appendChild(renderDeadlineCard(ctx, year));
}

function renderYearSwitch(ctx, year) {
  return el("div", { class: "year-switch" }, [
    el("button", { onclick: () => ctx.setYear(year - 1) }, icon("chevron_left")),
    el("div", { class: "year-label" }, `${year}年`),
    el("button", { onclick: () => ctx.setYear(year + 1) }, icon("chevron_right")),
  ]);
}

function renderStatusCard(ctx, year) {
  const events = yearEvents(ctx.data.events, year);
  const counts = statusCounts(ctx.data.events, year);
  const card = el(
    "div",
    { class: "card tappable", onclick: () => ctx.navigate("list") },
    [
      el("div", { class: "card-row" }, [
        el("div", { class: "section-label", style: "margin:0" }, "現場候補"),
        icon("chevron_right", "muted"),
      ]),
      el("div", { class: "stat-big" }, [
        el("span", { class: "count-target" }, "0"),
        el("span", { class: "stat-unit" }, "件"),
      ]),
      el("div", { class: "pill-row" }, [
        el("span", { class: "pill" }, [icon("confirmation_number"), `参戦決定 ${counts["参戦決定"] || 0}件`]),
        el("span", { class: "pill" }, [icon("psychology"), `検討中 ${counts["検討中"] || 0}件`]),
        el("span", { class: "pill" }, [icon("event_busy"), `見送り ${counts["見送り"] || 0}件`]),
      ]),
    ]
  );
  const target = card.querySelector(".count-target");
  requestAnimationFrame(() => animateCount(target, events.length));
  return card;
}

function renderBudgetCard(ctx, year) {
  const { annualBudget, plannedTotal, remaining } = budgetSummary(ctx.data, year);
  const ratio = annualBudget > 0 ? Math.min(1, plannedTotal / annualBudget) : 0;
  const over = remaining < 0;

  return el(
    "div",
    { class: "card tappable", onclick: () => ctx.navigate("dashboard") },
    [
      el("div", { class: "section-label", style: "margin:0" }, "年間予算"),
      el("div", { class: "stat-big" }, formatCurrency(annualBudget)),
      el("div", { class: "budget-bar" }, [
        el("div", {
          class: `budget-bar-fill${over ? " over" : ""}`,
          style: `width:${ratio * 100}%`,
        }),
      ]),
      el("div", { class: "stat-line" }, [
        el("span", { class: "label" }, "予定支出"),
        el("span", { class: "value" }, formatCurrency(plannedTotal)),
      ]),
      el("div", { class: "stat-line" }, [
        el("span", { class: "label" }, over ? "予算超過" : "残り"),
        el("span", { class: `value${over ? " diff-over" : ""}` }, formatCurrency(Math.abs(remaining))),
      ]),
    ]
  );
}

function renderUpcomingCard(ctx, year) {
  const events = upcomingEvents(ctx.data.events, year, 5);
  const body = events.length
    ? events.map((e) => {
        const memberInfo = findMember(ctx.data, e.mainFavoriteId);
        const [m, d] = formatDateFull(e.date).split("(");
        const timeRange = formatTimeRange(e.startTime, e.endTime);
        return el(
          "div",
          { class: "mini-list-item tappable", onclick: () => ctx.navigate("eventDetail", { id: e.id }) },
          [
            el("div", { class: "mini-date-badge" }, [m, el("span", { class: "dow" }, `(${d}`)]),
            el("div", { class: "info" }, [
              el("div", { class: "title" }, e.title || "(無題)"),
              el("div", { class: "sub" }, [timeRange, memberInfo?.member?.name].filter(Boolean).join(" ・ ")),
            ]),
          ]
        );
      })
    : [el("div", { class: "muted", style: "padding:10px 0" }, "直近の現場はまだありません")];

  return el("div", { class: "card" }, [
    el("div", { class: "section-label", style: "margin:0 0 4px" }, "NEXT EVENT"),
    ...body,
  ]);
}

function renderDeadlineCard(ctx, year) {
  const items = deadlineItems(ctx.data.events, year).slice(0, 5);
  if (!items.length) return el("div", {});

  const body = items.map(({ event, type, daysLeft }) =>
    el(
      "div",
      { class: "mini-list-item tappable", onclick: () => ctx.navigate("eventDetail", { id: event.id }) },
      [
        el("div", { class: "info" }, [
          el("div", { class: "title" }, event.title || "(無題)"),
          el("div", { class: "sub" }, type),
        ]),
        el("span", { class: "deadline-tag" }, daysLeft <= 0 ? "本日締切" : `あと${daysLeft}日`),
      ]
    )
  );

  return el("div", { class: "card" }, [
    el("div", { class: "section-label", style: "margin:0 0 4px; color:var(--color-danger)" }, "⚠ 締切間近"),
    ...body,
  ]);
}
