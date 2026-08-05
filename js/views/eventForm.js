// 現場登録・編集画面（1ページ入力）
import { el, icon, formatCurrency, toast } from "../utils.js";
import { createEvent, emptyCost, costTotal, allMembers, findGroup, STATUS_LIST, PREFECTURES } from "../data.js";

function cloneCost(cost) {
  return {
    ticket: cost?.ticket || 0,
    transportation: cost?.transportation || 0,
    hotel: cost?.hotel || 0,
    goods: cost?.goods || 0,
    others: (cost?.others || []).map((o) => ({ name: o.name, price: o.price })),
  };
}

export function render(container, ctx, params) {
  const data = ctx.data;
  const isEdit = params.mode === "edit";
  const existing = isEdit ? data.events.find((e) => e.id === params.id) : null;

  const formState = existing
    ? {
        favoriteId: existing.favoriteId,
        groupId: existing.groupId,
        title: existing.title,
        category: existing.category,
        date: existing.date,
        venue: existing.venue,
        prefecture: existing.prefecture,
        priority: existing.priority,
        status: existing.status,
        applicationStart: existing.applicationStart,
        applicationDeadline: existing.applicationDeadline,
        resultDate: existing.resultDate,
        paymentDeadline: existing.paymentDeadline,
        plannedCost: cloneCost(existing.plannedCost),
        actualCost: cloneCost(existing.actualCost),
        memo: existing.memo,
      }
    : {
        favoriteId: "",
        groupId: "",
        title: "",
        category: data.categories[0]?.name || "",
        date: "",
        venue: "",
        prefecture: "",
        priority: 3,
        status: STATUS_LIST[0],
        applicationStart: "",
        applicationDeadline: "",
        resultDate: "",
        paymentDeadline: "",
        plannedCost: emptyCost(),
        actualCost: emptyCost(),
        memo: "",
      };

  const errors = {};

  container.appendChild(buildBasicSection(ctx, formState, errors));
  container.appendChild(buildPrioritySection(formState));
  container.appendChild(buildStatusSection(formState));
  container.appendChild(buildCostSection("予定費用", formState.plannedCost));
  container.appendChild(buildCostSection("実績費用", formState.actualCost));
  container.appendChild(buildDeadlineSection(formState));
  container.appendChild(buildMemoSection(formState));

  const saveBtn = el(
    "button",
    {
      class: "btn btn-primary",
      onclick: () => handleSave(ctx, formState, isEdit, existing, container),
    },
    isEdit ? "更新する" : "登録する"
  );
  container.appendChild(el("div", { style: "margin-top:8px" }, saveBtn));
  container.appendChild(el("div", { style: "height:20px" }));
}

function field(labelText, inputNode, id) {
  const label = el("label", { for: id }, labelText);
  return el("div", { class: "field", id: id ? `${id}-field` : undefined }, [label, inputNode]);
}

