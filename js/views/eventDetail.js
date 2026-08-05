// 現場詳細画面：情報確認・編集・ステータス変更
import { el, icon, formatDateLong, formatCurrency, starHtml, toast } from "../utils.js";
import { findMember, STATUS_LIST, COST_FIELDS } from "../data.js";
import { eventPlannedTotal, eventActualTotal, eventDiff } from "../calc.js";

export function render(container, ctx, params) {
  const event = ctx.data.events.find((e) => e.id === params.id);
  if (!event) {
    container.appendChild(
      el("div", { class: "empty-state" }, [icon("error_outline"), el("div", {}, "現場情報が見つかりませんでした")])
    );
    return;
  }

  const memberInfo = findMember(ctx.data, event.favoriteId);
  const color = memberInfo?.member?.color || memberInfo?.group?.color || "#9d8ec9";

  container.appendChild(renderBasicCard(event, memberInfo, color));
  container.appendChild(renderCostCard(event));
  if (event.memo) container.appendChild(renderMemoCard(event));
  container.appendChild(renderActions(ctx, event, container));

  const statusModalHost = el("div");
  container.appendChild(statusModalHost);
}

function renderBasicCard(event, memberInfo, color) {
  return el("div", { class: "card" }, [
    el("div", { class: "card-row" }, [
      el("span", { class: "favorite-name muted" }, memberInfo?.group?.name || ""),
      el("span", { class: "status-badge" }, event.status),
    ]),
    el("div", { class: "page-title", style: `margin:6px 0 4px; border-left:4px solid ${color}; padding-left:10px` }, event.title || "(無題)"),
    el("div", { class: "muted", style: "margin-bottom:10px" }, memberInfo?.member?.name || ""),
    el("div", { class: "pill-row" }, [
      el("span", { class: "pill" }, [icon("category"), event.category || "未分類"]),
      el("span", { class: "pill" }, [icon("event"), formatDateLong(event.date) || "日程未定"]),
      el("span", { class: "pill" }, [icon("location_on"), `${event.venue || "会場未定"} ${event.prefecture ? `（${event.prefecture}）` : ""}`]),
    ]),
    el("div", { style: "margin-top:12px" }, [el("span", { class: "stars-display", html: starHtml(event.priority) })]),
    renderDeadlineList(event),
  ]);
}

function renderDeadlineList(event) {
  const rows = [
    ["応募開始日", event.applicationStart],
    ["応募締切", event.applicationDeadline],
    ["当落日", event.resultDate],
    ["入金締切", event.paymentDeadline],
  ].filter(([, v]) => v);
  if (!rows.length) return el("div", {});
  return el(
    "div",
    { style: "margin-top:14px" },
    rows.map(([label, value]) =>
      el("div", { class: "stat-line" }, [el("span", { class: "label" }, label), el("span", { class: "value" }, value)])
    )
  );
}

function renderCostCard(event) {
  const plannedTotal = eventPlannedTotal(event);
  const actualTotal = eventActualTotal(event);
  const diff = eventDiff(event);
  const hasActual = actualTotal > 0;

  return el("div", { class: "card" }, [
    el("div", { class: "section-label", style: "margin-top:0" }, "費用"),
    el("div", { class: "card-row" }, [
      el("div", { style: "flex:1" }, [
        el("div", { class: "muted", style: "font-size:12px" }, "予定"),
        ...COST_FIELDS.map((f) =>
          el("div", { class: "stat-line" }, [
            el("span", { class: "label" }, f.label),
            el("span", { class: "value" }, formatCurrency(event.plannedCost?.[f.key])),
          ])
        ),
        ...(event.plannedCost?.others || []).map((o) =>
          el("div", { class: "stat-line" }, [
            el("span", { class: "label" }, o.name || "その他"),
            el("span", { class: "value" }, formatCurrency(o.price)),
          ])
        ),
        el("div", { class: "stat-line", style: "border-top:1px solid var(--color-border); margin-top:6px; padding-top:10px" }, [
          el("span", { class: "label" }, "予定合計"),
          el("span", { class: "value" }, formatCurrency(plannedTotal)),
        ]),
      ]),
    ]),
    hasActual
      ? el("div", { class: "card-row", style: "margin-top:14px" }, [
          el("div", { style: "flex:1" }, [
            el("div", { class: "muted", style: "font-size:12px" }, "実績"),
            ...COST_FIELDS.map((f) =>
              el("div", { class: "stat-line" }, [
                el("span", { class: "label" }, f.label),
                el("span", { class: "value" }, formatCurrency(event.actualCost?.[f.key])),
              ])
            ),
            ...(event.actualCost?.others || []).map((o) =>
              el("div", { class: "stat-line" }, [
                el("span", { class: "label" }, o.name || "その他"),
                el("span", { class: "value" }, formatCurrency(o.price)),
              ])
            ),
            el("div", { class: "stat-line", style: "border-top:1px solid var(--color-border); margin-top:6px; padding-top:10px" }, [
              el("span", { class: "label" }, "実績合計"),
              el("span", { class: "value" }, formatCurrency(actualTotal)),
            ]),
          ]),
        ])
      : el("div", {}),
    hasActual
      ? el("div", { class: "stat-line", style: "margin-top:10px" }, [
          el("span", { class: "label" }, diff >= 0 ? "節約" : "超過"),
          el("span", { class: `value ${diff >= 0 ? "diff-save" : "diff-over"}` }, formatCurrency(Math.abs(diff))),
        ])
      : el("div", {}),
  ]);
}

function renderMemoCard(event) {
  return el("div", { class: "card" }, [
    el("div", { class: "section-label", style: "margin-top:0" }, "メモ"),
    el("div", {}, event.memo),
  ]);
}

function renderActions(ctx, event, container) {
  return el("div", { class: "btn-row" }, [
    el("button", { class: "btn btn-secondary", onclick: () => ctx.navigate("eventForm", { mode: "edit", id: event.id }) }, [icon("edit"), "編集"]),
    el(
      "button",
      { class: "btn btn-secondary", onclick: () => openStatusModal(ctx, event, container) },
      [icon("sync_alt"), "状態変更"]
    ),
    el(
      "button",
      { class: "btn btn-primary", onclick: () => ctx.navigate("eventForm", { mode: "edit", id: event.id }) },
      [icon("receipt_long"), "実績入力"]
    ),
  ]);
}

function openStatusModal(ctx, event, container) {
  const overlay = el("div", { class: "modal-overlay", onclick: (e) => { if (e.target === e.currentTarget) overlay.remove(); } }, [
    el("div", { class: "modal-box" }, [
      el("h3", {}, "ステータスを変更"),
      el(
        "div",
        { class: "status-chip-list" },
        STATUS_LIST.map((s) =>
          el(
            "button",
            {
              class: `status-chip${event.status === s ? " selected" : ""}`,
              onclick: () => {
                event.status = s;
                ctx.save();
                toast("ステータスを更新しました");
                overlay.remove();
                ctx.refresh();
              },
            },
            s
          )
        )
      ),
      el("div", { class: "btn-row" }, [el("button", { class: "btn btn-ghost", onclick: () => overlay.remove() }, "閉じる")]),
    ]),
  ]);
  container.appendChild(overlay);
}
