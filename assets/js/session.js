/* 词林 · 学习会话（闪卡 / 答题） */
(function () {
  const CILIN = (window.CILIN = window.CILIN || {});
  const ui = CILIN.ui;
  const store = function () { return CILIN.store; };

  function shell(title, body, foot) {
    return `<div class="session-top">
      <span class="st-title">${ui.esc(title)}</span>
      <div class="st-progress"><div class="bar"><i style="width:0%"></i></div></div>
      <span class="st-count"></span>
      <button class="icon-btn" data-close aria-label="关闭">${ui.icon("close", 17)}</button>
    </div>
    <div class="session-body">${body}</div>
    ${foot ? `<div class="session-foot">${foot}</div>` : ""}`;
  }

  function bindClose(onClose) {
    const ov = document.getElementById("overlay");
    const btn = ov.querySelector("[data-close]");
    if (btn) btn.onclick = function () { ui.closeSheet(); if (onClose) onClose(); };
    const setProgress = function (pct, label) {
      const bar = ov.querySelector(".st-progress .bar i");
      if (bar) bar.style.width = pct + "%";
      const c = ov.querySelector(".st-count");
      if (c) c.textContent = label || "";
    };
    return { ov: ov, setProgress: setProgress };
  }

  function speakAuto(text) {
    if (text && CILIN.speech) CILIN.speech.speak(text, { rate: 0.85 });
  }

  const session = {};

  /* ---------------- 闪卡背词 ---------------- */
  session.flashcards = function (words, opts) {
    opts = opts || {};
    const queue = words.slice();
    if (!queue.length) { ui.toast("这里没有需要学的词"); return; }
    let idx = 0, revealed = false, newCount = 0, revCount = 0, xp = 0, again = 0;
    const stat = { new: 0, review: 0, xp: 0 };
    const title = opts.title || "今日 · 十词";
    let h = null;

    function cardHTML(w) {
      const st = store().stateOf(w.w);
      const statePill = st && st.seen ? `<span class="pill moss">复习</span>` : `<span class="pill gold">新词</span>`;
      const syn = (w.syn && w.syn.length) ? `<div class="fc-syn"><span class="fc-syn-label">同义</span>${w.syn.map(function (x) { return `<span>${ui.esc(x)}</span>`; }).join("")}</div>` : "";
      const ex = w.ex ? `<div class="ex">
          <div class="ex-en">${ui.esc(w.ex.en)} ${ui.audioBtn(w.ex.en, { cls: "ex-audio" })}</div>
          ${w.exZh ? `<div class="ex-zh">${ui.esc(w.exZh)}</div>` : ""}
          <div class="ex-src">${ui.icon("book", 12)} ${ui.esc(w.ex.src)}</div>
        </div>` : "";
      const colloc = w.colloc && w.colloc.length
        ? `<div class="colloc-list">${w.colloc.map(function (c) { return `<div>${ui.esc(c)}</div>`; }).join("")}</div>` : "";
      return `<div class="fc ${revealed ? "revealed" : ""}" id="fc">
        <div class="fc-hint">${opts.eyebrow || "词林 · 一词一境"}</div>
        <div class="fc-word">${ui.esc(w.w)}</div>
        <div class="fc-ipa">${ui.esc(w.ipa || "")}</div>
        <div class="fc-row">
          ${ui.audioBtn(w.w, { label: "发音" })}
          ${statePill}
          ${w.hf ? '<span class="pill gold">高频</span>' : ""}
          ${CILIN.levelBadge(w)}
          <button class="btn btn-ghost btn-sm" data-reveal>${revealed ? "收起释义" : "显示释义"}</button>
        </div>
        <div class="fc-back">
          <div class="senses">${ui.sensesHTML(w)}</div>
          ${w.enDef ? `<div class="en-def"><span class="en-label">EN</span>${ui.esc(w.enDef)}</div>` : ""}
          ${syn}
      ${ex}
          ${ui.ownExHTML(w)}
          ${colloc ? `<div class="word-sec"><div class="ws-label">搭配</div>${colloc}</div>` : ""}
          ${w.mnemonic ? `<div class="mnemonic">${ui.icon("spark", 13)} ${ui.esc(w.mnemonic)}</div>` : ""}
          ${w.note ? `<div class="small muted mt8">${ui.esc(w.note)}</div>` : ""}
        </div>
      </div>`;
    }

    function render() {
      if (idx >= queue.length) return summary();
      const w = queue[idx];
      revealed = false;
      const body = `<div class="flash-wrap">${cardHTML(w)}
        <div class="srs-btns" id="srsBtns" style="display:none">
          <button class="q0" data-q="0">忘记<span>明天再见</span></button>
          <button class="q1" data-q="1">模糊<span>再看一次</span></button>
          <button class="q2" data-q="2">记得<span>进入下一轮</span></button>
        </div>
      </div>`;
      const ov = document.getElementById("overlay");
      ov.classList.add("overlay-session"); ui.activateOverlay();
      ov.innerHTML = `<div class="sheet">${shell(title, body)}</div>`;
      h = bindClose(function () { stopKeys(); CILIN.refreshChrome(); CILIN.reRender(); });
      h.setProgress(Math.round((idx / queue.length) * 100), (idx + 1) + " / " + queue.length);
      const fc = ov.querySelector("#fc");
      const revealBtn = ov.querySelector("[data-reveal]");
      const srs = ov.querySelector("#srsBtns");
      const doReveal = function () {
        revealed = !revealed;
        fc.classList.toggle("revealed", revealed);
        revealBtn.textContent = revealed ? "收起释义" : "显示释义";
        srs.style.display = revealed ? "grid" : "none";
      };
      revealBtn.onclick = doReveal;
      fc.querySelector(".fc-word").onclick = doReveal;
      ov.querySelectorAll("[data-q]").forEach(function (b) {
        b.onclick = function () { rate(Number(b.getAttribute("data-q"))); };
      });
      h.ov._keyHandler = function (e) {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); doReveal(); }
        else if (revealed && ["1", "2", "3"].indexOf(e.key) >= 0) { e.preventDefault(); rate(Number(e.key) - 1); }
      };
    }

    function rate(q) {
      const w = queue[idx];
      const isNew = !store().isSeen(w.w);
      const r = store().review(w, q);
      if (isNew) { stat.new++; } else { stat.review++; }
      stat.xp += r.xp || 0;
      if (q === 0) again++;
      idx++;
      render();
    }

    function summary() {
      const goalDone = store().completeDailyGoal();
      const ov = document.getElementById("overlay");
      ov.innerHTML = `<div class="sheet"><div class="session-body" style="text-align:center;padding:38px 26px">
        <div class="eyebrow">SESSION</div>
        <h2 style="font-size:28px;margin:10px 0 6px">${again ? "这一轮走完了" : "走完这一小段路"}</h2>
        <p class="muted" style="font-size:13px">${again ? "有些词需要再见一面，它们已经进入影子。" : "词已经落在你的林子里。"}</p>
        <div class="stat-strip mt24" style="text-align:left">
          <div class="st"><b>${stat.new}</b><span>新词</span></div>
          <div class="st"><b>${stat.review}</b><span>复习</span></div>
          <div class="st"><b>+${stat.xp}</b><span>经验</span></div>
          <div class="st"><b>${queue.length}</b><span>本组</span></div>
        </div>
        ${goalDone ? `<p class="gold mt16">${ui.icon("spark", 14)} 今日目标完成</p>` : ""}
        <div class="mt24" style="display:flex;gap:10px;justify-content:center">
          <button class="btn btn-line" data-close>回到今日</button>
          ${opts.onDone ? '<button class="btn btn-primary" data-done>继续</button>' : '<button class="btn btn-primary" data-close2>好</button>'}
        </div>
      </div></div>`;
      ov.classList.add("overlay-session"); ui.activateOverlay();
      const close = function () { ui.closeSheet(); if (opts.onDone) opts.onDone(stat); };
      const c1 = ov.querySelector("[data-close]"), c2 = ov.querySelector("[data-close2]"), done = ov.querySelector("[data-done]");
      if (c1) c1.onclick = close;
      if (c2) c2.onclick = close;
      if (done) done.onclick = close;
          }

    function stopKeys() {
          }

    const hKey = function (e) {
      if (!h || !h.ov || h.ov.classList.contains("hidden")) return;
      if (!document.getElementById("fc")) return;
      if (h.ov._keyHandler) h.ov._keyHandler(e);
    };
    document.addEventListener("keydown", hKey);
    render();
    return stat;
  };

  /* ---------------- 选择题 / 拼写 ---------------- */
  session.quiz = function (questions, opts) {
    opts = opts || {};
    const qs = questions.slice();
    if (!qs.length) { ui.toast("题目还没有准备好"); return; }
    let idx = 0, correct = 0, answered = false, xp = 0;
    const wrongList = [];
    const title = opts.title || "训练";

    function render() {
      if (idx >= qs.length) return summary();
      const q = qs[idx];
      answered = false;
      let body = "";
      if (q.kind === "spell") {
        body = `<div class="q-wrap">
          <div class="q-block">
            <div class="eyebrow">听音拼写</div>
            <div class="q-stem" style="margin-top:8px">${ui.esc(q.prompt)}</div>
            <div class="q-sub">${ui.esc(q.sub || "")}</div>
            <div class="fc-row" style="margin:6px 0 16px">${ui.audioBtn(q.speak, { label: "再听一次" })}</div>
            <div class="spell-input"><input id="spellInput" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="输入英文单词" data-autofocus></div>
            <div id="fb"></div>
          </div>
          <div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" id="checkBtn">检查</button></div>
        </div>`;
      } else {
        const options = (q.options || []).map(function (text, i) {
          return `<button class="opt" data-i="${i}"><span class="opt-key">${"ABCD"[i]}</span><span>${ui.esc(text)}</span></button>`;
        }).join("");
        body = `<div class="q-wrap">
          <div class="q-block">
            <div class="eyebrow">${q.kind === "cloze" ? "语境填空" : q.kind === "en2zh" ? "英译中" : "中译英"}</div>
            <div class="q-stem" style="margin-top:8px">${q.kind === "en2zh" ? `<span class="q-word">${ui.esc(q.prompt)}</span> <span class="faint" style="font-size:12px">${ui.esc(q.sub || "")}</span>` : ui.esc(q.prompt)}</div>
            ${q.kind === "en2zh" ? `<div class="fc-row" style="margin:-4px 0 14px">${ui.audioBtn(q.speak)}</div>` : ""}
            <div class="q-options">${options}</div>
            <div id="fb"></div>
          </div>
        </div>`;
      }
      const ov = document.getElementById("overlay");
      ov.classList.add("overlay-session"); ui.activateOverlay();
      ov.innerHTML = `<div class="sheet">${shell(title, body)}</div>`;
      const h = bindClose(function () { CILIN.refreshChrome(); CILIN.reRender(); });
      h.setProgress(Math.round((idx / qs.length) * 100), (idx + 1) + " / " + qs.length);
      if (q.kind === "spell") {
        const input = ov.querySelector("#spellInput");
        const check = function () {
          if (answered) return;
          const ok = CILIN.quiz.checkSpell(input.value, q.answer);
          answered = true;
          if (ok) { correct++; xp += 2; store().recordAnswer(true, { xp: 2 }); }
          else { store().recordAnswer(false, { word: q.word }); wrongList.push(q); }
          showFeedback(ov, ok, q, "拼写");
          const btn = ov.querySelector("#checkBtn");
          btn.textContent = "下一题";
          btn.onclick = next;
          input.disabled = true;
        };
        ov.querySelector("#checkBtn").onclick = check;
        input.addEventListener("keydown", function (e) { if (e.key === "Enter") check(); });
        setTimeout(function () { try { input.focus(); } catch (e) {} }, 80);
        if (opts.autoSpeak !== false) setTimeout(function () { speakAuto(q.speak); }, 200);
      } else {
        ov.querySelectorAll(".opt").forEach(function (btn) {
          btn.onclick = function () {
            if (answered) return;
            answered = true;
            const pick = Number(btn.getAttribute("data-i"));
            const ok = pick === q.answer;
            if (ok) { correct++; xp += 2; store().recordAnswer(true, { xp: 2 }); }
            else { store().recordAnswer(false, { word: q.word }); wrongList.push(q); }
            ov.querySelectorAll(".opt").forEach(function (b, i) {
              b.disabled = true;
              if (i === q.answer) b.classList.add("correct");
              else if (i === pick) b.classList.add("wrong");
              else b.classList.add("dim");
            });
            showFeedback(ov, ok, q);
            const foot = document.createElement("div");
            foot.style.cssText = "display:flex;justify-content:flex-end;margin-top:16px";
            foot.innerHTML = `<button class="btn btn-primary" id="nextBtn">${idx + 1 === qs.length ? "看结果" : "下一题"}</button>`;
            ov.querySelector(".q-block").appendChild(foot);
            ov.querySelector("#nextBtn").onclick = next;
            if (opts.autoSpeak !== false && q.kind === "en2zh") speakAuto(q.speak);
          };
        });
      }
      if (opts.autoSpeak !== false && q.kind === "en2zh") speakAuto(q.speak);
    }

    function showFeedback(ov, ok, q, prefix) {
      const fb = ov.querySelector("#fb");
      const src = q.src ? `<div class="fx-src">${ui.icon("book", 11)} ${ui.esc(q.src)}</div>` : "";
      fb.innerHTML = `<div class="q-feedback ${ok ? "ok" : "no"}">
        <b>${ok ? "答对了" : "再记一次"}</b>${prefix ? " · " + prefix : ""}
        ${ok ? "" : `<div style="margin-top:6px">正确答案：<span class="gold">${ui.esc((q.options && q.options[q.answer]) || q.answer)}</span></div>`}
        <div style="margin-top:6px;color:var(--muted)">${ui.esc(q.explain || "")}</div>${src}
      </div>`;
      fb.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    function next() { idx++; render(); }

    function summary() {
      store().recordSession(opts.kind || "quiz", correct, qs.length);
      if (opts.flag) store().flag(opts.flag);
      const ov = document.getElementById("overlay");
      const pct = Math.round((correct / qs.length) * 100);
      ov.innerHTML = `<div class="sheet"><div class="session-body" style="text-align:center;padding:36px 26px">
        <div class="eyebrow">${ui.esc(opts.kindLabel || "训练")}</div>
        <h2 style="font-size:30px;margin:10px 0 4px">${pct >= 80 ? "水很清" : pct >= 60 ? "仍在路上" : "再走一遍"}</h2>
        <p class="muted" style="font-size:13px">答对 ${correct} / ${qs.length} · 经验 +${xp}</p>
        ${wrongList.length ? `<div class="q-feedback" style="text-align:left;margin-top:20px">
          <b>这些词进了影子</b>
          <div class="small muted" style="margin-top:6px">${wrongList.map(function (q) { return ui.esc(q.word || ""); }).filter(Boolean).join(" · ")}</div>
        </div>` : ""}
        <div class="mt24" style="display:flex;gap:10px;justify-content:center">
          <button class="btn btn-primary" data-close>完成</button>
        </div>
      </div></div>`;
      ov.classList.add("overlay-session"); ui.activateOverlay();
      ov.querySelector("[data-close]").onclick = function () {
        ui.closeSheet();
        if (opts.onDone) opts.onDone({ correct: correct, total: qs.length });
      };
          }

    render();
    return { correct: function () { return correct; } };
  };

  CILIN.session = session;
})();