function buildBasicSection(ctx, formState, errors) {
  const data = ctx.data;
  const members = allMembers(data);

  const favoriteSelect = el(
    "select",
    {
      onchange: (e) => {
        formState.favoriteId = e.target.value;
        const found = members.find((m) => m.member.id === e.target.value);
        formState.groupId = found ? found.group.id : "";
        groupText.textContent = found ? found.group.name : "未選択";
      },
    },
    [
      el("option", { value: "", selected: !formState.favoriteId }, "選択してください"),
      ...members.map((m) =>
        el("option", { value: m.member.id, selected: m.member.id === formState.favoriteId }, m.member.name)
      ),
    ]
  );

  const currentGroup = findGroup(data, formState.groupId);
  const groupText = el("div", { class: "muted", style: "padding:13px 14px; background:var(--color-bg-elevated); border-radius:var(--radius-md); border:1px solid var(--color-border);" }, currentGroup?.name || "未選択");

  const titleInput = el("input", {
    type: "text",
    placeholder: "例：Number_i LIVE TOUR",
    value: formState.title,
    oninput: (e) => (formState.title = e.target.value),
  });

  const categorySelect = el(
    "select",
    { onchange: (e) => (formState.category = e.target.value) },
    data.categories.map((c) => el("option", { value: c.name, selected: c.name === formState.category }, c.name))
  );

  const dateInput = el("input", {
    type: "date",
    value: formState.date,
    oninput: (e) => (formState.date = e.target.value),
  });

  const venueInput = el("input", {
    type: "text",
    placeholder: "例：大阪城ホール",
    value: formState.venue,
    oninput: (e) => (formState.venue = e.target.value),
  });

  const prefSelect = el(
    "select",
    { onchange: (e) => (formState.prefecture = e.target.value) },
    [
      el("option", { value: "", selected: !formState.prefecture }, "選択してください"),
      ...PREFECTURES.map((p) => el("option", { value: p, selected: p === formState.prefecture }, p)),
    ]
  );

  return el("div", { class: "form-section" }, [
    el("div", { class: "section-label", style: "margin-top:0" }, "基本情報"),
    field("推し", favoriteSelect),
    field("グループ", groupText),
    field("現場名", titleInput),
    field("カテゴリー", categorySelect),
    field("日付", dateInput),
    field("会場", venueInput),
    field("都道府県", prefSelect),
  ]);
}

function buildPrioritySection(formState) {
  const wrap = el("div", { class: "star-picker" });
  function paint() {
    wrap.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
      const star = el("span", {
        class: `star${i <= formState.priority ? " filled" : ""}`,
        onclick: () => {
          formState.priority = i;
          paint();
        },
      }, i <= formState.priority ? "★" : "☆");
      wrap.appendChild(star);
    }
  }
  paint();
  return el("div", { class: "form-section" }, [el("div", { class: "section-label", style: "margin-top:0" }, "優先度"), wrap]);
}

function buildStatusSection(formState) {
  const wrap = el("div", { class: "status-chip-list" });
  function paint() {
    wrap.innerHTML = "";
    for (const s of STATUS_LIST) {
      const chip = el(
        "button",
        {
          class: `status-chip${formState.status === s ? " selected" : ""}`,
          onclick: () => {
            formState.status = s;
            paint();
          },
        },
        s
      );
      wrap.appendChild(chip);
    }
  }
  paint();
  return el("div", { class: "form-section" }, [el("div", { class: "section-label", style: "margin-top:0" }, "ステータス"), wrap]);
}

function buildCostSection(label, costObj) {
  const fields = [
    { key: "ticket", label: "チケット" },
    { key: "transportation", label: "交通費" },
    { key: "hotel", label: "ホテル" },
    { key: "goods", label: "グッズ" },
  ];

  const totalDisplay = el("div", { class: "stat-line" }, [
    el("span", { class: "label" }, "合計"),
    el("span", { class: "value total-value" }, formatCurrency(costTotal(costObj))),
  ]);

  function updateTotal() {
    totalDisplay.querySelector(".total-value").textContent = formatCurrency(costTotal(costObj));
  }

  const grid = el("div", { class: "cost-grid" });

  for (const f of fields) {
    const input = el("input", {
      type: "number",
      min: "0",
      placeholder: "0",
      value: costObj[f.key] || "",
      oninput: (e) => {
        costObj[f.key] = Number(e.target.value) || 0;
        updateTotal();
      },
    });
    grid.appendChild(el("div", { class: "cost-input-row" }, [el("span", { class: "cost-label" }, f.label), input]));
  }

  const othersWrap = el("div", { class: "cost-grid", style: "margin-top:8px" });

  function paintOthers() {
    othersWrap.innerHTML = "";
    costObj.others.forEach((other, idx) => {
      const nameInput = el("input", {
        type: "text",
        placeholder: "項目名",
        value: other.name,
        oninput: (e) => (other.name = e.target.value),
      });
      const priceInput = el("input", {
        type: "number",
        min: "0",
        placeholder: "金額",
        value: other.price || "",
        oninput: (e) => {
          other.price = Number(e.target.value) || 0;
          updateTotal();
        },
      });
      const removeBtn = el(
        "button",
        {
          class: "remove-row-btn",
          onclick: () => {
            costObj.others.splice(idx, 1);
            paintOthers();
            updateTotal();
          },
        },
        icon("close")
      );
      othersWrap.appendChild(el("div", { class: "cost-other-row" }, [nameInput, priceInput, removeBtn]));
    });
  }
  paintOthers();

  const addBtn = el(
    "button",
    {
      class: "add-row-btn",
      onclick: () => {
        costObj.others.push({ name: "", price: 0 });
        paintOthers();
      },
    },
    "＋ その他費用を追加"
  );

  return el("div", { class: "form-section" }, [
    el("div", { class: "section-label", style: "margin-top:0" }, label),
    grid,
    othersWrap,
    addBtn,
    totalDisplay,
  ]);
}

