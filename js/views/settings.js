// 設定画面：推し管理・カテゴリー管理・年間予算・データ管理
import { el, icon, toast, formatCurrency } from "../utils.js";
import { generateId, ACCENT_PALETTE } from "../data.js";
import { exportBackup, readBackupFile, mergeData, saveData } from "../storage.js";

// 予算設定セクション専用の対象年（他画面の年状態とは独立）
const budgetState = { year: new Date().getFullYear() };

export function render(container, ctx) {
  container.appendChild(el("div", { class: "page-title" }, "設定"));
  container.appendChild(renderFavoritesSection(ctx, container));
  container.appendChild(renderCategoriesSection(ctx, container));
  container.appendChild(renderBudgetSection(ctx));
  container.appendChild(renderDataSection(ctx, container));
}

function confirmModal(container, message, onConfirm) {
  const overlay = el("div", { class: "modal-overlay", onclick: (e) => { if (e.target === e.currentTarget) overlay.remove(); } }, [
    el("div", { class: "modal-box" }, [
      el("h3", {}, "確認"),
      el("p", {}, message),
      el("div", { class: "btn-row" }, [
        el("button", { class: "btn btn-secondary", onclick: () => overlay.remove() }, "キャンセル"),
        el("button", { class: "btn btn-danger", onclick: () => { overlay.remove(); onConfirm(); } }, "削除する"),
      ]),
    ]),
  ]);
  container.appendChild(overlay);
}

function promptModal(container, title, fields, onSubmit) {
  const values = {};
  const inputs = fields.map((f) => {
    values[f.key] = f.value || "";
    let input;
    if (f.type === "color") {
      input = el("input", {
        type: "color",
        value: f.value || ACCENT_PALETTE[0],
        style: "width:100%; height:44px; border:none; border-radius:var(--radius-md); background:var(--color-bg-elevated);",
        oninput: (e) => (values[f.key] = e.target.value),
      });
    } else {
      input = el("input", {
        type: "text",
        placeholder: f.placeholder || "",
        value: f.value || "",
        oninput: (e) => (values[f.key] = e.target.value),
      });
    }
    return el("div", { class: "field" }, [el("label", {}, f.label), input]);
  });

  const overlay = el("div", { class: "modal-overlay", onclick: (e) => { if (e.target === e.currentTarget) overlay.remove(); } }, [
    el("div", { class: "modal-box" }, [
      el("h3", {}, title),
      ...inputs,
      el("div", { class: "btn-row" }, [
        el("button", { class: "btn btn-secondary", onclick: () => overlay.remove() }, "キャンセル"),
        el("button", { class: "btn btn-primary", onclick: () => { overlay.remove(); onSubmit(values); } }, "保存"),
      ]),
    ]),
  ]);
  container.appendChild(overlay);
}

function renderFavoritesSection(ctx, root) {
  const card = el("div", { class: "card" }, [el("div", { class: "section-label", style: "margin-top:0" }, "推し・グループ管理")]);

  for (const group of ctx.data.favorites) {
    const block = el("div", { class: "group-block" }, [
      el("div", { class: "group-head" }, [
        el("span", { class: "color-dot", style: `background:${group.color}` }),
        el("span", { style: "flex:1" }, group.name),
        el("button", { class: "icon-btn", style: "width:32px;height:32px", onclick: () => editGroup(ctx, root, group) }, icon("edit", "")),
        el("button", { class: "icon-btn", style: "width:32px;height:32px", onclick: () => deleteGroup(ctx, root, group) }, icon("delete", "")),
      ]),
    ]);

    for (const member of group.members || []) {
      block.appendChild(
        el("div", { class: "member-row" }, [
          el("span", { class: "color-dot", style: `background:${member.color}` }),
          el("span", { class: "name" }, member.name),
          el("button", { class: "icon-btn", style: "width:32px;height:32px", onclick: () => editMember(ctx, root, group, member) }, icon("edit", "")),
          el("button", { class: "icon-btn", style: "width:32px;height:32px", onclick: () => deleteMember(ctx, root, group, member) }, icon("delete", "")),
        ])
      );
    }

    block.appendChild(
      el("button", { class: "add-row-btn", style: "margin-top:6px", onclick: () => addMember(ctx, root, group) }, "＋ メンバーを追加")
    );

    card.appendChild(block);
  }

  card.appendChild(el("button", { class: "btn btn-secondary", onclick: () => addGroup(ctx, root) }, "＋ グループを追加"));
  return card;
}

