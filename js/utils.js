// 汎用ユーティリティ（日付整形・DOM生成・アニメーション等）

const DOW_JP = ["日", "月", "火", "水", "木", "金", "土"];

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function parseDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function formatDate(dateStr, withDow = true) {
  const d = parseDate(dateStr);
  if (!d) return "";
  const base = `${d.getMonth() + 1}/${d.getDate()}`;
  return withDow ? `${base}(${DOW_JP[d.getDay()]})` : base;
}

export function formatDateLong(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return "";
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${DOW_JP[d.getDay()]})`;
}

export function daysUntil(dateStr) {
  const target = parseDate(dateStr);
  if (!target) return null;
  const today = parseDate(todayStr());
  const diffMs = target.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
  return Math.round(diffMs / 86400000);
}

export function formatCurrency(num) {
  const n = Number(num) || 0;
  return `${n.toLocaleString("ja-JP")}円`;
}

export function starString(priority) {
  const p = Math.max(0, Math.min(5, Number(priority) || 0));
  return "★".repeat(p) + "☆".repeat(5 - p);
}

export function starHtml(priority) {
  const p = Math.max(0, Math.min(5, Number(priority) || 0));
  let out = "";
  for (let i = 0; i < 5; i++) {
    out += i < p ? "★" : '<span class="empty">☆</span>';
  }
  return out;
}

// --- DOM helper ---
// el('div', {class:'card', onclick: fn}, ['text', childEl])
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "html") node.innerHTML = value;
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key in node && key !== "list") {
      try {
        node[key] = value;
      } catch (e) {
        node.setAttribute(key, value);
      }
    } else {
      node.setAttribute(key, value);
    }
  }
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child === null || child === undefined || child === false) continue;
    if (typeof child === "string" || typeof child === "number") {
      node.appendChild(document.createTextNode(child));
    } else {
      node.appendChild(child);
    }
  }
  return node;
}

export function icon(name, extraClass = "") {
  return el("span", { class: `material-symbols-outlined ${extraClass}`.trim() }, name);
}

export function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function debounce(fn, wait = 250) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// 数値カウントアップ演出
export function animateCount(node, target, opts = {}) {
  const duration = opts.duration ?? 550;
  const suffix = opts.suffix ?? "";
  const start = 0;
  const startTime = performance.now();
  function tick(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(start + (target - start) * eased);
    node.textContent = value.toLocaleString("ja-JP") + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export function toast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const node = el("div", { class: "toast" }, message);
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 2200);
}
