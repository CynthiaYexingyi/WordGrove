/* 词林 · 应用入口与路由 */
(function () {
  const CILIN = (window.CILIN = window.CILIN || {});
  const ui = CILIN.ui;

  CILIN.errors = [];
  window.addEventListener("error", function (e) {
    CILIN.errors.push(String(e.message || e.error || "unknown"));
  });
  window.addEventListener("unhandledrejection", function (e) {
    CILIN.errors.push("promise: " + String(e.reason));
  });

  function buildIndexes() {
    CILIN.words = Array.isArray(window.CILIN_WORDS) ? window.CILIN_WORDS : [];
    CILIN.units = Array.isArray(window.CILIN_UNITS) ? window.CILIN_UNITS : [];
    CILIN.questions = window.CILIN_QUESTIONS || {};
    CILIN.sentZh = window.CILIN_SENT_ZH || {};
    CILIN.wordMap = {};
    CILIN.words.forEach(function (w) { CILIN.wordMap[w.w] = w; });
    CILIN.coreWords = CILIN.words.filter(function (w) { return w.core; });
    CILIN.cet4Words = CILIN.words.filter(function (w) { return w.level !== "cet6"; });
    CILIN.cet6Words = CILIN.words.filter(function (w) { return w.level === "cet6"; });
    CILIN.bookWords = CILIN.words.filter(function (w) { return w.ex; });
    CILIN.textMap = {};
    CILIN.unitMap = {};
    CILIN.textWords = {};
    CILIN.unitWords = {};
    CILIN.units.forEach(function (u) {
      CILIN.unitMap[u.id] = u;
      CILIN.unitWords[u.id] = [];
      u.texts.forEach(function (t) {
        CILIN.textMap[t.id] = t;
        t.unit = u.id;
        CILIN.textWords[t.id] = [];
      });
    });
    CILIN.words.forEach(function (w) {
      if (w.ex) {
        (CILIN.unitWords[w.ex.unit] = CILIN.unitWords[w.ex.unit] || []).push(w);
        (CILIN.textWords[w.ex.textId] = CILIN.textWords[w.ex.textId] || []).push(w);
      }
    });
  }

  const ROUTES = ["today", "grove", "read", "train", "shadow", "journey"];

  const IRREG = {
    children: "child", men: "man", women: "woman", people: "person", feet: "foot", teeth: "tooth",
    mice: "mouse", geese: "goose", lives: "life", leaves: "leaf", knives: "knife", wives: "wife",
    went: "go", gone: "go", was: "be", were: "be", been: "be", being: "be", had: "have",
    did: "do", done: "do", said: "say", made: "make", took: "take", taken: "take", came: "come",
    knew: "know", known: "know", saw: "see", seen: "see", got: "get", gotten: "get",
    gave: "give", given: "give", thought: "think", brought: "bring", bought: "buy",
    caught: "catch", taught: "teach", told: "tell", sold: "sell", sent: "send",
    spent: "spend", stood: "stand", won: "win", wrote: "write", written: "write",
    spoke: "speak", spoken: "speak", grew: "grow", grown: "grow", held: "hold",
    kept: "keep", left: "leave", lost: "lose", meant: "mean", met: "meet", paid: "pay",
    ran: "run", rose: "rise", risen: "rise", built: "build", fed: "feed", felt: "feel",
    heard: "hear", hid: "hide", hidden: "hide", led: "lead", learnt: "learn",
    slept: "sleep", drew: "draw", drawn: "draw", drove: "drive", driven: "drive",
    ate: "eat", eaten: "eat", fell: "fall", fallen: "fall", forgot: "forget",
    forgotten: "forget", froze: "freeze", frozen: "freeze", lay: "lie", lain: "lie",
    rode: "ride", ridden: "ride", rang: "ring", rung: "ring", sought: "seek",
    shook: "shake", shaken: "shake", shot: "shoot", sang: "sing", sung: "sing",
    sat: "sit", stole: "steal", stolen: "steal", struck: "strike", swam: "swim",
    swum: "swim", threw: "throw", thrown: "throw", understood: "understand",
    woke: "wake", woken: "wake", wore: "wear", worn: "wear", found: "find"
  };
  const VOWELS = "aeiou";

  function inflections(w) {
    const out = new Set();
    if (!/^[a-z]+$/.test(w)) return out;
    if (/(s|x|z|ch|sh)$/.test(w)) out.add(w + "es");
    else if (/[^aeiou]y$/.test(w) && w.length > 2) out.add(w.slice(0, -1) + "ies");
    else out.add(w + "s");
    if (w.endsWith("e")) { out.add(w + "d"); out.add(w.slice(0, -1) + "ing"); }
    else {
      out.add(w + "ed"); out.add(w + "ing");
      if (/[^aeiou]$/.test(w) && !/[wxy]$/.test(w) && w.length > 3) {
        out.add(w + w.slice(-1) + "ed"); out.add(w + w.slice(-1) + "ing");
      }
    }
    if (w.endsWith("e")) { out.add(w + "r"); out.add(w + "st"); }
    else if (/[^aeiou]y$/.test(w) && w.length > 2) { out.add(w.slice(0, -1) + "ier"); out.add(w.slice(0, -1) + "iest"); }
    else { out.add(w + "er"); out.add(w + "est"); }
    out.add(w + "ly");
    return out;
  }

  function buildWordForms() {
    CILIN.wordForms = Object.assign({}, IRREG);
    CILIN.words.forEach(function (w) {
      const base = w.w.toLowerCase();
      inflections(base).forEach(function (f) {
        if (!CILIN.wordMap[f] && !CILIN.wordForms[f]) CILIN.wordForms[f] = base;
      });
    });
  }

  CILIN.mergeCustomWords = function () {
    const map = (CILIN.store && CILIN.store.state && CILIN.store.state.customWords) || {};
    CILIN.customWords = [];
    Object.keys(map).forEach(function (k) {
      const w = map[k];
      if (!w) return;
      w.w = String(w.w || k).toLowerCase();
      w.custom = true;
      w.level = "custom";
      // 老存档兼容：只有 zh 的旧词条反推成一条义项（不升级 state.v，不影响导入导出）
      if (!Array.isArray(w.senses) || !w.senses.length) {
        const zh = String(w.zh || "").trim();
        const pos = String(w.pos || "").trim();
        let def = zh;
        if (pos && def.indexOf(pos) === 0) def = def.slice(pos.length).trim();
        w.senses = zh ? [{ pos: pos, def: def }] : [];
      }
      if (!CILIN.wordMap[w.w]) {
        CILIN.words.push(w);
        CILIN.wordMap[w.w] = w;
      }
      CILIN.customWords.push(w);
    });
  };

  CILIN.registerCustomWord = function (w) {
    if (!w) return null;
    const key = String(w.w || "").trim().toLowerCase();
    if (!key) return null;
    w.w = key; w.custom = true; w.level = "custom";
    const old = CILIN.wordMap[key];
    if (old && old.custom) {
      Object.assign(old, w);
      CILIN.customWords = CILIN.customWords.map(function (x) { return x.w === key ? old : x; });
      buildWordForms();
      return old;
    }
    if (old) return old; // 大纲已有，不覆盖
    CILIN.words.push(w);
    CILIN.wordMap[key] = w;
    CILIN.customWords = CILIN.customWords || [];
    CILIN.customWords.push(w);
    buildWordForms();
    return w;
  };

  CILIN.unregisterCustomWord = function (key) {
    const k = String(key || "").toLowerCase();
    CILIN.words = CILIN.words.filter(function (w) { return !(w.custom && w.w === k); });
    delete CILIN.wordMap[k];
    CILIN.customWords = (CILIN.customWords || []).filter(function (w) { return w.w !== k; });
    buildWordForms();
  };

  CILIN.studyPool = function () {
    const scope = (CILIN.store && CILIN.store.state && CILIN.store.state.settings.vocabScope) || "mix";
    let list = CILIN.words;
    if (scope === "cet4") list = CILIN.cet4Words;
    else if (scope === "cet6") list = CILIN.cet6Words;
    return list.filter(function (w) { return (w.mean || w.zh) && w.w.length > 1; });
  };

  CILIN.scopeLabel = function () {
    const scope = (CILIN.store && CILIN.store.state && CILIN.store.state.settings.vocabScope) || "mix";
    return scope === "cet4" ? "四级" : scope === "cet6" ? "六级" : "四级 + 六级";
  };

  CILIN.levelBadge = function (w) {
    if (!w) return "";
    if (w.level === "cet6") return '<span class="pill gold">CET-6</span>';
    if (w.level === "custom") return '<span class="pill">我的词</span>';
    return "";
  };
  CILIN.resolveWord = function (token) {
    let t = String(token || "").toLowerCase().replace(/[’']s$/, "").replace(/[’']$/, "").replace(/[^a-z'-]/g, "");
    if (!t) return null;
    if (CILIN.wordMap[t]) return CILIN.wordMap[t];
    const base = CILIN.wordForms[t];
    return base && CILIN.wordMap[base] ? CILIN.wordMap[base] : null;
  };

  function currentRoute() {
    let h = (location.hash || "#/today").replace(/^#\/?/, "");
    const parts = h.split("/").filter(Boolean);
    let name = parts[0] || "today";
    if (ROUTES.indexOf(name) < 0) name = "today";
    return { name: name, params: parts.slice(1), raw: h };
  }

  function setNav(name) {
    ui.$$("#nav a, #tabbar a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-route") === name);
    });
  }

  function render() {
    const route = currentRoute();
    const view = CILIN.views[route.name];
    const root = document.getElementById("app");
    if (!view) return;
    setNav(route.name);
    root.setAttribute("data-view", route.name);
    try {
      view.render(root, route.params);
    } catch (e) {
      console.error(e);
      CILIN.errors.push("render " + route.name + ": " + (e && e.message));
      root.innerHTML = `<div class="empty"><h4>这一页没有点亮</h4><p>${ui.esc(String(e && e.message || e))}</p>
        <button class="btn btn-line" onclick="location.reload()">重新载入</button></div>`;
    }
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    CILIN.refreshChrome();
  }

  CILIN.refreshChrome = function () {
    const lv = CILIN.store.levelInfo();
    const pill = document.getElementById("xpPill");
    if (pill) pill.innerHTML = "✦ <b>" + lv.xp + "</b>";
    const themeBtn = document.getElementById("themeBtn");
    if (themeBtn) themeBtn.setAttribute("title", CILIN.store.state.settings.theme === "light" ? "切换到夜色" : "切换到晨光");
  };

  CILIN.go = function (path) {
    // path 形如 "/grove/u1a"
    if (location.hash === "#" + path) render();
    else location.hash = path;
  };

  CILIN.reRender = render;

  function scanTextWords() {
    const re = /[A-Za-z][A-Za-z'’\-]*/g;
    CILIN.units.forEach(function (u) {
      u.texts.forEach(function (t) {
        const seen = {};
        const txt = (t.paragraphs && t.paragraphs.length ? t.paragraphs.join(" ") : (t.sentences || []).join(" "));
        let m;
        while ((m = re.exec(txt))) {
          const w = CILIN.resolveWord(m[0]);
          if (w && !seen[w.w]) {
            seen[w.w] = 1;
            CILIN.textWords[t.id] = CILIN.textWords[t.id] || [];
            CILIN.textWords[t.id].push(w);
          }
        }
      });
    });
  }

  function boot() {
    buildIndexes();
    CILIN.store.init();
    CILIN.mergeCustomWords();
    buildWordForms();
    scanTextWords();
    CILIN.speech.init();
    CILIN.views = CILIN.views || {};
    // 主题
    const themeBtn = document.getElementById("themeBtn");
    if (themeBtn) themeBtn.addEventListener("click", function () {
      CILIN.store.toggleTheme();
      CILIN.refreshChrome();
    });
    // 朗读按钮（全局委托）
    document.addEventListener("click", function (e) {
      const t = e.target.closest("[data-speak]");
      if (!t) return;
      e.preventDefault();
      e.stopPropagation();
      const text = t.getAttribute("data-speak");
      if (!text) return;
      ui.$$(".audio-btn.speaking").forEach(function (b) { b.classList.remove("speaking"); });
      t.classList.add("speaking");
      CILIN.speech.speak(text, {
        rate: 0.85,
        onend: function () { t.classList.remove("speaking"); },
        onerror: function () { t.classList.remove("speaking"); }
      });
    });
    // Esc 关闭弹层
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        const ov = document.getElementById("overlay");
        if (ov && !ov.classList.contains("hidden") && ui._sheetDismiss !== false) ui.closeSheet();
      }
    });
    window.addEventListener("hashchange", function () { CILIN.speech.stop(); render(); });
    render();
    // 记录最后页面
    CILIN.store.state.profile.lastRoute = currentRoute().name;
    CILIN.store.save();

    if (/[?&]selftest=1/.test(location.search)) runSelfTest();
  }

  /* ---------- 自检（供无头浏览器验收） ---------- */
  function runSelfTest() {
    const results = [];
    function check(name, fn) {
      try {
        const r = fn();
        results.push({ name: name, ok: r !== false, detail: typeof r === "string" ? r : "" });
      } catch (e) {
        results.push({ name: name, ok: false, detail: String(e && e.message) });
      }
    }
    check("data.words>4000", function () { return CILIN.words.length + " words"; });
    check("data.core=600", function () { return CILIN.coreWords.length === 600 || CILIN.coreWords.length + " core"; });
    check("data.units=7", function () { return CILIN.units.length === 7 || CILIN.units.length + " units"; });
    check("wordMap", function () { return !!CILIN.wordMap["abandon"]; });
    check("speech.api", function () { return !!window.speechSynthesis; });
    check("plan", function () { const p = CILIN.store.plan(); return p.fresh.length + " fresh / " + p.due.length + " due"; });
    check("quiz.gen", function () {
      const q = CILIN.quiz.make({ count: 6, seed: 42 });
      return q.length === 6 && q.every(function (x) { return x && x.prompt; });
    });
    check("store.review", function () {
      const w = CILIN.coreWords[0];
      const r = CILIN.store.review(w, 2);
      return !!r && r.isNew === true;
    });
    check("route.render", function () {
      const app = document.getElementById("app");
      return app && app.children.length > 0;
    });
    const errors = CILIN.errors.slice();
    let box = document.getElementById("selftest");
    if (!box) {
      box = document.createElement("pre");
      box.id = "selftest";
      box.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:999;max-height:40vh;overflow:auto;background:#000;color:#0f0;font:11px monospace;padding:8px;display:none";
      document.body.appendChild(box);
    }
    const pass = results.filter(function (r) { return r.ok; }).length;
    box.textContent = "SELFTEST " + pass + "/" + results.length + " pass\n" +
      results.map(function (r) { return (r.ok ? "PASS " : "FAIL ") + r.name + " " + r.detail; }).join("\n") +
      (errors.length ? "\nJS ERRORS:\n" + errors.join("\n") : "\nJS ERRORS: none") +
      "\n words=" + CILIN.words.length + " core=" + CILIN.coreWords.length + " units=" + CILIN.units.length;
    box.setAttribute("data-pass", pass);
    box.setAttribute("data-total", results.length);
    box.style.display = "block";
    document.documentElement.setAttribute("data-selftest", pass + "/" + results.length);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