function addGroup(ctx, root) {
  promptModal(root, "グループを追加", [
    { key: "name", label: "グループ名", placeholder: "例：Number_i" },
    { key: "color", label: "カラー", type: "color", value: ACCENT_PALETTE[Math.floor(Math.random() * ACCENT_PALETTE.length)] },
  ], (values) => {
    if (!values.name.trim()) return;
    ctx.data.favorites.push({ id: generateId("group"), name: values.name.trim(), color: values.color, members: [] });
    ctx.save();
    toast("グループを追加しました");
    ctx.refresh();
  });
}

function editGroup(ctx, root, group) {
  promptModal(root, "グループを編集", [
    { key: "name", label: "グループ名", value: group.name },
    { key: "color", label: "カラー", type: "color", value: group.color },
  ], (values) => {
    group.name = values.name.trim() || group.name;
    group.color = values.color;
    ctx.save();
    ctx.refresh();
  });
}

function deleteGroup(ctx, root, group) {
  confirmModal(root, `「${group.name}」を削除しますか？\n所属する推しも削除されます。`, () => {
    ctx.data.favorites = ctx.data.favorites.filter((g) => g.id !== group.id);
    ctx.save();
    toast("削除しました");
    ctx.refresh();
  });
}

function addMember(ctx, root, group) {
  promptModal(root, "推しを追加", [
    { key: "name", label: "推し名", placeholder: "例：平野紫耀" },
    { key: "color", label: "カラー", type: "color", value: group.color },
  ], (values) => {
    if (!values.name.trim()) return;
    group.members = group.members || [];
    group.members.push({ id: generateId("member"), name: values.name.trim(), color: values.color });
    ctx.save();
    toast("推しを追加しました");
    ctx.refresh();
  });
}

function editMember(ctx, root, group, member) {
  promptModal(root, "推しを編集", [
    { key: "name", label: "推し名", value: member.name },
    { key: "color", label: "カラー", type: "color", value: member.color },
  ], (values) => {
    member.name = values.name.trim() || member.name;
    member.color = values.color;
    ctx.save();
    ctx.refresh();
  });
}

function deleteMember(ctx, root, group, member) {
  confirmModal(root, `「${member.name}」を削除しますか？`, () => {
    group.members = (group.members || []).filter((m) => m.id !== member.id);
    ctx.save();
    toast("削除しました");
    ctx.refresh();
  });
}

function renderCategoriesSection(ctx, root) {
  const card = el("div", { class: "card" }, [el("div", { class: "section-label", style: "margin-top:0" }, "カテゴリー管理")]);
  const chipGroup = el("div", { class: "chip-group" });

  for (const category of ctx.data.categories) {
    chipGroup.appendChild(
      el("span", { class: "chip", style: "display:flex; align-items:center; gap:6px" }, [
        category.name,
        el(
          "button",
          {
            style: "background:none;border:none;color:var(--color-text-sub);display:flex;",
            onclick: () =>
              confirmModal(root, `カテゴリー「${category.name}」を削除しますか？`, () => {
                ctx.data.categories = ctx.data.categories.filter((c) => c.id !== category.id);
                ctx.save();
                ctx.refresh();
              }),
          },
          icon("close")
        ),
      ])
    );
  }
  card.appendChild(chipGroup);

  const newCatInput = el("input", { type: "text", placeholder: "新しいカテゴリー名" });
  card.appendChild(
    el("div", { class: "field-row" }, [
      el("div", { class: "field", style: "margin-bottom:0; flex:1" }, newCatInput),
      el(
        "button",
        {
          class: "btn btn-primary btn-sm",
          onclick: () => {
            const name = newCatInput.value.trim();
            if (!name) return;
            ctx.data.categories.push({ id: generateId("category"), name });
            ctx.save();
            newCatInput.value = "";
            toast("カテゴリーを追加しました");
            ctx.refresh();
          },
        },
        "追加"
      ),
    ])
  );

  return card;
}

