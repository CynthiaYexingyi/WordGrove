/* 词林 · 基础 UI 工具 */
(function () {
  const CILIN = (window.CILIN = window.CILIN || {});
  const icons = {
    speaker: '<path d="M4 9.5h3.2L12 5.5v13L7.2 14.5H4z" stroke-linejoin="round"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" stroke-linecap="round"/>',
    play: '<path d="M8 5.5v13l10-6.5z" stroke-linejoin="round"/>',
    pause: '<path d="M8 5.5v13M16 5.5v13" stroke-linecap="round"/>',
    spark: '<path d="M12 3.5 13.8 10l6.2 2-6.2 2L12 20.5 10.2 14 4 12l6.2-2z" stroke-linejoin="round"/>',
    flame: '<path d="M12 21c4 0 6.5-2.6 6.5-6.2 0-3.6-3-5.4-4.4-8.8-.4 2.4-1.6 3.6-3 4.2.5-2.6-.6-5-2.1-6.6.2 4.5-3.5 6.4-3.5 10.9C5.5 18.2 8 21 12 21Z" stroke-linejoin="round"/>',
    leaf: '<path d="M12 21V10.5M12 10.5C12 6 15 3.5 20 3.5c0 5-2.6 8-8 8Z" stroke-linejoin="round"/><path d="M12 15c0-3.4-2.2-5.5-6-5.5 0 3.4 2 5.5 6 5.5Z" stroke-linejoin="round"/>',
    seed: '<path d="M12 21c-4-2.6-6-6-6-9.5C6 7.5 8.6 5 12 5s6 2.5 6 6.5C18 15 16 18.4 12 21Z" stroke-linejoin="round"/><path d="M12 8.5v8" stroke-linecap="round"/>',
    tree: '<path d="M12 21v-7m0 0c0-4 2.5-7 7-7 0 4-2 7-7 7Zm0 3.5c0-3.5-2.2-6-6-6 0 3.4 2 6 6 6Z" stroke-linejoin="round"/>',
    book: '<path d="M4 5.5c2.5-1 5-1 8 .5 3-1.5 5.5-1.5 8-.5V19c-2.5-1-5-1-8 .5-3-1.5-5.5-1.5-8-.5z" stroke-linejoin="round"/><path d="M12 6v13.5"/>',
    ring: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5"/>',
    pen: '<path d="m5 19 1.2-4.2L16.4 4.6a2 2 0 0 1 2.8 0l.2.2a2 2 0 0 1 0 2.8L9.2 17.8z" stroke-linejoin="round"/><path d="M14.5 6.5l3 3"/>',
    ear: '<path d="M8 9a4 4 0 0 1 8 0c0 2.5-2.2 3-2.2 5.2 0 1.6-1.2 2.8-2.8 2.8-1.6 0-2.8-1.1-3-2.5" stroke-linecap="round"/><path d="M10.5 9a1.6 1.6 0 1 1 2.6 1.3" stroke-linecap="round"/>',
    shadow: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" stroke="none" opacity=".55"/>',
    star: '<path d="m12 3.6 2.3 5.1 5.5.6-4.1 3.7 1.2 5.4L12 15.6 7.1 18.4l1.2-5.4L4.2 9.3l5.5-.6z" stroke-linejoin="round"/>',
    moon: '<path d="M20.5 14.3A8.5 8.5 0 1 1 9.7 3.5a7 7 0 1 0 10.8 10.8Z" stroke-linejoin="round"/>',
    river: '<path d="M3 8c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 3-2M3 14c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 3-2" stroke-linecap="round"/>',
    key: '<circle cx="8.5" cy="12" r="3.5"/><path d="M12 12h8m-3 0v3m-3-3v2" stroke-linecap="round"/>',
    arrow: '<path d="M4 12h15m-5-5 5 5-5 5" stroke-linecap="round" stroke-linejoin="round"/>',
    back: '<path d="M20 12H5m5-5-5 5 5 5" stroke-linecap="round" stroke-linejoin="round"/>',
    close: '<path d="m6 6 12 12M18 6 6 18" stroke-linecap="round"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5" stroke-linecap="round" stroke-linejoin="round"/>',
    x: '<path d="m6 6 12 12M18 6 6 18" stroke-linecap="round"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4" stroke-linecap="round" stroke-linejoin="round"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4" stroke-linecap="round"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke-linejoin="round"/><circle cx="12" cy="12" r="3"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2" stroke-linecap="round"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" stroke-linecap="round"/>',
    download: '<path d="M12 4v11m-4-4 4 4 4-4M5 20h14" stroke-linecap="round" stroke-linejoin="round"/>',
    upload: '<path d="M12 16V5m-4 4 4-4 4 4M5 20h14" stroke-linecap="round" stroke-linejoin="round"/>',
    plus: '<path d="M12 5v14M5 12h14" stroke-linecap="round"/>',
    minus: '<path d="M5 12h14" stroke-linecap="round"/>',
    chevron: '<path d="m9 6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/>',
    down: '<path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/>',
    wake: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" stroke-linecap="round"/><circle cx="12" cy="12" r="4"/>'
  };

  const ui = {};
  CILIN.ui = ui;

  ui.icon = function (name, size, cls) {
    size = size || 20;
    const p = icons[name] || icons.spark;
    return `<svg class="ic ${cls || ""}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" aria-hidden="true">${p}</svg>`;
  };
  ui.esc = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };
  ui.attr = function (s) {
    // 属性值用单引号包裹的 HTML，这里转义单引号与双引号
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };
  ui.$ = function (sel, root) { return (root || document).querySelector(sel); };
  ui.$$ = function (sel, root) { return Array.from((root || document).querySelectorAll(sel)); };
  ui.on = function (el, ev, fn) { if (el) el.addEventListener(ev, fn); };

  ui.pad = function (n) { return n < 10 ? "0" + n : String(n); };
  ui.todayKey = function (d) {
    d = d || new Date();
    return d.getFullYear() + "-" + ui.pad(d.getMonth() + 1) + "-" + ui.pad(d.getDate());
  };
  ui.parseKey = function (key) {
    const p = key.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2], 12, 0, 0);
  };
  ui.addDays = function (key, n) {
    const d = ui.parseKey(key);
    d.setDate(d.getDate() + n);
    return ui.todayKey(d);
  };
  ui.dayDiff = function (a, b) {
    return Math.round((ui.parseKey(a) - ui.parseKey(b)) / 86400000);
  };
  ui.weekCN = ["日", "一", "二", "三", "四", "五", "六"];
  ui.fmtDate = function (key) {
    const d = ui.parseKey(key);
    return (d.getMonth() + 1) + "月" + d.getDate() + "日 · 周" + ui.weekCN[d.getDay()];
  };
  ui.fmtDateShort = function (key) {
    const d = ui.parseKey(key);
    return (d.getMonth() + 1) + "/" + d.getDate();
  };
  ui.greeting = function () {
    const hh = new Date().getHours();
    if (hh < 5) return "深夜好";
    if (hh < 11) return "早上好";
    if (hh < 14) return "中午好";
    if (hh < 18) return "下午好";
    return "晚上好";
  };
  ui.hash = function (s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  ui.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  ui.shuffle = function (arr, seed) {
    const out = arr.slice();
    const rand = seed == null ? Math.random : ui.rng(seed);
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  };
  ui.sample = function (arr, n, seed) { return ui.shuffle(arr, seed).slice(0, n); };
  ui.clamp = function (n, a, b) { return Math.max(a, Math.min(b, n)); };
  ui.uniq = function (arr) { return Array.from(new Set(arr)); };

  ui.dayQuote = function (key) {
    const q = window.CILIN_META.quotes;
    return q[ui.hash(key) % q.length];
  };
  ui.reflection = function (key) {
    const r = window.CILIN_META.reflections;
    return r[ui.hash("r" + key) % r.length];
  };

  ui.audioBtn = function (text, opts) {
    opts = opts || {};
    return `<button class="audio-btn ${opts.cls || ""}" type="button" data-speak="${ui.attr(text)}" aria-label="朗读" title="朗读">${ui.icon("speaker", opts.size || 18)}${opts.label ? `<span>${ui.esc(opts.label)}</span>` : ""}</button>`;
  };

  ui.ring = function (pct, size, opts) {
    opts = opts || {};
    size = size || 64;
    pct = ui.clamp(pct || 0, 0, 100);
    const r = (size - 6) / 2, c = 2 * Math.PI * r;
    const off = c * (1 - pct / 100);
    return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bg" stroke-width="2"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fg" stroke-width="2"
        stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
        transform="rotate(-90 ${size / 2} ${size / 2})"/>
      ${opts.label != null ? `<text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" class="ring-label">${ui.esc(opts.label)}</text>` : ""}
    </svg>`;
  };

  ui.progress = function (pct, cls) {
    return `<div class="bar ${cls || ""}"><i style="width:${ui.clamp(pct, 0, 100)}%"></i></div>`;
  };

  ui.heatmap = function (days, weeks) {
    weeks = weeks || 14;
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
    const start = new Date(end); start.setDate(start.getDate() - (weeks * 7 - 1));
    // 对齐到周日
    start.setDate(start.getDate() - start.getDay());
    const cells = [];
    let max = 1;
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const key = ui.todayKey(d);
      if (ui.parseKey(key) > end) { cells.push(null); continue; }
      const rec = days[key];
      const n = rec ? (rec.words || 0) + (rec.correct || 0) * 0.5 : 0;
      max = Math.max(max, n);
      cells.push({ key, n, rec, future: false });
    }
    let html = '<div class="heat" role="img" aria-label="最近学习热力图">';
    const cols = [];
    for (let w = 0; w < weeks; w++) {
      cols.push(cells.slice(w * 7, w * 7 + 7));
    }
    html += '<div class="heat-cols">';
    cols.forEach(function (col) {
      html += '<div class="heat-col">';
      col.forEach(function (c) {
        if (!c) { html += '<i class="heat-cell empty"></i>'; return; }
        const lv = c.n === 0 ? 0 : ui.clamp(Math.ceil((c.n / max) * 4), 1, 4);
        html += `<i class="heat-cell l${lv}" title="${c.key} · ${Math.round(c.n)} 次" data-heat="${c.key}"></i>`;
      });
      html += "</div>";
    });
    html += "</div></div>";
    return html;
  };

  /* toast */
  ui.toast = function (msg, sub) {
    const box = document.getElementById("toast");
    if (!box) return;
    const t = document.createElement("div");
    t.className = "toast-item";
    t.innerHTML = `<b>${ui.esc(msg)}</b>${sub ? `<span>${ui.esc(sub)}</span>` : ""}`;
    box.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("show"); });
    setTimeout(function () {
      t.classList.remove("show");
      setTimeout(function () { t.remove(); }, 320);
    }, 2600);
  };

  /* overlay / sheet */
  /* 会话型遮罩：先解除 initial hidden，再锁滚动 */
  ui.activateOverlay = function () {
    const ov = document.getElementById("overlay");
    if (!ov) return null;
    ov.classList.remove("hidden");
    ov.classList.remove("closing");
    ov.onclick = null;            // 会话内不响应“点外部关闭”
    document.body.classList.add("no-scroll");
    return ov;
  };

  ui.openSheet = function (html, opts) {    opts = opts || {};
    const ov = document.getElementById("overlay");
    ov.className = "overlay" + (opts.session ? " overlay-session" : "");
    ov.innerHTML = `<div class="sheet ${opts.cls || ""}" role="dialog" aria-modal="true">${html}</div>`;
    ov.classList.remove("hidden");
    document.body.classList.add("no-scroll");
    ov.onclick = function (e) {
      if (e.target === ov && opts.dismissible !== false) ui.closeSheet();
    };
    ui._sheetDismiss = opts.dismissible !== false;
    ui._sheetClose = opts.onClose || null;
    if (opts.focus !== false) {
      const first = ov.querySelector("[data-autofocus]") || ov.querySelector(".sheet");
      setTimeout(function () { try { first.focus(); } catch (e) {} }, 30);
    }
    return ov;
  };
  ui.closeSheet = function () {
    const ov = document.getElementById("overlay");
    if (!ov) return;
    const onClose = ui._sheetClose;
    ov.classList.add("closing");
    setTimeout(function () {
      ov.className = "overlay hidden";
      ov.innerHTML = "";
      document.body.classList.remove("no-scroll");
      ui._sheetClose = null;
      if (onClose) onClose();
    }, 180);
  };
  ui.confirmSheet = function (title, body, okText) {
    return new Promise(function (resolve) {
      ui.openSheet(`
        <div class="sheet-head"><h3>${ui.esc(title)}</h3><button class="icon-btn" data-close aria-label="关闭">${ui.icon("close", 18)}</button></div>
        <div class="sheet-body"><p class="muted">${ui.esc(body)}</p></div>
        <div class="sheet-foot">
          <button class="btn btn-ghost" data-cancel>取消</button>
          <button class="btn btn-primary" data-ok>${ui.esc(okText || "确定")}</button>
        </div>`);
      const ov = document.getElementById("overlay");
      ov.querySelectorAll("[data-close],[data-cancel]").forEach(function (b) {
        b.onclick = function () { ui.closeSheet(); resolve(false); };
      });
      ov.querySelector("[data-ok]").onclick = function () { ui.closeSheet(); resolve(true); };
    });
  };

  ui.empty = function (icon, title, desc, actionHtml) {
    return `<div class="empty">
      <span class="empty-ic">${ui.icon(icon, 28)}</span>
      <h4>${ui.esc(title)}</h4>
      <p>${ui.esc(desc)}</p>
      ${actionHtml || ""}
    </div>`;
  };

  ui.secTitle = function (eyebrow, title, right) {
    return `<div class="sec-title"><div><span class="eyebrow">${ui.esc(eyebrow)}</span><h2>${title}</h2></div>${right || ""}</div>`;
  };

  ui.pill = function (text, cls) { return `<span class="pill ${cls || ""}">${text}</span>`; };

  // 自定义词的自编例句：留空即不渲染；词卡 / 闪卡 / 影子共用
  ui.ownExHTML = function (w) {
    const o = w && w.ownEx;
    if (!o || !o.en) return "";
    return `<div class="word-sec"><div class="ws-label">我的例句</div>
        <div class="ws-en">${ui.esc(o.en)}</div>
        ${o.zh ? `<div class="ws-zh">${ui.esc(o.zh)}</div>` : ""}
        <div class="ws-src">${ui.icon("pen", 12)} 自己写的
          <button class="audio-btn" data-speak="${ui.attr(o.en)}" aria-label="朗读我的例句">${ui.icon("speaker", 14)}</button>
        </div>
      </div>`;
  };

  ui.sensesHTML = function (w) {
    // 自定义词按义项分行；正式词库仍用整理过的 zh 整行，避免回退到 PDF 原始粘连释义
    if (w.custom && w.senses && w.senses.length) {
      return w.senses.map(function (s) {
        return `<div><span class="pos">${ui.esc(s.pos || "")}</span>${ui.esc(s.def || "")}</div>`;
      }).join("");
    }
    if (w.zh) return `<div class="zh-line">${ui.esc(w.zh)}</div>`;
    return (w.senses || []).map(function (s) {
      return `<div><span class="pos">${ui.esc(s.pos || "")}</span>${ui.esc(s.def || "")}</div>`;
    }).join("");
  };

  ui.wordState = function (w) {
    const meta = window.CILIN.store ? window.CILIN.store.stateOf(w.w) : null;
    if (!meta || !meta.seen) return { label: "未见", cls: "ghost" };
    if (meta.box >= 4) return { label: "已结果", cls: "gold" };
    if (meta.box >= 2) return { label: "抽枝", cls: "moss" };
    return { label: "发芽", cls: "moss" };
  };

  ui.fullscreenLoader = null;
})();
