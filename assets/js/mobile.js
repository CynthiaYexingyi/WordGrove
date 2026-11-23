/* 词林 · 手机版交互层
   独立实现，不依赖桌面版的 ui/store/app.js；只读写同一份 localStorage["cilin.v1"] 存档。
   刻意使用 ES5 语法与 onclick/onchange 绑定，兼容老旧手机 WebView。
   资源按需：m_words.js 首屏；m_units.js / sentzh.js / questions.js / meta.js 用到才加载。 */
(function () {
  "use strict";

  var KEY = "cilin.v1";
  var BK_KEY = "cilin.backup.last";   /* 备份时间独立存，不写进存档、不升 state.v */
  var BK_DAYS = 14;
  var backupDismissed = false;
  var WORDS = window.CILIN_M_WORDS || [];
  var LEVELS = [
    [0, 1, "提灯者"], [40, 2, "采集者"], [110, 3, "林中旅人"], [210, 4, "面具之后"],
    [340, 5, "影子学徒"], [500, 6, "夜行者"], [700, 7, "照见者"], [940, 8, "与影同行"],
    [1220, 9, "渡河人"], [1540, 10, "织梦者"], [1910, 11, "阿尼玛之友"],
    [2330, 12, "玻璃球玩家"], [2800, 13, "守林人"], [3330, 14, "自性学徒"], [3920, 15, "自性"]
  ];
  var INTERVALS = [0, 1, 2, 4, 8, 16];
  var PAGE = 30;

  var IDX = {};
  var CUSTOM = [];
  var state = null;
  var flipped = false;
  var searchTimer = null;
  var filter = "all";
  var listPage = 0;
  var listCache = [];
  var sheetWord = null;
  var readText = null;
  var readParas = [];
  var readLabel = "";
  var showZh = false;
  var booted = false;
  var editKey = "";
  var editCtx = "";
  var resetArmed = false;

  var UNITS = null, SENTZH = null, NORMZH = null, QUESTIONS = null, META = null;
  var loading = {};
  var quiz = null;
  var choosing = null;

  /* ---------------- 小工具 ---------------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function txt(id, s) { var el = $(id); if (el) el.innerHTML = s; }
  function toast(msg) {
    var old = $("mToast");
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var d = document.createElement("div");
    d.setAttribute("id", "mToast");
    d.setAttribute("style", "position:fixed;left:50%;bottom:88px;transform:translateX(-50%);z-index:70;" +
      "background:#24302a;color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;max-width:80%;text-align:center");
    d.appendChild(document.createTextNode(msg));
    document.body.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 2000);
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function fmt(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function today() { return fmt(new Date()); }
  function parseKey(k) { var p = String(k).split("-"); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
  function addDays(k, n) { var d = parseKey(k); d.setDate(d.getDate() + n); return fmt(d); }
  function shuffle(a, seed) {
    var out = a.slice(), i, j, t, s = (seed || Date.now()) % 233280;
    for (i = out.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      j = Math.floor(s / 233280 * (i + 1));
      t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }
  function normSent(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
  function stripOpt(s) { return String(s == null ? "" : s).replace(/^[A-Oa-o][.、)]\s*/, ""); }
  function loadScript(src, varName, cb) {
    if (window[varName]) { cb(true); return; }
    if (loading[varName]) { loading[varName].push(cb); return; }
    loading[varName] = [cb];
    var s = document.createElement("script");
    s.src = src;
    s.onload = function () {
      var list = loading[varName] || []; delete loading[varName];
      for (var i = 0; i < list.length; i++) list[i](!!window[varName]);
    };
    s.onerror = function () {
      var list = loading[varName] || []; delete loading[varName];
      for (var i = 0; i < list.length; i++) list[i](false);
    };
    document.getElementsByTagName("head")[0].appendChild(s);
  }
  function showBootFail(title, msg) {
    txt("mBootTitle", esc(title));
    txt("mBootMsg", esc(msg));
    $("mBootRetry").hidden = false;
    $("mBootDesktop").hidden = false;
  }

  /* ---------------- 存档：与桌面版同结构 ---------------- */
  function defaults() {
    return {
      v: 1, createdAt: today(),
      settings: { dailyGoal: 10, theme: "dark", rate: 0.9, voiceName: "", sound: true, vocabScope: "mix", readerHighlight: true },
      profile: { xp: 0, streak: 0, longestStreak: 0, lastStudyDay: null, bestCombo: 0, combo: 0, mood: "", name: "" },
      words: {}, shadow: {}, days: {}, reading: {},
      todayQueue: { date: "", words: [] },
      sessions: [], journal: [], customWords: {}, edits: {}, achievements: {},
      stats: { integrated: 0, dailyGoals: 0, translated: 0, written: 0, listened: 0, quizzes: 0 }
    };
  }
  function fill(obj, def) {
    for (var k in def) if (Object.prototype.hasOwnProperty.call(def, k)) {
      var isObj = def[k] && typeof def[k] === "object" && !Array.isArray(def[k]);
      if (obj[k] == null || (isObj && (typeof obj[k] !== "object" || obj[k] === null))) obj[k] = JSON.parse(JSON.stringify(def[k]));
      else if (isObj) fill(obj[k], def[k]);
    }
  }
  function readState() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { s = null; }
    if (!s || typeof s !== "object") s = defaults();
    fill(s, defaults());
    if (!Array.isArray(s.sessions)) s.sessions = [];
    if (!Array.isArray(s.journal)) s.journal = [];
    if (!Array.isArray(s.todayQueue.words)) s.todayQueue.words = [];
    s.v = 1;
    return s;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { toast("进度保存失败，可能是浏览器存储被禁用"); }
  }
  function touchDay() {
    var t = today(), p = state.profile;
    if (!state.days[t]) state.days[t] = { words: 0, newWords: 0, reviewWords: 0, correct: 0, wrong: 0, xp: 0, studied: [] };
    if (p.lastStudyDay !== t) {
      p.streak = (p.lastStudyDay === addDays(t, -1)) ? (p.streak || 0) + 1 : 1;
      p.longestStreak = Math.max(p.longestStreak || 0, p.streak);
      p.lastStudyDay = t;
    }
    if (!state.days[t].studied) state.days[t].studied = [];
    return state.days[t];
  }
  function levelInfo() {
    var xp = state.profile.xp || 0, cur = LEVELS[0], next = null, i;
    for (i = 0; i < LEVELS.length; i++) {
      if (xp >= LEVELS[i][0]) { cur = LEVELS[i]; next = LEVELS[i + 1] || null; }
    }
    var pct = next ? Math.round((xp - cur[0]) / (next[0] - cur[0]) * 100) : 100;
    if (pct < 0) pct = 0;
    return { lv: cur[1], title: cur[2], xp: xp, pct: pct, toNext: next ? next[0] - xp : 0 };
  }
  function addXp(n) {
    if (!n) return;
    state.profile.xp = Math.max(0, (state.profile.xp || 0) + n);
    var d = touchDay();
    d.xp = (d.xp || 0) + n;
    refreshXp();
    save();
  }
  function refreshXp() { txt("mXp", "✦ " + (state.profile.xp || 0)); }
  function addShadow(w, reason) {
    if (!w) return;
    var t = today(), r = state.shadow[w] || { added: t, attempts: 0 };
    r.reason = reason || r.reason || "遗忘";
    r.added = r.added || t; r.last = t;
    state.shadow[w] = r;
    save();
  }
  function integrateShadow(w) {
    if (!state.shadow[w]) return false;
    delete state.shadow[w];
    state.stats.integrated = (state.stats.integrated || 0) + 1;
    var s = state.words[w];
    if (s) { s.box = Math.max(s.box || 1, 3); s.due = addDays(today(), INTERVALS[s.box]); s.right = (s.right || 0) + 1; }
    addXp(5);
    checkAchievements();
    return true;
  }
  function recordAnswer(ok, word, xp, stat) {
    var day = touchDay(), p = state.profile;
    if (ok) {
      day.correct = (day.correct || 0) + 1;
      p.combo = (p.combo || 0) + 1;
      p.bestCombo = Math.max(p.bestCombo || 0, p.combo);
      addXp(xp || 1);
      if (stat) { state.stats[stat] = (state.stats[stat] || 0) + 1; }
    } else {
      day.wrong = (day.wrong || 0) + 1;
      p.combo = 0;
      if (word) addShadow(word, "答错");
    }
    state.stats.quizzes = (state.stats.quizzes || 0) + 1;
    save();
    checkAchievements();
  }
  function recordSession(kind, correct, total) {
    state.sessions.unshift({ date: new Date().toISOString(), day: today(), kind: kind, correct: correct, total: total });
    state.sessions = state.sessions.slice(0, 80);
    save();
  }
  function checkAchievements() {
    if (!META || !META.achievements) return;
    var learned = 0, k;
    for (k in state.words) if (state.words.hasOwnProperty(k) && state.words[k] && state.words[k].seen) learned++;
    var p = state.profile, st = state.stats, lv = levelInfo().lv;
    var cond = {
      "first-word": learned >= 1, "words-10": learned >= 10, "words-100": learned >= 100, "words-300": learned >= 300,
      "streak-3": (p.streak || 0) >= 3, "streak-7": (p.streak || 0) >= 7, "streak-30": (p.streak || 0) >= 30,
      "shadow-1": (st.integrated || 0) >= 1, "shadow-10": (st.integrated || 0) >= 10,
      "quiz-10": (p.bestCombo || 0) >= 10, "level-5": lv >= 5, "level-10": lv >= 10,
      "translation-1": (st.translated || 0) >= 1, "writing-1": (st.written || 0) >= 1,
      "listening-1": (st.listened || 0) >= 1, "journal-3": (state.journal || []).length >= 3,
      "daily-first": (st.dailyGoals || 0) >= 1
    };
    var n = 0, i, a;
    for (i = 0; i < META.achievements.length; i++) {
      a = META.achievements[i];
      if (cond[a.id] && !state.achievements[a.id]) { state.achievements[a.id] = today(); n++; }
    }
    if (n) { addXp(n * 3); toast("解锁 " + n + " 枚印记"); }
  }

  /* ---------------- 自定义词（与桌面版共用 customWords） ---------------- */
  function customSlim(c) {
    var senses = c.senses || [{ pos: c.pos || "", def: c.zh || "" }];
    var zh = c.zh || "";
    if (!zh) {
      var parts = [];
      for (var i = 0; i < senses.length; i++) {
        var s = senses[i] || {};
        parts.push(((s.pos ? s.pos + " " : "") + (s.def || "")).trim());
      }
      zh = parts.join("；");
    }
    var own = c.ownEx || {}, ex = c.ex || {};
    return {
      w: c.w, z: zh || "（未填释义）", p: c.ipa || "", l: "custom",
      e: own.en || ex.en || "", x: own.zh || c.exZh || "",
      k: c.colloc || [], s: ex.src || "我的词", custom: true
    };
  }
  function mergeCustom() {
    CUSTOM = [];
    var map = state.customWords || {}, k;
    for (k in map) if (map.hasOwnProperty(k) && map[k]) {
      var w = map[k];
      w.w = String(w.w || k).toLowerCase();
      var slim = customSlim(w);
      CUSTOM.push(slim);
      if (!IDX[slim.w] || IDX[slim.w].custom) IDX[slim.w] = slim;
    }
  }
  // 个人编辑覆盖层：桌面/手机共用存档里的规范字段（senses/ex/exZh/colloc...），
  // 这里映射成手机 slim 结构（z/e/x/k）叠加到运行时词卡；原值存 __orig 便于还原。
  function patchSlim(w, patch) {
    if (!w || !patch) return;
    if (!w.__orig) {
      w.__orig = {};
      ["z", "p", "e", "x", "k", "s"].forEach(function (f) { if (f in w) w.__orig[f] = w[f]; });
    }
    if (patch.senses && patch.senses.length) {
      var parts = [];
      for (var i = 0; i < patch.senses.length; i++) {
        var sn = patch.senses[i] || {};
        parts.push(((sn.pos ? sn.pos + " " : "") + (sn.def || "")).replace(/^\s+|\s+$/g, ""));
      }
      w.z = parts.join("；") || w.z;
    } else if (patch.mean || patch.zh) w.z = patch.mean || patch.zh;
    if (patch.ipa != null) w.p = patch.ipa;
    if (patch.ex && typeof patch.ex.en === "string") { w.e = patch.ex.en; if (patch.ex.src) w.s = patch.ex.src; }
    if (patch.exZh != null) w.x = patch.exZh;
    if (patch.colloc != null) w.k = patch.colloc;
    w.edited = true;
  }
  function applyEdits() {
    var map = state.edits || {}, k;
    for (k in map) if (map.hasOwnProperty(k) && map[k]) patchSlim(IDX[k], map[k]);
  }
  function revertEdit(key) {
    var w = IDX[String(key || "").toLowerCase()];
    if (!w || !w.__orig) return false;
    Object.keys(w.__orig).forEach(function (f) { w[f] = w.__orig[f]; });
    delete w.__orig; delete w.edited;
    return true;
  }
  function allWords() { return WORDS.concat(CUSTOM); }
  var editingOverlay = false;
  function openEditor(word, ctx, overlay) {
    editKey = String(word || "").trim().toLowerCase();
    editCtx = ctx || "";
    editingOverlay = !!overlay;
    var c = editingOverlay ? ((state.edits || {})[editKey] || null) : ((state.customWords || {})[editKey] || null);
    var live = IDX[editKey] || {};
    txt("mEdTitle", editingOverlay ? "编辑词卡" : (c ? "编辑我的词" : "收进我的词"));
    $("mEdWord").value = editKey;
    $("mEdWord").disabled = editingOverlay;
    var pos = c && c.senses && c.senses[0] ? (c.senses[0].pos || "") : "";
    var def = c && c.senses && c.senses[0] ? (c.senses[0].def || "") : "";
    if (editingOverlay && !c) { pos = ""; def = live.z || ""; }
    $("mEdPos").value = pos;
    $("mEdDef").value = def;
    $("mEdMnemonic").value = c ? (c.mnemonic || "") : "";
    var own = c ? (c.ownEx || {}) : {};
    $("mEdEx").value = editingOverlay ? ((c && c.ex && c.ex.en) || live.e || "") : (own.en || "");
    $("mEdExZh").value = editingOverlay ? ((c && c.exZh) || live.x || "") : (own.zh || "");
    var col = c && c.colloc ? c.colloc : (editingOverlay ? live.k : null);
    $("mEdColloc").value = col && col.length ? col.join("\n") : "";
    $("mEditMask").hidden = false;
    $("mEditor").hidden = false;
  }
  function closeEditor() { $("mEditMask").hidden = true; $("mEditor").hidden = true; }
  function saveEditor() {
    var key = String($("mEdWord").value || "").trim().toLowerCase();
    if (!/^[a-z][a-z'\-]{0,40}$/.test(key)) { toast("请填一个英文单词"); return; }
    var pos = String($("mEdPos").value || "").trim();
    var def = String($("mEdDef").value || "").trim();
    if (!def) { toast("写一句中文释义吧"); return; }
    var en = String($("mEdEx").value || "").trim();
    var zh = String($("mEdExZh").value || "").trim();
    var colloc = String($("mEdColloc").value || "").split("\n").map(function (x) { return x.replace(/^\s+|\s+$/g, ""); }).filter(Boolean);
    if (editingOverlay) {
      if (!state.edits) state.edits = {};
      var patch = {
        senses: [{ pos: pos, def: def }],
        mean: (pos ? pos + " " : "") + def,
        ex: { en: en, src: "我的修改" }, exZh: zh,
        colloc: colloc, mnemonic: String($("mEdMnemonic").value || "").trim(),
        updatedAt: Date.now()
      };
      state.edits[key] = patch;
      save();
      patchSlim(IDX[key], patch);
      closeEditor();
      toast("已保存到这张词卡");
      buildList(); renderList();
      return;
    }
    if (!state.customWords) state.customWords = {};
    if (IDX[key] && !IDX[key].custom && !state.customWords[key]) { toast("大纲里已有这个词，可点词卡里的「编辑词卡」"); return; }
    var old = state.customWords[key] || {};
    state.customWords[key] = {
      w: key, level: "custom", custom: true,
      senses: [{ pos: pos, def: def }],
      zh: (pos ? pos + " " : "") + def,
      pos: pos,
      mnemonic: String($("mEdMnemonic").value || "").trim(),
      ownEx: { en: en, zh: zh },
      colloc: colloc,
      syn: old.syn || [],
      ex: old.ex || (editCtx ? { en: editCtx, src: readLabel || "课文" } : null),
      exZh: old.exZh || "",
      updatedAt: Date.now()
    };
    save();
    mergeCustom();
    closeEditor();
    toast("已收进我的词");
    buildList(); renderList();
    if (window.__mCurrent === "grove") renderList();
  }
  function deleteCustom() {
    if (!sheetWord || !sheetWord.custom) return;
    var k = sheetWord.w;
    delete state.customWords[k];
    delete IDX[k];
    CUSTOM = CUSTOM.filter(function (x) { return x.w !== k; });
    save();
    closeSheet();
    buildList(); renderList();
    toast("已删除");
  }

  /* ---------------- 发音 ---------------- */
  function speak(text, rate) {
    try {
      if (!state.settings.sound) return;
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance || !text) return;
      window.speechSynthesis.cancel();
      var u = new window.SpeechSynthesisUtterance(String(text));
      u.lang = "en-US";
      u.rate = rate || Number(state.settings.rate) || 0.9;
      if (state.settings.voiceName && window.speechSynthesis.getVoices) {
        var vs = window.speechSynthesis.getVoices(), i;
        for (i = 0; i < vs.length; i++) if (vs[i].name === state.settings.voiceName) { u.voice = vs[i]; break; }
      }
      window.speechSynthesis.speak(u);
    } catch (e) { /* 发音不可用不影响学习 */ }
  }

  /* ---------------- 今日队列 ---------------- */
  /* 记忆强度 / 遗忘预测：纯推算，不写存档、不升 state.v */
  function memoryOf(w) {
    var s = state.words[w.w || w];
    if (!s || !s.seen || s.easy) return null;
    var box = Math.min(5, Math.max(1, s.box || 1));
    var right = s.right || 0, wrong = s.wrong || 0;
    var acc = right + wrong ? right / (right + wrong) : 0.5;
    var gap = s.last ? Math.max(0, Math.round((parseKey(today()) - parseKey(s.last)) / 86400000)) : 30;
    var keep = Math.exp(-gap / (Math.max(1, INTERVALS[box]) * 1.7)) * (0.55 + 0.45 * acc);
    return { keep: Math.round(keep * 100), gap: gap, wrong: wrong };
  }
  function nearOne(a, b) {
    if (Math.abs(a.length - b.length) > 1 || a.length < 5) return false;
    var i, j, diff = 0, long, short, skip = 0;
    if (a.length === b.length) {
      for (i = 0; i < a.length; i++) if (a[i] !== b[i] && ++diff > 1) return false;
      return diff === 1;
    }
    long = a.length > b.length ? a : b; short = a.length > b.length ? b : a;
    i = 0; j = 0;
    while (i < long.length && j < short.length) {
      if (long[i] === short[j]) { i++; j++; }
      else { if (++skip > 1) return false; i++; }
    }
    return true;
  }
  function posTag(z) {
    var p = String(z || "").toLowerCase();
    if (/^n/.test(p)) return "名词";
    if (/^v/.test(p)) return "动词";
    if (/^(adj|a\.)/.test(p)) return "形容词";
    if (/^(adv|ad\.)/.test(p)) return "副词";
    return "";
  }
  function shadowClusters() {
    var keys = Object.keys(state.shadow);
    if (keys.length < 3) return [];
    var words = keys.slice(0, 120), near = {}, groups = {}, out = [], i, j, k, w, suf, tag;
    for (i = 0; i < words.length; i++) {
      for (j = i + 1; j < words.length; j++) {
        if (nearOne(words[i].toLowerCase(), words[j].toLowerCase())) { near[words[i]] = 1; near[words[j]] = 1; }
      }
    }
    function add(t, word) { if (!groups[t]) groups[t] = { label: t, words: [] }; groups[t].words.push(word); }
    for (i = 0; i < words.length; i++) {
      k = words[i]; w = IDX[k] || { w: k, z: "" };
      tag = posTag(w.z); if (tag) add(tag, k);
      suf = String(k).match(/(tion|sion|ment|ness|ity|able|ible|ful|less|ous|ive|ize|ise|ance|ence|ary|ory|al|ic|ly)$/);
      if (suf) add("-" + suf[1] + " 结尾", k);
      if (near[k]) add("形近易混", k);
    }
    for (tag in groups) if (groups.hasOwnProperty(tag) && groups[tag].words.length >= 2) out.push(groups[tag]);
    out.sort(function (a, b) { return b.words.length - a.words.length; });
    return out.slice(0, 3);
  }

  function scopeOK(w) {
    var s = state.settings.vocabScope;
    if (!w || w.custom) return true;
    if (s === "cet4") return w.l !== "cet6";
    if (s === "cet6") return w.l === "cet6";
    return true;
  }
  function isSimple(w) {
    var key = w && w.w ? w.w : w, s = state.words[key];
    return !!(s && s.easy);
  }
  function markSimple(w) {
    var key = w.w || w, t = today(), s = state.words[key];
    if (!s) s = state.words[key] = { first: t, seen: 0, box: 1, due: t, right: 0, wrong: 0, last: null };
    s.seen = 1; s.box = 5; s.easy = 1; s.last = t;
    s.due = addDays(t, 3650);
    removeFromQueue(key);
    save();
    return true;
  }
  function unmarkSimple(w) {
    var key = w.w || w, s = state.words[key];
    if (!s || !s.easy) return false;
    delete s.easy; s.box = 2; s.due = today();
    save();
    return true;
  }
  function simpleList() {
    var out = [], k;
    for (k in state.words) if (state.words.hasOwnProperty(k) && state.words[k].easy && IDX[k]) out.push(IDX[k]);
    return out;
  }
  function pickToday(n) {
    var t = today(), out = [], used = {}, i, w, s, k, due = [], risk = [], m;
    function byRisk(a, b) {
      var ma = memoryOf(a) || { keep: 100 }, mb = memoryOf(b) || { keep: 100 };
      return ma.keep - mb.keep;
    }
    var shadowKeys = [];
    for (k in state.shadow) if (state.shadow.hasOwnProperty(k) && IDX[k]) shadowKeys.push(k);
    shadowKeys.sort(byRisk);
    for (i = 0; i < shadowKeys.length && out.length < n; i++) {
      if (!isSimple(shadowKeys[i]) && !used[shadowKeys[i]]) { out.push(shadowKeys[i]); used[shadowKeys[i]] = 1; }
    }
    for (k in state.words) if (state.words.hasOwnProperty(k) && IDX[k]) {
      s = state.words[k];
      if (s.easy) continue;
      if (s && s.seen && s.due && s.due <= t && !used[k]) due.push(k);
      else if (s && s.seen && s.due && s.due > t && !used[k]) {
        m = memoryOf(k);
        if (m && m.keep < 50 && m.gap >= 1) risk.push({ k: k, keep: m.keep });
      }
    }
    due.sort(byRisk);
    for (i = 0; i < due.length && out.length < n; i++) { out.push(due[i]); used[due[i]] = 1; }
    risk.sort(function (a, b) { return a.keep - b.keep; });
    for (i = 0; i < risk.length && out.length < n && i < 2; i++) {
      if (!used[risk[i].k]) { out.push(risk[i].k); used[risk[i].k] = 1; }
    }
    var pool = shuffle(WORDS, Math.floor(parseKey(t).getTime() / 86400000) + 7);
    for (i = 0; i < pool.length && out.length < n; i++) {
      w = pool[i];
      if (used[w.w] || !scopeOK(w) || !w.z) continue;
      s = state.words[w.w];
      if (s && s.seen) continue;
      out.push(w.w); used[w.w] = 1;
    }
    for (i = 0; i < CUSTOM.length && out.length < n; i++) {
      w = CUSTOM[i];
      if (!used[w.w]) { out.push(w.w); used[w.w] = 1; }
    }
    return out;
  }
  function queue() {
    var t = today(), q = state.todayQueue, goal = Number(state.settings.dailyGoal) || 10;
    if (q.date !== t || typeof q.total !== "number" || !q.words.length && q.total !== 0) {
      var picked = pickToday(goal);
      state.todayQueue = { date: t, words: picked, total: picked.length };
      save();
    }
    return state.todayQueue;
  }
  function removeFromQueue(w) {
    var q = state.todayQueue, a = [], i;
    for (i = 0; i < q.words.length; i++) if (q.words[i] !== w) a.push(q.words[i]);
    q.words = a;
  }
  function review(w, ok) {
    if (!w) return;
    var t = today(), key = w.w, s = state.words[key], isNew = !s || !s.seen;
    if (!s) s = state.words[key] = { first: t, seen: 0, box: 1, due: t, right: 0, wrong: 0, last: null };
    if (s.easy) delete s.easy;
    s.seen = (s.seen || 0) + 1;
    s.last = t;
    var day = touchDay();
    if (day.studied.indexOf(key) < 0) day.studied.push(key);
    day.words = day.studied.length;
    if (isNew) day.newWords = (day.newWords || 0) + 1;
    if (ok) {
      s.right = (s.right || 0) + 1;
      s.box = Math.min(5, (s.box || 1) + 1);
      s.due = addDays(t, INTERVALS[s.box]);
      day.correct = (day.correct || 0) + 1;
      addXp(isNew ? 2 : 1);
    } else {
      s.wrong = (s.wrong || 0) + 1;
      s.box = Math.max(1, (s.box || 1) - 1);
      s.due = addDays(t, 1);
      day.wrong = (day.wrong || 0) + 1;
      addShadow(key, "遗忘");
    }
    if (!isNew) {
      day.reviewWords = (day.reviewWords || 0) + 1;
      if (!day.reviewed) day.reviewed = [];
      if (day.reviewed.indexOf(key) < 0) day.reviewed.push(key);
    }
    removeFromQueue(key);
    var goal = Number(state.settings.dailyGoal) || 10;
    if (!day.goalDone && day.studied.length >= goal) {
      day.goalDone = true;
      state.stats.dailyGoals = (state.stats.dailyGoals || 0) + 1;
      addXp(10);
      checkAchievements();
      toast("今日目标达成 · 经验 +10");
    }
    save();
  }
  function currentWord() {
    var q = queue();
    return q.words.length ? IDX[q.words[0].toLowerCase()] || null : null;
  }
  function renderToday() {
    var q = queue(), done = (q.total || 0) - q.words.length;
    if (done < 0) done = 0;
    var pct = q.total ? Math.round(done / q.total * 100) : 100;
    $("mBar").style.width = pct + "%";
    var info = levelInfo(), name = (state.profile.name || "").trim() || info.title;
    var d = new Date(), wk = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
    txt("mHello", "你好，<b>" + esc(name) + "</b> · " + (d.getMonth() + 1) + "月" + d.getDate() + "日 周" + wk);
    var w = currentWord();
    flipped = false;
    $("mCard").className = "m-card";
    if (!w) {
      txt("mCount", "今日完成 · " + q.total + " 词");
      txt("mCardWord", "今日走完了");
      txt("mCardIpa", "明天再来，林子一直在");
      $("mCardZh").hidden = true; $("mCardEx").hidden = true;
      txt("mTip", "想多学几个？点「再学一组」，或去「词林」搜词加入今日");
    $("mKnow").disabled = true; $("mAgain").disabled = true; $("mSimple").disabled = true;
    return;
    }
    $("mKnow").disabled = false; $("mAgain").disabled = false; $("mSimple").disabled = false;
    txt("mCount", "今日 " + done + " / " + q.total);
    txt("mCardWord", esc(w.w));
    txt("mCardIpa", w.p ? "/ " + esc(w.p) + " /" : "轻点卡片翻面看释义");
    txt("mCardZh", esc(w.z || "（暂无释义）"));
    $("mCardZh").hidden = true;
    if (w.e) {
      txt("mCardEx", esc(w.e) + (w.x ? "<br><span style='color:var(--muted)'>" + esc(w.x) + "</span>" : "") +
        (w.s ? "<em>" + esc(w.s) + "</em>" : ""));
    } else txt("mCardEx", "");
    $("mCardEx").hidden = true;
    var s = state.words[w.w], m = memoryOf(w.w);
    txt("mTip", s && s.seen
      ? ("见过 " + s.seen + " 次 · 第 " + (s.box || 1) + " 阶" + (m ? " · 记忆强度 " + m.keep + "%" : "") + " · 点卡片翻面")
      : "点卡片翻面 · 选「认识了」进入下一个");
  }
  function flipCard() {
    var w = currentWord();
    if (!w) return;
    flipped = !flipped;
    $("mCard").className = flipped ? "m-card flipped" : "m-card";
    $("mCardZh").hidden = !flipped;
    $("mCardEx").hidden = !flipped || !w.e;
    if (flipped) speak(w.w);
  }
  function gradeSimple() {
    var w = currentWord();
    if (!w) { toast("今天已经走完了"); return; }
    markSimple(w);
    toast("已标记「太简单」· " + w.w, "以后不用再见它");
    renderToday();
  }
  function grade(ok) {
    var w = currentWord();
    if (!w) return;
    review(w, ok);
    renderToday();
  }
  function moreToday() {
    var q = queue(), add = pickToday(6), i, n = 0;
    for (i = 0; i < add.length; i++) if (q.words.indexOf(add[i]) < 0) { q.words.push(add[i]); n++; }
    q.total = (q.total || 0) + n;
    save(); renderToday();
    toast(n ? "又添了 " + n + " 个词" : "暂时没有更多词了");
  }

  /* ---------------- 词林 ---------------- */
  function filterMatch(w) {
    var s = state.words[w.w];
    if (filter === "core") return !!w.c;
    if (filter === "cet4") return w.l !== "cet6" && !w.custom;
    if (filter === "cet6") return w.l === "cet6";
    if (filter === "unseen") return !(s && s.seen);
    if (filter === "seen") return !!(s && s.seen);
    if (filter === "shadow") return !!state.shadow[w.w];
    if (filter === "mine") return !!w.custom;
    return true;
  }
  function buildList() {
    var q = ($("mSearch").value || "").toLowerCase().replace(/^\s+|\s+$/g, "");
    listCache = [];
    var a = allWords(), i, w;
    for (i = 0; i < a.length; i++) {
      w = a[i];
      if (!filterMatch(w)) continue;
      if (q && w.w.toLowerCase().indexOf(q) < 0 && (w.z || "").toLowerCase().indexOf(q) < 0) continue;
      listCache.push(w);
    }
    listPage = 0;
  }
  function renderList() {
    var end = Math.min(listCache.length, (listPage + 1) * PAGE), html = "", i;
    for (i = listPage * PAGE; i < end; i++) {
      var w = listCache[i], tag = w.custom ? "我的词" : (w.c ? "核心" : (w.l === "cet6" ? "六级" : "四级"));
      if (state.words[w.w] && state.words[w.w].seen) tag = "已学";
      if (state.shadow[w.w]) tag = "影子";
      html += '<div class="m-row" data-w="' + esc(w.w) + '">' +
        '<span class="m-row-w">' + esc(w.w) + '</span>' +
        '<span class="m-row-z">' + esc(w.z || "") + '</span>' +
        '<span class="m-row-tag">' + tag + '</span></div>';
    }
    if (!listCache.length) html = '<div class="m-empty">没有找到，换个词试试</div>';
    txt("mList", html);
    $("mMore").hidden = end >= listCache.length;
    $("mMore").innerHTML = "加载更多（共 " + listCache.length + " 词）";
  }

  /* ---------------- 词卡浮层 ---------------- */
  function openSheet(w, ctxEn, ctxZh) {
    if (!w) return;
    sheetWord = w;
    txt("mShWord", esc(w.w));
    txt("mShIpa", w.p ? "/ " + esc(w.p) + " /" : "");
    txt("mShDef", esc(w.z || "（暂无释义）") + (w.edited ? " <span style='color:var(--muted);font-size:11px'>· 我的版本</span>" : ""));
    if (w.e) {
      txt("mShEx", esc(w.e) + (w.x ? "<br><span style='color:var(--muted)'>" + esc(w.x) + "</span>" : ""));
      $("mShEx").hidden = false;
    } else $("mShEx").hidden = true;
    // 课件难句精讲：挂在例句下方
    var snAll = window.CILIN_SENT_NOTES || [], sKey = (w.w || "").toLowerCase(), snList = [];
    for (var si = 0; si < snAll.length; si++) {
      var sn = snAll[si], sw = sn.words || [], sk;
      for (sk = 0; sk < sw.length; sk++) {
        if (String(sw[sk]).toLowerCase() === sKey) { snList.push(sn); break; }
      }
      if (snList.length >= 2) break;
    }
    if (snList.length) {
      var sh = "<b>难句精讲 · 来自课件</b>", sj;
      for (sj = 0; sj < snList.length; sj++) {
        if (snList[sj].loc) sh += "<br><span style='color:var(--faint);font-size:11px'>" + esc(snList[sj].loc) + "</span>";
        if (snList[sj].zh) sh += "<br><span style='color:var(--muted)'>" + esc(snList[sj].zh) + "</span>";
        if (snList[sj].note) sh += "<br>" + esc(snList[sj].note);
      }
      txt("mShSentNotes", sh); $("mShSentNotes").hidden = false;
    } else $("mShSentNotes").hidden = true;
    var cls = (w.k && w.k.length) ? esc(w.k.join("　·　")) : "";
    if (cls) { txt("mShColloc", "<b>搭配</b><br>" + cls); $("mShColloc").hidden = false; }
    else $("mShColloc").hidden = true;
    if (w.s) { txt("mShSrc", esc(w.s)); $("mShSrc").hidden = false; }
    else $("mShSrc").hidden = true;
    if (ctxEn) {
      txt("mShCtx", "<b>在文中</b><br>" + esc(ctxEn) +
        (ctxZh ? "<br><span style='color:var(--muted)'>" + esc(ctxZh) + "</span>" : ""));
      $("mShCtx").hidden = false;
    } else $("mShCtx").hidden = true;
    // 课件讲义讲解（data/vocab_notes.js）
    var vbank = window.CILIN_VOCAB_NOTES || {};
    var vlist = vbank[(w.w || "").toLowerCase()] || [];
    if (vlist.length) {
      var vh = "<b>讲义讲解 · 来自课件</b>", vi, vn;
      for (vi = 0; vi < Math.min(vlist.length, 2); vi++) {
        vn = vlist[vi];
        vh += "<br><span style='color:var(--ink);font-weight:600'>" + esc(vn.term || "") + "</span>";
        if (vn.zh) vh += "<br><span style='color:var(--muted)'>" + esc(vn.zh) + "</span>";
        if (vn.note) vh += "<br>" + esc(vn.note);
        vh += "<br><span style='color:var(--faint);font-size:11px'>" + esc(vn.source || "") + "</span>";
      }
      txt("mShNotes", vh); $("mShNotes").hidden = false;
    } else $("mShNotes").hidden = true;
    var s = state.words[w.w];
    var info = [];
    if (s && s.seen) info.push("见过 " + s.seen + " 次 · 第 " + (s.box || 1) + " 阶 · 答对 " + (s.right || 0) + " / 答错 " + (s.wrong || 0));
    else info.push("还没学过");
    if (state.shadow[w.w]) info.push("在影子里");
    if (isSimple(w.w)) info.push("已略过 · 不再复习");
    txt("mShState", info.join(" · "));
    $("mShState").hidden = false;
    txt("mShSimple", isSimple(w.w) ? "恢复复习" : "太简单 · 不再复习");
    $("mShCustomBtns").hidden = !w.custom;
    var editBtns = $("mShEditBtns");
    if (editBtns) editBtns.hidden = !!w.custom;
    var revBtn = $("mShRevertCard");
    if (revBtn) revBtn.hidden = !w.edited;
    $("mMask").hidden = false;
    $("mSheet").hidden = false;
    speak(w.w);
  }
  function closeSheet() {
    $("mMask").hidden = true; $("mSheet").hidden = true; sheetWord = null;
  }
  function addToToday() {
    if (!sheetWord) return;
    var q = queue(), key = sheetWord.w;
    if (q.words.indexOf(key) >= 0) { toast("已经在今日里了"); return; }
    q.words.push(key);
    q.total = (q.total || 0) + 1;
    save(); closeSheet(); toast("已加入今日");
    if (window.__mCurrent === "today") renderToday();
  }

  /* ---------------- 阅读 ---------------- */
  function loadUnits(cb) { loadScript("data/m_units.js", "CILIN_M_UNITS", function (ok) { UNITS = window.CILIN_M_UNITS || null; cb(ok && !!UNITS); }); }
  function loadSentZh(cb) {
    loadScript("data/sentzh.js", "CILIN_SENT_ZH", function (ok) {
      SENTZH = window.CILIN_SENT_ZH || null;
      if (SENTZH && !NORMZH) {
        NORMZH = {};
        for (var k in SENTZH) if (SENTZH.hasOwnProperty(k)) NORMZH[normSent(k)] = SENTZH[k];
      }
      cb(ok && !!SENTZH);
    });
  }
  function loadMeta(cb) { loadScript("data/meta.js", "CILIN_META", function (ok) { META = window.CILIN_META || null; cb(ok && !!META); }); }
  function loadQuestions(cb) { loadScript("data/questions.js", "CILIN_QUESTIONS", function (ok) { QUESTIONS = window.CILIN_QUESTIONS || null; cb(ok && !!QUESTIONS); }); }
  function sentenceOf(p, raw, sentences) {
    // 优先用预存完整句（译文表的键就是它们），避免在缩写/引号处被正则切碎
    if (sentences && sentences.length) {
      var norm = function (t) { return String(t || "").toLowerCase().replace(/[^a-z0-9]/g, ""); };
      var pn = norm(p), rn = norm(raw), cursor = 0, fallback = null, i, sn, at;
      for (i = 0; i < sentences.length; i++) {
        sn = norm(sentences[i]);
        if (sn.length < 8) continue;
        at = pn.indexOf(sn, cursor);
        if (at < 0) continue;
        cursor = at + sn.length;
        if (rn && sn.indexOf(rn) < 0) continue;
        if (!fallback) fallback = sentences[i];
        // raw 在段落里的位置落在这句区间内，直接返回
        var rp = norm(p.slice(0, Math.max(0, p.toLowerCase().indexOf(String(raw).toLowerCase()))));
        if (rp.length >= at && rp.length <= at + sn.length + 4) return sentences[i];
      }
      if (fallback) return fallback;
    }
    var parts = p.match(/[^.!?]+[.!?]*/g) || [p], needle = String(raw).toLowerCase(), i2;
    for (i2 = 0; i2 < parts.length; i2++) if (parts[i2].toLowerCase().indexOf(needle) >= 0) return parts[i2].trim();
    return String(p).trim();
  }
  function zhOf(p) {
    if (!SENTZH || !NORMZH) return "";
    var parts = p.match(/[^.!?]+[.!?]*/g) || [p], out = [], i, z;
    for (i = 0; i < parts.length; i++) {
      var s = parts[i].trim();
      if (!s) continue;
      z = SENTZH[s] || NORMZH[normSent(s)];
      if (z) out.push(z);
    }
    return out.join(" ");
  }
  function tokenize(p) {
    var re = /[A-Za-z]+(?:['\u2019][A-Za-z]+)?/g, out = "", last = 0, m;
    while ((m = re.exec(p)) !== null) {
      out += esc(p.slice(last, m.index));
      var raw = m[0], low = raw.toLowerCase();
      if (IDX[low]) out += '<span class="m-tok" data-w="' + esc(low) + '">' + esc(raw) + "</span>";
      else if (raw.length > 2) out += '<span class="m-tok" data-unknown="' + esc(raw) + '">' + esc(raw) + "</span>";
      else out += esc(raw);
      last = m.index + raw.length;
    }
    return out + esc(p.slice(last));
  }
  function findText(code) {
    var p = String(code).split("|"), us = UNITS || [], i, j;
    for (i = 0; i < us.length; i++) if (us[i].id === p[0]) {
      for (j = 0; j < us[i].texts.length; j++) if (us[i].texts[j].id === p[1]) return { unit: us[i], text: us[i].texts[j] };
    }
    return null;
  }
  function renderReadList() {
    var us = UNITS || [], html = "", i, j;
    $("mReadBack").hidden = true;
    $("mReadTools").hidden = true;
    for (i = 0; i < us.length; i++) {
      html += '<div class="m-block"><h3>' + esc(us[i].title) + " · " + esc(us[i].cn) + "</h3>";
      for (j = 0; j < us[i].texts.length; j++) {
        var t = us[i].texts[j], code = us[i].id + "|" + t.id;
        html += '<div class="m-link' + (state.reading[t.id] ? " on" : "") + '" data-text="' + esc(code) + '">' +
          esc(t.label + " · " + t.title) + "<em>" + (state.reading[t.id] ? "已读" : esc(t.subtitle || "")) + "</em></div>";
      }
      html += "</div>";
    }
    txt("mReadBody", html || '<div class="m-empty">暂无课文</div>');
  }
  function renderText(code) {
    var f = findText(code), html = "", i;
    if (!f) { txt("mReadBody", '<div class="m-empty">课文没找到</div>'); return; }
    var t = f.text;
    readParas = t.paras || [];
    readLabel = f.unit.cn + " Unit " + f.unit.id.slice(1) + " · " + t.label + " · " + t.title;
    html += '<div class="m-block"><h3>' + esc(t.label + " · " + t.title) + "</h3>" +
      '<div style="font-size:12px;color:var(--muted)">' + esc(t.subtitle || "") + "</div></div>";
    for (i = 0; i < readParas.length; i++) {
      html += '<p class="m-para" data-p="' + i + '">' + tokenize(readParas[i]) + "</p>";
      var z = zhOf(readParas[i]);
      if (z) html += '<span class="m-zh" data-zh' + (showZh ? "" : " hidden") + ">" + esc(z) + "</span>";
    }
    html += '<div class="m-foot">点带虚线的单词看释义与所在句译文 · 收进「我的词」也能进今日</div>';
    txt("mReadBody", html);
    $("mReadBack").hidden = false;
    $("mReadTools").hidden = false;
    $("mReadZh").innerHTML = showZh ? "隐藏中文" : "显示中文";
    $("mReadDone").innerHTML = state.reading[t.id] ? "✓ 已读" : "标记已读";
  }
  function renderRead() {
    loadUnits(function (ok) {
      if (!ok) { txt("mReadBody", '<div class="m-empty">课文加载失败，检查网络后点「阅读」重试</div>'); return; }
      if (readText) {
        renderText(readText);
        if (!SENTZH) loadSentZh(function () { if (readText && window.__mCurrent === "read") renderText(readText); });
      } else renderReadList();
    });
  }

  /* ---------------- 训练 · 题目生成 ---------------- */
  var TRAIN_GROUPS = [
    { title: "词汇速测 · 8 题", items: [
      { id: "vocab-mixed", name: "混合出题", desc: "英译中、中译英、语境填空、听音拼写交替出现" },
      { id: "vocab-en2zh", name: "英 → 中", desc: "看单词，选意思" },
      { id: "vocab-zh2en", name: "中 → 英", desc: "看意思，选单词" },
      { id: "vocab-cloze", name: "语境填空", desc: "把词放回课文句子里" },
      { id: "vocab-spell", name: "听音拼写", desc: "听发音，写出单词" }
    ] },
    { title: "四级真题", items: [
      { id: "reading", name: "仔细阅读", desc: "读短文，做 5 道选择题" },
      { id: "cloze", name: "选词填空", desc: "15 选 10，把词放回原文" },
      { id: "matching", name: "段落匹配", desc: "找一找这句话出自哪一段" },
      { id: "listening", name: "听力理解", desc: "先听对话，再答题" },
      { id: "translation", name: "段落翻译", desc: "汉译英，对照参考译文自评" },
      { id: "writing", name: "写作", desc: "看题目写提纲，对照范文自评" }
    ] },
    { title: "课本同步 · Unit 1–7", items: [
      { id: "cloze3", name: "三选一填空", desc: "课本原句挖空，三选一" },
      { id: "synonym_u14", name: "同义替换 · 20", desc: "划线词四选一，与期末 Part I B 同型" },
      { id: "review_mcq", name: "复习选择 · 100", desc: "U1–6 复习四选一，随机抽 10 题" },
      { id: "review_tf", name: "复习判断 · 100", desc: "U1–6 复习正误判断" },
      { id: "review_cloze", name: "复习填空 · 100", desc: "U1–6 课文填空自评" },
      { id: "match15", name: "15 词填空", desc: "单元词表匹配 15 个句子" },
      { id: "textbook", name: "课文判断 T/F/NG", desc: "课本练习，判断正误" },
      { id: "translation_u14a", name: "句子翻译", desc: "课件例句汉译英" },
      { id: "paraphrase_u14a", name: "改写练习", desc: "Paraphrasing 复习" },
      { id: "translation_u17", name: "讲义翻译 20 句", desc: "U1–U7 汉译英测验" },
      { id: "translation_hard", name: "进阶翻译 50 句", desc: "高难度长句挑战" },
      { id: "paragraph_drill", name: "段落写作工坊", desc: "找毛病 / 主题句 / 搭段" }
    ] }
  ];
  function trainName(id) {
    var g, i;
    for (g = 0; g < TRAIN_GROUPS.length; g++) {
      for (i = 0; i < TRAIN_GROUPS[g].items.length; i++) {
        if (TRAIN_GROUPS[g].items[i].id === id) return TRAIN_GROUPS[g].items[i].name;
      }
    }
    return "训练";
  }
  function renderTrain() {
    var d = state.days[today()] || { correct: 0, wrong: 0 };
    txt("mTrQuizzes", state.stats.quizzes || 0);
    txt("mTrCorrect", d.correct || 0);
    txt("mTrCombo", state.profile.combo || 0);
    var html = "", g, i;
    for (g = 0; g < TRAIN_GROUPS.length; g++) {
      html += '<div class="m-block"><h3>' + esc(TRAIN_GROUPS[g].title) + "</h3>";
      for (i = 0; i < TRAIN_GROUPS[g].items.length; i++) {
        var it = TRAIN_GROUPS[g].items[i];
        html += '<button class="m-tile" type="button" data-train="' + esc(it.id) + '"><b>' + esc(it.name) +
          "</b><span>" + esc(it.desc) + "</span><em>" + (it.id.indexOf("vocab-") === 0 ? "立即可做" : "按需加载题库") + "</em></button>";
      }
      html += "</div>";
    }
    if (state.sessions && state.sessions.length) {
      html += '<div class="m-block"><h3>最近训练</h3>';
      for (i = 0; i < Math.min(5, state.sessions.length); i++) {
        var s = state.sessions[i];
        html += '<div class="m-journal">' + esc(s.kind || "训练") + " · 答对 " + esc(s.correct) + " / " + esc(s.total) +
          "<em>" + esc(s.day || "") + "</em></div>";
      }
      html += "</div>";
    }
    txt("mTrainBody", html);
  }
  function vocabPool(n) {
    var out = [], used = {}, k, i, w, t = today();
    for (k in state.shadow) if (state.shadow.hasOwnProperty(k) && IDX[k] && IDX[k].z && !isSimple(k)) {
      out.push(IDX[k]); used[k] = 1;
      if (out.length >= n) return out;
    }
    for (k in state.words) if (state.words.hasOwnProperty(k) && IDX[k] && state.words[k].seen && !state.words[k].easy && state.words[k].due <= t && !used[k]) {
      out.push(IDX[k]); used[k] = 1;
      if (out.length >= n) return out;
    }
    var pool = shuffle(WORDS.concat(CUSTOM), Date.now());
    for (i = 0; i < pool.length && out.length < n; i++) {
      w = pool[i];
      if (!used[w.w] && w.z && scopeOK(w)) { out.push(w); used[w.w] = 1; }
    }
    return out;
  }
  function distract(w, n, key) {
    var out = [], tried = 0, all = WORDS, i, x, v;
    while (out.length < n && tried < 400) {
      tried++;
      x = all[Math.floor(Math.random() * all.length)];
      if (!x || x.w === w.w || !x.z) continue;
      v = key === "z" ? x.z : x.w;
      if (!v || v === (key === "z" ? w.z : w.w)) continue;
      var dup = false;
      for (i = 0; i < out.length; i++) if (out[i] === v) dup = true;
      if (!dup) out.push(v);
    }
    return out;
  }
  function explainOf(w) {
    var s = w.z || "";
    if (w.e) s += "｜例句：" + w.e + (w.x ? "（" + w.x + "）" : "");
    return s;
  }
  function vocabQuestion(w, kind) {
    var opts, right, i, q;
    if (kind === "spell") {
      return { type: "spell", stem: "听发音，拼出单词", sub: w.z || "", answer: w.w,
        explain: explainOf(w), speak: w.w, word: w.w, eyebrow: "听音拼写" };
    }
    if (kind === "cloze" && w.e) {
      var re = new RegExp("\\b" + w.w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:s|es|ed|d|ing|ly|er|est)?\\b", "i");
      var m = w.e.match(re);
      if (m) {
        opts = [m[0]].concat(distract(w, 3, "w"));
        opts = shuffle(opts, Date.now());
        right = -1;
        for (i = 0; i < opts.length; i++) if (opts[i] === m[0]) right = i;
        return { type: "choice", stem: "把词填回句子", sub: w.e.replace(m[0], "______"),
          options: opts, answer: right, explain: explainOf(w), speak: w.e, word: w.w, eyebrow: "语境填空" };
      }
    }
    var toZh = kind === "en2zh";
    var correct = toZh ? w.z : w.w;
    opts = [correct].concat(distract(w, 3, toZh ? "z" : "w"));
    opts = shuffle(opts, Date.now() + w.w.length);
    right = -1;
    for (i = 0; i < opts.length; i++) if (opts[i] === correct) right = i;
    if (right < 0) { opts[0] = correct; right = 0; }
    q = { type: "choice", stem: toZh ? w.w : w.z, sub: toZh ? "选出它的意思" : "选出对应的单词",
      options: opts, answer: right, explain: explainOf(w), speak: w.w, word: w.w,
      eyebrow: toZh ? "英 → 中" : "中 → 英" };
    return q;
  }
  function buildVocab(mode) {
    var ws = vocabPool(8), qs = [], kinds = ["en2zh", "zh2en", "cloze", "spell"], i;
    for (i = 0; i < ws.length; i++) {
      var k = mode === "mixed" ? kinds[i % 4] : mode;
      qs.push(vocabQuestion(ws[i], k));
    }
    return qs;
  }
  function optIndex(v, opts) {
    if (typeof v === "number") return v;
    var s = String(v || "").toUpperCase().replace(/[^A-Z]/g, "");
    if (s.length === 1) return "ABCDEFGHIJKLMNO".indexOf(s);
    return -1;
  }
  function passageHTML(p, cap) {
    if (!p) return "";
    var arr = Array.isArray(p) ? p : [p], h = "", i;
    for (i = 0; i < arr.length; i++) h += "<p>" + esc(typeof arr[i] === "string" ? arr[i] : (arr[i].text || arr[i].line || "")) + "</p>";
    return '<div class="m-q-passage">' + h + (cap ? '<div class="m-foot" style="text-align:left;margin-top:6px">' + esc(cap) + "</div>" : "") + "</div>";
  }
  function buildSet(kind, set) {
    set = set || {};
    var qs = [], i, it, j, opts, ans, letters, src = (set.source && set.source.label) || set.source || set.title || "";
    if (kind === "reading" || kind === "listening") {
      var items = set.items || set.questions || [];
      var pg = kind === "listening" ? (set.script || []).map(function (x) { return (x.speaker || "") + ": " + (x.line || ""); }) : set.passage;
      for (i = 0; i < items.length; i++) {
        it = items[i];
        opts = [];
        for (j = 0; j < (it.options || []).length; j++) opts.push(stripOpt(it.options[j]));
        qs.push({ type: "choice", stem: it.stem || it.statement || "", sub: src, passage: passageHTML(pg),
          options: opts, answer: optIndex(it.answer, opts), explain: it.explain || "",
          speak: kind === "listening" ? (set.script || []).map(function (x) { return x.line; }).join(" ") : "",
          eyebrow: (kind === "listening" ? "听力" : "仔细阅读") + " · 第 " + (i + 1) + " 题", stat: kind === "listening" ? "listened" : "" });
      }
      return qs;
    }
    if (kind === "cloze") {
      var keys = Object.keys(set.options || {}).sort();
      opts = [];
      for (i = 0; i < keys.length; i++) opts.push(keys[i] + ". " + set.options[keys[i]]);
      var nums = Object.keys(set.answers || {}).sort(function (a, b) { return Number(a) - Number(b); });
      for (i = 0; i < nums.length; i++) {
        var n = nums[i], letter = set.answers[n];
        ans = -1;
        for (j = 0; j < keys.length; j++) if (keys[j] === letter) ans = j;
        qs.push({ type: "choice", stem: "第 " + n + " 空该填哪个词？", sub: src,
          passage: passageHTML(set.passage), options: opts, answer: ans,
          explain: (set.explains && set.explains[n]) || "", eyebrow: "选词填空 · " + (i + 1) + " / " + nums.length });
      }
      return qs;
    }
    if (kind === "matching") {
      var labels = [];
      for (i = 0; i < (set.passage || []).length; i++) labels.push(set.passage[i].label || String.fromCharCode(65 + i));
      for (i = 0; i < (set.items || []).length; i++) {
        it = set.items[i];
        qs.push({ type: "choice", stem: it.statement || "", sub: "这句话出自哪一段？",
          passage: passageHTML(set.passage), options: labels, answer: optIndex(it.answer, labels),
          explain: it.explain || "", eyebrow: "段落匹配 · 第 " + (i + 1) + " 题" });
      }
      return qs;
    }
    if (kind === "cloze3" || kind === "textbook" || kind === "match15" || kind === "synonym_u14" || kind === "review_mcq" || kind === "review_tf") {
      var words = set.words || [];
      var list = kind === "cloze3" ? QUESTIONS.cloze3 : (kind === "synonym_u14" ? QUESTIONS.synonym_u14 : (kind === "review_mcq" ? QUESTIONS.review_mcq : (kind === "review_tf" ? QUESTIONS.review_tf : (kind === "match15" ? (set.items || []) : (set.items || [])))));
      if (kind === "cloze3" || kind === "synonym_u14" || kind === "review_mcq" || kind === "review_tf") list = shuffle(list, Date.now()).slice(0, 8);
      for (i = 0; i < list.length; i++) {
        it = list[i];
        if (kind === "textbook") {
          opts = ["T 正确", "F 错误", "NG 未提及"];
          ans = String(it.answer || "").toUpperCase().indexOf("NG") === 0 ? 2 : (String(it.answer || "").toUpperCase().indexOf("T") === 0 ? 0 : 1);
        } else if (kind === "review_tf") {
          opts = ["T 正确", "F 错误"];
          ans = String(it.answer || "").toUpperCase().indexOf("T") === 0 ? 0 : 1;
        } else if (kind === "match15") {
          opts = words.slice();
          ans = -1;
          for (j = 0; j < opts.length; j++) if (opts[j] === it.answer) ans = j;
        } else { opts = it.options || []; ans = optIndex(it.answer, opts); }
        qs.push({ type: "choice", stem: it.stem || "", sub: src || set.source || "",
          options: opts, answer: ans, explain: it.explain || set.explain || "",
          eyebrow: (kind === "textbook" ? "课文判断" : kind === "match15" ? "15 词填空" : kind === "synonym_u14" ? "同义替换" : kind === "review_mcq" ? "复习选择" : kind === "review_tf" ? "复习判断" : "三选一") + " · 第 " + (i + 1) + " 题" });
      }
      return qs;
    }
    if (kind === "translation" || kind === "translation_u14a" || kind === "writing" || kind === "paraphrase_u14a" || kind === "translation_u17" || kind === "translation_hard" || kind === "paragraph_drill" || kind === "review_cloze") {
      var arr = QUESTIONS[kind] || [];
      var single = set && (set.zh || set.original || set.topic);
      var picks = single ? [set] : shuffle(arr, Date.now()).slice(0, kind === "writing" ? 1 : (kind === "review_cloze" ? 8 : 4));
      for (i = 0; i < picks.length; i++) {
        it = picks[i];
        var stem = it.zh || it.original || it.topic || it.stem || "";
        var sub = (it.title || "") + (it.cn ? " · " + it.cn : "");
        var ref = it.reference || it.model || it.answer || "";
        var extra = "";
        if (it.keyPhrases && it.keyPhrases.length) extra += "关键词：" + esc(it.keyPhrases.join("、")) + "<br>";
        if (it.tips && it.tips.length) extra += "提示：" + esc(it.tips.join("；")) + "<br>";
        if (it.requirements && it.requirements.length) extra += "要求：" + esc(it.requirements.join("；")) + "<br>";
        if (it.outline && it.outline.length) extra += "提纲：" + esc(it.outline.join("；")) + "<br>";
        if (it.technique) extra += "改写思路：" + esc(it.technique) + "<br>";
        if (it.phrases && it.phrases.length) extra += "可用表达：" + esc(it.phrases.join("；"));
        qs.push({ type: "text", stem: stem, sub: sub, reference: ref, extra: extra,
          explain: it.technique || "", eyebrow: kind === "writing" ? "写作 · 自评" : (kind === "paraphrase_u14a" ? "改写 · 自评" : (kind === "paragraph_drill" ? "段落写作 · 自评" : kind === "review_cloze" ? "复习填空 · 自评" : "翻译 · 自评")),
          stat: kind === "writing" ? "written" : "translated", src: it.source || "" });
      }
      return qs;
    }
    return qs;
  }
  function startTrain(id) {
    if (id.indexOf("vocab-") === 0) {
      var qs = buildVocab(id.slice(6));
      openQuiz(qs, { title: "词汇速测", kind: "vocab" });
      return;
    }
    loadQuestions(function (ok) {
      if (!ok) { toast("题库加载失败，检查网络后重试"); return; }
      var sets = QUESTIONS[id] || [];
      if (!sets.length) { toast("这一组暂时没有题"); return; }
      var direct = { cloze3: 1, synonym_u14: 1, review_mcq: 1, review_tf: 1, review_cloze: 1, translation: 1, translation_u14a: 1, writing: 1, paraphrase_u14a: 1, translation_u17: 1, translation_hard: 1, paragraph_drill: 1 };
      if (direct[id]) {
        openQuiz(buildSet(id, null), { title: trainName(id), kind: id });
        return;
      }
      choosing = id;
      var html = '<div class="m-q-eyebrow">选一套 · 共 ' + sets.length + " 组</div>", i;
      for (i = 0; i < sets.length; i++) {
        html += '<button class="m-tile" type="button" data-set="' + i + '"><b>' +
          esc(sets[i].title || (sets[i].stem || "").slice(0, 36) || "第 " + (i + 1) + " 组") +
          "</b><span>" + esc((sets[i].source && sets[i].source.label) || sets[i].source || sets[i].unit || "") +
          "</span></button>";
      }
      $("mQuizTitle").innerHTML = esc(trainName(id)) + " · 选一套";
      $("mQuizCount").innerHTML = "";
      txt("mQuizBody", html);
      $("mQuiz").hidden = false;
    });
  }

  /* ---------------- 训练 · 答题引擎 ---------------- */
  function openQuiz(qs, opts) {
    if (!qs || !qs.length) { toast("题目还没准备好"); return; }
    choosing = null;
    quiz = { qs: qs, idx: 0, correct: 0, xp: 0, wrong: [], title: (opts && opts.title) || "训练",
      kind: (opts && opts.kind) || "train" };
    $("mQuiz").hidden = false;
    renderQ();
  }
  function closeQuiz() {
    $("mQuiz").hidden = true;
    quiz = null; choosing = null;
    refreshXp();
    renderTab(window.__mCurrent || "today");
  }
  function currentQ() { return quiz ? quiz.qs[quiz.idx] : null; }
  function renderQ() {
    var q = currentQ();
    if (!q) return;
    $("mQuizTitle").innerHTML = esc(quiz.title);
    $("mQuizCount").innerHTML = (quiz.idx + 1) + " / " + quiz.qs.length;
    var h = '<div class="m-q-eyebrow">' + esc(q.eyebrow || "训练") + "</div>";
    h += '<div class="m-q-stem">' + esc(q.stem || "").replace(/«(.+?)»/g, "<u>$1</u>") + "</div>";
    if (q.sub) h += '<div class="m-q-sub">' + esc(q.sub) + "</div>";
    if (q.passage) h += q.passage;
    if (q.extra) h += '<div class="m-q-sub">' + q.extra + "</div>";
    if (q.type === "choice") {
      h += '<div id="mQOpts">';
      for (var i = 0; i < q.options.length; i++) {
        h += '<button class="m-opt" type="button" data-o="' + i + '"><b>' +
          String.fromCharCode(65 + i) + "</b>" + esc(q.options[i]) + "</button>";
      }
      h += "</div>";
    } else if (q.type === "spell" || q.type === "dictation") {
      h += '<input class="m-input" id="mQInput" placeholder="' + (q.type === "spell" ? "拼出你听到的单词" : "写下你听到的句子") + '" autocomplete="off">' +
        '<div class="m-quick"><button class="m-btn m-btn-sm m-btn-main" type="button" data-act="submit-text">提交</button>' +
        (q.speak ? '<button class="m-btn m-btn-sm" type="button" data-act="speak">🔊 再听一遍</button>' : "") + "</div>";
    } else if (q.type === "text") {
      h += '<textarea class="m-input" id="mQInput" placeholder="写下你的答案，写多少都可以"></textarea>' +
        '<div class="m-quick"><button class="m-btn m-btn-sm m-btn-main" type="button" data-act="reveal">看参考答案</button></div>';
    } else if (q.type === "shadow") {
      h += '<div class="m-quick"><button class="m-btn m-btn-sm" type="button" data-act="speak">🔊 听一遍</button>' +
        '<button class="m-btn m-btn-sm" type="button" data-act="reveal">看原文</button></div>';
      h += '<div id="mQText" hidden class="m-fb" style="margin-top:14px"></div>' +
        '<div class="m-quick"><button class="m-btn m-btn-sm m-btn-main" type="button" data-act="shadow-done">跟读完成</button></div>';
    }
    h += '<div id="mQfb"></div>';
    txt("mQuizBody", h);
    $("mQuizBody").scrollTop = 0;
    if (q.speak && (q.type === "spell" || q.type === "shadow" || q.type === "dictation")) setTimeout(function () { speak(q.speak, 0.85); }, 350);
  }
  function showFb(ok, body, extraBtns) {
    var h = '<div class="m-fb ' + (ok ? "ok" : "no") + '"><b>' + (ok ? "对了" : "再看看") + "</b>" + (body || "") + "</div>";
    h += '<div class="m-quick">' + (extraBtns || "") +
      '<button class="m-btn m-btn-sm m-btn-main" type="button" data-act="next">' +
      (quiz.idx + 1 >= quiz.qs.length ? "看结果" : "下一题") + "</button></div>";
    txt("mQfb", h);
  }
  function submitChoice(i) {
    var q = currentQ();
    if (!q || q.answered) return;
    q.answered = true;
    var ok = (i === q.answer);
    var gain = ok ? (q.xp || 1) : 0;
    recordAnswer(ok, q.word, gain, q.stat);
    if (ok) { quiz.correct++; quiz.xp += gain; }
    else if (q.word) quiz.wrong.push(q.word);
    var btns = $("mQOpts") ? $("mQOpts").getElementsByTagName("button") : [], k;
    for (k = 0; k < btns.length; k++) {
      btns[k].disabled = true;
      if (k === q.answer) btns[k].className = "m-opt right";
      else if (k === i) btns[k].className = "m-opt wrong";
    }
    var body = "<div>" + esc(q.explain || explainFor(q)) + "</div>";
    showFb(ok, body, q.speak ? '<button class="m-btn m-btn-sm" type="button" data-act="speak">🔊 听这句</button>' : "");
  }
  function explainFor(q) {
    if (q.answer != null && q.answer >= 0 && q.options && q.options[q.answer]) return "正确答案：" + q.options[q.answer];
    return "";
  }
  function submitText() {
    var q = currentQ();
    if (!q || q.answered) return;
    var el = $("mQInput"), v = el ? String(el.value || "").trim() : "";
    if (!v) { toast("先写一点再提交"); return; }
    q.answered = true;
    var ok, body = "";
    if (q.type === "spell") {
      ok = v.toLowerCase().replace(/\s+/g, " ") === String(q.answer).toLowerCase();
      body = "正确答案：<b>" + esc(q.answer) + "</b><div>" + esc(q.explain || "") + "</div>";
    } else if (q.type === "dictation") {
      var norm = function (s) { return String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim(); };
      var ratio = Math.min(1, norm(v).length / Math.max(1, norm(q.answer).length));
      ok = ratio > 0.7;
      body = "<div class='ref'><b>原文</b><br>" + esc(q.answer) + (q.reference ? "<br>" + esc(q.reference) : "") + "</div>";
    }
    var gain = ok ? (q.xp || 1) : 0;
    recordAnswer(ok, q.word, gain, q.stat);
    if (ok) { quiz.correct++; quiz.xp += gain; }
    else if (q.word) { quiz.wrong.push(q.word); }
    if (el) el.disabled = true;
    showFb(ok, body, "");
  }
  function revealQ() {
    var q = currentQ();
    if (!q) return;
    if (q.type === "shadow") {
      var box = $("mQText");
      if (box) {
        box.hidden = false;
        box.innerHTML = "<b>原文</b><div>" + esc(q.answer) + "</div>" +
          (q.reference ? "<div class='ref'>" + esc(q.reference) + "</div>" : "");
      }
      return;
    }
    if (q.answered) return;
    q.answered = true;
    q.graded = false;
    var box2 = $("mQfb");
    var ref = '<div class="m-fb"><b>参考答案</b><div class="ref">' + esc(q.reference || "") + "</div></div>" +
      '<div class="m-quick">' +
      '<button class="m-btn m-btn-sm" type="button" data-act="self-no">还要练</button>' +
      '<button class="m-btn m-btn-sm m-btn-main" type="button" data-act="self-ok">写得不错 +2</button></div>';
    if (box2) box2.innerHTML = ref;
  }
  function selfGrade(ok) {
    var q = currentQ();
    if (!q) return;
    q.graded = true;
    recordAnswer(ok, null, ok ? 2 : 0, q.stat);
    if (ok) { quiz.correct++; quiz.xp += 2; }
    showFb(ok, ok ? "把它记进手记，下次会更稳。" : "对照参考，再读一遍就好。", "");
  }
  function shadowDone() {
    var q = currentQ();
    if (!q || q.answered) return;
    q.answered = true;
    recordAnswer(true, null, 1, "listened");
    quiz.correct++; quiz.xp += 1;
    showFb(true, "声音走过了。", "");
  }
  function nextQ() {
    var q = currentQ();
    if (q && !q.answered) { toast("先答这道题"); return; }
    if (q && q.graded === false) { toast("先自评一下"); return; }
    quiz.idx++;
    if (quiz.idx >= quiz.qs.length) finishQuiz();
    else renderQ();
  }
  function finishQuiz() {
    recordSession(quiz.title, quiz.correct, quiz.qs.length);
    $("mQuizTitle").innerHTML = "这一程";
    $("mQuizCount").innerHTML = "";
    var pct = Math.round(quiz.correct / Math.max(1, quiz.qs.length) * 100);
    var title = pct >= 80 ? "水很清" : pct >= 60 ? "仍在路上" : "再走一遍";
    var h = '<div class="m-result"><div class="m-q-eyebrow">' + esc(quiz.title) + "</div><h2>" + title + "</h2>" +
      "<p class='m-foot'>答对 " + quiz.correct + " / " + quiz.qs.length + " · 经验 +" + quiz.xp + "</p>";
    if (quiz.wrong.length) {
      h += '<div class="m-fb" style="text-align:left;margin-top:20px"><b>需要回看的词</b><div>' +
        esc(quiz.wrong.join(" · ")) + "</div></div>";
    }
    h += '<div class="m-quick" style="justify-content:center"><button class="m-btn m-btn-sm m-btn-main" type="button" data-act="close">完成</button></div></div>';
    txt("mQuizBody", h);
  }

  /* ---------------- 影子 ---------------- */
  function renderShadow() {
    var keys = Object.keys(state.shadow), html = "", i;
    txt("mShCount", keys.length + ' <small>个待照见 · 已整合 ' + (state.stats.integrated || 0) + "</small>");
    if (!keys.length) {
      txt("mShadowBody", '<div class="m-block"><div class="m-empty">还没有影子<br>答错或遗忘的词会落在这里</div></div>');
      return;
    }
    html = '<div class="m-block"><h3>未照见的影子</h3>';
    for (i = 0; i < keys.length; i++) {
      var k = keys[i], w = IDX[k], meta = state.shadow[k] || {};
      html += '<div class="m-row" style="flex-wrap:wrap"><span class="m-row-w" data-w="' + esc(k) + '">' + esc(k) + "</span>" +
        '<span class="m-row-z" data-w="' + esc(k) + '">' + esc(w ? w.z : "") + "</span>" +
        '<span class="m-row-tag">' + esc(meta.reason || "遗忘") + "</span>" +
        '<div style="flex:1 0 100%;display:flex;gap:8px;margin-top:6px">' +
        '<button class="m-btn m-btn-sm" type="button" data-act="again" data-k="' + esc(k) + '">还没记住</button>' +
        '<button class="m-btn m-btn-sm m-btn-main" type="button" data-act="integrate" data-k="' + esc(k) + '">照见了 +5</button></div></div>';
    }
    html += "</div>";
    var cl = shadowClusters(), pre = "", c, q, g, ws;
    if (cl.length) {
      pre = '<div class="m-block"><h3>错词画像 · 本地推算</h3>' +
        '<p class="m-foot" style="text-align:left;margin:0 0 10px">按词性、词尾与形近把影子归堆，不联网、不写进存档。</p>';
      for (c = 0; c < cl.length; c++) {
        g = cl[c]; ws = [];
        for (q = 0; q < Math.min(6, g.words.length); q++) ws.push(esc(g.words[q]));
        if (g.words.length > 6) ws.push("+" + (g.words.length - 6));
        pre += '<div class="m-row" style="display:block;min-height:0">' +
          '<div style="display:flex;justify-content:space-between;font-size:13px"><b>' + esc(g.label) + '</b>' +
          '<span style="color:var(--muted)">' + g.words.length + ' 个</span></div>' +
          '<div style="font-size:12px;color:var(--ink2);margin-top:5px;line-height:1.7">' + ws.join(" · ") + '</div></div>';
      }
      pre += '<div class="m-foot" style="text-align:left;margin-top:10px">最常一起错的是「' + esc(cl[0].label) + '」，先照见这一类。</div></div>';
    }
    txt("mShadowBody", pre + html);
  }
  function sentencePool(n) {
    var out = [], used = {}, k, i, w;
    for (k in state.shadow) if (state.shadow.hasOwnProperty(k) && IDX[k] && IDX[k].e && IDX[k].x) {
      w = IDX[k]; out.push({ en: w.e, zh: w.x, word: w.w }); used[w.e] = 1;
      if (out.length >= n) return shuffle(out, Date.now());
    }
    var pool = shuffle(WORDS, Date.now());
    for (i = 0; i < pool.length && out.length < n; i++) {
      w = pool[i];
      if (w.e && w.x && !used[w.e] && w.c) { out.push({ en: w.e, zh: w.x, word: w.w }); used[w.e] = 1; }
    }
    return shuffle(out, Date.now());
  }
  function startShadow(mode) {
    var list = sentencePool(5);
    if (!list.length) { toast("还没有可跟读的句子"); return; }
    var qs = [], i;
    for (i = 0; i < list.length; i++) {
      if (mode === "dictation") {
        qs.push({ type: "dictation", stem: "听写 · 写下你听到的句子", sub: "第 " + (i + 1) + " 句",
          answer: list[i].en, reference: list[i].zh, speak: list[i].en, word: list[i].word,
          eyebrow: "听写练习", stat: "listened" });
      } else {
        qs.push({ type: "shadow", stem: "跟读 · 先听一遍，跟着读一遍", sub: "第 " + (i + 1) + " 句",
          answer: list[i].en, reference: list[i].zh, speak: list[i].en, word: list[i].word,
          eyebrow: "跟读花园", stat: "listened" });
      }
    }
    openQuiz(qs, { title: mode === "dictation" ? "听写练习" : "跟读花园", kind: mode });
  }

  /* ---------------- 我的 / 旅程 ---------------- */
  function renderMe() {
    var info = levelInfo(), i, n = 0, k;
    for (k in state.words) if (state.words.hasOwnProperty(k) && state.words[k] && state.words[k].seen) n++;
    txt("mLevel", esc(info.title) + " <small>Lv." + info.lv + " · " + info.xp + " XP</small>");
    $("mLevelBar").style.width = info.pct + "%";
    txt("mLevelHint", info.toNext ? "距离下一境界还需 " + info.toNext + " 经验" : "已抵达自性");
    txt("mStatXp", info.xp);
    txt("mStatWords", n);
    txt("mStatStreak", state.profile.streak || 0);
    txt("mStatDays", Object.keys(state.days).length);
    /* 热力图 */
    var heat = "", d = new Date();
    for (i = 27; i >= 0; i--) {
      var key = addDays(fmt(d), -i), rec = state.days[key], c = rec ? ((rec.words || (rec.studied || []).length) || 0) : 0;
      var lv = c === 0 ? "" : c < 3 ? "l1" : c < 8 ? "l2" : c < 15 ? "l3" : "l4";
      heat += '<i class="' + lv + '" title="' + esc(key) + " · " + c + ' 词"></i>';
    }
    txt("mHeat", heat);
    /* 单元掌握度 */
    renderMastery();
    /* 成就 */
    loadMeta(function (ok) {
      if (!ok) { txt("mBadges", '<h3>路上的印记</h3><div class="m-empty">印记加载失败</div>'); return; }
      checkAchievements();
      var h = '<h3>路上的印记 · ' + Object.keys(state.achievements).length + " / " + META.achievements.length +
        '</h3><div class="m-grid2" style="margin-top:10px">';
      for (var a = 0; a < META.achievements.length; a++) {
        var b = META.achievements[a], on = !!state.achievements[b.id];
        h += '<div class="m-badge ' + (on ? "on" : "locked") + '"><b>' + esc(b.title) + "</b><span>" +
          esc(on ? "已获得 · " + state.achievements[b.id] : b.desc) + "</span></div>";
      }
      txt("mBadges", h + "</div>");
    });
    /* 手记 */
    var jh = "", js = state.journal || [];
    for (i = 0; i < Math.min(3, js.length); i++) {
      jh += '<div class="m-journal">' + esc(js[i].text || "") + "<em>" + esc(js[i].day || "") + "</em></div>";
    }
    txt("mJournalList", jh || '<div class="m-foot" style="text-align:left">手记还是空白</div>');
    /* 设置值 */
    $("mGoal").value = String(state.settings.dailyGoal || 10);
    $("mScope").value = state.settings.vocabScope || "mix";
    $("mName").value = state.profile.name || "";
    $("mRate").value = String(Number(state.settings.rate) || 0.9);
    txt("mRateVal", Number(state.settings.rate || 0.9).toFixed(2));
    txt("mSimpleCount", simpleList().length + " 个 · 查看/恢复");
  }
  function renderMastery() {
    var counts = {}, seen = {}, i, m, w, unit;
    for (i = 0; i < WORDS.length; i++) {
      w = WORDS[i];
      m = /Unit\s*(\d)/i.exec(w.s || "");
      unit = m ? m[1] : null;
      if (!unit || Number(unit) > 7) continue;
      counts[unit] = (counts[unit] || 0) + 1;
      if (state.words[w.w] && state.words[w.w].seen) seen[unit] = (seen[unit] || 0) + 1;
    }
    var h = "<h3>七境的纹理</h3>", any = false;
    for (i = 1; i <= 7; i++) {
      var c = counts[String(i)] || 0;
      if (!c) continue;
      any = true;
      var pct = Math.round((seen[String(i)] || 0) / c * 100);
      h += '<div style="margin-top:10px;font-size:13px">Unit ' + i + " · " + (seen[String(i)] || 0) + " / " + c +
        '<div class="m-bar"><i style="width:' + pct + '%"></i></div></div>';
    }
    if (!any) h += '<div class="m-foot" style="text-align:left">开始学词后，这里会长出纹理</div>';
    txt("mMastery", h);
  }

  /* ---------------- 备份提醒 ---------------- */
  function backupAge() {
    var t = 0;
    try { t = Number(localStorage.getItem(BK_KEY)) || 0; } catch (e) { }
    if (!t) return -1;
    return Math.max(0, Math.floor((Date.now() - t) / 86400000));
  }
  function markBackup() {
    try { localStorage.setItem(BK_KEY, String(Date.now())); } catch (e) { }
  }
  function backupText(age) {
    if (age < 0) return "⚠ 还没备份过 · 进度只在这台设备的浏览器里，清缓存就会消失。";
    if (age === 0) return "上次备份：今天 · 数据只在本机，偶尔导出一份更安心。";
    return age >= BK_DAYS
      ? "⚠ 已经 " + age + " 天没备份了 · 建议现在导出一份。"
      : "上次备份：" + age + " 天前 · 数据只在本机。";
  }
  function refreshBackup() {
    var age = backupAge(), due = age < 0 || age >= BK_DAYS, b = $("mBackupBanner");
    txt("mBackupState", backupText(age));
    if (!b) return;
    txt("mBackupMsg", backupText(age));
    b.hidden = !(due && !backupDismissed);
  }

  /* ---------------- 主题 / 导入导出 ---------------- */
  function setTheme(t) {
    document.documentElement.setAttribute("data-m-theme", t);
    /* 外观是手机版自己的偏好，单独存放；不覆盖桌面版存档里的 settings.theme */
    try { localStorage.setItem("cilin.m.theme", t); } catch (e) { }
    txt("mThemeState", t === "dark" ? "深色" : "浅色");
    $("mTheme").innerHTML = t === "dark" ? "☀ 日" : "☾ 夜";
    var meta = document.getElementsByName("theme-color")[0];
    if (meta) meta.setAttribute("content", t === "dark" ? "#111a16" : "#f7f4ec");
  }
  function toggleTheme() {
    var now = document.documentElement.getAttribute("data-m-theme");
    setTheme(now === "dark" ? "light" : "dark");
  }
  function exportData() {
    try {
      var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = "词林进度-" + today() + ".json";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      markBackup();
      backupDismissed = false;
      refreshBackup();
      toast("进度已导出");
    } catch (e) { toast("这个浏览器不支持导出，请用桌面版"); }
  }
  function importData(file) {
    try {
      var r = new FileReader();
      r.onload = function () {
        try {
          var d = JSON.parse(r.result);
          if (!d || d.v !== 1) { toast("文件格式不对，需要 v1 存档"); return; }
          localStorage.setItem(KEY, JSON.stringify(d));
          toast("导入成功，正在刷新");
          setTimeout(function () { location.reload(); }, 700);
        } catch (e) { toast("文件读不出来"); }
      };
      r.readAsText(file);
    } catch (e) { toast("这个浏览器不支持导入，请用桌面版"); }
  }

  /* ---------------- 事件绑定 ---------------- */
  function ancestorAttr(el, attr, stopId) {
    var n = el;
    while (n && n !== document.body) {
      if (n === $(stopId)) break;
      if (n.getAttribute && n.getAttribute(attr) != null) return n.getAttribute(attr);
      n = n.parentNode;
    }
    return null;
  }
  function ancestorNode(el, attr, stopId) {
    var n = el;
    while (n && n !== document.body) {
      if (n === $(stopId)) break;
      if (n.getAttribute && n.getAttribute(attr) != null) return n;
      n = n.parentNode;
    }
    return null;
  }
  function switchTab(name) {
    if (window.__mTab) window.__mTab(name);
    renderTab(name);
  }
  function bind() {
    $("mCard").onclick = flipCard;
    $("mKnow").onclick = function () { grade(true); };
    $("mAgain").onclick = function () { grade(false); };
    $("mSimple").onclick = gradeSimple;
    $("mSpeak").onclick = function () { var w = currentWord(); if (w) speak(w.w); else toast("今天已经走完了"); };
    $("mQuick").onclick = function () { openQuiz(buildVocab("mixed").slice(0, 3), { title: "今日一题", kind: "vocab" }); };
    $("mMore10").onclick = moreToday;
    $("mGoShadow").onclick = function () { switchTab("shadow"); };

    $("mSearch").oninput = function () {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { buildList(); renderList(); }, 140);
    };
    $("mSearch").onkeyup = $("mSearch").oninput;
    $("mChips").onclick = function (e) {
      var f = ancestorAttr(e.target || e.srcElement, "data-f", "mChips");
      if (!f) return false;
      filter = f;
      var chips = $("mChips").getElementsByTagName("button"), i;
      for (i = 0; i < chips.length; i++) chips[i].className = chips[i].getAttribute("data-f") === f ? "m-chip on" : "m-chip";
      buildList(); renderList();
      return false;
    };
    $("mList").onclick = function (e) {
      var w = ancestorAttr(e.target || e.srcElement, "data-w", "mList");
      if (w) openSheet(IDX[w.toLowerCase()] || null);
      return false;
    };
    $("mMore").onclick = function () { listPage++; renderList(); };
    $("mNewWord").onclick = function () { openEditor("", ""); };

    $("mReadBody").onclick = function (e) {
      var t = e.target || e.srcElement;
      var code = ancestorAttr(t, "data-text", "mReadBody");
      var word = ancestorAttr(t, "data-w", "mReadBody");
      var unknown = ancestorAttr(t, "data-unknown", "mReadBody");
      if (word) {
        var pn = ancestorNode(t, "data-p", "mReadBody");
        var para = pn ? (readParas[Number(pn.getAttribute("data-p"))] || "") : "";
        var raw = t.getAttribute && t.getAttribute("data-w") ? t.getAttribute("data-w") : word;
        var ft = findText(readText);
        var sents = ft ? (ft.text.sentences || []) : [];
        var sent = sentenceOf(para, raw, sents);
        openSheet(IDX[word.toLowerCase()] || null, sent, zhOf(sent));
        return false;
      }
      if (unknown) {
        var pn2 = ancestorNode(t, "data-p", "mReadBody");
        var para2 = pn2 ? (readParas[Number(pn2.getAttribute("data-p"))] || "") : "";
        var ft2 = findText(readText);
        openEditor(unknown, sentenceOf(para2, unknown, ft2 ? (ft2.text.sentences || []) : []));
        return false;
      }
      if (code) { readText = code; showZh = false; renderText(code); if (!SENTZH) loadSentZh(function () { renderText(code); }); return false; }
      return false;
    };
    $("mReadBack").onclick = function () { readText = null; renderReadList(); };
    $("mReadZh").onclick = function () {
      showZh = !showZh;
      var zs = $("mReadBody").getElementsByTagName("span"), i;
      for (i = 0; i < zs.length; i++) if (zs[i].getAttribute("data-zh") != null) zs[i].hidden = !showZh;
      $("mReadZh").innerHTML = showZh ? "隐藏中文" : "显示中文";
    };
    $("mReadSpeak").onclick = function () { speak(readParas.slice(0, 3).join(" "), 0.85); toast("朗读前三段"); };
    $("mReadDone").onclick = function () {
      if (!readText) return;
      var id = readText.split("|")[1];
      if (state.reading[id]) { toast("这篇已经读过了"); return; }
      state.reading[id] = today();
      addXp(2); save();
      $("mReadDone").innerHTML = "✓ 已读";
      toast("已标记 · 经验 +2");
    };

    $("mTrainBody").onclick = function (e) {
      var id = ancestorAttr(e.target || e.srcElement, "data-train", "mTrainBody");
      if (id) startTrain(id);
      return false;
    };
    $("mQuizClose").onclick = closeQuiz;
    $("mQuizBody").onclick = function (e) {
      var t = e.target || e.srcElement;
      var o = ancestorAttr(t, "data-o", "mQuizBody");
      var set = ancestorAttr(t, "data-set", "mQuizBody");
      var act = ancestorAttr(t, "data-act", "mQuizBody");
      if (set != null && choosing) {
        var id = choosing, sets = (QUESTIONS || {})[id] || [], qs = buildSet(id, sets[Number(set)] || sets[0]);
        openQuiz(qs, { title: trainName(id), kind: id });
        return false;
      }
      if (o != null) { submitChoice(Number(o)); return false; }
      if (!act) return false;
      if (act === "submit-text") submitText();
      else if (act === "reveal") revealQ();
      else if (act === "speak") { var q = currentQ(); if (q && q.speak) speak(q.speak, 0.85); }
      else if (act === "self-ok") selfGrade(true);
      else if (act === "self-no") selfGrade(false);
      else if (act === "shadow-done") shadowDone();
      else if (act === "next") nextQ();
      else if (act === "close") closeQuiz();
      return false;
    };

    $("mShadowBody").onclick = function (e) {
      var t = e.target || e.srcElement;
      var act = ancestorAttr(t, "data-act", "mShadowBody");
      var k = ancestorAttr(t, "data-k", "mShadowBody");
      var w = ancestorAttr(t, "data-w", "mShadowBody");
      if (act === "integrate" && k) { integrateShadow(k); renderShadow(); refreshXp(); toast("照见 · 经验 +5"); return false; }
      if (act === "again" && k) {
        var r = state.shadow[k];
        if (r) r.attempts = (r.attempts || 0) + 1;
        save(); toast("没关系，它会再等你一次"); return false;
      }
      if (w) openSheet(IDX[w.toLowerCase()] || null);
      return false;
    };
    $("mShadowRead").onclick = function () { startShadow("shadow"); };
    $("mShadowDict").onclick = function () { startShadow("dictation"); };

    $("mMask").onclick = closeSheet;
    $("mShClose").onclick = closeSheet;
    $("mShAdd").onclick = addToToday;
    $("mShSimple").onclick = function () {
      if (!sheetWord) return;
      var w = sheetWord, was = isSimple(w.w);
      if (was) unmarkSimple(w); else markSimple(w);
      toast(was ? "已恢复复习 · " + w.w : "已标记「太简单」· " + w.w,
        was ? "它会重新出现在到期复习里" : "以后不用再见它");
      closeSheet();
      if (window.__mCurrent === "today") renderToday();
      if (window.__mCurrent === "mine") renderMe();
    };
    $("mShSpeak").onclick = function () { if (sheetWord) speak(sheetWord.w); };
    $("mShEdit").onclick = function () { if (sheetWord) { var k = sheetWord.w; closeSheet(); openEditor(k, "", false); } };
    $("mShEditCard").onclick = function () { if (sheetWord) { var k = sheetWord.w; closeSheet(); openEditor(k, "", true); } };
    $("mShRevertCard").onclick = function () {
      if (!sheetWord) return;
      var k = sheetWord.w;
      if (!window.confirm("把「" + k + "」还原成官方版本？你的修改会被删除。")) return;
      if (state.edits) delete state.edits[k];
      save();
      revertEdit(k);
      toast("已还原官方版");
      closeSheet();
      if (window.__mCurrent === "grove") renderList();
      if (window.__mCurrent === "today") renderToday();
    };
    $("mShDel").onclick = deleteCustom;

    $("mEditMask").onclick = closeEditor;
    $("mEdClose").onclick = closeEditor;
    $("mEdSave").onclick = saveEditor;

    $("mTheme").onclick = toggleTheme;
    $("mTheme2").onclick = toggleTheme;
    $("mGoal").onchange = function () {
      state.settings.dailyGoal = Number(this.value) || 10;
      state.todayQueue = { date: "", words: [] };
      save(); renderTab("today"); toast("每日目标已调整");
    };
    $("mScope").onchange = function () {
      state.settings.vocabScope = this.value;
      state.todayQueue = { date: "", words: [] };
      save(); toast("词汇范围已调整");
    };
    $("mName").onchange = function () {
      state.profile.name = String(this.value || "").trim().slice(0, 12);
      save(); toast("记住了");
    };
    $("mRate").oninput = function () {
      state.settings.rate = Number(this.value) || 0.9;
      txt("mRateVal", state.settings.rate.toFixed(2));
    };
    $("mRate").onchange = function () { save(); speak("The world is quiet here."); };
    $("mJournalSave").onclick = function () {
      var v = String($("mJournal").value || "").trim();
      if (v.length < 2) { toast("写下一点点就好"); return; }
      state.journal.unshift({ day: today(), word: "", text: v });
      state.journal = state.journal.slice(0, 120);
      save(); addXp(2); checkAchievements();
      $("mJournal").value = "";
      toast("已收进手记");
      renderMe();
    };
    $("mExport").onclick = exportData;
    $("mBackupNow").onclick = exportData;
    $("mBackupLater").onclick = function () {
      backupDismissed = true;
      $("mBackupBanner").hidden = true;
    };
    $("mImport").onclick = function () { $("mFile").click(); };
    $("mFile").onchange = function () {
      var f = this.files && this.files[0];
      if (f) importData(f);
      this.value = "";
    };
    $("mReset").onclick = function () {
      if (!resetArmed) {
        resetArmed = true;
        $("mReset").innerHTML = '再点一次确认清空 <em style="color:var(--danger)">会丢失全部进度</em>';
        setTimeout(function () {
          resetArmed = false;
          $("mReset").innerHTML = "重置进度 <em>先导出备份</em>";
        }, 5000);
        return;
      }
      localStorage.removeItem(KEY);
      toast("已重置，正在刷新");
      setTimeout(function () { location.reload(); }, 600);
    };
    $("mMethod").onclick = openMethod;
    $("mMethodClose").onclick = closeMethod;
    $("mSimpleList").onclick = openSimpleList;
    $("mDesktop").onclick = function () { location.href = "index.html?desktop=1"; };
  }

  /* ---------- 已略过的词：查看 / 恢复 ---------- */
  function openSimpleList() {
    function paint() {
      var list = simpleList(), html = "", i;
      if (!list.length) html = '<div class="m-empty">还没有略过的词。在今日卡片或词卡里点「太简单 · 不再复习」。</div>';
      else {
        html = '<div class="m-block"><h3>已略过 · ' + list.length + " 个</h3>";
        for (i = 0; i < list.length; i++) {
          html += '<div class="m-journal"><b>' + esc(list[i].w) + "</b> · " + esc(list[i].z || "") +
            '<button class="m-btn m-btn-sm" data-restore="' + esc(list[i].w) + '" style="float:right">恢复复习</button></div>';
        }
        html += "</div>";
      }
      txt("mQuizBody", html);
      Array.prototype.forEach.call($("mQuiz").querySelectorAll("[data-restore]"), function (b) {
        b.onclick = function () {
          var k = b.getAttribute("data-restore");
          if (unmarkSimple(k)) {
            toast("已恢复复习 · " + k);
            $("mQuizCount").textContent = simpleList().length + " 个";
            paint();
          }
        };
      });
    }
    $("mQuizTitle").textContent = "已略过的词";
    $("mQuiz").hidden = false;
    paint();
  }

  /* ---------- 方法讲义：按需加载桌面同一份数据，手机端只做折叠阅读 ---------- */
  var methodGuide = null, methodCurrent = null;
  function methodBlock(b) {
    var h = '<div class="blk"><h3>' + esc(b.title) + '</h3>', i, j, it, r, ln;
    if (b.kind === "table" || b.kind === "pairs") {
      h += '<div class="kv">';
      var rows = b.kind === "table" ? b.rows : b.items;
      for (i = 0; i < (rows || []).length; i++) {
        r = rows[i];
        if (typeof r === "string") h += '<div><span class="v">· ' + esc(r) + '</span></div>';
        else if (b.kind === "table") h += '<div><span class="k">' + esc(r[0]) + ' · <b style="color:var(--gold)">' + esc(r[1]) + '</b></span><span class="v">' + esc(r[2]) + '</span></div>';
        else h += '<div><span class="k">' + esc(r[0]) + '</span><span class="v">' + esc(r[1]) + '</span></div>';
      }
      h += '</div>';
    } else if (b.kind === "numbered") {
      h += '<ol style="margin:0;padding-left:20px">';
      for (i = 0; i < (b.items || []).length; i++) h += '<li class="small">' + esc(b.items[i]) + '</li>';
      h += '</ol>';
    } else if (b.kind === "bullets" || b.kind === "checklist" || b.kind === "contrast") {
      if (b.kind === "contrast") {
        h += '<div class="small"><b style="color:var(--gold)">✓ 该做</b><div class="muted" style="margin-top:4px">' +
          (b.good || []).map(function (x) { return "· " + esc(x); }).join("<br>") + '</div>' +
          '<b style="color:var(--muted);display:block;margin-top:10px">✗ 别做</b><div class="muted" style="margin-top:4px">' +
          (b.bad || []).map(function (x) { return "· " + esc(x); }).join("<br>") + '</div></div>';
      } else if (b.kind === "bullets") {
        h += '<div class="small muted">' + (b.items || []).map(function (x) { return "· " + esc(x); }).join("<br>") + '</div>';
      } else {
        for (i = 0; i < (b.groups || []).length; i++) {
          h += '<div class="small muted" style="margin-top:8px"><b style="color:var(--ink)">' + esc(b.groups[i][0]) + '</b><div style="margin-top:4px">' +
            (b.groups[i][1] || []).map(function (x) { return "☐ " + esc(x); }).join("<br>") + '</div></div>';
        }
      }
    } else if (b.kind === "quiz") {
      if (b.note) h += '<div class="small muted" style="margin-top:6px">' + esc(b.note) + '</div>';
      for (i = 0; i < (b.items || []).length; i++) {
        it = b.items[i];
        h += '<details><summary>' + esc(it[0]) + '</summary><div><b>' + esc(it[1]) + '</b> · ' + esc(it[2]) + '</div></details>';
      }
    } else if (b.kind === "concept" || b.kind === "note") {
      h += '<div class="' + (b.kind === "note" ? "note" : "small muted") + '">' + esc(b.text) + '</div>';
    } else if (b.kind === "steps") {
      for (i = 0; i < (b.items || []).length; i++) {
        it = b.items[i];
        h += '<div class="step"><i>' + (i + 1) + '</i><div class="small"><b>' + esc(it.t) + '</b><div class="muted">' + esc(it.d) + '</div></div></div>';
      }
    } else if (b.kind === "example") {
      if (b.note) h += '<div class="small muted" style="margin-top:6px">' + esc(b.note) + '</div>';
      h += '<div class="ex">';
      for (i = 0; i < (b.lines || []).length; i++) {
        ln = b.lines[i];
        if (typeof ln === "string") h += '<div class="row muted">' + esc(ln) + '</div>';
        else h += '<div class="row"><span class="tag">' + esc(ln[0]) + '　</span>' + esc(ln[1]) +
          (ln[2] ? '<div class="muted" style="margin-top:2px">' + esc(ln[2]) + '</div>' : "") + '</div>';
      }
      h += '</div>';
    }
    return h + '</div>';
  }
  function paintMethod(id) {
    var g = methodGuide[0], idx = 0, i, lead = "", blocks = "", tabs, body;
    for (i = 0; i < methodGuide.length; i++) if (methodGuide[i].id === id) { g = methodGuide[i]; idx = i; break; }
    methodCurrent = g.id;
    tabs = $("mMethodTabs").getElementsByTagName("button");
    for (i = 0; i < tabs.length; i++) tabs[i].className = tabs[i].getAttribute("data-m-g") === g.id ? "on" : "";
    for (i = 0; i < (g.lead || []).length; i++) lead += '<div class="lead">' + esc(g.lead[i]) + '</div>';
    for (i = 0; i < (g.blocks || []).length; i++) blocks += methodBlock(g.blocks[i]);
    $("mMethodBody").innerHTML = '<div class="eyebrow">' + esc(g.en) + '</div><h2>' + esc(g.title) + '</h2>' + lead + blocks +
      '<div class="foot">内容重编自《能力》课程材料与课件；纯查阅，不影响学习进度。</div>';
    $("mMethodTitle").innerHTML = esc(g.tab);
    $("mMethodCount").innerHTML = (idx + 1) + " / " + methodGuide.length;
    $("mMethodBody").scrollTop = 0;
  }
  function mountMethod() {
    var guide = window.CILIN && window.CILIN.METHOD_GUIDE, tabs = "", i;
    if (!guide || !guide.length) { toast("讲义没能读到，请重试"); return; }
    methodGuide = guide;
    for (i = 0; i < guide.length; i++) tabs += '<button type="button" data-m-g="' + esc(guide[i].id) + '">' + esc(guide[i].tab) + '</button>';
    $("mMethodTabs").innerHTML = tabs;
    var btns = $("mMethodTabs").getElementsByTagName("button");
    for (i = 0; i < btns.length; i++) btns[i].onclick = function () { paintMethod(this.getAttribute("data-m-g")); };
    paintMethod(methodGuide[0].id);
  }
  function openMethod() {
    $("mMethodModal").hidden = false;
    if (methodGuide) { paintMethod(methodCurrent || methodGuide[0].id); return; }
    $("mMethodBody").innerHTML = '<div class="small muted">正在载入讲义…</div>';
    if (window.CILIN && window.CILIN.METHOD_GUIDE) { mountMethod(); return; }
    var s = document.createElement("script");
    s.src = "assets/js/views/method.js";
    s.onload = mountMethod;
    s.onerror = function () { toast("讲义加载失败，请检查网络后重试"); };
    document.body.appendChild(s);
  }
  function closeMethod() { $("mMethodModal").hidden = true; }

  function renderTab(name) {
    if (name === "today") renderToday();
    else if (name === "grove") { if (!listCache.length) buildList(); renderList(); }
    else if (name === "read") renderRead();
    else if (name === "train") renderTrain();
    else if (name === "shadow") renderShadow();
    else if (name === "me") renderMe();
    refreshXp();
    refreshBackup();
  }

  function boot() {
    if (!WORDS.length) {
      showBootFail("词库没有加载成功", "data/m_words.js 没读到。请检查网络后重试，或改用桌面版。");
      return;
    }
    var i;
    for (i = 0; i < WORDS.length; i++) IDX[WORDS[i].w.toLowerCase()] = WORDS[i];
    state = readState();
    mergeCustom();
    applyEdits();
    var saved = "light";
    try { saved = localStorage.getItem("cilin.m.theme") || "light"; } catch (e) { }
    setTheme(saved === "dark" ? "dark" : "light");
    bind();
    window.__mRender = renderTab;
    booted = true;
    window.__mBooted = true;
    $("mBoot").hidden = true;
    renderTab(window.__mCurrent || "today");
  }

  window.__mShowBootFail = showBootFail;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, false);
  else boot();
})();
