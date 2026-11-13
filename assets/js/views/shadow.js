/* 词林 · 影子 */
(function () {
  const CILIN = (window.CILIN = window.CILIN || {});
  const ui = CILIN.ui;
  const store = function () { return CILIN.store; };

  function shadowSheet(item) {
    const w = item.word;
    const meta = item.meta;
    const ex = w.ex ? `<div class="word-sec">
        <div class="ws-label">把它放回句子</div>
        <div class="ws-en">${ui.esc(w.ex.en)}</div>
        ${w.exZh ? `<div class="ws-zh">${ui.esc(w.exZh)}</div>` : ""}
        <div class="ws-src">${ui.icon("book", 12)} ${ui.esc(w.ex.src)}
          <button class="audio-btn" data-speak="${ui.attr(w.ex.en)}" aria-label="朗读例句">${ui.icon("speaker", 13)}</button>
        </div>
      </div>` : "";
    ui.openSheet(`<div class="sheet-head"><div><div class="eyebrow">SHADOW</div><h3>照见一个影子</h3></div>
      <button class="icon-btn" data-close>${ui.icon("close", 18)}</button></div>
      <div class="sheet-body">
        <div class="shadow-test">
          <div class="st-word">${ui.esc(w.w)}</div>
          <div class="st-ipa">${ui.esc(w.ipa || "")} ${CILIN.levelBadge(w)}</div>
          <div class="mt12">${ui.audioBtn(w.w, { label: "听发音" })}</div>
        </div>
        <p class="small muted" style="text-align:center;margin-top:8px">先在心里说出它的意思，再往下看。</p>
        <div class="shadow-reveal">
          <div class="divider"></div>
          <div class="senses">${ui.sensesHTML(w)}</div>
          ${w.enDef ? `<div class="en-def"><span class="en-label">EN</span>${ui.esc(w.enDef)}</div>` : ""}
          ${w.mnemonic ? `<div class="mnemonic mt12">${ui.icon("spark", 13)} ${ui.esc(w.mnemonic)}</div>` : ""}
          ${ex}
          ${ui.ownExHTML(w)}
        </div>
        <div class="small faint mt12">${ui.esc(meta.reason || "遗忘")} · ${ui.esc(meta.added || "")} 落进影子</div>
      </div>
      <div class="sheet-foot">
        <button class="btn btn-ghost" data-again>还没记住</button>
        <button class="btn btn-primary" data-seen>照见了 ${ui.icon("spark", 14)}</button>
      </div>`, { cls: "word-sheet" });
    const ov = document.getElementById("overlay");
    ov.querySelector("[data-close]").onclick = ui.closeSheet;
    ov.querySelector("[data-again]").onclick = function () {
      store().shadowAttempt(w.w);
      ui.toast("没关系", "它会再等你一次");
      ui.closeSheet();
      CILIN.reRender();
    };
    ov.querySelector("[data-seen]").onclick = function () {
      store().integrateShadow(w.w);
      ui.toast("照见 · " + w.w, "经验 +5 · 它已进入更深的记忆");
      ui.closeSheet();
      CILIN.refreshChrome();
      CILIN.reRender();
    };
  }

  function practice(mode) {
    const list = [];
    const shadow = store().shadowList();
    shadow.forEach(function (it) { if (it.word.ex) list.push({ en: it.word.ex.en, zh: it.word.exZh || "", word: it.word.w, src: it.word.ex.src }); });
    const pool = CILIN.coreWords.filter(function (w) { return w.ex && w.exZh; });
    while (list.length < 5 && pool.length) {
      const w = pool[Math.floor(Math.random() * pool.length)];
      if (!list.some(function (x) { return x.en === w.ex.en; })) list.push({ en: w.ex.en, zh: w.exZh, word: w.w, src: w.ex.src });
    }
    const queue = ui.shuffle(list, Date.now()).slice(0, 5);
    if (!queue.length) { ui.toast("还没有可跟读的句子"); return; }
    let idx = 0, done = 0, xp = 0;

    function renderStep() {
      if (idx >= queue.length) return summary();
      const item = queue[idx];
      const body = `<div class="q-wrap">
        <div class="eyebrow" style="text-align:center">${mode === "dictation" ? "听写 · 让声音落在纸上" : "跟读 · 让声音穿过你"}</div>
        <div class="card card-pad mt16" style="text-align:center;padding:26px">
          <div class="st-ipa">${ui.esc(item.word)}</div>
          <div class="mt12" style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
            ${ui.audioBtn(item.en, { label: "听一遍" })}
            ${ui.audioBtn(item.en, { label: "慢速", cls: "slow" })}
          </div>
          ${mode === "dictation" ? `<div class="field mt16" style="text-align:left"><label>写下你听到的句子</label>
            <textarea id="dictInput" rows="3" placeholder="听不清就再听一遍，写下你能写出的部分。"></textarea></div>` :
            `<div class="mt16" id="revText" style="display:none;text-align:left"><div class="ws-en">${ui.esc(item.en)}</div>
              ${item.zh ? `<div class="ws-zh">${ui.esc(item.zh)}</div>` : ""}
              <div class="ws-src">${ui.esc(item.src || "")}</div></div>
            <button class="btn btn-line btn-sm mt16" data-reveal>看原文</button>`}
        </div>
        <div class="sheet-foot" style="padding:16px 0 0">
          ${mode === "dictation" ? `<button class="btn btn-ghost" data-skip>跳过</button><button class="btn btn-primary" data-check>检查</button>` :
            `<button class="btn btn-ghost" data-skip>跳过</button><button class="btn btn-primary" data-next>跟读完成 ${ui.icon("arrow", 14)}</button>`}
        </div>
        <div id="fb"></div>
      </div>`;
      ui.openSheet(`<div class="sheet"><div class="session-top">
          <span class="st-title">${mode === "dictation" ? "听写" : "跟读"} · 句子</span>
          <div class="st-progress"><div class="bar"><i style="width:${Math.round((idx / queue.length) * 100)}%"></i></div></div>
          <span class="st-count">${idx + 1} / ${queue.length}</span>
          <button class="icon-btn" data-close>${ui.icon("close", 17)}</button>
        </div><div class="session-body">${body}</div></div>`, { session: true });
      const ov = document.getElementById("overlay");
      ov.querySelector("[data-close]").onclick = function () { ui.closeSheet(); CILIN.refreshChrome(); CILIN.reRender(); };
      const next = function () { idx++; done++; store().addXp(1); xp += 1; renderStep(); };
      const skip = ov.querySelector("[data-skip]");
      if (skip) skip.onclick = function () { idx++; renderStep(); };
      if (mode === "dictation") {
        ov.querySelector("[data-check]").onclick = function () {
          const input = ov.querySelector("#dictInput").value || "";
          const norm = function (s) { return s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim(); };
          const ratio = Math.min(1, norm(input).length / Math.max(1, norm(item.en).length));
          const ok = ratio > 0.7;
          if (ok) { store().addXp(2); xp += 2; }
          else store().addShadow(item.word, "听写");
          ov.querySelector("#fb").innerHTML = `<div class="q-feedback ${ok ? "ok" : "no"}"><b>${ok ? "听清了" : "还差一点"}</b>
            <div class="mt8 ws-en" style="font-family:var(--latin)">${ui.esc(item.en)}</div>
            ${item.zh ? `<div class="small muted mt8">${ui.esc(item.zh)}</div>` : ""}</div>`;
          this.disabled = true;
          const b = document.createElement("div");
          b.style.cssText = "display:flex;justify-content:flex-end;margin-top:14px";
          b.innerHTML = `<button class="btn btn-primary" id="nb">下一句</button>`;
          ov.querySelector(".session-body .q-wrap").appendChild(b);
          ov.querySelector("#nb").onclick = next;
        };
      } else {
        const rev = ov.querySelector("[data-reveal]");
        rev.onclick = function () { ov.querySelector("#revText").style.display = "block"; rev.disabled = true; };
        ov.querySelector("[data-next]").onclick = next;
      }
      setTimeout(function () { CILIN.speech.speak(item.en, { rate: 0.88 }); }, 400);
    }
    function summary() {
      const ov = document.getElementById("overlay");
      ov.innerHTML = `<div class="sheet"><div class="session-body" style="text-align:center;padding:36px 26px">
        <div class="eyebrow">${mode === "dictation" ? "DICTATION" : "SHADOWING"}</div>
        <h2 style="font-size:28px;margin:10px 0 4px">声音走过了</h2>
        <p class="muted" style="font-size:13px">完成 ${done} 句 · 经验 +${xp}</p>
        <div class="mt24"><button class="btn btn-primary" data-back>好</button></div></div></div>`;
      ov.querySelector("[data-back]").onclick = function () {
        ui.closeSheet();
        CILIN.refreshChrome();
        CILIN.reRender();
      };
    }
    renderStep();
  }

  function render(root) {
    const list = store().shadowList();
    const sentences = [];
    list.forEach(function (it) { if (it.word.ex) sentences.push(it); });
    root.innerHTML = `<div class="page">
      <div class="page-head">
        <div>
          <div class="eyebrow">SHADOW</div>
          <h1>影子</h1>
          <div class="sub">荣格说，阴影不是敌人，是尚未被整合的自己。那些遗忘的词，也在等你回头。</div>
        </div>
        <div class="head-side"><span class="pill">${list.length} 个待照见</span></div>
      </div>

      <section class="card card-pad">
        <div class="shadow-intro">
          <div>
            <div class="si-text">"直到你把无意识变为意识，它将支配你的人生，而你会称之为命运。"</div>
            <div class="small faint mt8">照见不是背下来，而是认出它——从此它不再躲在句子后面。</div>
            <div class="mt16" style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="btn btn-primary" data-practice>开始跟读</button>
              <button class="btn btn-line" data-dictation>听写练习</button>
            </div>
          </div>
          <div class="si-mark">${ui.icon("shadow", 34)}</div>
        </div>
      </section>

      <div class="sec-title"><div><span class="eyebrow">UNSEEN</span><h2>未照见的影子</h2></div>
        <span class="small faint">${list.length ? "点一个，把它认回来" : "干净得像一面镜子"}</span></div>
      ${list.length ? `<div class="shadow-list">
        ${list.map(function (it) {
          const w = it.word;
          return `<div class="shadow-row" data-w="${ui.attr(w.w)}">
            <span class="audio-btn" data-speak="${ui.attr(w.w)}" onclick="event.stopPropagation()">${ui.icon("speaker", 16)}</span>
            <div class="sr-meta">
              <span class="sr-w">${ui.esc(w.w)} <em class="small" style="font-family:var(--sans)">${ui.esc(w.ipa || "")}</em></span>
              <span>${ui.esc(w.zh || w.mean || "")}</span>
              <em>${ui.esc(it.meta.reason || "遗忘")} · ${ui.esc(it.meta.added || "")}</em>
            </div>
            <span class="pill">照见 ${ui.icon("chevron", 12)}</span>
          </div>`;
        }).join("")}
      </div>` : ui.empty("shadow", "还没有影子", "答错或遗忘的词会落在这里。去训练里走一趟，影子自会出现。", `<button class="btn btn-primary" data-go-train>去训练</button>`)}

      <div class="grid grid-2 mt24">
        <section class="card card-pad">
          <div class="sec-title" style="margin-top:0"><div><span class="eyebrow">SHADOWING</span><h2>跟读花园</h2></div></div>
          <p class="small muted">挑五句课文里的句子。听一遍，跟着读一遍，让声音和意义一起落在记忆里。</p>
          <div class="mt12">${ui.progress(Math.min(100, list.length * 8 + 10))}</div>
          <button class="btn btn-line btn-sm mt16" data-practice>进入跟读</button>
        </section>
        <section class="card card-pad">
          <div class="sec-title" style="margin-top:0"><div><span class="eyebrow">DICTATION</span><h2>听写</h2></div></div>
          <p class="small muted">不看原文，把听到的句子写下来。写不出的部分，正是下一次要照见的地方。</p>
          <div class="mt16"><button class="btn btn-line btn-sm" data-dictation>开始听写</button></div>
        </section>
      </div>

      ${list.length ? `<div class="mt24 small faint">已整合的影子：${store().state.stats.integrated || 0} 个。它们不再叫影子，叫你的词。</div>` : ""}
    </div>`;

    root.querySelectorAll(".shadow-row").forEach(function (row) {
      row.onclick = function () {
        const w = CILIN.wordMap[row.getAttribute("data-w")];
        const meta = store().state.shadow[w.w] || { added: "", reason: "遗忘" };
        shadowSheet({ word: w, meta: meta });
      };
    });
    root.querySelectorAll("[data-practice]").forEach(function (b) { if (b.tagName === "BUTTON") b.onclick = function () { practice("shadow"); }; });
    root.querySelectorAll("[data-dictation]").forEach(function (b) { if (b.tagName === "BUTTON") b.onclick = function () { practice("dictation"); }; });
    const gt = root.querySelector("[data-go-train]");
    if (gt) gt.onclick = function () { CILIN.go("/train"); };
  }

  CILIN.views = CILIN.views || {};
  CILIN.views.shadow = { render: render };
})();
