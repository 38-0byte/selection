// 現場登録・編集画面（1ページ入力）
import { el, icon, formatCurrency, toast } from "../utils.js";
import { createEvent, emptyCost, costTotal, allMembers, STATUS_LIST, PREFECTURES, statusChipStyle } from "../data.js";

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
  const isDuplicate = params.mode === "duplicate";
  const existing = isEdit ? data.events.find((e) => e.id === params.id) : null;
  const source = isDuplicate ? data.events.find((e) => e.id === params.sourceId) : null;

  const formState = existing
    ? {
        favoriteIds: [...(existing.favoriteIds || [])],
        mainFavoriteId: existing.mainFavoriteId || "",
        title: existing.title,
        category: existing.category,
        date: existing.date,
        startTime: existing.startTime || "",
        endTime: existing.endTime || "",
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
    : source
    ? {
        // 複製：ステータスは初期状態へ、実績費用は0円にリセット。それ以外は複製元の内容を引き継ぐ
        favoriteIds: [...(source.favoriteIds || [])],
        mainFavoriteId: source.mainFavoriteId || "",
        title: source.title,
        category: source.category,
        date: source.date,
        startTime: source.startTime || "",
        endTime: source.endTime || "",
        venue: source.venue,
        prefecture: source.prefecture,
        priority: source.priority,
        status: STATUS_LIST[0],
        applicationStart: source.applicationStart,
        applicationDeadline: source.applicationDeadline,
        resultDate: source.resultDate,
        paymentDeadline: source.paymentDeadline,
        plannedCost: cloneCost(source.plannedCost),
        actualCost: emptyCost(),
        memo: source.memo,
      }
    : {
        favoriteIds: [],
        mainFavoriteId: "",
        title: "",
        category: data.categories[0]?.name || "",
        date: "",
        startTime: "",
        endTime: "",
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

  const participantsWrap = el("div", { class: "chip-group" });
  const mainWrap = el("div", { class: "chip-group" });

  function paintParticipants() {
    participantsWrap.innerHTML = "";
    if (!members.length) {
      participantsWrap.appendChild(
        el("div", { class: "muted", style: "font-size:13px" }, "推しが登録されていません。設定画面から追加してください。")
      );
      return;
    }
    for (const { member, group } of members) {
      const selected = formState.favoriteIds.includes(member.id);
      participantsWrap.appendChild(
        el(
          "button",
          {
            class: `chip${selected ? " selected" : ""}`,
            onclick: () => {
              if (selected) {
                formState.favoriteIds = formState.favoriteIds.filter((id) => id !== member.id);
                if (formState.mainFavoriteId === member.id) {
                  formState.mainFavoriteId = formState.favoriteIds[0] || "";
                }
              } else {
                formState.favoriteIds = [...formState.favoriteIds, member.id];
                if (!formState.mainFavoriteId) formState.mainFavoriteId = member.id;
              }
              paintParticipants();
              paintMain();
            },
          },
          `${member.name}（${group.name}）`
        )
      );
    }
  }

  function paintMain() {
    mainWrap.innerHTML = "";
    if (!formState.favoriteIds.length) {
      mainWrap.appendChild(el("div", { class: "muted", style: "font-size:13px" }, "先に参加推しを選択してください"));
      return;
    }
    for (const id of formState.favoriteIds) {
      const found = members.find((m) => m.member.id === id);
      if (!found) continue;
      const isMain = formState.mainFavoriteId === id;
      mainWrap.appendChild(
        el(
          "button",
          {
            class: `chip${isMain ? " selected" : ""}`,
            onclick: () => {
              formState.mainFavoriteId = id;
              paintMain();
            },
          },
          isMain ? [icon("stars"), found.member.name] : [found.member.name]
        )
      );
    }
  }

  paintParticipants();
  paintMain();

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

  const startTimeInput = el("input", {
    type: "time",
    value: formState.startTime,
    oninput: (e) => (formState.startTime = e.target.value),
  });

  const endTimeInput = el("input", {
    type: "time",
    value: formState.endTime,
    oninput: (e) => (formState.endTime = e.target.value),
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
    el("div", { class: "field" }, [el("label", {}, "参加推し"), participantsWrap]),
    el("div", { class: "field" }, [el("label", {}, "メイン推し"), mainWrap]),
    field("現場名", titleInput),
    field("カテゴリー", categorySelect),
    field("日付", dateInput),
    el("div", { class: "field-row" }, [field("開演時間", startTimeInput), field("終演時間", endTimeInput)]),
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
          style: statusChipStyle(s, formState.status === s),
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
  if (!formState.favoriteIds.length) missing.push("参加推し");
  if (!formState.date) missing.push("日付");

  clearErrors(container);
  if (missing.length) {
    toast(`入力してください（${missing.join("・")}）`);
    highlightErrors(container, formState);
    return;
  }

  const year = formState.date ? Number(formState.date.slice(0, 4)) : new Date().getFullYear();

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
  if (!formState.favoriteIds.length) markError(container, "参加推し");
  if (!formState.date) markError(container, "日付");
}

function markError(container, labelText) {
  const labels = Array.from(container.querySelectorAll(".field label"));
  const target = labels.find((l) => l.textContent === labelText);
  if (target) {
    const input = target.parentElement.querySelector("input, select, .chip-group");
    if (input) input.classList.add("field-error");
  }
}
