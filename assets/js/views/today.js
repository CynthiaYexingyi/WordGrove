/* 词林 · 今日 */
(function () {
  const CILIN = (window.CILIN = window.CILIN || {});
  const ui = CILIN.ui;
  const store = function () { return CILIN.store; };

  function queueForToday(plan) {
    const q = (plan.queue || plan.due.concat(plan.fresh)).slice();
    if (q.length) return q;
    // 今日目标已完成 / 没有到期词时，"再学一组"给一组轻复习
    return CILIN.ui.sample(CILIN.studyPool ? CILIN.studyPool() : CILIN.coreWords, 10, Date.now());
  }

  function render(root) {
    const st = store();
    const plan = st.plan();
    const lv = st.levelInfo();
    const today = st.today();
    const day = st.dayRecord() || { words: 0, correct: 0, wrong: 0, xp: 0, studied: [] };
    const studied = (day.studied || []).length;
    const goal = plan.goal;
    const pct = ui.clamp(Math.round((studied / goal) * 100), 0, 100);
    const done = studied >= goal;
    const learned = Object.keys(st.state.words).length;
    const shadow = st.shadowCount();
    const quote = ui.dayQuote(today);
    const mood = st.state.profile.mood;
    const queue = queueForToday(plan);
    const moodMeta = window.CILIN_META.moods;
    const moodItem = moodMeta.find(function (m) { return m.id === mood; }) || null;
    const journal = st.state.journal.slice(0, 2);

    root.innerHTML = `<div class="page">
      <section class="card hero">
        <div>
          <div class="eyebrow">${ui.esc(ui.fmtDate(today))} · ${ui.esc(ui.greeting())}</div>
          <div class="greet-name">你好，${ui.esc(st.displayName())} <button class="uname-edit" id="editName" type="button" title="换个称呼" aria-label="换个称呼">✎</button></div>
          <div class="greet">${done ? "今天这一小段路，<br>已经走完了。" : "先在林子里，<br>走一小段路。"}</div>
          <p class="quote">${ui.esc(quote)}</p>
          <div class="mt16" style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn btn-primary" data-start>${done ? "再学一组" : "开始今日的 " + (queue.length || goal) + " 词"}</button>
            <button class="btn btn-line" data-go="grove">去词林走走</button>
          </div>
        </div>
        <div class="hero-side">
          ${ui.ring(pct, 92, { label: studied + "/" + goal })}
          <div class="hero-stats">
            <div class="hs"><b>${lv.streak || st.state.profile.streak || 0}</b><span>连续天数</span></div>
            <div class="hs"><b>${learned}</b><span>遇见过的词</span></div>
            <div class="hs"><b>${shadow}</b><span>影子待照见</span></div>
          </div>
        </div>
      </section>

      <div class="today-grid">
        <div>
          <section class="card card-pad">
            <div class="sec-title" style="margin-top:0">
              <div><span class="eyebrow">TODAY'S PATH</span><h2>今日计划</h2></div>
              <span class="pill ${done ? "gold" : ""}">${done ? "已完成" : "进行中"}</span>
            </div>
            <div class="plan-list">
              <div class="plan-row">
                <span class="plan-ic">${ui.icon("refresh", 16)}</span>
                <div class="plan-main"><b>到期复习</b><span>${plan.dueTotal > plan.due.length ? "今日到期共 " + plan.dueTotal + " 个，先取 " + plan.due.length + " 个" : "按间隔重复安排，今天该见的词"}</span></div>
                <span class="plan-num">${plan.due.length}</span>
              </div>
              <div class="plan-row">
                <span class="plan-ic">${ui.icon("seed", 16)}</span>
                <div class="plan-main"><b>新词</b><span>从${ui.esc(CILIN.scopeLabel())}词库中拾取</span></div>
                <span class="plan-num">${plan.fresh.length}</span>
              </div>
              ${(plan.extra && plan.extra.length) ? `<div class="plan-row">
                <span class="plan-ic">${ui.icon("spark", 16)}</span>
                <div class="plan-main"><b>今日加练</b><span>${plan.extra.map(function (w) { return ui.esc(w.w); }).join(" · ")}</span></div>
                <span class="plan-num">${plan.extra.length}</span>
              </div>` : ""}
              <div class="plan-row">
                <span class="plan-ic">${ui.icon("shadow", 16)}</span>
                <div class="plan-main"><b>影子</b><span>遗忘与答错的词，等你回头照见</span></div>
                <span class="plan-num">${shadow}</span>
              </div>
            </div>
            <div class="mt16" style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="btn btn-primary" data-start>${queue.length ? "进入这一组" : "今天没有到期词"}</button>
              ${!queue.length ? `<button class="btn btn-line" data-go="shadow">去影子看看</button>` : ""}
            </div>
            <div class="mt12 small faint">${queue.length ? "本组 " + queue.length + " 词 · 大约 " + Math.max(2, Math.round(queue.length * 0.55)) + " 分钟" : "所有词都在生长，明天再来。"}</div>
          </section>

          <section class="card card-pad mt16">
            <div class="sec-title" style="margin-top:0">
              <div><span class="eyebrow">ONE QUESTION</span><h2>今日一题</h2></div>
              <span class="pill">约 1 分钟</span>
            </div>
            <p class="muted small" style="margin-bottom:14px">一道小测，像在林子里弯腰捡起一枚石子。</p>
            <button class="btn btn-line" data-quick>开始今天的微练习 ${ui.icon("arrow", 14)}</button>
            ${moodItem ? `<p class="small faint mt12">今日姿态 · ${ui.esc(moodItem.name)}：${ui.esc(moodItem.line)}</p>` : ""}
          </section>
        </div>

        <div>
          <section class="card card-pad">
            <div class="eyebrow">今日姿态</div>
            <p class="small muted" style="margin:8px 0 12px">荣格说，人格面具之下还有别的自己。今天，你以哪种姿态走进词林？</p>
            <div class="mood-row">
              ${moodMeta.map(function (m) {
                return `<button class="mood ${mood === m.id ? "active" : ""}" data-mood="${m.id}">
                  ${ui.icon(m.icon, 16)}<b>${ui.esc(m.name)}</b><span>${ui.esc(m.line)}</span>
                </button>`;
              }).join("")}
            </div>
          </section>

          <section class="card card-pad mt16">
            <div class="sec-title" style="margin-top:0">
              <div><span class="eyebrow">JOURNAL</span><h2>今日之问</h2></div>
            </div>
            <p class="small muted" style="margin-bottom:10px">${ui.esc(ui.reflection(today))}</p>
            <div class="reflect">
              <textarea id="journalInput" placeholder="写一句就好。不必深刻，只要诚实。"></textarea>
            </div>
            <div class="mt12" style="display:flex;justify-content:flex-end">
              <button class="btn btn-line btn-sm" data-journal>收进手记</button>
            </div>
            ${journal.length ? `<div class="divider"></div><div class="journal-list">
              ${journal.map(function (j) {
                return `<div class="journal-item"><div class="ji-meta">${ui.esc(ui.fmtDateShort(j.day))}${j.word ? " · " + ui.esc(j.word) : ""}</div><p>${ui.esc(j.text)}</p></div>`;
              }).join("")}
            </div>` : ""}
          </section>

          <section class="card card-pad mt16" data-go="shadow" style="cursor:pointer">
            <div style="display:flex;align-items:center;gap:14px">
              <span class="plan-ic" style="width:42px;height:42px">${ui.icon("shadow", 20)}</span>
              <div style="flex:1">
                <div class="eyebrow">SHADOW</div>
                <div class="serif" style="font-size:15px;letter-spacing:.06em;margin-top:2px">${shadow ? shadow + " 个影子等你照见" : "还没有落下影子"}</div>
                <div class="small faint">${shadow ? "它们不是敌人，是尚未整合的词。" : "答错或遗忘的词，会落在这里。"}</div>
              </div>
              ${ui.icon("chevron", 16)}
            </div>
          </section>
        </div>
      </div>
    </div>`;

    /* ------- 事件 ------- */
    root.querySelectorAll("[data-start]").forEach(function (b) {
      b.onclick = function () {
        if (!queue.length) {
          ui.toast("今天没有到期的词", "可以去影子或词林自由复习");
          return;
        }
        CILIN.session.flashcards(queue, {
          title: "今日 · " + queue.length + " 词",
          eyebrow: "今日 · 十词",
          onDone: function () { CILIN.refreshChrome(); CILIN.reRender(); }
        });
      };
    });
    root.querySelectorAll("[data-go]").forEach(function (b) {
      b.onclick = function () { CILIN.go("/" + b.getAttribute("data-go")); };
    });
    root.querySelectorAll("[data-mood]").forEach(function (b) {
      b.onclick = function () {
        const id = b.getAttribute("data-mood");
        st.state.profile.mood = id;
        st.save();
        const m = moodMeta.find(function (x) { return x.id === id; });
        ui.toast("今日姿态 · " + m.name, m.line);
        CILIN.reRender();
      };
    });
    const quick = root.querySelector("[data-quick]");
    if (quick) quick.onclick = function () {
      const qs = CILIN.quiz.make({ count: 3, seed: Date.now() });
      if (!qs.length) { ui.toast("题库还在生长", "稍后回来看看"); return; }
      CILIN.session.quiz(qs, {
        title: "今日一题",
        kind: "vocab",
        kindLabel: "今日一题",
        onDone: function () { CILIN.refreshChrome(); CILIN.reRender(); }
      });
    };
    const jb = root.querySelector("[data-journal]");
    if (jb) jb.onclick = function () {
      const input = root.querySelector("#journalInput");
      const text = (input.value || "").trim();
      if (text.length < 2) { ui.toast("写下一点点就好"); input.focus(); return; }
      let word = "";
      const m = text.match(/[A-Za-z][A-Za-z'-]{2,}/);
      if (m) word = m[0].toLowerCase();
      st.journalAdd(word, text);
      ui.toast("已收进手记");
      CILIN.refreshChrome();
      CILIN.reRender();
    };

    const editName = root.querySelector("#editName");
    if (editName) editName.onclick = function () { openNameSheet(st); };
  }

  function openNameSheet(st) {
    const cur = (st.state.profile.name || "").trim();
    const title = st.levelInfo().title;
    ui.openSheet(`
      <div class="sheet-head"><h3>你的称呼</h3><button class="icon-btn" data-close aria-label="关闭">${ui.icon("close", 18)}</button></div>
      <div class="sheet-body">
        <p class="muted small" style="margin-bottom:12px">这会显示在首页问候里。留空时，自动显示你当前等级的称号「${ui.esc(title)}」。</p>
        <input id="nameInput" class="field" data-autofocus maxlength="12" value="${ui.esc(cur)}" placeholder="给自己起一个称呼">
      </div>
      <div class="sheet-foot">
        <button class="btn btn-ghost" data-clear>用称号</button>
        <button class="btn btn-primary" data-save>保存</button>
      </div>
    `);
    const ov = document.getElementById("overlay");
    const input = ov.querySelector("#nameInput");
    ov.querySelector("[data-close]").onclick = function () { ui.closeSheet(); };
    ov.querySelector("[data-save]").onclick = function () {
      const v = (input.value || "").trim().slice(0, 12);
      st.setName(v);
      ui.toast(v ? "已记住，「" + v + "」" : "已改用称号「" + title + "」");
      ui.closeSheet();
      CILIN.reRender();
    };
    ov.querySelector("[data-clear]").onclick = function () {
      st.setName("");
      ui.toast("已改用称号「" + title + "」");
      ui.closeSheet();
      CILIN.reRender();
    };
  }

  CILIN.views = CILIN.views || {};
  CILIN.views.today = { render: render };
})();
