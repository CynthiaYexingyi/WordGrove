/* 词林 · 词林 / 词表 */
(function () {
  const CILIN = (window.CILIN = window.CILIN || {});
  const ui = CILIN.ui;
  const store = function () { return CILIN.store; };
  let lastLevel = "all";   // 记住词林筛选，编辑我的词后重绘不跳回「全部」

  function learnedInText(tid) {
    const ws = CILIN.textWords[tid] || [];
    let n = 0;
    ws.forEach(function (w) { if (store().isSeen(w.w)) n++; });
    return { got: n, total: ws.length };
  }

  function wordRow(w) {
    const st = ui.wordState(w);
    return `<div class="word-row" data-word="${ui.attr(w.w)}">
      <div class="wr-w">${ui.esc(w.w)}
        <button class="audio-btn" data-speak="${ui.attr(w.w)}" aria-label="发音" onclick="event.stopPropagation()">${ui.icon("speaker", 15)}</button>
      </div>
      <div class="wr-ipa">${ui.esc(w.ipa || "")}</div>
      <div class="wr-mean">${ui.esc(w.zh || w.mean || "")}</div>
      <div class="wr-right"><span class="pill ${st.cls}">${st.label}</span></div>
    </div>`;
  }

  function clusterCard(unit, t) {
    const prog = learnedInText(t.id);
    const pct = prog.total ? Math.round((prog.got / prog.total) * 100) : 0;
    const core = (CILIN.textWords[t.id] || []).filter(function (w) { return w.core; }).length;
    return `<article class="card card-pad card-hover cluster" data-text="${t.id}">
      <div class="cl-top"><span class="cl-unit">${ui.esc(unit.cn)} · ${ui.esc(t.label)}</span>
        ${ui.ring(pct, 34, { label: pct + "" })}</div>
      <h3>${ui.esc(t.title)}</h3>
      <div class="cl-title-en">${ui.esc((t.sentences && t.sentences[0] || "").slice(0, 0))}${ui.esc(t.subtitle || "")}</div>
      <div class="cl-meta"><span>${prog.total} 个词 · 精讲 ${core}</span><span class="cl-count">${pct}%</span></div>
    </article>`;
  }

  function renderDetail(root, textId) {
    const t = CILIN.textMap[textId];
    const unit = t ? CILIN.unitMap[t.unit] : null;
    if (!t) { CILIN.go("/grove"); return; }
    const words = (CILIN.textWords[textId] || []).slice().sort(function (a, b) {
      if (a.core !== b.core) return a.core ? -1 : 1;
      return a.w < b.w ? -1 : 1;
    });
    const prog = learnedInText(textId);
    const pct = prog.total ? Math.round((prog.got / prog.total) * 100) : 0;
    root.innerHTML = `<div class="page">
      <div class="page-head">
        <div>
          <a class="more small" href="#/grove" style="color:var(--muted)">${ui.icon("back", 13)} 回到词林</a>
          <div class="eyebrow mt8">${ui.esc(unit ? unit.cn : "")} · ${ui.esc(t.label)}</div>
          <h1>${ui.esc(t.title)}</h1>
          <div class="sub">${ui.esc(t.subtitle || "")}${t.subtitle ? "" : "　"}　${ui.icon("book", 12)} ${t.sentences.length} 句 · ${prog.total} 个考点词</div>
        </div>
        <div class="head-side">${ui.ring(pct, 58, { label: pct + "%" })}</div>
      </div>
      <div class="card card-pad" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <div class="small muted">这一篇里出现了 ${prog.total} 个四级大纲词，其中 ${words.filter(function (w) { return w.core; }).length} 个是精讲词。</div>
        </div>
        <button class="btn btn-primary" data-study>学这一组 ${ui.icon("arrow", 14)}</button>
        <button class="btn btn-line" data-read>读原文</button>
      </div>
      <div class="word-tools">
        <span class="eyebrow">${words.length} WORDS</span>
        <span class="small faint">点击单词查看例句、发音与助记</span>
      </div>
      <div class="word-list">${words.map(wordRow).join("") || ui.empty("leaf", "这篇还没有匹配的词", "换一篇看看。")}</div>
    </div>`;

    root.querySelectorAll(".word-row").forEach(function (row) {
      row.onclick = function () { openWord(CILIN.wordMap[row.getAttribute("data-word")]); };
    });
    const back = root.querySelector("[data-study]");
    if (back) back.onclick = function () {
      const queue = words.filter(function (w) { return w.core || w.rich; });
      if (!queue.length) { ui.toast("这组还没有可学的词"); return; }
      CILIN.session.flashcards(queue, {
        title: t.title,
        eyebrow: unit.cn + " · " + t.label,
        onDone: function () { CILIN.refreshChrome(); CILIN.reRender(); }
      });
    };
    const read = root.querySelector("[data-read]");
    if (read) read.onclick = function () { openReading(t); };
  }

  function openReading(t) {
    const paras = (t.sentences || []).join(" ");
    ui.openSheet(`<div class="sheet-head"><div><div class="eyebrow">${ui.esc(t.label)}</div><h3>${ui.esc(t.title)}</h3></div>
      <button class="icon-btn" data-close>${ui.icon("close", 18)}</button></div>
      <div class="sheet-body">
        <div class="passage"><p>${ui.esc(paras)}</p></div>
        <div class="row" style="display:flex;gap:8px;margin-top:14px">
          <button class="btn btn-line btn-sm" data-speak="${ui.attr(paras)}">${ui.icon("speaker", 14)} 朗读全文</button>
        </div>
      </div>`, { cls: "word-sheet" });
    document.getElementById("overlay").querySelector("[data-close]").onclick = ui.closeSheet;
  }

  function openWord(w, opts) {
    if (!w) return;
    opts = opts || {};
    const st = store().stateOf(w.w);
    const learned = store().isSeen(w.w);
    const pill = ui.wordState(w);
    const enDef = w.enDef ? `<div class="word-sec">
        <div class="ws-label">英文释义</div>
        <div class="ws-en" style="font-size:15px">${ui.esc(w.enDef)}</div>
      </div>` : "";
    const contextZh = opts.context && CILIN.sentZh ? CILIN.sentZh[opts.context] : "";
    const syn = (w.syn && w.syn.length) ? `<div class="word-sec">
        <div class="ws-label">同义</div>
        <div class="syn-list">${w.syn.map(function (x) { return `<span class="syn-chip">${ui.esc(x)}</span>`; }).join("")}</div>
      </div>` : "";
    const context = opts.context && (!w.ex || opts.context !== w.ex.en)
      ? `<div class="word-sec"><div class="ws-label">在文中</div>
          <div class="ws-en" style="font-size:14px">${ui.esc(opts.context)}</div>
          ${contextZh ? `<div class="ws-zh">${ui.esc(contextZh)}</div>` : ""}
          <div class="ws-src">${ui.icon("book", 12)} ${ui.esc(opts.sourceLabel || "")}
            <button class="audio-btn" data-speak="${ui.attr(opts.context)}" aria-label="朗读此句">${ui.icon("speaker", 13)}</button>
          </div>
        </div>` : "";
    const ex = w.ex ? `<div class="word-sec">
        <div class="ws-label">课文例句</div>
        <div class="ws-en">${ui.esc(w.ex.en)}</div>
        ${w.exZh ? `<div class="ws-zh">${ui.esc(w.exZh)}</div>` : ""}
        <div class="ws-src">${ui.icon("book", 12)} ${ui.esc(w.ex.src)}
          <button class="audio-btn" data-speak="${ui.attr(w.ex.en)}" aria-label="朗读例句">${ui.icon("speaker", 14)}</button>
        </div>
      </div>` : `<div class="word-sec"><div class="ws-label">例句</div><div class="ws-zh">词库中暂未匹配到课文例句，可在训练里通过语境遇见它。</div></div>`;
    const colloc = w.colloc && w.colloc.length ? `<div class="word-sec"><div class="ws-label">搭配</div>
      <div class="colloc-list">${w.colloc.map(function (c) { return `<div>${ui.esc(c)}</div>`; }).join("")}</div></div>` : "";
    ui.openSheet(`<div class="sheet-head">
        <div><div class="eyebrow">${w.core ? "精讲 · CORE" : "词表 · WORD"}</div><h3>词卡</h3></div>
        <button class="icon-btn" data-close>${ui.icon("close", 18)}</button>
      </div>
      <div class="sheet-body">
        <div class="word-hero">
          <div class="wh-word"><h2>${ui.esc(w.w)}</h2><span class="wh-ipa">${ui.esc(w.ipa || "")}</span></div>
          <div class="wh-senses">${ui.sensesHTML(w)}</div>
          <div class="wh-actions">
            ${ui.audioBtn(w.w, { label: "发音" })}
            <span class="pill ${pill.cls}">${pill.label}</span>
            ${CILIN.levelBadge(w)}
            ${st && st.due ? `<span class="pill">下次 ${ui.fmtDateShort(st.due)}</span>` : ""}
            ${w.hf ? '<span class="pill gold">高频</span>' : ""}
          </div>
        </div>
        ${context}
        ${enDef}
        ${ex}
        ${ui.ownExHTML(w)}
        ${syn}
        ${colloc}
        ${w.mnemonic ? `<div class="word-sec"><div class="ws-label">记忆技巧</div><div class="ws-note">${ui.esc(w.mnemonic)}</div></div>` : ""}
        ${w.note ? `<div class="word-sec"><div class="ws-label">用法</div><div class="ws-note">${ui.esc(w.note)}</div></div>` : ""}
      </div>
      <div class="sheet-foot">
        <button class="btn btn-ghost" data-today>${ui.icon("spark", 14)} 加入今日</button>
        <button class="btn btn-ghost" data-shadow>${ui.icon("shadow", 14)} 加入影子</button>
        <button class="btn ${learned ? "btn-line" : "btn-primary"}" data-know>${learned ? "再复习一次" : "已认识，标记"}</button>
        ${w.custom ? '<button class="btn btn-line" data-edit-custom>编辑我的词</button>' : ""}
        ${w.custom ? '<button class="btn btn-ghost" data-del-custom>移出我的词</button>' : ""}
      </div>`, { cls: "word-sheet" });
    const ov = document.getElementById("overlay");
    ov.querySelector("[data-close]").onclick = ui.closeSheet;
    ov.querySelector("[data-know]").onclick = function () {
      const stayY = window.scrollY;
      store().review(w, 2);
      ui.toast("已标记 · " + w.w, "它会在下一次更远的地方等你");
      ui.closeSheet();
      CILIN.refreshChrome();
      CILIN.reRender();
      requestAnimationFrame(function () { window.scrollTo(0, stayY); });
    };
    ov.querySelector("[data-today]").onclick = function () {
      const ok = store().addToToday(w);
      ui.toast(ok ? "已加入今日" : "今天已经排上它了", ok ? "今日计划会先见到它" : "");
      ui.closeSheet();
      CILIN.refreshChrome();
    };
    ov.querySelector("[data-shadow]").onclick = function () {
      store().addShadow(w.w, "收藏");
      ui.toast("已放进影子", "等你回头照见它");
      ui.closeSheet();
      CILIN.refreshChrome();
    };
    const edit = ov.querySelector("[data-edit-custom]");
    if (edit) edit.onclick = function () {
      if (CILIN.views.read && CILIN.views.read.editCustomWord) CILIN.views.read.editCustomWord(w);
    };
    const del = ov.querySelector("[data-del-custom]");
    if (del) del.onclick = function () {
      if (!window.confirm("把「" + w.w + "」从我的词林移除？学习记录会保留。")) return;
      store().removeCustomWord(w.w);
      CILIN.unregisterCustomWord(w.w);
      ui.closeSheet();
      ui.toast("已移出我的词林", "需要时可以再从阅读里收回来");
      CILIN.reRender();
    };
  }

  function render(root, params) {
    if (params && params[0] && params[0].indexOf("t:") === 0) {
      renderDetail(root, params[0].slice(2));
      return;
    }
    const units = CILIN.units;
    const total = CILIN.words.length;
    const learned = Object.keys(store().state.words).length;
    const core = CILIN.coreWords.length;
    const sixCount = CILIN.cet6Words.length;
    let activeUnit = "all";
    let currentLevel = lastLevel;
    let sixLimit = 60;

    root.innerHTML = `<div class="page">
      <div class="page-head">
        <div>
          <div class="eyebrow">WORD GROVE</div>
          <h1>词林</h1>
          <div class="sub">${CILIN.cet4Words.length} 个四级词 + ${sixCount} 个六级新增词，按课文与课外阅读生长成 ${units.reduce(function (n, u) { return n + u.texts.length; }, 0)} 丛。精讲词 ${core} 个；我的词 ${CILIN.customWords.length} 个。</div>
        </div>
        <div class="head-side">
          <button class="btn btn-line btn-sm" data-random>${ui.icon("spark", 14)} 随手一词</button>
        </div>
      </div>

      <div class="searchbar">
        ${ui.icon("search", 17)}
        <input id="groveSearch" placeholder="查一个词：英文、中文或音标…" autocomplete="off" spellcheck="false">
      </div>

      <div class="word-tools">
        <div class="chip-row" id="levelChips">
          <button class="chip active" data-level="all">全部</button>
          <button class="chip" data-level="cet4">四级</button>
          <button class="chip" data-level="cet6">六级新增</button>
          <button class="chip" data-level="custom">我的词 ${CILIN.customWords.length}</button>
        </div>
        <span class="small faint">已遇见 ${learned} / ${total}</span>
      </div>
      <div class="word-tools" id="unitRow" style="margin-top:0">
        <div class="chip-row" id="unitChips">
          <button class="chip active" data-unit="all">全部单元</button>
          ${units.map(function (u) { return `<button class="chip" data-unit="${u.id}">${ui.esc(u.cn)}</button>`; }).join("")}
        </div>
        <span class="small faint">按课文</span>
      </div>

      <div id="groveBody"></div>
    </div>`;

    const body = root.querySelector("#groveBody");
    const search = root.querySelector("#groveSearch");
    const unitRow = root.querySelector("#unitRow");
    let currentUnit = "all";

    function wordRowHTML(w) {
      const st = ui.wordState(w);
      return `<div class="word-row" data-word="${ui.attr(w.w)}">
        <div class="wr-w">${ui.esc(w.w)}<button class="audio-btn" data-speak="${ui.attr(w.w)}" onclick="event.stopPropagation()">${ui.icon("speaker", 15)}</button></div>
        <div class="wr-ipa">${ui.esc(w.ipa || "")}</div>
        <div class="wr-mean">${ui.esc(w.zh || w.mean || "")}</div>
        <div class="wr-right">${CILIN.levelBadge(w)}<span class="pill ${st.cls}">${st.label}</span></div>
      </div>`;
    }
    function bindRows() {
      body.querySelectorAll(".word-row").forEach(function (row) {
        row.onclick = function () { openWord(CILIN.wordMap[row.getAttribute("data-word")]); };
      });
    }

    function sixBanner() {
      return `<div class="card card-pad mt16" data-open-six style="display:flex;align-items:center;justify-content:space-between;gap:14px;cursor:pointer">
        <div>
          <div class="eyebrow">CET-6 · 六级新增</div>
          <div class="serif" style="font-size:16px;letter-spacing:.06em;margin-top:4px">${sixCount} 个六级大纲新增词</div>
          <div class="small faint">单独浏览 / 也可在今日设置里把学习范围切到六级</div>
        </div>
        <span class="btn btn-line btn-sm">进入 ${ui.icon("arrow", 14)}</span>
      </div>`;
    }

    function drawClusters() {
      unitRow.style.display = "";
      const cards = [];
      units.forEach(function (u) {
        if (currentUnit !== "all" && u.id !== currentUnit) return;
        u.texts.forEach(function (t) { cards.push(clusterCard(u, t)); });
      });
      body.innerHTML = `<div class="cluster-grid" id="clusterGrid">${cards.join("")}</div>` + sixBanner();
      body.querySelectorAll(".cluster").forEach(function (c) {
        c.onclick = function () { CILIN.go("/grove/t:" + c.getAttribute("data-text")); };
      });
      const banner = body.querySelector("[data-open-six]");
      if (banner) banner.onclick = function () { setLevel("cet6"); };
    }

    function drawSix() {
      unitRow.style.display = "none";
      const all = CILIN.cet6Words.slice().sort(function (a, b) { return a.w < b.w ? -1 : 1; });
      const show = all.slice(0, sixLimit);
      body.innerHTML = `<div class="word-tools"><span class="eyebrow">CET-6 · ${all.length} WORDS</span>
        <span class="small faint">六级大纲新增词 · 点击查看词卡</span></div>
        <div class="word-list">${show.map(wordRowHTML).join("")}</div>
        ${all.length > show.length ? `<div class="mt16" style="text-align:center"><button class="btn btn-line btn-sm" id="loadSix">显示更多（还剩 ${all.length - show.length}）</button></div>` : ""}`;
      bindRows();
      const more = body.querySelector("#loadSix");
      if (more) more.onclick = function () { sixLimit += 120; drawSix(); };
    }

    function drawCustom() {
      unitRow.style.display = "none";
      const all = CILIN.customWords.slice().sort(function (a, b) { return a.w < b.w ? -1 : 1; });
      body.innerHTML = `<div class="word-tools"><span class="eyebrow">MY WORDS · ${all.length}</span>
        <span class="small faint">从阅读里收进来的词 · 点词卡可编辑、加入今日或影子</span></div>
        <div class="word-list">${all.map(wordRowHTML).join("") || ui.empty("leaf", "还没有自己的词", "阅读时点不认识的词，选「收进我的词林」。")}</div>`;
      bindRows();
    }

    function draw() {
      if (currentLevel === "cet6") drawSix();
      else if (currentLevel === "custom") drawCustom();
      else drawClusters();
    }

    function setLevel(level) {
      currentLevel = level;
      lastLevel = level;
      sixLimit = 60;
      root.querySelectorAll("[data-level]").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-level") === level);
      });
      if (search.value.trim()) search.dispatchEvent(new Event("input"));
      else draw();
    }

    root.querySelectorAll("[data-level]").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-level") === currentLevel);
      b.onclick = function () { setLevel(b.getAttribute("data-level")); };
    });
    root.querySelectorAll("[data-unit]").forEach(function (b) {
      b.onclick = function () {
        currentUnit = b.getAttribute("data-unit");
        root.querySelectorAll("[data-unit]").forEach(function (x) { x.classList.toggle("active", x === b); });
        if (search.value.trim()) search.dispatchEvent(new Event("input"));
        else draw();
      };
    });

    function doSearch(q) {
      q = q.trim().toLowerCase();
      if (!q) { draw(); return; }
      const hits = CILIN.words.filter(function (w) {
        const levelOK = currentLevel === "cet6" ? w.level === "cet6"
          : currentLevel === "cet4" ? (w.level !== "cet6" && !w.custom)
          : currentLevel === "custom" ? !!w.custom : true;
        return levelOK && (w.w.indexOf(q) >= 0 || (w.mean && w.mean.indexOf(q) >= 0) || (w.zh && w.zh.indexOf(q) >= 0) || (w.ipa && w.ipa.indexOf(q) >= 0));
      });
      const show = hits.slice(0, 80);
      body.innerHTML = `<div class="word-tools"><span class="eyebrow">${hits.length} RESULTS</span><span class="small faint">显示前 ${show.length} 条</span></div>
        <div class="word-list">${show.map(wordRowHTML).join("") || ui.empty("search", "没有找到", "换个拼写或中文意思试试。")}</div>`;
      bindRows();
    }
    let timer = null;
    search.addEventListener("input", function () {
      clearTimeout(timer);
      const q = search.value;
      timer = setTimeout(function () { doSearch(q); }, 160);
    });

    root.querySelector("[data-random]").onclick = function () {
      const pool = CILIN.studyPool ? CILIN.studyPool() : CILIN.words;
      const w = pool[Math.floor(Math.random() * pool.length)];
      openWord(w);
    };

    draw();
  }

  CILIN.views = CILIN.views || {};
  CILIN.views.grove = { render: render, openWord: openWord };
})();
