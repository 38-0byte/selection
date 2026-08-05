// ダッシュボード画面：推し活データ分析
import { el, formatCurrency, animateCount } from "../utils.js";
import {
  yearEvents,
  plannedSpendTotal,
  actualSpendTotal,
  favoriteEventCounts,
  favoriteActualCostTotals,
} from "../calc.js";
import { findMember, allMembers } from "../data.js";

let chartInstance = null;

export function render(container, ctx) {
  const year = ctx.data.settings.currentYear;
  const events = yearEvents(ctx.data.events, year);

  container.appendChild(el("div", { class: "page-title" }, "ダッシュボード"));
  container.appendChild(renderSpendCard(ctx, year));
  container.appendChild(renderPieCard(ctx, year));
  container.appendChild(renderCountCards(ctx, events));
  container.appendChild(renderFavoriteCountCard(ctx, year));
}

function renderSpendCard(ctx, year) {
  const planned = plannedSpendTotal(ctx.data.events, year);
  const actual = actualSpendTotal(ctx.data.events, year);
  return el("div", { class: "card" }, [
    el("div", { class: "section-label", style: "margin-top:0" }, "年間支出"),
    el("div", { class: "card-row" }, [
      el("div", {}, [el("div", { class: "muted", style: "font-size:12px" }, "予定支出"), el("div", { class: "stat-big" }, formatCurrency(planned))]),
      el("div", {}, [el("div", { class: "muted", style: "font-size:12px" }, "実績支出"), el("div", { class: "stat-big" }, formatCurrency(actual))]),
    ]),
  ]);
}

function renderPieCard(ctx, year) {
  const totals = favoriteActualCostTotals(ctx.data.events, year);
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  const card = el("div", { class: "card" }, [el("div", { class: "section-label", style: "margin-top:0" }, "推し別支出（実績）")]);

  if (!entries.length) {
    card.appendChild(el("div", { class: "muted", style: "padding:20px 0" }, "実績費用が入力された現場がまだありません"));
    return card;
  }

  const canvasWrap = el("div", { class: "chart-wrap" });
  const canvas = el("canvas");
  canvasWrap.appendChild(canvas);
  card.appendChild(canvasWrap);

  const labels = [];
  const data = [];
  const colors = [];
  const legend = el("div", { class: "legend-list" });

  for (const [favoriteId, total] of entries) {
    const info = findMember(ctx.data, favoriteId);
    const name = info?.member?.name || "不明";
    const color = info?.member?.color || info?.group?.color || "#9d8ec9";
    labels.push(name);
    data.push(total);
    colors.push(color);
    legend.appendChild(
      el("div", { class: "legend-row" }, [
        el("span", { class: "legend-dot", style: `background:${color}` }),
        el("span", { class: "name" }, name),
        el("span", { class: "value" }, formatCurrency(total)),
      ])
    );
  }

  card.appendChild(legend);

  requestAnimationFrame(() => {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    if (typeof window.Chart === "undefined") return;
    chartInstance = new window.Chart(canvas.getContext("2d"), {
      type: "doughnut",
      data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: "#1e1e1e", borderWidth: 2 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
      },
    });
  });

  return card;
}

function renderCountCards(ctx, events) {
  const total = events.length;
  const kesshou = events.filter((e) => e.status === "参戦決定").length;
  const sansen = events.filter((e) => e.status === "参戦済").length;

  const wrap = el("div", { style: "display:flex; gap:12px" });

  const totalCard = el("div", { class: "card", style: "flex:1" }, [
    el("div", { class: "muted", style: "font-size:12px" }, "登録現場"),
    el("div", { class: "stat-big count-target" }, "0"),
  ]);
  wrap.appendChild(totalCard);
  requestAnimationFrame(() => animateCount(totalCard.querySelector(".count-target"), total, { suffix: "件" }));

  const statusCard = el("div", { class: "card", style: "flex:1" }, [
    el("div", { class: "stat-line" }, [el("span", { class: "label" }, "参戦予定"), el("span", { class: "value" }, `${kesshou}件`)]),
    el("div", { class: "stat-line" }, [el("span", { class: "label" }, "参戦済"), el("span", { class: "value" }, `${sansen}件`)]),
  ]);
  wrap.appendChild(statusCard);

  return wrap;
}

function renderFavoriteCountCard(ctx, year) {
  const counts = favoriteEventCounts(ctx.data.events, year);
  const members = allMembers(ctx.data);
  const rows = members
    .map(({ member }) => ({ member, count: counts[member.id] || 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);

  const card = el("div", { class: "card" }, [el("div", { class: "section-label", style: "margin-top:0" }, "推し別現場数")]);

  if (!rows.length) {
    card.appendChild(el("div", { class: "muted", style: "padding:10px 0" }, "データがありません"));
    return card;
  }

  for (const r of rows) {
    card.appendChild(
      el("div", { class: "stat-line" }, [
        el("span", { class: "label" }, [
          el("span", { class: "color-dot", style: `background:${r.member.color}; display:inline-block; margin-right:8px; vertical-align:middle;` }),
          r.member.name,
        ]),
        el("span", { class: "value" }, `${r.count}件`),
      ])
    );
  }

  return card;
}
