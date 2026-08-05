// 比較画面：候補現場を最大3件横比較
import { el, formatDate, formatCurrency, starHtml } from "../utils.js";
import { eventPlannedTotal } from "../calc.js";

export function render(container, ctx, params) {
  const ids = params.ids && params.ids.length ? params.ids : Array.from(ctx.getCompareSelection());
  const events = ids.map((id) => ctx.data.events.find((e) => e.id === id)).filter(Boolean);

  if (!events.length) {
    container.appendChild(
      el("div", { class: "empty-state" }, [el("div", {}, "比較する現場が選択されていません")])
    );
    return;
  }

  const rows = [
    { label: "金額", render: (e) => formatCurrency(eventPlannedTotal(e)) },
    { label: "日付", render: (e) => formatDate(e.date) || "未定" },
    { label: "場所", render: (e) => `${e.venue || "未定"}${e.prefecture ? ` / ${e.prefecture}` : ""}` },
    { label: "優先度", render: (e) => `<span class="stars-display">${starHtml(e.priority)}</span>` },
    { label: "ステータス", render: (e) => `<span class="status-badge">${e.status}</span>` },
  ];

  const headerRow = el("tr", {}, [
    el("th", { class: "row-label" }, ""),
    ...events.map((e) =>
      el(
        "td",
        { class: "col-head tappable", onclick: () => ctx.navigate("eventDetail", { id: e.id }) },
        e.title || "(無題)"
      )
    ),
  ]);

  const bodyRows = rows.map((row) =>
    el("tr", {}, [
      el("th", { class: "row-label" }, row.label),
      ...events.map((e) => el("td", { html: row.render(e) })),
    ])
  );

  container.appendChild(
    el("div", { class: "compare-table-wrap card" }, [
      el("table", { class: "compare-table" }, [el("thead", {}, headerRow), el("tbody", {}, bodyRows)]),
    ])
  );

  container.appendChild(
    el(
      "button",
      {
        class: "btn btn-secondary",
        style: "margin-top:6px",
        onclick: () => {
          ctx.clearCompareSelection();
          ctx.navigate("list");
        },
      },
      "選択を解除して一覧に戻る"
    )
  );
}
