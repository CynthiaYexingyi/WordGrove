/* 词林 · 旅程 */
(function () {
  const CILIN = (window.CILIN = window.CILIN || {});
  const ui = CILIN.ui;
  const store = function () { return CILIN.store; };

  function mastery() {
    return CILIN.units.filter(function (u) { return !u.extra; }).map(function (u) {
      const words = CILIN.unitWords[u.id] || [];
      let got = 0;
      words.forEach(function (w) { if (store().isSeen(w.w)) got++; });
      return { unit: u, got: got, total: words.length, pct: words.length ? Math.round((got / words.length) * 100) : 0 };
    });
  }

  function render(root) {
    const st = store();
    const lv = st.levelInfo();
    const learned = Object.keys(st.state.words).length;
    const mastered = Object.keys(st.state.words).filter(function (w) { return (st.state.words[w].box || 0) >= 3; }).length;
    const shadow = st.shadowCount();
    const days = Object.keys(st.state.days).length;
    const ms = mastery();
    const streak = st.state.profile.streak || 0;
    const journal = st.state.journal.slice(0, 6);
    const next = lv.next;
    const settings = st.state.settings;
    const voices = CILIN.speech.voices();

    root.innerHTML = `<div class="page">
      <div class="page-head">
        <div>
          <div class="eyebrow">JOURNEY</div>
          <h1>旅程</h1>
          <div class="sub">自性化不是抵达某处，而是越来越接近你自己。这里是走过留下的纹理。</div>
        </div>
        <div class="head-side"><span class="pill gold">Lv${lv.lv} · ${ui.esc(lv.title)}</span></div>
      </div>

      <section class="card level-card">
        <div class="level-seal">
          <span class="ls-num">${lv.lv}</span>
          <span class="ls-lv">LEVEL</span>
        </div>
        <div class="level-main">
          <div class="lm-ch">${ui.esc(lv.chapter.name)} · ${ui.esc(lv.chapter.en)}</div>
          <h2>${ui.esc(lv.title)}</h2>
          <p class="small muted mt8" style="max-width:46ch">${ui.esc(lv.chapter.line)}</p>
          <div class="lm-xp mt12"><span>${lv.xp} 经验</span>${next ? `<span>距 Lv${next.lv} · ${ui.esc(next.title)} 还需 ${lv.toNext}</span>` : "<span>已抵达自性</span>"}</div>
          ${ui.progress(lv.pct)}
        </div>
      </section>

      <div class="stat-strip mt16">
        <div class="st"><b>${learned}</b><span>遇见过的词</span></div>
        <div class="st"><b>${mastered}</b><span>已结果</span></div>
        <div class="st"><b>${shadow}</b><span>待照见的影子</span></div>
        <div class="st"><b>${streak}</b><span>连续天数</span></div>
      </div>

      <div class="grid grid-2 mt24">
        <section class="card card-pad">
          <div class="sec-title" style="margin-top:0"><div><span class="eyebrow">TRACE</span><h2>学习热力图</h2></div>
            <span class="small faint">${days} 个学习日</span></div>
          ${ui.heatmap(st.state.days, 14)}
          <div class="heat-legend"><span>少</span><i class="heat-cell"></i><i class="heat-cell l1"></i><i class="heat-cell l2"></i><i class="heat-cell l3"></i><i class="heat-cell l4"></i><span>多</span></div>
        </section>
        <section class="card card-pad">
          <div class="sec-title" style="margin-top:0"><div><span class="eyebrow">UNITS</span><h2>七境的纹理</h2></div></div>
          <div class="mastery-list">
            ${ms.map(function (m) {
              return `<div class="mastery-row">
                <span class="mr-name">${ui.esc(m.unit.cn)} · ${ui.esc(m.unit.title)}</span>
                ${ui.progress(m.pct)}
                <span class="mr-pct">${m.pct}%</span>
              </div>`;
            }).join("")}
          </div>
          <p class="small faint mt12">按每篇课文匹配到的四级词计算。</p>
        </section>
      </div>

      <div class="sec-title"><div><span class="eyebrow">ACHIEVEMENTS</span><h2>路上的印记</h2></div>
        <span class="small faint">${Object.keys(st.state.achievements).length} / ${window.CILIN_META.achievements.length}</span></div>
      <div class="badge-grid">
        ${window.CILIN_META.achievements.map(function (a) {
          const on = !!st.state.achievements[a.id];
          return `<div class="badge ${on ? "unlocked" : "locked"}" title="${ui.attr(a.desc)}">
            ${ui.icon(a.icon, 20)}<b>${ui.esc(a.title)}</b><span>${ui.esc(on ? "已获得 · " + st.state.achievements[a.id] : a.desc)}</span>
          </div>`;
        }).join("")}
      </div>

      <div class="grid grid-2 mt24">
        <section class="card card-pad">
          <div class="sec-title" style="margin-top:0"><div><span class="eyebrow">JOURNAL</span><h2>手记</h2></div></div>
          ${journal.length ? `<div class="journal-list">${journal.map(function (j) {
            return `<div class="journal-item"><div class="ji-meta">${ui.esc(ui.fmtDate(j.day))}${j.word ? " · " + ui.esc(j.word) : ""}</div><p>${ui.esc(j.text)}</p></div>`;
          }).join("")}</div>` : ui.empty("book", "手记还是空白", "在「今日」写下第一句今日之问。")}
        </section>

        <section class="card card-pad">
          <div class="sec-title" style="margin-top:0"><div><span class="eyebrow">SETTINGS</span><h2>设置</h2></div></div>
          <div class="settings-list">
            <div class="setting-row"><div class="sr-label">每日目标<span>每天想学多少个词</span></div>
              <select id="goalSel">${[5, 10, 15, 20, 30].map(function (n) { return `<option value="${n}" ${settings.dailyGoal === n ? "selected" : ""}>${n} 词</option>`; }).join("")}</select></div>
            <div class="setting-row"><div class="sr-label">词汇范围<span>今日新词与词汇速测的来源</span></div>
              <select id="scopeSel">
                <option value="mix" ${settings.vocabScope === "mix" ? "selected" : ""}>四级 + 六级</option>
                <option value="cet4" ${settings.vocabScope === "cet4" ? "selected" : ""}>只学四级</option>
                <option value="cet6" ${settings.vocabScope === "cet6" ? "selected" : ""}>只学六级新增</option>
              </select></div>
            <div class="setting-row"><div class="sr-label">读音示范<span>系统语音合成（离线）</span></div>
              <select id="voiceSel"><option value="">自动选择</option>${voices.map(function (v) { return `<option value="${ui.attr(v.name)}" ${settings.voiceName === v.name ? "selected" : ""}>${ui.esc(v.name)} · ${ui.esc(v.lang)}</option>`; }).join("")}</select></div>
            <div class="setting-row"><div class="sr-label">语速<span>建议 0.9，听写可调慢</span></div>
              <input type="range" id="rateRange" min="0.6" max="1.2" step="0.05" value="${settings.rate}"><span class="small faint" id="rateVal">${settings.rate.toFixed(2)}</span></div>
            <div class="setting-row"><div class="sr-label">外观<span>夜色 / 晨光</span></div>
              <button class="switch ${settings.theme === "light" ? "on" : ""}" id="themeSwitch" aria-label="切换明暗"></button></div>
          </div>
          <div class="mt16" style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-line btn-sm" data-export>${ui.icon("download", 14)} 导出进度</button>
            <button class="btn btn-line btn-sm" data-import>${ui.icon("upload", 14)} 导入进度</button>
            <button class="btn btn-ghost btn-sm" data-reset>重置</button>
            <input type="file" id="importFile" accept="application/json,.json" hidden>
          </div>
          <p class="small faint mt12">数据只保存在这台设备的浏览器里。换设备时可用导出 / 导入迁移。</p>
        </section>
      </div>

      <div class="card card-pad mt24">
        <div class="eyebrow">ABOUT</div>
        <div class="small muted mt8" style="line-height:1.8">
          词林 v1 · 四级。<br>
          词库：四级 ${CILIN.cet4Words.length} 词 + 六级新增 ${CILIN.cet6Words.length} 词；例句取自《Textbook Fall 2026》课文（Unit 1–7）；翻译与写作题干部分来自历年四级真题。<br>
          所有进度保存在本机 localStorage；发音由浏览器语音合成提供，可离线使用；部署时把整个文件夹拖到 Netlify 即可。
        </div>
      </div>
    </div>`;

    /* 设置事件 */
    const goalSel = root.querySelector("#goalSel");
    goalSel.onchange = function () {
      st.state.settings.dailyGoal = Number(goalSel.value);
      st.save();
      ui.toast("每日目标已调整", "不必多，只要每天走一点");
    };
    const scopeSel = root.querySelector("#scopeSel");
    scopeSel.onchange = function () {
      st.state.settings.vocabScope = scopeSel.value;
      st.save();
      ui.toast("词汇范围已调整", "今日新词与词汇速测会按新范围出题");
      CILIN.reRender();
    };
    const voiceSel = root.querySelector("#voiceSel");
    voiceSel.onchange = function () {
      st.state.settings.voiceName = voiceSel.value;
      st.save();
      ui.toast("声音已更换", voiceSel.value || "自动选择");
      CILIN.speech.speak("The world is quiet here.", { rate: 0.9 });
    };
    const rate = root.querySelector("#rateRange");
    rate.oninput = function () {
      st.state.settings.rate = Number(rate.value);
      root.querySelector("#rateVal").textContent = st.state.settings.rate.toFixed(2);
      st.save();
    };
    root.querySelector("#themeSwitch").onclick = function () {
      st.toggleTheme();
      CILIN.reRender();
    };
    root.querySelector("[data-export]").onclick = function () {
      const blob = new Blob([st.exportData()], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "词林-进度-" + st.today() + ".json";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      ui.toast("进度已导出");
    };
    const file = root.querySelector("#importFile");
    root.querySelector("[data-import]").onclick = function () { file.click(); };
    file.onchange = function () {
      const f = file.files && file.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = function () {
        try {
          st.importData(String(reader.result));
          ui.toast("进度已导入");
          setTimeout(function () { location.reload(); }, 600);
        } catch (e) {
          ui.toast("导入失败", String(e.message || e));
        }
      };
      reader.readAsText(f);
    };
    root.querySelector("[data-reset]").onclick = function () {
      ui.confirmSheet("重置进度？", "会清空本机上的所有单词进度、影子与手记。建议先导出备份。", "确认重置").then(function (ok) {
        if (!ok) return;
        st.reset();
        ui.toast("已重置", "从一盏灯开始");
        setTimeout(function () { location.reload(); }, 500);
      });
    };
  }

  CILIN.views = CILIN.views || {};
  CILIN.views.journey = { render: render };
})();