function renderBudgetSection(ctx) {
  const year = budgetState.year;
  const current = ctx.data.settings.annualBudgets[year] || 0;

  const input = el("input", { type: "number", min: "0", value: current || "" });
  return el("div", { class: "card" }, [
    el("div", { class: "section-label", style: "margin-top:0" }, "年間予算設定"),
    el("div", { class: "year-switch", style: "margin:4px 0 14px" }, [
      el("button", { onclick: () => { budgetState.year -= 1; ctx.refresh(); } }, icon("chevron_left")),
      el("div", { class: "year-label", style: "font-size:16px" }, `${year}年`),
      el("button", { onclick: () => { budgetState.year += 1; ctx.refresh(); } }, icon("chevron_right")),
    ]),
    el("div", { class: "field-row" }, [
      el("div", { class: "field", style: "margin-bottom:0; flex:1" }, input),
      el(
        "button",
        {
          class: "btn btn-primary btn-sm",
          onclick: () => {
            ctx.data.settings.annualBudgets[year] = Number(input.value) || 0;
            ctx.save();
            toast(`${year}年の予算を${formatCurrency(Number(input.value) || 0)}に設定しました`);
            ctx.refresh();
          },
        },
        "保存"
      ),
    ]),
  ]);
}

function renderDataSection(ctx, root) {
  const fileInput = el("input", { type: "file", accept: "application/json", style: "display:none" });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      const incoming = await readBackupFile(file);
      askImportMode(root, (mode) => {
        const merged = mergeData(ctx.data, incoming, mode);
        Object.assign(ctx.data, merged);
        saveData(ctx.data);
        toast(mode === "replace" ? "データを置換しました" : "データを追加しました");
        ctx.refresh();
      });
    } catch (e) {
      toast("バックアップデータを読み込めませんでした");
    }
    fileInput.value = "";
  });

  return el("div", { class: "card" }, [
    el("div", { class: "section-label", style: "margin-top:0" }, "データ管理"),
    el("div", { class: "btn-row", style: "margin-top:0" }, [
      el(
        "button",
        {
          class: "btn btn-secondary",
          onclick: () => exportBackup(ctx.data, new Date().getFullYear()),
        },
        [icon("file_download"), "JSON書き出し"]
      ),
      el("button", { class: "btn btn-secondary", onclick: () => fileInput.click() }, [icon("file_upload"), "JSON読み込み"]),
    ]),
    fileInput,
  ]);
}

function askImportMode(root, onChoose) {
  const overlay = el("div", { class: "modal-overlay" }, [
    el("div", { class: "modal-box" }, [
      el("h3", {}, "バックアップデータの読み込み"),
      el("p", {}, "バックアップデータを読み込みます。\n現在のデータに追加しますか？\nそれとも置換しますか？"),
      el("div", { class: "btn-row" }, [
        el("button", { class: "btn btn-secondary", onclick: () => { overlay.remove(); onChoose("append"); } }, "追加"),
        el("button", { class: "btn btn-danger", onclick: () => { overlay.remove(); onChoose("replace"); } }, "置換"),
      ]),
      el("button", { class: "btn btn-ghost", style: "margin-top:6px", onclick: () => overlay.remove() }, "キャンセル"),
    ]),
  ]);
  root.appendChild(overlay);
}
