/* 词林 · 文章阅读（点词查义） */
(function () {
  const CILIN = (window.CILIN = window.CILIN || {});
  const ui = CILIN.ui;
  const store = function () { return CILIN.store; };

  function flatTexts() {
    const out = [];
    CILIN.units.forEach(function (u) {
      u.texts.forEach(function (t) { out.push({ unit: u, text: t }); });
    });
    return out;
  }

  function snippet(t) {
    const s = (t.sentences && t.sentences[0]) || "";
    return s.length > 92 ? s.slice(0, 92) + "…" : s;
  }

  function sourceLabel(unit, t) {
    return unit.cn + " Unit " + unit.id.slice(1) + " · " + t.label + " · " + t.title;
  }

  /* 把段落切成可点击的词；保留原标点 */
  function paragraphHTML(text) {
    let out = "", last = 0;
    const re = /[A-Za-z][A-Za-z'’\-]*/g;
    let m;
    while ((m = re.exec(text))) {
      out += ui.esc(text.slice(last, m.index));
      const raw = m[0];
      const w = CILIN.resolveWord(raw);
      if (w) {
        const seen = store().isSeen(w.w);
        out += `<button type="button" class="rd-token ${seen ? "is-learned" : "is-new"}" data-rdw="${ui.attr(w.w)}" data-raw="${ui.attr(raw)}">${ui.esc(raw)}</button>`;
      } else {
        out += `<button type="button" class="rd-token rd-unknown" data-raw="${ui.attr(raw)}">${ui.esc(raw)}</button>`;
      }
      last = re.lastIndex;
    }
    out += ui.esc(text.slice(last));
    return out;
  }

  function sentenceOf(paragraph, raw) {
    const parts = paragraph.match(/[^.!?]+[.!?]*/g) || [paragraph];
    const needle = raw.toLowerCase();
    const hit = parts.find(function (p) { return p.toLowerCase().indexOf(needle) >= 0; });
    return (hit || paragraph).trim();
  }

  function openUnknown(raw, context, label) {
    ui.openSheet(`<div class="sheet-head"><div><div class="eyebrow">WORD</div><h3>词卡</h3></div>
      <button class="icon-btn" data-close aria-label="关闭">${ui.icon("close", 18)}</button></div>
      <div class="sheet-body">
        <div class="word-hero">
          <div class="wh-word"><h2>${ui.esc(raw)}</h2></div>
          <div class="mt8">${ui.audioBtn(raw, { label: "发音" })}</div>
          <p class="small muted mt12">这个词不在大纲词库中。把释义收进「我的词林」，它就能进入今日、影子和复习。</p>
        </div>
        <div class="word-sec"><div class="ws-label">在文中</div>
          <div class="ws-en" style="font-size:14px">${ui.esc(context)}</div>
          <div class="ws-src">${ui.icon("book", 12)} ${ui.esc(label)}</div>
        </div>
      </div>
      <div class="sheet-foot"><button class="btn btn-line" data-close2>知道了</button>
        <button class="btn btn-primary" data-add-custom>收进我的词林</button></div>`, { cls: "word-sheet" });
    const ov = document.getElementById("overlay");
    ov.querySelectorAll("[data-close],[data-close2]").forEach(function (b) { b.onclick = ui.closeSheet; });
    const add = ov.querySelector("[data-add-custom]");
    if (add) add.onclick = function () { openCustomForm(raw, context, label); };
  }

  /* 义项行：词性 + 含义可增删；保存时由它们生成 zh 汇总串，兼容所有只读 zh 的旧代码 */
  function senseRowHTML(s) {
    return `<div class="sense-row" data-sense>
      <input class="sense-pos" value="${ui.attr(s.pos || "")}" placeholder="词性 n. / vt." autocomplete="off">
      <input class="sense-def" value="${ui.attr(s.def || "")}" placeholder="含义" autocomplete="off">
      <button type="button" class="icon-btn sense-del" data-del aria-label="删除这条义项">${ui.icon("x", 14)}</button>
    </div>`;
  }

  function buildZh(senses) {
    return senses.map(function (s) {
      return ((s.pos ? s.pos + " " : "") + (s.def || "")).trim();
    }).filter(Boolean).join("；");
  }

  /* 同义词：一行输入，按逗号 / 分号 / 顿号 / 换行拆成 syn[]，顺手去重去空 */
  function parseSyn(str) {
    return (str || "").split(/[,，;；、\n]+/).map(function (s) { return s.trim(); })
      .filter(function (s, i, a) { return s && a.indexOf(s) === i; });
  }

  function openCustomForm(raw, context, label, opts) {
    opts = opts || {};
    const editing = opts.edit || null;
    const preZh = (CILIN.sentZh && CILIN.sentZh[context]) || "";
    const exEn = editing ? ((editing.ex && editing.ex.en) || "") : context;
    const exSrc = editing ? ((editing.ex && editing.ex.src) || "") : ("阅读原句 · " + label);
    const ownEn = editing ? ((editing.ownEx && editing.ownEx.en) || "") : "";
    const ownZh = editing ? ((editing.ownEx && editing.ownEx.zh) || "") : "";
    const synText = editing ? (editing.syn || []).join(", ") : "";
    const initial = editing && editing.senses && editing.senses.length
      ? editing.senses.slice()
      : [{ pos: editing ? (editing.pos || "") : "", def: editing ? (editing.zh || "") : "" }];
    ui.openSheet(`<div class="sheet-head"><div><div class="eyebrow">MY WORD</div><h3>${editing ? "编辑我的词" : "收进我的词林"}</h3></div>
      <button class="icon-btn" data-close aria-label="关闭">${ui.icon("close", 18)}</button></div>
      <div class="sheet-body">
        <p class="small muted" style="margin:0 0 14px">${editing ? "改动只影响这个词条；学习记录、影子与今日队列都会保留。" : "从阅读里捡回来的词。至少填「单词」和一义项的含义，课文例句已自动带入原句；下面还可以另写一句自己的例句、补几个同义词（都可选）。"}</p>
        <div class="field"><label>单词 <span class="faint">*</span>${editing ? '<span class="faint"> · 单词名不可改</span>' : ""}</label>
          <input id="cwW" value="${ui.attr(raw)}" ${editing ? "readonly" : ""} autocomplete="off"></div>
        <div class="field"><label>词性与含义 <span class="faint">*</span><span class="faint"> · 一词多义可加多行</span></label>
          <div id="cwSenses"></div>
          <button type="button" class="btn btn-line btn-sm" id="cwAddSense">${ui.icon("plus", 13)} 添加义项</button></div>
        <div class="grid grid-2">
          <div class="field"><label>音标</label><input id="cwIpa" value="${ui.attr(editing ? (editing.ipa || "") : "")}" placeholder="可选" autocomplete="off"></div>
          <div class="field"><label>英文释义</label><input id="cwEnDef" value="${ui.attr(editing ? (editing.enDef || "") : "")}" placeholder="可选" autocomplete="off"></div>
        </div>
        <div class="field"><label>课文例句 <span class="faint">· 默认带入原句，可修改</span></label><textarea id="cwEx" rows="3" placeholder="英文例句">${ui.esc(exEn)}</textarea></div>
        <div class="field"><label>课文例句译文</label><input id="cwExZh" value="${ui.attr(editing ? (editing.exZh || "") : preZh)}" placeholder="可选" autocomplete="off"></div>
        <div class="divider"></div>
        <div class="field"><label>我的例句 <span class="faint">· 可选，自己写一句</span></label><textarea id="cwOwnEx" rows="2" placeholder="留空就不添加">${ui.esc(ownEn)}</textarea></div>
        <div class="field"><label>我的例句译文 <span class="faint">· 可选</span></label><input id="cwOwnExZh" value="${ui.attr(ownZh)}" placeholder="可选" autocomplete="off"></div>
        <div class="field"><label>记忆技巧 / 记法</label><textarea id="cwMnemonic" rows="2" placeholder="自己写一句，可留空">${ui.esc(editing ? (editing.mnemonic || "") : "")}</textarea></div>
        <div class="divider"></div>
        <div class="field"><label>同义词 <span class="faint">· 可选，多个用逗号分隔</span></label>
          <input id="cwSyn" value="${ui.attr(synText)}" placeholder="例如：transport, transit, conveyance" autocomplete="off"></div>
      </div>
      <div class="sheet-foot"><button class="btn btn-line" data-cancel>取消</button>
        <button class="btn btn-primary" data-save>${editing ? "保存修改" : "收进词林"}</button>
        ${editing ? "" : '<button class="btn btn-line" data-save-today>收进并加入今日</button>'}</div>`, { cls: "word-sheet" });
    const ov = document.getElementById("overlay");
    const close = function () { ui.closeSheet(); };
    ov.querySelectorAll("[data-close],[data-cancel]").forEach(function (b) { b.onclick = close; });
    const senseBox = ov.querySelector("#cwSenses");

    function drawSenses(list) {
      senseBox.innerHTML = (list.length ? list : [{ pos: "", def: "" }]).map(senseRowHTML).join("");
    }
    drawSenses(initial);
    senseBox.addEventListener("click", function (e) {
      const b = e.target.closest("[data-del]");
      if (!b) return;
      b.closest("[data-sense]").remove();
      if (!senseBox.querySelector("[data-sense]")) drawSenses([{ pos: "", def: "" }]);
    });
    ov.querySelector("#cwAddSense").onclick = function () {
      senseBox.insertAdjacentHTML("beforeend", senseRowHTML({ pos: "", def: "" }));
      const row = senseBox.querySelector("[data-sense]:last-child");
      if (row) row.querySelector(".sense-pos").focus();
    };
    function collectSenses() {
      return Array.from(senseBox.querySelectorAll("[data-sense]")).map(function (row) {
        return {
          pos: (row.querySelector(".sense-pos").value || "").trim(),
          def: (row.querySelector(".sense-def").value || "").trim()
        };
      }).filter(function (s) { return s.pos || s.def; });
    }
    ov.querySelector("[data-save]").onclick = function () { saveCustom(false); };
    const saveToday = ov.querySelector("[data-save-today]");
    if (saveToday) saveToday.onclick = function () { saveCustom(true); };

    function saveCustom(toToday) {
      const key = (ov.querySelector("#cwW").value || "").trim().toLowerCase();
      const list = collectSenses();
      const zh = buildZh(list);
      if (!key) { ui.toast("还缺单词", "至少写一个单词"); ov.querySelector("#cwW").focus(); return; }
      if (!list.some(function (s) { return s.def; })) {
        ui.toast("还缺含义", "至少给一条义项写上含义");
        const first = senseBox.querySelector(".sense-def");
        if (first) first.focus();
        return;
      }
      if (!editing) {
        const exists = CILIN.wordMap[key];
        if (exists && !exists.custom) { ui.toast("词林里已经有它", "直接打开现有词卡"); close(); CILIN.views.grove.openWord(exists); return; }
      }
      const obj = {
        w: key,
        senses: list,
        zh: zh,
        pos: list[0] ? (list[0].pos || "") : "",
        ipa: (ov.querySelector("#cwIpa").value || "").trim(),
        enDef: (ov.querySelector("#cwEnDef").value || "").trim(),
        ex: { en: (ov.querySelector("#cwEx").value || "").trim() || (editing ? "" : context), src: exSrc },
        exZh: (ov.querySelector("#cwExZh").value || "").trim(),
        ownEx: {
          en: (ov.querySelector("#cwOwnEx").value || "").trim(),
          zh: (ov.querySelector("#cwOwnExZh").value || "").trim()
        },
        syn: parseSyn((ov.querySelector("#cwSyn").value || "")),
        mnemonic: (ov.querySelector("#cwMnemonic").value || "").trim(),
        level: "custom", custom: true
      };
      CILIN.store.addCustomWord(obj);
      const saved = CILIN.store.state.customWords[key];
      const registered = CILIN.registerCustomWord(saved);
      close();
      CILIN.reRender();
      if (toToday && registered) CILIN.store.addToToday(registered);
      ui.toast(editing ? "已保存修改" : (toToday ? "已收进词林并加入今日" : "已收进我的词林"),
        editing ? "学习记录都还在" : "词林 → 我的词；词卡里可随时编辑");
      setTimeout(function () { CILIN.views.grove.openWord(registered || saved); }, 220);
    }
  }

  function editCustomWord(w) {
    if (!w || !w.custom) return;
    openCustomForm(w.w, (w.ex && w.ex.en) || "", "", { edit: w });
  }

  function bindTokens(root, t, unit, onWord) {
    root.querySelectorAll(".rd-token").forEach(function (btn) {
      btn.onclick = function (e) {
        e.preventDefault();
        const raw = btn.getAttribute("data-raw") || btn.textContent;
        const para = btn.closest("p");
        const ctx = para ? sentenceOf(para.getAttribute("data-text") || para.textContent, raw) : "";
        const w = btn.getAttribute("data-rdw");
        if (w && CILIN.wordMap[w]) {
          if (onWord) onWord(w);
          CILIN.views.grove.openWord(CILIN.wordMap[w], {
            context: ctx,
            sourceLabel: sourceLabel(unit, t)
          });
        } else {
          openUnknown(raw, ctx, sourceLabel(unit, t));
        }
      };
    });
  }

  /* ---------- 阅读器 ---------- */
  function renderReader(root, textId) {
    const t = CILIN.textMap[textId];
    if (!t) { CILIN.go("/read"); return; }
    const unit = CILIN.unitMap[t.unit];
    const flat = flatTexts();
    const idx = flat.findIndex(function (x) { return x.text.id === textId; });
    const prev = idx > 0 ? flat[idx - 1] : null;
    const next = idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null;
    const words = CILIN.textWords[textId] || [];
    const studyable = words.filter(function (w) { return w.rich || w.core; });
    const studyQueue = studyable.length ? studyable : words.slice(0, 20);
    const newCount = words.filter(function (w) { return !store().isSeen(w.w); }).length;
    const wasRead = !!(store().state.reading && store().state.reading[textId]);
    store().markRead(textId);
    if (!wasRead) CILIN.refreshChrome();

    const paras = t.paragraphs && t.paragraphs.length ? t.paragraphs : [t.sentences.join(" ")];
    let playing = false;
    const clicked = [];
    const hlOn = store().state.settings.readerHighlight !== false;

    function render(p) {
      root.innerHTML = `<div class="page reader-page">
        <div class="reader-top">
          <a class="more small" href="#/read" style="color:var(--muted)">${ui.icon("back", 13)} 回到阅读</a>
          <div class="reader-chips">
            <span class="pill">${ui.esc(unit.cn)} · ${ui.esc(t.label)}</span>
            <span class="pill">${paras.length} 段 · ${t.words} 词</span>
            ${wasRead ? '<span class="pill gold">已读</span>' : ""}
          </div>
        </div>
        <div class="reader-head">
          <div class="eyebrow">${ui.esc(unit.title)} · READING</div>
          <h1>${ui.esc(t.title)}</h1>
          ${t.subtitle ? `<p class="reader-sub">${ui.esc(t.subtitle)}</p>` : ""}
          <p class="reader-hint">点任意单词可查释义、听发音；生词高亮会一直保留（金色虚线是还没遇见的四级词），可在上方关闭。</p>
        </div>
        <div class="reader-toolbar">
          <button class="chip ${hlOn ? "active" : ""}" id="hlToggle">${ui.icon("eye", 14)} 生词高亮</button>
          <button class="chip" id="playAll">${ui.icon("play", 14)} 听全文</button>
          <button class="chip" id="studyWords">${ui.icon("leaf", 14)} 学这篇的 ${studyQueue.length} 个词</button>\n          <button class="chip" id="addClicked" disabled>${ui.icon("plus", 14)} 点过的词加入今日</button>
          <span class="small faint" style="margin-left:auto">${newCount} 个词还没遇见</span>
        </div>
        <article class="reader-body ${hlOn ? "" : "no-hl"}" id="readerBody">
          ${paras.map(function (p, i) {
            return `<p data-text="${ui.attr(p)}">${paragraphHTML(p)}<button class="audio-btn rd-para" data-speak="${ui.attr(p)}" aria-label="朗读这一段">${ui.icon("speaker", 13)}</button></p>`;
          }).join("")}
        </article>
        <div class="reader-foot">
          ${prev ? `<button class="btn btn-line btn-sm" data-goto="${prev.text.id}">${ui.icon("back", 14)} ${ui.esc(prev.text.title.slice(0, 16))}</button>` : "<span></span>"}
          <button class="btn btn-ghost btn-sm" data-goto-top>回到顶部</button>
          ${next ? `<button class="btn btn-line btn-sm" data-goto="${next.text.id}">${ui.esc(next.text.title.slice(0, 16))} ${ui.icon("arrow", 14)}</button>` : "<span></span>"}
        </div>
      </div>`;

      bindTokens(root, t, unit, function (key) {
        if (clicked.indexOf(key) < 0) clicked.push(key);
        const add = root.querySelector("#addClicked");
        if (add) {
          add.disabled = false;
          add.innerHTML = ui.icon("plus", 14) + " 把点过的 " + clicked.length + " 个词加入今日";
        }
      });
      root.querySelectorAll("[data-goto]").forEach(function (b) {
        b.onclick = function () { CILIN.go("/read/" + b.getAttribute("data-goto")); };
      });
      const top = root.querySelector("[data-goto-top]");
      if (top) top.onclick = function () { window.scrollTo({ top: 0, behavior: "smooth" }); };

      const body = root.querySelector("#readerBody");
      const hl = root.querySelector("#hlToggle");
      hl.onclick = function () {
        body.classList.toggle("no-hl");
        hl.classList.toggle("active");
        store().state.settings.readerHighlight = !body.classList.contains("no-hl");
        store().save();
      };

      const play = root.querySelector("#playAll");
      play.onclick = function () {
        if (playing) {
          playing = false; CILIN.speech.stop();
          play.classList.remove("active"); play.innerHTML = ui.icon("play", 14) + " 听全文";
          return;
        }
        playing = true;
        play.classList.add("active"); play.innerHTML = ui.icon("pause", 14) + " 停止";
        let i = 0;
        const step = function () {
          if (!playing || i >= paras.length) {
            playing = false;
            play.classList.remove("active"); play.innerHTML = ui.icon("play", 14) + " 听全文";
            return;
          }
          CILIN.speech.speak(paras[i++], { rate: 0.82, onend: step });
        };
        step();
      };

      const addClicked = root.querySelector("#addClicked");
      addClicked.onclick = function () {
        let n = 0;
        clicked.forEach(function (key) { if (store().addToToday(key)) n++; });
        ui.toast(n ? "已加入今日 " + n + " 个词" : "这些词今天已经排上了", n ? "回到今日就会先见到它们" : "");
        addClicked.innerHTML = ui.icon("check", 14) + " 已加入今日";
        addClicked.disabled = true;
      };

      const study = root.querySelector("#studyWords");
      study.onclick = function () {
        const queue = studyQueue;
        if (!queue.length) { ui.toast("这篇还没有可学的词"); return; }
        CILIN.session.flashcards(queue, {
          title: t.title,
          eyebrow: unit.cn + " · " + t.label,
          onDone: function () { CILIN.refreshChrome(); CILIN.reRender(); }
        });
      };
    }

    render();
  }

  /* ---------- 列表 ---------- */
  function renderList(root) {
    const flat = flatTexts();
    const reading = store().state.reading || {};
    const readCount = flat.filter(function (x) { return reading[x.text.id]; }).length;
    let activeUnit = "all";

    function card(x) {
      const u = x.unit, t = x.text;
      const read = !!reading[t.id];
      const core = (CILIN.textWords[t.id] || []).filter(function (w) { return w.core; }).length;
      return `<article class="card read-card ${read ? "is-read" : ""}" data-open="${t.id}">
        <div class="rc-top"><span class="rc-unit">${ui.esc(u.cn)} · ${ui.esc(t.label)}</span>
          ${read ? '<span class="pill gold">已读</span>' : '<span class="pill ghost">未读</span>'}</div>
        <h3>${ui.esc(t.title)}</h3>
        <div class="rc-sub">${ui.esc(t.subtitle || snippet(t))}</div>
        <div class="rc-meta"><span>${(t.paragraphs || []).length} 段 · ${t.words} 词</span><span>精讲 ${core}</span></div>
      </article>`;
    }

    function draw() {
      const grid = root.querySelector("#readGrid");
      const list = flat.filter(function (x) { return activeUnit === "all" || x.unit.id === activeUnit; });
      grid.innerHTML = list.map(card).join("");
      grid.querySelectorAll("[data-open]").forEach(function (c) {
        c.onclick = function () { CILIN.go("/read/" + c.getAttribute("data-open")); };
      });
    }

    root.innerHTML = `<div class="page">
      <div class="page-head">
        <div>
          <div class="eyebrow">READING</div>
          <h1>阅读</h1>
          <div class="sub">读课文、真题和外刊，不当它是任务。遇到不认识的词，点一下——它会把释义、发音和例句递给你。</div>
        </div>
        <div class="head-side"><span class="pill">${readCount} / ${flat.length} 篇读过</span></div>
      </div>

      <div class="reader-note card card-pad">
        <div class="eyebrow">HOW TO READ</div>
        <p class="small muted">读到卡住的地方，就在那个词上停一秒。点开它，听一遍，再回到句子里。读完不需要记住所有词，只要对一句话有印象。</p>
      </div>

      <div class="word-tools">
        <div class="chip-row" id="readChips">
          <button class="chip active" data-unit="all">全部</button>
          ${CILIN.units.map(function (u) { return `<button class="chip" data-unit="${u.id}">${ui.esc(u.cn)}</button>`; }).join("")}
        </div>
        <span class="small faint">${flat.length} 篇 · 点击进入</span>
      </div>
      <div class="read-grid" id="readGrid"></div>
    </div>`;

    root.querySelectorAll("[data-unit]").forEach(function (b) {
      b.onclick = function () {
        activeUnit = b.getAttribute("data-unit");
        root.querySelectorAll("[data-unit]").forEach(function (x) { x.classList.toggle("active", x === b); });
        draw();
      };
    });
    draw();
  }

  function render(root, params) {
    if (params && params[0] && CILIN.textMap[params[0]]) renderReader(root, params[0]);
    else renderList(root);
  }

  CILIN.views = CILIN.views || {};
  CILIN.views.read = { render: render, openCustomForm: openCustomForm, editCustomWord: editCustomWord };
})();
