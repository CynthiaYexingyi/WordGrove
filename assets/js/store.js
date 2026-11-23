/* 词林 · 本地存储 / 间隔重复 / 成长 */
(function () {
  const CILIN = (window.CILIN = window.CILIN || {});
  const KEY = "cilin.v1";
  const INTERVALS = [0, 1, 2, 4, 8, 16];   // box 0..5 -> 天数
  const META = window.CILIN_META;

  function defaults() {
    return {
      v: 1,
      createdAt: CILIN.ui.todayKey(),
      settings: { dailyGoal: 10, theme: "dark", rate: 0.9, voiceName: "", sound: true, vocabScope: "mix", readerHighlight: true },
      profile: { xp: 0, streak: 0, longestStreak: 0, lastStudyDay: null, bestCombo: 0, combo: 0, mood: "", name: "" },
      words: {},
      shadow: {},
      days: {},
      reading: {},
      todayQueue: { date: "", words: [] },
      sessions: [],
      journal: [],
      customWords: {},
      edits: {},
      achievements: {},
      stats: { integrated: 0, dailyGoals: 0, translated: 0, written: 0, listened: 0, quizzes: 0 },
      writing: {}
    };
  }

  /* ---------- 记忆强度 / 遗忘预测（纯前端推算，不写存档、不升 state.v） ---------- */
  // box 越大抗遗忘越久；距上次见面按指数衰减；答对率做修正。老存档缺字段时按默认值兜底。
  function memoryOf(state, w, today) {
    const s = state.words[w.w || w];
    if (!s || !s.seen || s.easy) return null;
    const box = Math.min(5, Math.max(0, s.box || 1));
    const right = s.right || 0, wrong = s.wrong || 0;
    const acc = right + wrong ? right / (right + wrong) : 0.5;
    const gap = s.last ? Math.max(0, CILIN.ui.dayDiff(today, s.last)) : 30;
    const stability = Math.max(1, INTERVALS[box] || 1);
    const keep = Math.exp(-gap / (stability * 1.7)) * (0.55 + 0.45 * acc);
    return { keep: Math.round(keep * 100), gap: gap, box: box, wrong: wrong };
  }

  function nearOne(a, b) {
    if (Math.abs(a.length - b.length) > 1 || a.length < 5) return false;
    if (a.length === b.length) {
      let diff = 0;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && ++diff > 1) return false;
      return diff === 1;
    }
    const long = a.length > b.length ? a : b, short = a.length > b.length ? b : a;
    let i = 0, j = 0, skip = 0;
    while (i < long.length && j < short.length) {
      if (long[i] === short[j]) { i++; j++; }
      else { if (++skip > 1) return false; i++; }
    }
    return true;
  }

  // 一个错词可以同时属于多类：词性 / 词尾 / 形近 / 课文单元
  function clusterTags(w, near) {
    const tags = [];
    const raw = (w.senses && w.senses[0] && w.senses[0].pos) || w.pos || (w.zh || "").split(" ")[0] || "";
    const p = String(raw).toLowerCase();
    if (/^n/.test(p)) tags.push("名词");
    else if (/^v/.test(p)) tags.push("动词");
    else if (/^(adj|a\.)/.test(p)) tags.push("形容词");
    else if (/^(adv|ad\.)/.test(p)) tags.push("副词");
    const suf = String(w.w || "").match(/(tion|sion|ment|ness|ity|able|ible|ful|less|ous|ive|ize|ise|ance|ence|ary|ory|al|ic|ly)$/);
    if (suf) tags.push("-" + suf[1] + " 结尾");
    if (near) tags.push("形近易混");
    if (w.ex && w.ex.unit) tags.push("Unit " + String(w.ex.unit).replace(/^u/, "") + " 课文");
    return tags;
  }

  const store = {
    state: defaults(),
    _saveTimer: null,
    _listeners: [],

    init: function () {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved && saved.v === 1) this.state = Object.assign(defaults(), saved);
          // 必备字段兜底
          const d = defaults();
          this.state.settings = Object.assign(d.settings, this.state.settings || {});
          this.state.profile = Object.assign(d.profile, this.state.profile || {});
          this.state.stats = Object.assign(d.stats, this.state.stats || {});
          this.state.words = this.state.words || {};
          this.state.shadow = this.state.shadow || {};
          this.state.days = this.state.days || {};
          this.state.reading = this.state.reading || {};
          this.state.todayQueue = this.state.todayQueue || { date: "", words: [] };
          this.state.customWords = this.state.customWords || {};
          this.state.edits = this.state.edits || {};
          this.state.writing = this.state.writing || {};
          this.state.journal = this.state.journal || [];
          this.state.sessions = this.state.sessions || [];
          this.state.achievements = this.state.achievements || {};
        }
      } catch (e) { console.warn("读取本地进度失败", e); }
      this.applyTheme();
      // 清理过期组合，避免跨天保留
      if (this.state.profile.lastStudyDay !== CILIN.ui.todayKey()) this.state.profile.combo = 0;
      return this;
    },

    save: function () {
      const self = this;
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(function () {
        try { localStorage.setItem(KEY, JSON.stringify(self.state)); }
        catch (e) { CILIN.ui.toast("进度暂存失败", "可能是浏览器存储空间不足"); }
      }, 120);
      this._listeners.forEach(function (fn) { try { fn(self.state); } catch (e) {} });
    },

    onChange: function (fn) { this._listeners.push(fn); },

    today: function () { return CILIN.ui.todayKey(); },

    applyTheme: function () {
      document.documentElement.setAttribute("data-theme", this.state.settings.theme === "light" ? "light" : "dark");
      const m = document.querySelector('meta[name="theme-color"]');
      if (m) m.setAttribute("content", this.state.settings.theme === "light" ? "#f4f0e6" : "#0d1210");
    },
    setTheme: function (t) { this.state.settings.theme = t; this.applyTheme(); this.save(); },
    toggleTheme: function () { this.setTheme(this.state.settings.theme === "light" ? "dark" : "light"); },

    /* ---------- 等级 ---------- */
    levelInfo: function () {
      const xp = this.state.profile.xp || 0;
      let cur = META.levels[0], next = null;
      for (let i = 0; i < META.levels.length; i++) {
        if (xp >= META.levels[i].xp) { cur = META.levels[i]; next = META.levels[i + 1] || null; }
      }
      const prevXp = cur.xp;
      const need = next ? next.xp : cur.xp;
      const pct = next ? Math.round(((xp - prevXp) / (need - prevXp)) * 100) : 100;
      const chapter = META.chapters.find(function (c) { return c.id === cur.chapter; }) || META.chapters[0];
      return { lv: cur.lv, title: cur.title, xp: xp, chapter: chapter, next: next, pct: pct, toNext: next ? Math.max(0, next.xp - xp) : 0 };
    },

    /* 个性化称呼：用户未填时沿用当前等级称号（提灯者/采集者…） */
    displayName: function () {
      const custom = (this.state.profile.name || "").trim();
      if (custom) return custom;
      return this.levelInfo().title;
    },
    setName: function (name) {
      this.state.profile.name = (name || "").trim().slice(0, 12);
      this.save();
    },

    addXp: function (n) {
      if (!n) return { leveled: false };
      const before = this.levelInfo().lv;
      this.state.profile.xp = Math.max(0, (this.state.profile.xp || 0) + n);
      const after = this.levelInfo();
      const day = this.touchDay();
      day.xp = (day.xp || 0) + n;
      this.save();
      return { leveled: after.lv > before, level: after };
    },

    touchDay: function () {
      const today = this.today();
      if (!this.state.days[today]) {
        this.state.days[today] = { words: 0, newWords: 0, reviewWords: 0, correct: 0, wrong: 0, xp: 0, studied: [] };
      }
      const p = this.state.profile;
      if (p.lastStudyDay !== today) {
        const gap = p.lastStudyDay ? CILIN.ui.dayDiff(today, p.lastStudyDay) : null;
        if (gap === 1) p.streak = (p.streak || 0) + 1;
        else p.streak = 1;
        p.longestStreak = Math.max(p.longestStreak || 0, p.streak);
        p.lastStudyDay = today;
        this.save();
      }
      return this.state.days[today];
    },

    dayRecord: function (key) {
      key = key || this.today();
      return this.state.days[key] || null;
    },

    studiedToday: function () {
      const d = this.dayRecord();
      return d ? d.studied || [] : [];
    },

    /* ---------- 单词状态 ---------- */
    stateOf: function (w) { return this.state.words[w] || null; },
    isSeen: function (w) { const s = this.state.words[w]; return !!(s && s.seen); },
    isSimple: function (w) { const s = this.state.words[w.w || w]; return !!(s && s.easy); },

    // 「太简单 · 一遍过」：标记后不再进入到期复习 / 遗忘预测 / 新词池；不删学习记录，可随时恢复。
    markSimple: function (word) {
      const key = word.w || word, today = this.today();
      let s = this.state.words[key];
      if (!s) s = this.state.words[key] = { first: today, seen: 0, box: 1, due: today, right: 0, wrong: 0, last: null };
      s.seen = 1;
      s.box = 5;
      s.easy = 1;
      s.last = today;
      s.due = CILIN.ui.addDays(today, 3650);
      this.removeFromToday(key);
      this.save();
      return true;
    },
    unmarkSimple: function (word) {
      const key = word.w || word, s = this.state.words[key];
      if (!s || !s.easy) return false;
      delete s.easy;
      s.box = 2;
      s.due = this.today();
      this.save();
      return true;
    },
    simpleList: function () {
      const self = this;
      return Object.keys(this.state.words).filter(function (k) { return self.state.words[k].easy && CILIN.wordMap[k]; })
        .map(function (k) { return CILIN.wordMap[k]; });
    },

    wordState: function (w) {
      const s = this.state.words[w];
      if (!s || !s.seen) return "unseen";
      if (s.box >= 4) return "fruit";
      if (s.box >= 2) return "branch";
      return "sprout";
    },

    review: function (word, quality) {
      const today = this.today();
      const w = word.w || word;
      let s = this.state.words[w];
      const isNew = !s || !s.seen;
      if (!s) s = this.state.words[w] = { first: today, seen: 0, box: 1, due: today, right: 0, wrong: 0, last: null };
      // 再次复习（含词卡「再复习一次」、手动加入今日后评分）即视为恢复
      if (s.easy) delete s.easy;
      s.seen = (s.seen || 0) + 1;
      s.last = today;
      const day = this.touchDay();
      if (!day.studied) day.studied = [];
      if (day.studied.indexOf(w) < 0) day.studied.push(w);
      day.words = day.studied.length;
      if (isNew) day.newWords = (day.newWords || 0) + 1;
      let gained = 0;
      if (quality >= 2) {
        s.right = (s.right || 0) + 1;
        s.box = Math.min(5, (s.box || 1) + (quality === 3 ? 2 : 1));
        s.due = CILIN.ui.addDays(today, INTERVALS[s.box]);
        day.correct = (day.correct || 0) + 1;
        if (isNew) gained = 2;
        else if (!(day.reviewed || []).includes(w)) gained = 1;
      } else {
        s.wrong = (s.wrong || 0) + 1;
        s.box = Math.max(0, quality === 0 ? 0 : (s.box || 1));
        s.due = CILIN.ui.addDays(today, quality === 0 ? 1 : INTERVALS[Math.max(1, s.box)]);
        day.wrong = (day.wrong || 0) + 1;
        this.addShadow(w, "遗忘");
      }
      if (!isNew) {
        day.reviewWords = (day.reviewWords || 0) + 1;
        if (!day.reviewed) day.reviewed = [];
        if (day.reviewed.indexOf(w) < 0) day.reviewed.push(w);
      }
      if (gained) this.addXp(gained);
      this.removeFromToday(w);
      this.save();
      this.checkAchievements();
      return { xp: gained, box: s.box, due: s.due, isNew: isNew };
    },

    /* ---------- 今日加练（阅读/词卡 → 今日闭环） ---------- */
    queueWords: function () {
      const q = this.state.todayQueue;
      if (!q || q.date !== this.today()) return [];
      return (q.words || []).map(function (w) { return CILIN.wordMap[w]; }).filter(Boolean);
    },
    addToToday: function (w) {
      const key = w.w || w;
      if (!CILIN.wordMap[key]) return false;
      if (this.state.words[key] && this.state.words[key].easy) this.unmarkSimple(w);
      const today = this.today();
      if (!this.state.todayQueue || this.state.todayQueue.date !== today) {
        this.state.todayQueue = { date: today, words: [] };
      }
      const q = this.state.todayQueue;
      if (q.words.indexOf(key) >= 0) return false;
      q.words.push(key);
      this.save();
      return true;
    },
    removeFromToday: function (key) {
      const q = this.state.todayQueue;
      if (!q || q.date !== this.today()) return;
      q.words = (q.words || []).filter(function (w) { return w !== key; });
      this.save();
    },
    clearTodayQueue: function () {
      this.state.todayQueue = { date: this.today(), words: [] };
      this.save();
    },

    dueWords: function () {
      const today = this.today();
      const list = [];
      const self = this;
      Object.keys(this.state.words).forEach(function (w) {
        const s = self.state.words[w];
        if (s.seen && !s.easy && s.due && s.due <= today) list.push({ w: w, s: s });
      });
      // 遗忘预测：到期词不再只按到期日排，先按「最可能忘」排
      list.sort(function (a, b) {
        const am = memoryOf(self.state, a.w, today) || { keep: 100, wrong: 0 };
        const bm = memoryOf(self.state, b.w, today) || { keep: 100, wrong: 0 };
        if (am.keep !== bm.keep) return am.keep - bm.keep;
        if (a.s.due !== b.s.due) return a.s.due < b.s.due ? -1 : 1;
        return (bm.wrong || 0) - (am.wrong || 0);
      });
      return list.map(function (x) { return CILIN.wordMap ? CILIN.wordMap[x.w] : null; }).filter(Boolean);
    },

    dueCount: function () { return this.dueWords().length; },

    memory: function (w) { return memoryOf(this.state, w, this.today()); },

    // 记忆强度最低的几个已学词，供首页「记忆强度」卡展示
    weakest: function (n) {
      const self = this, today = this.today(), out = [];
      Object.keys(this.state.words).forEach(function (k) {
        const w = CILIN.wordMap && CILIN.wordMap[k];
        const m = memoryOf(self.state, k, today);
        if (w && m) out.push({ word: w, keep: m.keep, gap: m.gap });
      });
      out.sort(function (a, b) { return a.keep - b.keep; });
      return out.slice(0, n || 3);
    },

    // 错词聚类：只统计本机影子，样本 < 3 时不硬凑；不写存档
    shadowClusters: function () {
      const list = this.shadowList();
      if (list.length < 3) return [];
      const words = list.slice(0, 120).map(function (x) { return x.word; });
      const near = {};
      for (let i = 0; i < words.length; i++) {
        for (let j = i + 1; j < words.length; j++) {
          if (nearOne(String(words[i].w).toLowerCase(), String(words[j].w).toLowerCase())) {
            near[words[i].w] = near[words[j].w] = 1;
          }
        }
      }
      const groups = {};
      words.forEach(function (w) {
        clusterTags(w, !!near[w.w]).forEach(function (tag) {
          if (!groups[tag]) groups[tag] = { label: tag, words: [] };
          groups[tag].words.push(w.w);
        });
      });
      return Object.keys(groups).map(function (k) { return groups[k]; })
        .filter(function (g) { return g.words.length >= 2; })
        .sort(function (a, b) { return b.words.length - a.words.length; })
        .slice(0, 4);
    },

    plan: function () {
      const self = this, today = this.today();
      const goal = this.state.settings.dailyGoal || 10;
      const studiedArr = this.studiedToday();
      const remaining = Math.max(0, goal - studiedArr.length);
      const due = this.dueWords();
      const duePick = due.slice(0, 20);
      const queued = this.queueWords().filter(function (w) { return !CILIN.store.state.words[w.w] || CILIN.store.state.words[w.w].last !== CILIN.store.today(); });
      const seenSet = this.state.words;
      const extra = queued.filter(function (w) { return due.every(function (d) { return d.w !== w.w; }); });
      // 遗忘预测：还没到期但保持率已偏低的词，提前安排见一面（最多 3 个）
      const reserved = {};
      extra.forEach(function (w) { reserved[w.w] = 1; });
      duePick.forEach(function (w) { reserved[w.w] = 1; });
      const risk = [];
      Object.keys(seenSet).forEach(function (k) {
        if (reserved[k] || !CILIN.wordMap[k]) return;
        const s = seenSet[k], m = memoryOf(self.state, k, today);
        if (!s || !s.seen || !s.due || s.due <= today) return;
        if (m && m.keep < 50 && m.gap >= 1) risk.push({ word: CILIN.wordMap[k], keep: m.keep, gap: m.gap });
      });
      risk.sort(function (a, b) { return a.keep - b.keep; });
      const riskInfo = risk.slice(0, 3);
      const riskWords = riskInfo.map(function (x) { return x.word; });
      const basePool = (CILIN.studyPool ? CILIN.studyPool() : (CILIN.words || [])).filter(function (w) { return !seenSet[w.w]; });
      const pool = CILIN.ui.shuffle(basePool, CILIN.ui.hash("plan" + this.today()));
      const needFresh = Math.max(0, remaining - due.length - extra.length - riskWords.length);
      const fresh = pool.slice(0, needFresh);
      const queue = extra.concat(duePick).concat(riskWords).concat(fresh);
      return {
        extra: extra,
        due: duePick,
        risk: riskInfo,
        riskTotal: risk.length,
        fresh: fresh,
        queue: queue,
        goal: goal,
        dueTotal: due.length,
        remaining: remaining,
        studied: studiedArr
      };
    },

    /* ---------- 影子 ---------- */
    addShadow: function (w, reason) {
      const today = this.today();
      const rec = this.state.shadow[w] || { added: today, attempts: 0 };
      rec.reason = reason || rec.reason || "遗忘";
      rec.added = rec.added || today;
      rec.last = today;
      this.state.shadow[w] = rec;
      this.save();
    },
    shadowList: function () {
      const self = this;
      return Object.keys(this.state.shadow).map(function (w) {
        const word = CILIN.wordMap ? CILIN.wordMap[w] : null;
        return word ? { word: word, meta: self.state.shadow[w] } : null;
      }).filter(Boolean).sort(function (a, b) {
        return (a.meta.added || "") < (b.meta.added || "") ? 1 : -1;
      });
    },
    shadowCount: function () { return Object.keys(this.state.shadow).length; },
    integrateShadow: function (w) {
      if (!this.state.shadow[w]) return false;
      delete this.state.shadow[w];
      this.state.stats.integrated = (this.state.stats.integrated || 0) + 1;
      const s = this.state.words[w];
      if (s) { s.box = Math.max(s.box || 1, 3); s.due = CILIN.ui.addDays(this.today(), INTERVALS[s.box]); s.right = (s.right || 0) + 1; }
      this.addXp(5);
      this.save();
      this.checkAchievements();
      return true;
    },
    shadowAttempt: function (w) {
      const rec = this.state.shadow[w];
      if (rec) { rec.attempts = (rec.attempts || 0) + 1; this.save(); }
    },

    /* ---------- 答题记录 ---------- */
    recordAnswer: function (correct, opts) {
      opts = opts || {};
      const day = this.touchDay();
      const p = this.state.profile;
      if (correct) {
        day.correct = (day.correct || 0) + 1;
        p.combo = (p.combo || 0) + 1;
        p.bestCombo = Math.max(p.bestCombo || 0, p.combo);
        if (opts.xp !== false) this.addXp(opts.xp || 1);
      } else {
        day.wrong = (day.wrong || 0) + 1;
        p.combo = 0;
        if (opts.word) this.addShadow(opts.word.w || opts.word, "答错");
        this.save();
      }
      this.state.stats.quizzes = (this.state.stats.quizzes || 0) + 1;
      this.save();
      this.checkAchievements();
      return { combo: p.combo };
    },

    recordSession: function (kind, correct, total, extra) {
      this.state.sessions.unshift({
        date: new Date().toISOString(), day: this.today(), kind: kind,
        correct: correct, total: total, extra: extra || null
      });
      this.state.sessions = this.state.sessions.slice(0, 80);
      this.save();
    },

    flag: function (name) {
      this.state.stats[name] = (this.state.stats[name] || 0) + 1;
      this.save();
      this.checkAchievements();
    },

    /* 写作草稿 / 记录：按题目 id 存正文，随进度导出；不升 state.v */
    saveWriting: function (id, text, done) {
      if (!id) return;
      const s = String(text == null ? "" : text);
      const old = (this.state.writing || {})[id] || {};
      this.state.writing[id] = {
        text: s,
        words: (s.trim().match(/[A-Za-z][A-Za-z'-]*/g) || []).length,
        done: done === undefined ? !!old.done : !!done,
        updatedAt: new Date().toISOString()
      };
      this.save();
    },

    writingOf: function (id) { return ((this.state.writing || {})[id]) || null; },

    clearWriting: function (id) {
      if (this.state.writing && this.state.writing[id]) {
        delete this.state.writing[id];
        this.save();
      }
    },

    completeDailyGoal: function () {
      const day = this.dayRecord();
      const plan = this.plan();
      if (day && !day.goalDone && (day.studied || []).length >= plan.goal) {
        day.goalDone = true;
        this.state.stats.dailyGoals = (this.state.stats.dailyGoals || 0) + 1;
        this.addXp(10);
        this.save();
        this.checkAchievements();
        return true;
      }
      return false;
    },

    markRead: function (textId) {
      if (!this.state.reading) this.state.reading = {};
      if (this.state.reading[textId]) return false;
      this.state.reading[textId] = this.today();
      this.addXp(2);
      this.save();
      return true;
    },

    journalAdd: function (word, text) {
      if (!text || !text.trim()) return;
      this.state.journal.unshift({ day: this.today(), word: word || "", text: text.trim() });
      this.state.journal = this.state.journal.slice(0, 120);
      this.addXp(2);
      this.save();
      this.checkAchievements();
    },

    /* ---------- 成就 ---------- */
    checkAchievements: function () {
      const st = this.state;
      const earned = Object.keys(st.achievements).length;
      const learned = Object.keys(st.words).filter(function (w) { const s = st.words[w]; return s && s.seen; }).length;
      const units = {};
      Object.keys(st.words).forEach(function (w) {
        const word = CILIN.wordMap && CILIN.wordMap[w];
        if (word && word.ex && st.words[w].seen) units[word.ex.unit] = true;
      });
      const lv = this.levelInfo().lv;
      const cond = {
        "first-word": learned >= 1,
        "words-10": learned >= 10,
        "words-100": learned >= 100,
        "words-300": learned >= 300,
        "streak-3": (st.profile.streak || 0) >= 3,
        "streak-7": (st.profile.streak || 0) >= 7,
        "streak-30": (st.profile.streak || 0) >= 30,
        "shadow-1": (st.stats.integrated || 0) >= 1,
        "shadow-10": (st.stats.integrated || 0) >= 10,
        "quiz-10": (st.profile.bestCombo || 0) >= 10,
        "level-5": lv >= 5,
        "level-10": lv >= 10,
        "units-all": Object.keys(units).length >= 7,
        "translation-1": (st.stats.translated || 0) >= 1,
        "writing-1": (st.stats.written || 0) >= 1,
        "listening-1": (st.stats.listened || 0) >= 1,
        "journal-3": (st.journal || []).length >= 3,
        "daily-first": (st.stats.dailyGoals || 0) >= 1
      };
      const newly = [];
      const self = this;
      META.achievements.forEach(function (a) {
        if (cond[a.id] && !st.achievements[a.id]) {
          st.achievements[a.id] = self.today();
          newly.push(a);
        }
      });
      if (newly.length) {
        this.state.profile.xp = (this.state.profile.xp || 0) + newly.length * 3;
        this.save();
        newly.forEach(function (a) {
          CILIN.ui.toast("成就 · " + a.title, a.desc);
        });
      }
      return newly;
    },

    /* ---------- 自定义词（阅读里收进来的词） ---------- */
    customWordList: function () {
      const m = this.state.customWords || {};
      return Object.keys(m).map(function (k) { return m[k]; });
    },
    addCustomWord: function (obj) {
      const key = String((obj && obj.w) || "").trim().toLowerCase();
      if (!key) return false;
      if (!this.state.customWords) this.state.customWords = {};
      const prev = this.state.customWords[key] || {};
      this.state.customWords[key] = Object.assign({}, prev, obj, {
        w: key, custom: true, level: "custom", updatedAt: Date.now()
      });
      this.save();
      return true;
    },
    removeCustomWord: function (key) {
      const k = String(key || "").trim().toLowerCase();
      if (!this.state.customWords || !this.state.customWords[k]) return false;
      delete this.state.customWords[k];
      this.save();
      return true;
    },

    /* ---------- 个人编辑覆盖层（大纲词也可个性化；不升 state.v） ---------- */
    editOf: function (w) {
      const k = String(w || "").trim().toLowerCase();
      return (this.state.edits && this.state.edits[k]) || null;
    },
    hasEdit: function (w) { return !!this.editOf(w); },
    saveEdit: function (w, patch) {
      const k = String(w || "").trim().toLowerCase();
      if (!k) return false;
      if (!this.state.edits) this.state.edits = {};
      this.state.edits[k] = Object.assign({}, this.state.edits[k] || {}, patch, { updatedAt: Date.now() });
      this.save();
      return true;
    },
    removeEdit: function (w) {
      const k = String(w || "").trim().toLowerCase();
      if (!this.state.edits || !this.state.edits[k]) return false;
      delete this.state.edits[k];
      this.save();
      return true;
    },
    editList: function () {
      const m = this.state.edits || {};
      return Object.keys(m).map(function (k) { return { w: k, patch: m[k] }; });
    },

    /* ---------- 导入导出 ---------- */
    exportData: function () {
      return JSON.stringify(this.state, null, 2);
    },
    importData: function (text) {
      const obj = JSON.parse(text);
      if (!obj || obj.v !== 1) throw new Error("不是词林的进度文件");
      this.state = Object.assign(defaults(), obj);
      this.applyTheme();
      this.save();
    },
    reset: function () {
      this.state = defaults();
      localStorage.removeItem(KEY);
      this.applyTheme();
      this.save();
    }
  };

  CILIN.store = store;
})();
