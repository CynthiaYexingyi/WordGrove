/* 词林 · 训练 */
(function () {
  const CILIN = (window.CILIN = window.CILIN || {});
  const ui = CILIN.ui;
  const store = function () { return CILIN.store; };
  const Q = function (k) { return (CILIN.questions && CILIN.questions[k]) || []; };

  function sessionShell(title, body, options) {
    options = options || {};
    const ov = document.getElementById("overlay");
    ov.classList.add("overlay-session"); ui.activateOverlay();
    ov.innerHTML = `<div class="sheet">
      <div class="session-top">
        <span class="st-title">${ui.esc(title)}</span>
        <div class="st-progress"><div class="bar"><i style="width:${options.pct || 0}%"></i></div></div>
        <span class="st-count">${ui.esc(options.count || "")}</span>
        <button class="icon-btn" data-close aria-label="关闭">${ui.icon("close", 17)}</button>
      </div>
      <div class="session-body">${body}</div>
    </div>`;
    ov.querySelector("[data-close]").onclick = function () { ui.closeSheet(); CILIN.refreshChrome(); CILIN.reRender(); };
    return ov;
  }

  function scoreSheet(opts) {
    const ov = document.getElementById("overlay");
    ui.activateOverlay();
    ov.classList.add("overlay-session");
    const pct = Math.round((opts.correct / Math.max(1, opts.total)) * 100);
    ov.innerHTML = `<div class="sheet"><div class="session-body" style="text-align:center;padding:36px 26px">
      <div class="eyebrow">${ui.esc(opts.kindLabel || "训练")}</div>
      <h2 style="font-size:30px;margin:10px 0 4px">${pct >= 80 ? "水很清" : pct >= 60 ? "仍在路上" : "再走一遍"}</h2>
      <p class="muted" style="font-size:13px">答对 ${opts.correct} / ${opts.total} · 经验 +${opts.xp || 0}</p>
      ${opts.wrong && opts.wrong.length ? `<div class="q-feedback" style="text-align:left;margin-top:20px">
        <b>需要回看的题</b>
        <div class="small muted" style="margin-top:6px">${opts.wrong.map(function (x) { return ui.esc(x); }).join(" · ")}</div>
      </div>` : ""}
      ${opts.note ? `<p class="small muted mt16">${ui.esc(opts.note)}</p>` : ""}
      <div class="mt24"><button class="btn btn-primary" data-back>回到训练</button></div>
    </div></div>`;
    ov.querySelector("[data-back]").onclick = function () {
      ui.closeSheet();
      CILIN.refreshChrome();
      CILIN.reRender();
    };
  }

  function optionsText(list) {
    return (list || []).map(function (t) { return String(t).replace(/^[A-D][.、]\s*/, ""); });
  }

  /* ---------- 词汇速测 ---------- */
  const VOCAB_MODES = [
    { id: "mixed", name: "混合出题", desc: "英译中、中译英、语境填空、听音拼写交替出现。" },
    { id: "en2zh", name: "英 → 中", desc: "看单词，选意思。" },
    { id: "zh2en", name: "中 → 英", desc: "看意思，选单词。" },
    { id: "cloze", name: "语境填空", desc: "把词放回课文句子里。" },
    { id: "spell", name: "听音拼写", desc: "听发音，写出单词。" }
  ];

  function startVocab(mode) {
    const count = 8;
    const qs = CILIN.quiz.make({ count: count, kind: mode, seed: Date.now() });
    if (!qs.length) { ui.toast("词库还没有准备好"); return; }
    CILIN.session.quiz(qs, {
      title: "词汇速测" + (mode !== "mixed" ? " · " + (VOCAB_MODES.find(function (m) { return m.id === mode; }) || {}).name : ""),
      kind: "vocab",
      kindLabel: "词汇速测",
      onDone: function () { CILIN.refreshChrome(); CILIN.reRender(); }
    });
  }

  function vocabChooser() {
    ui.openSheet(`<div class="sheet-head"><div><div class="eyebrow">VOCAB</div><h3>词汇速测</h3></div>
      <button class="icon-btn" data-close>${ui.icon("close", 18)}</button></div>
      <div class="sheet-body">
        <p class="small muted" style="margin-bottom:14px">从当前词汇范围与到期词里抽 8 个，边测边记。答错的词会落进影子。</p>
        <div class="grid grid-2">
          ${VOCAB_MODES.map(function (m) {
            return `<button class="card card-pad card-hover" data-mode="${m.id}" style="text-align:left;cursor:pointer;border-radius:14px">
              <div class="serif" style="font-size:15px">${ui.esc(m.name)}</div>
              <div class="small muted mt8">${ui.esc(m.desc)}</div>
            </button>`;
          }).join("")}
        </div>
      </div>`);
    const ov = document.getElementById("overlay");
    ov.querySelector("[data-close]").onclick = ui.closeSheet;
    ov.querySelectorAll("[data-mode]").forEach(function (b) {
      b.onclick = function () { startVocab(b.getAttribute("data-mode")); };
    });
  }

  /* ---------- 仔细阅读 ---------- */
  function startReading(set) {
    if (!set) return;
    const items = set.items || [];
    const answers = items.map(function () { return -1; });
    const letters = "ABCD";
    const body = `<div class="q-wrap">
      <div class="passage-meta">
        <span class="eyebrow">READING</span>
        <span class="small faint">${ui.esc(set.title || "")}</span>
        ${set.source && set.source.label ? `<span class="pill">${ui.esc(set.source.label)}</span>` : ""}
      </div>
      <div class="passage">${(set.passage || []).map(function (p) { return `<p>${ui.esc(p)}</p>`; }).join("")}</div>
      <div class="divider"></div>
      ${items.map(function (it, qi) {
        return `<div class="q-block" data-q="${qi}">
          <div class="q-stem" style="font-size:16px">${it.no || qi + 1}. ${ui.esc(it.stem || "")}</div>
          <div class="q-options">${(it.options || []).map(function (o, oi) {
            return `<button class="opt" data-q="${qi}" data-o="${oi}"><span class="opt-key">${letters[oi] || oi + 1}</span><span>${ui.esc(String(o).replace(/^[A-D][.、]\s*/, ""))}</span></button>`;
          }).join("")}</div>
          <div class="fb-slot"></div>
        </div>`;
      }).join("")}
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px">
        <button class="btn btn-primary" data-submit disabled>提交答案</button>
      </div>
    </div>`;
    const ov = sessionShell("仔细阅读 · " + (set.title || ""), body, { count: items.length + " 题" });
    ov.querySelectorAll(".opt").forEach(function (btn) {
      btn.onclick = function () {
        const qi = Number(btn.getAttribute("data-q")), oi = Number(btn.getAttribute("data-o"));
        answers[qi] = oi;
        ov.querySelectorAll(`.opt[data-q="${qi}"]`).forEach(function (b) { b.classList.toggle("selected", b === btn); });
        const submit = ov.querySelector("[data-submit]");
        submit.disabled = answers.some(function (a) { return a < 0; });
      };
    });
    ov.querySelector("[data-submit]").onclick = function () {
      this.disabled = true;
      let correct = 0; const wrong = [];
      items.forEach(function (it, qi) {
        const ok = answers[qi] === it.answer;
        if (ok) correct++; else wrong.push("第 " + (qi + 1) + " 题");
        store().recordAnswer(ok, { xp: 2 });
        ov.querySelectorAll(`.opt[data-q="${qi}"]`).forEach(function (b, oi) {
          b.disabled = true;
          b.classList.remove("correct");
          if (oi === it.answer) b.classList.add("correct");
          else if (oi === answers[qi]) b.classList.add("wrong");
          else b.classList.add("dim");
        });
        const slot = ov.querySelector(`[data-q="${qi}"] .fb-slot`);
        if (slot) slot.innerHTML = `<div class="q-feedback ${ok ? "ok" : "no"}"><b>${ok ? "对" : "再看一眼"}</b>
          <div style="margin-top:6px;color:var(--muted)">${ui.esc(it.explain || "")}</div></div>`;
      });
      store().recordSession("reading", correct, items.length);
      setTimeout(function () {
        scoreSheet({ correct: correct, total: items.length, xp: correct * 2, kindLabel: "仔细阅读", wrong: wrong });
      }, 400);
    };
  }

  /* ---------- 选词填空 ---------- */
  function startCloze(set) {
    if (!set) return;
    const answers = {};
    const blankCount = (set.passage || []).join(" ").match(/__\d+__/g) || [];
    let text = (set.passage || []).join("\n\n");
    text = ui.esc(text);
    // 将 __n__ 替换为可点击空位
    text = text.replace(/__(\d+)__/g, function (m, n) {
      return `<span class="blank" data-blank="${n}">${n}</span>`;
    });
    const keys = Object.keys(set.options || {});
    const body = `<div class="q-wrap">
      <div class="passage-meta"><span class="eyebrow">CLOZE</span><span class="small faint">${ui.esc(set.title || "")}</span>
        ${set.source && set.source.label ? `<span class="pill">${ui.esc(set.source.label)}</span>` : ""}</div>
      <div class="cloze-text">${text.replace(/\n\n/g, "<br><br>")}</div>
      <div class="divider"></div>
      <div class="small muted" style="margin-bottom:8px">先点一个空，再从词库里挑一个词。</div>
      <div class="opt-bank">${keys.map(function (k) {
        return `<button data-opt="${k}"><b>${ui.esc(k)}</b> ${ui.esc(set.options[k])}</button>`;
      }).join("")}</div>
      <div id="fb"></div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px">
        <button class="btn btn-primary" data-submit disabled>提交答案</button>
      </div>
    </div>`;
    const ov = sessionShell("选词填空 · " + (set.title || ""), body, { count: blankCount.length + " 空" });
    let active = null;
    const filled = {};
    function refreshSubmit() {
      const btn = ov.querySelector("[data-submit]");
      if (btn) btn.disabled = Object.keys(filled).length < blankCount.length;
    }
    ov.querySelectorAll(".blank").forEach(function (b) {
      b.onclick = function () {
        ov.querySelectorAll(".blank").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        active = b.getAttribute("data-blank");
      };
    });
    ov.querySelectorAll("[data-opt]").forEach(function (btn) {
      btn.onclick = function () {
        if (!active) { ui.toast("先点一个空"); return; }
        const k = btn.getAttribute("data-opt");
        const blank = ov.querySelector(`.blank[data-blank="${active}"]`);
        // 释放之前该选项的占用
        Object.keys(filled).forEach(function (bn) { if (filled[bn] === k && bn !== active) { delete filled[bn]; const bb = ov.querySelector(`.blank[data-blank="${bn}"]`); if (bb) { bb.textContent = bn; bb.classList.remove("filled"); } } });
        filled[active] = k;
        blank.textContent = k + ". " + set.options[k];
        blank.classList.add("filled");
        blank.classList.add("active");
        refreshSubmit();
      };
    });
    ov.querySelector("[data-submit]").onclick = function () {
      this.disabled = true;
      let correct = 0;
      const wrong = [];
      blankCount.forEach(function (m) {
        const n = m.replace(/__/g, "");
        const ok = filled[n] === set.answers[n];
        const blank = ov.querySelector(`.blank[data-blank="${n}"]`);
        if (ok) { correct++; blank.style.borderColor = "var(--moss)"; blank.style.color = "var(--moss-2)"; }
        else {
          wrong.push("第 " + n + " 空");
          blank.style.borderColor = "var(--red-2)";
          blank.style.color = "var(--red)";
          blank.title = "正确答案：" + set.answers[n];
        }
        const exp = (set.explains && set.explains[n]) || "";
        const fb = ov.querySelector("#fb");
        fb.innerHTML += `<div class="q-feedback ${ok ? "ok" : "no"}" style="margin-bottom:8px"><b>第 ${n} 空 · ${ok ? "对" : "应为 " + ui.esc(set.answers[n]) + " " + ui.esc(set.options[set.answers[n]] || "")}</b>
          <div style="margin-top:4px;color:var(--muted)">${ui.esc(exp)}</div></div>`;
      });
      for (let i = 0; i < correct; i++) store().recordAnswer(true, { xp: 1 });
      for (let i = 0; i < blankCount.length - correct; i++) store().recordAnswer(false);
      store().recordSession("cloze", correct, blankCount.length);
      setTimeout(function () {
        scoreSheet({ correct: correct, total: blankCount.length, xp: correct, kindLabel: "选词填空", wrong: wrong });
      }, 500);
    };
  }

  /* ---------- 长篇匹配 ---------- */
  function startMatching(set) {
    if (!set) return;
    const paras = set.passage || [];
    const items = set.items || [];
    const selects = {};
    const body = `<div class="q-wrap">
      <div class="passage-meta"><span class="eyebrow">MATCHING</span><span class="small faint">${ui.esc(set.title || "")}</span>
        ${set.source && set.source.label ? `<span class="pill">${ui.esc(set.source.label)}</span>` : ""}</div>
      <div class="match-grid">
        <div class="match-passage">${paras.map(function (p) {
          return `<div class="match-para"><b>${ui.esc(p.label)}</b>${ui.esc(p.text)}</div>`;
        }).join("")}</div>
        <div class="match-items">${items.map(function (it, i) {
          return `<div class="match-item" data-i="${i}">
            <span class="faint">${it.no || i + 1}</span>
            <span>${ui.esc(it.statement || "")}</span>
            <select data-i="${i}"><option value="">—</option>${paras.map(function (p) { return `<option value="${ui.esc(p.label)}">${ui.esc(p.label)}</option>`; }).join("")}</select>
          </div>`;
        }).join("")}</div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px">
        <button class="btn btn-primary" data-submit>提交答案</button>
      </div>
      <div id="fb"></div>
    </div>`;
    const ov = sessionShell("长篇阅读 · " + (set.title || ""), body, { count: items.length + " 题" });
    ov.querySelectorAll("select").forEach(function (s) {
      s.onchange = function () { selects[Number(s.getAttribute("data-i"))] = s.value; };
    });
    ov.querySelector("[data-submit]").onclick = function () {
      this.disabled = true;
      let correct = 0; const wrong = [];
      items.forEach(function (it, i) {
        const ok = selects[i] === it.answer;
        if (ok) correct++; else wrong.push("第 " + (it.no || i + 1) + " 题");
        const row = ov.querySelector(`.match-item[data-i="${i}"]`);
        row.classList.add(ok ? "correct" : "wrong");
        const fb = ov.querySelector("#fb");
        fb.innerHTML += `<div class="q-feedback ${ok ? "ok" : "no"}" style="margin-bottom:8px"><b>第 ${it.no || i + 1} 题 · ${ok ? "对" : "应为 " + ui.esc(it.answer)}</b><div style="margin-top:4px;color:var(--muted)">${ui.esc(it.explain || "")}</div></div>`;
      });
      for (let i = 0; i < correct; i++) store().recordAnswer(true, { xp: 1 });
      for (let i = 0; i < items.length - correct; i++) store().recordAnswer(false);
      store().recordSession("matching", correct, items.length);
      setTimeout(function () {
        scoreSheet({ correct: correct, total: items.length, xp: correct, kindLabel: "长篇匹配", wrong: wrong });
      }, 500);
    };
  }

  /* ---------- 翻译 ---------- */
  function startTranslation(set) {
    if (!set) return;
    const body = `<div class="q-wrap">
      <div class="passage-meta"><span class="eyebrow">TRANSLATION</span><span class="small faint">${ui.esc(set.source || "")}</span></div>
      <div class="prompt-zh">${ui.esc(set.zh || "")}</div>
      <div class="field mt16"><label>你的译文</label>
        <textarea id="transInput" rows="7" placeholder="在这里写下你的英文译文…"></textarea></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end">
        <button class="btn btn-line" data-reveal>看参考译文</button>
        <button class="btn btn-primary" data-done>完成这一篇</button>
      </div>
      <div id="refBox" class="mt16" style="display:none">
        <div class="divider"></div>
        <div class="ws-label" style="font-size:10px;letter-spacing:.24em;color:var(--gold-dim)">REFERENCE</div>
        <div class="reference mt8">${ui.esc(set.reference || "")}</div>
        <div class="ws-label mt16" style="font-size:10px;letter-spacing:.24em;color:var(--gold-dim)">KEY PHRASES</div>
        <div class="kv-list mt8">${(set.keyPhrases || []).map(function (k) {
          const en = typeof k === "string" ? k : k.en;
          const zh = typeof k === "string" ? "" : k.zh;
          return `<div><span class="k">${ui.esc(en)}</span><span class="v">${ui.esc(zh || "")}</span></div>`;
        }).join("")}</div>
        ${set.tips && set.tips.length ? `<div class="mt16"><div class="ws-label" style="font-size:10px;letter-spacing:.24em;color:var(--gold-dim)">TIPS</div>
          <ul class="small muted" style="margin:8px 0 0;padding-left:18px">${set.tips.map(function (t) { return `<li>${ui.esc(t)}</li>`; }).join("")}</ul></div>` : ""}
      </div>
    </div>`;
    const ov = sessionShell("汉译英 · " + (set.title || ""), body, { count: "自由练习" });
    ov.querySelector("[data-reveal]").onclick = function () {
      ov.querySelector("#refBox").style.display = "block";
      this.disabled = true;
    };
    ov.querySelector("[data-done]").onclick = function () {
      const val = (ov.querySelector("#transInput").value || "").trim();
      if (val.length < 20) { ui.toast("至少写几句再完成", "写下你的版本，再看参考译文"); return; }
      store().flag("translated");
      store().addXp(8);
      store().recordSession("translation", 1, 1);
      ui.toast("完成一篇翻译", "经验 +8 · 参考译文已对照");
      scoreSheet({ correct: 1, total: 1, xp: 8, kindLabel: "汉译英", note: "翻译没有唯一答案；对照参考译文，挑一处下次想用上的结构。" });
    };
  }

  /* ---------- 写作 ---------- */
  function startWriting(set) {
    if (!set) return;
    const body = `<div class="q-wrap">
      <div class="passage-meta"><span class="eyebrow">WRITING</span><span class="small faint">${ui.esc(set.source || "")}</span></div>
      <div class="q-stem" style="font-size:18px">${ui.esc(set.topic || set.title || "")}</div>
      ${set.cn ? `<p class="small muted" style="margin:-6px 0 12px">${ui.esc(set.cn)}</p>` : ""}
      ${set.requirements && set.requirements.length ? `<div class="chip-row" style="margin-bottom:14px">${set.requirements.map(function (r) { return `<span class="pill">${ui.esc(r)}</span>`; }).join("")}</div>` : ""}
      <div class="field"><label>正文 <span id="wc" class="faint"></span></label>
        <textarea id="writeInput" rows="10" placeholder="Write your essay here…"></textarea></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end">
        <button class="btn btn-line" data-reveal>看范文与提纲</button>
        <button class="btn btn-primary" data-done>完成这一篇</button>
      </div>
      <div id="refBox" class="mt16" style="display:none">
        <div class="divider"></div>
        ${set.outline && set.outline.length ? `<div class="ws-label" style="font-size:10px;letter-spacing:.24em;color:var(--gold-dim)">OUTLINE</div>
          <ol class="small muted" style="margin:8px 0 0;padding-left:20px">${set.outline.map(function (o) { return `<li>${ui.esc(o)}</li>`; }).join("")}</ol>` : ""}
        <div class="ws-label mt16" style="font-size:10px;letter-spacing:.24em;color:var(--gold-dim)">MODEL</div>
        <div class="reference mt8" style="font-family:var(--latin)">${ui.esc(set.model || "")}</div>
        ${set.phrases && set.phrases.length ? `<div class="ws-label mt16" style="font-size:10px;letter-spacing:.24em;color:var(--gold-dim)">USEFUL PHRASES</div>
          <div class="kv-list mt8">${set.phrases.map(function (p) {
            const en = typeof p === "string" ? p : p.en;
            const zh = typeof p === "string" ? "" : p.zh;
            return `<div><span class="k">${ui.esc(en)}</span><span class="v">${ui.esc(zh || "")}</span></div>`;
          }).join("")}</div>` : ""}
      </div>
    </div>`;
    const ov = sessionShell("写作 · " + (set.title || ""), body, { count: "自由练习" });
    const input = ov.querySelector("#writeInput");
    const wc = ov.querySelector("#wc");
    input.addEventListener("input", function () {
      const n = (input.value.trim().match(/[A-Za-z][A-Za-z'-]*/g) || []).length;
      wc.textContent = n + " words";
    });
    ov.querySelector("[data-reveal]").onclick = function () {
      ov.querySelector("#refBox").style.display = "block";
      this.disabled = true;
    };
    ov.querySelector("[data-done]").onclick = function () {
      const n = (input.value.trim().match(/[A-Za-z][A-Za-z'-]*/g) || []).length;
      if (n < 60) { ui.toast("篇幅还太短", "四级写作一般 120–180 词"); return; }
      store().flag("written");
      store().addXp(8);
      store().recordSession("writing", 1, 1);
      ui.toast("完成一篇写作", "经验 +8");
      scoreSheet({ correct: 1, total: 1, xp: 8, kindLabel: "写作", note: "对照范文，挑一个结构或短语，放进你的下一篇。" });
    };
  }

  /* ---------- 听力 ---------- */
  function startListening(set) {
    if (!set) return;
    const questions = set.questions || [];
    let playing = false, idx = 0;
    const body = `<div class="q-wrap">
      <div class="passage-meta"><span class="eyebrow">LISTENING</span><span class="small faint">${ui.esc(set.title || "")}</span></div>
      <div class="card card-pad" style="text-align:center;padding:26px">
        <div style="font-family:var(--latin);font-size:34px;color:var(--gold-2);letter-spacing:.2em">耳朵 · 河流</div>
        <p class="small muted mt8">点下面的按钮听录音，可反复听。语速由系统语音合成。</p>
        <div class="mt16" style="display:flex;gap:10px;justify-content:center">
          <button class="btn btn-primary" data-play>${ui.icon("play", 15)} 播放录音</button>
          <button class="btn btn-line" data-stop>${ui.icon("pause", 15)} 停止</button>
        </div>
        <div class="small faint mt12" id="listenStatus">共 ${(set.script || []).length} 句</div>
      </div>
      <div class="divider"></div>
      ${questions.map(function (q, qi) {
        return `<div class="q-block">
          <div class="q-stem" style="font-size:16px">${q.no || qi + 1}. ${ui.esc(q.stem || "")}</div>
          <div class="q-options">${(q.options || []).map(function (o, oi) {
            return `<button class="opt" data-q="${qi}" data-o="${oi}"><span class="opt-key">${"ABCD"[oi]}</span><span>${ui.esc(String(o).replace(/^[A-D][.、]\s*/, ""))}</span></button>`;
          }).join("")}</div>
        </div>`;
      }).join("")}
      <div id="fb"></div>
      <div style="display:flex;justify-content:flex-end;margin-top:16px">
        <button class="btn btn-primary" data-submit disabled>提交答案</button>
      </div>
      <div id="transcript" style="display:none" class="mt16">
        <div class="divider"></div>
        <div class="ws-label" style="font-size:10px;letter-spacing:.24em;color:var(--gold-dim)">TRANSCRIPT</div>
        <div class="ws-en mt8" style="font-family:var(--latin);font-size:14px;line-height:1.8;color:var(--ink-2)">
          ${(set.script || []).map(function (s) { return `<div><b class="gold">${ui.esc(s.speaker || "")}</b> ${ui.esc(s.line || "")}</div>`; }).join("")}
        </div>
        ${set.transcriptZh ? `<p class="small muted mt8">${ui.esc(set.transcriptZh)}</p>` : ""}
      </div>
    </div>`;
    const ov = sessionShell("听力 · " + (set.title || ""), body, { count: questions.length + " 题" });
    const answers = {};
    function speakAll(offset) {
      const list = set.script || [];
      if (!playing || offset >= list.length) { playing = false; ov.querySelector("#listenStatus").textContent = "播放结束"; return; }
      const line = list[offset];
      ov.querySelector("#listenStatus").textContent = "播放中… " + (offset + 1) + " / " + list.length;
      CILIN.speech.speak((line.speaker ? line.speaker + ": " : "") + line.line, {
        rate: 0.92,
        onend: function () { if (playing) speakAll(offset + 1); }
      });
    }
    ov.querySelector("[data-play]").onclick = function () {
      playing = true; speakAll(0);
    };
    ov.querySelector("[data-stop]").onclick = function () {
      playing = false; CILIN.speech.stop();
      ov.querySelector("#listenStatus").textContent = "已停止";
    };
    ov.querySelectorAll(".opt").forEach(function (btn) {
      btn.onclick = function () {
        const qi = Number(btn.getAttribute("data-q")), oi = Number(btn.getAttribute("data-o"));
        answers[qi] = oi;
        ov.querySelectorAll(`.opt[data-q="${qi}"]`).forEach(function (b) { b.classList.toggle("selected", b === btn); });
        const submit = ov.querySelector("[data-submit]");
        submit.disabled = Object.keys(answers).length < questions.length;
      };
    });
    ov.querySelector("[data-submit]").onclick = function () {
      this.disabled = true; playing = false; CILIN.speech.stop();
      let correct = 0;
      questions.forEach(function (q, qi) {
        const ok = answers[qi] === q.answer;
        if (ok) correct++;
        store().recordAnswer(ok, { xp: 2 });
        ov.querySelectorAll(`.opt[data-q="${qi}"]`).forEach(function (b, oi) {
          b.disabled = true; b.classList.remove("correct");
          if (oi === q.answer) b.classList.add("correct");
          else if (oi === answers[qi]) b.classList.add("wrong");
          else b.classList.add("dim");
        });
        const fb = ov.querySelector("#fb");
        fb.innerHTML += `<div class="q-feedback ${ok ? "ok" : "no"}" style="margin-bottom:8px"><b>第 ${q.no || qi + 1} 题 · ${ok ? "对" : "应为 " + "ABCD"[q.answer]}</b>
          <div style="margin-top:4px;color:var(--muted)">${ui.esc(q.explain || "")}</div></div>`;
      });
      ov.querySelector("#transcript").style.display = "block";
      store().flag("listened");
      store().recordSession("listening", correct, questions.length);
      setTimeout(function () {
        scoreSheet({ correct: correct, total: questions.length, xp: correct * 2, kindLabel: "听力", note: "可以把原文再听一遍，注意连读与重音。" });
      }, 600);
    };
    setTimeout(function () {
      if (CILIN.speech.available) ui.toast("准备好了就播放", "系统语音合成，可反复听");
    }, 300);
  }

  /* ---------- 三选一填空 ---------- */
  function startCloze3() {
    const pool = Q("cloze3").slice().sort(function () { return Math.random() - 0.5; }).slice(0, 10);
    if (!pool.length) { ui.toast("这一类还在生长", "换个题型先练"); return; }
    const chosen = {};
    const body = `<div class="q-wrap">
      <div class="passage-meta"><span class="eyebrow">WORD CHOICE</span><span class="small faint">从三个词里选一个填进句子</span></div>
      ${pool.map(function (it, qi) {
        return `<div class="q-block" data-q="${qi}">
          <div class="q-stem" style="font-size:16px">${qi + 1}. ${ui.esc(it.stem || "").replace(/___/g, '<span class="blank-line">____</span>')}</div>
          <div class="q-options">${(it.options || []).map(function (o, oi) {
            return `<button class="opt" data-q="${qi}" data-o="${oi}"><span class="opt-key">${"ABC"[oi]}</span><span>${ui.esc(o)}</span></button>`;
          }).join("")}</div>
          <div class="fb-slot"></div>
        </div>`;
      }).join("")}
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px">
        <button class="btn btn-primary" data-submit disabled>提交答案</button>
      </div>
    </div>`;
    const ov = sessionShell("三选一填空", body, { count: pool.length + " 题" });
    ov.querySelectorAll(".opt").forEach(function (btn) {
      btn.onclick = function () {
        const qi = Number(btn.getAttribute("data-q")), oi = Number(btn.getAttribute("data-o"));
        chosen[qi] = oi;
        ov.querySelectorAll('.opt[data-q="' + qi + '"]').forEach(function (b) { b.classList.toggle("selected", b === btn); });
        ov.querySelector("[data-submit]").disabled = Object.keys(chosen).length < pool.length;
      };
    });
    ov.querySelector("[data-submit]").onclick = function () {
      this.disabled = true;
      let correct = 0; const wrong = [];
      pool.forEach(function (it, qi) {
        const ok = chosen[qi] === it.answer;
        if (ok) correct++; else wrong.push(qi + 1);
        store().recordAnswer(ok, { xp: 2 });
        ov.querySelectorAll('.opt[data-q="' + qi + '"]').forEach(function (b, oi) {
          b.disabled = true;
          if (oi === it.answer) b.classList.add("correct");
          else if (oi === chosen[qi]) b.classList.add("wrong");
          else b.classList.add("dim");
        });
        const slot = ov.querySelector('.q-block[data-q="' + qi + '"] .fb-slot');
        if (slot) slot.innerHTML = `<div class="q-feedback ${ok ? "ok" : "no"}"><b>${ok ? "对" : "应为 " + it.options[it.answer]}</b><div style="margin-top:4px;color:var(--muted)">${ui.esc(it.explain || "")}</div></div>`;
      });
      store().recordSession("cloze3", correct, pool.length);
      setTimeout(function () {
        scoreSheet({ correct: correct, total: pool.length, xp: correct * 2, kindLabel: "三选一填空", wrong: wrong.map(function (n) { return "第 " + n + " 题"; }) });
      }, 600);
    };
  }

  /* ---------- 15 词匹配 ---------- */
  function startMatch15(set) {
    if (!set) return;
    const words = set.words || [], items = set.items || [];
    const chosen = {};
    const body = `<div class="q-wrap">
      <div class="passage-meta"><span class="eyebrow">15 WORDS · 15 SENTENCES</span><span class="small faint">${ui.esc(set.source || "")}</span></div>
      <div class="card card-pad" style="padding:14px 16px"><div class="ws-label">词库</div>
        <div class="syn-list" style="margin-top:8px">${words.map(function (w) { return `<span class="syn-chip">${ui.esc(w)}</span>`; }).join("")}</div>
      </div>
      <div class="mt16">
        ${items.map(function (it, qi) {
          return `<div class="q-block" data-q="${qi}">
            <div class="q-stem" style="font-size:15px">${it.no || qi + 1}. ${ui.esc(it.stem || "").replace(/___/g, '<span class="blank-line">____</span>')}</div>
            <div class="mt8"><select class="match-select" data-q="${qi}"><option value="">— 选一个词 —</option>${words.map(function (w) { return `<option value="${ui.attr(w)}">${ui.esc(w)}</option>`; }).join("")}</select></div>
          </div>`;
        }).join("")}
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px">
        <button class="btn btn-primary" data-submit disabled>提交匹配</button>
      </div>`;
    const ov = sessionShell("15 词匹配 · " + (set.title || ""), body, { count: items.length + " 句" });
    ov.querySelectorAll(".match-select").forEach(function (sel) {
      sel.onchange = function () {
        chosen[Number(sel.getAttribute("data-q"))] = sel.value;
        ov.querySelector("[data-submit]").disabled = Object.keys(chosen).filter(function (k) { return chosen[k]; }).length < items.length;
      };
    });
    ov.querySelector("[data-submit]").onclick = function () {
      this.disabled = true;
      let correct = 0; const wrong = [];
      items.forEach(function (it, qi) {
        const ok = (chosen[qi] || "").toLowerCase() === String(it.answer || "").toLowerCase();
        if (ok) correct++; else wrong.push(qi + 1);
        const block = ov.querySelector('.q-block[data-q="' + qi + '"]');
        if (block) block.insertAdjacentHTML("beforeend", `<div class="q-feedback ${ok ? "ok" : "no"}"><b>${ok ? "对" : "应为 " + ui.esc(it.answer)}</b></div>`);
        store().recordAnswer(ok, { xp: 1 });
      });
      store().recordSession("match15", correct, items.length);
      setTimeout(function () {
        scoreSheet({ correct: correct, total: items.length, xp: correct, kindLabel: "15 词匹配", wrong: wrong.map(function (n) { return "第 " + n + " 句"; }) });
      }, 600);
    };
  }

  /* ---------- 课本原题 T/F/NG ---------- */
  function startTextbook(set) {
    if (!set) return;
    const items = set.items || [];
    const text = (CILIN.textMap && CILIN.textMap[set.text]) || null;
    const passage = text && text.paragraphs ? `<details class="card card-pad" style="padding:14px 16px;margin-bottom:14px"><summary class="small gold" style="cursor:pointer">展开原文 · ${ui.esc(text.title || "")}</summary><div class="passage mt12">${text.paragraphs.map(function (p) { return `<p>${ui.esc(p)}</p>`; }).join("")}</div></details>` : "";
    const chosen = {};
    const body = `<div class="q-wrap">
      <div class="passage-meta"><span class="eyebrow">TEXTBOOK · TRUE / FALSE / NOT GIVEN</span><span class="small faint">${ui.esc(set.title || "")}</span></div>
      ${passage}
      ${items.map(function (it, qi) {
        return `<div class="q-block" data-q="${qi}">
          <div class="q-stem" style="font-size:15px">${it.no || qi + 1}. ${ui.esc(it.stem || "")}</div>
          <div class="q-options">${["TRUE", "FALSE", "NOT GIVEN"].map(function (o, oi) {
            return `<button class="opt" data-q="${qi}" data-o="${oi}"><span class="opt-key">${"ABC"[oi]}</span><span>${o}</span></button>`;
          }).join("")}</div>
          <div class="fb-slot"></div>
        </div>`;
      }).join("")}
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px">
        <button class="btn btn-primary" data-submit disabled>提交答案</button>
      </div>
    </div>`;
    const ov = sessionShell("课本原题 · " + (set.title || ""), body, { count: items.length + " 题" });
    ov.querySelectorAll(".opt").forEach(function (btn) {
      btn.onclick = function () {
        const qi = Number(btn.getAttribute("data-q")), oi = Number(btn.getAttribute("data-o"));
        chosen[qi] = oi;
        ov.querySelectorAll('.opt[data-q="' + qi + '"]').forEach(function (b) { b.classList.toggle("selected", b === btn); });
        ov.querySelector("[data-submit]").disabled = Object.keys(chosen).length < items.length;
      };
    });
    ov.querySelector("[data-submit]").onclick = function () {
      this.disabled = true;
      let correct = 0; const wrong = [];
      const letters = ["T", "F", "NG"];
      items.forEach(function (it, qi) {
        const ok = letters[chosen[qi]] === String(it.answer || "").toUpperCase();
        if (ok) correct++; else wrong.push(qi + 1);
        store().recordAnswer(ok, { xp: 2 });
        ov.querySelectorAll('.opt[data-q="' + qi + '"]').forEach(function (b, oi) {
          b.disabled = true;
          if (letters[oi] === String(it.answer || "").toUpperCase()) b.classList.add("correct");
          else if (oi === chosen[qi]) b.classList.add("wrong");
          else b.classList.add("dim");
        });
        const slot = ov.querySelector('.q-block[data-q="' + qi + '"] .fb-slot');
        if (slot) slot.innerHTML = `<div class="q-feedback ${ok ? "ok" : "no"}"><b>${ok ? "对" : "答案 " + ui.esc(it.answer)}</b><div style="margin-top:4px;color:var(--muted)">${ui.esc(it.explain || "")}</div></div>`;
      });
      store().recordSession("textbook", correct, items.length);
      setTimeout(function () {
        scoreSheet({ correct: correct, total: items.length, xp: correct * 2, kindLabel: "课本原题", wrong: wrong.map(function (n) { return "第 " + n + " 题"; }) });
      }, 600);
    };
  }

  /* ---------- Paraphrase ---------- */
  function startParaphrase(set) {
    if (!set) return;
    const body = `<div class="q-wrap">
      <div class="passage-meta"><span class="eyebrow">PARAPHRASE · U1–U4 TEXT A</span><span class="small faint">${ui.esc(set.source || "")}</span></div>
      <div class="ws-label">原句</div>
      <div class="prompt-zh" style="font-size:16px">${ui.esc(set.original || "")}</div>
      <div class="field mt16"><label>你的改写</label><textarea id="ppInput" rows="5" placeholder="换结构、换词，保留原意…"></textarea></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end">
        <button class="btn btn-line" data-reveal>看参考改写</button>
        <button class="btn btn-primary" data-done>完成这一句</button>
      </div>
      <div id="ppRef" class="mt16" style="display:none">
        <div class="divider"></div>
        <div class="ws-label">REFERENCE</div>
        <div class="reference mt8">${ui.esc(set.reference || "")}</div>
        ${set.technique ? `<p class="small muted mt8">技巧：${ui.esc(set.technique)}</p>` : ""}
      </div>
    </div>`;
    const ov = sessionShell("Paraphrase · " + (set.title || ""), body, { count: "自由练习" });
    ov.querySelector("[data-reveal]").onclick = function () { ov.querySelector("#ppRef").style.display = "block"; this.disabled = true; };
    ov.querySelector("[data-done]").onclick = function () {
      const val = (ov.querySelector("#ppInput").value || "").trim();
      if (val.length < 15) { ui.toast("再写一句", "至少写一个完整的改写"); return; }
      store().recordSession("paraphrase", 1, 1);
      store().addXp(6);
      scoreSheet({ correct: 1, total: 1, xp: 6, kindLabel: "Paraphrase", note: "改写没有唯一答案；对照参考，保留原意、换掉结构。" });
    };
  }

  /* ---------- 题型选择 ---------- */
  function chooseSet(kind, title, label) {
    const list = Q(kind);
    if (!list.length) { ui.toast("这一类还在生长", "换个题型先练"); return; }
    if (list.length === 1) { launch(kind, list[0]); return; }
    ui.openSheet(`<div class="sheet-head"><div><div class="eyebrow">${ui.esc(label || kind)}</div><h3>${ui.esc(title)}</h3></div>
      <button class="icon-btn" data-close>${ui.icon("close", 18)}</button></div>
      <div class="sheet-body"><div class="grid" style="gap:8px">
        ${list.map(function (x, i) {
          return `<button class="card card-pad card-hover" data-pick="${i}" style="text-align:left;cursor:pointer;border-radius:12px;padding:14px 16px">
            <div class="serif" style="font-size:14px">${ui.esc(x.title || ("第 " + (i + 1) + " 组"))}</div>
            <div class="small muted mt8">${ui.esc((x.source && x.source.label) || x.source || "")}</div>
          </button>`;
        }).join("")}
      </div></div>`);
    const ov = document.getElementById("overlay");
    ov.querySelector("[data-close]").onclick = ui.closeSheet;
    ov.querySelectorAll("[data-pick]").forEach(function (b) {
      b.onclick = function () { launch(kind, list[Number(b.getAttribute("data-pick"))]); };
    });
  }
  function launch(kind, set) {
    if (kind === "reading") startReading(set);
    else if (kind === "cloze") startCloze(set);
    else if (kind === "matching") startMatching(set);
    else if (kind === "translation") startTranslation(set);
    else if (kind === "writing") startWriting(set);
    else if (kind === "listening") startListening(set);
    else if (kind === "cloze3") startCloze3(set);
    else if (kind === "match15") startMatch15(set);
    else if (kind === "translation_u14a") startTranslation(set);
    else if (kind === "paraphrase_u14a") startParaphrase(set);
    else if (kind === "textbook") startTextbook(set);
  }

  /* ---------- Hub ---------- */
  function lastSession(kind) {
    return (store().state.sessions || []).find(function (s) { return s.kind === kind; }) || null;
  }
  function card(kind, icon, title, en, desc, footText, action, disabled) {
    return `<article class="card card-pad card-hover train-card ${disabled ? "disabled" : ""}" data-train="${kind}">
      <span class="tc-ic">${ui.icon(icon, 18)}</span>
      <h3>${ui.esc(title)}<span class="small faint" style="margin-left:8px;font-family:var(--latin);letter-spacing:.08em">${ui.esc(en)}</span></h3>
      <p>${ui.esc(desc)}</p>
      <div class="tc-foot"><span>${footText}</span><span class="pill ${disabled ? "" : "gold"}">${disabled ? "生长中" : "开始"}</span></div>
    </article>`;
  }

  function render(root) {
    const vocabDone = lastSession("vocab");
    const due = store().dueCount();
    const counts = {
      reading: Q("reading").length, cloze: Q("cloze").length, matching: Q("matching").length,
      translation: Q("translation").length, writing: Q("writing").length, listening: Q("listening").length,
      cloze3: Q("cloze3").length, match15: Q("match15").length, translation_u14a: Q("translation_u14a").length,
      paraphrase_u14a: Q("paraphrase_u14a").length, textbook: Q("textbook").length
    };
    root.innerHTML = `<div class="page">
      <div class="page-head">
        <div>
          <div class="eyebrow">PRACTICE</div>
          <h1>训练</h1>
          <div class="sub">题不是障碍，是照见自己的方式。先挑一种，做一组就好。</div>
        </div>
        <div class="head-side"><span class="pill">到期词 ${due}</span></div>
      </div>

      <div class="train-grid">
        ${card("vocab", "leaf", "词汇速测", "VOCAB", "英译中 / 中译英 / 语境填空 / 听音拼写。答错的词会落进影子。", vocabDone ? "上次 " + vocabDone.correct + "/" + vocabDone.total : "随时可做", "", false)}
        ${card("cloze", "pen", "选词填空", "BANKED CLOZE", "15 词 10 空，词汇与搭配的直觉训练。", counts.cloze ? counts.cloze + " 套" : "", "", !counts.cloze)}
        ${card("reading", "book", "仔细阅读", "READING", "从课文摘一段，五道题，练定位与推断。", counts.reading ? counts.reading + " 篇" : "", "", !counts.reading)}
        ${card("matching", "ring", "长篇匹配", "MATCHING", "十句改写，回到段落里找它的出处。", counts.matching ? counts.matching + " 套" : "", "", !counts.matching)}
        ${card("translation", "river", "汉译英", "TRANSLATION", "真题题干，先写，再对照参考译文。", counts.translation ? counts.translation + " 题" : "", "", !counts.translation)}
        ${card("writing", "pen", "写作", "WRITING", "四级题干，120–180 词，写完看范文与结构。", counts.writing ? counts.writing + " 题" : "", "", !counts.writing)}
        ${card("listening", "ear", "听力微练", "LISTENING", "用系统语音合成，听对话/短文，再答题。", counts.listening ? counts.listening + " 组" : "", "", !counts.listening)}
        ${card("cloze3", "pen", "三选一填空", "3-CHOICE CLOZE", "一句一空，三个词里选一个；按课文/课件语境出题。", counts.cloze3 ? counts.cloze3 + " 题" : "", "", !counts.cloze3)}
        ${card("match15", "ring", "15 词匹配", "15 WORDS · 15 SENTENCES", "15 个词对应 15 个挖空句，一一匹配。", counts.match15 ? counts.match15 + " 套" : "", "", !counts.match15)}
        ${card("translation_u14a", "river", "汉译英 · U1–U4", "TEXT A TRANSLATION", "U1–U4 Text A 的句段翻译，先写再看参考。", counts.translation_u14a ? counts.translation_u14a + " 题" : "", "", !counts.translation_u14a)}
        ${card("paraphrase_u14a", "leaf", "Paraphrase", "U1–U4 TEXT A", "换结构、换词，保留原意；以课件 paraphrasing 方法为依据。", counts.paraphrase_u14a ? counts.paraphrase_u14a + " 句" : "", "", !counts.paraphrase_u14a)}
        ${card("textbook", "book", "课本原题", "TEXTBOOK T/F/NG", "教材 Exercise 1 原题，答案据教师 key。", counts.textbook ? counts.textbook + " 套" : "", "", !counts.textbook)}
        <article class="card card-pad train-card wide" style="cursor:default">
          <span class="tc-ic">${ui.icon("shadow", 18)}</span>
          <h3>影子 · 跟读与听写</h3>
          <p>把遗忘的词放回句子里，跟着声音读一遍，或用听写确认它是否真的属于你。</p>
          <div class="tc-foot"><span>${store().shadowCount()} 个影子待照见</span><button class="btn btn-line btn-sm" data-go-shadow>去影子</button></div>
        </article>
      </div>
      <div class="mt24 small faint">题库共 ${counts.reading + counts.cloze + counts.matching + counts.translation + counts.writing + counts.listening + counts.cloze3 + counts.match15 + counts.translation_u14a + counts.paraphrase_u14a + counts.textbook} 组材料；词汇速测由全词表按「旅程 → 词汇范围」实时生成。</div>
    </div>`;

    root.querySelectorAll("[data-train]").forEach(function (c) {
      c.onclick = function () {
        const kind = c.getAttribute("data-train");
        if (kind === "vocab") { vocabChooser(); return; }
        if (kind === "cloze3") { startCloze3(); return; }
        chooseSet(kind, { cloze: "选词填空", reading: "仔细阅读", matching: "长篇匹配", translation: "汉译英", writing: "写作", listening: "听力微练", match15: "15 词匹配", translation_u14a: "汉译英 · U1–U4", paraphrase_u14a: "Paraphrase", textbook: "课本原题" }[kind], kind.toUpperCase());
      };
    });
    const gs = root.querySelector("[data-go-shadow]");
    if (gs) gs.onclick = function () { CILIN.go("/shadow"); };
  }

  CILIN.views = CILIN.views || {};
  CILIN.views.train = { render: render, startVocab: startVocab, _start: { reading: startReading, cloze: startCloze, matching: startMatching, translation: startTranslation, writing: startWriting, listening: startListening, cloze3: startCloze3, match15: startMatch15, translation_u14a: startTranslation, paraphrase_u14a: startParaphrase, textbook: startTextbook } };
})();
