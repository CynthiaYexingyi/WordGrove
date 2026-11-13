/* 词林 · 词汇题生成（运行时，无需预置题库） */
(function () {
  const CILIN = (window.CILIN = window.CILIN || {});
  const ui = CILIN.ui;

  function posOf(w) {
    return (w.senses && w.senses[0] && w.senses[0].pos) || "";
  }
  function shortMean(w) {
    if (w.zh) return w.zh.length > 30 ? w.zh.slice(0, 30) + "…" : w.zh;
    const s = (w.senses && w.senses[0]) || null;
    if (s) return s.pos + " " + s.def.slice(0, 22);
    return (w.mean || "").slice(0, 22);
  }
  function explainOf(w) {
    let s = w.zh || w.mean || "";
    const en = (w.ex && w.ex.en) || "";
    const zh = w.exZh || "";
    if (en || zh) s += "｜例句：" + (en || zh) + (en && zh ? "（" + zh + "）" : "");
    return s;
  }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function pickPool(useDue) {
    const all = (CILIN.studyPool ? CILIN.studyPool() : (CILIN.words || [])).filter(function (w) {
      return (w.mean || w.zh) && w.w.length > 1;
    });
    const pool = all.slice();
    if (useDue) {
      const due = CILIN.store.dueWords();
      if (due.length) {
        const dueW = due.map(function (w) { return w.w; });
        const first = due.filter(function (w) { return w.zh || w.mean; });
        const rest = pool.filter(function (w) { return dueW.indexOf(w.w) < 0; });
        return { primary: first, pool: pool.concat(rest) };
      }
    }
    return { primary: pool, pool: pool };
  }

  function distractors(pool, w, n, keyFn) {
    const same = pool.filter(function (x) { return x.w !== w.w && x.w.length > 1 && keyFn(x) === keyFn(w); });
    const other = pool.filter(function (x) { return x.w !== w.w && keyFn(x) !== keyFn(w); });
    const picks = [];
    const used = {};
    const src = same.concat(ui.shuffle(other, ui.hash(w.w + n)));
    for (let i = 0; i < src.length && picks.length < n; i++) {
      const cand = src[i];
      const val = keyFn === posOf ? shortMean(cand) : cand.w;
      if (!val || used[val]) continue;
      used[val] = true;
      picks.push(cand);
    }
    return picks;
  }

  const quiz = {
    types: ["en2zh", "zh2en", "cloze", "spell"],

    question: function (w, kind, pool) {
      const all = pool || pickPool(true).pool;
      if (kind === "en2zh") {
        const opts = [{ text: shortMean(w), right: true }];
        distractors(all, w, 3, posOf).forEach(function (x) { opts.push({ text: shortMean(x), right: false }); });
        const shuffled = ui.shuffle(opts, ui.hash(w.w + "en"));
        return {
          kind: kind, word: w.w, prompt: w.w, sub: w.ipa || "",
          options: shuffled.map(function (o) { return o.text; }),
          answer: shuffled.findIndex(function (o) { return o.right; }),
          explain: explainOf(w), speak: w.w
        };
      }
      if (kind === "zh2en") {
        const opts = [{ text: w.w, right: true }];
        distractors(all, w, 3, posOf).forEach(function (x) { opts.push({ text: x.w, right: false }); });
        const shuffled = ui.shuffle(opts, ui.hash(w.w + "zh"));
        return {
          kind: kind, word: w.w, prompt: shortMean(w), sub: "",
          options: shuffled.map(function (o) { return o.text; }),
          answer: shuffled.findIndex(function (o) { return o.right; }),
          explain: explainOf(w), speak: w.w
        };
      }
      if (kind === "cloze") {
        if (!w.ex) return null;
        const en = w.ex.en;
        const re = new RegExp("\\b" + escRe(w.w) + "(?:s|es|ed|d|ing|ly|er|est)?\\b", "i");
        const m = en.match(re);
        if (!m) return null;
        const blanked = en.replace(m[0], "______");
        const opts = [{ text: m[0], right: true }];
        distractors(all, w, 3, posOf).forEach(function (x) { opts.push({ text: x.w, right: false }); });
        const shuffled = ui.shuffle(opts, ui.hash(w.w + "cloze"));
        return {
          kind: kind, word: w.w, prompt: blanked, sub: "",
          options: shuffled.map(function (o) { return o.text; }),
          answer: shuffled.findIndex(function (o) { return o.right; }),
          explain: explainOf(w) + (w.exZh ? "" : ""), src: w.ex.src,
          speak: w.ex.en
        };
      }
      if (kind === "spell") {
        return {
          kind: kind, word: w.w, prompt: "听发音，拼出单词", sub: w.zh || w.mean || "",
          answer: w.w, explain: explainOf(w), speak: w.w
        };
      }
      return null;
    },

    make: function (opts) {
      opts = opts || {};
      const count = opts.count || 10;
      const kind = opts.kind || "mixed";
      const source = pickPool(opts.useDue !== false);
      let pool = source.primary.length >= count ? source.primary : source.pool;
      pool = ui.shuffle(pool, opts.seed || Date.now());
      const out = [];
      const used = {};
      const kinds = kind === "mixed" ? ["en2zh", "zh2en", "cloze", "spell"] : [kind];
      for (let i = 0; i < pool.length && out.length < count; i++) {
        const w = pool[i];
        if (used[w.w]) continue;
        const k = kinds[out.length % kinds.length];
        const q = this.question(w, k, source.pool);
        if (!q) { const q2 = this.question(w, "en2zh", source.pool); if (!q2) continue; out.push(q2); }
        else out.push(q);
        used[w.w] = true;
      }
      return out;
    },

    checkSpell: function (input, answer) {
      const norm = function (s) { return String(s || "").toLowerCase().trim().replace(/\s+/g, " "); };
      return norm(input) === norm(answer);
    }
  };

  CILIN.quiz = quiz;
})();