function buildDeadlineSection(formState) {
  const startInput = el("input", { type: "date", value: formState.applicationStart, oninput: (e) => (formState.applicationStart = e.target.value) });
  const deadlineInput = el("input", { type: "date", value: formState.applicationDeadline, oninput: (e) => (formState.applicationDeadline = e.target.value) });
  const resultInput = el("input", { type: "date", value: formState.resultDate, oninput: (e) => (formState.resultDate = e.target.value) });
  const paymentInput = el("input", { type: "date", value: formState.paymentDeadline, oninput: (e) => (formState.paymentDeadline = e.target.value) });

  return el("div", { class: "form-section" }, [
    el("div", { class: "section-label", style: "margin-top:0" }, "応募・期限情報"),
    field("応募開始日", startInput),
    field("応募締切", deadlineInput),
    field("当落日", resultInput),
    field("入金締切", paymentInput),
  ]);
}

function buildMemoSection(formState) {
  const textarea = el("textarea", {
    placeholder: "自由メモ",
    oninput: (e) => (formState.memo = e.target.value),
  });
  textarea.value = formState.memo || "";
  return el("div", { class: "form-section" }, [el("div", { class: "section-label", style: "margin-top:0" }, "メモ"), el("div", { class: "field" }, textarea)]);
}

function handleSave(ctx, formState, isEdit, existing, container) {
  const missing = [];
  if (!formState.title.trim()) missing.push("現場名");
  if (!formState.favoriteId) missing.push("推し");
  if (!formState.date) missing.push("日付");

  clearErrors(container);
  if (missing.length) {
    toast(`入力してください（${missing.join("・")}）`);
    highlightErrors(container, formState);
    return;
  }

  const year = formState.date ? Number(formState.date.slice(0, 4)) : ctx.data.settings.currentYear;

  if (isEdit && existing) {
    Object.assign(existing, formState, { year });
    ctx.save();
    toast("更新しました");
    ctx.replace("eventDetail", { id: existing.id });
  } else {
    const event = createEvent({ ...formState, year });
    ctx.data.events.push(event);
    ctx.save();
    toast("登録しました");
    ctx.replace("eventDetail", { id: event.id });
  }
}

function clearErrors(container) {
  container.querySelectorAll(".field-error").forEach((n) => n.classList.remove("field-error"));
}

function highlightErrors(container, formState) {
  if (!formState.title.trim()) markError(container, "現場名");
  if (!formState.favoriteId) markError(container, "推し");
  if (!formState.date) markError(container, "日付");
}

function markError(container, labelText) {
  const labels = Array.from(container.querySelectorAll(".field label"));
  const target = labels.find((l) => l.textContent === labelText);
  if (target) {
    const input = target.parentElement.querySelector("input, select");
    if (input) input.classList.add("field-error");
  }
}
