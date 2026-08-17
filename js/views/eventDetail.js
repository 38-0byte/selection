// 現場詳細画面：情報確認・編集・ステータス変更
import { el, icon, formatDateLong, formatDateFull, formatTimeRange, formatCurrency, starHtml, toast } from "../utils.js";
import { findMember, eventParticipants, STATUS_LIST, COST_FIELDS, statusBadgeStyle, statusChipStyle } from "../data.js";
import { eventPlannedTotal, eventActualTotal, eventDiff } from "../calc.js";

export function render(container, ctx, params) {
  const event = ctx.data.events.find((e) => e.id === params.id);
  if (!event) {
    container.appendChild(
      el("div", { class: "empty-state" }, [icon("error_outline"), el("div", {}, "現場情報が見つかりませんでした")])
    );
    return;
  }

  const mainInfo = findMember(ctx.data, event.mainFavoriteId);
  const participants = eventParticipants(ctx.data, event);
  const color = mainInfo?.member?.color || mainInfo?.group?.color || "#9d8ec9";

  container.appendChild(renderBasicCard(event, mainInfo, participants, color));
  container.appendChild(renderCostCard(event));
  if (event.memo) container.appendChild(renderMemoCard(event));
  container.appendChild(renderActions(ctx, event, container));
  container.appendChild(renderDuplicateButton(ctx, event));
  container.appendChild(renderDeleteLink(ctx, event, container));
}

function renderBasicCard(event, mainInfo, participants, color) {
  const timeRange = formatTimeRange(event.startTime, event.endTime);
  return el("div", { class: "card" }, [
    el("div", { class: "card-row" }, [
      el("span", { class: "favorite-name muted" }, mainInfo?.group?.name || ""),
      el("span", { class: "status-badge", style: statusBadgeStyle(event.status) }, event.status),
    ]),
    el("div", { class: "page-title", style: `margin:6px 0 4px; border-left:4px solid ${color}; padding-left:10px` }, event.title || "(無題)"),
    el(
      "div",
      { class: "pill-row", style: "margin-bottom:6px" },
      participants.length
        ? participants.map((p) =>
            el(
              "span",
              { class: "pill" },
              p.member.id === event.mainFavoriteId ? [icon("stars"), p.member.name] : [p.member.name]
            )
          )
        : [el("span", { class: "muted" }, "推し未設定")]
    ),
    el("div", { class: "pill-row" }, [
      el("span", { class: "pill" }, [icon("category"), event.category || "未分類"]),
      el("span", { class: "pill" }, [icon("event"), formatDateLong(event.date) || "日程未定"]),
      timeRange ? el("span", { class: "pill" }, [icon("schedule"), timeRange]) : null,
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
      el("div", { class: "stat-line" }, [el("span", { class: "label" }, label), el("span", { class: "value" }, formatDateFull(value) || value)])
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

function renderDuplicateButton(ctx, event) {
  return el(
    "div",
    { style: "margin-top:14px" },
    el(
      "button",
      {
        class: "btn btn-secondary",
        onclick: () => ctx.navigate("eventForm", { mode: "duplicate", sourceId: event.id }),
      },
      [icon("content_copy"), "この現場を複製"]
    )
  );
}

function renderDeleteLink(ctx, event, container) {
  return el(
    "div",
    { style: "margin-top:18px; text-align:center" },
    el(
      "button",
      {
        class: "btn btn-ghost btn-sm",
        style: "color:var(--color-danger)",
        onclick: () => openDeleteModal(ctx, event, container),
      },
      [icon("delete_outline"), "この現場を削除"]
    )
  );
}

function openDeleteModal(ctx, event, container) {
  const overlay = el("div", { class: "modal-overlay", onclick: (e) => { if (e.target === e.currentTarget) overlay.remove(); } }, [
    el("div", { class: "modal-box" }, [
      el("h3", {}, "現場を削除しますか？"),
      el("p", {}, `「${event.title || "(無題)"}」を削除します。\nこの操作は取り消せません。`),
      el("div", { class: "btn-row" }, [
        el("button", { class: "btn btn-secondary", onclick: () => overlay.remove() }, "キャンセル"),
        el(
          "button",
          {
            class: "btn btn-danger",
            onclick: () => {
              ctx.data.events = ctx.data.events.filter((e) => e.id !== event.id);
              ctx.save();
              overlay.remove();
              toast("現場を削除しました");
              ctx.navigate("list");
            },
          },
          "削除する"
        ),
      ]),
    ]),
  ]);
  container.appendChild(overlay);
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
              style: statusChipStyle(s, event.status === s),
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
